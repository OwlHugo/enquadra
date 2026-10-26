/**
 * Teste de fumaça do servidor MCP: sobe por stdio, lista as ferramentas e classifica um item.
 *   node --conditions=development scripts/mcp-smoke.ts
 */
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'

const server = spawn(process.execPath, ['--conditions=development', 'apps/mcp/src/main.ts'], {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: ['pipe', 'pipe', 'inherit'],
})
const responses = new Map<number, (r: unknown) => void>()
createInterface({ input: server.stdout }).on('line', (row) => {
  const m = JSON.parse(row) as { id?: number; result?: unknown }
  if (m.id !== undefined) responses.get(m.id)?.(m.result)
})
let id = 0
const call = (method: string, params: unknown) =>
  new Promise<unknown>((ok) => {
    responses.set(++id, ok)
    server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
  })

await call('initialize', {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'smoke', version: '0' },
})
server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)
const list = (await call('tools/list', {})) as { tools: { name: string }[] }
console.log('tools:', list.tools.map((t) => t.name).join(', '))
const r = (await call('tools/call', {
  name: 'classify_item',
  arguments: { description: 'ABSORVENTE ALWAYS NOTURNO', ncm: '9619.00.00' },
})) as { content: { text: string }[] }
const res = JSON.parse(r.content[0]?.text ?? '{}') as {
  status: string
  classification: { cClassTrib: string }
  officialValidation: string
  alerts: { code: string }[]
}
console.log(
  'classify_item:',
  res.status,
  res.classification.cClassTrib,
  res.officialValidation,
  res.alerts.map((a) => a.code).join(','),
)
server.kill()
