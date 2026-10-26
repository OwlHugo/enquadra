import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { chaveItem, lerNfe } from './index.ts'

const xml = readFileSync(new URL('../../../exemplos/nfe-mercado.xml', import.meta.url), 'utf8')

describe('leitura de NF-e', () => {
  const nota = lerNfe(xml)

  it('extrai itens com NCM, CFOP e data de emissão', () => {
    expect(nota).toMatchObject({
      modelo: '55',
      emissao: '2026-10-15',
      ufDestino: 'MT',
      tipoDestinatario: 'pf',
    })
    expect(nota.itens).toHaveLength(5)
    expect(nota.itens[0]).toEqual({
      descricao: 'ARROZ TIPO 1 TIO JOAO 5KG',
      ncm: '10063021',
      cfop: '5102',
      data: '2026-10-15',
    })
  })

  it('descarta dado pessoal: nada do destinatário além do tipo e da UF', () => {
    const serializado = JSON.stringify(nota)
    for (const dado of ['FULANA', '98765432100', 'RUA DOS TESTES', '32.90']) {
      expect(serializado).not.toContain(dado)
    }
  })

  it('guarda o cClassTrib já emitido, para auditoria', () => {
    expect(nota.emitido.map((e) => e.cClassTrib)).toEqual(['200003', '000001', null, null, null])
  })

  it('rejeita XML que não é NF-e', () => {
    expect(() => lerNfe('<cte><infCte/></cte>')).toThrow('xml_nao_e_nfe')
  })

  it('rejeita XML truncado em vez de devolver só os itens lidos até o corte', () => {
    const cortado = xml.slice(0, xml.indexOf('<det nItem="3">'))
    expect(() => lerNfe(cortado)).toThrow('xml_malformado')
  })

  it.each([
    ['item sem NCM', '<NCM>10063021</NCM>', '', 'item_sem_ncm'],
    ['item sem descrição', '<xProd>ARROZ TIPO 1 TIO JOAO 5KG</xProd>', '', 'item_sem_descricao'],
    ['item sem CFOP', '<CFOP>5102</CFOP><vProd>32.90', '<vProd>32.90', 'item_sem_cfop'],
    ['modelo que não é NF-e nem NFC-e', '<mod>55</mod>', '<mod>57</mod>', 'modelo_nao_suportado'],
    ['nota sem emissão', '<dhEmi>2026-10-15T09:12:00-04:00</dhEmi>', '', 'nfe_sem_emissao'],
  ])('rejeita %s em vez de pular o dado', (_, trecho, troca, codigo) => {
    expect(() => lerNfe(xml.replace(trecho, troca))).toThrow(codigo)
  })

  it('rejeita nota sem itens', () => {
    const semItens = xml.replace(/<det[\s\S]*<\/det>/, '')
    expect(() => lerNfe(semItens)).toThrow('nfe_sem_itens')
  })

  it('deduplica pelo que importa para o enquadramento', () => {
    const [a] = nota.itens
    if (!a) throw new Error('sem item')
    expect(chaveItem(a)).toBe(chaveItem({ ...a, descricao: '  arroz tipo 1   TIO JOAO 5kg ' }))
  })
})
