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
 * (`data/sources/V0066/`). Nada é atualizado no lugar: versão nova é pasta nova.
 * O formato de cada arquivo é validado com zod ao carregar; mudança de contrato na API
 * vira erro alto, não dado errado em silêncio.
 */

/** Formato da API oficial, com os nomes de campo dela. Também valida a resposta em `pnpm sources:update`. */
const ApiClassification = z.object({
  codigo: z.string().regex(/^\d{6}$/),
  descricao: z.string(),
  nomenclatura: z.string(),
  percentualReducaoCbs: z.number(),
  percentualReducaoIbsUf: z.number(),
})

/** Resposta de `/versao` da API oficial. */
export const ApiVersion = z.object({
  versaoApp: z.string(),
  versaoDb: z.string().regex(/^V\d{4}$/),
  descricaoVersaoDb: z.string(),
  dataVersaoDb: z.string(),
  ambiente: z.string(),
})

/** Lista de classificações como a API devolve: guarda todos os campos, exige os que o motor lê. */
export const ApiClassifications = z.array(ApiClassification.passthrough()).min(1)

/** Listas gravadas sem leitura pelo motor (situações, fundamentações): só não podem vir vazias. */
export const ApiRawList = z.array(z.unknown()).min(1)

export type Schema<T> = z.ZodType<T>

/** Valida a resposta antes de gravar: contrato mudado na API vira erro com o caminho do campo. */
export const checkResponse = <T>(url: string, schema: Schema<T>, body: unknown): T => {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new Error(
      `${url} answered a format the schema does not accept:\n${z.prettifyError(parsed.error)}`,
    )
  }
  return parsed.data
}

/** Resposta de `ncm-aplicavel`. */
export const ApiNcmApplicable = z.object({ valido: z.boolean() })

/** Download da nomenclatura no Portal Único Siscomex. */
export const SiscomexNomenclature = z.object({
  Ato: z.string(),
  Data_Ultima_Atualizacao_NCM: z.string(),
  Nomenclaturas: z.array(z.object({ Codigo: z.string(), Descricao: z.string() })).min(1),
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
