// Prazos de atendimento por órgão (SLA): calcula se o chamado está no prazo, perto de
// vencer ou atrasado. Sem rede: fácil de testar.

import { orgaoDoChamado, prazoDoOrgao } from './orgaos'
import { normalizarEstado } from './status'

const DIA_MS = 86_400_000
export const DIAS_ALERTA = 2 // "vence logo" quando faltam 2 dias ou menos

/**
 * Situação do prazo de um chamado.
 * estado: 'no_prazo' | 'vence_logo' | 'atrasado' | 'resolvido_no_prazo' | 'resolvido_com_atraso' | 'sem_data'
 */
export function situacaoDoPrazo(item, agora = new Date()) {
  const prazoDias = prazoDoOrgao(orgaoDoChamado(item))
  const criado = Date.parse(item?.created_at)
  if (Number.isNaN(criado)) return { estado: 'sem_data', prazoDias, diasRestantes: null, diasAtraso: 0 }
  const vence = criado + prazoDias * DIA_MS

  if (normalizarEstado(item.status) === 'resolvido') {
    const resolvido = Date.parse(item.resolvido_em || item.updated_at)
    const atrasou = !Number.isNaN(resolvido) && resolvido > vence
    return {
      estado: atrasou ? 'resolvido_com_atraso' : 'resolvido_no_prazo',
      prazoDias,
      diasRestantes: null,
      diasAtraso: atrasou ? Math.ceil((resolvido - vence) / DIA_MS) : 0
    }
  }

  const restante = (vence - agora.getTime()) / DIA_MS
  if (restante < 0) return { estado: 'atrasado', prazoDias, diasRestantes: 0, diasAtraso: Math.ceil(-restante) }
  return {
    estado: restante <= DIAS_ALERTA ? 'vence_logo' : 'no_prazo',
    prazoDias,
    diasRestantes: Math.floor(restante),
    diasAtraso: 0
  }
}

export const estaAtrasado = (item, agora) => situacaoDoPrazo(item, agora).estado === 'atrasado'

/** Texto curto para a etiqueta do chamado; null quando não vale mostrar. */
export function rotuloDoPrazo(situacao) {
  switch (situacao.estado) {
    case 'atrasado':
      return situacao.diasAtraso === 1 ? 'Atrasado 1 dia' : `Atrasado ${situacao.diasAtraso} dias`
    case 'vence_logo':
      return situacao.diasRestantes === 0 ? 'Vence hoje' : `Vence em ${situacao.diasRestantes} dia${situacao.diasRestantes === 1 ? '' : 's'}`
    case 'resolvido_com_atraso':
      return 'Resolvido fora do prazo'
    default:
      return null
  }
}

/** Resumo para o alerta do painel: atrasados e perto de vencer. */
export function resumoDosPrazos(lista, agora = new Date()) {
  let atrasados = 0
  let venceLogo = 0
  for (const item of lista) {
    const { estado } = situacaoDoPrazo(item, agora)
    if (estado === 'atrasado') atrasados += 1
    else if (estado === 'vence_logo') venceLogo += 1
  }
  return { atrasados, venceLogo }
}
