import { formatNcm, type Result, summarize } from '@enquadra/domain'
import { CONFIDENCE_LABEL, errorText, STATUS_LABEL } from './labels.ts'
import type { Failure } from './xmls.ts'

/**
 * Relatório estático de triagem, um arquivo só, sem dependência e sem JavaScript de terceiros.
 * Linha visual: tabela densa, código em mono, cor só para estado (sempre com texto ao lado).
 */

const esc = (t: string): string => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const ORDER = { needs_info: 0, review: 1, resolved: 2 } as const
const capitalized = (t: string): string => `${t.charAt(0).toUpperCase()}${t.slice(1)}`

const row = (r: Result): string => {
  const c = r.classification
  const detail = [
    r.legalBasis
      ? `<p class="law"><b>${esc(r.legalBasis.provision)}</b><br>“${esc(r.legalBasis.text)}”</p>`
      : '',
    ...r.alerts.map((a) => `<p class="alert ${a.severity}">${esc(a.message)}</p>`),
    ...r.questions.map(
      (p) =>
        `<p class="question">${esc(p.text)}</p><ul>${p.options.map((o) => `<li><code>${o.cClassTrib}</code> ${esc(o.label)}</li>`).join('')}</ul>`,
    ),
    `<ol class="trail">${r.trail.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>`,
  ].join('')
  return `<tr data-status="${r.status}">
<td><span class="state ${r.status}">${capitalized(STATUS_LABEL[r.status])}</span></td>
<td>${esc(r.item.description)}</td>
<td><code>${formatNcm(r.item.ncm)}</code></td>
<td><code>${r.item.cfop ?? '—'}</code></td>
<td><code>${c?.cst ?? '—'}</code></td>
<td><code>${c?.cClassTrib ?? '—'}</code></td>
<td class="num">${c?.cbsReduction ? `${c.cbsReduction}%` : '—'}</td>
<td>${CONFIDENCE_LABEL[r.confidence]}</td>
</tr><tr class="detail"><td colspan="8"><details><summary>Por quê</summary>${detail}</details></td></tr>`
}

const failuresSection = (failures: readonly Failure[]): string =>
  failures.length === 0
    ? ''
    : `<section class="failures"><h2>${failures.length} ${failures.length === 1 ? 'arquivo não pôde ser lido' : 'arquivos não puderam ser lidos'}</h2>
<p class="meta">Os itens destes arquivos não estão na tabela abaixo.</p>
<table><thead><tr><th>Arquivo</th><th>Motivo</th></tr></thead>
<tbody>${failures.map((f) => `<tr><td><code>${esc(f.file)}</code></td><td>${esc(errorText(f.code, f.detail))}</td></tr>`).join('')}</tbody></table></section>`

export const htmlReport = (
  results: readonly Result[],
  version: string,
  failures: readonly Failure[],
): string => {
  const r = summarize(results)
  const sorted = [...results].sort((a, b) => ORDER[a.status] - ORDER[b.status])
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Enquadra · ${r.total} itens</title>
<style>
:root{--bg:#fbfaf8;--fg:#1d1d1f;--muted:#6e6e73;--rule:#e8e6e1;--green:#2f7d4f;--amber:#a8620a;--blue:#2c5fa8;--red:#b42318;
font:14px/1.45 Inter,ui-sans-serif,system-ui,sans-serif;color:var(--fg);background:var(--bg)}
@media(prefers-color-scheme:dark){:root{--bg:#141414;--fg:#ececec;--muted:#8e8e93;--rule:#2a2a2a}}
body{max-width:1180px;margin:40px auto;padding:0 24px}
h1{font-size:18px;font-weight:600;margin:0}
.meta{color:var(--muted);margin:4px 0 24px}
.counters{display:flex;gap:24px;margin-bottom:24px}
.counters div{font-variant-numeric:tabular-nums}.counters b{font-size:22px;display:block;font-weight:600}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-weight:500;color:var(--muted);border-bottom:1px solid var(--rule);padding:8px 10px}
td{border-bottom:1px solid var(--rule);padding:8px 10px;vertical-align:top}
tr.detail td{border-bottom:1px solid var(--rule);padding-top:0}
code{font:12.5px/1 "Geist Mono","JetBrains Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}
.num{text-align:right;font-variant-numeric:tabular-nums}
.state{font-size:12px;font-weight:500}.state::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;background:currentColor}
.resolved{color:var(--green)}.review{color:var(--amber)}.needs_info{color:var(--blue)}
summary{cursor:pointer;color:var(--muted);font-size:12px}
.law{border-left:2px solid var(--rule);padding-left:10px;color:var(--muted)}
.alert.blocker{color:var(--red)}.alert.warning{color:var(--amber)}.alert.info{color:var(--muted)}
.trail{color:var(--muted);font-size:12px;padding-left:18px}
.question{color:var(--blue);font-weight:500}
.failure{color:var(--red)}.failures{margin-bottom:32px}.failures h2{font-size:15px;font-weight:600;color:var(--red);margin:0}
</style>
<h1>Enquadramento IBS/CBS</h1>
<p class="meta">${r.total} itens distintos · ${esc(version)} · gerado em ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</p>
<div class="counters">
<div class="resolved"><b>${r.resolved}</b>resolvidos</div>
<div class="review"><b>${r.review}</b>revisar</div>
<div class="needs_info"><b>${r.needsInfo}</b>falta informação</div>
<div><b>${r.withReduction}</b>com redução</div>
${failures.length > 0 ? `<div class="failure"><b>${failures.length}</b>com falha</div>` : ''}
</div>
${failuresSection(failures)}<table><thead><tr><th>Estado</th><th>Descrição</th><th>NCM</th><th>CFOP</th><th>CST</th><th>cClassTrib</th><th class="num">Redução</th><th>Confiança</th></tr></thead>
<tbody>${sorted.map(row).join('')}</tbody></table>
<p class="meta">O Enquadra sugere e fundamenta; quem aprova é a pessoa responsável pela escrituração.</p>
</html>`
}
