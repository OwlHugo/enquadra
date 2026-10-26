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
  'outros outras outro outra partes parte acessorios acessorio aparelho aparelhos produto produtos exceto classificados classificado classificada codigos codigo mesmo mesma utilizados utilizado utilizada destinados destinadas destinado destinada sistema conjunto equipamentos equipamento instrumentos instrumento dispositivos dispositivo artigos artigo materiais material semelhantes medicina medico medicos cirurgia odontologia individualmente componentes demais especifica legislacao requisitos conformidade definicoes diretamente fabricacao sobre tipo forma pessoa pessoas deficiencia seus suas suportes posicoes posicao subposicao'.split(
    ' ',
  ),
)

const signals = (...texts: (string | null)[]): RegExp[] => {
  const words = new Set<string>()
  for (const t of texts) {
    for (const w of normalizeDescription(t ?? '').split(' ')) {
      const word = w.replace(/s$/, '')
      if (word.length >= 4 && !/\d/.test(word) && !GENERIC.has(w) && !GENERIC.has(word)) {
        words.add(word)
      }
    }
  }
  return [...words].map((w) => new RegExp(`\\b${w}`))
}

interface AnnexSpec {
  readonly origin: Origin
  readonly items: readonly AnnexItem[]
  readonly code: string
  readonly provision: string
  readonly label: string
  readonly overriddenBy?: readonly Origin[]
  readonly extra?: (item: AnnexItem) => Partial<ProductRule>
}

const build = (spec: AnnexSpec): ProductRule[] => {
  return spec.items.map((item) => {
    const [number, description, ncmColumn, include, exclude, heading] = item
    // Subitem curto ("Sem mecanismo de propulsão") só faz sentido junto do título do item pai.
    const yes = signals(description, heading)
    const condition: Condition = {
      id: `${spec.origin}.${number}`,
      question: `O item é "${description.slice(0, 140)}"?`,
      yes,
      no: [],
      // Item de poucas palavras basta uma; item longo pede duas juntas ("luva" sozinha não basta
      // para "luvas cirúrgicas"). Lista de alternativas (Anexo IX) também basta uma.
      minMatches: spec.origin === 'IX' || yes.length < 3 ? 1 : 2,
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
      subject: description.slice(0, 80),
      ...(spec.overriddenBy ? { overriddenBy: spec.overriddenBy } : {}),
      ...spec.extra?.(item),
    }
  })
}

const ANVISA = 'Anvisa'

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
    extra: () => ({ registration: 'norma do órgão público competente' }),
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
    overriddenBy: ['I', 'VII', 'XV', 'VIII'],
    extra: (item) => ({
      registration: 'Ministério da Agricultura e Pecuária (quando exigido)',
      unconfirmed: /destinados? diretamente|utilizados diretamente/.test(item[1])
        ? 'O produto será usado diretamente na fabricação de fertilizante, ração ou defensivo, ou como insumo agropecuário (Anexo IX)?'
        : 'O produto é vendido como insumo agropecuário registrado, para uso na produção (Anexo IX)? Na venda entre contribuintes do regime regular o recolhimento é diferido (código 515001).',
    }),
  }).map((r) =>
    /domésticos/.test(r.text)
      ? { ...r, condition: { ...r.condition, no: NOT_PET } as Condition }
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
