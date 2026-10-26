import type { Condicao } from '../description.ts'

/**
 * Condições que a LC 214/2025 escreve dentro do próprio item do anexo.
 * Cada uma tem teste com descrições reais de cadastro em `conditions.test.ts`.
 */

export const FRALDA: Condicao = {
  id: 'fralda',
  pergunta: 'O item é fralda ou artigo higiênico semelhante (não absorvente, tampão ou coletor)?',
  sim: [/\bfraldas?\b/, /\bgeriatric/, /\broupa intima descartavel\b/],
  nao: [/\babsorvente/, /\btampao/, /\bcoletor menstrual/, /\bcalcinha absorvente/],
}

export const SAUDE_MENSTRUAL: Condicao = {
  id: 'saude_menstrual',
  pergunta: 'O item é tampão, absorvente ou coletor menstrual (art. 147)?',
  sim: [
    /\babsorventes?\b/,
    /\btampao/,
    /\bcoletor menstrual/,
    /\bcalcinha absorvente/,
    /\bprotetor diario/,
  ],
  nao: [/\bfraldas?\b/, /\bgeriatric/, /\bseios\b/, /\bleite materno/, /\bmamilo/],
}

export const PAO_FRANCES: Condicao = {
  id: 'pao_frances',
  pergunta:
    'É o pão francês do Anexo I (formato cilíndrico e alongado, miolo branco, casca crocante)?',
  sim: [/\bpao frances\b/, /\bpao de sal\b/, /\bcacetinho\b/, /\bcarioquinha\b/, /\bpao careca\b/],
  nao: [
    /\bpao de forma\b/,
    /\bbisnaguinha/,
    /\bpao doce\b/,
    /\bpao de queijo\b/,
    /\btorrad/,
    /\bbiscoit/,
    /\bbolo\b/,
    /\bpanetone/,
    /\bhamburguer/,
    /\bhot ?dog\b/,
    /\bsirio\b/,
    /\bbrioche/,
  ],
}

export const PRE_MISTURA_PAO_FRANCES: Condicao = {
  id: 'pre_mistura_pao_frances',
  pergunta: 'A pré-mistura ou massa é para preparar pão francês?',
  sim: [/\bpao frances\b/, /\bpao de sal\b/],
  nao: [/\bbolo\b/, /\bpizza\b/, /\bpao de queijo\b/, /\bbiscoit/, /\bpanqueca/],
}

export const FORMULA_INFANTIL: Condicao = {
  id: 'formula_infantil',
  pergunta: 'O item é fórmula infantil, conforme a legislação específica?',
  sim: [/\bformula infantil\b/, /\bformula lactea infantil\b/, /\bformula de seguimento\b/],
  nao: [/\bsuplemento/, /\bwhey\b/, /\bproteina\b/, /\bgelatina\b/, /\brefresco/, /\bpo para\b/],
}

export const DIETOTERAPICA_EIM: Condicao = {
  id: 'dietoterapica_eim',
  pergunta: 'O item é fórmula ou alimento para erro inato do metabolismo (ex.: fenilcetonúria)?',
  sim: [/\berros? inatos?\b/, /\bfenilcetonuri/, /\baminoacidopati/, /\bacidemi/, /\bpku\b/],
  nao: [/\bwhey\b/, /\bsuplemento/],
}

export const BAIXA_PROTEINA_EIM: Condicao = {
  id: 'baixa_proteina_eim',
  pergunta:
    'A farinha é de baixo teor de proteína para aminoacidopatias, acidemias ou defeitos do ciclo da ureia?',
  sim: [/\bbaixo teor de proteina\b/, /\bhipoproteic/, /\baminoacidopati/, /\bfenilcetonuri/],
  nao: [],
}

export const CARNE_CAPRINA: Condicao = {
  id: 'carne_caprina',
  pergunta: 'A carne é caprina?',
  sim: [/\bcaprin/, /\bcabrit/, /\bbode\b/, /\bcabra\b/],
  nao: [/\bbovin/, /\bsuin/, /\bfrango\b/, /\bequin/, /\bcharque\b/],
}

export const MIUDEZA_OVINA_CAPRINA: Condicao = {
  id: 'miudeza_ovina_caprina',
  pergunta: 'A miudeza é de ovino ou caprino?',
  sim: [/\bovin/, /\bcaprin/, /\bcarneiro/, /\bcordeiro/, /\bcabrit/, /\bbode\b/],
  nao: [/\bbovin/, /\bsuin/, /\bequin/, /\bboi\b/, /\bporco\b/],
}

/** Anexo XV, item 3: só as congeladas exigem "sem adição de açúcar ou de outros edulcorantes". */
export const SEM_ACUCAR: Condicao = {
  id: 'sem_acucar',
  pergunta: 'O produto é sem adição de açúcar ou de outros edulcorantes?',
  sim: [/\bsem acucar\b/, /\bzero acucar\b/, /\bsem adocante/, /\bao natural\b/, /\bin natura\b/],
  nao: [
    /\bcom acucar\b/,
    /\badocad/,
    /\bem calda\b/,
    /\bcristalizad/,
    /\bcaramelizad/,
    /\bglaceado/,
  ],
}

/** Anexo VII, itens 10 e 11: sem açúcar, sem edulcorante e sem conservante, cumulativamente. */
export const SEM_ACUCAR_E_CONSERVANTE: Condicao = {
  id: 'sem_acucar_e_conservante',
  pergunta: 'O suco ou polpa é sem adição de açúcar, sem edulcorante e sem conservante?',
  sim: [
    /\bintegral\b/,
    /\b100 ?%/,
    /\bsem acucar e sem conservante/,
    /\bsem conservante e sem acucar/,
  ],
  nao: [
    /\bcom acucar\b/,
    /\badocad/,
    /\bnectar\b/,
    /\brefresco/,
    /\bxarope/,
    /\bcom conservante/,
    /\bbebida mista\b/,
    /\bem po\b/,
  ],
}

export const LACTEO: Condicao = {
  id: 'lacteo',
  pergunta: 'A bebida do código 2202.99.00 é leite fermentado, bebida ou composto lácteo?',
  sim: [/\blacte/, /\biogurte/, /\bleite\b/, /\bachocolatad/, /\bcomposto lacteo/],
  nao: [/\brefrigerante/, /\benergetic/, /\bisotonic/, /\bcha\b/, /\bagua de coco/, /\bsuco\b/],
}

/** Anexo VII, item 14: excluídas as frutas de casca rija não regionais. */
export const CASCA_RIJA_REGIONAL: Condicao = {
  id: 'casca_rija_regional',
  pergunta: 'A fruta de casca rija é regional (ex.: castanha-do-pará, castanha de caju, baru)?',
  sim: [
    /\bcastanha do (para|brasil)\b/,
    /\bcastanha de caju\b/,
    /\bbaru\b/,
    /\bpequi\b/,
    /\bsapucaia\b/,
  ],
  nao: [/\bamendoa/, /\bnoz(es)?\b/, /\bpistache/, /\bavela/, /\bmacadamia/, /\bpeca\b/],
}

/** Anexo VII, itens 16 e 17: sem adição de sal ou de quaisquer outros produtos. */
export const SEM_SAL_NEM_ADICAO: Condicao = {
  id: 'sem_sal_nem_adicao',
  pergunta: 'O produto é sem adição de sal ou de qualquer outra substância?',
  sim: [/\bsem sal\b/, /\bao natural\b/, /\bcozid[oa] no vapor\b/],
  nao: [
    /\bcom sal\b/,
    /\bsalgad/,
    /\btemperad/,
    /\bconserva\b/,
    /\bsalmoura/,
    /\bmolho\b/,
    /\bcaramelizad/,
    /\bjapones/,
    /\bdoce\b/,
    /\bcom acucar\b/,
  ],
}
