import { describe, expect, it } from 'vitest'
import { cfop } from '../ncm.ts'
import { operationByCfop } from './operations.ts'

/** Tabela de CFOP → tratamento. Um caso por grupo, porque erro aqui contamina todo o item. */
describe('operação pelo CFOP', () => {
  it.each([
    ['5102', 'sale'],
    ['6102', 'sale'],
    ['5405', 'sale'],
    ['5656', 'sale'],
    ['5667', 'sale'],
    ['5152', 'own'],
    ['6409', 'own'],
    ['7101', 'own'],
    ['5910', 'question'],
    ['6910', 'question'],
    ['5202', 'out_of_scope'],
    ['5411', 'out_of_scope'],
    ['5501', 'out_of_scope'],
    ['7501', 'out_of_scope'],
    ['1102', 'out_of_scope'],
    ['2102', 'out_of_scope'],
    ['3102', 'out_of_scope'],
    ['5949', 'out_of_scope'],
  ])('%s → %s', (code, kind) => {
    expect(operationByCfop(cfop(code)).kind).toBe(kind)
  })

  it('sem CFOP assume venda', () => {
    expect(operationByCfop(undefined).kind).toBe('sale')
  })

  it('transferência e exportação trazem o dispositivo da lei', () => {
    const t = operationByCfop(cfop('5152'))
    const e = operationByCfop(cfop('7101'))
    expect(t.kind === 'own' && t.provision).toBe('LC 214/2025, art. 6º, II')
    expect(e.kind === 'own' && e.cClassTrib).toBe('410004')
  })
})
