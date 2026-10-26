import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COVERAGE } from './products.ts'

const read = (path: string): string =>
  readFileSync(new URL(`../../../../${path}`, import.meta.url), 'utf8')

/** Linhas da tabela "Todos os 161 códigos" de docs/coverage.md: código → situação. */
const documented = (): Map<string, string> => {
  const rows = read('docs/coverage.md')
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

  it('o README repete os mesmos totais', () => {
    const readme = read('README.md')
    expect(readme).toContain(
      `${COVERAGE.resolves.length} codes decided by rule, ${COVERAGE.asks.length} that ask, ${COVERAGE.alertsOnly.length} that only warn, of 161`,
    )
  })
})
