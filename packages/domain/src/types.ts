/**
 * Vocabulário do domínio. Tudo que atravessa uma fronteira (arquivo, API, LLM) chega aqui
 * já validado e com tipo nominal, para que um NCM nunca seja confundido com um cClassTrib.
 */

declare const brand: unique symbol
type Nominal<T, M extends string> = T & { readonly [brand]: M }

/** NCM com 8 dígitos, sem pontos. */
export type Ncm = Nominal<string, 'Ncm'>
/** Código de Classificação Tributária do IBS e da CBS, 6 dígitos. */
export type CClassTrib = Nominal<string, 'CClassTrib'>
/** Código de Situação Tributária do IBS e da CBS, 3 dígitos (os 3 primeiros do cClassTrib). */
export type Cst = Nominal<string, 'Cst'>
/** CFOP com 4 dígitos. */
export type Cfop = Nominal<string, 'Cfop'>
/** Data no formato AAAA-MM-DD. */
export type IsoDate = Nominal<string, 'IsoDate'>

export const cClassTrib = (code: string): CClassTrib => {
  if (!/^\d{6}$/.test(code)) throw new DomainError('invalid_cclasstrib', code)
  return code as CClassTrib
}

export const cstOf = (c: CClassTrib): Cst => c.slice(0, 3) as Cst

export const isoDate = (value: string): IsoDate => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new DomainError('invalid_date', value)
  }
  return value as IsoDate
}

/** Códigos estáveis de DomainError. A CLI tem um rótulo em português para cada um. */
export type ErrorCode =
  | 'invalid_cclasstrib'
  | 'invalid_date'
  | 'invalid_ncm'
  | 'invalid_cfop'
  | 'malformed_xml'
  | 'not_an_nfe'
  | 'unsupported_model'
  | 'nfe_without_issue_date'
  | 'nfe_without_items'
  | 'item_without_description'
  | 'item_without_ncm'
  | 'item_without_cfop'
  | 'no_xml'
  | 'usage'
  | 'unknown_command'

/** `code` é estável, para máquina; `detail` é o pedaço do texto que a ponta mostra à pessoa. */
export class DomainError extends Error {
  readonly code: ErrorCode
  readonly detail: string
  constructor(code: ErrorCode, detail: string) {
    super(`${code}: ${detail}`)
    this.code = code
    this.detail = detail
    this.name = 'DomainError'
  }
}

/** Um item a classificar, como vem de um catálogo ou de um item de NF-e. */
export interface InputItem {
  readonly description: string
  readonly ncm: Ncm
  /** Sem CFOP o motor assume venda e registra a suposição na trilha. */
  readonly cfop?: Cfop
  /** Data do fato gerador. Sem ela, vale a data da classificação. */
  readonly date?: IsoDate
  /** Decisão travada por uma pessoa. Sempre vence e nunca é desfeita pelo motor. */
  readonly manualDecision?: ManualDecision
}

export interface ManualDecision {
  readonly cClassTrib: CClassTrib
  readonly reason: string
  readonly author: string
  readonly decidedOn: IsoDate
}

/** Camada que decidiu o item, da mais forte para a mais fraca. */
export type Layer = 'manual' | 'operation' | 'annex' | 'description' | 'ai' | 'default'

/**
 * Confiança é categoria calculada por regra, nunca um número devolvido por modelo.
 * high: regra decidiu sem ambiguidade. medium: houve escolha entre hipóteses válidas.
 * low: falta fato que só a pessoa sabe.
 */
export type Confidence = 'high' | 'medium' | 'low'

export type Status = 'resolved' | 'review' | 'needs_info'

export type OfficialValidation = 'accepted' | 'rejected' | 'unavailable' | 'not_checked'

export interface Classification {
  readonly cst: Cst
  readonly cClassTrib: CClassTrib
  readonly description: string
  readonly cbsReduction: number
  readonly ibsReduction: number
  /**
   * true quando a API oficial só aceita uma lista fechada de NCM para este código.
   * false (ex.: 200013) quer dizer que a validação oficial aceita qualquer NCM.
   */
  readonly restrictedNcmList: boolean
}

export interface LegalBasis {
  /** Ex.: "LC 214/2025, art. 125, Anexo I, item 8". */
  readonly provision: string
  /** Texto literal da lei, sem paráfrase. */
  readonly text: string
}

export interface Candidate {
  readonly cClassTrib: CClassTrib
  readonly label: string
  readonly legalBasis: LegalBasis
  /** Fato que precisa ser verdadeiro para o candidato valer. */
  readonly condition?: string
  readonly discardedBy?: string
}

export interface Question {
  readonly id: string
  readonly text: string
  readonly options: readonly { readonly label: string; readonly cClassTrib: CClassTrib }[]
}

export type AlertCode =
  | 'unknown_ncm'
  | 'multiple_hypotheses'
  | 'description_condition'
  | 'annex_priority'
  | 'official_mismatch'
  | 'unmapped_benefit'
  | 'ncm_not_probed'
  | 'other_official_hypotheses'
  | 'weak_official_validation'
  | 'operation_out_of_scope'
  | 'missing_cfop'
  | 'ai_discarded'
  | 'manual_decision_invalidated'

export interface Alert {
  readonly code: AlertCode
  readonly message: string
  readonly severity: 'info' | 'warning' | 'blocker'
}

export interface AiUsage {
  readonly model: string
  readonly costUsd: number
  readonly ms: number
}

export interface Result {
  readonly item: InputItem
  readonly status: Status
  readonly confidence: Confidence
  readonly layer: Layer
  readonly classification: Classification | null
  readonly legalBasis: LegalBasis | null
  readonly candidates: readonly Candidate[]
  readonly questions: readonly Question[]
  readonly alerts: readonly Alert[]
  readonly officialValidation: OfficialValidation
  readonly table: { readonly version: string; readonly date: IsoDate }
  /** Passo a passo legível de como a decisão foi tomada. */
  readonly trail: readonly string[]
  readonly ai: AiUsage | null
}
