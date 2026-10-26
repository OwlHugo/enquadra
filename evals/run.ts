/**
 * Avaliação do motor contra `evals/cases.jsonl`.
 *
 *   node --conditions=development evals/run.ts            com IA (se GEMINI_API_KEY existir)
 *   node --conditions=development evals/run.ts --no-ai    só regras (`pnpm eval:sem-ia`), que é o
 *                                                         modo do CI. Roda dois conjuntos, separados:
 *     conjunto de desenvolvimento  evals/cases.jsonl: escrito junto com as regras; CI exige 100%
 *     held-out                     evals/held-out/cases.jsonl: escrito sem ver as regras; CI só
 *                                  reprova erro grave. A acurácia é reportada, sem meta.
 *
 * Métricas:
 *   accuracy            resultado bate com o esperado (status + código ou opções)
 *   correctAbstention   casos ambíguos em que o motor perguntou em vez de chutar
 *   severeErrors        motor deu "resolved" com código errado: o único erro que custa dinheiro
 * Saída: tabela no terminal + evals/reports/<modo>.json, comparado com a linha de base.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { disambiguatorFromEnv } from '@enquadra/ai'
import { cfop, classify, type Dependencies, isoDate, ncm, type Result } from '@enquadra/domain'
import { createOfficialValidator, DEFAULT_TABLE, loadTable } from '@enquadra/sources'
import { z } from 'zod'

const EvalCase = z.object({
  id: z.string(),
  category: z.string(),
  description: z.string(),
  ncm: z.string(),
  cfop: z.string().optional(),
  expected: z.object({
    status: z.enum(['resolved', 'review', 'needs_info']),
    cClassTrib: z.string().optional(),
    options: z.array(z.string()).optional(),
    alert: z.string().optional(),
  }),
  source: z.string(),
  note: z.string().optional(),
  /** Só no held-out: a API oficial confirmou o par NCM x código. */
  apiChecked: z.boolean().optional(),
  /** Só no held-out: EAN do produto no Open Food Facts de onde veio a descrição. */
  offCode: z.string().optional(),
})
type EvalCase = z.infer<typeof EvalCase>

const { values } = parseArgs({
  options: {
    'no-ai': { type: 'boolean', default: false },
    online: { type: 'boolean', default: false },
    baseline: { type: 'boolean', default: false },
  },
})
const mode = values['no-ai'] ? 'no-ai' : 'with-ai'
const ROOT = new URL('..', import.meta.url).pathname

/** Com IA, um caso ambíguo pode virar "revisar" com o código certo: conta como acerto. */
const matchesExpected = (evalCase: EvalCase, r: Result): boolean => {
  const e = evalCase.expected
  const code = r.classification?.cClassTrib
  if (e.alert && !r.alerts.some((a) => a.code === e.alert)) return false
  if (e.status === 'needs_info') {
    const options = new Set(
      r.questions.flatMap((p) => p.options.map((o) => o.cClassTrib as string)),
    )
    const covers = (e.options ?? []).every((o) => options.has(o))
    if (r.status === 'needs_info') return covers
    return mode === 'with-ai' && r.layer === 'ai' && (e.options ?? []).includes(code ?? '')
  }
  if (r.status !== e.status && !(mode === 'with-ai' && r.layer === 'ai')) return false
  return e.cClassTrib === undefined || code === e.cClassTrib
}

const isSevereError = (evalCase: EvalCase, r: Result): boolean =>
  r.status === 'resolved' &&
  (evalCase.expected.status !== 'resolved' ||
    r.classification?.cClassTrib !== evalCase.expected.cClassTrib)

const SETS = [
  { key: 'development', label: 'conjunto de desenvolvimento', file: 'evals/cases.jsonl' },
  { key: 'heldOut', label: 'held-out', file: 'evals/held-out/cases.jsonl' },
] as const

const table = await loadTable(DEFAULT_TABLE)
const disambiguator = values['no-ai'] ? undefined : disambiguatorFromEnv()
const deps: Dependencies = {
  table,
  date: isoDate('2026-10-18'),
  ...(values.online ? { validator: createOfficialValidator() } : {}),
  ...(disambiguator ? { disambiguator } : {}),
}

interface Line {
  evalCase: EvalCase
  r: Result | null
  ok: boolean
  severe: boolean
  error?: string
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** O plano gratuito do Gemini limita as chamadas por minuto: espera e tenta de novo antes de dar o caso como lançado. */
const runCase = async (evalCase: EvalCase, attempt = 1): Promise<Line> => {
  try {
    const r = await classify(
      {
        description: evalCase.description,
        ncm: ncm(evalCase.ncm),
        ...(evalCase.cfop ? { cfop: cfop(evalCase.cfop) } : {}),
      },
      deps,
    )
    return { evalCase, r, ok: matchesExpected(evalCase, r), severe: isSevereError(evalCase, r) }
  } catch (e) {
    if (!(e instanceof Error)) throw e
    if (disambiguator && attempt < 4) {
      await sleep(20_000)
      return runCase(evalCase, attempt + 1)
    }
    return { evalCase, r: null, ok: false, severe: false, error: e.stack ?? e.message }
  }
}

const readCases = async (file: string): Promise<EvalCase[]> =>
  (await readFile(`${ROOT}${file}`, 'utf8'))
    .trim()
    .split('\n')
    .map((l) => EvalCase.parse(JSON.parse(l)))

const summarizeSet = (lines: readonly Line[]) => {
  const byCategory = new Map<string, { total: number; ok: number }>()
  for (const l of lines) {
    const c = byCategory.get(l.evalCase.category) ?? { total: 0, ok: 0 }
    c.total++
    if (l.ok) c.ok++
    byCategory.set(l.evalCase.category, c)
  }
  const ambiguous = lines.filter((l) => l.evalCase.expected.status === 'needs_info')
  const withAi = lines.filter((l) => l.r?.ai)
  const status = (s: string) => lines.filter((l) => l.r?.status === s).length
  return {
    mode,
    table: table.version,
    cases: lines.length,
    accuracy: lines.filter((l) => l.ok).length / lines.length,
    severeErrors: lines.filter((l) => l.severe).length,
    correctAbstention: ambiguous.filter((l) => l.ok).length / Math.max(ambiguous.length, 1),
    outcome: {
      resolved: status('resolved'),
      review: status('review'),
      needsInfo: status('needs_info'),
    },
    aiCalls: withAi.length,
    aiCostUsd: withAi.reduce((s, l) => s + (l.r?.ai?.costUsd ?? 0), 0),
    avgAiMs: withAi.length ? withAi.reduce((s, l) => s + (l.r?.ai?.ms ?? 0), 0) / withAi.length : 0,
    byCategory: Object.fromEntries(byCategory),
    failures: lines
      .filter((l) => !l.ok)
      .map((l) => ({
        id: l.evalCase.id,
        description: l.evalCase.description,
        expected: l.evalCase.expected,
        severe: l.severe,
        actual: l.r
          ? {
              status: l.r.status,
              cClassTrib: l.r.classification?.cClassTrib ?? null,
              layer: l.r.layer,
            }
          : l.error,
      })),
  }
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`
let failedGate = false
const reports: Record<string, ReturnType<typeof summarizeSet>> = {}

for (const set of SETS) {
  const lines: Line[] = []
  for (const evalCase of await readCases(set.file)) lines.push(await runCase(evalCase))
  const report = summarizeSet(lines)
  reports[set.key] = report
  console.log(
    `\nEnquadra · ${set.label} · eval ${mode} · table ${report.table} · ${report.cases} cases\n`,
  )
  if (set.key === 'development') {
    for (const [cat, c] of Object.entries(report.byCategory))
      console.log(`  ${cat.padEnd(12)} ${String(c.ok).padStart(3)}/${c.total}`)
    console.log('')
  }
  console.log(`  accuracy            ${pct(report.accuracy)}`)
  console.log(`  severe errors       ${report.severeErrors}`)
  console.log(`  correct abstention  ${pct(report.correctAbstention)}`)
  const { resolved, review, needsInfo } = report.outcome
  console.log(
    `  outcome             ${resolved} resolved · ${review} review · ${needsInfo} needs info`,
  )
  if (report.aiCalls) {
    console.log(
      `  AI calls            ${report.aiCalls} · US$ ${report.aiCostUsd.toFixed(5)} · ${Math.round(report.avgAiMs)} ms average`,
    )
  }
  const shown =
    set.key === 'development' ? report.failures : report.failures.filter((f) => f.severe)
  for (const f of shown)
    console.log(`  ✗ ${f.id} ${f.description} → ${JSON.stringify(f.actual)}`.slice(0, 220))
  if (set.key === 'heldOut' && report.failures.length > shown.length) {
    console.log(
      `  (${report.failures.length - shown.length} more misses, none severe: see the report with --baseline)`,
    )
  }

  // Portão do CI. Caso que lança (API fora do contrato, caso mal escrito) reprova nos dois conjuntos.
  const exceptions = lines.filter((l) => l.error !== undefined).length
  if (exceptions > 0) console.log(`  cases that threw    ${exceptions}`)
  const devFails = set.key === 'development' && mode === 'no-ai' && report.failures.length > 0
  if (report.severeErrors > 0 || exceptions > 0 || devFails) failedGate = true
}

if (values.baseline) {
  await writeFile(`${ROOT}evals/reports/${mode}.json`, `${JSON.stringify(reports, null, 2)}\n`)
}
process.exitCode = failedGate ? 1 : 0
