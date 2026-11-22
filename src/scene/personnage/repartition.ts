import { donnees } from '../../data'
import type { Siege, Voie } from '../Mobilier'
import { hash, routesDepuis, type Occupant } from './comportement'

// Trajet des personnes qui traversent le hall : boucle le long des murs, hors banque d'accueil et canapés.
// (le bord est reste à 8,6 m : au-delà, la cage des ascenseurs)
export const BOUCLE_HALL: [number, number][] = [[2.2, 17], [2.2, 2], [8.6, 2], [8.6, 17]]

/** Qui est où : n personnes par zone, sur des sièges tirés dans un ordre stable (pas de saut quand n varie). */
export function repartir(sieges: Siege[], voies: Map<string, Voie>, effectifs: Map<string, number>): Occupant[] {
  const sortie: Occupant[] = []
  for (const z of donnees.batiment.zones) {
    const n = effectifs.get(z.id) ?? 0
    if (n <= 0) continue
    const siegesZ = sieges.filter((s) => s.zone === z.id)
    const voie = voies.get(z.id)
    const fixe = (t: Siege['tache']) => siegesZ.filter((s) => s.tache === t)
    const assis = siegesZ
      .filter((s) => s.tache !== 'accueil' && s.tache !== 'presente' && s.tache !== 'comptoir' && !(z.type === 'hall' && s.tache === 'attente'))
      .map((s, i) => ({ s, k: hash(`${z.id}:${i}`) }))
      .sort((a, b) => a.k - b.k)
      .map((o) => o.s)
    const sofas = z.type === 'hall' ? siegesZ.filter((s) => s.tache === 'attente') : []
    const liste: Occupant[] = []
    const poser = (s: Siege, i: number) => {
      const o: Occupant = { cle: `${z.id}#${liste.length}`, zone: z.id, niveau: z.niveau, tache: s.tache, x: s.x, z: s.z, y: s.y, ry: s.ry, phase: ((hash(z.id) + i * 7) % 100) / 16 }
      if (s.tache === 'bureau') { o.routes = routesDepuis({ x: s.x, z: s.z, ry: s.ry, acces: s.acces }, voie); o.acces = s.acces }
      liste.push(o)
    }
    const accueil = fixe('accueil')[0], presente = fixe('presente')[0]
    if (accueil) poser(accueil, 0)
    if (presente && n >= 3) poser(presente, 1)
    const comptoir = fixe('comptoir')
    let ci = 0, si = 0, ai = 0
    while (liste.length < n) {
      const i = liste.length
      if (z.type === 'hall') {
        // alternance : une personne traverse le hall, la suivante s'assoit sur un canapé
        if (i % 2 === 1 && si < sofas.length) { poser(sofas[si++], i); continue }
        liste.push({ cle: `${z.id}#${i}`, zone: z.id, niveau: z.niveau, tache: 'marche', x: 0, z: 0, y: 0, ry: 0, phase: i, boucle: BOUCLE_HALL, decalageDepart: (hash(z.id) % 7) + i * 11 })
        continue
      }
      if (z.amenagement === 'cafeteria' && i % 5 === 4 && ci < comptoir.length) { poser(comptoir[ci++], i); continue }
      if (ai < assis.length) { poser(assis[ai++], i); continue }
      break
    }
    sortie.push(...liste)
  }
  return sortie
}

