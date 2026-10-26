import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { itemKey, parseNfe } from './index.ts'

const xml = readFileSync(new URL('../../../examples/nfe-mercado.xml', import.meta.url), 'utf8')

describe('leitura de NF-e', () => {
  const invoice = parseNfe(xml)

  it('extrai itens com NCM, CFOP e data de emissão', () => {
    expect(invoice).toMatchObject({
      model: '55',
      issueDate: '2026-10-15',
      destinationUf: 'MT',
      recipientType: 'pf',
    })
    expect(invoice.items).toHaveLength(5)
    expect(invoice.items[0]).toEqual({
      description: 'ARROZ TIPO 1 TIO JOAO 5KG',
      ncm: '10063021',
      cfop: '5102',
      date: '2026-10-15',
    })
  })

  it('descarta dado pessoal: nada do destinatário além do tipo e da UF', () => {
    const serialized = JSON.stringify(invoice)
    for (const value of ['FULANA', '98765432100', 'RUA DOS TESTES', '32.90']) {
      expect(serialized).not.toContain(value)
    }
  })

  it('guarda o cClassTrib já emitido, para auditoria', () => {
    expect(invoice.issued.map((e) => e.cClassTrib)).toEqual(['200003', '000001', null, null, null])
  })

  it('rejeita XML que não é NF-e', () => {
    expect(() => parseNfe('<cte><infCte/></cte>')).toThrow('not_an_nfe')
  })

  it('rejeita XML truncado em vez de devolver só os itens lidos até o corte', () => {
    const truncated = xml.slice(0, xml.indexOf('<det nItem="3">'))
    expect(() => parseNfe(truncated)).toThrow('malformed_xml')
  })

  it.each([
    ['item sem NCM', '<NCM>10063021</NCM>', '', 'item_without_ncm'],
    [
      'item sem descrição',
      '<xProd>ARROZ TIPO 1 TIO JOAO 5KG</xProd>',
      '',
      'item_without_description',
    ],
    ['item sem CFOP', '<CFOP>5102</CFOP><vProd>32.90', '<vProd>32.90', 'item_without_cfop'],
    ['modelo que não é NF-e nem NFC-e', '<mod>55</mod>', '<mod>57</mod>', 'unsupported_model'],
    ['nota sem emissão', '<dhEmi>2026-10-15T09:12:00-04:00</dhEmi>', '', 'nfe_without_issue_date'],
  ])('rejeita %s em vez de pular o dado', (_, snippet, replacement, code) => {
    expect(() => parseNfe(xml.replace(snippet, replacement))).toThrow(code)
  })

  it('rejeita nota sem itens', () => {
    const withoutItems = xml.replace(/<det[\s\S]*<\/det>/, '')
    expect(() => parseNfe(withoutItems)).toThrow('nfe_without_items')
  })

  it('deduplica pelo que importa para o enquadramento', () => {
    const [a] = invoice.items
    if (!a) throw new Error('sem item')
    expect(itemKey(a)).toBe(itemKey({ ...a, description: '  arroz tipo 1   TIO JOAO 5kg ' }))
  })
})
