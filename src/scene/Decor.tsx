// Décor extérieur grossier : herbe, parvis, route, arbres, immeubles au loin.
// Tout est déterministe (même décor à chaque chargement) et s'active dans Options.
import { useMemo } from 'react'
import { donnees } from '../data'
import { useEtat } from '../store'
import { usePalette } from './palette'
import { Boites, type Boite } from './Boites'

const [W, D] = donnees.batiment.emprise
const ROUTE_Z = D / 2 + 14 // axe de la route, devant le bâtiment

function alea(graine: number) {
  let a = graine
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function Sol() {
  const herbe = useEtat((s) => s.deco.herbe)
  const couleurHerbe = useEtat((s) => s.reglages.couleurHerbe)
  const p = usePalette()
  const marquages = useMemo<Boite[]>(
    () => Array.from({ length: 25 }, (_, i) => ({ p: [-60 + i * 5, -0.215, ROUTE_Z], s: [2.4, 0.02, 0.18], c: p.marquage })),
    [p.marquage],
  )
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
        <circleGeometry args={[170, 64]} />
        <meshStandardMaterial color={herbe ? couleurHerbe ?? p.herbe : p.solNeutre} />
      </mesh>
      {herbe && (
        <>
          <mesh position={[0, -0.22, 0]}>{/* parvis autour du bâtiment */}
            <boxGeometry args={[W + 6, 0.06, D + 6]} />
            <meshStandardMaterial color={p.chemin} />
          </mesh>
          <mesh position={[0, -0.22, (D / 2 + 3 + ROUTE_Z - 3) / 2]}>{/* allée vers la route */}
            <boxGeometry args={[3, 0.06, ROUTE_Z - 3 - (D / 2 + 3)]} />
            <meshStandardMaterial color={p.chemin} />
          </mesh>
          <mesh position={[0, -0.24, ROUTE_Z]}>
            <boxGeometry args={[340, 0.04, 6]} />
            <meshStandardMaterial color={p.route} />
          </mesh>
          <Boites items={marquages} />
        </>
      )}
    </group>
  )
}

export function Arbres() {
  const actif = useEtat((s) => s.deco.arbres)
  const { densiteArbres, graineDecor } = useEtat((s) => s.reglages)
  const p = usePalette()
  const tous = useMemo(() => {
    const r = alea(graineDecor)
    const pts: { x: number; z: number; s: number; conifere: boolean; couleur: string }[] = []
    for (let essais = 0; pts.length < 64 && essais < 3000; essais++) {
      const a = r() * Math.PI * 2
      const dist = 16 + r() * 52
      const x = Math.cos(a) * dist
      const z = Math.sin(a) * dist
      if (Math.abs(x) < W / 2 + 5 && Math.abs(z) < D / 2 + 5) continue // pas sur le parvis
      if (Math.abs(z - ROUTE_Z) < 6) continue // pas sur la route
      if (Math.abs(x) < 3 && z > 0) continue // pas sur l'allée
      if (pts.some((q) => Math.hypot(q.x - x, q.z - z) < 4)) continue
      pts.push({ x, z, s: 0.8 + r() * 0.7, conifere: r() < 0.4, couleur: p.feuillage[Math.floor(r() * p.feuillage.length)] })
    }
    return pts
  }, [p.feuillage, graineDecor])
  const arbres = useMemo(() => tous.slice(0, Math.round((tous.length * densiteArbres) / 100)), [tous, densiteArbres])
  const troncs = useMemo<Boite[]>(
    () => arbres.map((t) => {
      const h = (t.conifere ? 1.2 : 1.6) * t.s
      return { p: [t.x, h / 2 - 0.25, t.z], s: [0.36 * t.s, h, 0.36 * t.s], c: p.tronc }
    }),
    [arbres, p.tronc],
  )
  const boules = useMemo<Boite[]>(
    () => arbres.filter((t) => !t.conifere).map((t) => ({ p: [t.x, 2.6 * t.s - 0.25, t.z], s: [2.6 * t.s, 2.6 * t.s, 2.6 * t.s], c: t.couleur })),
    [arbres],
  )
  const cones = useMemo<Boite[]>(
    () => arbres.filter((t) => t.conifere).flatMap((t) => [
      { p: [t.x, 2.4 * t.s - 0.25, t.z], s: [2.6 * t.s, 2.4 * t.s, 2.6 * t.s], c: t.couleur } as Boite,
      { p: [t.x, 4.0 * t.s - 0.25, t.z], s: [1.8 * t.s, 2.0 * t.s, 1.8 * t.s], c: t.couleur } as Boite,
    ]),
    [arbres],
  )
  if (!actif) return null
  return (
    <group>
      <Boites items={troncs} geometrie="cylindre" />
      <Boites items={boules} geometrie="sphere" />
      <Boites items={cones} geometrie="cone" />
    </group>
  )
}

export function ImmeublesLointains() {
  const actif = useEtat((s) => s.deco.batiments)
  const { nbImmeubles, graineDecor } = useEtat((s) => s.reglages)
  const p = usePalette()
  const tousImmeubles = useMemo(() => {
    const r = alea(graineDecor * 3 + 21)
    const liste: { x: number; z: number; w: number; d: number; h: number }[] = []
    for (let essais = 0; liste.length < 16 && essais < 600; essais++) {
      const a = r() * Math.PI * 2
      const dist = 74 + r() * 36
      const x = Math.cos(a) * dist
      const z = Math.sin(a) * dist
      if (Math.abs(z - ROUTE_Z) < 12) continue
      const w = 9 + r() * 10
      const d = 9 + r() * 9
      const h = 9 + r() * 17
      if (liste.some((o) => Math.hypot(o.x - x, o.z - z) < (o.w + w) / 2 + 6)) continue
      liste.push({ x, z, w, d, h })
    }
    return liste
  }, [graineDecor])
  const immeubles = useMemo(() => tousImmeubles.slice(0, nbImmeubles), [tousImmeubles, nbImmeubles])
  const corps = useMemo<Boite[]>(
    () => immeubles.map((b, i) => ({ p: [b.x, b.h / 2 - 0.25, b.z], s: [b.w, b.h, b.d], c: p.immeubles[i % p.immeubles.length] })),
    [immeubles, p.immeubles],
  )
  const details = useMemo<Boite[]>(
    () => immeubles.flatMap((b) => {
      const bandes: Boite[] = []
      for (let y = 2.4; y < b.h - 1.5; y += 3.2) bandes.push({ p: [b.x, y, b.z], s: [b.w + 0.12, 1.1, b.d + 0.12], c: p.fenetres }) // fenêtres en bandeau
      bandes.push({ p: [b.x + b.w * 0.15, b.h + 0.45, b.z], s: [b.w * 0.4, 1.4, b.d * 0.4], c: p.immeubles[0] }) // local technique sur le toit
      return bandes
    }),
    [immeubles, p.fenetres, p.immeubles],
  )
  if (!actif) return null
  return (
    <group>
      <Boites items={corps} />
      <Boites items={details} />
    </group>
  )
}
