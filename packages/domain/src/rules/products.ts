import type { Condition } from '../description.ts'
import { type CClassTrib, cClassTrib } from '../types.ts'
import { ANNEX_RULES } from './annex-rules.ts'
import * as c from './conditions.ts'

/**
 * Regras de produto da LC 214/2025, escritas como dado e não como `if`.
 * Cada regra é um item de anexo (ou artigo), com o texto literal da lei
 * copiado do Planalto em 18/10/2026. A cobertura está declarada em `COVERAGE`.
 *
 * Prefixos de NCM: a lei cita capítulo ("Capítulo 6" → "06"), posição ("09.01" → "0901"),
 * subposição ("2101.1" → "21011") ou código ("0405.10.00" → "04051000").
 */

export type Origin =
  | 'I'
  | 'IV'
  | 'V'
  | 'VI'
  | 'VII'
  | 'VIII'
  | 'IX'
  | 'X'
  | 'XI'
  | 'XII'
  | 'XIII'
  | 'XV'
  | 'art146'
  | 'art147'
  | 'art9'

export interface ProductRule {
  readonly id: string
  readonly origin: Origin
  readonly cClassTrib: CClassTrib
  readonly provision: string
  readonly text: string
  readonly include: readonly string[]
  readonly exclude?: readonly string[]
  /**
   * Prefixos afastados por interpretação de uma ressalva genérica da lei, e não por código
   * escrito no texto. Ficam separados de `exclude` para que a derivação seja auditável.
   */
  readonly excludedByProviso?: { readonly prefixes: readonly string[]; readonly why: string }
  /** Inclusão derivada de termo da lei (ex.: "casca rija" → 0801, 0802), com a justificativa. */
  readonly derivedInclusion?: string
  readonly condition?: Condition
  /**
   * Fato que a lei exige e que não está na nota (destinação, adquirente): enquanto ninguém o
   * confirmar, a regra nunca decide sozinha; vira a pergunta. O texto é a pergunta.
   */
  readonly unconfirmed?: string
  /** Descrição que afasta a regra mesmo sem condição própria (ex.: ração de animal doméstico no Anexo VII). */
  readonly veto?: readonly RegExp[]
  /**
   * Autoridade cujo registro a lei exige (Anvisa, MAPA, norma de órgão competente). Não está na
   * nota: a regra decide pelo NCM e pela descrição, mas com confiança média e alerta.
   */
  readonly registration?: string
  /** Código que a lei dá ao mesmo produto quando o adquirente é outro (órgão público, CEBAS). */
  readonly buyerVariant?: { readonly cClassTrib: CClassTrib; readonly why: string }
  /** Nome curto do item do anexo, para a pergunta quando vários itens compartilham o NCM. */
  readonly subject?: string
  /** Origens que, se também casarem, afastam esta regra. */
  readonly overriddenBy?: readonly Origin[]
  readonly label: string
}

const CODES = {
  annexI: cClassTrib('200003'),
  annexVII: cClassTrib('200034'),
  annexVIII: cClassTrib('200035'),
  annexXV: cClassTrib('200014'),
  art147: cClassTrib('200013'),
  books: cClassTrib('410008'),
} as const

const I = (
  item: string,
  text: string,
  include: string[],
  extra: Partial<ProductRule> = {},
): ProductRule => ({
  id: `I.${item}`,
  origin: 'I',
  cClassTrib: CODES.annexI,
  provision: `LC 214/2025, art. 125 e Anexo I, item ${item}`,
  label: 'Cesta Básica Nacional (Anexo I), alíquota zero',
  text,
  include,
  ...extra,
})

const VII = (
  item: string,
  text: string,
  include: string[],
  extra: Partial<ProductRule> = {},
): ProductRule => ({
  id: `VII.${item}`,
  origin: 'VII',
  cClassTrib: CODES.annexVII,
  provision: `LC 214/2025, art. 135 e Anexo VII, item ${item}`,
  label: 'Alimentos (Anexo VII), redução de 60%',
  overriddenBy: ['I', 'XV'],
  text,
  include,
  ...extra,
})

const VIII = (
  item: string,
  text: string,
  include: string[],
  extra: Partial<ProductRule> = {},
): ProductRule => ({
  id: `VIII.${item}`,
  origin: 'VIII',
  cClassTrib: CODES.annexVIII,
  provision: `LC 214/2025, art. 136 e Anexo VIII, item ${item}`,
  label: 'Higiene pessoal e limpeza (Anexo VIII), redução de 60%',
  text,
  include,
  ...extra,
})

const XV = (
  item: string,
  text: string,
  include: string[],
  extra: Partial<ProductRule> = {},
): ProductRule => ({
  id: `XV.${item}`,
  origin: 'XV',
  cClassTrib: CODES.annexXV,
  provision: `LC 214/2025, art. 148 e Anexo XV, item ${item}`,
  label: 'Hortícolas, frutas e ovos (Anexo XV), alíquota zero',
  text,
  include,
  ...extra,
})

const MANUAL_RULES: readonly ProductRule[] = [
  // ── Anexo I ─────────────────────────────────────────────────────────────
  I('1', 'Arroz das subposições 1006.20 e 1006.30 e do código 1006.40.00 da NCM/SH', [
    '100620',
    '100630',
    '10064000',
  ]),
  I(
    '2',
    'Leite, em conformidade com os requisitos da legislação específica relativos ao consumo direto pela população, classificado nos códigos 0401.10.10, 0401.10.90, 0401.20.10, 0401.20.90, 0401.40.10 e 0401.50.10 da NCM/SH',
    ['04011010', '04011090', '04012010', '04012090', '04014010', '04015010'],
  ),
  I(
    '3',
    'Leite em pó, em conformidade com os requisitos da legislação específica, classificado nos códigos 0402.10.10, 0402.10.90, 0402.21.10, 0402.21.20, 0402.29.10 e 0402.29.20 da NCM/SH',
    ['04021010', '04021090', '04022110', '04022120', '04022910', '04022920'],
  ),
  I(
    '4',
    'Fórmulas infantis, em conformidade com os requisitos da legislação específica, classificadas nos códigos 1901.10.10, 1901.10.90 e 2106.90.90 da NCM/SH',
    ['19011010', '19011090', '21069090'],
    { condition: c.INFANT_FORMULA },
  ),
  I('5', 'Manteiga do código 0405.10.00 da NCM/SH', ['04051000']),
  I('6', 'Margarina do código 1517.10.00 da NCM/SH', ['15171000']),
  I('7', 'Feijões dos códigos 0713.33.19, 0713.33.29, 0713.33.99 e 0713.35.90 da NCM/SH', [
    '07133319',
    '07133329',
    '07133399',
    '07133590',
  ]),
  I('8', 'Café da posição 09.01 e da subposição 2101.1, ambos da NCM/SH', ['0901', '21011']),
  I(
    '9',
    'Óleo de babaçu do código 1513.21.20 da NCM/SH, em conformidade com os requisitos da legislação específica relativos ao consumo como alimento',
    ['15132120'],
  ),
  I(
    '10',
    'Farinha de mandioca classificada no código 1106.20.00 da NCM/SH e tapioca e seus sucedâneos do código 1903.00.00 da NCM/SH',
    ['11062000', '19030000'],
  ),
  I('11', 'Farinha, grumos e sêmolas, de milho, dos códigos 1102.20.00 e 1103.13.00 da NCM', [
    '11022000',
    '11031300',
  ]),
  I('12', 'Grãos de milho classificados no código 1104.19.00 e do código 1104.23.00 da NCM/SH', [
    '11041900',
    '11042300',
  ]),
  I('13', 'Farinha de trigo do código 1101.00.10 da NCM/SH', ['11010010']),
  I('14', 'Açúcar classificado nos códigos 1701.14.00 e 1701.99.00 da NCM/SH', [
    '17011400',
    '17019900',
  ]),
  I('15', 'Massas alimentícias da subposição 1902.1 da NCM/SH', ['19021']),
  I(
    '16',
    'Pão comumente denominado pão francês, de formato cilíndrico e alongado, com miolo branco creme e macio, e casca dourada e crocante, elaborado a partir da mistura ou pré-mistura de farinha de trigo, fermento biológico, água, sal, açúcar, aditivos alimentares e produtos de fortificação de farinhas, em conformidade com a legislação vigente, classificado no código 1905.90.90 da NCM/SH',
    ['19059090'],
    { id: 'I.16.bread', condition: c.FRENCH_BREAD },
  ),
  I(
    '16',
    'a pré-mistura ou massa, para preparação do pão comumente denominado pão francês, dos códigos 1901.20.10 e 1901.20.90 da NCM/SH',
    ['19012010', '19012090'],
    { id: 'I.16.premix', condition: c.FRENCH_BREAD_PREMIX },
  ),
  I('17', 'Grãos de aveia dos códigos 1104.12.00 e 1104.22.00 da NCM/SH', ['11041200', '11042200']),
  I('18', 'Farinha de aveia classificada no código 1102.90.00 da NCM/SH', ['11029000']),
  I('19.a', 'a) 02.01, 02.02, 0206.10.00, 0206.2 e 0210.20.00', [
    '0201',
    '0202',
    '02061000',
    '02062',
    '02102000',
  ]),
  I('19.b', 'b) 02.03, 0206.30.00, 0206.4, 0209.10 e 0210.1', [
    '0203',
    '02063000',
    '02064',
    '020910',
    '02101',
  ]),
  I('19.c', 'c) 02.04 e 0210.99.20', ['0204', '02109920'], { id: 'I.19.c.sheep' }),
  I('19.c', 'carne caprina classificada no código 0210.99.90', ['02109990'], {
    id: 'I.19.c.goat',
    condition: c.GOAT_MEAT,
  }),
  I(
    '19.c',
    'miudezas comestíveis de ovinos e caprinos classificadas nos códigos 0206.80.00 e 0206.90.00',
    ['02068000', '02069000'],
    { id: 'I.19.c.offal', condition: c.SHEEP_GOAT_OFFAL },
  ),
  I(
    '19.d',
    'd) 02.07, 0209.90.00 e 0210.99.1, exceto os produtos dos códigos 0207.43.00 e 0207.53.00',
    ['0207', '02099000', '0210991'],
    { exclude: ['02074300', '02075300'] },
  ),
  I(
    '20.a',
    'a) 03.02; exceto os produtos das subposições e dos códigos 0302.1, 0302.3, 0302.51.00, 0302.52.00, 0302.53.00 e 0302.9 da NCM/SH',
    ['0302'],
    { exclude: ['03021', '03023', '03025100', '03025200', '03025300', '03029'] },
  ),
  I(
    '20.b',
    'b) 03.03; exceto os produtos das subposições e dos códigos 0303.1, 0303.4, 0303.63.00, 0303.64.00, 0303.65.00 e 0303.9 da NCM/SH',
    ['0303'],
    { exclude: ['03031', '03034', '03036300', '03036400', '03036500', '03039'] },
  ),
  I(
    '20.c',
    'c) 03.04; exceto os salmonídeos, atuns, bacalhaus, hadoque e saithe classificados nas subposições 0304.4, 0304.5, 0304.7, 0304.8 e 0304.9 da NCM/SH',
    ['0304'],
    { exclude: ['03044', '03045', '03047', '03048', '03049'] },
  ),
  I(
    '21',
    'Queijos tipo mozarela, minas, prato, queijo de coalho, ricota, requeijão, queijo provolone, queijo parmesão, queijo fresco não maturado e queijo do reino classificados nos códigos 0406.10.10, 0406.10.90, 0406.20.00, 0406.90.10, 0406.90.20 e 0406.90.30 da NCM/SH',
    ['04061010', '04061090', '04062000', '04069010', '04069020', '04069030'],
  ),
  I(
    '22',
    'Sal em conformidade com os requisitos da legislação específica relativos ao teor de iodo enquadrado nos limites próprios para consumo humano classificado nos códigos 2501.00.20 e 2501.00.90 da NCM/SH',
    ['25010020', '25010090'],
  ),
  I('23', 'Mate da posição 09.03 da NCM/SH', ['0903']),
  I(
    '24',
    'Farinha com baixo teor de proteína para pessoas com aminoacidopatias, acidemias e defeitos do ciclo da uréia da NCM 1901.90.90',
    ['19019090'],
    { condition: c.LOW_PROTEIN_IEM },
  ),
  I(
    '26',
    'Fórmulas Dietoterápicas para Erros Inatos do Metabolismo da NCM 2106.9090',
    ['21069090'],
    {
      condition: c.IEM_DIETARY_FORMULA,
    },
  ),

  // ── Anexo XV ────────────────────────────────────────────────────────────
  XV('1', 'Ovos da subposição 0407.2 da NCM/SH', ['04072']),
  XV(
    '2',
    'Produtos hortícolas das posições 07.01, 07.02.00.00, 07.03, 07.04, 07.05, 07.06, 0707.00.00, 07.08, 07.09 e 07.10, exceto os cogumelos e trufas classificados na subposição 0709.5 e no código 0710.80.00 da NCM/SH',
    ['0701', '07020000', '0703', '0704', '0705', '0706', '07070000', '0708', '0709', '0710'],
    { exclude: ['07095', '07108000'] },
  ),
  XV(
    '3',
    'Frutas frescas ou refrigeradas e frutas congeladas sem adição de açúcar ou de outros edulcorantes classificadas nas posições 08.03, 08.04, 08.05, 08.06, 08.07, 08.08, 08.09, 08.10 e 08.11 da NCM/SH',
    ['0803', '0804', '0805', '0806', '0807', '0808', '0809', '0810'],
    { id: 'XV.3.fresh' },
  ),
  XV(
    '3',
    'Frutas frescas ou refrigeradas e frutas congeladas sem adição de açúcar ou de outros edulcorantes classificadas nas posições 08.03, 08.04, 08.05, 08.06, 08.07, 08.08, 08.09, 08.10 e 08.11 da NCM/SH',
    ['0811'],
    { id: 'XV.3.frozen', condition: c.NO_ADDED_SUGAR },
  ),
  XV(
    '4',
    'Plantas e produtos de floricultura relativos à horticultura e cultivados para fins alimentares, ornamentais ou medicinais classificados no Capítulo 6 da NCM/SH',
    ['06'],
  ),
  XV('5', 'Raízes e tubérculos da posição 07.14 da NCM/SH', ['0714']),
  XV('6', 'Cocos da subposição 0801.1 da NCM/SH', ['08011']),

  // ── Anexo VII ───────────────────────────────────────────────────────────
  VII(
    '1.a',
    'a) 0306.1 e 0306.3, exceto os produtos da subposição 0306.11 e dos códigos 0306.15.00, 0306.31.00, 0306.34.00, 0306.39.10',
    ['03061', '03063'],
    { exclude: ['030611', '03061500', '03063100', '03063400', '03063910'] },
  ),
  VII(
    '1.b',
    'b) 0307.31.00, 0307.32.00, 0307.42.00, 0307.43, 0307.51.00, 0307.52.00, 0307.91.00 e 0307.92.00',
    ['03073100', '03073200', '03074200', '030743', '03075100', '03075200', '03079100', '03079200'],
  ),
  VII(
    '2',
    'Leite fermentado, bebidas e compostos lácteos, em conformidade com os requisitos da legislação específica, classificados nos códigos 0403.20.00, 0403.90.00 e 2202.99.00 da NCM/SH',
    ['04032000', '04039000'],
    { id: 'VII.2.fermented_milk' },
  ),
  VII(
    '2',
    'Leite fermentado, bebidas e compostos lácteos, em conformidade com os requisitos da legislação específica, classificados nos códigos 0403.20.00, 0403.90.00 e 2202.99.00 da NCM/SH',
    ['22029900'],
    { id: 'VII.2.dairy_drink', condition: c.DAIRY },
  ),
  VII('3', 'Mel natural do código 0409.00.00 da NCM/SH', ['04090000']),
  VII(
    '4',
    'Farinha das posições 1101.00, 11.02, 11.05, 11.06 e 12.08 da NCM/SH; ressalvados os produtos relacionados no Anexo I',
    ['110100', '1102', '1105', '1106', '1208'],
  ),
  VII(
    '5',
    'Grumos e sêmolas de cereais dos códigos 1103.11.00 e 1103.19.00 da NCM/SH; ressalvados os produtos relacionados no Anexo I',
    ['11031100', '11031900'],
  ),
  VII(
    '6',
    'Grãos de cereais das subposições 1104.1 e 1104.2 da NCM/SH; ressalvados os produtos relacionados no Anexo I',
    ['11041', '11042'],
  ),
  VII('7', 'Amido de milho do código 1108.12.00 da NCM/SH', ['11081200']),
  VII(
    '8',
    'Óleos de soja, de milho, canola e demais óleos vegetais, em conformidade com os requisitos da legislação específica relativos ao consumo como alimento, classificados na subposição 1507.90 e nas posições 15.08, 15.11, 15.12, 15.13, 15.14 e 15.15 da NCM/SH',
    ['150790', '1508', '1511', '1512', '1513', '1514', '1515'],
  ),
  VII('9', 'Massas alimentícias dos códigos 1902.20.00 e 1902.30.00 da NCM/SH', [
    '19022000',
    '19023000',
  ]),
  VII(
    '10',
    'Sucos naturais de fruta ou de produtos hortícolas sem adição de açúcar ou de outros edulcorantes e sem conservantes classificados na posição 20.09 da NCM/SH',
    ['2009'],
    { condition: c.NO_SUGAR_NO_PRESERVATIVE },
  ),
  VII(
    '11',
    'Polpas de frutas ou de produtos hortícolas sem adição de açúcar ou de outros edulcorantes e sem conservantes classificadas na posição 20.08 da NCM/SH',
    ['2008'],
    { exclude: ['20081'], condition: c.NO_SUGAR_NO_PRESERVATIVE },
  ),
  VII('12', 'Pão de Forma do código 1905.90.10 da NCM/SH', ['19059010']),
  VII('13', 'Extrato de tomate classificado no código 2002.90.00 da NCM/SH', ['20029000']),
  VII(
    '14',
    'Frutas, produtos hortícolas e demais produtos vegetais, sem adição de açúcar ou de outros edulcorantes, classificados nos capítulos 7 e 8 da NCM/SH, ressalvados as frutas de casca rija não regionais e os produtos relacionados nos Anexos I e XV e excetuadas as posições 07.11, 08.12 e 0814.00.00',
    ['07', '08'],
    {
      id: 'VII.14',
      exclude: ['0711', '0812', '08140000'],
      excludedByProviso: {
        prefixes: ['0801', '0802', '0811'],
        why: 'Cocos e castanhas (0801, 0802) seguem a regra de casca rija regional (VII.14.hard_shell); frutas congeladas (0811) estão no Anexo XV, item 3, e com açúcar não atendem "sem adição de açúcar".',
      },
    },
  ),
  VII(
    '14',
    'Frutas, produtos hortícolas e demais produtos vegetais, sem adição de açúcar ou de outros edulcorantes, classificados nos capítulos 7 e 8 da NCM/SH, ressalvados as frutas de casca rija não regionais e os produtos relacionados nos Anexos I e XV e excetuadas as posições 07.11, 08.12 e 0814.00.00',
    ['0801', '0802'],
    {
      id: 'VII.14.hard_shell',
      condition: c.REGIONAL_HARD_SHELL,
      derivedInclusion:
        'O item cobre os capítulos 7 e 8 e ressalva "as frutas de casca rija não regionais"; as frutas de casca rija ficam nas posições 08.01 (cocos, castanha-do-pará, caju) e 08.02 (outras), então só as regionais permanecem.',
    },
  ),
  VII(
    '15',
    'Cereais do capítulo 10 e sementes e frutos oleaginosos classificados no capítulo 12, ambos da NCM/SH, ressalvados os produtos relacionados no Anexo I',
    ['10', '1201', '1202', '1203', '1204', '1205', '1206', '1207'],
  ),
  VII(
    '16',
    'Produtos hortícolas, mesmo misturados entre si, apenas pré-cozidos ou cozidos em água ou vapor, sem adição de sal ou de quaisquer outros produtos e substâncias, classificados nas posições 20.04 e 20.05 e no código 2002.10.00 da NCM/SH',
    ['2004', '2005', '20021000'],
    { condition: c.NO_SALT_NO_ADDITIVE },
  ),
  VII(
    '17',
    'Fruta de casca rija regional, amendoins e outras sementes, mesmo misturados entre si, apenas torrados ou cozidos, sem adição de sal ou de quaisquer outros produtos e substâncias, classificados na subposição 2008.1 da NCM/SH',
    ['20081'],
    { condition: c.NO_SALT_NO_ADDITIVE },
  ),

  // ── Anexo VIII ──────────────────────────────────────────────────────────
  VIII('1', 'Sabões de toucador classificados no código 3401.11.90 da NCM/SH', ['34011190']),
  VIII('2', 'Dentifrícios do código 3306.10.00 da NCM/SH', ['33061000']),
  VIII('3', 'Escovas de dentes do código 9603.21.00 da NCM/SH', ['96032100']),
  VIII('4', 'Papel higiênico do código 4818.10.00 da NCM/SH', ['48181000']),
  VIII('5', 'Água sanitária classificada no código 3808.94.19 da NCM/SH', ['38089419'], {
    condition: c.BLEACH,
  }),
  VIII('6', 'Sabões em barra classificados no código 3401.19.00 da NCM/SH', ['34011900']),
  VIII(
    '7',
    'Fraldas e artigos higiênicos semelhantes, de qualquer matéria classificadas no código 9619.00.00 da NCM/SH',
    ['96190000'],
    { condition: c.DIAPER },
  ),

  // ── Art. 147 ────────────────────────────────────────────────────────────
  {
    id: 'art147',
    origin: 'art147',
    cClassTrib: CODES.art147,
    provision: 'LC 214/2025, art. 147',
    label: 'Saúde menstrual (art. 147), alíquota zero',
    text: 'Ficam reduzidas a zero as alíquotas do IBS e da CBS incidentes sobre o fornecimento dos seguintes produtos de cuidados básicos à saúde menstrual: I - tampões higiênicos classificados no código 9619.00.00 da NCM/SH; II - absorventes higiênicos internos ou externos, descartáveis ou reutilizáveis, e calcinhas absorventes classificados no código 9619.00.00 da NCM/SH; e III - coletores menstruais classificados no código 9619.00.00 da NCM/SH.',
    include: ['96190000'],
    condition: c.MENSTRUAL_HEALTH,
  },

  // ── Imunidade ───────────────────────────────────────────────────────────
  {
    id: 'art9.IV',
    origin: 'art9',
    cClassTrib: CODES.books,
    provision: 'LC 214/2025, art. 9º, IV',
    label: 'Livros, jornais e periódicos, imunidade',
    text: 'São imunes também ao IBS e à CBS os fornecimentos: IV – de livros, jornais, periódicos e do papel destinado a sua impressão;',
    include: ['4901', '4902', '4903'],
    condition: c.BOOK,
  },
  {
    id: 'art9.V',
    origin: 'art9',
    cClassTrib: cClassTrib('410009'),
    provision: 'LC 214/2025, art. 9º, V',
    label: 'Fonogramas e videofonogramas musicais brasileiros, imunidade',
    text: 'São imunes também ao IBS e à CBS os fornecimentos: V - de fonogramas e videofonogramas musicais produzidos no Brasil contendo obras musicais ou literomusicais de autores brasileiros e/ou obras em geral interpretadas por artistas brasileiros, bem como os suportes materiais ou arquivos digitais que os contenham, salvo na etapa de replicação industrial de mídias ópticas de leitura a laser;',
    include: ['852349', '85238'],
    condition: c.PHONOGRAM,
    unconfirmed:
      'O fonograma foi produzido no Brasil e tem obra ou intérprete brasileiro (art. 9º, V)?',
  },

  // ── Medicamentos: soros e vacinas ───────────────────────────────────────
  {
    id: 'art146.1.III',
    origin: 'art146',
    cClassTrib: cClassTrib('200053'),
    provision: 'LC 214/2025, art. 146, § 1º, III',
    label: 'Soros e vacinas registrados na Anvisa, alíquota zero',
    text: 'São também reduzidas a zero as alíquotas do IBS e da CBS sobre o fornecimento de medicamentos registrados na Anvisa quando: III - classificados como soros ou vacinas, conforme regulamentação sanitária específica. (NCM/SH 3002.41, vacinas para medicina humana)',
    include: ['300241'],
    registration: 'Anvisa',
  },
]

/** Destino animal na descrição: o alimento dos Anexos I, VII e XV é para consumo humano (arts. 125, 135, 148). */
const ANIMAL_USE: readonly RegExp[] = [
  /\bracao\b/,
  /\banimais\b/,
  /\bcalopsita/,
  /\bcaes?\b/,
  /\bcachorro/,
  /\bgatos?\b/,
  /\bpassaros?\b/,
]

const ALL_RULES = [...MANUAL_RULES, ...ANNEX_RULES]

/**
 * Ajustes entre anexos:
 * - Alimento humano (Anexos I, VII e XV) não vale para descrição de ração ou de uso animal.
 * - Cereal em grão (Anexo IX, item 19) também é alimento (milho, soja...): a descrição não diz a
 *   destinação, então a hipótese fica viva e vira pergunta. Quando um anexo de alimento humano está confirmado, ele prevalece.
 */
export const PRODUCT_RULES: readonly ProductRule[] = ALL_RULES.flatMap((r) => {
  if (r.origin === 'I' || r.origin === 'VII' || r.origin === 'XV')
    return [{ ...r, veto: ANIMAL_USE }]
  if (r.id === 'IX.19' && r.condition) {
    const { requirePositive: _, context: __, ...rest } = r.condition
    // Capítulo 11 (farinhas, amidos): é alimento processado, o Anexo VII confirmado prevalece.
    // Capítulos 10 e 12 (grão, semente): a destinação decide, então o Anexo VII não afasta.
    const open = { ...rest, yes: [], minMatches: 0 }
    return [
      {
        ...r,
        include: r.include.filter((n) => !n.startsWith('11')),
        overriddenBy: ['I', 'XV'],
        condition: open,
      },
      {
        ...r,
        id: `${r.id}.processed`,
        include: r.include.filter((n) => n.startsWith('11')),
        overriddenBy: ['I', 'VII', 'XV'],
        condition: open,
      },
    ]
  }
  return [r]
})

/**
 * O que o motor cobre hoje, por cClassTrib. Tem de bater com `docs/coverage.md` e com o README
 * (um teste confere os três). `resolves`: a regra decide sozinha; `asks`: o código só aparece
 * como opção de pergunta, porque depende de fato que a nota não traz; `alertsOnly`: variante
 * por adquirente que o motor não decide, só avisa.
 */
const codesOf = (rules: readonly ProductRule[]): Set<string> =>
  new Set(rules.map((r) => r.cClassTrib))
const askingOnly = (code: string): boolean =>
  PRODUCT_RULES.filter((r) => r.cClassTrib === code).every((r) => r.unconfirmed !== undefined)

const productCodes = [...codesOf(PRODUCT_RULES)]
export const COVERAGE = {
  resolves: [...productCodes.filter((c) => !askingOnly(c)), '000001', '410002', '410004'].sort(),
  asks: [...productCodes.filter(askingOnly), '410001', '410003', '550001'].sort(),
  alertsOnly: [
    ...new Set(PRODUCT_RULES.flatMap((r) => (r.buyerVariant ? [r.buyerVariant.cClassTrib] : []))),
  ].sort(),
} as const
