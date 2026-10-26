import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  cClassTrib,
  cfop,
  type Dependencias,
  dataIso,
  enquadrar,
  type ItemEntrada,
  ncm,
} from './index.ts'
import { desambiguadorFixo, tabelaFalsa, validadorFixo } from './test-doubles.ts'

const NCMS = {
  '10063021': 'Arroz semibranqueado ou branqueado, polido ou brunido',
  '96190000': 'Absorventes e tampões higiênicos, cueiros, fraldas e artigos higiênicos semelhantes',
  '22021000': 'Águas, incluindo as águas minerais e as águas gaseificadas, adicionadas de açúcar',
  '19059090': 'Outros produtos de padaria',
  '11062000': 'Farinhas, sêmolas e pós de mandioca',
  '07095100': 'Cogumelos do gênero Agaricus',
  '31021010': 'Ureia com teor de nitrogênio superior a 45%',
}
const tabela = tabelaFalsa(NCMS, {
  '22021000': [],
  '19059090': ['200003'],
  '11062000': ['200003'],
  '10063021': ['200003', '200038'],
  '96190000': ['200035'],
  '31021010': ['200038'],
  '07095100': ['200034', '200038'],
})
const deps = (extra: Partial<Dependencias> = {}): Dependencias => ({
  tabela,
  data: dataIso('2026-10-18'),
  ...extra,
})
const item = (
  descricao: string,
  codigo: string,
  extra: Partial<ItemEntrada> = {},
): ItemEntrada => ({
  descricao,
  ncm: ncm(codigo),
  ...extra,
})

describe('camada de anexo', () => {
  it('resolve o NCM de lista fechada sem condição, com o texto literal da lei', async () => {
    const r = await enquadrar(item('ARROZ TIPO 1 5KG', '1006.30.21'), deps())
    expect(r).toMatchObject({ status: 'resolvido', confianca: 'alta', camada: 'anexo' })
    expect(r.classificacao?.cClassTrib).toBe('200003')
    expect(r.fundamento?.texto).toContain('Arroz das subposições 1006.20 e 1006.30')
  })

  it('aplica a ressalva entre anexos: Anexo I prevalece sobre o VII', async () => {
    const r = await enquadrar(item('FARINHA DE MANDIOCA 500G', '11062000'), deps())
    expect(r.classificacao?.cClassTrib).toBe('200003')
    expect(r.alertas.map((a) => a.codigo)).toContain('prioridade_entre_anexos')
    expect(r.trilha.some((t) => t.includes('VII.4') && t.includes('ressalvado'))).toBe(true)
  })

  it('respeita a exceção escrita no próprio item (cogumelo fora do Anexo XV)', async () => {
    const r = await enquadrar(item('COGUMELO PARIS 200G', '07095100'), deps())
    expect(r.classificacao?.cClassTrib).toBe('200034')
  })
})

describe('camada de descrição', () => {
  it.each([
    ['FRALDA PAMPERS G 30UN', '200035'],
    ['ABSORVENTE ALWAYS NOTURNO', '200013'],
    ['COLETOR MENSTRUAL TAM A', '200013'],
  ])('%s → %s', async (descricao, esperado) => {
    const r = await enquadrar(item(descricao, '96190000'), deps())
    expect(r).toMatchObject({ status: 'resolvido', camada: 'descricao', confianca: 'media' })
    expect(r.classificacao?.cClassTrib).toBe(esperado)
  })

  it('pergunta quando a descrição não decide, oferecendo só o que a lei permite', async () => {
    const r = await enquadrar(item('ART HIGIENICO PCT', '96190000'), deps())
    expect(r.status).toBe('falta_informacao')
    expect(r.perguntas[0]?.opcoes.map((o) => o.cClassTrib)).toEqual(['200035', '200013', '000001'])
  })

  it('trata sinal positivo e negativo ao mesmo tempo como conflito, nunca como descarte', async () => {
    const r = await enquadrar(item('FRALDA ABSORVENTE', '96190000'), deps())
    expect(r.status).toBe('falta_informacao')
  })

  it('descarta o pão francês quando a descrição diz o contrário, e explica', async () => {
    const r = await enquadrar(item('BISNAGUINHA 300G', '19059090'), deps())
    expect(r.classificacao?.cClassTrib).toBe('000001')
    expect(r.trilha.some((t) => t.startsWith('Descartado I.16.pao'))).toBe(true)
  })
})

describe('camada de operação', () => {
  it('a operação decide antes do produto', async () => {
    const r = await enquadrar(item('ARROZ 5KG', '10063021', { cfop: cfop('5152') }), deps())
    expect(r).toMatchObject({ camada: 'operacao', status: 'resolvido' })
    expect(r.classificacao?.cClassTrib).toBe('410002')
  })

  it('bonificação vira pergunta, porque depende de fato que só a empresa sabe', async () => {
    const r = await enquadrar(item('ARROZ 5KG', '10063021', { cfop: cfop('5910') }), deps())
    expect(r.status).toBe('falta_informacao')
    expect(r.classificacao).toBeNull()
  })

  it('não classifica entrada', async () => {
    const r = await enquadrar(item('ARROZ 5KG', '10063021', { cfop: cfop('1102') }), deps())
    expect(r.classificacao).toBeNull()
    expect(r.alertas[0]?.codigo).toBe('operacao_fora_do_escopo')
  })
})

describe('decisão manual', () => {
  const manual = {
    cClassTrib: cClassTrib('200035'),
    motivo: 'conferido com o fabricante',
    autor: 'ana',
    em: dataIso('2026-10-01'),
  }

  it('sempre vence, mesmo contra a regra', async () => {
    const r = await enquadrar(item('ABSORVENTE', '96190000', { decisaoManual: manual }), deps())
    expect(r).toMatchObject({ camada: 'manual', status: 'resolvido' })
    expect(r.classificacao?.cClassTrib).toBe('200035')
  })

  it('apontando para código que saiu da tabela: avisa, não troca', async () => {
    const r = await enquadrar(
      item('X', '96190000', { decisaoManual: { ...manual, cClassTrib: cClassTrib('999999') } }),
      deps(),
    )
    expect(r.status).toBe('revisar')
    expect(r.fundamento?.texto).toBe('conferido com o fabricante')
    expect(r.alertas[0]?.codigo).toBe('decisao_manual_invalidada')
  })
})

describe('padrão e benefícios fora da cobertura', () => {
  it('NCM fora de anexo: tributação integral com confiança alta', async () => {
    const r = await enquadrar(item('REFRIGERANTE 2L', '22021000'), deps())
    expect(r).toMatchObject({ status: 'resolvido', confianca: 'alta', camada: 'padrao' })
  })

  it('não afirma tributação integral quando a tabela oficial aponta benefício não coberto', async () => {
    const r = await enquadrar(item('UREIA AGRICOLA 50KG', '31021010'), deps())
    expect(r.status).toBe('revisar')
    expect(r.alertas.map((a) => a.codigo)).toContain('beneficio_nao_mapeado')
  })

  it('NCM não sondado na tabela oficial: integral sem confiança alta e com o motivo', async () => {
    const r = await enquadrar(item('REFRIGERANTE 2L', '22021000'), {
      ...deps(),
      tabela: tabelaFalsa(NCMS),
    })
    expect(r).toMatchObject({ status: 'resolvido', confianca: 'media', camada: 'padrao' })
    expect(r.alertas.map((a) => a.codigo)).toContain('ncm_nao_sondado')
  })

  it('NCM inexistente bloqueia', async () => {
    const r = await enquadrar(item('QUALQUER', '99999999'), deps())
    expect(r.classificacao).toBeNull()
    expect(r.alertas[0]).toMatchObject({ codigo: 'ncm_inexistente', gravidade: 'bloqueio' })
  })
})

describe('validação oficial', () => {
  it('recusa oficial rebaixa para revisão, mesmo com regra confiante', async () => {
    const r = await enquadrar(
      item('ARROZ', '10063021'),
      deps({ validador: validadorFixo('recusado') }),
    )
    expect(r).toMatchObject({ status: 'revisar', confianca: 'baixa', validacaoOficial: 'recusado' })
  })

  it('API fora do ar não muda a decisão', async () => {
    const r = await enquadrar(
      item('ARROZ', '10063021'),
      deps({ validador: validadorFixo('indisponivel') }),
    )
    expect(r).toMatchObject({ status: 'resolvido', validacaoOficial: 'indisponivel' })
  })

  it('avisa quando a validação oficial aceita qualquer NCM (200013)', async () => {
    const r = await enquadrar(
      item('ABSORVENTE', '96190000'),
      deps({ validador: validadorFixo('aceito') }),
    )
    expect(r.alertas.map((a) => a.codigo)).toContain('validacao_oficial_fraca')
  })

  it('não confunde hipótese já descartada pelo motor com hipótese oficial não coberta', async () => {
    const absorvente = await enquadrar(item('ABSORVENTE', '96190000'), deps())
    expect(absorvente.alertas.map((a) => a.codigo)).not.toContain('outras_hipoteses_oficiais')
    const arroz = await enquadrar(item('ARROZ', '10063021'), deps())
    const alerta = arroz.alertas.find((a) => a.codigo === 'outras_hipoteses_oficiais')
    expect(alerta?.mensagem).toContain('200038')
  })
})

describe('IA', () => {
  it('recebe só os candidatos válidos', async () => {
    const ia = desambiguadorFixo({ tipo: 'preciso_perguntar', motivo: 'não sei' })
    await enquadrar(item('PAO KG', '19059090'), deps({ desambiguador: ia }))
    expect(ia.pedidos).toEqual([['200003', '000001']])
  })

  it('não é chamada quando a regra decide', async () => {
    const ia = desambiguadorFixo({ tipo: 'preciso_perguntar', motivo: '' })
    await enquadrar(item('ARROZ', '10063021'), deps({ desambiguador: ia }))
    expect(ia.pedidos).toHaveLength(0)
  })

  it('escolha com citação literal vira sugestão para revisão, nunca resolvido', async () => {
    const ia = desambiguadorFixo({
      tipo: 'escolhido',
      cClassTrib: cClassTrib('200003'),
      citacao: 'Pão comumente denominado pão francês',
      justificativa: 'é pão francês',
    })
    const r = await enquadrar(item('PAO KG', '19059090'), deps({ desambiguador: ia }))
    expect(r).toMatchObject({ status: 'revisar', camada: 'ia', confianca: 'media' })
    expect(r.ia?.custoUsd).toBeGreaterThan(0)
  })

  it('citação inventada é descartada', async () => {
    const ia = desambiguadorFixo({
      tipo: 'escolhido',
      cClassTrib: cClassTrib('200003'),
      citacao: 'todo pão tem alíquota zero',
      justificativa: '',
    })
    const r = await enquadrar(item('PAO KG', '19059090'), deps({ desambiguador: ia }))
    expect(r.status).toBe('falta_informacao')
    expect(r.alertas.map((a) => a.codigo)).toContain('ia_descartada')
  })

  it('código fora dos candidatos é descartado', async () => {
    const ia = desambiguadorFixo({
      tipo: 'escolhido',
      cClassTrib: cClassTrib('200014'),
      citacao: 'Pão comumente denominado pão francês',
      justificativa: '',
    })
    const r = await enquadrar(item('PAO KG', '19059090'), deps({ desambiguador: ia }))
    expect(r.classificacao).toBeNull()
  })
})

describe('propriedades', () => {
  const ncmQualquer = fc.constantFrom(...Object.keys(NCMS), '99999999')
  const descricao = fc.string({ maxLength: 80 })

  it('o motor nunca lança e sempre termina com status válido', async () => {
    await fc.assert(
      fc.asyncProperty(ncmQualquer, descricao, async (n, d) => {
        const r = await enquadrar(item(d, n), deps())
        expect(['resolvido', 'revisar', 'falta_informacao']).toContain(r.status)
        expect(r.trilha.length).toBeGreaterThan(0)
      }),
    )
  })

  it('resolvido sempre tem classificação, fundamento e confiança alta ou média', async () => {
    await fc.assert(
      fc.asyncProperty(ncmQualquer, descricao, async (n, d) => {
        const r = await enquadrar(item(d, n), deps())
        if (r.status !== 'resolvido') return
        expect(r.classificacao).not.toBeNull()
        expect(r.fundamento?.texto.length).toBeGreaterThan(0)
        expect(r.confianca).not.toBe('baixa')
      }),
    )
  })

  it('o código escolhido é sempre um dos códigos que a regra ofereceu', async () => {
    await fc.assert(
      fc.asyncProperty(descricao, async (d) => {
        const r = await enquadrar(item(d, '96190000'), deps())
        if (r.candidatos.length === 0 || !r.classificacao) return
        expect(r.candidatos.map((c) => c.cClassTrib)).toContain(r.classificacao.cClassTrib)
      }),
    )
  })

  it('decisão manual nunca é trocada pelo motor', async () => {
    await fc.assert(
      fc.asyncProperty(ncmQualquer, descricao, async (n, d) => {
        const decisaoManual = {
          cClassTrib: cClassTrib('000001'),
          motivo: 'm',
          autor: 'a',
          em: dataIso('2026-01-01'),
        }
        const r = await enquadrar(item(d, n, { decisaoManual }), deps())
        if (r.classificacao) expect(r.classificacao.cClassTrib).toBe('000001')
      }),
    )
  })
})
