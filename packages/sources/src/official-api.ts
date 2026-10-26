import type {
  CClassTrib,
  IsoDate,
  Ncm,
  OfficialValidation,
  OfficialValidator,
} from '@enquadra/domain'
import { z } from 'zod'

/**
 * Cliente da API pública de dados abertos da Calculadora de Tributos sobre Consumo
 * (Receita Federal / Serpro). Sem chave. OpenAPI em `${BASE}/../api-docs`.
 *
 * Regras de boa vizinhança: no máximo `concurrency` requisições simultâneas, timeout,
 * repetição com espera crescente, e cache por (ncm, código, data). Se a API cair, o motor
 * segue sem ela e marca 'unavailable', nunca inventa um 'accepted'.
 */

export const CALCULATOR_BASE =
  'https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora'

const ApplicableResponse = z.object({ valido: z.boolean() })

export interface ClientOptions {
  readonly base?: string
  readonly concurrency?: number
  readonly timeoutMs?: number
  readonly attempts?: number
  readonly fetch?: typeof fetch
}

const semaphore = (limit: number) => {
  let active = 0
  const queue: (() => void)[] = []
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= limit) await new Promise<void>((ok) => queue.push(ok))
    active++
    try {
      return await task()
    } finally {
      active--
      queue.shift()?.()
    }
  }
}

/**
 * `fetch` rejeita com TypeError('fetch failed', { cause }) em falha de rede e com DOMException
 * TimeoutError no `AbortSignal.timeout`. TypeError sem `cause` é bug (URL ou opção inválida) e não deve ser repetido.
 */
const isNetworkFailure = (error: unknown): boolean =>
  (error instanceof TypeError && error.cause !== undefined) ||
  (error instanceof DOMException && error.name === 'TimeoutError')

const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

export const createOfficialValidator = (options: ClientOptions = {}): OfficialValidator => {
  const base = options.base ?? CALCULATOR_BASE
  const http = options.fetch ?? fetch
  const attempts = options.attempts ?? 3
  const timeoutMs = options.timeoutMs ?? 15_000
  const throttle = semaphore(options.concurrency ?? 4)
  const cache = new Map<string, Promise<OfficialValidation>>()

  /**
   * Uma tentativa. `null` quer dizer "vale tentar de novo": falha de rede, timeout, 5xx ou 429.
   * 4xx e resposta fora do contrato não são instabilidade: são pedido errado ou API que mudou,
   * e viram erro alto em vez de um 'unavailable' que ninguém investiga.
   */
  const attempt = async (url: URL): Promise<OfficialValidation | null> => {
    let response: Response
    try {
      response = await throttle(() => http(url, { signal: AbortSignal.timeout(timeoutMs) }))
    } catch (error) {
      if (isNetworkFailure(error)) return null
      throw error
    }
    if (response.status >= 500 || response.status === 429) return null
    if (!response.ok) {
      throw new Error(`official API answered ${response.status} for ${url.search}`, {
        cause: await response.text(),
      })
    }
    const body = ApplicableResponse.parse(await response.json())
    return body.valido ? 'accepted' : 'rejected'
  }

  const query = async (ncm: Ncm, code: CClassTrib, date: IsoDate) => {
    const url = new URL(`${base}/dados-abertos/classificacoes-tributarias/ncm-aplicavel`)
    url.search = new URLSearchParams({
      ncm,
      cClassTrib: code,
      dataOcorrenciaFatoGerador: date,
    }).toString()
    for (let attemptNo = 1; attemptNo <= attempts; attemptNo++) {
      const result = await attempt(url)
      if (result !== null) return result
      if (attemptNo < attempts) await sleep(250 * 2 ** attemptNo)
    }
    return 'unavailable' as const
  }

  return {
    validate: (ncm, code, date) => {
      const key = `${ncm}|${code}|${date}`
      let pending = cache.get(key)
      if (!pending) {
        pending = query(ncm, code, date)
        cache.set(key, pending)
      }
      return pending
    },
  }
}
