import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { readXmls } from './xmls.ts'

const EXAMPLE = new URL('../../../examples/nfe-mercado.xml', import.meta.url)

describe('lerXmls', () => {
  it('arquivo que não abre vira falha com o motivo do sistema', async () => {
    const parsed = await readXmls(['/nao/existe.xml'], (a) => readFile(a, 'utf8'))
    expect(parsed.failures).toEqual([
      { file: '/nao/existe.xml', reason: expect.stringContaining('ENOENT') },
    ])
  })

  it('erro que não é do arquivo (bug) derruba o lote, não vira falha', async () => {
    const broken = async () => {
      throw new TypeError('bug no leitor')
    }
    await expect(readXmls(['a.xml'], broken)).rejects.toThrow('bug no leitor')
  })

  it('erro interno do Node com code ERR_* também é bug, não falha do arquivo', async () => {
    const broken = async () => {
      throw Object.assign(new TypeError('x'), { code: 'ERR_INVALID_ARG_TYPE' })
    }
    await expect(readXmls(['a.xml'], broken)).rejects.toThrow('x')
  })

  it('deduplica itens repetidos entre notas', async () => {
    const xml = await readFile(EXAMPLE, 'utf8')
    const parsed = await readXmls(['a.xml', 'b.xml'], async () => xml)
    expect(parsed).toMatchObject({ invoices: 2, failures: [] })
    expect(parsed.items).toHaveLength(5)
  })
})
