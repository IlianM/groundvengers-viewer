import { describe, it, expect } from 'vitest'
import { donnees } from '../src/data'
import { parcoursDonnee } from '../src/parcours'
import { etapeCoupee } from '../src/scenario'

describe('chemin de la donnée', () => {
  it('chaque capteur et compteur mène à un serveur', () => {
    for (const e of donnees.equipements.filter((x) => ['capteur', 'compteur'].includes(x.categorie))) {
      const p = parcoursDonnee(e.id)
      expect(p.length, e.id).toBeGreaterThan(1)
      expect(p[0].equipement.id).toBe(e.id)
      expect(p[p.length - 1].equipement.categorie, e.id).toBe('serveur')
    }
  })

  it('chaque étape est reliée à la précédente par un lien existant', () => {
    for (const e of donnees.equipements.filter((x) => x.categorie === 'capteur').slice(0, 8)) {
      const p = parcoursDonnee(e.id)
      p.slice(1).forEach((et, i) => {
        expect(et.via, `${e.id} étape ${i + 1}`).toBeDefined()
        const a = p[i].equipement.id, b = et.equipement.id
        expect(et.via!.de === a || et.via!.vers.includes(a) || et.via!.de === b || et.via!.vers.includes(b)).toBe(true)
      })
    }
  })

  it('un identifiant inconnu ne donne aucun chemin', () => {
    expect(parcoursDonnee('N-EXISTE-PAS')).toEqual([])
  })
})

describe('scénarios d’intrusion', () => {
  it('sans minimum vital, aucune étape n’est coupée', () => {
    for (const sc of donnees.scenarios) expect(etapeCoupee(sc, false)).toBeNull()
  })

  it('le minimum vital ne coupe que des étapes qui existent', () => {
    for (const sc of donnees.scenarios) {
      const c = etapeCoupee(sc, true)
      if (c) { expect(c.index).toBeGreaterThanOrEqual(0); expect(c.index).toBeLessThan(sc.etapes.length); expect(donnees.equipements.some((e) => e.nom === c.equipement)).toBe(true) }
    }
  })
})
