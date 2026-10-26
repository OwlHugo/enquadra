import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { cfop, formatNcm, ncm } from './ncm.ts'
import { cClassTrib, DomainError, isoDate } from './types.ts'

describe('tipos nominais', () => {
  it('NCM aceita as grafias de cadastro e rejeita o resto', () => {
    expect(ncm('0901.21.00')).toBe('09012100')
    expect(ncm(' 0901 21 00 ')).toBe('09012100')
    expect(() => ncm('0901.21')).toThrow(DomainError)
    expect(() => ncm('abcdefgh')).toThrow('invalid_ncm')
  })

  it('formatar e ler o NCM são inversos', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\d{8}$/), (d) => {
        expect(ncm(formatNcm(ncm(d)))).toBe(d)
      }),
    )
  })

  it('CFOP, cClassTrib e data validam formato', () => {
    expect(cfop('5.102')).toBe('5102')
    expect(() => cfop('51')).toThrow('invalid_cfop')
    expect(() => cClassTrib('2000')).toThrow('invalid_cclasstrib')
    expect(() => isoDate('18/10/2026')).toThrow('invalid_date')
    expect(() => isoDate('2026-13-45')).toThrow('invalid_date')
    expect(isoDate('2026-10-18')).toBe('2026-10-18')
  })
})
