// Questionário de usabilidade SUS (System Usability Scale), adaptado para o app.
// Itens ímpares são positivos e itens pares negativos, como no original.

import { supabase } from './supabase'
import { version as VERSAO_APP } from '../../package.json'

export const AFIRMACOES_SUS = [
  'Eu gostaria de usar este app com frequência.',
  'Achei o app mais complicado do que precisava ser.',
  'Achei o app fácil de usar.',
  'Eu precisaria da ajuda de alguém que entende de tecnologia para usar o app.',
  'As partes do app funcionam bem juntas.',
  'O app tem muitas coisas que não combinam entre si.',
  'Imagino que a maioria das pessoas aprende a usar o app bem rápido.',
  'Achei o app confuso de usar.',
  'Eu me senti seguro(a) usando o app.',
  'Precisei aprender muitas coisas antes de conseguir usar o app.'
]

export const ESCALA_SUS = [
  { valor: 1, rotulo: 'Discordo totalmente' },
  { valor: 2, rotulo: 'Discordo' },
  { valor: 3, rotulo: 'Neutro' },
  { valor: 4, rotulo: 'Concordo' },
  { valor: 5, rotulo: 'Concordo totalmente' }
]

/** Pontuação SUS de 0 a 100 (igual à função pontuacao_sus do banco). */
export function pontuacaoSus(respostas) {
  if (!Array.isArray(respostas) || respostas.length !== 10 || respostas.some((r) => !(r >= 1 && r <= 5))) return null
  const soma = respostas.reduce((total, r, i) => total + (i % 2 === 0 ? r - 1 : 5 - r), 0)
  return soma * 2.5
}

/** Leitura usual da pontuação (Bangor, Kortum e Miller, 2009). */
export function classificarSus(pontos) {
  if (pontos === null || pontos === undefined || Number.isNaN(Number(pontos))) return '—'
  const p = Number(pontos)
  if (p >= 85) return 'Excelente'
  if (p >= 72) return 'Boa'
  if (p >= 52) return 'Aceitável'
  if (p >= 38) return 'Fraca'
  return 'Ruim'
}

const CHAVE = 'zelador_pesquisa_sus'

/** Convida no máximo uma vez por aparelho; quem dispensou é convidado de novo após 30 dias. */
export function deveConvidarParaPesquisa(agora = Date.now()) {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null')
    if (!salvo) return true
    if (salvo.respondido) return false
    return agora - (salvo.dispensadoEm || 0) > 30 * 86400000
  } catch {
    return false
  }
}

export function marcarPesquisa(estado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado === 'respondido' ? { respondido: true } : { dispensadoEm: Date.now() }))
  } catch {
    /* sem espaço: não é crítico */
  }
}

export async function enviarPesquisaSus(respostas, comentario) {
  const { data, error } = await supabase.rpc('registrar_pesquisa_sus', {
    p_respostas: respostas,
    p_comentario: comentario?.trim() || null,
    p_versao: VERSAO_APP
  })
  if (error) throw error
  return data
}
