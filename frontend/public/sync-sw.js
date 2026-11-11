// Envio em segundo plano (Background Sync) dos registros feitos sem internet.
// Carregado dentro do service worker gerado pelo Workbox (vite.config.js → workbox.importScripts).
//
// O app guarda cada registro offline no IndexedDB (src/lib/filaOffline.js) e pede ao navegador
// um "sync" com a etiqueta abaixo. Quando a rede volta, o navegador acorda este service worker,
// mesmo com o app fechado, e ele envia a fila: foto para o Storage e registro para a tabela.
// Se algo falhar, o evento termina com erro e o navegador tenta de novo mais tarde.
// Suporte: Chrome/Edge/Samsung Internet no Android e no computador. No iPhone (Safari) não há
// Background Sync, e o app continua a enviar a fila quando é aberto, como antes.

const ETIQUETA_SYNC = 'enviar-fila-offline'
const NOME_BD = 'zelador-digital'
const VERSAO_BD = 1
const LOJA_FILA = 'fila'
const LOJA_CACHE = 'cache'
const CHAVE_CONFIG = 'config-envio' // { url, chave } gravada pelo app (src/lib/envioSegundoPlano.js)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function abrirBD() {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(NOME_BD, VERSAO_BD)
    pedido.onupgradeneeded = () => {
      const bd = pedido.result
      if (!bd.objectStoreNames.contains(LOJA_FILA)) bd.createObjectStore(LOJA_FILA, { keyPath: 'id' })
      if (!bd.objectStoreNames.contains(LOJA_CACHE)) bd.createObjectStore(LOJA_CACHE)
    }
    pedido.onsuccess = () => resolve(pedido.result)
    pedido.onerror = () => reject(pedido.error)
  })
}

function naLoja(bd, nomeLoja, modo, operacao) {
  return new Promise((resolve, reject) => {
    const tx = bd.transaction(nomeLoja, modo)
    let resultado
    const pedido = operacao(tx.objectStore(nomeLoja))
    if (pedido) pedido.onsuccess = () => { resultado = pedido.result }
    tx.oncomplete = () => resolve(resultado)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function cabecalhos(config, extras = {}) {
  // Igual ao supabase-js: chave pública no apikey e como Bearer.
  return { apikey: config.chave, Authorization: `Bearer ${config.chave}`, ...extras }
}

async function enviarFoto(config, foto) {
  const extensao = foto.type === 'image/webp' ? 'webp' : 'jpg'
  const caminho = `ocorrencias/${Date.now()}_offline_${Math.random().toString(36).slice(2, 7)}.${extensao}`
  const resposta = await fetch(`${config.url}/storage/v1/object/ocorrencias/${caminho}`, {
    method: 'POST',
    headers: cabecalhos(config, { 'Content-Type': foto.type || 'image/jpeg', 'x-upsert': 'false' }),
    body: foto
  })
  if (!resposta.ok) throw new Error(`Falha ao enviar a foto (${resposta.status})`)
  return `${config.url}/storage/v1/object/public/ocorrencias/${caminho}`
}

async function inserirRegistro(config, item, fotoUrl) {
  const resposta = await fetch(`${config.url}/rest/v1/ocorrencias`, {
    method: 'POST',
    headers: cabecalhos(config, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({
      ...(UUID.test(item.id) ? { id: item.id } : {}),
      categoria: item.categoria,
      descricao: item.descricao,
      foto_url: fotoUrl,
      localizacao: `POINT(${item.longitude} ${item.latitude})`,
      status: 'pendente'
    })
  })
  if (resposta.ok) return
  // 23505 = já existe: este registro chegou ao servidor numa tentativa anterior.
  const erro = await resposta.json().catch(() => ({}))
  if (erro.code === '23505') return
  throw new Error(`Falha ao gravar o registro (${resposta.status} ${erro.code || ''})`)
}

async function enviarFila() {
  // App aberto na tela: ele mesmo envia a fila (e mostra o progresso). Evita envio em dobro.
  const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  if (janelas.some((janela) => janela.visibilityState === 'visible')) {
    janelas.forEach((janela) => janela.postMessage({ tipo: 'enviar-fila' }))
    return
  }

  const bd = await abrirBD()
  try {
    const config = await naLoja(bd, LOJA_CACHE, 'readonly', (loja) => loja.get(CHAVE_CONFIG))
    if (!config?.url || !config?.chave) return // o app ainda não gravou a configuração
    const fila = (await naLoja(bd, LOJA_FILA, 'readonly', (loja) => loja.getAll())) || []
    if (fila.length === 0) return

    const enviados = []
    let falhas = 0
    for (const item of fila) {
      try {
        let fotoUrl = item.fotoUrl || null
        // A foto vai uma única vez: depois do upload fica só o endereço no item.
        if (!fotoUrl && item.foto) {
          fotoUrl = await enviarFoto(config, item.foto)
          await naLoja(bd, LOJA_FILA, 'readwrite', (loja) => loja.put({ ...item, fotoUrl, foto: null }))
        }
        await inserirRegistro(config, item, fotoUrl)
        await naLoja(bd, LOJA_FILA, 'readwrite', (loja) => loja.delete(item.id))
        enviados.push(item.id)
      } catch (erro) {
        falhas++
        console.warn('[envio em segundo plano] item ficou na fila:', item.id, erro)
      }
    }

    if (enviados.length > 0) await avisarEnvio(enviados)
    // Com erro, o navegador agenda nova tentativa (com espera crescente).
    if (falhas > 0) throw new Error(`${falhas} registro(s) ainda na fila`)
  } finally {
    bd.close()
  }
}

async function avisarEnvio(ids) {
  const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  // App aberto: ele atualiza a lista e ativa os avisos de protocolo pedidos sem rede.
  janelas.forEach((janela) => janela.postMessage({ tipo: 'fila-enviada', ids }))
  const visivel = janelas.some((janela) => janela.visibilityState === 'visible')
  if (visivel || self.Notification?.permission !== 'granted') return
  // App fechado: confirma ao morador que o registro chegou.
  await self.registration.showNotification('Registro enviado', {
    body:
      ids.length === 1
        ? 'Seu registro feito sem internet chegou à gestão comunitária.'
        : `${ids.length} registros feitos sem internet chegaram à gestão comunitária.`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'fila-enviada',
    lang: 'pt-BR',
    data: { url: ids.length === 1 ? `/?protocolo=ZD-${String(ids[0]).slice(0, 6).toUpperCase()}` : '/' }
  })
}

self.addEventListener('sync', (evento) => {
  if (evento.tag === ETIQUETA_SYNC) evento.waitUntil(enviarFila())
})
