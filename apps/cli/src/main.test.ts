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
const EXAMPLE = new URL('../../../examples/nfe-mercado.xml', import.meta.url)

const run = (...args: string[]) =>
  spawnSync(
    process.execPath,
    ['--conditions=development', MAIN, ...args, '--sem-ia', '--offline'],
    {
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    },
  )

let folder: string
let onlyValid: string

beforeAll(async () => {
  const xml = await readFile(EXAMPLE, 'utf8')
  folder = await mkdtemp(join(tmpdir(), 'enquadra-cli-'))
  await symlink(join(folder, 'nao-existe'), join(folder, 'd-link-quebrado.xml'))
  await writeFile(join(folder, 'a-boa.xml'), xml)
  await writeFile(join(folder, 'b-cortada.xml'), xml.slice(0, xml.indexOf('<det nItem="3">')))
  await writeFile(join(folder, 'c-cte.xml'), '<cteProc><CTe><infCte/></CTe></cteProc>')
  onlyValid = await mkdtemp(join(tmpdir(), 'enquadra-cli-ok-'))
  await writeFile(join(onlyValid, 'boa.xml'), xml)
})

describe('enquadra xmls', () => {
  it('processa os válidos, lista cada falha com arquivo e motivo e sai com 1', () => {
    const r = run('xmls', folder)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('5 itens distintos em 1 nota ·')
    expect(r.stdout).toContain('3 arquivos falharam')
    expect(r.stdout).toMatch(/b-cortada\.xml: malformed_xml/)
    expect(r.stdout).toMatch(/c-cte\.xml: not_an_nfe/)
    expect(r.stdout).toMatch(/d-link-quebrado\.xml: ENOENT/)
    expect(r.stdout).toContain('ARROZ TIPO 1 TIO JOAO 5KG')
  })

  it('com --ignorar-invalidos sai com 0, mas o resumo continua mostrando as falhas', () => {
    const r = run('xmls', folder, '--ignorar-invalidos')
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('3 arquivos falharam')
    expect(r.stdout).toContain('b-cortada.xml')
  })

  it('o relatório HTML mostra as falhas', async () => {
    const html = join(folder, 'relatorio.html')
    const r = run('xmls', folder, '--html', html)
    expect(r.status).toBe(1)
    const content = await readFile(html, 'utf8')
    expect(content).toContain('3 arquivos não puderam ser lidos')
    expect(content).toContain('b-cortada.xml')
    expect(content).toContain('malformed_xml')
  })

  it('no modo --json as falhas vêm junto dos resultados', () => {
    const r = run('xmls', folder, '--json')
    expect(r.status).toBe(1)
    const output = JSON.parse(r.stdout) as { results: unknown[]; failures: { file: string }[] }
    expect(output.results).toHaveLength(5)
    expect(output.failures.map((f) => f.file.split('/').at(-1))).toEqual([
      'b-cortada.xml',
      'c-cte.xml',
      'd-link-quebrado.xml',
    ])
  })

  it('uma falha só aparece no singular', async () => {
    const oneFailure = await mkdtemp(join(tmpdir(), 'enquadra-cli-uma-'))
    await writeFile(join(oneFailure, 'boa.xml'), await readFile(EXAMPLE, 'utf8'))
    await writeFile(join(oneFailure, 'ruim.xml'), '<x')
    const html = join(oneFailure, 'r.html')
    const r = run('xmls', oneFailure, '--html', html)
    expect(r.stdout).toContain('1 arquivo falhou:')
    expect(await readFile(html, 'utf8')).toContain('1 arquivo não pôde ser lido')
  })

  it('sem falha nenhuma, sai com 0 e não fala de falha', () => {
    const r = run('xmls', onlyValid)
    expect(r.status).toBe(0)
    expect(r.stdout).not.toMatch(/arquivos? falh(ou|aram)/)
  })

  it('pasta sem XML é erro, não um relatório vazio', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'enquadra-cli-vazia-'))
    const r = run('xmls', empty)
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('no_xml')
  })
})
