import { normalizeDescription } from './description.ts'
import { collectHypotheses, type Discarded, type Hypothesis } from './hypotheses.ts'
import { formatNcm } from './ncm.ts'
import type { Disambiguator, OfficialTable, OfficialValidator } from './ports.ts'
import { operationByCfop } from './rules/operations.ts'
import {
  type AiUsage,
  type Alert,
  type Candidate,
  type CClassTrib,
  type Confidence,
  cClassTrib,
  type InputItem,
  type IsoDate,
  type Layer,
  type LegalBasis,
  type OfficialValidation,
  type Question,
  type Result,
  type Status,
} from './types.ts'

/**
 * O motor de enquadramento. A ordem das camadas é a regra de negócio central:
 * manual → operação (CFOP) → anexo → descrição → IA → padrão.
 * A primeira camada que decide encerra; cada passo deixa uma linha na trilha.
 */

export interface Dependencies {
  readonly table: OfficialTable
  readonly date: IsoDate
  readonly validator?: OfficialValidator
  readonly disambiguator?: Disambiguator
}

const FULL_TAX = cClassTrib('000001')
const FULL_TAX_BASIS: LegalBasis = {
  provision: 'LC 214/2025, regra geral',
  text: 'Situações tributadas integralmente pelo IBS e CBS.',
}

interface Draft {
  status: Status
  confidence: Confidence
  layer: Layer
  code: CClassTrib | null
  legalBasis: LegalBasis | null
  candidates: Candidate[]
  questions: Question[]
  alerts: Alert[]
  trail: string[]
  ai: AiUsage | null
  /** Códigos que o motor já analisou (escolhidos, candidatos ou descartados com motivo). */
  considered: Set<CClassTrib>
}

const newDraft = (): Draft => ({
  status: 'review',
  confidence: 'low',
  layer: 'default',
  code: null,
  legalBasis: null,
  candidates: [],
  questions: [],
  alerts: [],
  trail: [],
  ai: null,
  considered: new Set(),
})

const candidateOf = (h: Hypothesis): Candidate => ({
  cClassTrib: h.rule.cClassTrib,
  label: h.rule.label,
  legalBasis: { provision: h.rule.provision, text: h.rule.text },
  ...(h.rule.unconfirmed
    ? { condition: h.rule.unconfirmed }
    : h.rule.condition
      ? { condition: h.rule.condition.question }
      : {}),
})

/**
 * Vários itens do mesmo anexo compartilham NCM (ex.: 9018.90.99). Para a pessoa, são uma
 * opção só: o código é o mesmo. A pergunta lista os itens possíveis em vez de escolher um.
 */
const candidatesOf = (alive: readonly Hypothesis[]): Candidate[] => {
  const byCode = new Map<CClassTrib, Hypothesis[]>()
  for (const h of alive)
    byCode.set(h.rule.cClassTrib, [...(byCode.get(h.rule.cClassTrib) ?? []), h])
  return [...byCode.values()].map(([first, ...rest]) => {
    const head = first as Hypothesis
    if (rest.length === 0) return candidateOf(head)
    const subjects = [head, ...rest].map((h) => h.rule.subject ?? h.rule.id).join('; ')
    // O fato de fora da nota (destinação, adquirente) continua na pergunta junto da lista de itens.
    const external = head.rule.unconfirmed ? ` ${head.rule.unconfirmed}` : ''
    return {
      ...candidateOf(head),
      condition: `O produto é um destes itens: ${subjects}?${external}`,
    }
  })
}

const fullTaxCandidate = (reason: string): Candidate => ({
  cClassTrib: FULL_TAX,
  label: 'Tributação integral',
  legalBasis: FULL_TAX_BASIS,
  condition: reason,
})

export const classify = async (item: InputItem, deps: Dependencies): Promise<Result> => {
  const r = newDraft()
  const date = item.date ?? deps.date
  const ncmName = deps.table.ncmName(item.ncm)

  if (ncmName === undefined) {
    r.alerts.push({
      code: 'unknown_ncm',
      severity: 'blocker',
      message: `NCM ${formatNcm(item.ncm)} não existe na nomenclatura vigente.`,
    })
    r.trail.push('NCM não encontrado na nomenclatura: nada a classificar.')
    return build(item, r, deps, date, 'not_checked')
  }
  r.trail.push(`NCM ${formatNcm(item.ncm)}: ${ncmName}`)

  if (item.manualDecision) {
    decideManual(item, r, deps)
  } else if (decideOperation(item, r)) {
    await decideProduct(item, ncmName, r, deps)
  } else if (operationByCfop(item.cfop).kind === 'question') {
    await addProductOptions(item, ncmName, r, deps)
  }

  const validation = await validate(item, r, deps, date)
  return build(item, r, deps, date, validation)
}

/**
 * Pergunta de operação cuja resposta "não" devolve o produto à regra normal: as opções dessa
 * resposta são o que as regras de produto dariam, e não um código fixo.
 */
const addProductOptions = async (
  item: InputItem,
  ncmName: string,
  r: Draft,
  deps: Dependencies,
): Promise<void> => {
  const op = operationByCfop(item.cfop)
  if (op.kind !== 'question' || !op.elseProduct) return
  const product = newDraft()
  const { disambiguator: _ai, ...withoutAi } = deps
  await decideProduct(item, ncmName, product, withoutAi)
  const codes = product.code ? [product.code] : product.candidates.map((c) => c.cClassTrib)
  const known = new Set(r.candidates.map((c) => c.cClassTrib))
  const fresh = codes.filter((c) => !known.has(c))
  r.trail.push(
    `Sem a habilitação, o produto segue a tributação normal dele: ${fresh.join(', ') || 'já listada'}.`,
  )
  const label = 'Sem habilitação: tributação normal do produto'
  const extra = fresh.map((cClassTrib) => ({ label, cClassTrib }))
  for (const e of extra) {
    r.candidates.push({ ...e, legalBasis: product.legalBasis ?? FULL_TAX_BASIS })
  }
  r.questions = r.questions.map((q) => ({ ...q, options: [...q.options, ...extra] }))
}

const decideManual = (item: InputItem, r: Draft, deps: Dependencies): void => {
  const manual = item.manualDecision
  if (!manual) return
  r.layer = 'manual'
  r.code = manual.cClassTrib
  r.legalBasis = {
    provision: `Decisão de ${manual.author} em ${manual.decidedOn}`,
    text: manual.reason,
  }
  if (deps.table.classification(manual.cClassTrib)) {
    r.status = 'resolved'
    r.confidence = 'high'
    r.trail.push(`Decisão manual mantida: ${manual.cClassTrib} (${manual.reason}).`)
  } else {
    r.alerts.push({
      code: 'manual_decision_invalidated',
      severity: 'blocker',
      message: `O código ${manual.cClassTrib} decidido manualmente não existe na tabela ${deps.table.version}.`,
    })
    r.trail.push(
      'Decisão manual aponta para código fora da tabela vigente: não foi trocada, precisa de revisão.',
    )
  }
}

/** Devolve true quando a operação é venda e o produto deve ser analisado. */
const decideOperation = (item: InputItem, r: Draft): boolean => {
  if (item.cfop === undefined) {
    r.alerts.push({
      code: 'missing_cfop',
      severity: 'info',
      message: 'Sem CFOP: considerado como venda de mercadoria.',
    })
  }
  const op = operationByCfop(item.cfop)
  switch (op.kind) {
    case 'sale':
      r.trail.push(item.cfop ? `CFOP ${item.cfop}: venda.` : 'Sem CFOP: tratado como venda.')
      return true
    case 'own':
      r.layer = 'operation'
      r.status = 'resolved'
      r.confidence = 'high'
      r.code = op.cClassTrib
      r.legalBasis = { provision: op.provision, text: op.text }
      r.trail.push(`CFOP ${item.cfop}: ${op.label}. A operação decide antes do produto.`)
      return false
    case 'question':
      r.layer = 'operation'
      r.status = 'needs_info'
      r.candidates = op.options.map((o) => ({
        cClassTrib: o.cClassTrib,
        label: o.label,
        legalBasis: { provision: o.provision, text: o.text },
      }))
      r.questions.push({ id: 'operation', text: op.question, options: op.options })
      r.trail.push(`CFOP ${item.cfop}: a operação depende de um fato que só a empresa sabe.`)
      return false
    case 'out_of_scope':
      r.layer = 'operation'
      r.alerts.push({
        code: 'operation_out_of_scope',
        severity: 'warning',
        message: op.reason,
      })
      r.trail.push(op.reason)
      return false
  }
}

/** Todas as hipóteses vivas confirmadas e apontando para o mesmo código: a regra decide sozinha. */
const singleHypothesis = (alive: readonly Hypothesis[]): Hypothesis | undefined => {
  // Vários itens do mesmo anexo compartilham o NCM e levam ao mesmo código: se um deles está
  // confirmado, os outros não mudam a resposta.
  const codes = new Set(alive.map((h) => h.rule.cClassTrib))
  return codes.size === 1 ? alive.find((h) => h.evaluation === 'meets') : undefined
}

const decideByRule = (
  single: Hypothesis,
  alive: readonly Hypothesis[],
  r: Draft,
  discarded: readonly Discarded[],
): void => {
  const byDescription = alive.some((h) => h.hasCondition)
  r.layer = byDescription ? 'description' : 'annex'
  r.status = 'resolved'
  r.confidence = byDescription ? 'medium' : 'high'
  r.code = single.rule.cClassTrib
  r.legalBasis = { provision: single.rule.provision, text: single.rule.text }
  r.trail.push(
    byDescription
      ? `${single.rule.provision}: a descrição confirma a condição da lei.`
      : `${single.rule.provision}: o NCM está na lista e a lei não impõe condição.`,
  )
  const { registration, buyerVariant } = single.rule
  if (registration) {
    r.alerts.push({
      code: 'registration_not_checked',
      severity: 'info',
      message: `A lei exige registro ou norma (${registration}) que não consta da nota: o Enquadra presume produto regular.`,
    })
  }
  if (buyerVariant) {
    r.alerts.push({ code: 'buyer_dependent_code', severity: 'warning', message: buyerVariant.why })
  }
  if (discarded.some((d) => d.by === 'proviso')) {
    r.alerts.push({
      code: 'annex_priority',
      severity: 'info',
      message: 'O NCM também aparece em outro anexo, afastado pela ressalva da própria lei.',
    })
  }
}

const decideProduct = async (
  item: InputItem,
  ncmName: string,
  r: Draft,
  deps: Dependencies,
): Promise<void> => {
  const { alive, discarded } = collectHypotheses(item.ncm, item.description)
  for (const d of discarded) r.trail.push(`Descartado ${d.rule.id}: ${d.reason}.`)
  for (const h of [...alive, ...discarded]) {
    // Ausência de sinal não explica o benefício oficial: o NCM continua pedindo revisão.
    if ('by' in h && h.by === 'absent') continue
    r.considered.add(h.rule.cClassTrib)
    if (h.rule.buyerVariant) r.considered.add(h.rule.buyerVariant.cClassTrib)
  }

  if (alive.length === 0) {
    return decideDefault(item, r, deps, r.considered)
  }
  const single = singleHypothesis(alive)
  if (single) return decideByRule(single, alive, r, discarded)

  // Ambiguidade: mais de uma hipótese viva, ou condição que a descrição não resolve.
  r.layer = 'description'
  r.candidates = candidatesOf(alive)
  if (alive.every((h) => h.hasCondition)) {
    r.candidates.push(fullTaxCandidate('Nenhuma condição acima é verdadeira.'))
  }
  r.alerts.push({
    code: alive.length > 1 ? 'multiple_hypotheses' : 'description_condition',
    severity: 'warning',
    message:
      alive.length > 1
        ? `O NCM ${formatNcm(item.ncm)} cabe em ${alive.length} hipóteses da lei; a descrição decide.`
        : 'A lei impõe uma condição que a descrição do item não deixa clara.',
  })
  r.trail.push(`Ambíguo entre ${r.candidates.map((c) => c.cClassTrib).join(', ')}.`)
  await disambiguate(item, ncmName, r, deps)
}

/**
 * Nenhuma regra coberta vale. Se a tabela oficial aceita o NCM num benefício que o motor
 * não explica (nem descartou com motivo), não dá para afirmar tributação integral.
 */
const decideDefault = (
  item: InputItem,
  r: Draft,
  deps: Dependencies,
  explained: ReadonlySet<CClassTrib>,
): void => {
  r.code = FULL_TAX
  r.legalBasis = FULL_TAX_BASIS
  r.layer = 'default'
  const accepted = deps.table.restrictedAccepting(item.ncm)
  if (accepted === undefined) {
    // Sem a sondagem oficial do NCM, a tributação integral vale só pelo que o motor transcreveu
    // da lei: resolve, mas sem confiança alta e com o motivo à vista (alerta em `build`).
    r.status = 'resolved'
    r.confidence = 'medium'
    r.trail.push(
      'O NCM não está em nenhum anexo coberto, mas não foi sondado na tabela oficial: tributação integral sem confirmação oficial.',
    )
    return
  }
  const official = accepted.filter((c) => !explained.has(c))
  if (official.length > 0) {
    r.status = 'review'
    r.confidence = 'low'
    r.alerts.push({
      code: 'unmapped_benefit',
      severity: 'warning',
      message: `A tabela oficial aceita este NCM em ${official.join(', ')}, que o motor ainda não cobre. Confira antes de usar a tributação integral.`,
    })
    r.trail.push(
      `Nenhuma regra coberta casou, mas a tabela oficial aceita o NCM em ${official.join(', ')}.`,
    )
    return
  }
  r.status = 'resolved'
  r.confidence = 'high'
  r.trail.push(
    explained.size > 0
      ? 'As hipóteses da lei para este NCM foram afastadas pela descrição: tributação integral.'
      : 'O NCM não está em nenhum anexo coberto: tributação integral.',
  )
}

const isVerbatim = (quote: string, text: string): boolean => {
  const c = normalizeDescription(quote)
  return c.length >= 12 && normalizeDescription(text).includes(c)
}

const disambiguate = async (
  item: InputItem,
  ncmName: string,
  r: Draft,
  deps: Dependencies,
): Promise<void> => {
  r.status = 'needs_info'
  r.questions.push({
    id: 'product',
    text:
      r.candidates
        .map((c) => c.condition)
        .filter((c): c is string => c !== undefined)
        .join(' | ') || 'Qual hipótese da lei se aplica?',
    options: r.candidates.map((c) => ({ label: c.label, cClassTrib: c.cClassTrib })),
  })
  if (!deps.disambiguator) return

  const { choice, usage } = await deps.disambiguator.choose({
    item,
    ncmName,
    candidates: r.candidates,
  })
  r.ai = usage
  if (choice.kind === 'need_to_ask') {
    r.trail.push(`IA (${usage.model}) pediu pergunta: ${choice.reason}`)
    return
  }
  const target = r.candidates.find((c) => c.cClassTrib === choice.cClassTrib)
  const source = target ? `${target.legalBasis.text} ${item.description}` : ''
  if (!target || !isVerbatim(choice.quote, source)) {
    r.alerts.push({
      code: 'ai_discarded',
      severity: 'warning',
      message: target
        ? 'A citação devolvida pela IA não existe no texto da lei: resposta descartada.'
        : `A IA devolveu ${choice.cClassTrib}, fora dos candidatos: resposta descartada.`,
    })
    r.trail.push('Resposta da IA descartada pela verificação de citação.')
    return
  }
  r.layer = 'ai'
  r.status = 'review'
  r.confidence = 'medium'
  r.code = target.cClassTrib
  r.legalBasis = target.legalBasis
  r.trail.push(`IA (${usage.model}) sugeriu ${target.cClassTrib}: ${choice.justification}`)
}

const validate = async (
  item: InputItem,
  r: Draft,
  deps: Dependencies,
  date: IsoDate,
): Promise<OfficialValidation> => {
  if (!r.code || !deps.validator) return 'not_checked'
  const v = await deps.validator.validate(item.ncm, r.code, date)
  const cls = deps.table.classification(r.code)
  if (v === 'rejected') {
    r.status = 'review'
    r.confidence = 'low'
    r.alerts.push({
      code: 'official_mismatch',
      severity: 'blocker',
      message: `A API oficial recusa o NCM ${formatNcm(item.ncm)} no código ${r.code}.`,
    })
    r.trail.push('Validação oficial recusou a combinação NCM x cClassTrib.')
  } else if (v === 'accepted' && cls && !cls.restrictedNcmList && r.code !== FULL_TAX) {
    r.alerts.push({
      code: 'weak_official_validation',
      severity: 'info',
      message: `A API oficial aceita qualquer NCM em ${r.code}: a validação dela não confirma o enquadramento, só a regra do Enquadra.`,
    })
  }
  return v
}

const build = (
  item: InputItem,
  r: Draft,
  deps: Dependencies,
  date: IsoDate,
  officialValidation: OfficialValidation,
): Result => {
  const classification = r.code ? (deps.table.classification(r.code) ?? null) : null
  const accepted = deps.table.restrictedAccepting(item.ncm)
  if (r.code && classification && accepted === undefined) {
    r.alerts.push({
      code: 'ncm_not_probed',
      severity: 'warning',
      message: `O NCM ${formatNcm(item.ncm)} não foi sondado na tabela oficial desta versão: não dá para dizer se outro código de lista restrita também o aceita.`,
    })
  }
  if (r.code && classification && accepted !== undefined) {
    const others = accepted.filter((c) => c !== r.code && !r.considered.has(c))
    if (others.length > 0 && !r.alerts.some((a) => a.code === 'unmapped_benefit')) {
      r.alerts.push({
        code: 'other_official_hypotheses',
        severity: 'info',
        message: `A tabela oficial também aceita este NCM em ${others.join(', ')}, hipótese que o motor não cobre (outro destinatário, uso ou regime).`,
      })
    }
  }
  return {
    item,
    status: r.status,
    confidence: r.confidence,
    layer: r.layer,
    classification,
    legalBasis: r.legalBasis,
    candidates: r.candidates,
    questions: r.questions,
    alerts: r.alerts,
    officialValidation,
    table: { version: deps.table.version, date },
    trail: r.trail,
    ai: r.ai,
  }
}
