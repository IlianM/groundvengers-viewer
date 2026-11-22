import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { donnees, altitudeNiveau, pointMonde } from '../data'
import { useEtat } from '../store'
import { COULEURS } from '../views'
import { niveauVisible } from './visibles'
import type { Gaine } from '../schema'

const COULEUR_GAINE: Record<Gaine['reseau'], string> = {
  GTB: COULEURS.reseau.GTB, bureautique: COULEURS.reseau.bureautique, fibre: COULEURS.protocole.fibre, mixte: '#f08c00',
}

/** Un tronçon droit entre deux points monde (boîte orientée). */
function Troncon({ a, b, largeur, hauteur, couleur, surbrillance, onClick, onOver, onOut }: {
  a: THREE.Vector3; b: THREE.Vector3; largeur: number; hauteur: number; couleur: string; surbrillance: boolean
  onClick: () => void; onOver: () => void; onOut: () => void
}) {
  const { pos, quat, long } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(b, a)
    const long = dir.length()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), long > 0 ? dir.clone().normalize() : new THREE.Vector3(1, 0, 0))
    return { pos: new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), quat: q, long }
  }, [a, b])
  return (
    <mesh position={pos} quaternion={quat}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onPointerOver={(e) => { e.stopPropagation(); onOver(); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { onOut(); document.body.style.cursor = '' }}>
      <boxGeometry args={[long + largeur, hauteur, largeur]} />
      <meshStandardMaterial color={couleur} emissive={surbrillance ? couleur : '#000000'} emissiveIntensity={surbrillance ? 0.6 : 0} />
    </mesh>
  )
}

/** Gaines, chemins de câbles et montantes techniques (vue Cyber, calque « gaines »). */
export function Gaines() {
  const { vue, niveau, coupe, calquesMasques, selection, setSelection, ecart, pieces, reglages } = useEtat()
  const [survol, setSurvol] = useState<string | null>(null)
  if (vue !== 'cyber' || calquesMasques.has('gaines')) return null
  const alt = (id: string) => donnees.batiment.niveaux.find((n) => n.id === id)?.altitude ?? 0
  return (
    <group>
      {donnees.gaines.map((g) => {
        let points: THREE.Vector3[]
        if (g.type === 'montante') {
          if (!g.de || !g.a) return null
          const bas = alt(g.de), haut = alt(g.a)
          if (niveau && (alt(niveau) < Math.min(bas, haut) || alt(niveau) > Math.max(bas, haut))) return null
          if (!niveauVisible(g.de, niveau, coupe)) return null
          const [x, z] = g.chemin[0]
          const p0 = pointMonde(g.de, x, 0, z, ecart, pieces)
          const p1 = pointMonde(g.a, x, g.hauteur + 0.3, z, ecart, pieces)
          points = [new THREE.Vector3(...p0), new THREE.Vector3(...p1)]
        } else {
          if (!g.niveau || (niveau && niveau !== g.niveau) || !niveauVisible(g.niveau, niveau, coupe)) return null
          points = g.chemin.map(([x, z]) => new THREE.Vector3(...pointMonde(g.niveau!, x, g.hauteur, z, ecart, pieces)))
        }
        const couleur = COULEUR_GAINE[g.reseau]
        const actif = selection === g.id || survol === g.id
        const [largeur, hauteur] = g.type === 'montante' ? [0.55, 0.55] : [0.34, 0.16]
        const milieu = points[Math.floor((points.length - 1) / 2)].clone().lerp(points[Math.ceil((points.length - 1) / 2)], 0.5)
        return (
          <group key={g.id}>
            {points.slice(1).map((pt, i) => (
              <Troncon key={i} a={points[i]} b={pt} largeur={largeur} hauteur={hauteur}
                couleur={couleur} surbrillance={actif} onClick={() => setSelection(g.id)} onOver={() => setSurvol(g.id)} onOut={() => setSurvol(null)} />
            ))}
            {survol === g.id && reglages.infobulles && (
              <Html position={milieu} center style={{ pointerEvents: 'none' }}>
                <div className="infobulle"><b>{g.nom}</b><span>{g.type === 'montante' ? `Montante ${g.de} → ${g.a}` : `Chemin de câbles · ${g.niveau}`} · {g.reseau}</span></div>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}
