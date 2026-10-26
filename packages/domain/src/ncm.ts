import { type Cfop, DomainError, type Ncm } from './types.ts'

/** Aceita "0901.21.00", "09012100" ou " 0901 21 00 ". Rejeita o que não tiver 8 dígitos. */
export const ncm = (value: string): Ncm => {
  const digits = value.replace(/[\s.]/g, '')
  if (!/^\d{8}$/.test(digits)) throw new DomainError('invalid_ncm', value)
  return digits as Ncm
}

export const cfop = (value: string): Cfop => {
  const digits = value.replace(/[\s.]/g, '')
  if (!/^\d{4}$/.test(digits)) throw new DomainError('invalid_cfop', value)
  return digits as Cfop
}

/**
 * A lei cita NCM em vários níveis: capítulo ("Capítulo 6"), posição ("09.01"),
 * subposição ("2101.1") ou código ("0405.10.00"). Todos viram prefixo de dígitos.
 */
export const matchesPrefix = (code: Ncm, prefix: string): boolean => code.startsWith(prefix)

export const formatNcm = (code: Ncm): string =>
  `${code.slice(0, 4)}.${code.slice(4, 6)}.${code.slice(6, 8)}`
