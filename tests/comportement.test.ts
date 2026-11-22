import { describe, it, expect } from 'vitest'
import { cibleDe, LIBELLE_POSE, type Pose } from '../src/scene/personnage/comportement'

const poses = Object.keys(LIBELLE_POSE) as Pose[]
const temps = Array.from({ length: 80 }, (_, i) => i * 0.37)

describe('postures des personnages', () => {
  it('toutes les poses ont un libellé lisible', () => {
    for (const p of poses) expect(LIBELLE_POSE[p].length).toBeGreaterThan(3)
  })

  it('les angles restent finis et bornés', () => {
    for (const p of poses) for (const t of temps) {
      for (const v of Object.values(cibleDe(p, t))) { expect(Number.isFinite(v)).toBe(true); expect(Math.abs(v)).toBeLessThan(3.2) }
    }
  })

  // Régression : des bras tendus levés vers l'avant ou sur le côté ressemblaient à un salut. Un bras très levé doit être plié,
  // sauf l'étirement, où les deux bras montent en V symétrique au-dessus de la tête.
  it('aucune pose ne lève un bras tendu', () => {
    for (const p of poses) for (const t of temps) {
      const c = cibleDe(p, t)
      const bras = [{ x: c.gx, z: c.gz, e: c.ge }, { x: c.dx, z: c.dz, e: c.de }]
      const etirement = p === 'etire' && Math.abs(c.gz + c.dz) < 0.35
      for (const b of bras) {
        const levee = Math.hypot(b.x, b.z)
        if (levee > 0.9 && !etirement) expect(Math.abs(b.e), `${p} à ${t}`).toBeGreaterThan(0.6)
      }
    }
  })

  it('un bras jamais tendu droit vers l’avant, quelle que soit la pose', () => {
    for (const p of poses) for (const t of temps) {
      const c = cibleDe(p, t)
      for (const [x, e] of [[c.gx, c.ge], [c.dx, c.de]]) expect(x < -0.8 && Math.abs(e) < 0.4, `${p} à ${t}`).toBe(false)
    }
  })
})
