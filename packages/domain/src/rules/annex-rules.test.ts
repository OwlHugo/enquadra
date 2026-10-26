import { describe, expect, it } from 'vitest'
import { classify } from '../engine.ts'
import { ncm } from '../ncm.ts'
import { fakeTable } from '../test-doubles.ts'
import { isoDate } from '../types.ts'
import { ANNEX_RULES } from './annex-rules.ts'

const table = fakeTable(
  {
    '90181100': 'Eletrocardiógrafos',
    '90183119': 'Seringas',
    '66020000': 'Bengalas',
    '97019100': 'Pinturas',
    '85176259': 'Aparelhos de comutação',
    '23099090': 'Preparações para alimentação de animais',
    '90181980': 'Outros aparelhos de eletrodiagnóstico',
  },
  {
    '90181100': ['200004'],
    '90183119': ['200030', '200005'],
    '66020000': ['200031', '200008'],
    '97019100': ['200039'],
    '85176259': ['200043', '200044'],
    '23099090': ['200038', '515001'],
    '90181980': ['200004'],
  },
)
const deps = { table, date: isoDate('2026-10-18') }
const run = (description: string, code: string) => classify({ description, ncm: ncm(code) }, deps)

describe('regras dos anexos de dispositivos, insumos, cultura e soberania', () => {
  it('ids são únicos e todo prefixo existe na nomenclatura de 8 dígitos ou é prefixo de algum', () => {
    const ids = ANNEX_RULES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each([
    ['ELETROCARDIOGRAFO 12 CANAIS', '90181100', '200004'],
    ['SERINGA DESCARTAVEL 10ML C/100', '90183119', '200030'],
    ['BENGALA DOBRAVEL TELESCOPICA', '66020000', '200031'],
  ])('%s decide pelo NCM e pela descrição', async (description, code, expected) => {
    const r = await run(description, code)
    expect(r).toMatchObject({ status: 'resolved', confidence: 'medium' })
    expect(r.classification?.cClassTrib).toBe(expected)
  })

  it('avisa que a lei exige registro que a nota não traz', async () => {
    const r = await run('ELETROCARDIOGRAFO 12 CANAIS', '90181100')
    expect(r.alerts.map((a) => a.code)).toContain('registration_not_checked')
  })

  it('avisa que o código muda se o adquirente for órgão público', async () => {
    const r = await run('SERINGA DESCARTAVEL 10ML', '90183119')
    const alert = r.alerts.find((a) => a.code === 'buyer_dependent_code')
    expect(alert?.message).toContain('200005')
  })

  it('fato fora da nota (adquirente, destinação, autoria) nunca vira código: vira pergunta', async () => {
    for (const [description, code, option] of [
      ['FIREWALL EMPRESARIAL 1U', '85176259', '200043'],
      ['RACAO BOVINO ENGORDA 25KG', '23099090', '200038'],
      ['QUADRO PINTURA ORIGINAL', '97019100', '200039'],
    ] as const) {
      const r = await run(description, code)
      expect(r.status, description).toBe('needs_info')
      expect(r.classification).toBeNull()
      expect(r.questions[0]?.options.map((o) => o.cClassTrib)).toContain(option)
    }
  })

  it('NCM genérico sem o produto na descrição não decide: pergunta entre os itens do anexo', async () => {
    const r = await run('PRODUTO MEDICO XYZ', '90181980')
    expect(r.classification).toBeNull()
    expect(r.status).not.toBe('resolved')
  })

  it('ração para animal doméstico fica fora do Anexo IX, e a descrição descarta', async () => {
    const r = await run('RACAO CAES ADULTOS 15KG', '23099090')
    expect(r.questions.flatMap((q) => q.options.map((o) => o.cClassTrib))).not.toContain('200038')
  })
})
