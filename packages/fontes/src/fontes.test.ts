import { cClassTrib, dataIso, ncm } from '@enquadra/dominio'
import { describe, expect, it } from 'vitest'
import { criarValidadorOficial } from './api-oficial.ts'
import { carregarTabela, TABELA_PADRAO } from './index.ts'

const args = [ncm('10063021'), cClassTrib('200003'), dataIso('2026-10-18')] as const

const fetchFalso = (respostas: (() => Response)[]) => {
  const chamadas: string[] = []
  const f = (async (url: URL | string) => {
    chamadas.push(String(url))
    const proxima = respostas.shift()
    if (!proxima) throw new Error('sem resposta')
    return proxima()
  }) as typeof fetch
  return { f, chamadas }
}

describe('cliente da API oficial', () => {
  it('monta a consulta do contrato público e interpreta o resultado', async () => {
    const { f, chamadas } = fetchFalso([() => Response.json({ valido: true })])
    expect(await criarValidadorOficial({ fetch: f }).validar(...args)).toBe('aceito')
    expect(chamadas[0]).toContain(
      '/dados-abertos/classificacoes-tributarias/ncm-aplicavel?ncm=10063021&cClassTrib=200003&dataOcorrenciaFatoGerador=2026-10-18',
    )
  })

  it('repete em erro 5xx e desiste com "indisponivel", nunca com "aceito"', async () => {
    const erro = () => new Response('', { status: 503 })
    const { f, chamadas } = fetchFalso([erro, erro, erro])
    expect(await criarValidadorOficial({ fetch: f, tentativas: 3 }).validar(...args)).toBe(
      'indisponivel',
    )
    expect(chamadas).toHaveLength(3)
  })

  it('cacheia por (ncm, código, data)', async () => {
    const { f, chamadas } = fetchFalso([() => Response.json({ valido: false })])
    const v = criarValidadorOficial({ fetch: f })
    await Promise.all([v.validar(...args), v.validar(...args)])
    expect(await v.validar(...args)).toBe('recusado')
    expect(chamadas).toHaveLength(1)
  })

  it('falha de rede é repetida e termina em indisponível', async () => {
    const rede = () => {
      throw new TypeError('fetch failed', { cause: new Error('ECONNRESET') })
    }
    const { f, chamadas } = fetchFalso([rede, rede])
    expect(await criarValidadorOficial({ fetch: f, tentativas: 2 }).validar(...args)).toBe(
      'indisponivel',
    )
    expect(chamadas).toHaveLength(2)
  })

  it('resposta fora do contrato é erro alto, não indisponível', async () => {
    const { f } = fetchFalso([() => Response.json({ outra: 1 })])
    await expect(
      criarValidadorOficial({ fetch: f, tentativas: 1 }).validar(...args),
    ).rejects.toThrow()
  })

  it('4xx é erro alto: pedido errado não se resolve tentando de novo', async () => {
    const { f, chamadas } = fetchFalso([() => new Response('nao encontrada', { status: 404 })])
    await expect(criarValidadorOficial({ fetch: f }).validar(...args)).rejects.toThrow('404')
    expect(chamadas).toHaveLength(1)
  })

  it('erro de programação no fetch não é confundido com rede fora do ar', async () => {
    const { f } = fetchFalso([])
    await expect(
      criarValidadorOficial({ fetch: f, tentativas: 3 }).validar(...args),
    ).rejects.toThrow('sem resposta')
  })
})

describe('tabela versionada', () => {
  it('carrega a versão que acompanha o repositório', async () => {
    const t = await carregarTabela(TABELA_PADRAO)
    expect(t.versao).toBe('V0059')
    expect(t.totalClassificacoes).toBe(161)
    expect(t.classificacao(cClassTrib('200034'))).toMatchObject({
      reducaoCbs: 60,
      listaNcmRestrita: true,
    })
    expect(t.classificacao(cClassTrib('200013'))?.listaNcmRestrita).toBe(false)
    expect(t.nomeNcm(ncm('09012100'))).toBeDefined()
  })
})
