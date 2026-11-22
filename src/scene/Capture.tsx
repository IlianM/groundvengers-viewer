import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

/** Prise de vue de la scène 3D : permet au bouton « Capture » de l'interface de récupérer l'image du canvas.
 *  En comparaison, les deux vues sont assemblées côte à côte, chacune titrée de son mode. */
const capturers = new Map<string, { image: () => HTMLCanvasElement; libelle: string | null }>()

export function capturerVue(): string | null {
  const vues = [...capturers.entries()].sort(([a], [b]) => (a === 'gauche' ? -1 : b === 'gauche' ? 1 : 0)).map(([, v]) => v)
  if (vues.length === 0) return null
  if (vues.length === 1) return vues[0].image().toDataURL('image/png')
  const images = vues.map((v) => v.image())
  const bandeau = 44
  const sortie = document.createElement('canvas')
  sortie.width = images.reduce((s, c) => s + c.width, 0)
  sortie.height = Math.max(...images.map((c) => c.height)) + bandeau
  const g = sortie.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, sortie.width, sortie.height)
  let x = 0
  images.forEach((c, i) => {
    g.drawImage(c, x, bandeau)
    g.fillStyle = '#1b1f24'
    g.font = 'bold 22px sans-serif'
    g.fillText(vues[i].libelle ?? '', x + 14, 29)
    x += c.width
  })
  return sortie.toDataURL('image/png')
}

export function Capture({ nom, libelle }: { nom: string; libelle: string | null }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    // on redessine juste avant la lecture : sans cela, le tampon peut déjà être vidé
    capturers.set(nom, { libelle, image: () => { gl.render(scene, camera); return gl.domElement } })
    return () => { capturers.delete(nom) }
  }, [gl, scene, camera, nom, libelle])
  return null
}
