import { describe, it, expect } from 'vitest'
import { donnees } from '../src/data'
import { genererSieges } from '../src/scene/Mobilier'
import { CLAIR } from '../src/scene/palette'
import { repartir } from '../src/scene/personnage/repartition'
import { planifierDeplacements, cagesInfo, destinationsDe } from '../src/scene/personnage/deplacements'
import { etatDe, type Occupant } from '../src/scene/personnage/comportement'
import { etage, DWELL } from '../src/scene/personnage/ascenseur'

const { sieges, voies } = genererSieges(CLAIR.meuble)
const effectifs = new Map(donnees.batiment.zones.map((z) => [z.id, z.effectif_max]))
const occupants = repartir(sieges, voies, effectifs)
planifierDeplacements(occupants, voies, sieges)
const voyageurs = occupants.filter((o) => o.deplacement)

describe('déplacements entre étages', () => {
  it('une partie des occupants d’open space change d’étage', () => {
    expect(voyageurs.length).toBeGreaterThan(5)
    for (const o of voyageurs) expect(['ZONE-R1-OPEN-A', 'ZONE-R2-OPEN-C', 'ZONE-R1-OPEN-B']).toContain(o.zone)
  })

  it('chaque cage mène au comptoir de la cafétéria et à un coin café d’un autre étage', () => {
    for (const c of cagesInfo()) {
      const d = destinationsDe(c, voies, sieges)
      expect(d.some((x) => x.nom.startsWith('comptoir'))).toBe(true)
      expect(new Set(d.map((x) => x.niveau)).size).toBeGreaterThan(1)
    }
  })

  it('les segments sont continus et couvrent toute la période', () => {
    for (const o of voyageurs) {
      const nv = o.deplacement!
      expect(nv.segs[0].t0).toBe(0)
      expect(nv.segs[nv.segs.length - 1].t1).toBeCloseTo(nv.periode, 6)
      nv.segs.forEach((s, i) => { if (i) expect(s.t0).toBeCloseTo(nv.segs[i - 1].t1, 6) })
    }
  })

  it('on ne monte et on ne descend que porte ouverte', () => {
    const cages = cagesInfo()
    for (const o of voyageurs) {
      const nv = o.deplacement!
      // cabine choisie : celle dont la porte est le point d'entrée dans le segment « cache »
      const cache = nv.segs.filter((s) => s.kind === 'cache')
      expect(cache.length).toBe(2)
      for (const s of cache) {
        const j = cages.findIndex((c) => Math.abs(c.x - s.pts[0][0]) < 1e-6)
        const c = cages[j]
        const n = c.niveaux.length
        // à l'instant d'entrée dans la cabine, elle est à cet étage, portes ouvertes ; à la sortie aussi (au niveau d'arrivée)
        const tEntree = s.t0 - nv.decalage
        const e = etage(tEntree, n, c.dec)
        expect(Math.abs(e.i - c.niveaux.indexOf(s.niveau))).toBeLessThan(0.01)
        expect(e.porte).toBeGreaterThan(0)
        expect(s.t1 - s.t0).toBeGreaterThan(DWELL * 0.5)
      }
    }
  })

  it('chaque voyageur revient exactement à son siège', () => {
    for (const o of voyageurs) {
      const nv = o.deplacement!
      const t0 = -nv.decalage + 0.01
      const debut = etatDe(o, t0)
      const fin = etatDe(o, t0 + nv.periode - 0.02)
      expect(debut.libre).toBeFalsy()
      expect(fin.libre).toBeFalsy()
      expect(Math.hypot(debut.x - fin.x, debut.z - fin.z)).toBeLessThan(1e-6)
    }
  })

  it('au cours de la période, le voyageur change bien de niveau', () => {
    const o = voyageurs[0]
    const niveaux = new Set<string>()
    for (let t = 0; t < o.deplacement!.periode; t += 0.5) {
      const e = etatDe(o, t - o.deplacement!.decalage)
      niveaux.add(e.niveau ?? o.niveau)
    }
    expect(niveaux.size).toBeGreaterThanOrEqual(2)
  })

  it('ne dépasse jamais l’emprise du bâtiment', () => {
    const [W, D] = donnees.batiment.emprise
    for (const o of voyageurs) {
      const nv = o.deplacement!
      for (let t = 0; t < nv.periode; t += 0.5) {
        const e = etatDe(o, t - nv.decalage)
        expect(e.x).toBeGreaterThan(-0.5); expect(e.x).toBeLessThan(W + 0.5)
        expect(e.z).toBeGreaterThan(-0.5); expect(e.z).toBeLessThan(D + 0.5)
      }
    }
  })

  it('les occupants sans déplacement ne sont pas touchés', () => {
    const autres: Occupant[] = occupants.filter((o) => !o.deplacement)
    expect(autres.length).toBeGreaterThan(0)
    for (const o of autres) expect(etatDe(o, 12.3).libre).toBeFalsy()
  })
})
