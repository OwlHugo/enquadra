import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { Disambiguator } from '@enquadra/domain'
import { createDisambiguator } from './disambiguator.ts'

export { createDisambiguator, type DisambiguatorOptions, type Price } from './disambiguator.ts'

/**
 * Configuração padrão: Gemini Flash Lite, o modelo mais barato que passou no eval.
 * Trocar de modelo só entra se `pnpm eval` não piorar (ver docs/adr/0004).
 */
export const DEFAULT_MODEL = 'gemini-3.5-flash-lite'

/** Preço de tabela em USD por milhão de tokens. Revisar ao trocar de modelo. */
const PRICES: Record<string, { input: number; output: number }> = {
  'gemini-3.5-flash-lite': { input: 0.1, output: 0.4 },
  'gemini-3.5-flash': { input: 0.3, output: 2.5 },
}

export const disambiguatorFromEnv = (
  env: Record<string, string | undefined> = process.env,
): Disambiguator | undefined => {
  const key = env['GEMINI_API_KEY'] ?? env['GOOGLE_GENERATIVE_AI_API_KEY']
  if (!key) return undefined
  const name = env['ENQUADRA_MODELO'] ?? DEFAULT_MODEL
  const price = PRICES[name]
  // Sem preço o custo sairia US$ 0 em todo relatório, e o eval compararia modelos às cegas.
  if (!price) {
    throw new Error(
      `ENQUADRA_MODELO=${name} has no price in PRICES (${Object.keys(PRICES).join(', ')})`,
    )
  }
  const google = createGoogleGenerativeAI({ apiKey: key })
  return createDisambiguator({
    model: google(name),
    modelName: name,
    price,
  })
}
