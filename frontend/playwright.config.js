import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

// Testes de ponta a ponta: o app de produção (build) falando com um Supabase local
// descartável (supabase start no CI). Rodar: npm run build && npx playwright test
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ...devices['Pixel 7'],
    geolocation: { latitude: -1.365, longitude: -48.39 },
    permissions: ['geolocation'],
    locale: 'pt-BR',
    serviceWorkers: 'block',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'celular', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
})
