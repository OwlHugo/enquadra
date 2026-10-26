import { cfop, type DataIso, dataIso, ErroDeDominio, type ItemEntrada, ncm } from '@enquadra/domain'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

/**
 * Leitura de NF-e/NFC-e (layout 4.00). Extrai só o que o enquadramento usa:
 * descrição, NCM, CFOP, data de emissão e o tipo do destinatário.
 * Nome, CPF/CNPJ, endereço e valores são descartados aqui, na entrada,
 * para nunca chegarem a log, relatório ou modelo de linguagem.
 */

export type TipoDestinatario = 'pf' | 'pj' | 'estrangeiro' | 'sem_destinatario'

export interface NotaLida {
  readonly chave: string | null
  readonly modelo: '55' | '65'
  readonly emissao: DataIso
  readonly ufDestino: string | null
  readonly tipoDestinatario: TipoDestinatario
  readonly itens: readonly ItemEntrada[]
  /** Itens que vieram com o grupo IBSCBS já preenchido: permite auditar o que foi emitido. */
  readonly emitido: readonly { readonly indice: number; readonly cClassTrib: string | null }[]
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  removeNSPrefix: true,
  parseTagValue: false,
  isArray: (nome) => nome === 'det',
})

type No = Record<string, unknown>
const no = (valor: unknown): No => (valor && typeof valor === 'object' ? (valor as No) : {})
const texto = (valor: unknown): string | null => (typeof valor === 'string' ? valor : null)

const tipoDestinatario = (dest: No): TipoDestinatario => {
  if (Object.keys(dest).length === 0) return 'sem_destinatario'
  if (texto(dest['idEstrangeiro']) !== null) return 'estrangeiro'
  if (texto(dest['CNPJ'])) return 'pj'
  return 'pf'
}

/** Procura o grupo de IBS/CBS sem depender da posição exata dentro de `imposto`. */
const cClassTribEmitido = (imposto: No): string | null => {
  const grupo = no(imposto['IBSCBS'])
  return texto(grupo['cClassTrib'])
}

export const lerNfe = (xml: string): NotaLida => {
  // O parser aceita XML truncado e devolve só o pedaço lido: sem validar antes, uma nota cortada
  // no meio viraria uma nota com menos itens, sem aviso.
  const valido = XMLValidator.validate(xml)
  if (valido !== true) {
    throw new ErroDeDominio('xml_malformado', `linha ${valido.err.line}: ${valido.err.msg}`)
  }
  const raiz = parser.parse(xml) as No
  const nfe = no(no(raiz['nfeProc'])['NFe'] ?? raiz['NFe'])
  const inf = no(nfe['infNFe'])
  if (Object.keys(inf).length === 0) throw new ErroDeDominio('xml_nao_e_nfe', 'infNFe ausente')

  const ide = no(inf['ide'])
  const dest = no(inf['dest'])
  const dhEmi = texto(ide['dhEmi'])
  if (!dhEmi) throw new ErroDeDominio('nfe_sem_emissao', 'ide/dhEmi ausente')
  const emissao = dataIso(dhEmi.slice(0, 10))
  const modelo = texto(ide['mod'])
  if (modelo !== '55' && modelo !== '65') {
    throw new ErroDeDominio('modelo_nao_suportado', `mod=${modelo ?? 'ausente'} (só 55 e 65)`)
  }

  const dets = inf['det'] as unknown[] | undefined
  if (!dets) throw new ErroDeDominio('nfe_sem_itens', 'nenhum det em infNFe')
  const itens: ItemEntrada[] = []
  const emitido: { indice: number; cClassTrib: string | null }[] = []
  dets.forEach((det, indice) => {
    const prod = no(no(det)['prod'])
    const descricao = texto(prod['xProd'])
    const ncmBruto = texto(prod['NCM'])
    const cfopBruto = texto(prod['CFOP'])
    // xProd, NCM e CFOP são obrigatórios no leiaute 4.00: item sem eles é nota inválida, não
    // item a pular (nem venda presumida, que é o que o motor faria sem CFOP).
    if (!descricao) throw new ErroDeDominio('item_sem_descricao', `item ${indice + 1}`)
    if (!ncmBruto) throw new ErroDeDominio('item_sem_ncm', `item ${indice + 1}: ${descricao}`)
    if (!cfopBruto) throw new ErroDeDominio('item_sem_cfop', `item ${indice + 1}: ${descricao}`)
    itens.push({ descricao, ncm: ncm(ncmBruto), cfop: cfop(cfopBruto), data: emissao })
    emitido.push({ indice, cClassTrib: cClassTribEmitido(no(no(det)['imposto'])) })
  })

  return {
    chave: texto(inf['@Id'])?.replace(/^NFe/, '') ?? null,
    modelo,
    emissao,
    ufDestino: texto(no(dest['enderDest'])['UF']),
    tipoDestinatario: tipoDestinatario(dest),
    itens,
    emitido,
  }
}

/** Chave de deduplicação: 5 mil notas costumam ter algumas centenas de itens distintos. */
export const chaveItem = (item: ItemEntrada): string =>
  [item.ncm, item.cfop ?? '-', item.descricao.trim().toLowerCase().replace(/\s+/g, ' ')].join('|')
