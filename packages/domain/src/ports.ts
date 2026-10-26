import type {
  Candidate,
  CClassTrib,
  Classification,
  InputItem,
  IsoDate,
  Ncm,
  OfficialValidation,
} from './types.ts'

/**
 * Portas da arquitetura hexagonal. O domínio declara do que precisa;
 * `@enquadra/sources` e `@enquadra/ai` implementam. Testes usam implementações em memória.
 */

/** Tabela oficial de classificações, numa versão e data fixas. */
export interface OfficialTable {
  readonly version: string
  classification(code: CClassTrib): Classification | undefined
  /** Nome oficial do NCM na nomenclatura vigente, ou undefined se o código não existe. */
  ncmName(code: Ncm): string | undefined
  /**
   * cClassTrib cuja lista oficial de NCM aceita este código (só os de lista restrita).
   * undefined quando o NCM não foi sondado na API nesta versão, o que é diferente de "nenhum".
   */
  restrictedAccepting(code: Ncm): readonly CClassTrib[] | undefined
}

/** Validação na API pública da Receita. Pode estar fora do ar: o motor nunca depende dela. */
export interface OfficialValidator {
  validate(ncm: Ncm, code: CClassTrib, date: IsoDate): Promise<OfficialValidation>
}

export interface ChoiceRequest {
  readonly item: InputItem
  readonly ncmName: string
  readonly candidates: readonly Candidate[]
}

export type Choice =
  | {
      readonly kind: 'chosen'
      readonly cClassTrib: CClassTrib
      /** Trecho que o modelo diz sustentar a escolha. É conferido contra o texto da lei. */
      readonly quote: string
      readonly justification: string
    }
  | { readonly kind: 'need_to_ask'; readonly reason: string }

export interface ModelUsage {
  readonly model: string
  readonly costUsd: number
  readonly ms: number
}

/** Desambiguador (LLM). Só escolhe entre candidatos que a regra já validou. */
export interface Disambiguator {
  choose(request: ChoiceRequest): Promise<{ choice: Choice; usage: ModelUsage }>
}
