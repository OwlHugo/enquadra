import { describe, expect, it } from 'vitest'
import { avaliar, type Condicao, normalizarDescricao } from '../descricao.ts'
import * as c from './condicoes.ts'

/** Descrições como aparecem em cadastro de verdade: abreviadas, sem acento, em caixa alta. */
const casos: [Condicao, string, ReturnType<typeof avaliar>][] = [
  [c.FRALDA, 'FRALDA PAMPERS CONFORT SEC G 30UN', 'atende'],
  [c.FRALDA, 'FRALD GERIATRICA BIGFRAL M', 'atende'],
  [c.FRALDA, 'ABSORVENTE ALWAYS C/ABAS', 'nao_atende'],
  [c.SAUDE_MENSTRUAL, 'ABSORV INTERNO OB MEDIO 10UN', 'atende'],
  [c.SAUDE_MENSTRUAL, 'CALCINHA ABSORVENTE PANTYS M', 'atende'],
  [c.SAUDE_MENSTRUAL, 'ABSORVENTE PARA SEIOS 30UN', 'indeterminado'],
  [c.PAO_FRANCES, 'PAO FRANCES KG', 'atende'],
  [c.PAO_FRANCES, 'PÃO FR. KG', 'atende'],
  [c.PAO_FRANCES, 'PAO DE FORMA TIPO FRANCES', 'nao_atende'],
  [c.PAO_FRANCES, 'PAO DE QUEIJO 400G', 'nao_atende'],
  [c.PAO_FRANCES, 'PAO KG', 'indeterminado'],
  [c.SEM_ACUCAR_E_CONSERVANTE, 'SUCO LARANJA INTEGRAL 900ML', 'atende'],
  [c.SEM_ACUCAR_E_CONSERVANTE, 'NECTAR DE PESSEGO 1L', 'nao_atende'],
  [c.SEM_ACUCAR_E_CONSERVANTE, 'SUCO DE UVA 1L', 'indeterminado'],
  [c.SEM_ACUCAR, 'POLPA MORANGO S/ ACUCAR', 'atende'],
  [c.SEM_ACUCAR, 'PESSEGO EM CALDA', 'nao_atende'],
  [c.CASCA_RIJA_REGIONAL, 'CASTANHA DO PARA 200G', 'atende'],
  [c.CASCA_RIJA_REGIONAL, 'AMENDOAS TORRADAS', 'nao_atende'],
  [c.LACTEO, 'BEBIDA LACTEA NESCAU 200ML', 'atende'],
  [c.LACTEO, 'ISOTONICO GATORADE 500ML', 'nao_atende'],
]

describe('condições da lei contra descrições reais', () => {
  it.each(casos)('%# %s', (condicao, descricao, esperado) => {
    expect(avaliar(condicao, normalizarDescricao(descricao))).toBe(esperado)
  })
})

describe('normalização', () => {
  it('tira acento, caixa e pontuação, e expande abreviação comum', () => {
    expect(normalizarDescricao('PÃO FR. c/ GERGELIM')).toBe('pao frances com gergelim')
    expect(normalizarDescricao('SUCO S/ AÇÚCAR 100%')).toBe('suco sem acucar 100%')
  })
})
