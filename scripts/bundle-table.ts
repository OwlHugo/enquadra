/**
 * Copia a tabela oficial padrão para apps/cli/data/, para o pacote do npm funcionar sozinho.
 * Roda no prepack do CLI; a pasta gerada não vai para o git.
 */
import { cp, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { DEFAULT_TABLE } from '../packages/sources/src/index.ts'

const target = join(new URL('../apps/cli/data', import.meta.url).pathname, basename(DEFAULT_TABLE))
await rm(new URL('../apps/cli/data', import.meta.url).pathname, { recursive: true, force: true })
await cp(DEFAULT_TABLE, target, { recursive: true })
console.log(`table ${basename(DEFAULT_TABLE)} → ${target}`)
