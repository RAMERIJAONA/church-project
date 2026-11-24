import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const alias = {
  '@shared': resolve('src/shared'),
  '@main': resolve('src/main'),
  '@renderer': resolve('src/renderer/src')
}

export default defineConfig({
  main: {
    resolve: { alias: { '@shared': alias['@shared'], '@main': alias['@main'] } },
    build: {
      // Stack traces lisibles dans les logs terrain (CLAUDE.md par. 8)
      sourcemap: true
    }
  },
  preload: {
    resolve: { alias: { '@shared': alias['@shared'] } },
    build: {
      sourcemap: true,
      // Preload sandboxé : un seul bundle CJS, aucune dépendance externe (doc electron-vite,
      // "Dependency Handling" : externalisation à désactiver pour le sandbox).
      externalizeDeps: false
    }
  },
  renderer: {
    resolve: { alias: { '@renderer': alias['@renderer'], '@shared': alias['@shared'] } },
    plugins: [react(), tailwindcss()]
  }
})
