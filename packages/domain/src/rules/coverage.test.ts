import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COVERAGE } from './products.ts'

const read = (path: string): string =>
  readFileSync(new URL(`../../../../${path}`, import.meta.url), 'utf8')

/** Linhas da tabela "Todos os 161 códigos" de docs/coverage.md: código → situação. */
const documented = (): Map<string, string> => {
  const doc = read('docs/coverage.md')
  const rows = doc
    .slice(doc.indexOf('## Todos os 161 códigos'))
    .split('\n')
    .map((l) => l.split('|').map((c) => c.trim()))
    .filter((c) => /^\d{6}$/.test(c[1] ?? ''))
  return new Map(rows.map((c) => [c[1] ?? '', c[2] ?? '']))
}

describe('COVERAGE, docs/coverage.md e README dizem a mesma coisa', () => {
  const docs = documented()
  const bySituation = (s: string) =>
    [...docs.entries()]
      .filter(([, v]) => v === s)
      .map(([k]) => k)
      .sort()

  it('os códigos cobertos no código são exatamente os de docs/coverage.md', () => {
    expect([...COVERAGE.resolves]).toEqual(bySituation('resolve'))
    expect([...COVERAGE.asks]).toEqual(bySituation('pergunta'))
    expect([...COVERAGE.alertsOnly]).toEqual(bySituation('aviso'))
    expect(docs.size).toBe(161)
  })

  it('o resumo e a tabela dos 17 de docs/coverage.md batem com COVERAGE', () => {
    const doc = read('docs/coverage.md')
    const count = (s: string) => doc.match(new RegExp(`^\\| ${s} \\| (\\d+) \\|$`, 'm'))?.[1]
    expect(count('resolve')).toBe(String(COVERAGE.resolves.length))
    expect(count('pergunta')).toBe(String(COVERAGE.asks.length))
    expect(count('aviso')).toBe(String(COVERAGE.alertsOnly.length))
    expect(count('não coberto')).toBe(
      String(161 - COVERAGE.resolves.length - COVERAGE.asks.length - COVERAGE.alertsOnly.length),
    )
    const restricted = doc.slice(doc.indexOf('## Os 17'), doc.indexOf('## Operações'))
    const situation = (c: string) =>
      restricted.match(new RegExp(`^\\| ${c} \\|.*\\| ([a-zãé ]+) \\|`, 'm'))?.[1]
    for (const c of [
      '200003',
      '200004',
      '200007',
      '200014',
      '200030',
      '200031',
      '200033',
      '200034',
      '200035',
    ])
      expect(situation(c), c).toBe('resolve')
    for (const c of ['200038', '200039', '200043']) expect(situation(c), c).toBe('pergunta')
    for (const c of ['200005', '200008', '200011']) expect(situation(c), c).toBe('aviso')
    expect(situation('515001')).toBe('não coberto')
  })

  it('o README repete os mesmos totais', () => {
    const readme = read('README.md')
    expect(readme).toContain(
      `${COVERAGE.resolves.length} codes decided by rule, ${COVERAGE.asks.length} that ask, ${COVERAGE.alertsOnly.length} that only warn, of 161`,
    )
  })
})
