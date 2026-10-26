import { type Evaluation, evaluate, normalizeDescription } from './description.ts'
import { matchesPrefix } from './ncm.ts'
import { PRODUCT_RULES, type ProductRule } from './rules/products.ts'
import type { Ncm } from './types.ts'

/**
 * Primeira metade do motor, síncrona e pura: dado NCM e descrição,
 * quais regras de produto podem valer e em que estado está cada condição.
 */

export interface Hypothesis {
  readonly rule: ProductRule
  /** 'meets' também quando a regra não tem condição. */
  readonly evaluation: Evaluation
  readonly hasCondition: boolean
}

/** `condition`: a descrição contradiz a condição; `proviso`: outra regra confirmada tem prioridade. */
export interface Discarded {
  readonly rule: ProductRule
  readonly by: 'condition' | 'proviso'
  readonly reason: string
}

export interface Hypotheses {
  readonly alive: readonly Hypothesis[]
  readonly discarded: readonly Discarded[]
}

const matches = (rule: ProductRule, code: Ncm): boolean =>
  rule.include.some((p) => matchesPrefix(code, p)) &&
  ![...(rule.exclude ?? []), ...(rule.excludedByProviso?.prefixes ?? [])].some((p) =>
    matchesPrefix(code, p),
  )

export const collectHypotheses = (
  code: Ncm,
  description: string,
  rules: readonly ProductRule[] = PRODUCT_RULES,
): Hypotheses => {
  const text = normalizeDescription(description)
  const discarded: Discarded[] = []
  const evaluated: Hypothesis[] = []

  for (const rule of rules.filter((r) => matches(r, code))) {
    const evaluation = rule.condition ? evaluate(rule.condition, text) : 'meets'
    if (evaluation === 'fails') {
      discarded.push({
        rule,
        by: 'condition',
        reason: `a descrição não atende: ${rule.condition?.question}`,
      })
    } else {
      // Fato fora da nota (destinação, adquirente): a descrição pode descartar, nunca confirmar.
      const confirmed = rule.unconfirmed && evaluation === 'meets' ? 'undetermined' : evaluation
      evaluated.push({
        rule,
        evaluation: confirmed,
        hasCondition: rule.condition !== undefined,
      })
    }
  }

  // Ressalva entre anexos ("ressalvados os produtos relacionados no Anexo I"):
  // só afasta quando a regra prioritária está confirmada, nunca por hipótese.
  const alive = evaluated.filter((h) => {
    const priority = evaluated.find(
      (other) =>
        other !== h &&
        other.evaluation === 'meets' &&
        (h.rule.overriddenBy ?? []).includes(other.rule.origin),
    )
    if (priority) {
      discarded.push({
        rule: h.rule,
        by: 'proviso',
        reason: `ressalvado pelo ${priority.rule.provision}`,
      })
      return false
    }
    return true
  })

  return { alive, discarded }
}
