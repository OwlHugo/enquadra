/**
 * Vocabulário do domínio. Tudo que atravessa uma fronteira (arquivo, API, LLM) chega aqui
 * já validado e com tipo nominal, para que um NCM nunca seja confundido com um cClassTrib.
 */

declare const marca: unique symbol
type Nominal<T, M extends string> = T & { readonly [marca]: M }

/** NCM com 8 dígitos, sem pontos. */
export type Ncm = Nominal<string, 'Ncm'>
/** Código de Classificação Tributária do IBS e da CBS, 6 dígitos. */
export type CClassTrib = Nominal<string, 'CClassTrib'>
/** Código de Situação Tributária do IBS e da CBS, 3 dígitos (os 3 primeiros do cClassTrib). */
export type Cst = Nominal<string, 'Cst'>
/** CFOP com 4 dígitos. */
export type Cfop = Nominal<string, 'Cfop'>
/** Data no formato AAAA-MM-DD. */
export type DataIso = Nominal<string, 'DataIso'>

export const cClassTrib = (codigo: string): CClassTrib => {
  if (!/^\d{6}$/.test(codigo)) throw new ErroDeDominio('cclasstrib_invalido', codigo)
  return codigo as CClassTrib
}

export const cstDe = (c: CClassTrib): Cst => c.slice(0, 3) as Cst

export const dataIso = (valor: string): DataIso => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw new ErroDeDominio('data_invalida', valor)
  }
  return valor as DataIso
}

export class ErroDeDominio extends Error {
  readonly codigo: string
  constructor(codigo: string, detalhe: string) {
    super(`${codigo}: ${detalhe}`)
    this.codigo = codigo
    this.name = 'ErroDeDominio'
  }
}

/** Um item a classificar, como vem de um catálogo ou de um item de NF-e. */
export interface ItemEntrada {
  readonly descricao: string
  readonly ncm: Ncm
  /** Sem CFOP o motor assume venda e registra a suposição na trilha. */
  readonly cfop?: Cfop
  /** Data do fato gerador. Sem ela, vale a data da classificação. */
  readonly data?: DataIso
  /** Decisão travada por uma pessoa. Sempre vence e nunca é desfeita pelo motor. */
  readonly decisaoManual?: DecisaoManual
}

export interface DecisaoManual {
  readonly cClassTrib: CClassTrib
  readonly motivo: string
  readonly autor: string
  readonly em: DataIso
}

/** Camada que decidiu o item, da mais forte para a mais fraca. */
export type Camada = 'manual' | 'operacao' | 'anexo' | 'descricao' | 'ia' | 'padrao'

/**
 * Confiança é categoria calculada por regra, nunca um número devolvido por modelo.
 * alta: regra decidiu sem ambiguidade. media: houve escolha entre hipóteses válidas.
 * baixa: falta fato que só a pessoa sabe.
 */
export type Confianca = 'alta' | 'media' | 'baixa'

export type Status = 'resolvido' | 'revisar' | 'falta_informacao'

export type ValidacaoOficial = 'aceito' | 'recusado' | 'indisponivel' | 'nao_consultado'

export interface Classificacao {
  readonly cst: Cst
  readonly cClassTrib: CClassTrib
  readonly descricao: string
  readonly reducaoCbs: number
  readonly reducaoIbs: number
  /**
   * true quando a API oficial só aceita uma lista fechada de NCM para este código.
   * false (ex.: 200013) quer dizer que a validação oficial aceita qualquer NCM.
   */
  readonly listaNcmRestrita: boolean
}

export interface Fundamento {
  /** Ex.: "LC 214/2025, art. 125, Anexo I, item 8". */
  readonly dispositivo: string
  /** Texto literal da lei, sem paráfrase. */
  readonly texto: string
}

export interface Candidato {
  readonly cClassTrib: CClassTrib
  readonly rotulo: string
  readonly fundamento: Fundamento
  /** Fato que precisa ser verdadeiro para o candidato valer. */
  readonly condicao?: string
  readonly descartadoPor?: string
}

export interface Pergunta {
  readonly id: string
  readonly texto: string
  readonly opcoes: readonly { readonly rotulo: string; readonly cClassTrib: CClassTrib }[]
}

export type CodigoAlerta =
  | 'ncm_inexistente'
  | 'ncm_multiplo'
  | 'descricao_condicional'
  | 'prioridade_entre_anexos'
  | 'divergencia_oficial'
  | 'beneficio_nao_mapeado'
  | 'outras_hipoteses_oficiais'
  | 'validacao_oficial_fraca'
  | 'operacao_fora_do_escopo'
  | 'cfop_ausente'
  | 'ia_descartada'
  | 'decisao_manual_invalidada'

export interface Alerta {
  readonly codigo: CodigoAlerta
  readonly mensagem: string
  readonly gravidade: 'info' | 'atencao' | 'bloqueio'
}

export interface UsoDeIa {
  readonly modelo: string
  readonly custoUsd: number
  readonly ms: number
}

export interface Resultado {
  readonly item: ItemEntrada
  readonly status: Status
  readonly confianca: Confianca
  readonly camada: Camada
  readonly classificacao: Classificacao | null
  readonly fundamento: Fundamento | null
  readonly candidatos: readonly Candidato[]
  readonly perguntas: readonly Pergunta[]
  readonly alertas: readonly Alerta[]
  readonly validacaoOficial: ValidacaoOficial
  readonly tabela: { readonly versao: string; readonly data: DataIso }
  /** Passo a passo legível de como a decisão foi tomada. */
  readonly trilha: readonly string[]
  readonly ia: UsoDeIa | null
}
