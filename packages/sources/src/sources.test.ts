import { cClassTrib, isoDate, ncm } from '@enquadra/domain'
import { describe, expect, it } from 'vitest'
import { DEFAULT_TABLE, loadTable } from './index.ts'
import { createOfficialValidator } from './official-api.ts'

const args = [ncm('10063021'), cClassTrib('200003'), isoDate('2026-10-18')] as const

const fakeFetch = (responses: (() => Response)[]) => {
  const calls: string[] = []
  const f = (async (url: URL | string) => {
    calls.push(String(url))
    const next = responses.shift()
    if (!next) throw new Error('sem resposta')
    return next()
  }) as typeof fetch
  return { f, calls }
}

describe('cliente da API oficial', () => {
  it('monta a consulta do contrato público e interpreta o resultado', async () => {
    const { f, calls } = fakeFetch([() => Response.json({ valido: true })])
    expect(await createOfficialValidator({ fetch: f }).validate(...args)).toBe('accepted')
    expect(calls[0]).toContain(
      '/dados-abertos/classificacoes-tributarias/ncm-aplicavel?ncm=10063021&cClassTrib=200003&dataOcorrenciaFatoGerador=2026-10-18',
    )
  })

  it('repete em erro 5xx e desiste com "indisponivel", nunca com "aceito"', async () => {
    const error = () => new Response('', { status: 503 })
    const { f, calls } = fakeFetch([error, error, error])
    expect(await createOfficialValidator({ fetch: f, attempts: 3 }).validate(...args)).toBe(
      'unavailable',
    )
    expect(calls).toHaveLength(3)
  })

  it('cacheia por (ncm, código, data)', async () => {
    const { f, calls } = fakeFetch([() => Response.json({ valido: false })])
    const v = createOfficialValidator({ fetch: f })
    await Promise.all([v.validate(...args), v.validate(...args)])
    expect(await v.validate(...args)).toBe('rejected')
    expect(calls).toHaveLength(1)
  })

  it('falha de rede é repetida e termina em indisponível', async () => {
    const network = () => {
      throw new TypeError('fetch failed', { cause: new Error('ECONNRESET') })
    }
    const { f, calls } = fakeFetch([network, network])
    expect(await createOfficialValidator({ fetch: f, attempts: 2 }).validate(...args)).toBe(
      'unavailable',
    )
    expect(calls).toHaveLength(2)
  })

  it('resposta fora do contrato é erro alto, não indisponível', async () => {
    const { f } = fakeFetch([() => Response.json({ other: 1 })])
    await expect(
      createOfficialValidator({ fetch: f, attempts: 1 }).validate(...args),
    ).rejects.toThrow()
  })

  it('4xx é erro alto: pedido errado não se resolve tentando de novo', async () => {
    const { f, calls } = fakeFetch([() => new Response('nao encontrada', { status: 404 })])
    await expect(createOfficialValidator({ fetch: f }).validate(...args)).rejects.toThrow('404')
    expect(calls).toHaveLength(1)
  })

  it('erro de programação no fetch não é confundido com rede fora do ar', async () => {
    const { f } = fakeFetch([])
    await expect(
      createOfficialValidator({ fetch: f, attempts: 3 }).validate(...args),
    ).rejects.toThrow('sem resposta')
  })
})

describe('tabela versionada', () => {
  it('carrega a versão que acompanha o repositório', async () => {
    const t = await loadTable(DEFAULT_TABLE)
    expect(t.version).toBe('V0059')
    expect(t.totalClassifications).toBe(161)
    expect(t.classification(cClassTrib('200034'))).toMatchObject({
      cbsReduction: 60,
      restrictedNcmList: true,
    })
    expect(t.classification(cClassTrib('200013'))?.restrictedNcmList).toBe(false)
    expect(t.ncmName(ncm('09012100'))).toBeDefined()
  })
})
