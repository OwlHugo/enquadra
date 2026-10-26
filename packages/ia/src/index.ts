import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { Desambiguador } from '@enquadra/dominio'
import { criarDesambiguador } from './desambiguador.ts'

export { criarDesambiguador, type OpcoesDesambiguador, type Preco } from './desambiguador.ts'

/**
 * Configuração padrão: Gemini Flash Lite, o modelo mais barato que passou no eval.
 * Trocar de modelo só entra se `pnpm eval` não piorar (ver docs/adr/0004).
 */
export const MODELO_PADRAO = 'gemini-3.5-flash-lite'

/** Preço de tabela em USD por milhão de tokens. Revisar ao trocar de modelo. */
const PRECOS: Record<string, { entrada: number; saida: number }> = {
  'gemini-3.5-flash-lite': { entrada: 0.1, saida: 0.4 },
  'gemini-3.5-flash': { entrada: 0.3, saida: 2.5 },
}

export const desambiguadorDoAmbiente = (
  env: Record<string, string | undefined> = process.env,
): Desambiguador | undefined => {
  const chave = env['GEMINI_API_KEY'] ?? env['GOOGLE_GENERATIVE_AI_API_KEY']
  if (!chave) return undefined
  const nome = env['ENQUADRA_MODELO'] ?? MODELO_PADRAO
  const preco = PRECOS[nome]
  // Sem preço o custo sairia US$ 0 em todo relatório, e o eval compararia modelos às cegas.
  if (!preco) {
    throw new Error(
      `ENQUADRA_MODELO=${nome} sem preço cadastrado em PRECOS (${Object.keys(PRECOS).join(', ')})`,
    )
  }
  const google = createGoogleGenerativeAI({ apiKey: chave })
  return criarDesambiguador({
    modelo: google(nome),
    nomeModelo: nome,
    preco,
  })
}
