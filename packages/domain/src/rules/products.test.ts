import { describe, expect, it } from 'vitest'
import { cClassTrib } from '../types.ts'
import { PRODUCT_RULES } from './products.ts'

/**
 * Integridade das regras escritas como dado. Pega o erro mais comum de quem transcreve lei:
 * prefixo de NCM no texto que não foi para a lista (ou o contrário).
 */

/** A lei cita NCM com pontos; o item 26 do Anexo I tem a grafia fora do padrão "2106.9090". */
const digits = (text: string): string[] =>
  [
    ...text.matchAll(
      /\b\d{4,8}\b|\b\d{4}\.\d{4}\b|\b\d{2}(?:\.\d{1,2}){0,3}\b|\b\d{4}\.\d{1,2}(?:\.\d{2})?\b/g,
    ),
  ]
    .map((m) => m[0].replaceAll('.', ''))
    .filter((d) => d.length >= 2)

describe('regras de produto', () => {
  it('ids são únicos', () => {
    const ids = PRODUCT_RULES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('todo código é um cClassTrib bem formado', () => {
    for (const r of PRODUCT_RULES) expect(() => cClassTrib(r.cClassTrib)).not.toThrow()
  })

  it('todo prefixo listado aparece no texto literal da lei', () => {
    for (const r of PRODUCT_RULES) {
      if (r.origin === 'art9' || r.derivedInclusion) continue
      const inText = new Set(digits(r.text))
      const chapters = [...r.text.matchAll(/cap[íi]tulos? (\d+)(?: e (\d+))?/gi)]
        .flatMap((m) => [m[1], m[2]])
        .filter((x): x is string => x !== undefined)
        .map((x) => x.padStart(2, '0'))
      for (const p of [...r.include, ...(r.exclude ?? [])]) {
        const cited =
          inText.has(p) ||
          chapters.includes(p) ||
          [...inText].some((t) => t.startsWith(p) || p.startsWith(t))
        expect(cited, `${r.id}: prefixo ${p} não está no texto`).toBe(true)
      }
    }
  })

  it('toda ressalva interpretada tem justificativa e fica dentro da inclusão', () => {
    for (const r of PRODUCT_RULES.filter((x) => x.excludedByProviso)) {
      expect(r.excludedByProviso?.why.length).toBeGreaterThan(30)
      for (const p of r.excludedByProviso?.prefixes ?? []) {
        expect(
          r.include.some((i) => p.startsWith(i)),
          `${r.id}: ${p}`,
        ).toBe(true)
      }
    }
  })

  it('exceção nunca é mais larga que a inclusão', () => {
    for (const r of PRODUCT_RULES) {
      for (const e of r.exclude ?? []) {
        expect(
          r.include.some((i) => e.startsWith(i) || i.startsWith(e)),
          `${r.id}: ${e}`,
        ).toBe(true)
      }
    }
  })
})
