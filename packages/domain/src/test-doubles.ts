import {
  type CClassTrib,
  type Classificacao,
  cClassTrib,
  cstDe,
  type Desambiguador,
  type Escolha,
  type Ncm,
  type TabelaOficial,
  type ValidacaoOficial,
  type ValidadorOficial,
} from './index.ts'

/** Implementações em memória das portas, para teste. Nenhuma toca rede ou disco. */

const cls = (codigo: string, descricao: string, reducao = 0, restrita = true): Classificacao => {
  const c = cClassTrib(codigo)
  return {
    cst: cstDe(c),
    cClassTrib: c,
    descricao,
    reducaoCbs: reducao,
    reducaoIbs: reducao,
    listaNcmRestrita: restrita,
  }
}

const CLASSIFICACOES = [
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

export const tabelaFalsa = (
  ncms: Record<string, string>,
  aceitos: Record<string, string[]> = {},
): TabelaOficial => {
  const mapa = new Map(CLASSIFICACOES.map((c) => [c.cClassTrib, c]))
  return {
    versao: 'TESTE',
    classificacao: (c) => mapa.get(c),
    nomeNcm: (n: Ncm) => ncms[n],
    restritosQueAceitam: (n: Ncm) => aceitos[n]?.map(cClassTrib),
  }
}

export const validadorFixo = (
  resposta: ValidacaoOficial,
): ValidadorOficial & { chamadas: number } => {
  const v = {
    chamadas: 0,
    validar: async () => {
      v.chamadas++
      return resposta
    },
  }
  return v
}

export const desambiguadorFixo = (
  escolha: Escolha,
): Desambiguador & { pedidos: CClassTrib[][] } => {
  const d = {
    pedidos: [] as CClassTrib[][],
    escolher: async (p: { candidatos: readonly { cClassTrib: CClassTrib }[] }) => {
      d.pedidos.push(p.candidatos.map((c) => c.cClassTrib))
      return { escolha, uso: { modelo: 'falso', custoUsd: 0.0001, ms: 1 } }
    },
  }
  return d
}
