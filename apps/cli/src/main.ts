#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { disambiguatorFromEnv } from '@enquadra/ai'
import {
  cfop,
  classify,
  type Dependencies,
  DomainError,
  type InputItem,
  isoDate,
  ncm,
  type Result,
  summarize,
} from '@enquadra/domain'
import { createOfficialValidator, DEFAULT_TABLE, loadTable } from '@enquadra/sources'
import { errorText } from './labels.ts'
import { color, failureLine, resultLine } from './output.ts'
import { htmlReport } from './report.ts'
import { type Failure, readXmls } from './xmls.ts'

const HELP = `enquadra: CST e cClassTrib de IBS/CBS com fundamento na LC 214/2025

Uso:
  enquadra item "<descrição>" <ncm> [--cfop 5102]
  enquadra xmls <pasta-ou-arquivo> [--html relatorio.html] [--ignorar-invalidos]

Opções:
  --ignorar-invalidos  sai com código 0 mesmo se algum XML não puder ser lido
                 (as falhas continuam no resumo e no relatório)
  --sem-ia       não chama modelo de linguagem (só regras e tabela oficial)
  --offline      não consulta a API da Receita
  --data AAAA-MM-DD  data do fato gerador (padrão: hoje, ou a emissão do XML)
  --json         saída em JSON, para máquina
  --tabela <dir> pasta da tabela oficial versionada
  -v, --versao   versão do enquadra e da tabela oficial
  -h, --ajuda    mostra esta ajuda`

const parse = () => {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        cfop: { type: 'string' },
        // As flags são interface com quem usa a CLI (público BR): ficam em português.
        data: { type: 'string' },
        html: { type: 'string' },
        tabela: { type: 'string' },
        'sem-ia': { type: 'boolean', default: false },
        'ignorar-invalidos': { type: 'boolean', default: false },
        offline: { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        versao: { type: 'boolean', short: 'v', default: false },
        ajuda: { type: 'boolean', short: 'h', default: false },
      },
    })
  } catch (error: unknown) {
    // Opção que não existe é erro de quem digitou, não bug: uma linha e a ajuda, sem stack.
    if ((error as { code?: unknown }).code !== 'ERR_PARSE_ARGS_UNKNOWN_OPTION') throw error
    const option = /'([^']+)'/.exec((error as Error).message)?.[1]
    console.error(color.red(option ? `opção desconhecida: ${option}` : 'opção desconhecida'))
    console.error(`\n${HELP}`)
    process.exit(2)
  }
}

const { values, positionals } = parse()

const listXmls = async (target: string): Promise<string[]> => {
  if ((await stat(target)).isFile()) return [target]
  const entries = await readdir(target, { recursive: true, withFileTypes: true })
  // Link simbólico entra na lista: se apontar para nada, a leitura falha e aparece como falha.
  const files = entries
    .filter((e) => (e.isFile() || e.isSymbolicLink()) && extname(e.name).toLowerCase() === '.xml')
    .map((e) => join(e.parentPath, e.name))
  if (files.length === 0) throw new DomainError('no_xml', `nenhum arquivo .xml em ${target}`)
  return files.sort()
}

// No pacote do npm a tabela vai junto em data/ (scripts/bundle-table.ts); no monorepo, vem de data/sources.
const BUNDLED_TABLE = fileURLToPath(new URL(`../data/${basename(DEFAULT_TABLE)}`, import.meta.url))
const defaultTable = (): string => (existsSync(BUNDLED_TABLE) ? BUNDLED_TABLE : DEFAULT_TABLE)

const tableText = (table: { version: string; versionDate: string }): string =>
  `tabela ${table.version} (${table.versionDate})`

// package.json fica um nível acima tanto de src/main.ts quanto de dist/main.mjs no pacote do npm.
const packageVersion = async (): Promise<string> => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  return (pkg as { version: string }).version
}

const versionCommand = async (): Promise<void> => {
  const [version, table] = await Promise.all([
    packageVersion(),
    loadTable(values['tabela'] ?? defaultTable()),
  ])
  console.log(`enquadra ${version} · ${tableText(table)}`)
}

const dependencies = async (): Promise<Dependencies & { versionText: string }> => {
  const table = await loadTable(values['tabela'] ?? defaultTable())
  const disambiguator = values['sem-ia'] ? undefined : disambiguatorFromEnv()
  return {
    table,
    date: isoDate(values['data'] ?? new Date().toISOString().slice(0, 10)),
    ...(values.offline ? {} : { validator: createOfficialValidator() }),
    ...(disambiguator ? { disambiguator } : {}),
    versionText: tableText(table),
  }
}

const printJson = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

const print = (results: readonly Result[], header: string, failures: readonly Failure[]): void => {
  const r = summarize(results)
  console.log(header)
  console.log(
    `  ${color.green(`${r.resolved} resolvidos`)}   ${color.amber(`${r.review} revisar`)}   ${color.blue(`${r.needsInfo} falta informação`)}`,
  )
  if (r.withReduction > 0) console.log(`  ${r.withReduction} com redução de alíquota`)
  if (r.aiCostUsd > 0) console.log(color.gray(`  custo de IA: US$ ${r.aiCostUsd.toFixed(5)}`))
  console.log('')
  for (const res of results)
    if (res.status !== 'resolved' || results.length <= 20) console.log(resultLine(res))
  if (failures.length > 0) {
    console.log(color.red(`\n${plural(failures.length, 'arquivo falhou', 'arquivos falharam')}:`))
    for (const f of failures) console.log(failureLine(f))
  }
}

const itemCommand = async (): Promise<void> => {
  const [description, code] = positionals.slice(1)
  if (!description || !code) throw new DomainError('usage', 'enquadra item "<descrição>" <ncm>')
  const deps = await dependencies()
  const { cfop: cfopText } = values
  const item: InputItem = {
    description,
    ncm: ncm(code),
    ...(cfopText ? { cfop: cfop(cfopText) } : {}),
  }
  const result = await classify(item, deps)
  if (values.json) return printJson([result])
  console.log(resultLine(result, true))
}

const xmlsCommand = async (): Promise<void> => {
  const target = positionals[1]
  if (!target) throw new DomainError('usage', 'enquadra xmls <pasta-ou-arquivo>')
  const deps = await dependencies()
  const parsed = await readXmls(await listXmls(target), (file) => readFile(file, 'utf8'))
  const results = await Promise.all(parsed.items.map((i) => classify(i, deps)))
  if (values.json) {
    printJson({ results, failures: parsed.failures })
  } else {
    const header = `${plural(parsed.items.length, 'item distinto', 'itens distintos')} em ${plural(parsed.invoices, 'nota', 'notas')} · ${deps.versionText}`
    print(results, header, parsed.failures)
  }
  if (values.html) {
    await writeFile(values.html, htmlReport(results, deps.versionText, parsed.failures))
    if (!values.json) console.log(color.gray(`relatório: ${values.html}`))
  }
  if (parsed.failures.length > 0 && !values['ignorar-invalidos']) process.exitCode = 1
}

const main = async (): Promise<void> => {
  const command = positionals[0]
  if (values['versao']) return versionCommand()
  if (values['ajuda'] || !command) return console.log(HELP)
  if (command === 'item') return itemCommand()
  if (command === 'xmls') return xmlsCommand()
  throw new DomainError('unknown_command', command)
}

// Erro de domínio é mensagem para a pessoa; qualquer outro é bug e sai com stack e causa.
main().catch((error: unknown) => {
  if (error instanceof DomainError) console.error(color.red(errorText(error.code, error.detail)))
  else console.error(error)
  process.exitCode = 1
})
