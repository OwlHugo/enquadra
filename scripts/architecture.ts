/**
 * Fronteiras da arquitetura, checadas no CI. Sem dependência: lê os `import` de cada arquivo.
 *
 *   domain    → nada (nem outro pacote do repo, nem módulo de I/O do Node)
 *   sources,
 *   nfe, ai   → só domain (adaptadores não se conhecem)
 *   apps      → qualquer pacote, nunca outro app
 *
 * Também falha em import circular entre arquivos.
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

const ROOT = resolve(new URL('..', import.meta.url).pathname)
const NODE_IO = /^node:(fs|net|http|https|child_process|worker_threads|dgram|dns|tls)(\/|$)/

interface Rule {
  readonly from: RegExp
  readonly allowed: (target: string) => boolean
  readonly reason: string
}

const RULES: readonly Rule[] = [
  {
    from: /^packages\/domain\/src\//,
    allowed: (a) =>
      !a.startsWith('@enquadra/') && !NODE_IO.test(a) && !/^[a-z@]/.test(a.replace(/^node:/, '')),
    reason: 'the domain is pure: no external package, no other repo package, no I/O',
  },
  {
    from: /^packages\/(sources|nfe|ai)\/src\//,
    allowed: (a) => !a.startsWith('@enquadra/') || a === '@enquadra/domain',
    reason: 'adapters depend only on the domain',
  },
  {
    from: /^apps\/[^/]+\//,
    allowed: (a) => !a.startsWith('enquadra') && !a.startsWith('@enquadra/mcp'),
    reason: 'apps do not import other apps',
  },
]

const listFiles = async (dir: string): Promise<string[]> =>
  (await readdir(join(ROOT, dir), { recursive: true, withFileTypes: true }))
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith('.ts') &&
        !e.name.endsWith('.test.ts') &&
        e.name !== 'testes.ts',
    )
    .map((e) => relative(ROOT, join(e.parentPath, e.name)))

const importsOf = (code: string): string[] =>
  [
    ...code.matchAll(
      /^\s*import\s+(?!type\b)[^'"]*?from\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm,
    ),
  ]
    .map((m) => m[1] ?? m[2])
    .filter((x): x is string => x !== undefined)

const files = [...(await listFiles('packages')), ...(await listFiles('apps'))].filter((f) =>
  f.includes('/src/'),
)
const graph = new Map<string, string[]>()
const violations: string[] = []

for (const file of files) {
  const imports = importsOf(await readFile(join(ROOT, file), 'utf8'))
  const rule = RULES.find((r) => r.from.test(file))
  const locals: string[] = []
  for (const target of imports) {
    if (target.startsWith('.')) {
      locals.push(relative(ROOT, resolve(ROOT, dirname(file), target)))
      continue
    }
    if (rule && !rule.allowed(target)) violations.push(`${file} → ${target}: ${rule.reason}`)
  }
  graph.set(file, locals)
}

// Ciclos: DFS com três cores.
const color = new Map<string, 'cinza' | 'preto'>()
const visit = (node: string, chain: string[]): void => {
  if (color.get(node) === 'preto') return
  if (color.get(node) === 'cinza') {
    violations.push(`cycle: ${[...chain.slice(chain.indexOf(node)), node].join(' → ')}`)
    return
  }
  color.set(node, 'cinza')
  for (const neighbor of graph.get(node) ?? []) visit(neighbor, [...chain, node])
  color.set(node, 'preto')
}
for (const node of graph.keys()) visit(node, [])

if (violations.length > 0) {
  for (const v of violations) console.error(`✗ ${v}`)
  process.exitCode = 1
} else {
  const edges = [...graph.values()].reduce((s, v) => s + v.length, 0)
  console.log(`architecture ok · ${files.length} files · ${edges} local imports · 0 cycles`)
}
