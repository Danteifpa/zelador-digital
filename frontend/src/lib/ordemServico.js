// Ordem de serviço para a equipe de campo: número, roteiro e texto para WhatsApp.
// Sem rede: fácil de testar.

import { rotuloDaCategoria } from './categorias'
import { protocoloCivico } from './gestao'
import { nomeDoOrgao, orgaoDoChamado } from './orgaos'
import { rotuloDoPrazo, situacaoDoPrazo } from './prazos'

export const MAXIMO_POR_ORDEM = 30

/** Número da ordem: OS-AAAAMMDD-HHMM (dá para achar pela data). */
export function numeroDaOrdem(data = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `OS-${data.getFullYear()}${p(data.getMonth() + 1)}${p(data.getDate())}-${p(data.getHours())}${p(data.getMinutes())}`
}

/** Link de rota no mapa para um ponto. */
export function linkDoMapa(item) {
  const vazio = (v) => v === null || v === undefined || v === ''
  if (vazio(item?.latitude) || vazio(item?.longitude)) return null
  const lat = Number(item.latitude)
  const lng = Number(item.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`
}

/** Itens da ordem: os mais urgentes (atrasados e maior GUT) primeiro. */
export function itensDaOrdem(lista, agora = new Date()) {
  const peso = (item) => (situacaoDoPrazo(item, agora).estado === 'atrasado' ? 1000 : 0) + (item.gut?.pontuacao ?? 0)
  return [...lista].sort((a, b) => peso(b) - peso(a)).slice(0, MAXIMO_POR_ORDEM)
}

/** Texto da ordem para mandar no WhatsApp da equipe. */
export function textoDaOrdem(itens, { numero, equipe = '', agora = new Date() } = {}) {
  const linhas = itens.map((item, i) => {
    const prazo = rotuloDoPrazo(situacaoDoPrazo(item, agora))
    const mapa = linkDoMapa(item)
    return [
      `${i + 1}. ${rotuloDaCategoria(item.categoria)} · ${protocoloCivico(item.id)}${prazo ? ` · ${prazo}` : ''}`,
      `   ${item.bairro || 'Bairro não identificado'} · ${nomeDoOrgao(orgaoDoChamado(item))}`,
      item.descricao ? `   "${String(item.descricao).slice(0, 120)}"` : null,
      mapa ? `   Rota: ${mapa}` : null
    ].filter(Boolean).join('\n')
  })
  return [
    `📋 Ordem de serviço ${numero}`,
    equipe ? `Equipe: ${equipe}` : null,
    `${itens.length} chamado(s), do mais urgente para o menos urgente.`,
    '',
    ...linhas,
    '',
    'Ao terminar cada um, mande a foto do depois para o gestor marcar como resolvido.'
  ].filter((l) => l !== null).join('\n')
}
