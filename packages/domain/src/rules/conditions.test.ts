import { describe, expect, it } from 'vitest'
import { type Condition, evaluate, normalizeDescription } from '../description.ts'
import * as c from './conditions.ts'

/** Descrições como aparecem em cadastro de verdade: abreviadas, sem acento, em caixa alta. */
const cases: [Condition, string, ReturnType<typeof evaluate>][] = [
  [c.DIAPER, 'FRALDA PAMPERS CONFORT SEC G 30UN', 'meets'],
  [c.DIAPER, 'FRALD GERIATRICA BIGFRAL M', 'meets'],
  [c.DIAPER, 'ABSORVENTE ALWAYS C/ABAS', 'fails'],
  [c.MENSTRUAL_HEALTH, 'ABSORV INTERNO OB MEDIO 10UN', 'meets'],
  [c.MENSTRUAL_HEALTH, 'CALCINHA ABSORVENTE PANTYS M', 'meets'],
  [c.MENSTRUAL_HEALTH, 'ABSORVENTE PARA SEIOS 30UN', 'undetermined'],
  [c.MENSTRUAL_HEALTH, 'ABS ALWAYS NOTURNO C/ABAS C/8', 'meets'],
  [c.MENSTRUAL_HEALTH, 'ABSORVENTE TENA LADY DISCREET C/8', 'undetermined'],
  [c.BLEACH, 'AGUA SANITARIA YPE 1L', 'meets'],
  [c.BLEACH, 'DESINFETANTE PINHO SOL 500ML', 'absent'],
  [c.FRENCH_BREAD, 'PAO FRANCES KG', 'meets'],
  [c.FRENCH_BREAD, 'PÃO FR. KG', 'meets'],
  [c.FRENCH_BREAD, 'PAO DE FORMA TIPO FRANCES', 'fails'],
  [c.FRENCH_BREAD, 'PAO DE QUEIJO 400G', 'fails'],
  [c.FRENCH_BREAD, 'PAO KG', 'undetermined'],
  [c.NO_SUGAR_NO_PRESERVATIVE, 'SUCO LARANJA INTEGRAL NATURAL 900ML', 'meets'],
  [c.NO_SUGAR_NO_PRESERVATIVE, 'SUCO LARANJA INTEGRAL 900ML', 'undetermined'],
  [c.NO_SUGAR_NO_PRESERVATIVE, 'NECTAR DE PESSEGO 1L', 'fails'],
  [c.NO_SUGAR_NO_PRESERVATIVE, 'SUCO DE UVA 1L', 'undetermined'],
  [c.NO_ADDED_SUGAR, 'POLPA MORANGO S/ ACUCAR', 'meets'],
  [c.NO_ADDED_SUGAR, 'PESSEGO EM CALDA', 'fails'],
  [c.REGIONAL_HARD_SHELL, 'CASTANHA DO PARA 200G', 'meets'],
  [c.REGIONAL_HARD_SHELL, 'AMENDOAS TORRADAS', 'fails'],
  [c.DAIRY, 'BEBIDA LACTEA NESCAU 200ML', 'meets'],
  [c.DAIRY, 'ISOTONICO GATORADE 500ML', 'fails'],
]

describe('condições da lei contra descrições reais', () => {
  it.each(cases)('%# %s', (condition, description, expected) => {
    expect(evaluate(condition, normalizeDescription(description))).toBe(expected)
  })
})

describe('normalização', () => {
  it('tira acento, caixa e pontuação, e expande abreviação comum', () => {
    expect(normalizeDescription('PÃO FR. c/ GERGELIM')).toBe('pao frances com gergelim')
    expect(normalizeDescription('SUCO S/ AÇÚCAR 100%')).toBe('suco sem acucar 100%')
  })
})
