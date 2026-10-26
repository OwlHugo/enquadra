import type {
  Candidato,
  CClassTrib,
  Classificacao,
  DataIso,
  ItemEntrada,
  Ncm,
  ValidacaoOficial,
} from './types.ts'

/**
 * Portas da arquitetura hexagonal. O domínio declara do que precisa;
 * `@enquadra/sources` e `@enquadra/ai` implementam. Testes usam implementações em memória.
 */

/** Tabela oficial de classificações, numa versão e data fixas. */
export interface TabelaOficial {
  readonly versao: string
  classificacao(codigo: CClassTrib): Classificacao | undefined
  /** Nome oficial do NCM na nomenclatura vigente, ou undefined se o código não existe. */
  nomeNcm(codigo: Ncm): string | undefined
  /**
   * cClassTrib cuja lista oficial de NCM aceita este código (só os de lista restrita).
   * undefined quando o NCM não foi sondado na API nesta versão, o que é diferente de "nenhum".
   */
  restritosQueAceitam(codigo: Ncm): readonly CClassTrib[] | undefined
}

/** Validação na API pública da Receita. Pode estar fora do ar: o motor nunca depende dela. */
export interface ValidadorOficial {
  validar(ncm: Ncm, codigo: CClassTrib, data: DataIso): Promise<ValidacaoOficial>
}

export interface PedidoDeEscolha {
  readonly item: ItemEntrada
  readonly nomeNcm: string
  readonly candidatos: readonly Candidato[]
}

export type Escolha =
  | {
      readonly tipo: 'escolhido'
      readonly cClassTrib: CClassTrib
      /** Trecho que o modelo diz sustentar a escolha. É conferido contra o texto da lei. */
      readonly citacao: string
      readonly justificativa: string
    }
  | { readonly tipo: 'preciso_perguntar'; readonly motivo: string }

export interface UsoDoModelo {
  readonly modelo: string
  readonly custoUsd: number
  readonly ms: number
}

/** Desambiguador (LLM). Só escolhe entre candidatos que a regra já validou. */
export interface Desambiguador {
  escolher(pedido: PedidoDeEscolha): Promise<{ escolha: Escolha; uso: UsoDoModelo }>
}
