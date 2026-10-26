/**
 * Descrição de cadastro é texto hostil: abreviada, sem acento, com marca e embalagem.
 * Normalizamos antes de procurar sinais, e nunca usamos a descrição como instrução.
 */
const ABREVIACOES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bc\//g, 'com '],
  [/\bs\//g, 'sem '],
  [/\bfr\b/g, 'frances'],
  [/\bfranc\b/g, 'frances'],
  [/\bint\b/g, 'integral'],
  [/\babsorv\b/g, 'absorvente'],
  [/\bfrald\b/g, 'fralda'],
  [/\bacuc\b/g, 'acucar'],
]

export const normalizarDescricao = (texto: string): string => {
  let t = texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
  for (const [padrao, troca] of ABREVIACOES) t = t.replace(padrao, troca)
  return t
    .replace(/[^a-z0-9%/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type Avaliacao = 'atende' | 'nao_atende' | 'indeterminado'

/**
 * Fato que a lei exige e que só a descrição (ou a pessoa) pode confirmar.
 * Sinal positivo e negativo ao mesmo tempo ("fralda absorvente") é conflito: vira pergunta,
 * nunca descarte. Descartar as duas hipóteses levaria à tributação integral sem ninguém ver.
 */
export interface Condicao {
  readonly id: string
  /** Como a pergunta aparece para a pessoa. */
  readonly pergunta: string
  readonly sim: readonly RegExp[]
  readonly nao: readonly RegExp[]
}

export const avaliar = (condicao: Condicao, descricaoNormalizada: string): Avaliacao => {
  const negativo = condicao.nao.some((r) => r.test(descricaoNormalizada))
  const positivo = condicao.sim.some((r) => r.test(descricaoNormalizada))
  if (negativo && positivo) return 'indeterminado'
  if (negativo) return 'nao_atende'
  if (positivo) return 'atende'
  return 'indeterminado'
}
