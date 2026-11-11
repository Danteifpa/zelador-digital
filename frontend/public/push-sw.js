// Avisos push do Zelador Digital.
// Carregado dentro do service worker gerado pelo Workbox (vite.config.js → workbox.importScripts).

self.addEventListener('push', (evento) => {
  let dados = {}
  try {
    dados = evento.data ? evento.data.json() : {}
  } catch {
    dados = { titulo: 'Zelador Digital', corpo: evento.data ? evento.data.text() : '' }
  }

  evento.waitUntil(
    self.registration.showNotification(dados.titulo || 'Zelador Digital', {
      body: dados.corpo || 'Há uma atualização no seu protocolo.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: dados.tag, // um aviso por protocolo: o mais recente substitui o anterior
      renotify: Boolean(dados.tag),
      lang: 'pt-BR',
      data: { url: dados.url || '/' }
    })
  )
})

// Tocar no aviso abre o app no protocolo (reutiliza uma janela já aberta, se houver).
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const destino = new URL(evento.notification.data?.url || '/', self.location.origin).href

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (janela.url.startsWith(self.location.origin) && 'focus' in janela) {
          return janela.navigate(destino).then((j) => (j || janela).focus())
        }
      }
      return self.clients.openWindow(destino)
    })
  )
})
