import type {
  CClassTrib,
  DataIso,
  Ncm,
  ValidacaoOficial,
  ValidadorOficial,
} from '@enquadra/dominio'
import { z } from 'zod'

/**
 * Cliente da API pública de dados abertos da Calculadora de Tributos sobre Consumo
 * (Receita Federal / Serpro). Sem chave. OpenAPI em `${BASE}/../api-docs`.
 *
 * Regras de boa vizinhança: no máximo `concorrencia` requisições simultâneas, timeout,
 * repetição com espera crescente, e cache por (ncm, código, data). Se a API cair, o motor
 * segue sem ela e marca 'indisponivel', nunca inventa um 'aceito'.
 */

export const BASE_CALCULADORA =
  'https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora'

const RespostaAplicavel = z.object({ valido: z.boolean() })

export interface OpcoesCliente {
  readonly base?: string
  readonly concorrencia?: number
  readonly timeoutMs?: number
  readonly tentativas?: number
  readonly fetch?: typeof fetch
}

const semaforo = (limite: number) => {
  let ativos = 0
  const fila: (() => void)[] = []
  return async <T>(tarefa: () => Promise<T>): Promise<T> => {
    if (ativos >= limite) await new Promise<void>((ok) => fila.push(ok))
    ativos++
    try {
      return await tarefa()
    } finally {
      ativos--
      fila.shift()?.()
    }
  }
}

/**
 * `fetch` rejeita com TypeError('fetch failed', { cause }) em falha de rede e com DOMException
 * TimeoutError no `AbortSignal.timeout`. TypeError sem `cause` é bug (URL ou opção inválida) e não deve ser repetido.
 */
const ehFalhaDeRede = (erro: unknown): boolean =>
  (erro instanceof TypeError && erro.cause !== undefined) ||
  (erro instanceof DOMException && erro.name === 'TimeoutError')

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

export const criarValidadorOficial = (opcoes: OpcoesCliente = {}): ValidadorOficial => {
  const base = opcoes.base ?? BASE_CALCULADORA
  const http = opcoes.fetch ?? fetch
  const tentativas = opcoes.tentativas ?? 3
  const timeoutMs = opcoes.timeoutMs ?? 15_000
  const limitar = semaforo(opcoes.concorrencia ?? 4)
  const cache = new Map<string, Promise<ValidacaoOficial>>()

  /**
   * Uma tentativa. `null` quer dizer "vale tentar de novo": falha de rede, timeout, 5xx ou 429.
   * 4xx e resposta fora do contrato não são instabilidade: são pedido errado ou API que mudou,
   * e viram erro alto em vez de um 'indisponivel' que ninguém investiga.
   */
  const tentar = async (url: URL): Promise<ValidacaoOficial | null> => {
    let resposta: Response
    try {
      resposta = await limitar(() => http(url, { signal: AbortSignal.timeout(timeoutMs) }))
    } catch (erro) {
      if (ehFalhaDeRede(erro)) return null
      throw erro
    }
    if (resposta.status >= 500 || resposta.status === 429) return null
    if (!resposta.ok) {
      throw new Error(`API oficial respondeu ${resposta.status} para ${url.search}`, {
        cause: await resposta.text(),
      })
    }
    const corpo = RespostaAplicavel.parse(await resposta.json())
    return corpo.valido ? 'aceito' : 'recusado'
  }

  const consultar = async (ncm: Ncm, codigo: CClassTrib, data: DataIso) => {
    const url = new URL(`${base}/dados-abertos/classificacoes-tributarias/ncm-aplicavel`)
    url.search = new URLSearchParams({
      ncm,
      cClassTrib: codigo,
      dataOcorrenciaFatoGerador: data,
    }).toString()
    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
      const resultado = await tentar(url)
      if (resultado !== null) return resultado
      if (tentativa < tentativas) await esperar(250 * 2 ** tentativa)
    }
    return 'indisponivel' as const
  }

  return {
    validar: (ncm, codigo, data) => {
      const chave = `${ncm}|${codigo}|${data}`
      let pendente = cache.get(chave)
      if (!pendente) {
        pendente = consultar(ncm, codigo, data)
        cache.set(chave, pendente)
      }
      return pendente
    },
  }
}
