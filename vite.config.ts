import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Surfaced in the footer's "last updated" line. Hard-coding that date in
  // the locale files meant it silently went stale between releases.
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          // react-markdown / remark-gfm only serve the AI chat page. In this shared
          // chunk they were preloaded on every page; without them they travel with
          // the chat page's own lazy chunk instead.
          'vendor-ui': ['lucide-react'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-others': ['axios'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})