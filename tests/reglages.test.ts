import { describe, it, expect } from 'vitest'
import { Reglages, REGLAGES_DEFAUT, lireConfig, FORMAT_CONFIG } from '../src/reglages'

describe('réglages de personnalisation', () => {
  it('les personnages sont à 20 par défaut', () => {
    expect(REGLAGES_DEFAUT.effectifForce).toBe(20)
  })

  it('ramènent à la borne une valeur hors limites, et au défaut une valeur invalide', () => {
    const r = Reglages.parse({ fov: 500, tailleTexte: -3, qualite: 'ultra', accent: 'rouge', effectifForce: 9999, vitesseClavier: 'vite' })
    expect(r.fov).toBe(80)
    expect(r.tailleTexte).toBe(80)
    expect(r.qualite).toBe(REGLAGES_DEFAUT.qualite)
    expect(r.accent).toBeNull()
    expect(r.effectifForce).toBe(300)
    expect(r.vitesseClavier).toBe(REGLAGES_DEFAUT.vitesseClavier)
  })

  it('null pour le nombre de personnes veut dire « simulation »', () => {
    expect(Reglages.parse({ effectifForce: null }).effectifForce).toBeNull()
  })

  it('ne se laissent pas polluer par des clés inconnues', () => {
    const r = Reglages.parse({ __proto__: { x: 1 }, inconnu: 1 }) as Record<string, unknown>
    expect('inconnu' in r).toBe(false)
    expect(({} as Record<string, unknown>).x).toBeUndefined()
  })

  it('une configuration exportée se relit à l’identique', () => {
    const texte = JSON.stringify({ format: FORMAT_CONFIG, version: 1, theme: 'sombre', deco: { herbe: false }, reglages: { ...REGLAGES_DEFAUT, fov: 60, effectifForce: 35 } })
    const lu = lireConfig(texte)
    expect(lu.ok).toBe(true)
    if (lu.ok) {
      expect(lu.config.reglages.fov).toBe(60)
      expect(lu.config.reglages.effectifForce).toBe(35)
      expect(lu.config.theme).toBe('sombre')
      expect(lu.config.deco.herbe).toBe(false)
      expect(lu.config.deco.arbres).toBe(true)
    }
  })

  it('refuse un fichier qui n’est pas une configuration', () => {
    expect(lireConfig('pas du json').ok).toBe(false)
    expect(lireConfig('{"format":"autre"}').ok).toBe(false)
  })

  it('signale les réglages inconnus sans planter', () => {
    const lu = lireConfig(JSON.stringify({ format: FORMAT_CONFIG, version: 1, reglages: { nouveauReglage: 1 } }))
    expect(lu.ok && lu.ignores).toEqual(['nouveauReglage'])
  })
})
