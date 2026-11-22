import { describe, it, expect } from 'vitest'
import { etage, arretOuvert, arretApres, cycle, niveauEtape, DWELL, TOUR, DEC_CABINE } from '../src/scene/personnage/ascenseur'

describe('horaire des cabines', () => {
  it('la cabine passe par tous les niveaux et revient', () => {
    expect(Array.from({ length: cycle(3) }, (_, k) => niveauEtape(k, 3))).toEqual([0, 1, 2, 1])
  })

  it('la position est continue : jamais de saut de plus d’un demi-étage entre deux images', () => {
    for (const dec of [0, DEC_CABINE]) {
      let prec = etage(0, 3, dec).i
      for (let t = 0.05; t < 120; t += 0.05) {
        const i = etage(t, 3, dec).i
        expect(Math.abs(i - prec)).toBeLessThan(0.5)
        prec = i
      }
    }
  })

  it('les portes ne sont ouvertes qu’à l’arrêt, à un étage entier', () => {
    for (let t = 0; t < 120; t += 0.1) {
      const { i, porte } = etage(t, 3, 0)
      if (porte > 0) expect(Math.abs(i - Math.round(i))).toBeLessThan(1e-9)
    }
  })

  it('on embarque toujours porte ouverte, depuis n’importe quel instant', () => {
    for (const dec of [0, DEC_CABINE]) for (const idx of [0, 1, 2]) for (let depuis = 0; depuis < 80; depuis += 0.7) {
      const t = arretOuvert(idx, 3, dec, depuis)
      expect(t + DWELL - 1.2).toBeGreaterThanOrEqual(depuis - 1e-9) // au moins 1,2 s avant la fermeture
      const e = etage(t + DWELL / 2, 3, dec)
      expect(Math.abs(e.i - idx)).toBeLessThan(1e-9)
      expect(e.porte).toBeGreaterThan(0.9)
    }
  })

  it('l’arrivée demandée a bien lieu après l’instant donné, au bon étage', () => {
    for (const idx of [0, 1, 2]) {
      const t = arretApres(idx, 3, 0, 33)
      expect(t).toBeGreaterThanOrEqual(33 - 1e-6)
      expect(t).toBeLessThan(33 + cycle(3) * TOUR)
      expect(Math.abs(etage(t + DWELL / 2, 3, 0).i - idx)).toBeLessThan(1e-9)
    }
  })
})
