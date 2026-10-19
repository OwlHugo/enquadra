import type { Condicao } from '../descricao.ts'
import { type CClassTrib, cClassTrib } from '../tipos.ts'
import * as c from './condicoes.ts'

/**
 * Regras de produto da LC 214/2025, escritas como dado e não como `if`.
 * Cada regra é um item de anexo (ou artigo), com o texto literal da lei
 * copiado do Planalto em 18/10/2026. A cobertura está declarada em `COBERTURA`.
 *
 * Prefixos de NCM: a lei cita capítulo ("Capítulo 6" → "06"), posição ("09.01" → "0901"),
 * subposição ("2101.1" → "21011") ou código ("0405.10.00" → "04051000").
 */

type Origem = 'I' | 'VII' | 'VIII' | 'XV' | 'art147' | 'art9'

export interface RegraProduto {
  readonly id: string
  readonly origem: Origem
  readonly cClassTrib: CClassTrib
  readonly dispositivo: string
  readonly texto: string
  readonly incluir: readonly string[]
  readonly excluir?: readonly string[]
  /**
   * Prefixos afastados por interpretação de uma ressalva genérica da lei, e não por código
   * escrito no texto. Ficam separados de `excluir` para que a derivação seja auditável.
   */
  readonly afastadoPorRessalva?: { readonly prefixos: readonly string[]; readonly porque: string }
  /** Inclusão derivada de termo da lei (ex.: "casca rija" → 0801, 0802), com a justificativa. */
  readonly inclusaoDerivada?: string
  readonly condicao?: Condicao
  /** Origens que, se também casarem, afastam esta regra. */
  readonly ressalvadoPor?: readonly Origem[]
  readonly rotulo: string
}

const CT = {
  anexoI: cClassTrib('200003'),
  anexoVII: cClassTrib('200034'),
  anexoVIII: cClassTrib('200035'),
  anexoXV: cClassTrib('200014'),
  art147: cClassTrib('200013'),
  livros: cClassTrib('410008'),
} as const

const I = (
  item: string,
  texto: string,
  incluir: string[],
  extra: Partial<RegraProduto> = {},
): RegraProduto => ({
  id: `I.${item}`,
  origem: 'I',
  cClassTrib: CT.anexoI,
  dispositivo: `LC 214/2025, art. 125 e Anexo I, item ${item}`,
  rotulo: 'Cesta Básica Nacional (Anexo I), alíquota zero',
  texto,
  incluir,
  ...extra,
})

const VII = (
  item: string,
  texto: string,
  incluir: string[],
  extra: Partial<RegraProduto> = {},
): RegraProduto => ({
  id: `VII.${item}`,
  origem: 'VII',
  cClassTrib: CT.anexoVII,
  dispositivo: `LC 214/2025, art. 135 e Anexo VII, item ${item}`,
  rotulo: 'Alimentos (Anexo VII), redução de 60%',
  ressalvadoPor: ['I', 'XV'],
  texto,
  incluir,
  ...extra,
})

const VIII = (
  item: string,
  texto: string,
  incluir: string[],
  extra: Partial<RegraProduto> = {},
): RegraProduto => ({
  id: `VIII.${item}`,
  origem: 'VIII',
  cClassTrib: CT.anexoVIII,
  dispositivo: `LC 214/2025, art. 136 e Anexo VIII, item ${item}`,
  rotulo: 'Higiene pessoal e limpeza (Anexo VIII), redução de 60%',
  texto,
  incluir,
  ...extra,
})

const XV = (
  item: string,
  texto: string,
  incluir: string[],
  extra: Partial<RegraProduto> = {},
): RegraProduto => ({
  id: `XV.${item}`,
  origem: 'XV',
  cClassTrib: CT.anexoXV,
  dispositivo: `LC 214/2025, art. 148 e Anexo XV, item ${item}`,
  rotulo: 'Hortícolas, frutas e ovos (Anexo XV), alíquota zero',
  texto,
  incluir,
  ...extra,
})

export const REGRAS_PRODUTO: readonly RegraProduto[] = [
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
    { condicao: c.FORMULA_INFANTIL },
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
    { id: 'I.16.pao', condicao: c.PAO_FRANCES },
  ),
  I(
    '16',
    'a pré-mistura ou massa, para preparação do pão comumente denominado pão francês, dos códigos 1901.20.10 e 1901.20.90 da NCM/SH',
    ['19012010', '19012090'],
    { id: 'I.16.pre_mistura', condicao: c.PRE_MISTURA_PAO_FRANCES },
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
  I('19.c', 'c) 02.04 e 0210.99.20', ['0204', '02109920'], { id: 'I.19.c.ovina' }),
  I('19.c', 'carne caprina classificada no código 0210.99.90', ['02109990'], {
    id: 'I.19.c.caprina',
    condicao: c.CARNE_CAPRINA,
  }),
  I(
    '19.c',
    'miudezas comestíveis de ovinos e caprinos classificadas nos códigos 0206.80.00 e 0206.90.00',
    ['02068000', '02069000'],
    { id: 'I.19.c.miudezas', condicao: c.MIUDEZA_OVINA_CAPRINA },
  ),
  I(
    '19.d',
    'd) 02.07, 0209.90.00 e 0210.99.1, exceto os produtos dos códigos 0207.43.00 e 0207.53.00',
    ['0207', '02099000', '0210991'],
    { excluir: ['02074300', '02075300'] },
  ),
  I(
    '20.a',
    'a) 03.02; exceto os produtos das subposições e dos códigos 0302.1, 0302.3, 0302.51.00, 0302.52.00, 0302.53.00 e 0302.9 da NCM/SH',
    ['0302'],
    { excluir: ['03021', '03023', '03025100', '03025200', '03025300', '03029'] },
  ),
  I(
    '20.b',
    'b) 03.03; exceto os produtos das subposições e dos códigos 0303.1, 0303.4, 0303.63.00, 0303.64.00, 0303.65.00 e 0303.9 da NCM/SH',
    ['0303'],
    { excluir: ['03031', '03034', '03036300', '03036400', '03036500', '03039'] },
  ),
  I(
    '20.c',
    'c) 03.04; exceto os salmonídeos, atuns, bacalhaus, hadoque e saithe classificados nas subposições 0304.4, 0304.5, 0304.7, 0304.8 e 0304.9 da NCM/SH',
    ['0304'],
    { excluir: ['03044', '03045', '03047', '03048', '03049'] },
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
    { condicao: c.BAIXA_PROTEINA_EIM },
  ),
  I(
    '26',
    'Fórmulas Dietoterápicas para Erros Inatos do Metabolismo da NCM 2106.9090',
    ['21069090'],
    {
      condicao: c.DIETOTERAPICA_EIM,
    },
  ),

  // ── Anexo XV ────────────────────────────────────────────────────────────
  XV('1', 'Ovos da subposição 0407.2 da NCM/SH', ['04072']),
  XV(
    '2',
    'Produtos hortícolas das posições 07.01, 07.02.00.00, 07.03, 07.04, 07.05, 07.06, 0707.00.00, 07.08, 07.09 e 07.10, exceto os cogumelos e trufas classificados na subposição 0709.5 e no código 0710.80.00 da NCM/SH',
    ['0701', '07020000', '0703', '0704', '0705', '0706', '07070000', '0708', '0709', '0710'],
    { excluir: ['07095', '07108000'] },
  ),
  XV(
    '3',
    'Frutas frescas ou refrigeradas e frutas congeladas sem adição de açúcar ou de outros edulcorantes classificadas nas posições 08.03, 08.04, 08.05, 08.06, 08.07, 08.08, 08.09, 08.10 e 08.11 da NCM/SH',
    ['0803', '0804', '0805', '0806', '0807', '0808', '0809', '0810'],
    { id: 'XV.3.frescas' },
  ),
  XV(
    '3',
    'Frutas frescas ou refrigeradas e frutas congeladas sem adição de açúcar ou de outros edulcorantes classificadas nas posições 08.03, 08.04, 08.05, 08.06, 08.07, 08.08, 08.09, 08.10 e 08.11 da NCM/SH',
    ['0811'],
    { id: 'XV.3.congeladas', condicao: c.SEM_ACUCAR },
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
    { excluir: ['030611', '03061500', '03063100', '03063400', '03063910'] },
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
    { id: 'VII.2.leite_fermentado' },
  ),
  VII(
    '2',
    'Leite fermentado, bebidas e compostos lácteos, em conformidade com os requisitos da legislação específica, classificados nos códigos 0403.20.00, 0403.90.00 e 2202.99.00 da NCM/SH',
    ['22029900'],
    { id: 'VII.2.bebida_lactea', condicao: c.LACTEO },
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
    { condicao: c.SEM_ACUCAR_E_CONSERVANTE },
  ),
  VII(
    '11',
    'Polpas de frutas ou de produtos hortícolas sem adição de açúcar ou de outros edulcorantes e sem conservantes classificadas na posição 20.08 da NCM/SH',
    ['2008'],
    { excluir: ['20081'], condicao: c.SEM_ACUCAR_E_CONSERVANTE },
  ),
  VII('12', 'Pão de Forma do código 1905.90.10 da NCM/SH', ['19059010']),
  VII('13', 'Extrato de tomate classificado no código 2002.90.00 da NCM/SH', ['20029000']),
  VII(
    '14',
    'Frutas, produtos hortícolas e demais produtos vegetais, sem adição de açúcar ou de outros edulcorantes, classificados nos capítulos 7 e 8 da NCM/SH, ressalvados as frutas de casca rija não regionais e os produtos relacionados nos Anexos I e XV e excetuadas as posições 07.11, 08.12 e 0814.00.00',
    ['07', '08'],
    {
      id: 'VII.14',
      excluir: ['0711', '0812', '08140000'],
      afastadoPorRessalva: {
        prefixos: ['0801', '0802', '0811'],
        porque:
          'Cocos e castanhas (0801, 0802) seguem a regra de casca rija regional (VII.14.casca_rija); frutas congeladas (0811) estão no Anexo XV, item 3, e com açúcar não atendem "sem adição de açúcar".',
      },
    },
  ),
  VII(
    '14',
    'Frutas, produtos hortícolas e demais produtos vegetais, sem adição de açúcar ou de outros edulcorantes, classificados nos capítulos 7 e 8 da NCM/SH, ressalvados as frutas de casca rija não regionais e os produtos relacionados nos Anexos I e XV e excetuadas as posições 07.11, 08.12 e 0814.00.00',
    ['0801', '0802'],
    {
      id: 'VII.14.casca_rija',
      condicao: c.CASCA_RIJA_REGIONAL,
      inclusaoDerivada:
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
    { condicao: c.SEM_SAL_NEM_ADICAO },
  ),
  VII(
    '17',
    'Fruta de casca rija regional, amendoins e outras sementes, mesmo misturados entre si, apenas torrados ou cozidos, sem adição de sal ou de quaisquer outros produtos e substâncias, classificados na subposição 2008.1 da NCM/SH',
    ['20081'],
    { condicao: c.SEM_SAL_NEM_ADICAO },
  ),

  // ── Anexo VIII ──────────────────────────────────────────────────────────
  VIII('1', 'Sabões de toucador classificados no código 3401.11.90 da NCM/SH', ['34011190']),
  VIII('2', 'Dentifrícios do código 3306.10.00 da NCM/SH', ['33061000']),
  VIII('3', 'Escovas de dentes do código 9603.21.00 da NCM/SH', ['96032100']),
  VIII('4', 'Papel higiênico do código 4818.10.00 da NCM/SH', ['48181000']),
  VIII('5', 'Água sanitária classificada no código 3808.94.19 da NCM/SH', ['38089419']),
  VIII('6', 'Sabões em barra classificados no código 3401.19.00 da NCM/SH', ['34011900']),
  VIII(
    '7',
    'Fraldas e artigos higiênicos semelhantes, de qualquer matéria classificadas no código 9619.00.00 da NCM/SH',
    ['96190000'],
    { condicao: c.FRALDA },
  ),

  // ── Art. 147 ────────────────────────────────────────────────────────────
  {
    id: 'art147',
    origem: 'art147',
    cClassTrib: CT.art147,
    dispositivo: 'LC 214/2025, art. 147',
    rotulo: 'Saúde menstrual (art. 147), alíquota zero',
    texto:
      'Ficam reduzidas a zero as alíquotas do IBS e da CBS incidentes sobre o fornecimento dos seguintes produtos de cuidados básicos à saúde menstrual: I - tampões higiênicos classificados no código 9619.00.00 da NCM/SH; II - absorventes higiênicos internos ou externos, descartáveis ou reutilizáveis, e calcinhas absorventes classificados no código 9619.00.00 da NCM/SH; e III - coletores menstruais classificados no código 9619.00.00 da NCM/SH.',
    incluir: ['96190000'],
    condicao: c.SAUDE_MENSTRUAL,
  },

  // ── Imunidade ───────────────────────────────────────────────────────────
  {
    id: 'art9.IV',
    origem: 'art9',
    cClassTrib: CT.livros,
    dispositivo: 'LC 214/2025, art. 9º, IV',
    rotulo: 'Livros, jornais e periódicos, imunidade',
    texto:
      'São imunes também ao IBS e à CBS os fornecimentos: IV – de livros, jornais, periódicos e do papel destinado a sua impressão;',
    incluir: ['4901', '4902', '4903'],
  },
]

/** O que o motor cobre hoje. Fica no README e no relatório de eval, para ninguém achar que é mais. */
export const COBERTURA = {
  anexos: ['I', 'VII', 'VIII', 'XV'],
  artigos: ['art. 9º, IV (livros)', 'art. 147 (saúde menstrual)'],
  fora: [
    'Anexos II, III, X e XI (serviços e NBS)',
    'Anexos IV, V, VI, XII e XIII (dispositivos médicos, acessibilidade, nutrição)',
    'Anexo IX (insumos agropecuários: depende do uso pelo adquirente)',
    'Regimes de destinatário (administração pública, ZFM, áreas de livre comércio)',
  ],
} as const
