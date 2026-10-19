import { type Avaliacao, avaliar, normalizarDescricao } from './descricao.ts'
import { casaPrefixo } from './ncm.ts'
import { REGRAS_PRODUTO, type RegraProduto } from './regras/produtos.ts'
import type { Ncm } from './tipos.ts'

/**
 * Primeira metade do motor, síncrona e pura: dado NCM e descrição,
 * quais regras de produto podem valer e em que estado está cada condição.
 */

export interface Hipotese {
  readonly regra: RegraProduto
  /** 'atende' também quando a regra não tem condição. */
  readonly avaliacao: Avaliacao
  readonly temCondicao: boolean
}

export interface Hipoteses {
  readonly vivas: readonly Hipotese[]
  readonly descartadas: readonly { readonly regra: RegraProduto; readonly motivo: string }[]
}

const casa = (regra: RegraProduto, codigo: Ncm): boolean =>
  regra.incluir.some((p) => casaPrefixo(codigo, p)) &&
  ![...(regra.excluir ?? []), ...(regra.afastadoPorRessalva?.prefixos ?? [])].some((p) =>
    casaPrefixo(codigo, p),
  )

export const levantarHipoteses = (
  codigo: Ncm,
  descricao: string,
  regras: readonly RegraProduto[] = REGRAS_PRODUTO,
): Hipoteses => {
  const texto = normalizarDescricao(descricao)
  const descartadas: { regra: RegraProduto; motivo: string }[] = []
  const avaliadas: Hipotese[] = []

  for (const regra of regras.filter((r) => casa(r, codigo))) {
    const avaliacao = regra.condicao ? avaliar(regra.condicao, texto) : 'atende'
    if (avaliacao === 'nao_atende') {
      descartadas.push({ regra, motivo: `a descrição não atende: ${regra.condicao?.pergunta}` })
    } else {
      avaliadas.push({ regra, avaliacao, temCondicao: regra.condicao !== undefined })
    }
  }

  // Ressalva entre anexos ("ressalvados os produtos relacionados no Anexo I"):
  // só afasta quando a regra prioritária está confirmada, nunca por hipótese.
  const vivas = avaliadas.filter((h) => {
    const prioritaria = avaliadas.find(
      (outra) =>
        outra !== h &&
        outra.avaliacao === 'atende' &&
        (h.regra.ressalvadoPor ?? []).includes(outra.regra.origem),
    )
    if (prioritaria) {
      descartadas.push({
        regra: h.regra,
        motivo: `ressalvado pelo ${prioritaria.regra.dispositivo}`,
      })
      return false
    }
    return true
  })

  return { vivas, descartadas }
}
