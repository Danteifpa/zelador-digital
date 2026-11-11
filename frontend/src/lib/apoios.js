// "Também vi este problema": apoio de um morador a uma ocorrência já registrada.
//
// O servidor (função apoiar_ocorrencia) garante um apoio por celular e por ocorrência e
// limita apoios em massa vindos da mesma conexão. Aqui guardamos só o id do celular
// e a lista do que este celular já apoiou, para mostrar "Você confirmou".

import { supabase } from './supabase'
import { ehUuid, gerarIdOcorrencia } from './protocolo'

const CHAVE_DISPOSITIVO = 'zelador_dispositivo_id'
const CHAVE_APOIADOS = 'zelador_apoios'

export function idDoDispositivo() {
  let id = null
  try {
    id = localStorage.getItem(CHAVE_DISPOSITIVO)
    if (!ehUuid(id)) {
      id = gerarIdOcorrencia()
      localStorage.setItem(CHAVE_DISPOSITIVO, id)
    }
  } catch {
    id = id && ehUuid(id) ? id : gerarIdOcorrencia()
  }
  return id
}

function lerApoiados() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE_APOIADOS) || '[]')
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

function marcarApoiado(ocorrenciaId) {
  try {
    localStorage.setItem(CHAVE_APOIADOS, JSON.stringify([...new Set([...lerApoiados(), ocorrenciaId])].slice(-500)))
  } catch {
    /* sem espaço: não é crítico */
  }
}

export const jaApoiei = (ocorrenciaId) => lerApoiados().includes(ocorrenciaId)

/**
 * @returns {Promise<{ apoiado: boolean, total: number, motivo?: 'repetido'|'resolvida'|'limite' }>}
 */
export async function apoiarOcorrencia(ocorrenciaId) {
  const { data, error } = await supabase.rpc('apoiar_ocorrencia', {
    p_ocorrencia_id: ocorrenciaId,
    p_dispositivo_id: idDoDispositivo()
  })
  if (error) throw error
  if (data?.apoiado || data?.motivo === 'repetido') marcarApoiado(ocorrenciaId)
  return data
}

export function textoConfirmacoes(total) {
  const n = Number(total) || 0
  if (n <= 0) return null
  return n === 1 ? '1 vizinho confirmou' : `${n} vizinhos confirmaram`
}

export const MENSAGENS_APOIO = {
  apoiado: 'Obrigado! Seu apoio mostra à gestão que o problema afeta mais gente.',
  repetido: 'Você já confirmou este problema neste celular.',
  resolvida: 'Esta ocorrência já foi resolvida.',
  limite: 'Muitos apoios seguidos desta conexão. Tente novamente mais tarde.',
  offline: 'Sem internet: conecte-se para confirmar o problema.',
  erro: 'Não foi possível registrar seu apoio agora. Tente novamente.'
}
