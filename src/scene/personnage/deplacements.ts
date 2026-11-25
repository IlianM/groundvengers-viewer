import { donnees } from '../../data'
import type { Siege, Voie } from '../Mobilier'
import { construireDeplacement, hash, type CageInfo, type Destination, type Occupant } from './comportement'
import { DEC_CABINE, cycle, TOUR } from './ascenseur'

type Pt = [number, number]

/** Cages d'ascenseur avec leurs niveaux triés, dans l'ordre où la scène les anime (le rang fixe le décalage de la cabine). */
export function cagesInfo(): CageInfo[] {
  const cages = donnees.batiment.ascenseurs
  return cages.map((a, j) => ({
    x: a.position[0], z: a.position[1], profondeur: a.taille[1], dec: j * DEC_CABINE,
    niveaux: a.niveaux.map((id) => donnees.batiment.niveaux.find((n) => n.id === id)).filter((n): n is NonNullable<typeof n> => !!n)
      .sort((x, y) => x.altitude - y.altitude).map((n) => n.id),
  }))
}

const PORTEE_ALLEE = 2.2 // une allée verticale doit passer à moins de 2,2 m de la porte pour servir de couloir
const nearest = (v: number[], x: number) => v.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a))
const zHall = (c: CageInfo) => c.z + c.profondeur / 2 + 0.9
/** Couloir libre entre les tables et le comptoir d'une cafétéria : 2 m avant son mur du fond. */
const zCouloirCafe = (z: { rect: [number, number, number, number] }) => z.rect[1] + z.rect[3] - 2.0

/** Où l'on peut aller depuis un ascenseur : coin café et imprimante des open spaces desservis, comptoir de la cafétéria. */
export function destinationsDe(cage: CageInfo, voies: Map<string, Voie>, sieges: Siege[]): Destination[] {
  const sortie: Destination[] = []
  const L: Pt = [cage.x, zHall(cage)]
  for (const [id, v] of voies) {
    const zone = donnees.zoneParId.get(id)
    if (!zone || !cage.niveaux.includes(zone.niveau)) continue
    const vk = nearest(v.V, cage.x)
    if (Math.abs(vk - cage.x) > PORTEE_ALLEE) continue
    for (const poi of v.poi) {
      if (poi.pose === 'discute') continue // une discussion seul n'aurait pas de sens
      sortie.push({ niveau: zone.niveau, pts: [L, [vk, L[1]], [vk, poi.z], [poi.x, poi.z]], ry: poi.ry, pose: poi.pose, nom: `${poi.nom} (${zone.nom})` })
    }
  }
  for (const z of donnees.batiment.zones) {
    if (z.amenagement !== 'cafeteria' || !cage.niveaux.includes(z.niveau)) continue
    const comptoir = sieges.filter((s) => s.zone === z.id && s.tache === 'comptoir')
    if (comptoir.length === 0) continue
    const mx = comptoir.reduce((a, s) => a + s.x, 0) / comptoir.length
    const mz = comptoir[0].z + 0.1
    sortie.push({ niveau: z.niveau, pts: [L, [cage.x, zCouloirCafe(z)], [mx, zCouloirCafe(z)], [mx, mz]], ry: 0, pose: 'boire', nom: `comptoir (${z.nom})` })
  }
  return sortie
}

export const PERIODE_DEPLACEMENT = 180 // s : un déplacement par période, calée sur le cycle de la cabine
const PART_QUI_BOUGE = 0.4 // part des occupants d'open space qui font ce trajet

/**
 * Donne un déplacement à une partie des occupants d'open space dont une allée mène à un ascenseur.
 * Un occupant qui n'a aucune destination sur un autre étage reste à son poste.
 */
export function planifierDeplacements(occupants: Occupant[], voies: Map<string, Voie>, sieges: Siege[]) {
  const cages = cagesInfo().filter((c) => c.niveaux.length >= 2)
  if (cages.length === 0) return
  const cd = cycle(cages[0].niveaux.length) * TOUR
  const periode = Math.ceil(PERIODE_DEPLACEMENT / cd) * cd
  const destinations = cages.map((c) => destinationsDe(c, voies, sieges))
  for (const o of occupants) {
    if (!o.routes?.length || !o.acces || hash(`${o.cle}:dep`) % 100 >= PART_QUI_BOUGE * 100) continue
    const v = voies.get(o.zone)
    if (!v) continue
    // la cage dont l'allée passe le plus près
    let jBest = -1, dMin = Infinity
    cages.forEach((c, j) => {
      if (!c.niveaux.includes(o.niveau)) return
      const d = Math.abs(nearest(v.V, c.x) - c.x)
      if (d < dMin) { dMin = d; jBest = j }
    })
    if (jBest < 0 || dMin > PORTEE_ALLEE) continue
    const cage = cages[jBest]
    const idxDepart = cage.niveaux.indexOf(o.niveau)
    const possibles = destinations[jBest].filter((d) => d.niveau !== o.niveau)
    if (possibles.length === 0) continue
    const dest = possibles[hash(`${o.cle}:d`) % possibles.length]
    const vk = nearest(v.V, cage.x)
    const L: Pt = [cage.x, zHall(cage)]
    const depart: Pt = [o.x - Math.sin(o.ry) * 0.1, o.z - Math.cos(o.ry) * 0.1]
    const aller: Pt[] = [depart, o.acces, [vk, o.acces[1]], [vk, L[1]]]
    const debut = 10 + (hash(`${o.cle}:t`) % 90)
    const sejour = 6 + (hash(`${o.cle}:s`) % 6)
    const nv = construireDeplacement(cage, idxDepart, aller, dest, cage.niveaux.indexOf(dest.niveau), debut, sejour, periode, (hash(`${o.cle}:p`) % 6) * cd)
    if (nv) o.deplacement = nv
  }
}
