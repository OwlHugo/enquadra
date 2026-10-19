import { formatarNcm, type Resultado } from '@enquadra/dominio'

const ativo = process.stdout.isTTY && !process.env['NO_COLOR']
const pintar = (codigo: number) => (t: string) => (ativo ? `\x1b[${codigo}m${t}\x1b[0m` : t)

export const cor = {
  verde: pintar(32),
  ambar: pintar(33),
  azul: pintar(34),
  vermelho: pintar(31),
  cinza: pintar(90),
  negrito: pintar(1),
}

const STATUS = {
  resolvido: cor.verde('resolvido'),
  revisar: cor.ambar('revisar'),
  falta_informacao: cor.azul('falta informação'),
} as const

export const linhaResultado = (r: Resultado, detalhado = false): string => {
  const codigo = r.classificacao
    ? `${r.classificacao.cst} ${r.classificacao.cClassTrib}`
    : '--- ------'
  const reducao = r.classificacao?.reducaoCbs ? cor.cinza(` −${r.classificacao.reducaoCbs}%`) : ''
  const cabeca = `${cor.negrito(codigo)}${reducao}  ${formatarNcm(r.item.ncm)}  ${r.item.descricao}  ${STATUS[r.status]}`
  if (!detalhado) return cabeca
  const linhas = [cabeca]
  if (r.fundamento)
    linhas.push(`  ${r.fundamento.dispositivo}`, cor.cinza(`  "${r.fundamento.texto}"`))
  for (const a of r.alertas)
    linhas.push(
      `  ${a.gravidade === 'bloqueio' ? cor.vermelho('!') : cor.ambar('·')} ${a.mensagem}`,
    )
  for (const p of r.perguntas) {
    linhas.push(`  ${cor.azul('?')} ${p.texto}`)
    for (const o of p.opcoes) linhas.push(cor.cinza(`      ${o.cClassTrib}  ${o.rotulo}`))
  }
  linhas.push(
    cor.cinza(
      `  validação oficial: ${r.validacaoOficial} · ${r.tabela.versao} · confiança ${r.confianca} · camada ${r.camada}`,
    ),
  )
  for (const t of r.trilha) linhas.push(cor.cinza(`    ${t}`))
  return linhas.join('\n')
}
