// Diagnóstico pontual: o que a IA fez em cada caso que chegou até ela.
import { readFile } from 'node:fs/promises'
import { desambiguadorDoAmbiente } from '@enquadra/ai'
import { dataIso, enquadrar, ncm } from '@enquadra/domain'
import { carregarTabela, TABELA_PADRAO } from '@enquadra/sources'

const tabela = await carregarTabela(TABELA_PADRAO)
const desambiguador = desambiguadorDoAmbiente()
if (!desambiguador) throw new Error('sem chave')
const linhas = (await readFile(new URL('./cases.jsonl', import.meta.url), 'utf8'))
  .trim()
  .split('\n')
for (const l of linhas) {
  const c = JSON.parse(l) as { id: string; descricao: string; ncm: string; cfop?: string }
  if (c.cfop) continue
  const r = await enquadrar(
    { descricao: c.descricao, ncm: ncm(c.ncm) },
    { tabela, data: dataIso('2026-10-18'), desambiguador },
  )
  if (!r.ia) continue
  console.log(
    `${c.id.padEnd(16)} ${c.descricao.slice(0, 44).padEnd(44)} → ${r.status.padEnd(16)} ${r.classificacao?.cClassTrib ?? '-'}  ${r.trilha.at(-1)}`,
  )
}
