import { fileURLToPath } from 'node:url'

export { BASE_CALCULADORA, criarValidadorOficial, type OpcoesCliente } from './api-oficial.ts'
export { carregarTabela, type TabelaCarregada } from './tabela.ts'

/** Pasta da tabela versionada que acompanha o repositório. */
export const TABELA_PADRAO = fileURLToPath(new URL('../../../data/fontes/V0059', import.meta.url))
