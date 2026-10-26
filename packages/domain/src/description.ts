/**
 * Descrição de cadastro é texto hostil: abreviada, sem acento, com marca e embalagem.
 * Normalizamos antes de procurar sinais, e nunca usamos a descrição como instrução.
 */
const ABBREVIATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bc\//g, 'com '],
  [/\bs\//g, 'sem '],
  [/\bfr\b/g, 'frances'],
  [/\bfranc\b/g, 'frances'],
  [/\bint\b/g, 'integral'],
  [/\babsorv\b/g, 'absorvente'],
  [/\bfrald\b/g, 'diaper'],
  [/\bacuc\b/g, 'acucar'],
]

export const normalizeDescription = (text: string): string => {
  let t = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
  for (const [pattern, replacement] of ABBREVIATIONS) t = t.replace(pattern, replacement)
  return t
    .replace(/[^a-z0-9%/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type Evaluation = 'meets' | 'fails' | 'undetermined'

/**
 * Fato que a lei exige e que só a descrição (ou a pessoa) pode confirmar.
 * Sinal positivo e negativo ao mesmo tempo ("fralda absorvente") é conflito: vira pergunta,
 * nunca descarte. Descartar as duas hipóteses levaria à tributação integral sem ninguém ver.
 */
export interface Condition {
  readonly id: string
  /** Como a pergunta aparece para a pessoa. */
  readonly question: string
  readonly yes: readonly RegExp[]
  readonly no: readonly RegExp[]
  /** Quantos sinais de `yes` precisam aparecer juntos para confirmar (padrão 1). */
  readonly minMatches?: number
}

export const evaluate = (condition: Condition, normalizedDescription: string): Evaluation => {
  const negative = condition.no.some((r) => r.test(normalizedDescription))
  const positive =
    condition.yes.filter((r) => r.test(normalizedDescription)).length >= (condition.minMatches ?? 1)
  if (negative && positive) return 'undetermined'
  if (negative) return 'fails'
  if (positive) return 'meets'
  return 'undetermined'
}
