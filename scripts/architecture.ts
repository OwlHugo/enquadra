/**
 * Fronteiras da arquitetura, checadas no CI. Sem dependência: lê os `import` de cada arquivo.
 *
 *   dominio   → nada (nem outro pacote do repo, nem módulo de I/O do Node)
 *   fontes,
 *   nfe, ia   → só dominio (adaptadores não se conhecem)
 *   apps      → qualquer pacote, nunca outro app
 *
 * Também falha em import circular entre arquivos.
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

const RAIZ = resolve(new URL('..', import.meta.url).pathname)
const IO_DO_NODE = /^node:(fs|net|http|https|child_process|worker_threads|dgram|dns|tls)(\/|$)/

interface Regra {
  readonly de: RegExp
  readonly permitido: (alvo: string) => boolean
  readonly motivo: string
}

const REGRAS: readonly Regra[] = [
  {
    de: /^packages\/domain\/src\//,
    permitido: (a) =>
      !a.startsWith('@enquadra/') &&
      !IO_DO_NODE.test(a) &&
      !/^[a-z@]/.test(a.replace(/^node:/, '')),
    motivo: 'o domínio é puro: sem pacote externo, sem outro pacote do repo, sem I/O',
  },
  {
    de: /^packages\/(sources|nfe|ai)\/src\//,
    permitido: (a) => !a.startsWith('@enquadra/') || a === '@enquadra/domain',
    motivo: 'adaptadores só dependem do domínio',
  },
  {
    de: /^apps\/[^/]+\//,
    permitido: (a) => !a.startsWith('enquadra') && !a.startsWith('@enquadra/mcp'),
    motivo: 'apps não importam outros apps',
  },
]

const listar = async (dir: string): Promise<string[]> =>
  (await readdir(join(RAIZ, dir), { recursive: true, withFileTypes: true }))
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith('.ts') &&
        !e.name.endsWith('.test.ts') &&
        e.name !== 'testes.ts',
    )
    .map((e) => relative(RAIZ, join(e.parentPath, e.name)))

const importsDe = (codigo: string): string[] =>
  [
    ...codigo.matchAll(
      /^\s*import\s+(?!type\b)[^'"]*?from\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm,
    ),
  ]
    .map((m) => m[1] ?? m[2])
    .filter((x): x is string => x !== undefined)

const arquivos = [...(await listar('packages')), ...(await listar('apps'))].filter((f) =>
  f.includes('/src/'),
)
const grafo = new Map<string, string[]>()
const violacoes: string[] = []

for (const arquivo of arquivos) {
  const imports = importsDe(await readFile(join(RAIZ, arquivo), 'utf8'))
  const regra = REGRAS.find((r) => r.de.test(arquivo))
  const locais: string[] = []
  for (const alvo of imports) {
    if (alvo.startsWith('.')) {
      locais.push(relative(RAIZ, resolve(RAIZ, dirname(arquivo), alvo)))
      continue
    }
    if (regra && !regra.permitido(alvo)) violacoes.push(`${arquivo} → ${alvo}: ${regra.motivo}`)
  }
  grafo.set(arquivo, locais)
}

// Ciclos: DFS com três cores.
const cor = new Map<string, 'cinza' | 'preto'>()
const visitar = (no: string, caminho: string[]): void => {
  if (cor.get(no) === 'preto') return
  if (cor.get(no) === 'cinza') {
    violacoes.push(`ciclo: ${[...caminho.slice(caminho.indexOf(no)), no].join(' → ')}`)
    return
  }
  cor.set(no, 'cinza')
  for (const vizinho of grafo.get(no) ?? []) visitar(vizinho, [...caminho, no])
  cor.set(no, 'preto')
}
for (const no of grafo.keys()) visitar(no, [])

if (violacoes.length > 0) {
  for (const v of violacoes) console.error(`✗ ${v}`)
  process.exitCode = 1
} else {
  const arestas = [...grafo.values()].reduce((s, v) => s + v.length, 0)
  console.log(`arquitetura ok · ${arquivos.length} arquivos · ${arestas} imports locais · 0 ciclos`)
}
