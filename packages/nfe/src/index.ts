import { cfop, DomainError, type InputItem, type IsoDate, isoDate, ncm } from '@enquadra/domain'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

/**
 * Leitura de NF-e/NFC-e (layout 4.00). Extrai só o que o enquadramento usa:
 * descrição, NCM, CFOP, data de emissão e o tipo do destinatário.
 * Nome, CPF/CNPJ, endereço e valores são descartados aqui, na entrada,
 * para nunca chegarem a log, relatório ou modelo de linguagem.
 */

export type RecipientType = 'pf' | 'pj' | 'foreign' | 'no_recipient'

export interface ParsedInvoice {
  readonly key: string | null
  readonly model: '55' | '65'
  readonly issueDate: IsoDate
  readonly destinationUf: string | null
  readonly recipientType: RecipientType
  readonly items: readonly InputItem[]
  /** Itens que vieram com o grupo IBSCBS já preenchido: permite auditar o que foi emitido. */
  readonly issued: readonly { readonly index: number; readonly cClassTrib: string | null }[]
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  removeNSPrefix: true,
  parseTagValue: false,
  isArray: (name) => name === 'det',
})

type XmlNode = Record<string, unknown>
const node = (value: unknown): XmlNode =>
  value && typeof value === 'object' ? (value as XmlNode) : {}
const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)

const recipientType = (dest: XmlNode): RecipientType => {
  if (Object.keys(dest).length === 0) return 'no_recipient'
  if (text(dest['idEstrangeiro']) !== null) return 'foreign'
  if (text(dest['CNPJ'])) return 'pj'
  return 'pf'
}

/** Procura o grupo de IBS/CBS sem depender da posição exata dentro de `imposto`. */
const issuedCClassTrib = (taxNode: XmlNode): string | null => {
  const group = node(taxNode['IBSCBS'])
  return text(group['cClassTrib'])
}

export const parseNfe = (xml: string): ParsedInvoice => {
  // O parser aceita XML truncado e devolve só o pedaço lido: sem validar antes, uma nota cortada
  // no meio viraria uma nota com menos itens, sem aviso.
  const valido = XMLValidator.validate(xml)
  if (valido !== true) {
    throw new DomainError('malformed_xml', `line ${valido.err.line}: ${valido.err.msg}`)
  }
  const root = parser.parse(xml) as XmlNode
  const nfe = node(node(root['nfeProc'])['NFe'] ?? root['NFe'])
  const inf = node(nfe['infNFe'])
  if (Object.keys(inf).length === 0) throw new DomainError('not_an_nfe', 'infNFe missing')

  const ide = node(inf['ide'])
  const dest = node(inf['dest'])
  const dhEmi = text(ide['dhEmi'])
  if (!dhEmi) throw new DomainError('nfe_without_issue_date', 'ide/dhEmi missing')
  const issueDate = isoDate(dhEmi.slice(0, 10))
  const model = text(ide['mod'])
  if (model !== '55' && model !== '65') {
    throw new DomainError('unsupported_model', `mod=${model ?? 'missing'} (only 55 and 65)`)
  }

  const dets = inf['det'] as unknown[] | undefined
  if (!dets) throw new DomainError('nfe_without_items', 'no det in infNFe')
  const items: InputItem[] = []
  const issued: { index: number; cClassTrib: string | null }[] = []
  dets.forEach((det, index) => {
    const prod = node(node(det)['prod'])
    const description = text(prod['xProd'])
    const rawNcm = text(prod['NCM'])
    const rawCfop = text(prod['CFOP'])
    // xProd, NCM e CFOP são obrigatórios no leiaute 4.00: item sem eles é nota inválida, não
    // item a pular (nem venda presumida, que é o que o motor faria sem CFOP).
    if (!description) throw new DomainError('item_without_description', `item ${index + 1}`)
    if (!rawNcm) throw new DomainError('item_without_ncm', `item ${index + 1}: ${description}`)
    if (!rawCfop) throw new DomainError('item_without_cfop', `item ${index + 1}: ${description}`)
    items.push({ description, ncm: ncm(rawNcm), cfop: cfop(rawCfop), date: issueDate })
    issued.push({ index, cClassTrib: issuedCClassTrib(node(node(det)['imposto'])) })
  })

  return {
    key: text(inf['@Id'])?.replace(/^NFe/, '') ?? null,
    model,
    issueDate,
    destinationUf: text(node(dest['enderDest'])['UF']),
    recipientType: recipientType(dest),
    items,
    issued,
  }
}

/** Chave de deduplicação: 5 mil notas costumam ter algumas centenas de itens distintos. */
export const itemKey = (item: InputItem): string =>
  [item.ncm, item.cfop ?? '-', item.description.trim().toLowerCase().replace(/\s+/g, ' ')].join('|')
