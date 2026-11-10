// Fila de ocorrências registadas sem rede, guardada no localStorage.
//
// Todas as operações leem a fila guardada no momento (nunca uma cópia antiga em memória),
// para que um registo guardado durante uma sincronização não seja apagado por ela.

export const FILA_OFFLINE_KEY = 'fila_ocorrencias_offline'
const CHAVE_ANTIGA = 'zelador_fila_offline'
const CHAVE_BACKUP = 'fila_ocorrencias_offline_corrompida'

export class FilaCheiaError extends Error {
  constructor() {
    super('A memória do telemóvel para registos offline está cheia. Ligue-se à internet e sincronize os registos pendentes antes de guardar mais.')
    this.name = 'FilaCheiaError'
  }
}

function eQuotaExcedida(erro) {
  return erro instanceof DOMException && (erro.name === 'QuotaExceededError' || erro.code === 22 || erro.code === 1014)
}

export function lerFila() {
  let bruto = null
  try {
    bruto = localStorage.getItem(FILA_OFFLINE_KEY)
    if (bruto === null) {
      // Migração da chave usada em versões anteriores.
      bruto = localStorage.getItem(CHAVE_ANTIGA)
      if (bruto !== null) {
        localStorage.setItem(FILA_OFFLINE_KEY, bruto)
        localStorage.removeItem(CHAVE_ANTIGA)
      }
    }
    if (!bruto) return []
    const fila = JSON.parse(bruto)
    return Array.isArray(fila) ? fila : []
  } catch (erro) {
    // Conteúdo ilegível: guarda uma cópia para recuperação manual e segue com a fila vazia.
    console.warn('Fila offline ilegível; foi guardada uma cópia em', CHAVE_BACKUP, erro)
    try {
      if (bruto) localStorage.setItem(CHAVE_BACKUP, bruto)
    } catch {
      /* sem espaço para a cópia */
    }
    return []
  }
}

export function guardarFila(fila) {
  try {
    localStorage.setItem(FILA_OFFLINE_KEY, JSON.stringify(fila))
  } catch (erro) {
    if (eQuotaExcedida(erro)) throw new FilaCheiaError()
    throw erro
  }
  return fila
}

export function adicionarAFila(item) {
  return guardarFila([...lerFila(), item])
}

export function atualizarItemNaFila(id, alteracoes) {
  return guardarFila(lerFila().map((item) => (item.id === id ? { ...item, ...alteracoes } : item)))
}

export function removerDaFila(ids) {
  const remover = new Set(ids)
  return guardarFila(lerFila().filter((item) => !remover.has(item.id)))
}
