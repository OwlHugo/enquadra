import { fileURLToPath } from 'node:url'

export { CALCULATOR_BASE, type ClientOptions, createOfficialValidator } from './official-api.ts'
export {
  ApiClassifications,
  ApiNcmApplicable,
  ApiRawList,
  ApiVersion,
  checkResponse,
  type LoadedTable,
  loadTable,
  type Schema,
  SiscomexNomenclature,
} from './table.ts'

/** Pasta da tabela versionada que acompanha o repositório. */
export const DEFAULT_TABLE = fileURLToPath(new URL('../../../data/sources/V0066', import.meta.url))
