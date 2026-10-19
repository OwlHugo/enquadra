export { normalizarDescricao } from './descricao.ts'
export { type Hipotese, levantarHipoteses } from './hipoteses.ts'
export { type Dependencias, enquadrar } from './motor.ts'
export { casaPrefixo, cfop, formatarNcm, ncm } from './ncm.ts'
export type {
  Desambiguador,
  Escolha,
  PedidoDeEscolha,
  TabelaOficial,
  UsoDoModelo,
  ValidadorOficial,
} from './portas.ts'
export { operacaoPorCfop } from './regras/operacoes.ts'
export { COBERTURA, REGRAS_PRODUTO, type RegraProduto } from './regras/produtos.ts'
export { type Resumo, resumir } from './resumo.ts'
export * from './tipos.ts'
