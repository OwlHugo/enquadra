import {
  type Cfop,
  cfop,
  type DataIso,
  dataIso,
  ErroDeDominio,
  type ItemEntrada,
  ncm,
} from '@enquadra/dominio'
import { XMLParser } from 'fast-xml-parser'

/**
 * Leitura de NF-e/NFC-e (layout 4.00). Extrai só o que o enquadramento usa:
 * descrição, NCM, CFOP, data de emissão e o tipo do destinatário.
 * Nome, CPF/CNPJ, endereço e valores são descartados aqui, na entrada,
 * para nunca chegarem a log, relatório ou modelo de linguagem.
 */

export type TipoDestinatario = 'pf' | 'pj' | 'estrangeiro' | 'sem_destinatario'

export interface NotaLida {
  readonly chave: string | null
  readonly modelo: '55' | '65' | null
  readonly emissao: DataIso | null
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
  const raiz = parser.parse(xml) as No
  const nfe = no(no(raiz['nfeProc'])['NFe'] ?? raiz['NFe'])
  const inf = no(nfe['infNFe'])
  if (Object.keys(inf).length === 0) throw new ErroDeDominio('xml_nao_e_nfe', 'infNFe ausente')

  const ide = no(inf['ide'])
  const dest = no(inf['dest'])
  const emissaoBruta = texto(ide['dhEmi'])?.slice(0, 10) ?? null
  const emissao = emissaoBruta ? dataIso(emissaoBruta) : null
  const modelo = texto(ide['mod'])

  const dets = (inf['det'] as unknown[] | undefined) ?? []
  const itens: ItemEntrada[] = []
  const emitido: { indice: number; cClassTrib: string | null }[] = []
  dets.forEach((det, indice) => {
    const prod = no(no(det)['prod'])
    const descricao = texto(prod['xProd']) ?? ''
    const ncmBruto = texto(prod['NCM'])
    const cfopBruto = texto(prod['CFOP'])
    if (!ncmBruto) return
    const codigoCfop: Cfop | undefined = cfopBruto ? cfop(cfopBruto) : undefined
    itens.push({
      descricao,
      ncm: ncm(ncmBruto),
      ...(codigoCfop ? { cfop: codigoCfop } : {}),
      ...(emissao ? { data: emissao } : {}),
    })
    emitido.push({ indice, cClassTrib: cClassTribEmitido(no(no(det)['imposto'])) })
  })

  return {
    chave: texto(inf['@Id'])?.replace(/^NFe/, '') ?? null,
    modelo: modelo === '55' || modelo === '65' ? modelo : null,
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
