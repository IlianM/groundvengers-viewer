import { describe, it, expect } from 'vitest'
import { chargerDonnees, donnees } from '../src/data'
import { VUES } from '../src/views'
import { ETAPES } from '../src/visite'

describe('données du projet', () => {
  it('respectent le schéma, sans identifiant orphelin', () => {
    const { erreurs } = chargerDonnees()
    expect(erreurs).toEqual([])
  })

  it('chaque équipement est dans un niveau et une zone qui existent', () => {
    for (const e of donnees.equipements) {
      expect(donnees.batiment.niveaux.some((n) => n.id === e.niveau), e.id).toBe(true)
      if (e.zone) expect(donnees.zoneParId.has(e.zone), `${e.id} → ${e.zone}`).toBe(true)
    }
  })

  it('les zones tiennent dans l’emprise et sur un niveau connu', () => {
    const [W, D] = donnees.batiment.emprise
    for (const z of donnees.batiment.zones) {
      const [x, y, w, d] = z.rect
      expect(x + w, z.id).toBeLessThanOrEqual(W + 1e-6)
      expect(y + d, z.id).toBeLessThanOrEqual(D + 1e-6)
      expect(donnees.batiment.niveaux.some((n) => n.id === z.niveau), z.id).toBe(true)
    }
  })

  it('les scènes de présentation visent des vues existantes', () => {
    for (const s of donnees.scenes) expect(VUES.some((v) => v.id === s.vue), s.titre).toBe(true)
  })

  it('chaque preuve citée par un équipement existe', () => {
    for (const e of donnees.equipements) for (const p of e.preuves) expect(donnees.preuveParId?.has?.(p) ?? true, `${e.id} → ${p}`).toBe(true)
  })
})

describe('visite guidée', () => {
  it('chaque étape a un titre et un texte, et vise une vue existante', () => {
    expect(ETAPES.length).toBeGreaterThan(20)
    for (const e of ETAPES) {
      expect(e.titre.length, e.titre).toBeGreaterThan(2)
      expect(e.texte.length, e.titre).toBeGreaterThan(40)
      if (e.base?.vue) expect(VUES.some((v) => v.id === e.base!.vue), e.titre).toBe(true)
      if (e.base?.niveau) expect(donnees.batiment.niveaux.some((n) => n.id === e.base!.niveau), e.titre).toBe(true)
    }
  })

  it('les données qu’elle utilise existent (scénario, zones)', () => {
    expect(donnees.scenarios.some((s) => s.id === 'SCN-WIFI')).toBe(true)
    expect(donnees.batiment.zones.some((z) => z.type === 'open_space' && !z.amenagement)).toBe(true)
    expect(donnees.equipements.some((e) => e.categorie === 'capteur' && e.donnee.minimum_vital)).toBe(true)
  })
})
