import { type Condition, normalizeDescription } from '../description.ts'
import { cClassTrib } from '../types.ts'
import {
  ANNEX_IV,
  ANNEX_IX,
  ANNEX_V,
  ANNEX_VI,
  ANNEX_X,
  ANNEX_XI,
  ANNEX_XII,
  ANNEX_XIII,
  type AnnexItem,
} from './annex-items.ts'
import type { Origin, ProductRule } from './products.ts'

/**
 * Regras dos anexos de dispositivos, nutrição, insumos, cultura e soberania, geradas a partir
 * das tabelas em `annex-items.ts` (texto do Planalto). O NCM do anexo é amplo (muitos itens
 * usam posições genéricas como 9018.90.99), então o NCM sozinho não decide: a descrição do
 * cadastro precisa citar o produto do item. Sem isso, o item vira pergunta, nunca código.
 */

/** Palavras que aparecem em quase todo item e não identificam o produto. */
const GENERIC = new Set(
  'para como pela pelo pelas pelos entre ambas ambos desta deste esta este isso cada qualquer quando onde mais menos apenas tambem inclusive incluindo conforme exclusive somente sempre outros outras outro outra partes parte acessorios acessorio aparelho aparelhos produto produtos exceto classificados classificado classificada codigos codigo mesmo mesma utilizados utilizado utilizada destinados destinadas destinado destinada sistema conjunto equipamentos equipamento instrumentos instrumento dispositivos dispositivo artigos artigo materiais material semelhantes medicina medico medicos cirurgia odontologia individualmente componentes demais especifica legislacao requisitos conformidade definicoes diretamente fabricacao sobre tipo forma pessoa pessoas deficiencia seus suas suportes posicoes posicao subposicao'.split(
    ' ',
  ),
)

/** Singular de uma palavra normalizada, para casar o plural escrito no cadastro. */
const singular = (w: string): string =>
  w
    .replace(/oes$/, 'ao')
    .replace(/ais$/, 'al')
    .replace(/eis$/, 'el')
    .replace(/ns$/, 'm')
    .replace(/s$/, '')

const WORD_FORMS = (s: string): string => {
  const forms = [s, `${s}s`, `${s}es`]
  if (s.endsWith('al')) forms.push(`${s.slice(0, -2)}ais`)
  if (s.endsWith('el')) forms.push(`${s.slice(0, -2)}eis`)
  if (s.endsWith('m')) forms.push(`${s.slice(0, -1)}ns`)
  if (s.endsWith('ao')) forms.push(`${s.slice(0, -2)}oes`)
  return forms.join('|')
}

/** Sinais do texto do item; a cláusula "exceto ..." descreve o que sai, não o que entra. */
const signals = (...texts: (string | null)[]): RegExp[] => {
  const words = new Set<string>()
  for (const t of texts) {
    const included = (t ?? '').split(/\bexceto\b/i)[0] ?? ''
    for (const w of normalizeDescription(included).split(' ')) {
      const word = singular(w)
      if (word.length >= 4 && !/\d/.test(word) && !GENERIC.has(w) && !GENERIC.has(word)) {
        words.add(word)
      }
    }
  }
  return [...words].map((w) => new RegExp(`\\b(?:${WORD_FORMS(w)})\\b`))
}

/** Contexto de saúde: NCM de uso geral (plástico, máquinas, móveis) só entra com ele. */
const HEALTH_CONTEXT: readonly RegExp[] = [
  /\bhospitalar/,
  /\bcirurg/,
  /\bmedic/,
  /\bclinic/,
  /\blaborator/,
  /\bhemodial/,
  /\bdialise/,
  /\bpaciente/,
  /\bsangue/,
  /\bodontolog/,
  /\bsus\b/,
  /\banvisa/,
  /\bortoped/,
  /\bcateter/,
  /\bsonda\b/,
  /\bprocedimento/,
  /\besteril/,
  /\bdiagnostic/,
  /\bglicemia/,
  /\bultrassom/,
]
/** Contexto agropecuário: o NCM do Anexo IX também é de alimento e de produto comum. */
const AGRO_CONTEXT: readonly RegExp[] = [
  /\bfertiliz/,
  /\badubo/,
  /\bagricol/,
  /\bagropecuar/,
  /\bpecuari/,
  /\bracao\b|\bracoes\b/,
  /\banimal/,
  /\bbovin/,
  /\bsuin/,
  /\baves?\b/,
  /\bsemente/,
  /\bmuda/,
  /\bdefensiv/,
  /\binseticid/,
  /\bfungicid/,
  /\bherbicid/,
  /\bveterinar/,
  /\bplantio/,
  /\blavoura/,
  /\bcorretivo/,
  /\bcalcario/,
  /\bsubstrato/,
  /\binoculante/,
  /\baquicol/,
  /\balevino/,
  /\bembri/,
  /\bsemen\b/,
  /\bsilagem/,
  /\bnucleo\b|\bpremix\b/,
]

/** Capítulos em que o NCM do anexo é de uso geral e o produto pode não ser da saúde. */
const GENERAL_USE_CHAPTERS = ['39', '40', '84', '85', '94']

/** Primeiro trecho do item até a vírgula ou ponto e vírgula, em no máximo 80 caracteres. */
const shorten = (text: string): string => {
  const head = text.split(/[;,]/)[0] ?? text
  return head.length <= 80 ? head : `${head.slice(0, 80).replace(/\s\S*$/, '')}...`
}

interface AnnexSpec {
  readonly origin: Origin
  readonly items: readonly AnnexItem[]
  readonly code: string
  readonly provision: string
  readonly label: string
  readonly overriddenBy?: readonly Origin[]
  /** NCM amplo e uso condicionado: sem sinal positivo na descrição a hipótese nem entra. */
  readonly requirePositive?: true
  readonly context?: readonly RegExp[]
  readonly extra?: (item: AnnexItem) => Partial<ProductRule>
}

const build = (spec: AnnexSpec): ProductRule[] => {
  return spec.items.map((item) => {
    const [number, description, ncmColumn, include, exclude, heading] = item
    // Subitem curto ("Sem mecanismo de propulsão") só faz sentido junto do título do item pai.
    const yes = signals(description, heading)
    const generalUse = include.some((p) => GENERAL_USE_CHAPTERS.some((c) => p.startsWith(c)))
    const condition: Condition = {
      id: `${spec.origin}.${number}`,
      question: `O item é "${description.slice(0, 140)}"?`,
      yes,
      no: [],
      // Item de poucas palavras basta uma; item longo pede duas juntas ("luva" sozinha não basta
      // para "luvas cirúrgicas"). Lista de alternativas (Anexo IX) também basta uma.
      minMatches: generalUse && yes.length >= 3 ? 2 : 1,
      ...(spec.requirePositive ? { requirePositive: true } : {}),
      ...(spec.context
        ? { context: spec.context }
        : include.some((p) => GENERAL_USE_CHAPTERS.some((c) => p.startsWith(c)))
          ? { context: HEALTH_CONTEXT }
          : {}),
    }
    return {
      id: `${spec.origin}.${number}`,
      origin: spec.origin,
      cClassTrib: cClassTrib(spec.code),
      provision: `${spec.provision}, item ${number}`,
      text: `Item ${number}: ${description} (NCM/SH: ${ncmColumn})`,
      include,
      ...(exclude.length > 0 ? { exclude } : {}),
      condition,
      label: spec.label,
      subject: shorten(description),
      ...(spec.overriddenBy ? { overriddenBy: spec.overriddenBy } : {}),
      ...spec.extra?.(item),
    }
  })
}

const ANVISA = 'Anvisa'

/** Cadeira de rodas, suas partes e próteses: NCM só de uso por pessoa com deficiência. */
const SPECIFIC_XIII = ['8713', '871420', '9021']

const ACCESSIBILITY_ASK =
  'O produto é dispositivo de acessibilidade para pessoa com deficiência (a descrição e o NCM, sozinhos, não dizem)?'

/** Fórmulas e composições do Anexo VI: só valem para nutrição enteral/parenteral ou EIM. */
const VI_SIGNALS: Condition = {
  id: 'VI',
  question:
    'O item é composição para nutrição enteral ou parenteral, ou fórmula para pessoa com erro inato do metabolismo?',
  yes: [
    /\benteral/,
    /\bparenteral/,
    /\berros? inatos?\b/,
    /\bfenilcetonuri/,
    /\bpku\b/,
    /\bdieta isenta/,
    /\bdieta cetogenica/,
  ],
  no: [/\brefrigerante/, /\bisotonic/, /\benergetic/, /\bsuco\b/, /\bcha\b/, /\bagua de coco/],
}

const NOT_PET: readonly RegExp[] = [/\bcaes?\b/, /\bcachorro/, /\bgatos?\b/, /\bpet\b/, /\bpassaro/]

export const ANNEX_RULES: readonly ProductRule[] = [
  ...build({
    origin: 'IV',
    items: ANNEX_IV,
    code: '200030',
    provision: 'LC 214/2025, art. 131 e Anexo IV',
    label: 'Dispositivos médicos (Anexo IV), redução de 60%',
    extra: () => ({
      registration: ANVISA,
      buyerVariant: {
        cClassTrib: cClassTrib('200005'),
        why: 'Se o adquirente for órgão da administração pública ou entidade de saúde imune com CEBAS (art. 144, II), o código é 200005 (alíquota zero).',
      },
    }),
  }),
  ...build({
    origin: 'XII',
    items: ANNEX_XII,
    code: '200004',
    provision: 'LC 214/2025, art. 144, I e Anexo XII',
    label: 'Dispositivos médicos (Anexo XII), alíquota zero',
    extra: () => ({ registration: ANVISA }),
  }),
  ...build({
    origin: 'V',
    items: ANNEX_V,
    code: '200031',
    provision: 'LC 214/2025, art. 132 e Anexo V',
    label: 'Dispositivos de acessibilidade (Anexo V), redução de 60%',
    extra: () => ({
      unconfirmed: ACCESSIBILITY_ASK,
      registration: 'norma do órgão público competente',
      buyerVariant: {
        cClassTrib: cClassTrib('200008'),
        why: 'Se o adquirente for órgão da administração pública ou entidade de saúde imune com CEBAS (art. 145, II), o código é 200008 (alíquota zero).',
      },
    }),
  }),
  ...build({
    origin: 'XIII',
    items: ANNEX_XIII,
    code: '200007',
    provision: 'LC 214/2025, art. 145, I e Anexo XIII',
    label: 'Dispositivos de acessibilidade (Anexo XIII), alíquota zero',
    extra: (item) => ({
      registration: 'norma do órgão público competente',
      ...(SPECIFIC_XIII.some((p) => item[3].some((n) => n.startsWith(p)))
        ? {}
        : { unconfirmed: ACCESSIBILITY_ASK }),
    }),
  }),
  ...build({
    origin: 'VI',
    items: ANNEX_VI,
    code: '200033',
    provision: 'LC 214/2025, art. 133, § 1º e Anexo VI',
    label: 'Nutrição enteral/parenteral e fórmulas para EIM (Anexo VI), redução de 60%',
    overriddenBy: ['I', 'VII', 'XV'],
    extra: () => ({
      registration: ANVISA,
      buyerVariant: {
        cClassTrib: cClassTrib('200011'),
        why: 'Se o adquirente for órgão da administração pública ou entidade de saúde imune com CEBAS (art. 146, § 2º), o código é 200011 (alíquota zero).',
      },
    }),
  }).map((r) => ({ ...r, condition: { ...VI_SIGNALS, id: r.id } })),
  ...build({
    origin: 'IX',
    items: ANNEX_IX,
    code: '200038',
    provision: 'LC 214/2025, art. 138 e Anexo IX',
    label: 'Insumos agropecuários e aquícolas (Anexo IX), redução de 60%',
    requirePositive: true,
    context: AGRO_CONTEXT,
    extra: (item) => ({
      registration: 'Ministério da Agricultura e Pecuária (quando exigido)',
      unconfirmed: /destinados? diretamente|utilizados diretamente/.test(item[1])
        ? 'O produto será usado diretamente na fabricação de fertilizante, ração ou defensivo, ou como insumo agropecuário (Anexo IX)?'
        : 'O produto é vendido como insumo agropecuário registrado, para uso na produção (Anexo IX)? Na venda entre contribuintes do regime regular o recolhimento é diferido (código 515001).',
    }),
  }).map((r) =>
    /domésticos/.test(r.text)
      ? { ...r, condition: { ...r.condition, veto: NOT_PET } as Condition }
      : r,
  ),
  ...build({
    origin: 'X',
    items: ANNEX_X,
    code: '200039',
    provision: 'LC 214/2025, art. 139 e Anexo X',
    label: 'Produções artísticas nacionais (Anexo X), redução de 60%',
    extra: () => ({
      unconfirmed: 'A obra é original e de artista brasileiro (art. 139, § 3º)?',
    }),
  }),
  ...build({
    origin: 'XI',
    items: ANNEX_XI,
    code: '200043',
    provision: 'LC 214/2025, art. 142, I e Anexo XI',
    label: 'Soberania e segurança (Anexo XI), redução de 60%',
    extra: () => ({
      unconfirmed:
        'O adquirente é órgão da administração pública direta, autarquia ou fundação pública?',
    }),
  }),
]
