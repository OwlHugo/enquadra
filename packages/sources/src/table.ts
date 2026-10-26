import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  type CClassTrib,
  type Classification,
  cClassTrib,
  cstOf,
  type Ncm,
  type OfficialTable,
} from '@enquadra/domain'
import { z } from 'zod'

/**
 * Tabela oficial congelada em disco, uma pasta por versão do banco da Calculadora RTC
 * (`data/sources/V0059/`). Nada é atualizado no lugar: versão nova é pasta nova.
 * O formato de cada arquivo é validado com zod ao carregar; mudança de contrato na API
 * vira erro alto, não dado errado em silêncio.
 */

/** Formato da API oficial, com os nomes de campo dela. */
const ApiClassification = z.object({
  codigo: z.string().regex(/^\d{6}$/),
  descricao: z.string(),
  nomenclatura: z.string(),
  percentualReducaoCbs: z.number(),
  percentualReducaoIbsUf: z.number(),
})

const Version = z.object({
  version: z.string(),
  versionDate: z.string(),
  fetchedOn: z.string(),
})

const NcmFile = z.object({ act: z.string(), items: z.record(z.string(), z.string()) })

const Applicable = z.object({
  restrictedCodes: z.array(z.string()),
  accepted: z.record(z.string(), z.array(z.string())),
})

export interface LoadedTable extends OfficialTable {
  readonly versionDate: string
  readonly fetchedOn: string
  readonly ncmAct: string
  readonly totalClassifications: number
}

const read = async <T>(folder: string, file: string, schema: z.ZodType<T>): Promise<T> =>
  schema.parse(JSON.parse(await readFile(join(folder, file), 'utf8')))

export const loadTable = async (folder: string): Promise<LoadedTable> => {
  const [list, version, ncms, applicable] = await Promise.all([
    read(folder, 'classifications.json', z.array(ApiClassification)),
    read(folder, 'version.json', Version),
    read(folder, 'ncm.json', NcmFile),
    read(folder, 'ncm-applicable.json', Applicable),
  ])
  const restricted = new Set(applicable.restrictedCodes)
  const byCode = new Map<CClassTrib, Classification>(
    list.map((c) => {
      const code = cClassTrib(c.codigo)
      return [
        code,
        {
          cst: cstOf(code),
          cClassTrib: code,
          description: c.descricao,
          cbsReduction: c.percentualReducaoCbs,
          ibsReduction: c.percentualReducaoIbsUf,
          restrictedNcmList: restricted.has(c.codigo),
        },
      ]
    }),
  )
  const accepted = new Map(Object.entries(applicable.accepted))

  return {
    version: version.version,
    versionDate: version.versionDate,
    fetchedOn: version.fetchedOn,
    ncmAct: ncms.act,
    totalClassifications: byCode.size,
    classification: (code) => byCode.get(code),
    ncmName: (code: Ncm) => ncms.items[code],
    restrictedAccepting: (code: Ncm) => accepted.get(code)?.map(cClassTrib),
  }
}
