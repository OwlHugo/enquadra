import { describe, expect, it } from 'vitest'
import { classify, summarize } from './index.ts'
import { ncm } from './ncm.ts'
import { fakeTable, fixedDisambiguator } from './test-doubles.ts'
import { isoDate } from './types.ts'

describe('resumo da importação', () => {
  it('conta estados, reduções, bloqueios e custo de IA', async () => {
    const table = fakeTable({
      '10063021': 'Arroz',
      '22021000': 'Refrigerante',
      '19059090': 'Outros produtos de padaria',
    })
    const ai = fixedDisambiguator({ kind: 'need_to_ask', reason: '' })
    const deps = { table, date: isoDate('2026-10-18'), disambiguator: ai }
    const results = await Promise.all([
      classify({ description: 'ARROZ', ncm: ncm('10063021') }, deps),
      classify({ description: 'REFRIGERANTE', ncm: ncm('22021000') }, deps),
      classify({ description: 'PAO KG', ncm: ncm('19059090') }, deps),
      classify({ description: 'X', ncm: ncm('99999999') }, deps),
    ])
    expect(summarize(results)).toEqual({
      total: 4,
      resolved: 2,
      review: 1,
      needsInfo: 1,
      withReduction: 1,
      blockers: 1,
      aiCostUsd: 0.0001,
    })
  })
})
