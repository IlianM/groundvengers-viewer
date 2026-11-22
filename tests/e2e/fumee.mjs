// Test de fumée : chaque vue s'ouvre sans erreur et dessine quelque chose, et les fonctions principales répondent.
// Usage : npm run build && npm run test:e2e   (CHROME_PATH=/usr/bin/google-chrome si Chromium de Playwright n'est pas installé)
import { PNG } from 'pngjs'
import { demarrerServeur, lancerNavigateur, URL_BASE, attendre } from './outils.mjs'

const VUES = ['architecture', 'domotique', 'cyber', 'ia', 'donnees', 'occupant', 'risques']
const echecs = []
const verifie = (ok, msg) => { console.log(`${ok ? '  ok ' : ' ÉCHEC'} ${msg}`); if (!ok) echecs.push(msg) }

/** Part de pixels qui diffèrent du pixel central : une scène vide ou noire donne presque 0. */
function variete(buffer) {
  const png = PNG.sync.read(buffer)
  const ref = (png.width * Math.floor(png.height / 2) + Math.floor(png.width / 2)) * 4
  let diff = 0
  for (let i = 0; i < png.data.length; i += 4 * 7) {
    if (Math.abs(png.data[i] - png.data[ref]) + Math.abs(png.data[i + 1] - png.data[ref + 1]) + Math.abs(png.data[i + 2] - png.data[ref + 2]) > 30) diff++
  }
  return diff / (png.data.length / 28)
}

const serveur = await demarrerServeur()
const nav = await lancerNavigateur()
try {
  const ctx = await nav.newContext({ viewport: { width: 1500, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const erreurs = []
  const nouvellePage = async () => {
    const p = await ctx.newPage()
    p.on('pageerror', (e) => erreurs.push(`pageerror : ${e.message}`))
    p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) erreurs.push(`console : ${m.text()}`) })
    return p
  }
  let page

  console.log('Vues')
  for (const vue of VUES) {
    page = await nouvellePage()
    await page.goto(`${URL_BASE}?debug#vue=${vue}`)
    await attendre(2200)
    const v = variete(await page.locator('.viewer').screenshot())
    verifie((await page.locator('canvas').count()) === 1, `${vue} : un canvas 3D`)
    verifie(v > 0.02, `${vue} : la scène n'est pas vide (${(v * 100).toFixed(0)} % de pixels différents)`)
    verifie((await page.locator('.panneau.gauche h2').innerText()).length > 0, `${vue} : panneau de gauche rempli`)
    verifie((await page.locator('.bandeau-bas .indicateur').count()) >= 6, `${vue} : indicateurs du bandeau`)
    await page.close()
  }

  console.log('Fonctions')
  page = await nouvellePage()
  await page.goto(`${URL_BASE}?debug#vue=occupant&sim=1&h=8`); await attendre(2000)
  await page.click('.outils-camera >> text="Comparer"'); await attendre(1800)
  verifie((await page.locator('canvas').count()) === 2, 'comparaison : deux vues 3D')
  verifie((await page.locator('.duo-bandeau').count()) === 2, 'comparaison : deux bandeaux de chiffres')
  await page.click('.outils-camera >> text="Comparer"'); await attendre(800)
  verifie((await page.locator('canvas').count()) === 1, 'comparaison : retour à une seule vue')

  await page.click('.interrupteur'); await attendre(300)
  verifie((await page.locator('.interrupteur span').innerText()) === 'Minimum vital', 'bascule Minimum vital')
  await page.click('.interrupteur')

  await page.click('.bouton-options'); await attendre(300)
  verifie((await page.locator('.tiroir-options').count()) > 0, 'menu Options')
  await page.click('.tiroir-onglets >> text="Configuration"')
  await page.click('text="Copier le lien"'); await attendre(300)
  const lien = await page.evaluate('navigator.clipboard.readText()')
  verifie(lien.startsWith(URL_BASE), 'lien de configuration copié')
  await page.keyboard.press('Escape')

  await page.evaluate("window.__gv.useEtat.getState().setSelection(null)")
  const cle = await page.evaluate("window.__gv.registre.occupants.find((o) => o.tache === 'bureau').cle")
  await page.evaluate((c) => window.__gv.useEtat.getState().setSelection('pers:' + c), cle)
  await attendre(800)
  verifie((await page.locator('.fiche-personne').count()) === 1, 'fiche d’une personne')

  await page.click('.bouton-visite'); await attendre(500)
  const total = Number((await page.locator('.visite-tete span').innerText()).split('/')[1])
  verifie(total >= 20, `visite guidée : ${total} étapes`)
  await page.click('.visite-nav >> text="❚❚ Pause"')
  for (let k = 0; k < Math.min(total - 1, 8); k++) { await page.click('.visite-nav >> text="Suivant →"'); await attendre(900) }
  verifie((await page.locator('.visite h3').innerText()).length > 0, 'visite guidée : avance étape par étape')
  await page.keyboard.press('Escape'); await attendre(500)
  verifie((await page.locator('.visite').count()) === 0, 'visite guidée : Échap quitte')

  console.log('Erreurs de la page')
  verifie(erreurs.length === 0, `aucune erreur JavaScript${erreurs.length ? ' : ' + erreurs.slice(0, 3).join(' | ') : ''}`)
} finally {
  await nav.close()
  serveur.kill()
}
if (echecs.length) { console.error(`\n${echecs.length} échec(s)`); process.exit(1) }
console.log('\nTest de fumée : tout passe.')
