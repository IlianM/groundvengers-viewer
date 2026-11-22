import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' : chemins relatifs, l'appli marche sur GitHub Pages quel que soit le nom du dépôt
export default defineConfig({
  plugins: [react()],
  base: './',
})
