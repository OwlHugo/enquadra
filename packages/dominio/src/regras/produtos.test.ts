import { describe, expect, it } from 'vitest'
import { cClassTrib } from '../tipos.ts'
import { REGRAS_PRODUTO } from './produtos.ts'

/**
 * Integridade das regras escritas como dado. Pega o erro mais comum de quem transcreve lei:
 * prefixo de NCM no texto que não foi para a lista (ou o contrário).
 */

/** A lei cita NCM com pontos; o item 26 do Anexo I tem a grafia fora do padrão "2106.9090". */
const digitos = (texto: string): string[] =>
  [
    ...texto.matchAll(
      /\b\d{4}\.\d{4}\b|\b\d{2}(?:\.\d{1,2}){0,3}\b|\b\d{4}\.\d{1,2}(?:\.\d{2})?\b/g,
    ),
  ]
    .map((m) => m[0].replaceAll('.', ''))
    .filter((d) => d.length >= 2)

describe('regras de produto', () => {
  it('ids são únicos', () => {
    const ids = REGRAS_PRODUTO.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('todo código é um cClassTrib bem formado', () => {
    for (const r of REGRAS_PRODUTO) expect(() => cClassTrib(r.cClassTrib)).not.toThrow()
  })

  it('todo prefixo listado aparece no texto literal da lei', () => {
    for (const r of REGRAS_PRODUTO) {
      if (r.origem === 'art9' || r.inclusaoDerivada) continue
      const noTexto = new Set(digitos(r.texto))
      const capitulos = [...r.texto.matchAll(/cap[íi]tulos? (\d+)(?: e (\d+))?/gi)]
        .flatMap((m) => [m[1], m[2]])
        .filter((x): x is string => x !== undefined)
        .map((x) => x.padStart(2, '0'))
      for (const p of [...r.incluir, ...(r.excluir ?? [])]) {
        const citado =
          noTexto.has(p) ||
          capitulos.includes(p) ||
          [...noTexto].some((t) => t.startsWith(p) || p.startsWith(t))
        expect(citado, `${r.id}: prefixo ${p} não está no texto`).toBe(true)
      }
    }
  })

  it('toda ressalva interpretada tem justificativa e fica dentro da inclusão', () => {
    for (const r of REGRAS_PRODUTO.filter((x) => x.afastadoPorRessalva)) {
      expect(r.afastadoPorRessalva?.porque.length).toBeGreaterThan(30)
      for (const p of r.afastadoPorRessalva?.prefixos ?? []) {
        expect(
          r.incluir.some((i) => p.startsWith(i)),
          `${r.id}: ${p}`,
        ).toBe(true)
      }
    }
  })

  it('exceção nunca é mais larga que a inclusão', () => {
    for (const r of REGRAS_PRODUTO) {
      for (const e of r.excluir ?? []) {
        expect(
          r.incluir.some((i) => e.startsWith(i) || i.startsWith(e)),
          `${r.id}: ${e}`,
        ).toBe(true)
      }
    }
  })
})
