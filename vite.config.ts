import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base './' : chemins relatifs, l'appli marche sur GitHub Pages quel que soit le nom du dépôt
export default defineConfig({
  plugins: [react()],
  base: './',
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
})
