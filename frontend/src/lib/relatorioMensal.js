// Relatório mensal: números do mês por órgão e por bairro. Sem rede: fácil de testar.

import { RAIO_RECURRENCIA_METROS, distanciaMetros } from './gestao'
import { ORGAOS, orgaoDoChamado } from './orgaos'
import { situacaoDoPrazo } from './prazos'
import { normalizarEstado } from './status'

const DIA_MS = 86_400_000
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export const nomeDoMes = (ano, mes) => `${MESES[mes]} de ${ano}`

function mediana(valores) {
  if (!valores.length) return null
  const v = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(v.length / 2)
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2
}

const dentroDoMes = (data, ano, mes) => {
  const d = new Date(data)
  return !Number.isNaN(d.getTime()) && d.getFullYear() === ano && d.getMonth() === mes
}

function contar(lista, agora) {
  const resolvidos = lista.filter((i) => normalizarEstado(i.status) === 'resolvido')
  const dias = resolvidos
    .map((i) => (Date.parse(i.resolvido_em || i.updated_at) - Date.parse(i.created_at)) / DIA_MS)
    .filter((d) => Number.isFinite(d) && d >= 0)
  const noPrazo = resolvidos.filter((i) => situacaoDoPrazo(i, agora).estado === 'resolvido_no_prazo').length
  return {
    registrados: lista.length,
    resolvidos: resolvidos.length,
    abertos: lista.length - resolvidos.length,
    atrasados: lista.filter((i) => situacaoDoPrazo(i, agora).estado === 'atrasado').length,
    taxaResolucao: lista.length ? (resolvidos.length / lista.length) * 100 : null,
    noPrazo: resolvidos.length ? (noPrazo / resolvidos.length) * 100 : null,
    medianaDias: mediana(dias)
  }
}

/**
 * Relatório dos chamados registrados no mês (mes: 0 = janeiro).
 * "Resolvidos no mês" conta os resolvidos no mês, registrados em qualquer data.
 */
export function relatorioDoMes(ocorrencias, ano, mes, agora = new Date()) {
  const doMes = ocorrencias.filter((i) => dentroDoMes(i.created_at, ano, mes))
  const resolvidosNoMes = ocorrencias.filter((i) => normalizarEstado(i.status) === 'resolvido' && dentroDoMes(i.resolvido_em || i.updated_at, ano, mes)).length

  const comPonto = doMes.filter((i) => Number.isFinite(Number(i.latitude)) && Number.isFinite(Number(i.longitude)) && i.latitude !== null && i.longitude !== null)
  const recorrentes = comPonto.filter((item, k) => comPonto.some((outro, j) => j !== k && distanciaMetros(item, outro) <= RAIO_RECURRENCIA_METROS)).length

  const porOrgao = ORGAOS
    .map((o) => ({ orgao: o.id, nome: o.nome, ...contar(doMes.filter((i) => orgaoDoChamado(i) === o.id), agora) }))
    .filter((o) => o.registrados > 0)

  const nomesBairros = [...new Set(doMes.map((i) => i.bairro || 'Bairro não identificado'))]
  const porBairro = nomesBairros
    .map((bairro) => ({ bairro, ...contar(doMes.filter((i) => (i.bairro || 'Bairro não identificado') === bairro), agora) }))
    .sort((a, b) => b.registrados - a.registrados || a.bairro.localeCompare(b.bairro, 'pt-BR'))

  return {
    titulo: nomeDoMes(ano, mes),
    geral: { ...contar(doMes, agora), resolvidosNoMes, reincidencia: comPonto.length ? (recorrentes / comPonto.length) * 100 : null },
    porOrgao,
    porBairro
  }
}

/** Meses com registros, do mais recente para o mais antigo: [{ ano, mes }]. */
export function mesesDisponiveis(ocorrencias) {
  const chaves = new Set()
  for (const i of ocorrencias) {
    const d = new Date(i.created_at)
    if (!Number.isNaN(d.getTime())) chaves.add(d.getFullYear() * 12 + d.getMonth())
  }
  return [...chaves].sort((a, b) => b - a).map((k) => ({ ano: Math.floor(k / 12), mes: k % 12 }))
}
