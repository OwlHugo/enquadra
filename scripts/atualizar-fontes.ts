/**
 * Atualiza as fontes oficiais versionadas em data/fontes/<versao>/.
 *
 *   node scripts/atualizar-fontes.ts            baixa tabelas e sonda NCMs dos evals
 *   node scripts/atualizar-fontes.ts --checar   só diz se há versão nova (sai com 1 se houver)
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
const RAIZ = new URL('..', import.meta.url).pathname
const hoje = new Date().toISOString().slice(0, 10)

const { values } = parseArgs({ options: { checar: { type: 'boolean', default: false } } })

/** Repete só rede, timeout, 5xx e 429; 4xx é pedido errado e para na hora. */
const json = async <T>(url: string): Promise<T> => {
  for (let t = 1; ; t++) {
    const r = await fetch(url, { signal: AbortSignal.timeout(60_000) }).catch((e: unknown) => {
      const rede =
        (e instanceof TypeError && e.cause !== undefined) ||
        (e instanceof DOMException && e.name === 'TimeoutError')
      if (!rede || t >= 4) throw e
      return null
    })
    if (r?.ok) return (await r.json()) as T
    if (r && r.status < 500 && r.status !== 429) {
      throw new Error(`HTTP ${r.status} em ${url}: ${await r.text()}`)
    }
    if (t >= 4) throw new Error(`HTTP ${r?.status} em ${url} após ${t} tentativas`)
    await new Promise((ok) => setTimeout(ok, 500 * 2 ** t))
  }
}

const emLotes = async <T, R>(itens: T[], n: number, f: (i: T) => Promise<R>): Promise<R[]> => {
  const saida: R[] = new Array(itens.length)
  let proximo = 0
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (proximo < itens.length) {
        const i = proximo++
        saida[i] = await f(itens[i] as T)
      }
    }),
  )
  return saida
}

interface Versao {
  versaoDb: string
  dataVersaoDb: string
}
interface Classificacao {
  codigo: string
  nomenclatura: string
}

const versao = await json<Versao>(`${BASE}/versao`)
const pasta = join(RAIZ, 'data/fontes', versao.versaoDb)
const nova = !existsSync(pasta)
console.log(`versão oficial: ${versao.versaoDb} (${versao.dataVersaoDb})${nova ? ' · NOVA' : ''}`)
if (values.checar) process.exit(nova ? 1 : 0)

await mkdir(pasta, { recursive: true })
const classificacoes = await json<Classificacao[]>(
  `${BASE}/classificacoes-tributarias/cbs-ibs?data=${hoje}`,
)
await writeFile(
  join(pasta, 'versao.json'),
  JSON.stringify({ ...versao, consultadoEm: hoje, fonte: BASE }, null, 2),
)
await writeFile(join(pasta, 'classificacoes.json'), JSON.stringify(classificacoes, null, 1))
await writeFile(
  join(pasta, 'situacoes.json'),
  JSON.stringify(await json(`${BASE}/situacoes-tributarias/cbs-ibs?data=${hoje}`), null, 1),
)
await writeFile(
  join(pasta, 'fundamentacoes.json'),
  JSON.stringify(await json(`${BASE}/fundamentacoes-legais?data=${hoje}`), null, 1),
)

const siscomex = await json<{
  Ato: string
  Data_Ultima_Atualizacao_NCM: string
  Nomenclaturas: { Codigo: string; Descricao: string }[]
}>(NCM_SISCOMEX)
const itens: Record<string, string> = Object.fromEntries(
  siscomex.Nomenclaturas.map((n) => [n.Codigo.replaceAll('.', ''), n.Descricao] as const).filter(
    ([c]) => c.length === 8,
  ),
)
await writeFile(
  join(pasta, 'ncm.json'),
  JSON.stringify({ ato: siscomex.Ato, vigencia: siscomex.Data_Ultima_Atualizacao_NCM, itens }),
)

// Códigos com lista restrita: os que recusam dois NCM sem relação com anexo nenhum.
const elegiveis = classificacoes.filter(
  (c) => c.nomenclatura === 'NCM' || c.nomenclatura === 'NBS ou NCM',
)
const aceita = async (ncm: string, codigo: string): Promise<boolean> =>
  (
    await json<{ valido: boolean }>(
      `${BASE}/classificacoes-tributarias/ncm-aplicavel?ncm=${ncm}&cClassTrib=${codigo}&dataOcorrenciaFatoGerador=${hoje}`,
    )
  ).valido
const testes = await emLotes(
  elegiveis,
  6,
  async (c) => (await aceita('22021000', c.codigo)) || (await aceita('84713012', c.codigo)),
)
const restritos = elegiveis.filter((_, i) => !testes[i]).map((c) => c.codigo)
console.log(`${restritos.length} códigos com lista restrita de NCM`)

const casos = (await readFile(join(RAIZ, 'evals/casos.jsonl'), 'utf8')).trim().split('\n')
const ncms = [...new Set(casos.map((l) => (JSON.parse(l) as { ncm: string }).ncm))].filter(
  (n) => itens[n],
)
const pares = ncms.flatMap((n) => restritos.map((c) => [n, c] as const))
const respostas = await emLotes(pares, 6, ([n, c]) => aceita(n, c))
const aceitos: Record<string, string[]> = Object.fromEntries(ncms.map((n) => [n, []]))
pares.forEach(([n, c], i) => {
  if (respostas[i]) aceitos[n]?.push(c)
})
await writeFile(
  join(pasta, 'ncm-aplicavel.json'),
  JSON.stringify({ data: hoje, codigosRestritos: restritos, aceitos }, null, 1),
)
console.log(`${ncms.length} NCM sondados (${pares.length} consultas) → ${pasta}`)
