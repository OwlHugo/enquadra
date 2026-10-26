import { formatarNcm, type Resultado, resumir } from '@enquadra/dominio'
import type { Falha } from './xmls.ts'

/**
 * Relatório estático de triagem, um arquivo só, sem dependência e sem JavaScript de terceiros.
 * Linha visual: tabela densa, código em mono, cor só para estado (sempre com texto ao lado).
 */

const esc = (t: string): string => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const ORDEM = { falta_informacao: 0, revisar: 1, resolvido: 2 } as const
const ROTULO = {
  resolvido: 'Resolvido',
  revisar: 'Revisar',
  falta_informacao: 'Falta informação',
} as const

const linha = (r: Resultado): string => {
  const c = r.classificacao
  const detalhe = [
    r.fundamento
      ? `<p class="lei"><b>${esc(r.fundamento.dispositivo)}</b><br>“${esc(r.fundamento.texto)}”</p>`
      : '',
    ...r.alertas.map((a) => `<p class="alerta ${a.gravidade}">${esc(a.mensagem)}</p>`),
    ...r.perguntas.map(
      (p) =>
        `<p class="pergunta">${esc(p.texto)}</p><ul>${p.opcoes.map((o) => `<li><code>${o.cClassTrib}</code> ${esc(o.rotulo)}</li>`).join('')}</ul>`,
    ),
    `<ol class="trilha">${r.trilha.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>`,
  ].join('')
  return `<tr data-status="${r.status}">
<td><span class="estado ${r.status}">${ROTULO[r.status]}</span></td>
<td>${esc(r.item.descricao)}</td>
<td><code>${formatarNcm(r.item.ncm)}</code></td>
<td><code>${r.item.cfop ?? '—'}</code></td>
<td><code>${c?.cst ?? '—'}</code></td>
<td><code>${c?.cClassTrib ?? '—'}</code></td>
<td class="num">${c?.reducaoCbs ? `${c.reducaoCbs}%` : '—'}</td>
<td>${r.confianca}</td>
</tr><tr class="detalhe"><td colspan="8"><details><summary>Por quê</summary>${detalhe}</details></td></tr>`
}

const secaoFalhas = (falhas: readonly Falha[]): string =>
  falhas.length === 0
    ? ''
    : `<section class="falhas"><h2>${falhas.length} ${falhas.length === 1 ? 'arquivo não pôde ser lido' : 'arquivos não puderam ser lidos'}</h2>
<p class="meta">Os itens destes arquivos não estão na tabela abaixo.</p>
<table><thead><tr><th>Arquivo</th><th>Motivo</th></tr></thead>
<tbody>${falhas.map((f) => `<tr><td><code>${esc(f.arquivo)}</code></td><td>${esc(f.motivo)}</td></tr>`).join('')}</tbody></table></section>`

export const relatorioHtml = (
  resultados: readonly Resultado[],
  versao: string,
  falhas: readonly Falha[] = [],
): string => {
  const r = resumir(resultados)
  const ordenados = [...resultados].sort((a, b) => ORDEM[a.status] - ORDEM[b.status])
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Enquadra · ${r.total} itens</title>
<style>
:root{--fundo:#fbfaf8;--texto:#1d1d1f;--sutil:#6e6e73;--linha:#e8e6e1;--verde:#2f7d4f;--ambar:#a8620a;--azul:#2c5fa8;--verm:#b42318;
font:14px/1.45 Inter,ui-sans-serif,system-ui,sans-serif;color:var(--texto);background:var(--fundo)}
@media(prefers-color-scheme:dark){:root{--fundo:#141414;--texto:#ececec;--sutil:#8e8e93;--linha:#2a2a2a}}
body{max-width:1180px;margin:40px auto;padding:0 24px}
h1{font-size:18px;font-weight:600;margin:0}
.meta{color:var(--sutil);margin:4px 0 24px}
.contadores{display:flex;gap:24px;margin-bottom:24px}
.contadores div{font-variant-numeric:tabular-nums}.contadores b{font-size:22px;display:block;font-weight:600}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-weight:500;color:var(--sutil);border-bottom:1px solid var(--linha);padding:8px 10px}
td{border-bottom:1px solid var(--linha);padding:8px 10px;vertical-align:top}
tr.detalhe td{border-bottom:1px solid var(--linha);padding-top:0}
code{font:12.5px/1 "Geist Mono","JetBrains Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}
.num{text-align:right;font-variant-numeric:tabular-nums}
.estado{font-size:12px;font-weight:500}.estado::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;background:currentColor}
.resolvido{color:var(--verde)}.revisar{color:var(--ambar)}.falta_informacao{color:var(--azul)}
summary{cursor:pointer;color:var(--sutil);font-size:12px}
.lei{border-left:2px solid var(--linha);padding-left:10px;color:var(--sutil)}
.alerta.bloqueio{color:var(--verm)}.alerta.atencao{color:var(--ambar)}.alerta.info{color:var(--sutil)}
.trilha{color:var(--sutil);font-size:12px;padding-left:18px}
.pergunta{color:var(--azul);font-weight:500}
.falha{color:var(--verm)}.falhas{margin-bottom:32px}.falhas h2{font-size:15px;font-weight:600;color:var(--verm);margin:0}
</style>
<h1>Enquadramento IBS/CBS</h1>
<p class="meta">${r.total} itens distintos · ${esc(versao)} · gerado em ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</p>
<div class="contadores">
<div class="resolvido"><b>${r.resolvidos}</b>resolvidos</div>
<div class="revisar"><b>${r.revisar}</b>revisar</div>
<div class="falta_informacao"><b>${r.faltaInformacao}</b>falta informação</div>
<div><b>${r.comReducao}</b>com redução</div>
${falhas.length > 0 ? `<div class="falha"><b>${falhas.length}</b>com falha</div>` : ''}
</div>
${secaoFalhas(falhas)}<table><thead><tr><th>Estado</th><th>Descrição</th><th>NCM</th><th>CFOP</th><th>CST</th><th>cClassTrib</th><th class="num">Redução</th><th>Confiança</th></tr></thead>
<tbody>${ordenados.map(linha).join('')}</tbody></table>
<p class="meta">O Enquadra sugere e fundamenta; quem aprova é a pessoa responsável pela escrituração.</p>
</html>`
}
