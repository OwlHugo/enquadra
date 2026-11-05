/**
 * Prepara apps/<app>/ para o pacote do npm funcionar sozinho: copia a tabela oficial padrão para
 * data/ e o README da raiz, com links relativos trocados por absolutos (o npm só publica o README
 * da pasta do pacote, e link relativo quebra no site do npm). Roda no prepack do CLI e do MCP
 * (`node ../../scripts/bundle-table.ts <app>`); o que ele gera não vai para o git.
 */
import { cp, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { DEFAULT_TABLE } from '../packages/sources/src/index.ts'

const REPO = 'https://github.com/OwlHugo/enquadra'
const RAW = 'https://raw.githubusercontent.com/OwlHugo/enquadra/main'

const app = process.argv[2] ?? 'cli'
const appDir = new URL(`../apps/${app}`, import.meta.url).pathname
const dataDir = join(appDir, 'data')
const target = join(dataDir, basename(DEFAULT_TABLE))
await rm(dataDir, { recursive: true, force: true })
await cp(DEFAULT_TABLE, target, { recursive: true })
console.log(`table ${basename(DEFAULT_TABLE)} → ${target}`)

const readme = (await readFile(new URL('../README.md', import.meta.url), 'utf8'))
  .replace(/src="(?!https?:)([^"]+)"/g, `src="${RAW}/$1"`)
  .replace(/\]\((?!https?:|#|mailto:)([^)]+)\)/g, `](${REPO}/blob/main/$1)`)
await writeFile(join(appDir, 'README.md'), readme)
console.log(`README → ${join(appDir, 'README.md')}`)
