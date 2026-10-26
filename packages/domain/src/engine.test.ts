import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  cClassTrib,
  cfop,
  classify,
  type Dependencies,
  type InputItem,
  isoDate,
  ncm,
} from './index.ts'
import { fakeTable, fixedDisambiguator, fixedValidator } from './test-doubles.ts'

const NCMS = {
  '10063021': 'Arroz semibranqueado ou branqueado, polido ou brunido',
  '96190000': 'Absorventes e tampões higiênicos, cueiros, fraldas e artigos higiênicos semelhantes',
  '22021000': 'Águas, incluindo as águas minerais e as águas gaseificadas, adicionadas de açúcar',
  '19059090': 'Outros produtos de padaria',
  '11062000': 'Farinhas, sêmolas e pós de mandioca',
  '07095100': 'Cogumelos do gênero Agaricus',
  '31021010': 'Ureia com teor de nitrogênio superior a 45%',
}
const table = fakeTable(NCMS, {
  '22021000': [],
  '19059090': ['200003'],
  '11062000': ['200003'],
  '10063021': ['200003', '200038'],
  '96190000': ['200035'],
  '31021010': ['200038'],
  '07095100': ['200034', '200038'],
})
const deps = (extra: Partial<Dependencies> = {}): Dependencies => ({
  table,
  date: isoDate('2026-10-18'),
  ...extra,
})
const item = (description: string, code: string, extra: Partial<InputItem> = {}): InputItem => ({
  description,
  ncm: ncm(code),
  ...extra,
})

describe('camada de anexo', () => {
  it('resolve o NCM de lista fechada sem condição, com o texto literal da lei', async () => {
    const r = await classify(item('ARROZ TIPO 1 5KG', '1006.30.21'), deps())
    expect(r).toMatchObject({ status: 'resolved', confidence: 'high', layer: 'annex' })
    expect(r.classification?.cClassTrib).toBe('200003')
    expect(r.legalBasis?.text).toContain('Arroz das subposições 1006.20 e 1006.30')
  })

  it('aplica a ressalva entre anexos: Anexo I prevalece sobre o VII', async () => {
    const r = await classify(item('FARINHA DE MANDIOCA 500G', '11062000'), deps())
    expect(r.classification?.cClassTrib).toBe('200003')
    expect(r.alerts.map((a) => a.code)).toContain('annex_priority')
    expect(r.trail.some((t) => t.includes('VII.4') && t.includes('ressalvado'))).toBe(true)
  })

  it('respeita a exceção escrita no próprio item (cogumelo fora do Anexo XV)', async () => {
    const r = await classify(item('COGUMELO PARIS 200G', '07095100'), deps())
    expect(r.classification?.cClassTrib).toBe('200034')
  })
})

describe('camada de descrição', () => {
  it.each([
    ['FRALDA PAMPERS G 30UN', '200035'],
    ['ABSORVENTE ALWAYS NOTURNO', '200013'],
    ['COLETOR MENSTRUAL TAM A', '200013'],
  ])('%s → %s', async (description, expected) => {
    const r = await classify(item(description, '96190000'), deps())
    expect(r).toMatchObject({ status: 'resolved', layer: 'description', confidence: 'medium' })
    expect(r.classification?.cClassTrib).toBe(expected)
  })

  it('pergunta quando a descrição não decide, oferecendo só o que a lei permite', async () => {
    const r = await classify(item('ART HIGIENICO PCT', '96190000'), deps())
    expect(r.status).toBe('needs_info')
    expect(r.questions[0]?.options.map((o) => o.cClassTrib)).toEqual(['200035', '200013', '000001'])
  })

  it('trata sinal positivo e negativo ao mesmo tempo como conflito, nunca como descarte', async () => {
    const r = await classify(item('FRALDA ABSORVENTE', '96190000'), deps())
    expect(r.status).toBe('needs_info')
  })

  it('descarta o pão francês quando a descrição diz o contrário, e explica', async () => {
    const r = await classify(item('BISNAGUINHA 300G', '19059090'), deps())
    expect(r.classification?.cClassTrib).toBe('000001')
    expect(r.trail.some((t) => t.startsWith('Descartado I.16.bread'))).toBe(true)
  })
})

describe('camada de operação', () => {
  it('a operação decide antes do produto', async () => {
    const r = await classify(item('ARROZ 5KG', '10063021', { cfop: cfop('5152') }), deps())
    expect(r).toMatchObject({ layer: 'operation', status: 'resolved' })
    expect(r.classification?.cClassTrib).toBe('410002')
  })

  it('bonificação vira pergunta, porque depende de fato que só a empresa sabe', async () => {
    const r = await classify(item('ARROZ 5KG', '10063021', { cfop: cfop('5910') }), deps())
    expect(r.status).toBe('needs_info')
    expect(r.classification).toBeNull()
  })

  it('não classifica entrada', async () => {
    const r = await classify(item('ARROZ 5KG', '10063021', { cfop: cfop('1102') }), deps())
    expect(r.classification).toBeNull()
    expect(r.alerts[0]?.code).toBe('operation_out_of_scope')
  })
})

describe('decisão manual', () => {
  const manual = {
    cClassTrib: cClassTrib('200035'),
    reason: 'conferido com o fabricante',
    author: 'ana',
    decidedOn: isoDate('2026-10-01'),
  }

  it('sempre vence, mesmo contra a regra', async () => {
    const r = await classify(item('ABSORVENTE', '96190000', { manualDecision: manual }), deps())
    expect(r).toMatchObject({ layer: 'manual', status: 'resolved' })
    expect(r.classification?.cClassTrib).toBe('200035')
  })

  it('apontando para código que saiu da tabela: avisa, não troca', async () => {
    const r = await classify(
      item('X', '96190000', { manualDecision: { ...manual, cClassTrib: cClassTrib('999999') } }),
      deps(),
    )
    expect(r.status).toBe('review')
    expect(r.legalBasis?.text).toBe('conferido com o fabricante')
    expect(r.alerts[0]?.code).toBe('manual_decision_invalidated')
  })
})

describe('padrão e benefícios fora da cobertura', () => {
  it('NCM fora de anexo: tributação integral com confiança alta', async () => {
    const r = await classify(item('REFRIGERANTE 2L', '22021000'), deps())
    expect(r).toMatchObject({ status: 'resolved', confidence: 'high', layer: 'default' })
  })

  it('não afirma tributação integral quando a tabela oficial aponta benefício não coberto', async () => {
    const table = fakeTable(NCMS, { '22021000': ['200044'] })
    const r = await classify(item('REFRIGERANTE 2L', '22021000'), { ...deps(), table })
    expect(r.status).toBe('review')
    expect(r.alerts.map((a) => a.code)).toContain('unmapped_benefit')
  })

  it('insumo agropecuário depende da destinação: vira pergunta, nunca código', async () => {
    const r = await classify(item('FERTILIZANTE UREIA 50KG', '31021010'), deps())
    expect(r.status).toBe('needs_info')
    expect(r.questions[0]?.options.map((o) => o.cClassTrib)).toEqual(['200038', '000001'])
  })

  it('NCM não sondado na tabela oficial: integral sem confiança alta e com o motivo', async () => {
    const r = await classify(item('REFRIGERANTE 2L', '22021000'), {
      ...deps(),
      table: fakeTable(NCMS),
    })
    expect(r).toMatchObject({ status: 'resolved', confidence: 'medium', layer: 'default' })
    expect(r.alerts.map((a) => a.code)).toContain('ncm_not_probed')
  })

  it('NCM inexistente bloqueia', async () => {
    const r = await classify(item('QUALQUER', '99999999'), deps())
    expect(r.classification).toBeNull()
    expect(r.alerts[0]).toMatchObject({ code: 'unknown_ncm', severity: 'blocker' })
  })
})

describe('validação oficial', () => {
  it('recusa oficial rebaixa para revisão, mesmo com regra confiante', async () => {
    const r = await classify(
      item('ARROZ', '10063021'),
      deps({ validator: fixedValidator('rejected') }),
    )
    expect(r).toMatchObject({ status: 'review', confidence: 'low', officialValidation: 'rejected' })
  })

  it('API fora do ar não muda a decisão', async () => {
    const r = await classify(
      item('ARROZ', '10063021'),
      deps({ validator: fixedValidator('unavailable') }),
    )
    expect(r).toMatchObject({ status: 'resolved', officialValidation: 'unavailable' })
  })

  it('avisa quando a validação oficial aceita qualquer NCM (200013)', async () => {
    const r = await classify(
      item('ABSORVENTE', '96190000'),
      deps({ validator: fixedValidator('accepted') }),
    )
    expect(r.alerts.map((a) => a.code)).toContain('weak_official_validation')
  })

  it('não confunde hipótese já descartada pelo motor com hipótese oficial não coberta', async () => {
    const pad = await classify(item('ABSORVENTE', '96190000'), deps())
    expect(pad.alerts.map((a) => a.code)).not.toContain('other_official_hypotheses')
    const table = fakeTable(NCMS, { '10063021': ['200003', '200044'] })
    const rice = await classify(item('ARROZ', '10063021'), { ...deps(), table })
    const alert = rice.alerts.find((a) => a.code === 'other_official_hypotheses')
    expect(alert?.message).toContain('200044')
    expect(alert?.message).not.toContain('200038')
  })
})

describe('IA', () => {
  it('recebe só os candidatos válidos', async () => {
    const ai = fixedDisambiguator({ kind: 'need_to_ask', reason: 'não sei' })
    await classify(item('PAO KG', '19059090'), deps({ disambiguator: ai }))
    expect(ai.requests).toEqual([['200003', '000001']])
  })

  it('não é chamada quando a regra decide', async () => {
    const ai = fixedDisambiguator({ kind: 'need_to_ask', reason: '' })
    await classify(item('ARROZ', '10063021'), deps({ disambiguator: ai }))
    expect(ai.requests).toHaveLength(0)
  })

  it('escolha com citação literal vira sugestão para revisão, nunca resolvido', async () => {
    const ai = fixedDisambiguator({
      kind: 'chosen',
      cClassTrib: cClassTrib('200003'),
      quote: 'Pão comumente denominado pão francês',
      justification: 'é pão francês',
    })
    const r = await classify(item('PAO KG', '19059090'), deps({ disambiguator: ai }))
    expect(r).toMatchObject({ status: 'review', layer: 'ai', confidence: 'medium' })
    expect(r.ai?.costUsd).toBeGreaterThan(0)
  })

  it('citação inventada é descartada', async () => {
    const ai = fixedDisambiguator({
      kind: 'chosen',
      cClassTrib: cClassTrib('200003'),
      quote: 'todo pão tem alíquota zero',
      justification: '',
    })
    const r = await classify(item('PAO KG', '19059090'), deps({ disambiguator: ai }))
    expect(r.status).toBe('needs_info')
    expect(r.alerts.map((a) => a.code)).toContain('ai_discarded')
  })

  it('código fora dos candidatos é descartado', async () => {
    const ai = fixedDisambiguator({
      kind: 'chosen',
      cClassTrib: cClassTrib('200014'),
      quote: 'Pão comumente denominado pão francês',
      justification: '',
    })
    const r = await classify(item('PAO KG', '19059090'), deps({ disambiguator: ai }))
    expect(r.classification).toBeNull()
  })
})

describe('propriedades', () => {
  const anyNcm = fc.constantFrom(...Object.keys(NCMS), '99999999')
  const description = fc.string({ maxLength: 80 })

  it('o motor nunca lança e sempre termina com status válido', async () => {
    await fc.assert(
      fc.asyncProperty(anyNcm, description, async (n, d) => {
        const r = await classify(item(d, n), deps())
        expect(['resolved', 'review', 'needs_info']).toContain(r.status)
        expect(r.trail.length).toBeGreaterThan(0)
      }),
    )
  })

  it('resolvido sempre tem classificação, fundamento e confiança alta ou média', async () => {
    await fc.assert(
      fc.asyncProperty(anyNcm, description, async (n, d) => {
        const r = await classify(item(d, n), deps())
        if (r.status !== 'resolved') return
        expect(r.classification).not.toBeNull()
        expect(r.legalBasis?.text.length).toBeGreaterThan(0)
        expect(r.confidence).not.toBe('low')
      }),
    )
  })

  it('o código escolhido é sempre um dos códigos que a regra ofereceu', async () => {
    await fc.assert(
      fc.asyncProperty(description, async (d) => {
        const r = await classify(item(d, '96190000'), deps())
        if (r.candidates.length === 0 || !r.classification) return
        expect(r.candidates.map((c) => c.cClassTrib)).toContain(r.classification.cClassTrib)
      }),
    )
  })

  it('decisão manual nunca é trocada pelo motor', async () => {
    await fc.assert(
      fc.asyncProperty(anyNcm, description, async (n, d) => {
        const manualDecision = {
          cClassTrib: cClassTrib('000001'),
          reason: 'm',
          author: 'a',
          decidedOn: isoDate('2026-01-01'),
        }
        const r = await classify(item(d, n, { manualDecision }), deps())
        if (r.classification) expect(r.classification.cClassTrib).toBe('000001')
      }),
    )
  })
})
