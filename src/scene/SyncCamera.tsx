import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/** Dernière position de caméra connue : sert à garder le même point de vue quand on passe en comparaison (et à synchroniser les deux vues). */
const partage = { pos: new THREE.Vector3(), cible: new THREE.Vector3(), source: '', version: 0 }

type Controles = { target: THREE.Vector3; update: () => void }

/** Chaque vue publie son déplacement ; l'autre le recopie. Sans comparaison, une seule vue publie et rien n'est recopié. */
export function SyncCamera({ nom }: { nom: string }) {
  const camera = useThree((s) => s.camera)
  const controles = useThree((s) => s.controls) as unknown as Controles | null
  const vu = useRef(-1)
  const dernier = useRef({ pos: new THREE.Vector3(), cible: new THREE.Vector3() })

  // à l'ouverture : on reprend le point de vue précédent s'il y en a un
  useEffect(() => {
    if (!controles || partage.version === 0) return
    camera.position.copy(partage.pos)
    controles.target.copy(partage.cible)
    controles.update()
    dernier.current.pos.copy(partage.pos)
    dernier.current.cible.copy(partage.cible)
    vu.current = partage.version
  }, [controles, camera])

  useFrame(() => {
    if (!controles) return
    if (partage.source !== nom && partage.version !== vu.current && partage.version > 0) {
      camera.position.copy(partage.pos)
      controles.target.copy(partage.cible)
      controles.update()
      dernier.current.pos.copy(camera.position)
      dernier.current.cible.copy(controles.target)
      vu.current = partage.version
      return
    }
    const d = dernier.current
    if (camera.position.distanceToSquared(d.pos) > 1e-8 || controles.target.distanceToSquared(d.cible) > 1e-8) {
      d.pos.copy(camera.position)
      d.cible.copy(controles.target)
      partage.pos.copy(camera.position)
      partage.cible.copy(controles.target)
      partage.source = nom
      partage.version++
      vu.current = partage.version
    }
  })
  return null
}
