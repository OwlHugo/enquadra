/**
 * Atualiza as fontes oficiais versionadas em data/sources/<versao>/.
 *
 *   node scripts/update-sources.ts            baixa tabelas e sonda NCMs dos evals
 *   node scripts/update-sources.ts --check   só diz se há versão nova (sai com 1 se houver)
 *
 * Uma versão nova do banco da Calculadora RTC vira pasta nova; rodar de novo na mesma versão
 * só renova a fotografia (e sonda NCMs novos dos evals). O diff entre pastas é o que avisa
 * o cliente do que mudou. A sondagem é limitada (concorrência 6) para não martelar uma API pública.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const BASE =
  'https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora/dados-abertos'
const NCM_SISCOMEX =
  'https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json?perfil=PUBLICO'
const ROOT = new URL('..', import.meta.url).pathname
const today = new Date().toISOString().slice(0, 10)

const { values } = parseArgs({ options: { check: { type: 'boolean', default: false } } })

/** Repete só rede, timeout, 5xx e 429; 4xx é pedido errado e para na hora. */
const json = async <T>(url: string): Promise<T> => {
  for (let t = 1; ; t++) {
    const r = await fetch(url, { signal: AbortSignal.timeout(60_000) }).catch((e: unknown) => {
      const network =
        (e instanceof TypeError && e.cause !== undefined) ||
        (e instanceof DOMException && e.name === 'TimeoutError')
      if (!network || t >= 4) throw e
      return null
    })
    if (r?.ok) return (await r.json()) as T
    if (r && r.status < 500 && r.status !== 429) {
      throw new Error(`HTTP ${r.status} on ${url}: ${await r.text()}`)
    }
    if (t >= 4) throw new Error(`HTTP ${r?.status} on ${url} after ${t} attempts`)
    await new Promise((ok) => setTimeout(ok, 500 * 2 ** t))
  }
}

const inBatches = async <T, R>(items: T[], n: number, f: (i: T) => Promise<R>): Promise<R[]> => {
  const output: R[] = new Array(items.length)
  let nextIndex = 0
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (nextIndex < items.length) {
        const i = nextIndex++
        output[i] = await f(items[i] as T)
      }
    }),
  )
  return output
}

interface Version {
  versaoApp: string
  versaoDb: string
  descricaoVersaoDb: string
  dataVersaoDb: string
  ambiente: string
}
interface Classification {
  codigo: string
  nomenclatura: string
}

const version = await json<Version>(`${BASE}/versao`)
const folder = join(ROOT, 'data/sources', version.versaoDb)
const isNew = !existsSync(folder)
console.log(
  `official version: ${version.versaoDb} (${version.dataVersaoDb})${isNew ? ' · NEW' : ''}`,
)
if (values.check) process.exit(isNew ? 1 : 0)

await mkdir(folder, { recursive: true })
const classifications = await json<Classification[]>(
  `${BASE}/classificacoes-tributarias/cbs-ibs?data=${today}`,
)
await writeFile(
  join(folder, 'version.json'),
  JSON.stringify(
    {
      version: version.versaoDb,
      versionDate: version.dataVersaoDb,
      versionNote: version.descricaoVersaoDb,
      appVersion: version.versaoApp,
      environment: version.ambiente,
      fetchedOn: today,
      source: BASE,
    },
    null,
    2,
  ),
)
await writeFile(join(folder, 'classifications.json'), JSON.stringify(classifications, null, 1))
await writeFile(
  join(folder, 'situations.json'),
  JSON.stringify(await json(`${BASE}/situacoes-tributarias/cbs-ibs?data=${today}`), null, 1),
)
await writeFile(
  join(folder, 'legal-grounds.json'),
  JSON.stringify(await json(`${BASE}/fundamentacoes-legais?data=${today}`), null, 1),
)

const siscomex = await json<{
  Ato: string
  Data_Ultima_Atualizacao_NCM: string
  Nomenclaturas: { Codigo: string; Descricao: string }[]
}>(NCM_SISCOMEX)
const items: Record<string, string> = Object.fromEntries(
  siscomex.Nomenclaturas.map((n) => [n.Codigo.replaceAll('.', ''), n.Descricao] as const).filter(
    ([c]) => c.length === 8,
  ),
)
await writeFile(
  join(folder, 'ncm.json'),
  JSON.stringify({
    act: siscomex.Ato,
    lastUpdateNote: siscomex.Data_Ultima_Atualizacao_NCM,
    items,
  }),
)

// Códigos com lista restrita: os que recusam dois NCM sem relação com anexo nenhum.
const eligible = classifications.filter(
  (c) => c.nomenclatura === 'NCM' || c.nomenclatura === 'NBS ou NCM',
)
const accepts = async (ncm: string, code: string): Promise<boolean> =>
  (
    await json<{ valido: boolean }>(
      `${BASE}/classificacoes-tributarias/ncm-aplicavel?ncm=${ncm}&cClassTrib=${code}&dataOcorrenciaFatoGerador=${today}`,
    )
  ).valido
const probes = await inBatches(
  eligible,
  6,
  async (c) => (await accepts('22021000', c.codigo)) || (await accepts('84713012', c.codigo)),
)
const restricted = eligible.filter((_, i) => !probes[i]).map((c) => c.codigo)
console.log(`${restricted.length} codes with a restricted NCM list`)

const cases = (await readFile(join(ROOT, 'evals/cases.jsonl'), 'utf8')).trim().split('\n')
const ncms = [...new Set(cases.map((l) => (JSON.parse(l) as { ncm: string }).ncm))].filter(
  (n) => items[n],
)
const pairs = ncms.flatMap((n) => restricted.map((c) => [n, c] as const))
const responses = await inBatches(pairs, 6, ([n, c]) => accepts(n, c))
const accepted: Record<string, string[]> = Object.fromEntries(ncms.map((n) => [n, []]))
pairs.forEach(([n, c], i) => {
  if (responses[i]) accepted[n]?.push(c)
})
await writeFile(
  join(folder, 'ncm-applicable.json'),
  JSON.stringify({ date: today, restrictedCodes: restricted, accepted }, null, 1),
)
console.log(`${ncms.length} NCMs probed (${pairs.length} queries) → ${folder}`)
