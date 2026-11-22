// Outils communs aux tests de bout en bout : serveur de prévisualisation du build et navigateur sans carte graphique.
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'

export const PORT = 4179
export const URL_BASE = `http://localhost:${PORT}/`

export async function demarrerServeur() {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(URL_BASE)).ok) return proc } catch { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  proc.kill()
  throw new Error('Le serveur de prévisualisation ne répond pas : lancez d’abord « npm run build ».')
}

/** CHROME_PATH permet d'utiliser un Chrome déjà installé ; sinon Chromium de Playwright (npx playwright install chromium). */
export const lancerNavigateur = () => chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox'],
})

export const attendre = (ms) => new Promise((r) => setTimeout(r, ms))
