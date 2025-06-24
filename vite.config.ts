import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  server: {
    host: '0.0.0.0',
    https: {
      key: fs.readFileSync('./localhost+4-key.pem'),
      cert: fs.readFileSync('./localhost+4.pem'),
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts', 'src/**/*.spec.ts', 'tests/**/*.test.ts', 'src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
