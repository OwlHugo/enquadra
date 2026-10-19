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

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

export const criarValidadorOficial = (opcoes: OpcoesCliente = {}): ValidadorOficial => {
  const base = opcoes.base ?? BASE_CALCULADORA
  const http = opcoes.fetch ?? fetch
  const tentativas = opcoes.tentativas ?? 3
  const timeoutMs = opcoes.timeoutMs ?? 15_000
  const limitar = semaforo(opcoes.concorrencia ?? 4)
  const cache = new Map<string, Promise<ValidacaoOficial>>()

  /** Uma tentativa. `null` quer dizer "vale tentar de novo" (rede, timeout, 5xx, 429). */
  const tentar = async (url: URL): Promise<ValidacaoOficial | null> => {
    try {
      const resposta = await limitar(() => http(url, { signal: AbortSignal.timeout(timeoutMs) }))
      if (resposta.status >= 500 || resposta.status === 429) return null
      if (!resposta.ok) return 'indisponivel'
      const corpo = RespostaAplicavel.safeParse(await resposta.json())
      if (!corpo.success) return 'indisponivel'
      return corpo.data.valido ? 'aceito' : 'recusado'
    } catch {
      return null
    }
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
