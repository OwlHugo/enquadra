import { fileURLToPath } from 'node:url'

export { BASE_CALCULADORA, criarValidadorOficial, type OpcoesCliente } from './official-api.ts'
export { carregarTabela, type TabelaCarregada } from './table.ts'

/** Pasta da tabela versionada que acompanha o repositório. */
export const TABELA_PADRAO = fileURLToPath(new URL('../../../data/sources/V0059', import.meta.url))
