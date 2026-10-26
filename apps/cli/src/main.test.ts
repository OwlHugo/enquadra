import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Teste de produto: roda o binário de verdade sobre uma pasta com XML válido e inválido,
 * e confere o que a pessoa vê (resumo, código de saída, relatório).
 */

const MAIN = new URL('./main.ts', import.meta.url).pathname
const EXEMPLO = new URL('../../../exemplos/nfe-mercado.xml', import.meta.url)

const rodar = (...args: string[]) =>
  spawnSync(
    process.execPath,
    ['--conditions=development', MAIN, ...args, '--sem-ia', '--offline'],
    {
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    },
  )

let pasta: string
let soValidos: string

beforeAll(async () => {
  const xml = await readFile(EXEMPLO, 'utf8')
  pasta = await mkdtemp(join(tmpdir(), 'enquadra-cli-'))
  await symlink(join(pasta, 'nao-existe'), join(pasta, 'd-link-quebrado.xml'))
  await writeFile(join(pasta, 'a-boa.xml'), xml)
  await writeFile(join(pasta, 'b-cortada.xml'), xml.slice(0, xml.indexOf('<det nItem="3">')))
  await writeFile(join(pasta, 'c-cte.xml'), '<cteProc><CTe><infCte/></CTe></cteProc>')
  soValidos = await mkdtemp(join(tmpdir(), 'enquadra-cli-ok-'))
  await writeFile(join(soValidos, 'boa.xml'), xml)
})

describe('enquadra xmls', () => {
  it('processa os válidos, lista cada falha com arquivo e motivo e sai com 1', () => {
    const r = rodar('xmls', pasta)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('5 itens distintos em 1 nota ·')
    expect(r.stdout).toContain('3 arquivos falharam')
    expect(r.stdout).toMatch(/b-cortada\.xml: xml_malformado/)
    expect(r.stdout).toMatch(/c-cte\.xml: xml_nao_e_nfe/)
    expect(r.stdout).toMatch(/d-link-quebrado\.xml: ENOENT/)
    expect(r.stdout).toContain('ARROZ TIPO 1 TIO JOAO 5KG')
  })

  it('com --ignorar-invalidos sai com 0, mas o resumo continua mostrando as falhas', () => {
    const r = rodar('xmls', pasta, '--ignorar-invalidos')
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('3 arquivos falharam')
    expect(r.stdout).toContain('b-cortada.xml')
  })

  it('o relatório HTML mostra as falhas', async () => {
    const html = join(pasta, 'relatorio.html')
    const r = rodar('xmls', pasta, '--html', html)
    expect(r.status).toBe(1)
    const conteudo = await readFile(html, 'utf8')
    expect(conteudo).toContain('3 arquivos não puderam ser lidos')
    expect(conteudo).toContain('b-cortada.xml')
    expect(conteudo).toContain('xml_malformado')
  })

  it('no modo --json as falhas vêm junto dos resultados', () => {
    const r = rodar('xmls', pasta, '--json')
    expect(r.status).toBe(1)
    const saida = JSON.parse(r.stdout) as { resultados: unknown[]; falhas: { arquivo: string }[] }
    expect(saida.resultados).toHaveLength(5)
    expect(saida.falhas.map((f) => f.arquivo.split('/').at(-1))).toEqual([
      'b-cortada.xml',
      'c-cte.xml',
      'd-link-quebrado.xml',
    ])
  })

  it('sem falha nenhuma, sai com 0 e não fala de falha', () => {
    const r = rodar('xmls', soValidos)
    expect(r.status).toBe(0)
    expect(r.stdout).not.toMatch(/arquivos? falh(ou|aram)/)
  })

  it('pasta sem XML é erro, não um relatório vazio', async () => {
    const vazia = await mkdtemp(join(tmpdir(), 'enquadra-cli-vazia-'))
    const r = rodar('xmls', vazia)
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('sem_xml')
  })
})
