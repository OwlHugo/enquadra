#!/usr/bin/env node
import { disambiguatorFromEnv } from '@enquadra/ai'
import { cfop, classify, type Dependencies, isoDate, ncm, PRODUCT_RULES } from '@enquadra/domain'
import { createOfficialValidator, DEFAULT_TABLE, loadTable } from '@enquadra/sources'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

/**
 * Servidor MCP. Mesmo motor da CLI; o agente que chama recebe o Resultado completo,
 * com fundamento, trilha e perguntas pendentes, para decidir se pergunta ao usuário.
 */

const table = await loadTable(process.env['ENQUADRA_TABELA'] ?? DEFAULT_TABLE)
const disambiguator = disambiguatorFromEnv()
const deps = (date?: string): Dependencies => ({
  table,
  date: isoDate(date ?? new Date().toISOString().slice(0, 10)),
  validator: createOfficialValidator(),
  ...(disambiguator ? { disambiguator } : {}),
})

const server = new McpServer({ name: 'enquadra', version: '0.1.0' })

server.registerTool(
  'classify_item',
  {
    title: 'Classify item (IBS/CBS)',
    description:
      'Suggests the IBS/CBS CST and cClassTrib for an NF-e line item, with the article of LC 214/2025, confidence and open questions. Does not compute tax. Human-facing texts in the result are in Brazilian Portuguese.',
    inputSchema: {
      description: z.string().min(2).describe('Product description as it is in the catalog'),
      ncm: z.string().describe('8-digit NCM, with or without dots'),
      cfop: z
        .string()
        .optional()
        .describe('CFOP of the operation; without it the engine assumes a sale'),
      date: z.string().optional().describe('Taxable event date, YYYY-MM-DD'),
    },
  },
  async (e) => {
    const result = await classify(
      { description: e.description, ncm: ncm(e.ncm), ...(e.cfop ? { cfop: cfop(e.cfop) } : {}) },
      deps(e.date),
    )
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  },
)

server.registerTool(
  'covered_rules',
  {
    title: 'Covered rules',
    description:
      'Lists the LC 214/2025 rules the engine applies, with the verbatim text of the law (in Portuguese).',
    inputSchema: { origin: z.enum(['I', 'VII', 'VIII', 'XV', 'art147', 'art9']).optional() },
  },
  async ({ origin }) => {
    const rules = PRODUCT_RULES.filter((r) => !origin || r.origin === origin).map((r) => ({
      id: r.id,
      cClassTrib: r.cClassTrib,
      provision: r.provision,
      text: r.text,
      ncm: r.include,
      exceptions: r.exclude ?? [],
      condition: r.condition?.question ?? null,
    }))
    return { content: [{ type: 'text', text: JSON.stringify(rules, null, 2) }] }
  },
)

server.registerTool(
  'table_version',
  {
    title: 'Official table version',
    description:
      'Version of the RTC Calculator database used by the engine and the date it was fetched.',
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          version: table.version,
          versionDate: table.versionDate,
          fetchedOn: table.fetchedOn,
          ncm: table.ncmAct,
        }),
      },
    ],
  }),
)

await server.connect(new StdioServerTransport())
