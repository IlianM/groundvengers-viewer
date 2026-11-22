import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { donnees, pointMonde } from '../data'
import { useEtat } from '../store'
import { niveauVisible } from './visibles'
import { usePalette } from './palette'
import type { Ascenseur } from '../schema'

const DWELL = 3.2 // s d'arrêt à chaque étage
const TRAJET = 1.8 // s entre deux étages

/** Position de la cabine (indice d'étage flottant) et ouverture des portes (0–1) à l'instant t. */
function etage(t: number, n: number, dec: number): { i: number; porte: number } {
  if (n <= 1) return { i: 0, porte: 0 }
  const tour = DWELL + TRAJET
  const cycle = 2 * (n - 1) // aller-retour
  const u = ((t + dec) / tour) % cycle
  const k = Math.floor(u)
  const f = u - k
  const attente = DWELL / tour
  const prog = f <= attente ? 0 : (f - attente) / (1 - attente)
  const lisse = prog * prog * (3 - 2 * prog)
  const a = k <= n - 1 ? k : cycle - k
  const b = k + 1 <= n - 1 ? k + 1 : cycle - (k + 1)
  const porte = f <= attente ? Math.min(1, Math.min(f, attente - f) / 0.06) : 0
  return { i: a + (b - a) * lisse, porte }
}

function Cage({ a, rang }: { a: Ascenseur; rang: number }) {
  const { niveau, coupe, ecart, pieces, reglages } = useEtat()
  const p = usePalette()
  const cabine = useRef<THREE.Group>(null)
  const porteG = useRef<THREE.Mesh>(null)
  const porteD = useRef<THREE.Mesh>(null)
  const [l, pr] = a.taille
  const niveaux = useMemo(
    () => a.niveaux.map((id) => donnees.batiment.niveaux.find((n) => n.id === id)).filter((n): n is NonNullable<typeof n> => !!n)
      .sort((x, y) => x.altitude - y.altitude),
    [a],
  )
  const visibles = niveaux.filter((n) => (!niveau || n.id === niveau) && niveauVisible(n.id, niveau, coupe))
  const bases = visibles.map((n) => pointMonde(n.id, a.position[0], 0.02, a.position[1], ecart, pieces))

  useFrame(({ clock }) => {
    const g = cabine.current
    if (!g || visibles.length === 0) return
    const t = reglages.animations && visibles.length > 1 ? clock.elapsedTime : 0
    const { i, porte } = etage(t, visibles.length, rang * 5.3)
    const i0 = Math.min(Math.floor(i), visibles.length - 1)
    const i1 = Math.min(i0 + 1, visibles.length - 1)
    const f = i - i0
    const b0 = bases[i0], b1 = bases[i1]
    g.position.set(b0[0] + (b1[0] - b0[0]) * f, b0[1] + (b1[1] - b0[1]) * f, b0[2] + (b1[2] - b0[2]) * f)
    const ouverture = reglages.animations ? porte : 0
    if (porteG.current) porteG.current.position.x = -l * 0.2 - ouverture * l * 0.2
    if (porteD.current) porteD.current.position.x = l * 0.2 + ouverture * l * 0.2
  })
  if (visibles.length === 0) return null
  const h = (n: { hauteur: number }) => n.hauteur - 0.1
  return (
    <group>
      {visibles.map((n, k) => (
        <mesh key={n.id} position={[bases[k][0], bases[k][1] + h(n) / 2, bases[k][2]]}>
          <boxGeometry args={[l, h(n), pr]} />
          <meshStandardMaterial color={p.ascenseur.cage} transparent opacity={0.16} depthWrite={false} />
          <Edges color={p.ascenseur.bord} />
        </mesh>
      ))}
      <group ref={cabine}>
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[l - 0.3, 2.2, pr - 0.3]} />
          <meshStandardMaterial color={p.ascenseur.cabine} />
        </mesh>
        {/* portes coulissantes, côté façade (+z) */}
        <mesh ref={porteG} position={[-l * 0.2, 1.05, (pr - 0.3) / 2 + 0.01]}>
          <boxGeometry args={[(l - 0.3) / 2, 2.0, 0.03]} />
          <meshStandardMaterial color={p.ascenseur.porte} />
        </mesh>
        <mesh ref={porteD} position={[l * 0.2, 1.05, (pr - 0.3) / 2 + 0.01]}>
          <boxGeometry args={[(l - 0.3) / 2, 2.0, 0.03]} />
          <meshStandardMaterial color={p.ascenseur.porte} />
        </mesh>
      </group>
    </group>
  )
}

export function Ascenseurs() {
  const actif = useEtat((s) => s.reglages.ascenseurs)
  if (!actif || donnees.batiment.ascenseurs.length === 0) return null
  return <group>{donnees.batiment.ascenseurs.map((a, i) => <Cage key={a.id} a={a} rang={i} />)}</group>
}
