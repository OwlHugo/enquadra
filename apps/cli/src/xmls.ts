import { DomainError, type InputItem } from '@enquadra/domain'
import { itemKey, type ParsedInvoice, parseNfe } from '@enquadra/nfe'

/** Arquivo que não pôde ser lido como NF-e, com o motivo para a pessoa corrigir. */
export interface Failure {
  readonly file: string
  /** Código estável: o do DomainError (ex.: malformed_xml) ou o errno (ex.: ENOENT). */
  readonly code: string
  readonly detail: string
}

export interface ParsedXmls {
  readonly invoices: number
  /** Itens distintos de todas as notas válidas. */
  readonly items: readonly InputItem[]
  readonly failures: readonly Failure[]
}

/** Erro de sistema ao abrir o arquivo (ENOENT, EACCES, EISDIR) traz `syscall`; ERR_* do Node, não. */
const isFileError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'syscall' in error

/**
 * Lê todos os arquivos e separa o que deu certo do que falhou. Um XML inválido não derruba o
 * lote, mas também não some: vira uma `Failure` que a CLI mostra no resumo e no relatório.
 */
export const readXmls = async (
  files: readonly string[],
  read: (file: string) => Promise<string>,
): Promise<ParsedXmls> => {
  const distinct = new Map<string, InputItem>()
  const failures: Failure[] = []
  let invoices = 0
  for (const file of files) {
    let invoice: ParsedInvoice
    try {
      invoice = parseNfe(await read(file))
    } catch (error) {
      // Só vira falha do arquivo o que é problema do arquivo: NF-e inválida ou erro de leitura.
      // Qualquer outra exceção é bug e derruba o comando.
      if (error instanceof DomainError)
        failures.push({ file, code: error.code, detail: error.detail })
      else if (isFileError(error)) failures.push({ file, code: String(error.code), detail: '' })
      else throw error
      continue
    }
    invoices++
    for (const item of invoice.items) distinct.set(itemKey(item), item)
  }
  return { invoices, items: [...distinct.values()], failures }
}
