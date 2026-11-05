/**
 * Copia a tabela oficial padrão para apps/<app>/data/, para o pacote do npm funcionar sozinho.
 * Roda no prepack do CLI e do MCP (`node ../../scripts/bundle-table.ts <app>`); a pasta gerada não vai para o git.
 */
import { cp, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { DEFAULT_TABLE } from '../packages/sources/src/index.ts'

const app = process.argv[2] ?? 'cli'
const dataDir = new URL(`../apps/${app}/data`, import.meta.url).pathname
const target = join(dataDir, basename(DEFAULT_TABLE))
await rm(dataDir, { recursive: true, force: true })
await cp(DEFAULT_TABLE, target, { recursive: true })
console.log(`table ${basename(DEFAULT_TABLE)} → ${target}`)
