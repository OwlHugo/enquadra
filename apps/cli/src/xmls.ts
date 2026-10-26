import type { ItemEntrada } from '@enquadra/dominio'
import { chaveItem, lerNfe, type NotaLida } from '@enquadra/nfe'

/** Arquivo que não pôde ser lido como NF-e, com o motivo para a pessoa corrigir. */
export interface Falha {
  readonly arquivo: string
  readonly motivo: string
}

export interface XmlsLidos {
  readonly notas: number
  /** Itens distintos de todas as notas válidas. */
  readonly itens: readonly ItemEntrada[]
  readonly falhas: readonly Falha[]
}

/**
 * Lê todos os arquivos e separa o que deu certo do que falhou. Um XML inválido não derruba o
 * lote, mas também não some: vira uma `Falha` que a CLI mostra no resumo e no relatório.
 */
export const lerXmls = async (
  arquivos: readonly string[],
  ler: (arquivo: string) => Promise<string>,
): Promise<XmlsLidos> => {
  const distintos = new Map<string, ItemEntrada>()
  const falhas: Falha[] = []
  let notas = 0
  for (const arquivo of arquivos) {
    let nota: NotaLida
    try {
      nota = lerNfe(await ler(arquivo))
    } catch (erro) {
      falhas.push({ arquivo, motivo: erro instanceof Error ? erro.message : String(erro) })
      continue
    }
    notas++
    for (const item of nota.itens) distintos.set(chaveItem(item), item)
  }
  return { notas, itens: [...distintos.values()], falhas }
}
