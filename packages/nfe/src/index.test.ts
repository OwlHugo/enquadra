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

  it('deduplica pelo que importa para o enquadramento', () => {
    const [a] = nota.itens
    if (!a) throw new Error('sem item')
    expect(chaveItem(a)).toBe(chaveItem({ ...a, descricao: '  arroz tipo 1   TIO JOAO 5kg ' }))
  })
})
