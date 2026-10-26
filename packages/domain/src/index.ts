export { normalizeDescription } from './description.ts'
export { classify, type Dependencies } from './engine.ts'
export { collectHypotheses, type Hypothesis } from './hypotheses.ts'
export { cfop, formatNcm, matchesPrefix, ncm } from './ncm.ts'
export type {
  Choice,
  ChoiceRequest,
  Disambiguator,
  ModelUsage,
  OfficialTable,
  OfficialValidator,
} from './ports.ts'
export { operationByCfop } from './rules/operations.ts'
export { COVERAGE, PRODUCT_RULES, type ProductRule } from './rules/products.ts'
export { type Summary, summarize } from './summary.ts'
export * from './types.ts'
