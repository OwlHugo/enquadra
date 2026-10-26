import {
  type CClassTrib,
  type Choice,
  type Classification,
  cClassTrib,
  cstOf,
  type Disambiguator,
  type Ncm,
  type OfficialTable,
  type OfficialValidation,
  type OfficialValidator,
} from './index.ts'

/** Implementações em memória das portas, para teste. Nenhuma toca rede ou disco. */

const cls = (
  code: string,
  description: string,
  reduction = 0,
  restricted = true,
): Classification => {
  const c = cClassTrib(code)
  return {
    cst: cstOf(c),
    cClassTrib: c,
    description,
    cbsReduction: reduction,
    ibsReduction: reduction,
    restrictedNcmList: restricted,
  }
}

const CLASSIFICATIONS = [
  cls('000001', 'Situações tributadas integralmente pelo IBS e CBS.', 0, false),
  cls('200003', 'Vendas de produtos destinados à alimentação humana (Anexo I)', 100),
  cls('200013', 'Fornecimento de tampões higiênicos, absorventes...', 100, false),
  cls('200014', 'Fornecimento dos produtos hortícolas, frutas e ovos (Anexo XV)', 100),
  cls('200034', 'Fornecimento dos alimentos destinados ao consumo humano (Anexo VII)', 60),
  cls('200035', 'Fornecimento dos produtos de higiene pessoal e limpeza (Anexo VIII)', 60),
  cls('200038', 'Fornecimento dos insumos agropecuários e aquícolas (Anexo IX)', 60),
  cls('410001', 'Bonificações', 0, false),
  cls('410002', 'Transferências entre estabelecimentos', 0, false),
  cls('410003', 'Doações', 0, false),
  cls('410004', 'Exportações', 0, false),
  cls('410008', 'Livros', 0, false),
]

export const fakeTable = (
  ncms: Record<string, string>,
  accepted: Record<string, string[]> = {},
): OfficialTable => {
  const byCode = new Map(CLASSIFICATIONS.map((c) => [c.cClassTrib, c]))
  return {
    version: 'TESTE',
    classification: (c) => byCode.get(c),
    ncmName: (n: Ncm) => ncms[n],
    restrictedAccepting: (n: Ncm) => accepted[n]?.map(cClassTrib),
  }
}

export const fixedValidator = (
  response: OfficialValidation,
): OfficialValidator & { calls: number } => {
  const v = {
    calls: 0,
    validate: async () => {
      v.calls++
      return response
    },
  }
  return v
}

export const fixedDisambiguator = (
  choice: Choice,
): Disambiguator & { requests: CClassTrib[][] } => {
  const d = {
    requests: [] as CClassTrib[][],
    choose: async (p: { candidates: readonly { cClassTrib: CClassTrib }[] }) => {
      d.requests.push(p.candidates.map((c) => c.cClassTrib))
      return { choice, usage: { model: 'falso', costUsd: 0.0001, ms: 1 } }
    },
  }
  return d
}
