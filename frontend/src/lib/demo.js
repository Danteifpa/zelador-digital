// Modo demonstração do Painel de Gestão: dados fictícios e alterações só na memória.
// Nada aqui fala com o banco. Serve para mostrar o painel em reuniões, sem login.

import { orgaoDaCategoria } from './orgaos'
import { MARCA } from './marca'

const BAIRROS = ['Icuí-Guajará', 'Águas Lindas', 'Paar', 'Centro', 'Guanabara', 'Cidade Nova', 'Coqueiro', 'Heliolândia', 'Maguari-Cajuí', 'Geraldo Palmeira']
// Peso maior = mais chamados naquele bairro (periferias com mais demanda).
const PESO_BAIRRO = [5, 5, 4, 3, 2, 3, 3, 3, 2, 2]

const MODELOS = [
  ['esgoto', 'Esgoto a céu aberto em frente às casas'],
  ['esgoto', 'Vazamento de esgoto perto da escola'],
  ['alagamento', 'Rua alaga toda vez que chove'],
  ['alagamento', 'Bueiro entupido, água parada'],
  ['buraco', 'Buraco grande no meio da rua'],
  ['buraco', 'Asfalto cedendo perto da parada de ônibus'],
  ['lixo', 'Entulho jogado na calçada'],
  ['lixo', 'Lixo acumulado no terreno baldio'],
  ['iluminacao', 'Poste apagado há uma semana'],
  ['iluminacao', 'Três postes apagados na mesma rua'],
  ['arvore', 'Galho grande ameaçando cair na fiação'],
  ['calcada', 'Calçada quebrada, cadeirante não passa'],
  ['sinalizacao', 'Placa de pare caída']
]

/** Gerador de números pseudoaleatórios com semente (mesmos dados a cada abertura). */
function sorteador(semente) {
  let s = semente >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function escolherComPeso(sortear, itens, pesos) {
  const total = pesos.reduce((a, b) => a + b, 0)
  let r = sortear() * total
  for (let i = 0; i < itens.length; i++) {
    r -= pesos[i]
    if (r <= 0) return itens[i]
  }
  return itens[itens.length - 1]
}

const DIA_MS = 86_400_000

/** Chamados fictícios dos últimos 60 dias, em volta do centro da cidade da marca. */
export function gerarChamadosDemo({ quantidade = 48, agora = new Date(), semente = 2026 } = {}) {
  const sortear = sorteador(semente)
  const lista = []
  for (let i = 0; i < quantidade; i++) {
    const [categoria, descricao] = MODELOS[Math.floor(sortear() * MODELOS.length)]
    const bairro = escolherComPeso(sortear, BAIRROS, PESO_BAIRRO)
    const idadeDias = Math.floor(sortear() * 60)
    const criado = new Date(agora.getTime() - idadeDias * DIA_MS - Math.floor(sortear() * 12) * 3_600_000)
    const r = sortear()
    // Chamados mais antigos têm mais chance de já estarem resolvidos.
    const status = idadeDias > 7 && r < 0.45 ? 'resolvido' : r < 0.7 ? 'pendente' : 'em_analise'
    const resolvido = status === 'resolvido'
      ? new Date(criado.getTime() + (1 + Math.floor(sortear() * Math.max(1, idadeDias - 1))) * DIA_MS)
      : null
    const hex = Math.floor(sortear() * 0xffffff).toString(16).padStart(6, '0')
    lista.push({
      id: `${hex}-demo-${String(i).padStart(3, '0')}`,
      categoria,
      descricao,
      status,
      bairro,
      orgao: orgaoDaCategoria(categoria),
      created_at: criado.toISOString(),
      updated_at: (resolvido || criado).toISOString(),
      resolvido_em: resolvido ? resolvido.toISOString() : null,
      latitude: MARCA.latitude + (sortear() - 0.5) * 0.06,
      longitude: MARCA.longitude + (sortear() - 0.5) * 0.06,
      total_apoios: Math.floor(sortear() * sortear() * 6),
      total_denuncias: 0,
      foto_url: null,
      foto_resolucao: null,
      observacoes: null
    })
  }
  return lista.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/**
 * Aplica uma alteração num chamado da demonstração, imitando as regras do banco:
 * resolvido_em ao resolver, órgão seguindo a categoria e foto do depois.
 */
export function aplicarAlteracaoDemo(lista, id, campos, agora = new Date()) {
  return lista.map((item) => {
    if (item.id !== id) return item
    const novo = { ...item, ...campos, updated_at: agora.toISOString() }
    if ('foto_resolucao_url' in campos) {
      novo.foto_resolucao = campos.foto_resolucao_url
      delete novo.foto_resolucao_url
    }
    if (campos.categoria && campos.categoria !== item.categoria && !('orgao' in campos)) {
      novo.orgao = orgaoDaCategoria(campos.categoria)
    }
    if (novo.status === 'resolvido' && item.status !== 'resolvido') novo.resolvido_em = agora.toISOString()
    if (novo.status !== 'resolvido') novo.resolvido_em = null
    return novo
  })
}
