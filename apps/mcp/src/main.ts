#!/usr/bin/env node
import { cfop, type Dependencias, dataIso, enquadrar, ncm, REGRAS_PRODUTO } from '@enquadra/dominio'
import { carregarTabela, criarValidadorOficial, TABELA_PADRAO } from '@enquadra/fontes'
import { desambiguadorDoAmbiente } from '@enquadra/ia'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

/**
 * Servidor MCP. Mesmo motor da CLI; o agente que chama recebe o Resultado completo,
 * com fundamento, trilha e perguntas pendentes, para decidir se pergunta ao usuário.
 */

const tabela = await carregarTabela(process.env['ENQUADRA_TABELA'] ?? TABELA_PADRAO)
const desambiguador = desambiguadorDoAmbiente()
const deps = (data?: string): Dependencias => ({
  tabela,
  data: dataIso(data ?? new Date().toISOString().slice(0, 10)),
  validador: criarValidadorOficial(),
  ...(desambiguador ? { desambiguador } : {}),
})

const servidor = new McpServer({ name: 'enquadra', version: '0.1.0' })

servidor.registerTool(
  'classificar_item',
  {
    title: 'Classificar item (IBS/CBS)',
    description:
      'Sugere CST e cClassTrib de IBS/CBS para um item de NF-e, com o artigo da LC 214/2025, confiança e perguntas pendentes. Não calcula imposto.',
    inputSchema: {
      descricao: z.string().min(2).describe('Descrição do produto como está no cadastro'),
      ncm: z.string().describe('NCM com 8 dígitos, com ou sem pontos'),
      cfop: z.string().optional().describe('CFOP da operação; sem ele assume venda'),
      data: z.string().optional().describe('Data do fato gerador, AAAA-MM-DD'),
    },
  },
  async (e) => {
    const resultado = await enquadrar(
      { descricao: e.descricao, ncm: ncm(e.ncm), ...(e.cfop ? { cfop: cfop(e.cfop) } : {}) },
      deps(e.data),
    )
    return { content: [{ type: 'text', text: JSON.stringify(resultado, null, 2) }] }
  },
)

servidor.registerTool(
  'regras_cobertas',
  {
    title: 'Regras cobertas',
    description: 'Lista as regras da LC 214/2025 que o motor aplica, com o texto literal da lei.',
    inputSchema: { origem: z.enum(['I', 'VII', 'VIII', 'XV', 'art147', 'art9']).optional() },
  },
  async ({ origem }) => {
    const regras = REGRAS_PRODUTO.filter((r) => !origem || r.origem === origem).map((r) => ({
      id: r.id,
      cClassTrib: r.cClassTrib,
      dispositivo: r.dispositivo,
      texto: r.texto,
      ncm: r.incluir,
      excecoes: r.excluir ?? [],
      condicao: r.condicao?.pergunta ?? null,
    }))
    return { content: [{ type: 'text', text: JSON.stringify(regras, null, 2) }] }
  },
)

servidor.registerTool(
  'versao_tabela',
  {
    title: 'Versão da tabela oficial',
    description: 'Versão do banco da Calculadora RTC usada pelo motor e data da consulta.',
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          versao: tabela.versao,
          dataVersao: tabela.dataVersao,
          consultadoEm: tabela.consultadoEm,
          ncm: tabela.atoNcm,
        }),
      },
    ],
  }),
)

await servidor.connect(new StdioServerTransport())
