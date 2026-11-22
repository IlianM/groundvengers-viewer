import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

/** Prise de vue de la scène 3D : permet au bouton « Capture » de l'interface de récupérer l'image du canvas. */
let capturer: (() => string) | null = null
export const capturerVue = () => capturer?.() ?? null

export function Capture() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    // on redessine juste avant la lecture : sans cela, le tampon peut déjà être vidé
    capturer = () => { gl.render(scene, camera); return gl.domElement.toDataURL('image/png') }
    return () => { capturer = null }
  }, [gl, scene, camera])
  return null
}
