import fs from 'fs'
import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** Copy index.html → 404.html so GitHub Pages serves the SPA on deep links. */
function spaFallback() {
  return {
    name: 'spa-github-pages-fallback',
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist')
      const index = path.join(dist, 'index.html')
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, path.join(dist, '404.html'))
      }
    },
  }
}

export default defineConfig({
  // Set VITE_BASE_PATH=/shadi-prabandhak/ in GitHub Actions for project Pages.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), spaFallback()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
