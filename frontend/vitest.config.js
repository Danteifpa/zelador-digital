import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Testes automáticos (npm test). Separado do vite.config.js para não carregar o plugin do PWA.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true
  }
})
