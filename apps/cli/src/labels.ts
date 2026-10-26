import type { Confidence, Layer, OfficialValidation, Status } from '@enquadra/domain'

/**
 * Texto que a pessoa vê. Os valores do domínio são em inglês (contrato de código); a CLI e o
 * relatório falam com um público brasileiro, então a tradução fica aqui, num lugar só.
 */

export const STATUS_LABEL: Record<Status, string> = {
  resolved: 'resolvido',
  review: 'revisar',
  needs_info: 'falta informação',
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'alta',
  medium: 'média',
  low: 'baixa',
}

export const LAYER_LABEL: Record<Layer, string> = {
  manual: 'decisão manual',
  operation: 'operação',
  annex: 'anexo',
  description: 'descrição',
  ai: 'IA',
  default: 'padrão',
}

export const VALIDATION_LABEL: Record<OfficialValidation, string> = {
  accepted: 'aceito',
  rejected: 'recusado',
  unavailable: 'indisponível',
  not_checked: 'não consultada',
}

/** Por que um arquivo ou comando falhou, para a pessoa. Código sem rótulo aparece cru. */
const ERROR_LABEL: Readonly<Record<string, string>> = {
  malformed_xml: 'XML malformado',
  not_an_nfe: 'não é NF-e nem NFC-e',
  unsupported_model: 'modelo de documento não suportado',
  nfe_without_issue_date: 'NF-e sem data de emissão',
  nfe_without_items: 'NF-e sem itens',
  item_without_description: 'item sem descrição',
  item_without_ncm: 'item sem NCM',
  item_without_cfop: 'item sem CFOP',
  invalid_ncm: 'NCM inválido',
  invalid_cfop: 'CFOP inválido',
  invalid_date: 'data inválida',
  invalid_cclasstrib: 'cClassTrib inválido',
  no_xml: 'nenhum XML encontrado',
  usage: 'uso',
  unknown_command: 'comando desconhecido',
  ENOENT: 'arquivo não encontrado',
  EACCES: 'sem permissão de leitura',
  EISDIR: 'é uma pasta, não um arquivo',
}

export const errorText = (code: string, detail: string): string => {
  const label = ERROR_LABEL[code] ?? code
  return detail ? `${label} (${detail})` : label
}
