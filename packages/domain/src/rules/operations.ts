import { type CClassTrib, type Cfop, cClassTrib } from '../types.ts'

/**
 * A operação manda mais que o produto: uma bonificação de arroz não é "venda de Cesta Básica".
 * O CFOP é o primeiro filtro. Só a venda segue para as regras de produto; o resto ou tem
 * classificação própria, ou sai do escopo com aviso, nunca com palpite.
 */

export type Operation =
  | { readonly kind: 'sale' }
  | {
      readonly kind: 'own'
      readonly cClassTrib: CClassTrib
      readonly provision: string
      readonly text: string
      readonly label: string
    }
  | {
      readonly kind: 'question'
      readonly question: string
      /** Se a resposta que dá o benefício for "não", vale a tributação normal do produto. */
      readonly elseProduct?: true
      readonly options: readonly {
        readonly label: string
        readonly cClassTrib: CClassTrib
        readonly provision: string
        readonly text: string
      }[]
    }
  | { readonly kind: 'out_of_scope'; readonly reason: string }

const EXPORT = {
  kind: 'own',
  cClassTrib: cClassTrib('410004'),
  provision: 'LC 214/2025, art. 8º',
  label: 'Exportação, imunidade',
  text: 'São imunes ao IBS e à CBS as exportações de bens e de serviços, nos termos do Capítulo V deste Título.',
} as const satisfies Operation

const TRANSFER = {
  kind: 'own',
  cClassTrib: cClassTrib('410002'),
  provision: 'LC 214/2025, art. 6º, II',
  label: 'Transferência entre estabelecimentos do mesmo contribuinte',
  text: 'transferência de bens entre estabelecimentos pertencentes ao mesmo contribuinte, observada a obrigatoriedade de emissão de documento fiscal eletrônico, nos termos do inciso II do § 2º do art. 60 desta Lei Complementar;',
} as const satisfies Operation

const BONUS_OR_DONATION = {
  kind: 'question',
  question:
    'O CFOP indica bonificação, doação ou brinde. Qual é o caso? Brinde e bonificação que dependa de evento posterior seguem a tributação normal do produto.',
  options: [
    {
      label: 'Bonificação que consta no documento fiscal e não depende de evento posterior',
      cClassTrib: cClassTrib('410001'),
      provision: 'LC 214/2025, art. 5º, § 1º, I',
      text: 'não se aplica às bonificações que constem do respectivo documento fiscal e que não dependam de evento posterior;',
    },
    {
      label: 'Doação sem contraprestação em benefício do doador',
      cClassTrib: cClassTrib('410003'),
      provision: 'LC 214/2025, art. 6º, VIII',
      text: 'doações sem contraprestação em benefício do doador;',
    },
  ],
} as const satisfies Operation

const EXPORT_SUSPENSION = {
  kind: 'question',
  question:
    'O CFOP indica remessa com fim específico de exportação. A suspensão depende de o destinatário ser empresa comercial exportadora que cumpra os requisitos do art. 82 (OEA, patrimônio líquido, entre outros). Ela cumpre?',
  options: [
    {
      label: 'Suspensão do pagamento: fornecimento a exportadora habilitada',
      cClassTrib: cClassTrib('550001'),
      provision: 'LC 214/2025, art. 82',
      text: 'Poderá ser suspenso o pagamento do IBS e da CBS no fornecimento de bens materiais com o fim específico de exportação a empresa comercial exportadora que atenda cumulativamente aos seguintes requisitos:',
    },
  ],
  elseProduct: true,
} as const satisfies Operation

const SALE = { kind: 'sale' } as const satisfies Operation

/** Grupos de CFOP (3 últimos dígitos) que são saída por venda ou revenda de mercadoria. */
const SALE_SUFFIXES = /^(10[1-9]|11[0-9]|12[0-5]|40[1-5]|65[1-6]|667)$/
const TRANSFER_SUFFIXES = /^(15[1-5]|408|409|552|557|658|659)$/

export const operationByCfop = (code: Cfop | undefined): Operation => {
  if (code === undefined) return SALE
  const origin = code[0]
  const suffix = code.slice(1)
  if (origin === '1' || origin === '2' || origin === '3') {
    return { kind: 'out_of_scope', reason: 'CFOP de entrada: o Enquadra classifica saídas.' }
  }
  if (origin === '7') {
    return suffix === '501' || suffix === '949'
      ? { kind: 'out_of_scope', reason: `CFOP ${code}: exportação indireta ou outra saída.` }
      : EXPORT
  }
  if (SALE_SUFFIXES.test(suffix)) return SALE
  if (TRANSFER_SUFFIXES.test(suffix)) return TRANSFER
  if (suffix === '910') return BONUS_OR_DONATION
  if (/^(20[1-9]|21[0-9]|41[0-1]|41[3-4]|50[3-4]|55[3-6]|66[0-2])$/.test(suffix)) {
    return {
      kind: 'out_of_scope',
      reason: `CFOP ${code}: devolução segue a classificação da nota original.`,
    }
  }
  if (suffix === '501' || suffix === '502') return EXPORT_SUSPENSION
  return { kind: 'out_of_scope', reason: `CFOP ${code}: operação sem regra no motor.` }
}
