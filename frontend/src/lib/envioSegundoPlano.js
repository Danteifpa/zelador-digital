// Envio em segundo plano da fila offline (Background Sync).
// O service worker (public/sync-sw.js) faz o envio quando a rede volta, mesmo com o app fechado.
// Onde não há suporte (iPhone/Safari), nada muda: o app envia a fila quando é aberto.

import { gravarCache } from './armazenamento'
import { supabaseUrl, supabaseAnonKey } from './supabase'

export const ETIQUETA_SYNC = 'enviar-fila-offline'
const CHAVE_CONFIG = 'config-envio'

export function suportaEnvioEmSegundoPlano() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window
}

/**
 * Pede ao navegador para enviar a fila quando houver rede.
 * @returns {Promise<boolean>} true se o pedido foi aceito.
 */
export async function pedirEnvioEmSegundoPlano() {
  if (!suportaEnvioEmSegundoPlano()) return false
  try {
    // O service worker não lê variáveis do Vite: guarda o endereço e a chave pública no IndexedDB.
    await gravarCache(CHAVE_CONFIG, { url: supabaseUrl, chave: supabaseAnonKey })
    const registro = await navigator.serviceWorker.ready
    await registro.sync.register(ETIQUETA_SYNC)
    return true
  } catch (erro) {
    console.warn('Envio em segundo plano indisponível:', erro)
    return false
  }
}

/** Avisa quando o service worker enviou registros da fila (app aberto). */
export function aoEnviarEmSegundoPlano(callback) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {}
  const ouvir = (evento) => {
    if (evento.data?.tipo === 'fila-enviada' && Array.isArray(evento.data.ids)) callback(evento.data.ids)
  }
  navigator.serviceWorker.addEventListener('message', ouvir)
  return () => navigator.serviceWorker.removeEventListener('message', ouvir)
}
