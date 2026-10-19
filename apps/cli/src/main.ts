#!/usr/bin/env node
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { parseArgs } from 'node:util'
import {
  cfop,
  type Dependencias,
  dataIso,
  ErroDeDominio,
  enquadrar,
  type ItemEntrada,
  ncm,
  type Resultado,
  resumir,
} from '@enquadra/dominio'
import { carregarTabela, criarValidadorOficial, TABELA_PADRAO } from '@enquadra/fontes'
import { desambiguadorDoAmbiente } from '@enquadra/ia'
import { chaveItem, lerNfe } from '@enquadra/nfe'
import { relatorioHtml } from './relatorio.ts'
import { cor, linhaResultado } from './saida.ts'

const AJUDA = `enquadra: CST e cClassTrib de IBS/CBS com fundamento na LC 214/2025

Uso:
  enquadra item "<descrição>" <ncm> [--cfop 5102]
  enquadra xmls <pasta-ou-arquivo> [--html relatorio.html]

Opções:
  --sem-ia       não chama modelo de linguagem (só regras e tabela oficial)
  --offline      não consulta a API da Receita
  --data AAAA-MM-DD  data do fato gerador (padrão: hoje, ou a emissão do XML)
  --json         saída em JSON, para máquina
  --tabela <dir> pasta da tabela oficial versionada`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    cfop: { type: 'string' },
    data: { type: 'string' },
    html: { type: 'string' },
    tabela: { type: 'string' },
    'sem-ia': { type: 'boolean', default: false },
    offline: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    ajuda: { type: 'boolean', short: 'h', default: false },
  },
})

const listarXmls = async (alvo: string): Promise<string[]> => {
  if ((await stat(alvo)).isFile()) return [alvo]
  const entradas = await readdir(alvo, { recursive: true, withFileTypes: true })
  return entradas
    .filter((e) => e.isFile() && extname(e.name).toLowerCase() === '.xml')
    .map((e) => join(e.parentPath, e.name))
}

const dependencias = async (): Promise<Dependencias & { versaoTexto: string }> => {
  const tabela = await carregarTabela(values.tabela ?? TABELA_PADRAO)
  const desambiguador = values['sem-ia'] ? undefined : desambiguadorDoAmbiente()
  return {
    tabela,
    data: dataIso(values.data ?? new Date().toISOString().slice(0, 10)),
    ...(values.offline ? {} : { validador: criarValidadorOficial() }),
    ...(desambiguador ? { desambiguador } : {}),
    versaoTexto: `tabela ${tabela.versao} (${tabela.dataVersao})`,
  }
}

const imprimir = (resultados: readonly Resultado[], cabecalho: string): void => {
  if (values.json) {
    process.stdout.write(`${JSON.stringify(resultados, null, 2)}\n`)
    return
  }
  const r = resumir(resultados)
  console.log(cabecalho)
  console.log(
    `  ${cor.verde(`${r.resolvidos} resolvidos`)}   ${cor.ambar(`${r.revisar} revisar`)}   ${cor.azul(`${r.faltaInformacao} falta informação`)}`,
  )
  if (r.comReducao > 0) console.log(`  ${r.comReducao} com redução de alíquota`)
  if (r.custoIaUsd > 0) console.log(cor.cinza(`  custo de IA: US$ ${r.custoIaUsd.toFixed(5)}`))
  console.log('')
  for (const res of resultados)
    if (res.status !== 'resolvido' || resultados.length <= 20) console.log(linhaResultado(res))
}

const comandoItem = async (): Promise<void> => {
  const [descricao, codigo] = positionals.slice(1)
  if (!descricao || !codigo) throw new ErroDeDominio('uso', 'enquadra item "<descrição>" <ncm>')
  const deps = await dependencias()
  const { cfop: cfopTexto } = values
  const item: ItemEntrada = {
    descricao,
    ncm: ncm(codigo),
    ...(cfopTexto ? { cfop: cfop(cfopTexto) } : {}),
  }
  const resultado = await enquadrar(item, deps)
  if (values.json) return imprimir([resultado], '')
  console.log(linhaResultado(resultado, true))
}

const comandoXmls = async (): Promise<void> => {
  const alvo = positionals[1]
  if (!alvo) throw new ErroDeDominio('uso', 'enquadra xmls <pasta-ou-arquivo>')
  const deps = await dependencias()
  const arquivos = await listarXmls(alvo)
  const distintos = new Map<string, ItemEntrada>()
  let notas = 0
  for (const arquivo of arquivos) {
    try {
      const nota = lerNfe(await readFile(arquivo, 'utf8'))
      notas++
      for (const item of nota.itens) distintos.set(chaveItem(item), item)
    } catch (erro) {
      console.error(cor.cinza(`ignorado ${arquivo}: ${(erro as Error).message}`))
    }
  }
  const resultados = await Promise.all([...distintos.values()].map((i) => enquadrar(i, deps)))
  imprimir(resultados, `${distintos.size} itens distintos em ${notas} notas · ${deps.versaoTexto}`)
  if (values.html) {
    await writeFile(values.html, relatorioHtml(resultados, deps.versaoTexto))
    console.log(cor.cinza(`relatório: ${values.html}`))
  }
}

const principal = async (): Promise<void> => {
  const comando = positionals[0]
  if (values.ajuda || !comando) return console.log(AJUDA)
  if (comando === 'item') return comandoItem()
  if (comando === 'xmls') return comandoXmls()
  throw new ErroDeDominio('comando_desconhecido', comando)
}

principal().catch((erro: unknown) => {
  console.error(cor.vermelho(erro instanceof Error ? erro.message : String(erro)))
  process.exitCode = 1
})
