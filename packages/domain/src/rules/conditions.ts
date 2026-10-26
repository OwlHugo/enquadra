import type { Condition } from '../description.ts'

/**
 * Condições que a LC 214/2025 escreve dentro do próprio item do anexo.
 * Cada uma tem teste com descrições reais de cadastro em `conditions.test.ts`.
 */

export const DIAPER: Condition = {
  id: 'diaper',
  question: 'O item é fralda ou artigo higiênico semelhante (não absorvente, tampão ou coletor)?',
  yes: [/\bfraldas?\b/, /\bgeriatric/, /\broupa intima descartavel\b/],
  no: [/\babsorvente/, /\btampao/, /\bcoletor menstrual/, /\bcalcinha absorvente/],
}

export const MENSTRUAL_HEALTH: Condition = {
  id: 'menstrual_health',
  question: 'O item é tampão, absorvente ou coletor menstrual (art. 147)?',
  yes: [
    /\babsorventes?\b/,
    /\btampao/,
    /\bcoletor menstrual/,
    /\bcalcinha absorvente/,
    /\bprotetor diario/,
  ],
  no: [/\bfraldas?\b/, /\bgeriatric/, /\bseios\b/, /\bleite materno/, /\bmamilo/],
}

export const FRENCH_BREAD: Condition = {
  id: 'french_bread',
  question:
    'É o pão francês do Anexo I (formato cilíndrico e alongado, miolo branco, casca crocante)?',
  yes: [/\bpao frances\b/, /\bpao de sal\b/, /\bcacetinho\b/, /\bcarioquinha\b/, /\bpao careca\b/],
  no: [
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

export const FRENCH_BREAD_PREMIX: Condition = {
  id: 'french_bread_premix',
  question: 'A pré-mistura ou massa é para preparar pão francês?',
  yes: [/\bpao frances\b/, /\bpao de sal\b/],
  no: [/\bbolo\b/, /\bpizza\b/, /\bpao de queijo\b/, /\bbiscoit/, /\bpanqueca/],
}

export const INFANT_FORMULA: Condition = {
  id: 'infant_formula',
  question: 'O item é fórmula infantil, conforme a legislação específica?',
  yes: [/\bformula infantil\b/, /\bformula lactea infantil\b/, /\bformula de seguimento\b/],
  no: [/\bsuplemento/, /\bwhey\b/, /\bproteina\b/, /\bgelatina\b/, /\brefresco/, /\bpo para\b/],
}

export const IEM_DIETARY_FORMULA: Condition = {
  id: 'iem_dietary_formula',
  question: 'O item é fórmula ou alimento para erro inato do metabolismo (ex.: fenilcetonúria)?',
  yes: [/\berros? inatos?\b/, /\bfenilcetonuri/, /\baminoacidopati/, /\bacidemi/, /\bpku\b/],
  no: [/\bwhey\b/, /\bsuplemento/],
}

export const LOW_PROTEIN_IEM: Condition = {
  id: 'low_protein_iem',
  question:
    'A farinha é de baixo teor de proteína para aminoacidopatias, acidemias ou defeitos do ciclo da ureia?',
  yes: [/\bbaixo teor de proteina\b/, /\bhipoproteic/, /\baminoacidopati/, /\bfenilcetonuri/],
  no: [],
}

export const GOAT_MEAT: Condition = {
  id: 'goat_meat',
  question: 'A carne é caprina?',
  yes: [/\bcaprin/, /\bcabrit/, /\bbode\b/, /\bcabra\b/],
  no: [/\bbovin/, /\bsuin/, /\bfrango\b/, /\bequin/, /\bcharque\b/],
}

export const SHEEP_GOAT_OFFAL: Condition = {
  id: 'sheep_goat_offal',
  question: 'A miudeza é de ovino ou caprino?',
  yes: [/\bovin/, /\bcaprin/, /\bcarneiro/, /\bcordeiro/, /\bcabrit/, /\bbode\b/],
  no: [/\bbovin/, /\bsuin/, /\bequin/, /\bboi\b/, /\bporco\b/],
}

/** Anexo XV, item 3: só as congeladas exigem "sem adição de açúcar ou de outros edulcorantes". */
export const NO_ADDED_SUGAR: Condition = {
  id: 'no_added_sugar',
  question: 'O produto é sem adição de açúcar ou de outros edulcorantes?',
  yes: [/\bsem acucar\b/, /\bzero acucar\b/, /\bsem adocante/, /\bao natural\b/, /\bin natura\b/],
  no: [
    /\bcom acucar\b/,
    /\badocad/,
    /\bem calda\b/,
    /\bcristalizad/,
    /\bcaramelizad/,
    /\bglaceado/,
  ],
}

/** Anexo VII, itens 10 e 11: sem açúcar, sem edulcorante e sem conservante, cumulativamente. */
export const NO_SUGAR_NO_PRESERVATIVE: Condition = {
  id: 'no_sugar_no_preservative',
  question: 'O suco ou polpa é sem adição de açúcar, sem edulcorante e sem conservante?',
  yes: [
    /\bintegral\b/,
    /\b100 ?%/,
    /\bsem acucar e sem conservante/,
    /\bsem conservante e sem acucar/,
  ],
  no: [
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

export const DAIRY: Condition = {
  id: 'dairy',
  question: 'A bebida do código 2202.99.00 é leite fermentado, bebida ou composto lácteo?',
  yes: [/\blacte/, /\biogurte/, /\bleite\b/, /\bachocolatad/, /\bcomposto lacteo/],
  no: [/\brefrigerante/, /\benergetic/, /\bisotonic/, /\bcha\b/, /\bagua de coco/, /\bsuco\b/],
}

/** Anexo VII, item 14: excluídas as frutas de casca rija não regionais. */
export const REGIONAL_HARD_SHELL: Condition = {
  id: 'regional_hard_shell',
  question: 'A fruta de casca rija é regional (ex.: castanha-do-pará, castanha de caju, baru)?',
  yes: [
    /\bcastanha do (para|brasil)\b/,
    /\bcastanha de caju\b/,
    /\bbaru\b/,
    /\bpequi\b/,
    /\bsapucaia\b/,
  ],
  no: [/\bamendoa/, /\bnoz(es)?\b/, /\bpistache/, /\bavela/, /\bmacadamia/, /\bpeca\b/],
}

/** Anexo VII, itens 16 e 17: sem adição de sal ou de quaisquer outros produtos. */
export const NO_SALT_NO_ADDITIVE: Condition = {
  id: 'no_salt_no_additive',
  question: 'O produto é sem adição de sal ou de qualquer outra substância?',
  yes: [/\bsem sal\b/, /\bao natural\b/, /\bcozid[oa] no vapor\b/],
  no: [
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
