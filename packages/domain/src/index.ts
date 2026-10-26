export { normalizarDescricao } from './description.ts'
export { type Dependencias, enquadrar } from './engine.ts'
export { type Hipotese, levantarHipoteses } from './hypotheses.ts'
export { casaPrefixo, cfop, formatarNcm, ncm } from './ncm.ts'
export type {
  Desambiguador,
  Escolha,
  PedidoDeEscolha,
  TabelaOficial,
  UsoDoModelo,
  ValidadorOficial,
} from './ports.ts'
export { operacaoPorCfop } from './rules/operations.ts'
export { COBERTURA, REGRAS_PRODUTO, type RegraProduto } from './rules/products.ts'
export { type Resumo, resumir } from './summary.ts'
export * from './types.ts'
