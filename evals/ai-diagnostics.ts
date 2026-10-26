// Diagnóstico pontual: o que a IA fez em cada caso que chegou até ela.
import { readFile } from 'node:fs/promises'
import { disambiguatorFromEnv } from '@enquadra/ai'
import { classify, isoDate, ncm } from '@enquadra/domain'
import { DEFAULT_TABLE, loadTable } from '@enquadra/sources'

const table = await loadTable(DEFAULT_TABLE)
const disambiguator = disambiguatorFromEnv()
if (!disambiguator) throw new Error('GEMINI_API_KEY not set')
const lines = (await readFile(new URL('./cases.jsonl', import.meta.url), 'utf8')).trim().split('\n')
for (const l of lines) {
  const c = JSON.parse(l) as { id: string; description: string; ncm: string; cfop?: string }
  if (c.cfop) continue
  const r = await classify(
    { description: c.description, ncm: ncm(c.ncm) },
    { table, date: isoDate('2026-10-18'), disambiguator },
  )
  if (!r.ai) continue
  console.log(
    `${c.id.padEnd(16)} ${c.description.slice(0, 44).padEnd(44)} → ${r.status.padEnd(16)} ${r.classification?.cClassTrib ?? '-'}  ${r.trail.at(-1)}`,
  )
}
