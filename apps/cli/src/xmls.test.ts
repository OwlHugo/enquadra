import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { lerXmls } from './xmls.ts'

const EXEMPLO = new URL('../../../examples/nfe-mercado.xml', import.meta.url)

describe('lerXmls', () => {
  it('arquivo que não abre vira falha com o motivo do sistema', async () => {
    const lidos = await lerXmls(['/nao/existe.xml'], (a) => readFile(a, 'utf8'))
    expect(lidos.falhas).toEqual([
      { arquivo: '/nao/existe.xml', motivo: expect.stringContaining('ENOENT') },
    ])
  })

  it('erro que não é do arquivo (bug) derruba o lote, não vira falha', async () => {
    const quebrado = async () => {
      throw new TypeError('bug no leitor')
    }
    await expect(lerXmls(['a.xml'], quebrado)).rejects.toThrow('bug no leitor')
  })

  it('erro interno do Node com code ERR_* também é bug, não falha do arquivo', async () => {
    const quebrado = async () => {
      throw Object.assign(new TypeError('x'), { code: 'ERR_INVALID_ARG_TYPE' })
    }
    await expect(lerXmls(['a.xml'], quebrado)).rejects.toThrow('x')
  })

  it('deduplica itens repetidos entre notas', async () => {
    const xml = await readFile(EXEMPLO, 'utf8')
    const lidos = await lerXmls(['a.xml', 'b.xml'], async () => xml)
    expect(lidos).toMatchObject({ notas: 2, falhas: [] })
    expect(lidos.itens).toHaveLength(5)
  })
})
