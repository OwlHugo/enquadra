import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { cfop, formatarNcm, ncm } from './ncm.ts'
import { cClassTrib, dataIso, ErroDeDominio } from './types.ts'

describe('tipos nominais', () => {
  it('NCM aceita as grafias de cadastro e rejeita o resto', () => {
    expect(ncm('0901.21.00')).toBe('09012100')
    expect(ncm(' 0901 21 00 ')).toBe('09012100')
    expect(() => ncm('0901.21')).toThrow(ErroDeDominio)
    expect(() => ncm('abcdefgh')).toThrow('ncm_invalido')
  })

  it('formatar e ler o NCM são inversos', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\d{8}$/), (d) => {
        expect(ncm(formatarNcm(ncm(d)))).toBe(d)
      }),
    )
  })

  it('CFOP, cClassTrib e data validam formato', () => {
    expect(cfop('5.102')).toBe('5102')
    expect(() => cfop('51')).toThrow('cfop_invalido')
    expect(() => cClassTrib('2000')).toThrow('cclasstrib_invalido')
    expect(() => dataIso('18/10/2026')).toThrow('data_invalida')
    expect(() => dataIso('2026-13-45')).toThrow('data_invalida')
    expect(dataIso('2026-10-18')).toBe('2026-10-18')
  })
})
