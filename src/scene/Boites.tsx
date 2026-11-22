import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'

// Dessine des centaines de formes simples en un seul appel de rendu (décor, meubles).
export type Boite = {
  p: [number, number, number] // centre, en mètres
  s: [number, number, number] // dimensions (diamètre / hauteur pour cylindre, sphère et cône)
  c: string
  ry?: number
}
export type Geometrie = 'boite' | 'cylindre' | 'sphere' | 'cone'

export function Boites({ items, geometrie = 'boite', opacite = 1 }: { items: Boite[]; geometrie?: Geometrie; opacite?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    const col = new THREE.Color()
    items.forEach((b, i) => {
      o.position.set(...b.p)
      o.scale.set(...b.s)
      o.rotation.set(0, b.ry ?? 0, 0)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, col.set(b.c))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [items])
  if (items.length === 0) return null
  return (
    // key : un changement de nombre d'éléments recrée le tampon
    <instancedMesh key={`${geometrie}-${items.length}`} ref={ref} args={[undefined, undefined, items.length]} frustumCulled={false}>
      {geometrie === 'boite' && <boxGeometry args={[1, 1, 1]} />}
      {geometrie === 'cylindre' && <cylinderGeometry args={[0.5, 0.5, 1, 10]} />}
      {geometrie === 'sphere' && <sphereGeometry args={[0.5, 10, 8]} />}
      {geometrie === 'cone' && <coneGeometry args={[0.5, 1, 10]} />}
      <meshStandardMaterial transparent={opacite < 1} opacity={opacite} depthWrite={opacite >= 1} />
    </instancedMesh>
  )
}
