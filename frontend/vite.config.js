import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        short_name: 'Zelador Digital',
        name: 'Zelador Digital - Monitoramento Comunitário',
        icons: [
          {
            src: '/favicon.svg',
            type: 'image/svg+xml',
            sizes: '192x192 512x512',
            purpose: 'any maskable'
          }
        ],
        start_url: '/',
        background_color: '#ffffff',
        theme_color: '#2563eb',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/'
      }
    })
  ]
})