import { normalizarDescricao } from './descricao.ts'
import { type Hipotese, levantarHipoteses } from './hipoteses.ts'
import { formatarNcm } from './ncm.ts'
import type { Desambiguador, TabelaOficial, ValidadorOficial } from './portas.ts'
import { operacaoPorCfop } from './regras/operacoes.ts'
import {
  type Alerta,
  type Camada,
  type Candidato,
  type CClassTrib,
  type Confianca,
  cClassTrib,
  type DataIso,
  type Fundamento,
  type ItemEntrada,
  type Pergunta,
  type Resultado,
  type Status,
  type UsoDeIa,
  type ValidacaoOficial,
} from './tipos.ts'

/**
 * O motor de enquadramento. A ordem das camadas é a regra de negócio central:
 * manual → operação (CFOP) → anexo → descrição → IA → padrão.
 * A primeira camada que decide encerra; cada passo deixa uma linha na trilha.
 */

export interface Dependencias {
  readonly tabela: TabelaOficial
  readonly data: DataIso
  readonly validador?: ValidadorOficial
  readonly desambiguador?: Desambiguador
}

const INTEGRAL = cClassTrib('000001')
const FUNDAMENTO_INTEGRAL: Fundamento = {
  dispositivo: 'LC 214/2025, regra geral',
  texto: 'Situações tributadas integralmente pelo IBS e CBS.',
}

interface Rascunho {
  status: Status
  confianca: Confianca
  camada: Camada
  codigo: CClassTrib | null
  fundamento: Fundamento | null
  candidatos: Candidato[]
  perguntas: Pergunta[]
  alertas: Alerta[]
  trilha: string[]
  ia: UsoDeIa | null
  /** Códigos que o motor já analisou (escolhidos, candidatos ou descartados com motivo). */
  considerados: Set<CClassTrib>
}

const novo = (): Rascunho => ({
  status: 'revisar',
  confianca: 'baixa',
  camada: 'padrao',
  codigo: null,
  fundamento: null,
  candidatos: [],
  perguntas: [],
  alertas: [],
  trilha: [],
  ia: null,
  considerados: new Set(),
})

const candidatoDe = (h: Hipotese): Candidato => ({
  cClassTrib: h.regra.cClassTrib,
  rotulo: h.regra.rotulo,
  fundamento: { dispositivo: h.regra.dispositivo, texto: h.regra.texto },
  ...(h.regra.condicao ? { condicao: h.regra.condicao.pergunta } : {}),
})

const candidatoIntegral = (motivo: string): Candidato => ({
  cClassTrib: INTEGRAL,
  rotulo: 'Tributação integral',
  fundamento: FUNDAMENTO_INTEGRAL,
  condicao: motivo,
})

export const enquadrar = async (item: ItemEntrada, deps: Dependencias): Promise<Resultado> => {
  const r = novo()
  const data = item.data ?? deps.data
  const nomeNcm = deps.tabela.nomeNcm(item.ncm)

  if (nomeNcm === undefined) {
    r.alertas.push({
      codigo: 'ncm_inexistente',
      gravidade: 'bloqueio',
      mensagem: `NCM ${formatarNcm(item.ncm)} não existe na nomenclatura vigente.`,
    })
    r.trilha.push('NCM não encontrado na nomenclatura: nada a classificar.')
    return montar(item, r, deps, data, 'nao_consultado')
  }
  r.trilha.push(`NCM ${formatarNcm(item.ncm)}: ${nomeNcm}`)

  if (item.decisaoManual) {
    decidirManual(item, r, deps)
  } else if (decidirOperacao(item, r)) {
    await decidirProduto(item, nomeNcm, r, deps)
  }

  const validacao = await validar(item, r, deps, data)
  return montar(item, r, deps, data, validacao)
}

const decidirManual = (item: ItemEntrada, r: Rascunho, deps: Dependencias): void => {
  const manual = item.decisaoManual
  if (!manual) return
  r.camada = 'manual'
  r.codigo = manual.cClassTrib
  r.fundamento = { dispositivo: `Decisão de ${manual.autor} em ${manual.em}`, texto: manual.motivo }
  if (deps.tabela.classificacao(manual.cClassTrib)) {
    r.status = 'resolvido'
    r.confianca = 'alta'
    r.trilha.push(`Decisão manual mantida: ${manual.cClassTrib} (${manual.motivo}).`)
  } else {
    r.alertas.push({
      codigo: 'decisao_manual_invalidada',
      gravidade: 'bloqueio',
      mensagem: `O código ${manual.cClassTrib} decidido manualmente não existe na tabela ${deps.tabela.versao}.`,
    })
    r.trilha.push(
      'Decisão manual aponta para código fora da tabela vigente: não foi trocada, precisa de revisão.',
    )
  }
}

/** Devolve true quando a operação é venda e o produto deve ser analisado. */
const decidirOperacao = (item: ItemEntrada, r: Rascunho): boolean => {
  if (item.cfop === undefined) {
    r.alertas.push({
      codigo: 'cfop_ausente',
      gravidade: 'info',
      mensagem: 'Sem CFOP: considerado como venda de mercadoria.',
    })
  }
  const op = operacaoPorCfop(item.cfop)
  switch (op.tipo) {
    case 'venda':
      r.trilha.push(item.cfop ? `CFOP ${item.cfop}: venda.` : 'Sem CFOP: tratado como venda.')
      return true
    case 'propria':
      r.camada = 'operacao'
      r.status = 'resolvido'
      r.confianca = 'alta'
      r.codigo = op.cClassTrib
      r.fundamento = { dispositivo: op.dispositivo, texto: op.texto }
      r.trilha.push(`CFOP ${item.cfop}: ${op.rotulo}. A operação decide antes do produto.`)
      return false
    case 'pergunta':
      r.camada = 'operacao'
      r.status = 'falta_informacao'
      r.candidatos = op.opcoes.map((o) => ({
        cClassTrib: o.cClassTrib,
        rotulo: o.rotulo,
        fundamento: { dispositivo: o.dispositivo, texto: o.texto },
      }))
      r.perguntas.push({ id: 'operacao', texto: op.pergunta, opcoes: op.opcoes })
      r.trilha.push(`CFOP ${item.cfop}: a operação depende de um fato que só a empresa sabe.`)
      return false
    case 'fora_do_escopo':
      r.camada = 'operacao'
      r.alertas.push({
        codigo: 'operacao_fora_do_escopo',
        gravidade: 'atencao',
        mensagem: op.motivo,
      })
      r.trilha.push(op.motivo)
      return false
  }
}

/** Todas as hipóteses vivas confirmadas e apontando para o mesmo código: a regra decide sozinha. */
const hipoteseUnica = (vivas: readonly Hipotese[]): Hipotese | undefined => {
  if (vivas.some((h) => h.avaliacao !== 'atende')) return undefined
  const codigos = new Set(vivas.map((h) => h.regra.cClassTrib))
  return codigos.size === 1 ? vivas[0] : undefined
}

const decidirPorRegra = (
  unica: Hipotese,
  vivas: readonly Hipotese[],
  r: Rascunho,
  descartadas: readonly { readonly motivo: string }[],
): void => {
  const porDescricao = vivas.some((h) => h.temCondicao)
  r.camada = porDescricao ? 'descricao' : 'anexo'
  r.status = 'resolvido'
  r.confianca = porDescricao ? 'media' : 'alta'
  r.codigo = unica.regra.cClassTrib
  r.fundamento = { dispositivo: unica.regra.dispositivo, texto: unica.regra.texto }
  r.trilha.push(
    porDescricao
      ? `${unica.regra.dispositivo}: a descrição confirma a condição da lei.`
      : `${unica.regra.dispositivo}: o NCM está na lista e a lei não impõe condição.`,
  )
  if (descartadas.some((d) => d.motivo.startsWith('ressalvado'))) {
    r.alertas.push({
      codigo: 'prioridade_entre_anexos',
      gravidade: 'info',
      mensagem: 'O NCM também aparece em outro anexo, afastado pela ressalva da própria lei.',
    })
  }
}

const decidirProduto = async (
  item: ItemEntrada,
  nomeNcm: string,
  r: Rascunho,
  deps: Dependencias,
): Promise<void> => {
  const { vivas, descartadas } = levantarHipoteses(item.ncm, item.descricao)
  for (const d of descartadas) r.trilha.push(`Descartado ${d.regra.id}: ${d.motivo}.`)
  for (const h of [...vivas, ...descartadas]) r.considerados.add(h.regra.cClassTrib)

  if (vivas.length === 0) {
    return decidirPadrao(item, r, deps, new Set(descartadas.map((d) => d.regra.cClassTrib)))
  }
  const unica = hipoteseUnica(vivas)
  if (unica) return decidirPorRegra(unica, vivas, r, descartadas)

  // Ambiguidade: mais de uma hipótese viva, ou condição que a descrição não resolve.
  r.camada = 'descricao'
  r.candidatos = vivas.map(candidatoDe)
  if (vivas.every((h) => h.temCondicao)) {
    r.candidatos.push(candidatoIntegral('Nenhuma condição acima é verdadeira.'))
  }
  r.alertas.push({
    codigo: vivas.length > 1 ? 'ncm_multiplo' : 'descricao_condicional',
    gravidade: 'atencao',
    mensagem:
      vivas.length > 1
        ? `O NCM ${formatarNcm(item.ncm)} cabe em ${vivas.length} hipóteses da lei; a descrição decide.`
        : 'A lei impõe uma condição que a descrição do item não deixa clara.',
  })
  r.trilha.push(`Ambíguo entre ${r.candidatos.map((c) => c.cClassTrib).join(', ')}.`)
  await desambiguar(item, nomeNcm, r, deps)
}

/**
 * Nenhuma regra coberta vale. Se a tabela oficial aceita o NCM num benefício que o motor
 * não explica (nem descartou com motivo), não dá para afirmar tributação integral.
 */
const decidirPadrao = (
  item: ItemEntrada,
  r: Rascunho,
  deps: Dependencias,
  explicados: ReadonlySet<CClassTrib>,
): void => {
  r.codigo = INTEGRAL
  r.fundamento = FUNDAMENTO_INTEGRAL
  r.camada = 'padrao'
  const aceitos = deps.tabela.restritosQueAceitam(item.ncm)
  if (aceitos === undefined) {
    // Sem a sondagem oficial do NCM, a tributação integral vale só pelo que o motor transcreveu
    // da lei: resolve, mas sem confiança alta e com o motivo à vista (alerta em `montar`).
    r.status = 'resolvido'
    r.confianca = 'media'
    r.trilha.push(
      'O NCM não está em nenhum anexo coberto, mas não foi sondado na tabela oficial: tributação integral sem confirmação oficial.',
    )
    return
  }
  const oficiais = aceitos.filter((c) => !explicados.has(c))
  if (oficiais.length > 0) {
    r.status = 'revisar'
    r.confianca = 'baixa'
    r.alertas.push({
      codigo: 'beneficio_nao_mapeado',
      gravidade: 'atencao',
      mensagem: `A tabela oficial aceita este NCM em ${oficiais.join(', ')}, que o motor ainda não cobre. Confira antes de usar a tributação integral.`,
    })
    r.trilha.push(
      `Nenhuma regra coberta casou, mas a tabela oficial aceita o NCM em ${oficiais.join(', ')}.`,
    )
    return
  }
  r.status = 'resolvido'
  r.confianca = 'alta'
  r.trilha.push(
    explicados.size > 0
      ? 'As hipóteses da lei para este NCM foram afastadas pela descrição: tributação integral.'
      : 'O NCM não está em nenhum anexo coberto: tributação integral.',
  )
}

const literal = (citacao: string, texto: string): boolean => {
  const c = normalizarDescricao(citacao)
  return c.length >= 12 && normalizarDescricao(texto).includes(c)
}

const desambiguar = async (
  item: ItemEntrada,
  nomeNcm: string,
  r: Rascunho,
  deps: Dependencias,
): Promise<void> => {
  r.status = 'falta_informacao'
  r.perguntas.push({
    id: 'produto',
    texto: r.candidatos.find((c) => c.condicao)?.condicao ?? 'Qual hipótese da lei se aplica?',
    opcoes: r.candidatos.map((c) => ({ rotulo: c.rotulo, cClassTrib: c.cClassTrib })),
  })
  if (!deps.desambiguador) return

  const { escolha, uso } = await deps.desambiguador.escolher({
    item,
    nomeNcm,
    candidatos: r.candidatos,
  })
  r.ia = uso
  if (escolha.tipo === 'preciso_perguntar') {
    r.trilha.push(`IA (${uso.modelo}) pediu pergunta: ${escolha.motivo}`)
    return
  }
  const alvo = r.candidatos.find((c) => c.cClassTrib === escolha.cClassTrib)
  const fonte = alvo ? `${alvo.fundamento.texto} ${item.descricao}` : ''
  if (!alvo || !literal(escolha.citacao, fonte)) {
    r.alertas.push({
      codigo: 'ia_descartada',
      gravidade: 'atencao',
      mensagem: alvo
        ? 'A citação devolvida pela IA não existe no texto da lei: resposta descartada.'
        : `A IA devolveu ${escolha.cClassTrib}, fora dos candidatos: resposta descartada.`,
    })
    r.trilha.push('Resposta da IA descartada pela verificação de citação.')
    return
  }
  r.camada = 'ia'
  r.status = 'revisar'
  r.confianca = 'media'
  r.codigo = alvo.cClassTrib
  r.fundamento = alvo.fundamento
  r.trilha.push(`IA (${uso.modelo}) sugeriu ${alvo.cClassTrib}: ${escolha.justificativa}`)
}

const validar = async (
  item: ItemEntrada,
  r: Rascunho,
  deps: Dependencias,
  data: DataIso,
): Promise<ValidacaoOficial> => {
  if (!r.codigo || !deps.validador) return 'nao_consultado'
  const v = await deps.validador.validar(item.ncm, r.codigo, data)
  const cls = deps.tabela.classificacao(r.codigo)
  if (v === 'recusado') {
    r.status = 'revisar'
    r.confianca = 'baixa'
    r.alertas.push({
      codigo: 'divergencia_oficial',
      gravidade: 'bloqueio',
      mensagem: `A API oficial recusa o NCM ${formatarNcm(item.ncm)} no código ${r.codigo}.`,
    })
    r.trilha.push('Validação oficial recusou a combinação NCM x cClassTrib.')
  } else if (v === 'aceito' && cls && !cls.listaNcmRestrita && r.codigo !== INTEGRAL) {
    r.alertas.push({
      codigo: 'validacao_oficial_fraca',
      gravidade: 'info',
      mensagem: `A API oficial aceita qualquer NCM em ${r.codigo}: a validação dela não confirma o enquadramento, só a regra do Enquadra.`,
    })
  }
  return v
}

const montar = (
  item: ItemEntrada,
  r: Rascunho,
  deps: Dependencias,
  data: DataIso,
  validacaoOficial: ValidacaoOficial,
): Resultado => {
  const classificacao = r.codigo ? (deps.tabela.classificacao(r.codigo) ?? null) : null
  const aceitos = deps.tabela.restritosQueAceitam(item.ncm)
  if (r.codigo && classificacao && aceitos === undefined) {
    r.alertas.push({
      codigo: 'ncm_nao_sondado',
      gravidade: 'atencao',
      mensagem: `O NCM ${formatarNcm(item.ncm)} não foi sondado na tabela oficial desta versão: não dá para dizer se outro código de lista restrita também o aceita.`,
    })
  }
  if (r.codigo && classificacao && aceitos !== undefined) {
    const outras = aceitos.filter((c) => c !== r.codigo && !r.considerados.has(c))
    if (outras.length > 0 && !r.alertas.some((a) => a.codigo === 'beneficio_nao_mapeado')) {
      r.alertas.push({
        codigo: 'outras_hipoteses_oficiais',
        gravidade: 'info',
        mensagem: `A tabela oficial também aceita este NCM em ${outras.join(', ')}, hipótese que o motor não cobre (outro destinatário, uso ou regime).`,
      })
    }
  }
  return {
    item,
    status: r.status,
    confianca: r.confianca,
    camada: r.camada,
    classificacao,
    fundamento: r.fundamento,
    candidatos: r.candidatos,
    perguntas: r.perguntas,
    alertas: r.alertas,
    validacaoOficial,
    tabela: { versao: deps.tabela.versao, data },
    trilha: r.trilha,
    ia: r.ia,
  }
}
