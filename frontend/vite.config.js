import { readFileSync } from 'node:fs'
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { marcaDe } from './src/lib/marca.js'

// Marca da prefeitura (src/lib/marca.js): preenche o index.html e gera o manifest.json
// a partir de manifest.base.json, com o nome e a cidade do deploy.
function pluginMarca(marca) {
  const manifest = () => {
    const base = JSON.parse(readFileSync(new URL('./manifest.base.json', import.meta.url), 'utf-8'))
    return JSON.stringify({
      ...base,
      name: marca.nome,
      short_name: marca.nomeCurto,
      description: `Registre problemas da sua rua em ${marca.cidade} em 1 minuto: lixo, buracos, postes apagados e mais. Gratuito e sem cadastro.`
    }, null, 2)
  }
  return {
    name: 'marca-da-prefeitura',
    transformIndexHtml: (html) => html.replaceAll('%MARCA_NOME%', marca.nome).replaceAll('%MARCA_CIDADE%', marca.cidade),
    configureServer(server) {
      server.middlewares.use('/manifest.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(manifest())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.json', source: manifest() })
    }
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    pluginMarca(marcaDe(loadEnv(mode, process.cwd(), 'VITE_'))),
    VitePWA({
      // 'prompt': o app avisa "Há uma versão nova" e o utilizador escolhe quando atualizar
      // (src/components/AvisoAtualizacao.jsx), em vez de trocar de versão a meio de um registo.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: false, // manifest.json gerado por pluginMarca a partir de manifest.base.json
      workbox: {
        cleanupOutdatedCaches: true,
        // Avisos push (public/push-sw.js) e envio da fila offline em segundo plano (public/sync-sw.js)
        importScripts: ['push-sw.js', 'sync-sw.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        // Detector de rostos (~1,5 MB): não vai na instalação; baixa no primeiro uso e fica guardado.
        globIgnores: ['**/face-api*.js', 'modelos/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/modelos/') || /\/assets\/face-api[^/]*\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'detector-rostos',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Cache para os blocos de mapa (CartoDB Positron / Voyager / OpenStreetMap)
            urlPattern: /^https:\/\/[a-c]\.basemaps\.cartocdn\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cartodb-tiles-cache',
              expiration: {
                maxEntries: 600,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles-cache',
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache para fotos de ocorrências do Supabase Storage
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 dias
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
}))
