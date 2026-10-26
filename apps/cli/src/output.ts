import { formatNcm, type Result } from '@enquadra/domain'
import { CONFIDENCE_LABEL, LAYER_LABEL, STATUS_LABEL, VALIDATION_LABEL } from './labels.ts'
import type { Failure } from './xmls.ts'

const enabled = process.stdout.isTTY && !process.env['NO_COLOR']
const paint = (code: number) => (t: string) => (enabled ? `\x1b[${code}m${t}\x1b[0m` : t)

export const color = {
  green: paint(32),
  amber: paint(33),
  blue: paint(34),
  red: paint(31),
  gray: paint(90),
  bold: paint(1),
}

const STATUS = {
  resolved: color.green(STATUS_LABEL.resolved),
  review: color.amber(STATUS_LABEL.review),
  needs_info: color.blue(STATUS_LABEL.needs_info),
} as const

export const resultLine = (r: Result, detailed = false): string => {
  const code = r.classification
    ? `${r.classification.cst} ${r.classification.cClassTrib}`
    : '--- ------'
  const reduction = r.classification?.cbsReduction
    ? color.gray(` −${r.classification.cbsReduction}%`)
    : ''
  const head = `${color.bold(code)}${reduction}  ${formatNcm(r.item.ncm)}  ${r.item.description}  ${STATUS[r.status]}`
  if (!detailed) return head
  const lines = [head]
  if (r.legalBasis)
    lines.push(`  ${r.legalBasis.provision}`, color.gray(`  "${r.legalBasis.text}"`))
  for (const a of r.alerts)
    lines.push(`  ${a.severity === 'blocker' ? color.red('!') : color.amber('·')} ${a.message}`)
  for (const p of r.questions) {
    lines.push(`  ${color.blue('?')} ${p.text}`)
    for (const o of p.options) lines.push(color.gray(`      ${o.cClassTrib}  ${o.label}`))
  }
  lines.push(
    color.gray(
      `  validação oficial: ${VALIDATION_LABEL[r.officialValidation]} · ${r.table.version} · confiança ${CONFIDENCE_LABEL[r.confidence]} · camada ${LAYER_LABEL[r.layer]}`,
    ),
  )
  for (const t of r.trail) lines.push(color.gray(`    ${t}`))
  return lines.join('\n')
}

export const failureLine = (f: Failure): string => `  ${color.red('✗')} ${f.file}: ${f.reason}`
