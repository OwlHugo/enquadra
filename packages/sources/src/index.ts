import { fileURLToPath } from 'node:url'

export { CALCULATOR_BASE, type ClientOptions, createOfficialValidator } from './official-api.ts'
export { type LoadedTable, loadTable } from './table.ts'

/** Pasta da tabela versionada que acompanha o repositório. */
export const DEFAULT_TABLE = fileURLToPath(new URL('../../../data/sources/V0059', import.meta.url))
