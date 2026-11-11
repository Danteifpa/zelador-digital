// Funções puras do Painel de Gestão: priorização GUT, distâncias, datas e protocolo.
import { estaResolvido, etapaDoEstado, normalizarEstado } from './status'

export const RAIO_RECURRENCIA_METROS = 500
export const CENTRO_ANANINDEUA = [-1.365, -48.375]

export function eResolvida(item) {
  return estaResolvido(item.status)
}

export function distanciaMetros(a, b) {
  if ([a.latitude, a.longitude, b.latitude, b.longitude].some((value) => typeof value !== 'number')) return Infinity
  const raioTerra = 6371000
  const latitudeA = (a.latitude * Math.PI) / 180
  const latitudeB = (b.latitude * Math.PI) / 180
  const deltaLatitude = ((b.latitude - a.latitude) * Math.PI) / 180
  const deltaLongitude = ((b.longitude - a.longitude) * Math.PI) / 180
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2
  return 2 * raioTerra * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function formatarData(data, incluirHora = false) {
  if (!data) return 'Não informado'
  return new Date(data).toLocaleString('pt-BR', incluirHora ? undefined : { dateStyle: 'short' })
}

export function escapeCsv(valor) {
  return `"${String(valor ?? '').replaceAll('"', '""')}"`
}

export function categoriaGravidade(categoria = '') {
  const normalizada = categoria.toLowerCase()
  if (normalizada.includes('esgoto') || normalizada.includes('saneamento') || normalizada.includes('hospitalar') || normalizada.includes('acumulado')) return 5
  if (normalizada.includes('buraco') || normalizada.includes('via')) return 4
  if (normalizada.includes('ilumin')) return 3
  return 2
}

export function urgenciaPorData(createdAt, status, agora = new Date()) {
  if (normalizarEstado(status) !== 'pendente' || !createdAt) return 3
  const idadeDias = Math.max(0, agora.getTime() - new Date(createdAt).getTime()) / 86400000
  if (idadeDias > 7) return 5
  if (idadeDias >= 3) return 4
  return 3
}

export function tendenciaPorContexto(item, recorrente, dataAtual = new Date()) {
  // 3 ou mais vizinhos confirmaram o problema ("Também vi"): tendência máxima.
  if ((Number(item?.total_apoios) || 0) >= 3) return 5
  const mes = dataAtual.getMonth() + 1
  const periodoChuvoso = mes >= 12 || mes <= 5
  return recorrente || periodoChuvoso ? 4 : 3
}

export function calcularPontuacaoGUT(item, ocorrencias = [], agora = new Date()) {
  const recorrente = ocorrencias.some((outro) => outro.id !== item.id && distanciaMetros(item, outro) <= RAIO_RECURRENCIA_METROS)
  const gravidade = categoriaGravidade(item.categoria)
  const urgencia = urgenciaPorData(item.created_at, item.status, agora)
  const tendencia = tendenciaPorContexto(item, recorrente, agora)
  return {
    gravidade,
    urgencia,
    tendencia,
    pontuacao: gravidade * urgencia * tendencia,
    recorrente
  }
}

export function corCriticidade(pontuacao) {
  if (pontuacao >= 60) return '#ef4444'
  if (pontuacao >= 30) return '#f59e0b'
  return '#22c55e'
}

export function rotuloCriticidade(pontuacao) {
  if (pontuacao >= 60) return 'Crítica (GUT Alta)'
  if (pontuacao >= 30) return 'Atenção (GUT Média)'
  return 'Rotina (GUT Baixa)'
}

export function protocoloCivico(id) {
  return `Protocolo ZD-${String(id).slice(0, 6).toUpperCase()}`
}

export function etapaStatus(item) {
  return etapaDoEstado(item.status)
}

export function dispararAvisoAtualizacao(titulo, corpo) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([20, 30, 20])
  }
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(titulo, { body: corpo })
  }
}
