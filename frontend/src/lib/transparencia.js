// Cálculos e exportações da página de Transparência (sem acesso à rede: fácil de testar).

import { escapeCsv } from './gestao'
import { rotuloDaCategoria } from './categorias'
import { rotuloDoEstado } from './status'

const numero = (valor) => (valor === null || valor === undefined || valor === '' ? null : Number(valor))

/** Totais da cidade a partir das linhas de transparencia_bairros. */
export function resumirTransparencia(bairros) {
  let abertos = 0
  let resolvidos = 0
  let abertosMais30 = 0
  let somaDias = 0
  for (const b of bairros) {
    abertos += b.abertos || 0
    resolvidos += b.resolvidos || 0
    abertosMais30 += b.abertos_mais_30_dias || 0
    const dias = numero(b.dias_medios_resolucao)
    if (dias !== null) somaDias += dias * (b.resolvidos || 0)
  }
  return { abertos, resolvidos, abertosMais30, diasMedios: resolvidos ? somaDias / resolvidos : null }
}

export function ordenarBairros(bairros, ordem) {
  const lista = [...bairros]
  const nome = (a, b) => a.bairro.localeCompare(b.bairro, 'pt-BR')
  if (ordem === 'nome') return lista.sort(nome)
  if (ordem === 'espera') return lista.sort((a, b) => (b.abertos_mais_30_dias || 0) - (a.abertos_mais_30_dias || 0) || nome(a, b))
  if (ordem === 'tempo') {
    const dias = (b) => numero(b.dias_medios_resolucao) ?? Infinity
    return lista.sort((a, b) => dias(b) - dias(a) || nome(a, b))
  }
  return lista.sort((a, b) => (b.abertos || 0) - (a.abertos || 0) || (b.total || 0) - (a.total || 0) || nome(a, b))
}

export function formatarDias(dias) {
  const valor = numero(dias)
  if (valor === null || Number.isNaN(valor)) return '—'
  if (valor < 1) return 'menos de 1 dia'
  const arredondado = Math.round(valor)
  return arredondado === 1 ? '1 dia' : `${arredondado} dias`
}

const COLUNAS = ['protocolo', 'categoria', 'tipo', 'status', 'situacao', 'bairro', 'latitude', 'longitude', 'registrado_em', 'resolvido_em', 'apoios']

export function dadosAbertosParaCsv(linhas) {
  const corpo = linhas.map((l) =>
    [l.protocolo, l.categoria, rotuloDaCategoria(l.categoria), l.status, rotuloDoEstado(l.status), l.bairro ?? '', l.latitude, l.longitude, l.registrado_em, l.resolvido_em ?? '', l.apoios ?? 0]
      .map(escapeCsv)
      .join(',')
  )
  // BOM para o Excel abrir os acentos corretamente.
  return `\uFEFF${COLUNAS.join(',')}\n${corpo.join('\n')}\n`
}

export function dadosAbertosParaGeoJson(linhas) {
  return {
    type: 'FeatureCollection',
    features: linhas
      .filter((l) => Number.isFinite(Number(l.latitude)) && Number.isFinite(Number(l.longitude)))
      .map((l) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(l.longitude), Number(l.latitude)] },
        properties: {
          protocolo: l.protocolo,
          categoria: l.categoria,
          tipo: rotuloDaCategoria(l.categoria),
          status: l.status,
          bairro: l.bairro ?? null,
          registrado_em: l.registrado_em,
          resolvido_em: l.resolvido_em ?? null,
          apoios: l.apoios ?? 0
        }
      }))
  }
}

export function baixarArquivo(conteudo, nome, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
