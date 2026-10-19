/**
 * Teste de fumaça do servidor MCP: sobe por stdio, lista as ferramentas e classifica um item.
 *   node --conditions=development scripts/fumaca-mcp.ts
 */
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'

const servidor = spawn(process.execPath, ['--conditions=development', 'apps/mcp/src/main.ts'], {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: ['pipe', 'pipe', 'inherit'],
})
const respostas = new Map<number, (r: unknown) => void>()
createInterface({ input: servidor.stdout }).on('line', (linha) => {
  const m = JSON.parse(linha) as { id?: number; result?: unknown }
  if (m.id !== undefined) respostas.get(m.id)?.(m.result)
})
let id = 0
const chamar = (method: string, params: unknown) =>
  new Promise<unknown>((ok) => {
    respostas.set(++id, ok)
    servidor.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
  })

await chamar('initialize', {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'fumaca', version: '0' },
})
servidor.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)
const lista = (await chamar('tools/list', {})) as { tools: { name: string }[] }
console.log('ferramentas:', lista.tools.map((t) => t.name).join(', '))
const r = (await chamar('tools/call', {
  name: 'classificar_item',
  arguments: { descricao: 'ABSORVENTE ALWAYS NOTURNO', ncm: '9619.00.00' },
})) as { content: { text: string }[] }
const res = JSON.parse(r.content[0]?.text ?? '{}') as {
  status: string
  classificacao: { cClassTrib: string }
  validacaoOficial: string
  alertas: { codigo: string }[]
}
console.log(
  'classificar_item:',
  res.status,
  res.classificacao.cClassTrib,
  res.validacaoOficial,
  res.alertas.map((a) => a.codigo).join(','),
)
servidor.kill()
