import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  type CClassTrib,
  type Classificacao,
  cClassTrib,
  cstDe,
  type Ncm,
  type TabelaOficial,
} from '@enquadra/dominio'
import { z } from 'zod'

/**
 * Tabela oficial congelada em disco, uma pasta por versão do banco da Calculadora RTC
 * (`data/fontes/V0059/`). Nada é atualizado no lugar: versão nova é pasta nova.
 * O formato de cada arquivo é validado com zod ao carregar; mudança de contrato na API
 * vira erro alto, não dado errado em silêncio.
 */

const ClassificacaoApi = z.object({
  codigo: z.string().regex(/^\d{6}$/),
  descricao: z.string(),
  nomenclatura: z.string(),
  percentualReducaoCbs: z.number(),
  percentualReducaoIbsUf: z.number(),
})

const Versao = z.object({
  versaoDb: z.string(),
  dataVersaoDb: z.string(),
  consultadoEm: z.string(),
})

const Ncms = z.object({ ato: z.string(), itens: z.record(z.string(), z.string()) })

const Aplicavel = z.object({
  codigosRestritos: z.array(z.string()),
  aceitos: z.record(z.string(), z.array(z.string())),
})

export interface TabelaCarregada extends TabelaOficial {
  readonly dataVersao: string
  readonly consultadoEm: string
  readonly atoNcm: string
  readonly totalClassificacoes: number
}

const ler = async <T>(pasta: string, arquivo: string, schema: z.ZodType<T>): Promise<T> =>
  schema.parse(JSON.parse(await readFile(join(pasta, arquivo), 'utf8')))

export const carregarTabela = async (pasta: string): Promise<TabelaCarregada> => {
  const [lista, versao, ncms, aplicavel] = await Promise.all([
    ler(pasta, 'classificacoes.json', z.array(ClassificacaoApi)),
    ler(pasta, 'versao.json', Versao),
    ler(pasta, 'ncm.json', Ncms),
    ler(pasta, 'ncm-aplicavel.json', Aplicavel),
  ])
  const restritos = new Set(aplicavel.codigosRestritos)
  const porCodigo = new Map<CClassTrib, Classificacao>(
    lista.map((c) => {
      const codigo = cClassTrib(c.codigo)
      return [
        codigo,
        {
          cst: cstDe(codigo),
          cClassTrib: codigo,
          descricao: c.descricao,
          reducaoCbs: c.percentualReducaoCbs,
          reducaoIbs: c.percentualReducaoIbsUf,
          listaNcmRestrita: restritos.has(c.codigo),
        },
      ]
    }),
  )
  const aceitos = new Map(Object.entries(aplicavel.aceitos))

  return {
    versao: versao.versaoDb,
    dataVersao: versao.dataVersaoDb,
    consultadoEm: versao.consultadoEm,
    atoNcm: ncms.ato,
    totalClassificacoes: porCodigo.size,
    classificacao: (codigo) => porCodigo.get(codigo),
    nomeNcm: (codigo: Ncm) => ncms.itens[codigo],
    restritosQueAceitam: (codigo: Ncm) => aceitos.get(codigo)?.map(cClassTrib),
  }
}
