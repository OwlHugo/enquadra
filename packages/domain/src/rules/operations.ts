import { type CClassTrib, type Cfop, cClassTrib } from '../types.ts'

/**
 * A operação manda mais que o produto: uma bonificação de arroz não é "venda de Cesta Básica".
 * O CFOP é o primeiro filtro. Só a venda segue para as regras de produto; o resto ou tem
 * classificação própria, ou sai do escopo com aviso, nunca com palpite.
 */

export type Operacao =
  | { readonly tipo: 'venda' }
  | {
      readonly tipo: 'propria'
      readonly cClassTrib: CClassTrib
      readonly dispositivo: string
      readonly texto: string
      readonly rotulo: string
    }
  | {
      readonly tipo: 'pergunta'
      readonly pergunta: string
      readonly opcoes: readonly {
        readonly rotulo: string
        readonly cClassTrib: CClassTrib
        readonly dispositivo: string
        readonly texto: string
      }[]
    }
  | { readonly tipo: 'fora_do_escopo'; readonly motivo: string }

const EXPORTACAO = {
  tipo: 'propria',
  cClassTrib: cClassTrib('410004'),
  dispositivo: 'LC 214/2025, art. 8º',
  rotulo: 'Exportação, imunidade',
  texto:
    'São imunes ao IBS e à CBS as exportações de bens e de serviços, nos termos do Capítulo V deste Título.',
} as const satisfies Operacao

const TRANSFERENCIA = {
  tipo: 'propria',
  cClassTrib: cClassTrib('410002'),
  dispositivo: 'LC 214/2025, art. 6º, II',
  rotulo: 'Transferência entre estabelecimentos do mesmo contribuinte',
  texto:
    'transferência de bens entre estabelecimentos pertencentes ao mesmo contribuinte, observada a obrigatoriedade de emissão de documento fiscal eletrônico, nos termos do inciso II do § 2º do art. 60 desta Lei Complementar;',
} as const satisfies Operacao

const BONIFICACAO_OU_DOACAO = {
  tipo: 'pergunta',
  pergunta:
    'O CFOP indica bonificação, doação ou brinde. Qual é o caso? Brinde e bonificação que dependa de evento posterior seguem a tributação normal do produto.',
  opcoes: [
    {
      rotulo: 'Bonificação que consta no documento fiscal e não depende de evento posterior',
      cClassTrib: cClassTrib('410001'),
      dispositivo: 'LC 214/2025, art. 5º, § 1º, I',
      texto:
        'não se aplica às bonificações que constem do respectivo documento fiscal e que não dependam de evento posterior;',
    },
    {
      rotulo: 'Doação sem contraprestação em benefício do doador',
      cClassTrib: cClassTrib('410003'),
      dispositivo: 'LC 214/2025, art. 6º, VIII',
      texto: 'doações sem contraprestação em benefício do doador;',
    },
  ],
} as const satisfies Operacao

const VENDA = { tipo: 'venda' } as const satisfies Operacao

/** Grupos de CFOP (3 últimos dígitos) que são saída por venda ou revenda de mercadoria. */
const SUFIXOS_VENDA = /^(10[1-9]|11[0-9]|12[0-5]|40[1-5]|65[1-6]|667)$/
const SUFIXOS_TRANSFERENCIA = /^(15[1-5]|408|409|552|557|658|659)$/

export const operacaoPorCfop = (codigo: Cfop | undefined): Operacao => {
  if (codigo === undefined) return VENDA
  const origem = codigo[0]
  const sufixo = codigo.slice(1)
  if (origem === '1' || origem === '2' || origem === '3') {
    return { tipo: 'fora_do_escopo', motivo: 'CFOP de entrada: o Enquadra classifica saídas.' }
  }
  if (origem === '7') {
    return sufixo === '501' || sufixo === '949'
      ? { tipo: 'fora_do_escopo', motivo: `CFOP ${codigo}: exportação indireta ou outra saída.` }
      : EXPORTACAO
  }
  if (SUFIXOS_VENDA.test(sufixo)) return VENDA
  if (SUFIXOS_TRANSFERENCIA.test(sufixo)) return TRANSFERENCIA
  if (sufixo === '910') return BONIFICACAO_OU_DOACAO
  if (/^(20[1-9]|21[0-9]|41[0-1]|41[3-4]|50[3-4]|55[3-6]|66[0-2])$/.test(sufixo)) {
    return {
      tipo: 'fora_do_escopo',
      motivo: `CFOP ${codigo}: devolução segue a classificação da nota original.`,
    }
  }
  if (sufixo === '501' || sufixo === '502') {
    return {
      tipo: 'fora_do_escopo',
      motivo: `CFOP ${codigo}: remessa com fim específico de exportação (suspensão do art. 82 depende de requisitos da exportadora).`,
    }
  }
  return { tipo: 'fora_do_escopo', motivo: `CFOP ${codigo}: operação sem regra no motor.` }
}
