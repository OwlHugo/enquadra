import { normalizeDescription } from './description.ts'
import type { Ncm } from './types.ts'

/**
 * Cadastro com NCM trocado é comum e passa calado: "ARROZ" com NCM de roupa sai como tributação
 * integral. A primeira palavra da descrição costuma ser o produto; para os produtos de benefício
 * mais vendidos, ela indica em que capítulos da NCM o item pode estar. Fora deles, o motor avisa.
 * Não decide nada: só aponta o cadastro suspeito.
 */
const CHAPTERS_BY_HEAD_WORD: Readonly<Record<string, readonly string[]>> = {
  arroz: ['10', '11', '19', '20', '21'],
  feijao: ['07', '20', '21'],
  acucar: ['17'],
  cafe: ['09', '21'],
  sal: ['25'],
  carne: ['02', '16'],
  ovos: ['04'],
  fralda: ['48', '56', '63', '96'],
  absorvente: ['48', '56', '96'],
  sabonete: ['34'],
  preservativo: ['40'],
  // Produtos sem benefício que, com NCM de alimento ou de saúde, dariam alíquota reduzida.
  camiseta: ['61', '62'],
  camisa: ['61', '62'],
  calca: ['61', '62'],
  blusa: ['61', '62'],
  vestido: ['61', '62'],
  bermuda: ['61', '62'],
  meia: ['61', '62'],
  tenis: ['64'],
  sapato: ['64'],
  sandalia: ['64'],
  chinelo: ['64'],
  celular: ['85'],
  carregador: ['85'],
  cerveja: ['22'],
  refrigerante: ['22'],
  cigarro: ['24'],
}

/** Descrição sem nenhuma palavra de 3 letras ou mais: não diz o que é o produto. */
export const isBlankDescription = (description: string): boolean =>
  !normalizeDescription(description)
    .split(' ')
    .some((w) => /[a-z]{3,}/.test(w))

/** A palavra que não combina com o capítulo do NCM, ou `undefined` quando combina ou não se sabe. */
export const descriptionNcmMismatch = (description: string, code: Ncm): string | undefined => {
  const head = normalizeDescription(description).split(' ')[0] ?? ''
  const word = [head, head.replace(/oes$/, 'ao'), head.replace(/s$/, '')].find(
    (w) => w in CHAPTERS_BY_HEAD_WORD,
  )
  const chapters = word ? CHAPTERS_BY_HEAD_WORD[word] : undefined
  if (!word || !chapters || chapters.includes(code.slice(0, 2))) return undefined
  return word
}
