/**
 * Avaliação do motor contra `evals/casos.jsonl`.
 *
 *   node --conditions=development evals/rodar.ts            com IA (se GEMINI_API_KEY existir)
 *   node --conditions=development evals/rodar.ts --sem-ia   só regras: é o modo que o CI exige 100%
 *
 * Métricas (definidas em docs/avaliacao.md):
 *   acerto       resultado bate com o esperado (status + código ou opções)
 *   abstencao    casos ambíguos em que o motor perguntou em vez de chutar
 *   erro_grave   motor deu "resolvido" com código errado: é o único erro que custa dinheiro
 * Saída: tabela no terminal + evals/relatorios/<modo>.json, comparado com a linha de base.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { cfop, type Dependencias, dataIso, enquadrar, ncm, type Resultado } from '@enquadra/dominio'
import { carregarTabela, criarValidadorOficial, TABELA_PADRAO } from '@enquadra/fontes'
import { desambiguadorDoAmbiente } from '@enquadra/ia'
import { z } from 'zod'

const Caso = z.object({
  id: z.string(),
  categoria: z.string(),
  descricao: z.string(),
  ncm: z.string(),
  cfop: z.string().optional(),
  esperado: z.object({
    status: z.enum(['resolvido', 'revisar', 'falta_informacao']),
    cClassTrib: z.string().optional(),
    opcoes: z.array(z.string()).optional(),
    alerta: z.string().optional(),
  }),
  fonte: z.string(),
  nota: z.string().optional(),
})
type Caso = z.infer<typeof Caso>

const { values } = parseArgs({
  options: {
    'sem-ia': { type: 'boolean', default: false },
    online: { type: 'boolean', default: false },
    linha: { type: 'boolean', default: false },
  },
})
const modo = values['sem-ia'] ? 'sem-ia' : 'com-ia'
const RAIZ = new URL('..', import.meta.url).pathname

/** Com IA, um caso ambíguo pode virar "revisar" com o código certo: conta como acerto. */
const confere = (caso: Caso, r: Resultado): boolean => {
  const e = caso.esperado
  const codigo = r.classificacao?.cClassTrib
  if (e.alerta && !r.alertas.some((a) => a.codigo === e.alerta)) return false
  if (e.status === 'falta_informacao') {
    const opcoes = new Set(r.perguntas.flatMap((p) => p.opcoes.map((o) => o.cClassTrib as string)))
    const cobre = (e.opcoes ?? []).every((o) => opcoes.has(o))
    if (r.status === 'falta_informacao') return cobre
    return modo === 'com-ia' && r.camada === 'ia' && (e.opcoes ?? []).includes(codigo ?? '')
  }
  if (r.status !== e.status && !(modo === 'com-ia' && r.camada === 'ia')) return false
  return e.cClassTrib === undefined || codigo === e.cClassTrib
}

const erroGrave = (caso: Caso, r: Resultado): boolean =>
  r.status === 'resolvido' &&
  (caso.esperado.status !== 'resolvido' || r.classificacao?.cClassTrib !== caso.esperado.cClassTrib)

const casos = (await readFile(`${RAIZ}evals/casos.jsonl`, 'utf8'))
  .trim()
  .split('\n')
  .map((l) => Caso.parse(JSON.parse(l)))

const tabela = await carregarTabela(TABELA_PADRAO)
const desambiguador = values['sem-ia'] ? undefined : desambiguadorDoAmbiente()
const deps: Dependencias = {
  tabela,
  data: dataIso('2026-10-18'),
  ...(values.online ? { validador: criarValidadorOficial() } : {}),
  ...(desambiguador ? { desambiguador } : {}),
}

const linhas: { caso: Caso; r: Resultado | null; ok: boolean; grave: boolean; erro?: string }[] = []
for (const caso of casos) {
  try {
    const r = await enquadrar(
      {
        descricao: caso.descricao,
        ncm: ncm(caso.ncm),
        ...(caso.cfop ? { cfop: cfop(caso.cfop) } : {}),
      },
      deps,
    )
    linhas.push({ caso, r, ok: confere(caso, r), grave: erroGrave(caso, r) })
  } catch (e) {
    if (!(e instanceof Error)) throw e
    linhas.push({ caso, r: null, ok: false, grave: false, erro: e.stack ?? e.message })
  }
}

const porCategoria = new Map<string, { total: number; ok: number }>()
for (const l of linhas) {
  const c = porCategoria.get(l.caso.categoria) ?? { total: 0, ok: 0 }
  c.total++
  if (l.ok) c.ok++
  porCategoria.set(l.caso.categoria, c)
}
const ambiguos = linhas.filter((l) => l.caso.esperado.status === 'falta_informacao')
const comIa = linhas.filter((l) => l.r?.ia)
const relatorio = {
  modo,
  tabela: tabela.versao,
  casos: linhas.length,
  acerto: linhas.filter((l) => l.ok).length / linhas.length,
  errosGraves: linhas.filter((l) => l.grave).length,
  abstencaoCorreta: ambiguos.filter((l) => l.ok).length / Math.max(ambiguos.length, 1),
  chamadasIa: comIa.length,
  custoIaUsd: comIa.reduce((s, l) => s + (l.r?.ia?.custoUsd ?? 0), 0),
  msMedioIa: comIa.length ? comIa.reduce((s, l) => s + (l.r?.ia?.ms ?? 0), 0) / comIa.length : 0,
  porCategoria: Object.fromEntries(porCategoria),
  falhas: linhas
    .filter((l) => !l.ok)
    .map((l) => ({
      id: l.caso.id,
      descricao: l.caso.descricao,
      esperado: l.caso.esperado,
      obtido: l.r
        ? {
            status: l.r.status,
            cClassTrib: l.r.classificacao?.cClassTrib ?? null,
            camada: l.r.camada,
          }
        : l.erro,
    })),
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`
console.log(`\nEnquadra · eval ${modo} · tabela ${relatorio.tabela} · ${relatorio.casos} casos\n`)
for (const [cat, c] of porCategoria)
  console.log(`  ${cat.padEnd(12)} ${String(c.ok).padStart(3)}/${c.total}`)
console.log(`\n  acerto             ${pct(relatorio.acerto)}`)
console.log(`  erros graves       ${relatorio.errosGraves}`)
console.log(`  abstenção correta  ${pct(relatorio.abstencaoCorreta)}`)
if (comIa.length) {
  console.log(
    `  chamadas de IA     ${comIa.length} · US$ ${relatorio.custoIaUsd.toFixed(5)} · ${Math.round(relatorio.msMedioIa)} ms em média`,
  )
}
for (const f of relatorio.falhas)
  console.log(`  ✗ ${f.id} ${f.descricao} → ${JSON.stringify(f.obtido)}`)

const destino = `${RAIZ}evals/relatorios/${modo}.json`
if (values.linha) await writeFile(destino, `${JSON.stringify(relatorio, null, 2)}\n`)

// Portão do CI: sem IA não pode haver falha nem erro grave. Com IA, nunca erro grave.
// Caso que lança (API fora do contrato, caso mal escrito) reprova nos dois modos: não é abstenção.
const excecoes = linhas.filter((l) => l.erro !== undefined).length
if (excecoes > 0) console.log(`  casos com exceção  ${excecoes}`)
const reprovado =
  relatorio.errosGraves > 0 || excecoes > 0 || (modo === 'sem-ia' && relatorio.falhas.length > 0)
process.exitCode = reprovado ? 1 : 0
