import type { Resultado } from './types.ts'

export interface Resumo {
  readonly total: number
  readonly resolvidos: number
  readonly revisar: number
  readonly faltaInformacao: number
  readonly comReducao: number
  readonly bloqueios: number
  readonly custoIaUsd: number
}

export const resumir = (resultados: readonly Resultado[]): Resumo => {
  let resolvidos = 0
  let revisar = 0
  let faltaInformacao = 0
  let comReducao = 0
  let bloqueios = 0
  let custoIaUsd = 0
  for (const r of resultados) {
    if (r.status === 'resolvido') resolvidos++
    else if (r.status === 'revisar') revisar++
    else faltaInformacao++
    if ((r.classificacao?.reducaoCbs ?? 0) > 0) comReducao++
    if (r.alertas.some((a) => a.gravidade === 'bloqueio')) bloqueios++
    custoIaUsd += r.ia?.custoUsd ?? 0
  }
  return {
    total: resultados.length,
    resolvidos,
    revisar,
    faltaInformacao,
    comReducao,
    bloqueios,
    custoIaUsd,
  }
}
