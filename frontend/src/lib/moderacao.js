// Moderação comunitária: limite de registros e denúncia de fotos.
//
// O servidor faz o trabalho pesado (migração 20261114_moderacao.sql):
//   * recusa mais de 8 registros por hora / 20 por dia vindos da mesma conexão;
//   * aceita uma denúncia por celular e por ocorrência e oculta a foto com 3 denúncias.
// Aqui guardamos só o que este celular já denunciou, para não oferecer o botão de novo.

import { supabase } from './supabase'
import { idDoDispositivo } from './apoios'

const CHAVE_DENUNCIADOS = 'zelador_denuncias'

export const DENUNCIAS_PARA_OCULTAR = 3

export const MENSAGEM_LIMITE_REGISTROS =
  'Muitos registros seguidos desta conexão. Para evitar abusos, aguarde um pouco antes de registrar de novo.'

/** O banco recusou o registro porque esta conexão passou do limite. */
export function ehLimiteDeRegistros(erro) {
  const texto = typeof erro === 'string' ? erro : `${erro?.message || ''} ${erro?.details || ''}`
  return /LIMITE_REGISTROS/.test(texto)
}

export const MOTIVOS_DENUNCIA = [
  { valor: 'foto_impropria', rotulo: 'Foto imprópria ou ofensiva' },
  { valor: 'pessoa_ou_placa', rotulo: 'Mostra rosto de pessoa ou placa de carro' },
  { valor: 'falso_ou_repetido', rotulo: 'Registro falso ou repetido' }
]

export const MENSAGENS_DENUNCIA = {
  denunciado: 'Obrigado. A denúncia foi enviada para a gestão revisar.',
  oculta: 'Obrigado. A foto foi ocultada até a gestão revisar.',
  repetido: 'Você já denunciou este registro neste celular.',
  limite: 'Muitas denúncias seguidas desta conexão. Tente novamente mais tarde.',
  offline: 'Sem internet: conecte-se para enviar a denúncia.',
  erro: 'Não foi possível enviar a denúncia agora. Tente novamente.'
}

function lerDenunciados() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE_DENUNCIADOS) || '[]')
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

function marcarDenunciado(ocorrenciaId) {
  try {
    localStorage.setItem(CHAVE_DENUNCIADOS, JSON.stringify([...new Set([...lerDenunciados(), ocorrenciaId])].slice(-500)))
  } catch {
    /* sem espaço: não é crítico */
  }
}

export const jaDenunciei = (ocorrenciaId) => lerDenunciados().includes(ocorrenciaId)

/**
 * @returns {Promise<{ denunciado: boolean, oculta?: boolean, motivo?: 'repetido'|'limite' }>}
 */
export async function denunciarOcorrencia(ocorrenciaId, motivo) {
  const { data, error } = await supabase.rpc('denunciar_ocorrencia', {
    p_ocorrencia_id: ocorrenciaId,
    p_dispositivo_id: idDoDispositivo(),
    p_motivo: motivo
  })
  if (error) throw error
  if (data?.denunciado || data?.motivo === 'repetido') marcarDenunciado(ocorrenciaId)
  return data
}

export function mensagemDaDenuncia(resultado) {
  if (resultado?.denunciado) return resultado.oculta ? MENSAGENS_DENUNCIA.oculta : MENSAGENS_DENUNCIA.denunciado
  return MENSAGENS_DENUNCIA[resultado?.motivo] || MENSAGENS_DENUNCIA.erro
}

/** Ocorrências que o Painel deve mostrar no filtro "Denunciados". */
export const estaDenunciada = (item) => Boolean(item?.foto_oculta) || Number(item?.total_denuncias) > 0

/** Caminho do arquivo no bucket a partir do URL público (null se não for do bucket). */
export function caminhoNoStorage(url, bucket = 'ocorrencias') {
  if (!url) return null
  const marcador = `/storage/v1/object/public/${bucket}/`
  const posicao = url.indexOf(marcador)
  if (posicao === -1) return null
  return decodeURIComponent(url.slice(posicao + marcador.length).split('?')[0]) || null
}
