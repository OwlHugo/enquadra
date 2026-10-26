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
