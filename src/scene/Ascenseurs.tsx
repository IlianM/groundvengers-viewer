import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { donnees, pointMonde } from '../data'
import { useEtat } from '../store'
import { niveauVisible } from './visibles'
import { etage, DEC_CABINE } from './personnage/ascenseur'
import { registre } from './personnage/registre'
import { usePalette } from './palette'
import type { Ascenseur } from '../schema'

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
  const ids = new Set(visibles.map((n) => n.id))
  // la cabine suit toujours l'horaire de TOUS les niveaux (les usagers en dépendent) ; elle est seulement masquée si son étage l'est
  const basesTous = niveaux.map((n) => pointMonde(n.id, a.position[0], 0.02, a.position[1], ecart, pieces))
  const bases = visibles.map((n) => pointMonde(n.id, a.position[0], 0.02, a.position[1], ecart, pieces))

  useFrame(() => {
    const g = cabine.current
    if (!g) return
    const t = reglages.animations ? registre.horloge : 0
    const { i, porte } = etage(t, niveaux.length, rang * DEC_CABINE)
    const i0 = Math.min(Math.floor(i), niveaux.length - 1)
    const i1 = Math.min(i0 + 1, niveaux.length - 1)
    const f = i - i0
    const b0 = basesTous[i0], b1 = basesTous[i1]
    g.position.set(b0[0] + (b1[0] - b0[0]) * f, b0[1] + (b1[1] - b0[1]) * f, b0[2] + (b1[2] - b0[2]) * f)
    g.visible = ids.has(niveaux[Math.round(i)]?.id)
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
