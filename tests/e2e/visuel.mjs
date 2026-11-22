// Captures de référence : compare chaque vue à une image enregistrée, pour repérer un changement visuel involontaire.
// Les images dépendent du moteur de rendu : elles se régénèrent sur la machine qui les compare (npm run test:visuel -- --maj)
// et ne sont pas vérifiées en CI.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { demarrerServeur, lancerNavigateur, URL_BASE, attendre } from './outils.mjs'

const DOSSIER = new URL('../references/', import.meta.url).pathname
const maj = process.argv.includes('--maj')
const SEUIL_PIXELS = 0.004 // part de pixels qui peuvent différer (anti-crénelage)
// animations coupées et 20 personnes : la scène est la même à chaque prise
const CONFIG = { theme: 'clair', deco: {}, reglages: { animations: false, rotationAuto: false, effectifForce: 20 } }
const VUES = [['architecture', ''], ['domotique', '&niveau=R1'], ['cyber', ''], ['ia', ''], ['donnees', ''], ['occupant', '&sim=1&h=8'], ['risques', ''], ['comparaison', '&vue=occupant&cmp=1&sim=1&h=8']]

mkdirSync(DOSSIER, { recursive: true })
const serveur = await demarrerServeur()
const nav = await lancerNavigateur()
let ecarts = 0
try {
  const ctx = await nav.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 })
  await ctx.addInitScript((c) => localStorage.setItem('gv-options-v1', JSON.stringify(c)), CONFIG)
  for (const [nom, extra] of VUES) {
    const hash = nom === 'comparaison' ? extra.replace(/^&/, '') : `vue=${nom}${extra}`
    const page = await ctx.newPage() // une page neuve par vue : aucun état d'une vue précédente ne peut fuiter
    await page.goto(`${URL_BASE}#${hash}`); await attendre(2500)
    const image = await page.locator('.viewer canvas').first().screenshot()
    await page.close()
    const fichier = `${DOSSIER}${nom}.png`
    if (maj || !existsSync(fichier)) { writeFileSync(fichier, image); console.log(`  référence ${maj ? 'mise à jour' : 'créée'} : ${nom}`); continue }
    const a = PNG.sync.read(readFileSync(fichier)), b = PNG.sync.read(image)
    if (a.width !== b.width || a.height !== b.height) { console.log(` ÉCART ${nom} : dimensions différentes`); ecarts++; continue }
    const diff = new PNG({ width: a.width, height: a.height })
    const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.12 })
    const part = n / (a.width * a.height)
    const ok = part <= SEUIL_PIXELS
    console.log(`  ${ok ? 'ok ' : 'ÉCART'} ${nom} : ${(part * 100).toFixed(2)} % de pixels différents`)
    if (!ok) { ecarts++; writeFileSync(`${DOSSIER}${nom}.ecart.png`, PNG.sync.write(diff)); writeFileSync(`${DOSSIER}${nom}.actuel.png`, image) }
  }
} finally {
  await nav.close()
  serveur.kill()
}
if (ecarts) { console.error(`\n${ecarts} vue(s) ont changé. Les différences sont dans tests/references/*.ecart.png (et l'image obtenue dans *.actuel.png) ; si c'est voulu : npm run test:visuel -- --maj`); process.exit(1) }
console.log('\nCaptures de référence : aucune différence.')
