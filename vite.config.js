import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const isGitHubPages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  root: '.',
  base: isGitHubPages ? '/skylove/' : '/',
  publicDir: 'public',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
