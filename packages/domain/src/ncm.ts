import { type Cfop, ErroDeDominio, type Ncm } from './types.ts'

/** Aceita "0901.21.00", "09012100" ou " 0901 21 00 ". Rejeita o que não tiver 8 dígitos. */
export const ncm = (valor: string): Ncm => {
  const digitos = valor.replace(/[\s.]/g, '')
  if (!/^\d{8}$/.test(digitos)) throw new ErroDeDominio('ncm_invalido', valor)
  return digitos as Ncm
}

export const cfop = (valor: string): Cfop => {
  const digitos = valor.replace(/[\s.]/g, '')
  if (!/^\d{4}$/.test(digitos)) throw new ErroDeDominio('cfop_invalido', valor)
  return digitos as Cfop
}

/**
 * A lei cita NCM em vários níveis: capítulo ("Capítulo 6"), posição ("09.01"),
 * subposição ("2101.1") ou código ("0405.10.00"). Todos viram prefixo de dígitos.
 */
export const casaPrefixo = (codigo: Ncm, prefixo: string): boolean => codigo.startsWith(prefixo)

export const formatarNcm = (codigo: Ncm): string =>
  `${codigo.slice(0, 4)}.${codigo.slice(4, 6)}.${codigo.slice(6, 8)}`
