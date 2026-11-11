// Armazenamento local em IndexedDB (sem dependências).
//
// Porquê IndexedDB e não localStorage: guarda as fotos como Blob (sem converter para base64),
// a quota é de centenas de MB em vez de ≈5 MB, e as escritas não bloqueiam a interface.

const NOME_BD = 'zelador-digital'
const VERSAO_BD = 1
export const LOJA_FILA = 'fila'
export const LOJA_CACHE = 'cache'

let ligacao = null

export function abrirBD() {
  if (ligacao) return ligacao
  ligacao = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível neste navegador.'))
      return
    }
    const pedido = indexedDB.open(NOME_BD, VERSAO_BD)
    pedido.onupgradeneeded = () => {
      const bd = pedido.result
      if (!bd.objectStoreNames.contains(LOJA_FILA)) bd.createObjectStore(LOJA_FILA, { keyPath: 'id' })
      if (!bd.objectStoreNames.contains(LOJA_CACHE)) bd.createObjectStore(LOJA_CACHE)
    }
    pedido.onsuccess = () => {
      const bd = pedido.result
      // Outra aba com versão nova pede para atualizar: fecha para não a bloquear.
      bd.onversionchange = () => {
        bd.close()
        ligacao = null
      }
      resolve(bd)
    }
    pedido.onerror = () => {
      ligacao = null
      reject(pedido.error)
    }
  })
  return ligacao
}

// Executa `operacao(loja)` numa transação e resolve quando ela termina (com o valor do último pedido).
export async function transacao(nomeLoja, modo, operacao) {
  const bd = await abrirBD()
  return new Promise((resolve, reject) => {
    const tx = bd.transaction(nomeLoja, modo)
    let resultado
    const pedido = operacao(tx.objectStore(nomeLoja))
    if (pedido) pedido.onsuccess = () => { resultado = pedido.result }
    tx.oncomplete = () => resolve(resultado)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new DOMException('Transação abortada', 'AbortError'))
  })
}

export const lerCache = (chave) => transacao(LOJA_CACHE, 'readonly', (loja) => loja.get(chave))
export const gravarCache = (chave, valor) => transacao(LOJA_CACHE, 'readwrite', (loja) => loja.put(valor, chave))

// Pede ao navegador para não apagar estes dados quando faltar espaço (sem efeito se recusar).
export async function pedirArmazenamentoPersistente() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
      await navigator.storage.persist?.()
    }
  } catch {
    /* sem suporte */
  }
}
