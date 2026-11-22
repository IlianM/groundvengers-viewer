import { describe, it, expect } from 'vitest'
import { donnees } from '../src/data'
import { tauxOccupation, effectifSimule, effectifsZones, capaciteTotale, identifiableA, temperatureZone, formatHeure } from '../src/simulation'
import { zoneNonAnonyme } from '../src/views'

const zones = donnees.batiment.zones
const heures = Array.from({ length: 48 }, (_, i) => i / 2)

describe('simulation d’une journée', () => {
  it('le taux d’occupation reste entre 0 et 1, et le bâtiment est vide la nuit', () => {
    for (const z of zones) for (const h of heures) {
      const t = tauxOccupation(z, h)
      expect(t).toBeGreaterThanOrEqual(0); expect(t).toBeLessThanOrEqual(1)
    }
    for (const z of zones) expect(effectifSimule(z, 3)).toBe(0)
  })

  it('l’effectif simulé ne dépasse jamais la capacité de la zone', () => {
    for (const z of zones) for (const h of heures) expect(effectifSimule(z, h)).toBeLessThanOrEqual(z.effectif_max)
  })

  it('est déterministe : même heure, mêmes effectifs', () => {
    expect([...effectifsZones(10.25, null)]).toEqual([...effectifsZones(10.25, null)])
  })

  it('le nombre de personnes imposé est respecté, plafonné par zone et par bâtiment', () => {
    for (const force of [0, 1, 7, 20, 57, 114, 500]) for (const h of [2, 8, 12.5, 17]) {
      const m = effectifsZones(h, force)
      const total = [...m.values()].reduce((a, b) => a + b, 0)
      expect(total, `force ${force} à ${h} h`).toBe(Math.min(force, capaciteTotale()))
      for (const z of zones) expect(m.get(z.id)!, z.id).toBeLessThanOrEqual(z.effectif_max)
    }
  })

  it('aucune personne n’est placée dans une zone sans capacité (locaux techniques)', () => {
    const m = effectifsZones(10, 114)
    for (const z of zones.filter((x) => x.effectif_max === 0)) expect(m.get(z.id)).toBe(0)
  })

  it('formate l’heure', () => {
    expect(formatHeure(8.5)).toBe('08:30')
    expect(formatHeure(17.75)).toBe('17:45')
  })

  it('la température simulée reste plausible', () => {
    for (const z of zones) for (const h of heures) {
      const T = temperatureZone(z, h, effectifSimule(z, h))
      expect(T).toBeGreaterThan(14); expect(T).toBeLessThan(30)
    }
  })
})

describe('règle d’anonymat', () => {
  it('une zone sans personne n’est jamais identifiable', () => {
    for (const z of zones) expect(identifiableA(z, 0, 5, false)).toBe(false)
  })

  it('le minimum vital ne rend jamais identifiable une zone qui ne l’était pas', () => {
    for (const z of zones) for (const seuil of [2, 5, 10]) {
      if (zoneNonAnonyme(z, seuil, true)) expect(zoneNonAnonyme(z, seuil, false), z.id).toBe(true)
    }
  })

  it('un seuil plus élevé signale au moins autant de zones', () => {
    const nb = (s: number) => zones.filter((z) => zoneNonAnonyme(z, s, false)).length
    expect(nb(10)).toBeGreaterThanOrEqual(nb(5)); expect(nb(5)).toBeGreaterThanOrEqual(nb(2))
  })
})
