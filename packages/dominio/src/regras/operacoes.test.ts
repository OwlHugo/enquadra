import { describe, expect, it } from 'vitest'
import { cfop } from '../ncm.ts'
import { operacaoPorCfop } from './operacoes.ts'

/** Tabela de CFOP → tratamento. Um caso por grupo, porque erro aqui contamina todo o item. */
describe('operação pelo CFOP', () => {
  it.each([
    ['5102', 'venda'],
    ['6102', 'venda'],
    ['5405', 'venda'],
    ['5656', 'venda'],
    ['5667', 'venda'],
    ['5152', 'propria'],
    ['6409', 'propria'],
    ['7101', 'propria'],
    ['5910', 'pergunta'],
    ['6910', 'pergunta'],
    ['5202', 'fora_do_escopo'],
    ['5411', 'fora_do_escopo'],
    ['5501', 'fora_do_escopo'],
    ['7501', 'fora_do_escopo'],
    ['1102', 'fora_do_escopo'],
    ['2102', 'fora_do_escopo'],
    ['3102', 'fora_do_escopo'],
    ['5949', 'fora_do_escopo'],
  ])('%s → %s', (codigo, tipo) => {
    expect(operacaoPorCfop(cfop(codigo)).tipo).toBe(tipo)
  })

  it('sem CFOP assume venda', () => {
    expect(operacaoPorCfop(undefined).tipo).toBe('venda')
  })

  it('transferência e exportação trazem o dispositivo da lei', () => {
    const t = operacaoPorCfop(cfop('5152'))
    const e = operacaoPorCfop(cfop('7101'))
    expect(t.tipo === 'propria' && t.dispositivo).toBe('LC 214/2025, art. 6º, II')
    expect(e.tipo === 'propria' && e.cClassTrib).toBe('410004')
  })
})
