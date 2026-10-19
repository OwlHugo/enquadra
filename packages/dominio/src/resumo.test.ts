import { describe, expect, it } from 'vitest'
import { enquadrar, resumir } from './index.ts'
import { ncm } from './ncm.ts'
import { desambiguadorFixo, tabelaFalsa } from './testes.ts'
import { dataIso } from './tipos.ts'

describe('resumo da importação', () => {
  it('conta estados, reduções, bloqueios e custo de IA', async () => {
    const tabela = tabelaFalsa({
      '10063021': 'Arroz',
      '22021000': 'Refrigerante',
      '19059090': 'Outros produtos de padaria',
    })
    const ia = desambiguadorFixo({ tipo: 'preciso_perguntar', motivo: '' })
    const deps = { tabela, data: dataIso('2026-10-18'), desambiguador: ia }
    const resultados = await Promise.all([
      enquadrar({ descricao: 'ARROZ', ncm: ncm('10063021') }, deps),
      enquadrar({ descricao: 'REFRIGERANTE', ncm: ncm('22021000') }, deps),
      enquadrar({ descricao: 'PAO KG', ncm: ncm('19059090') }, deps),
      enquadrar({ descricao: 'X', ncm: ncm('99999999') }, deps),
    ])
    expect(resumir(resultados)).toEqual({
      total: 4,
      resolvidos: 2,
      revisar: 1,
      faltaInformacao: 1,
      comReducao: 1,
      bloqueios: 1,
      custoIaUsd: 0.0001,
    })
  })
})
