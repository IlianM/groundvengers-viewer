// Meubles générés à partir des zones de batiment.json (effectif, type, aménagement).
// Rien à dessiner à la main : changer l'effectif d'une zone change ses bureaux.
import { useMemo } from 'react'
import { donnees, decalageNiveau, decalageZone } from '../data'
import { useEtat } from '../store'
import { usePalette, type Palette } from './palette'
import { Boites, type Boite } from './Boites'
import { niveauVisible } from './visibles'
import type { Zone } from '../schema'

type Couleurs = Palette['meuble']

/** Emplacement d'un personnage : assis (siège), debout à son poste, ou dans le hall. */
export type Siege = {
  zone: string
  niveau: string
  x: number
  z: number
  y: number // hauteur du siège (0 = debout)
  ry: number // orientation (rad) : 0 regarde vers z croissant
  tache: 'bureau' | 'reunion' | 'cafe' | 'attente' | 'accueil' | 'presente' | 'comptoir'
  acces?: [number, number] // point d'allée devant le siège : de là, on rejoint le reste de la zone à pied
}

/** Point d'intérêt d'une zone (machine à café, imprimante, coin discussion) où une personne peut se rendre. */
export type Poi = { x: number; z: number; ry: number; pose: 'boire' | 'imprimante' | 'discute'; nom: string }
/** Allées d'une zone : lignes horizontales (z) et verticales (x), libres de meubles, et ses points d'intérêt. */
export type Voie = { zone: string; H: number[]; V: number[]; poi: Poi[] }
// Pendant la génération des positions de sièges, les fonctions d'aménagement y déposent leurs sièges.
let collecteur: Siege[] | null = null
let voiesCollectees: Voie[] | null = null
let contexte: { zone: Zone; tache: Siege['tache'] } | null = null
const derniere = () => (collecteur && collecteur.length ? collecteur[collecteur.length - 1] : null)
const ry = (face: number) => (face > 0 ? 0 : Math.PI)
function siege(x: number, z: number, y: number, rot: number, tache?: Siege['tache']) {
  if (collecteur && contexte) collecteur.push({ zone: contexte.zone.id, niveau: contexte.zone.niveau, x, z, y, ry: rot, tache: tache ?? contexte.tache })
}
type Poser = (x: number, y0: number, z: number, sx: number, sy: number, sz: number, couleur: string) => void

// chaise : `face` = sens vers lequel elle regarde (+1 vers z croissant)
function chaise(b: Poser, c: Couleurs, x: number, z: number, face: number) {
  siege(x, z, 0.48, ry(face))
  b(x, 0, z, 0.08, 0.42, 0.08, c.chaise)
  b(x, 0.42, z, 0.46, 0.06, 0.46, c.chaise)
  b(x, 0.48, z - face * 0.22, 0.46, 0.46, 0.05, c.chaise)
}

// configuration d'écrans d'un poste : stable par position, variée d'un bureau à l'autre
type Ecrans = 'simple' | 'double' | 'triple' | 'ultrawide' | 'portable'
function configEcrans(x: number, z: number): Ecrans {
  const h = Math.abs(Math.round(x * 17 + z * 31)) % 20
  return h < 8 ? 'simple' : h < 13 ? 'double' : h < 14 ? 'triple' : h < 17 ? 'ultrawide' : 'portable'
}

function ecrans(b: Poser, c: Couleurs, x: number, zs: number, cfg: Ecrans) {
  const pied = (px: number) => b(px, 0.75, zs, 0.15, 0.12, 0.12, c.ecran)
  switch (cfg) {
    case 'double':
      for (const dx of [-0.29, 0.29]) { pied(x + dx); b(x + dx, 0.87, zs, 0.52, 0.32, 0.03, c.ecran) }
      break
    case 'triple':
      for (const dx of [-0.5, 0, 0.5]) { pied(x + dx); b(x + dx, 0.87, zs, 0.46, 0.3, 0.03, c.ecran) }
      break
    case 'ultrawide':
      pied(x); b(x, 0.87, zs, 1.15, 0.33, 0.03, c.ecran)
      break
    case 'portable':
      b(x, 0.75, zs + 0.1, 0.38, 0.02, 0.26, c.pied) // clavier de l'ordinateur portable
      b(x, 0.77, zs - 0.03, 0.38, 0.24, 0.02, c.ecran)
      break
    default:
      pied(x); b(x, 0.87, zs, 0.55, 0.32, 0.03, c.ecran)
  }
}

// poste de travail : `s` = côté de la chaise (−1 côté z−, +1 côté z+)
function poste(b: Poser, c: Couleurs, x: number, z: number, s: number) {
  b(x, 0.7, z, 1.6, 0.05, 0.8, c.bois)
  b(x - 0.72, 0, z, 0.06, 0.7, 0.7, c.pied)
  b(x + 0.72, 0, z, 0.06, 0.7, 0.7, c.pied)
  ecrans(b, c, x, z - s * 0.2, configEcrans(x, z))
  chaise(b, c, x, z + s * 0.8, -s)
}

function plante(b: Poser, c: Couleurs, x: number, z: number) {
  b(x, 0, z, 0.4, 0.4, 0.4, c.pot)
  b(x, 0.4, z, 0.6, 0.9, 0.6, c.plante)
}

// Open space en îlots de quatre bureaux face à face, séparés par des allées, avec un coin café et une imprimante.
function openSpace(b: Poser, c: Couleurs, z: Zone) {
  const [x0, z0, w, d] = z.rect
  const PW = 3.4, PD = 3.0 // emprise d'un îlot : bureaux + chaises
  const cols = Math.max(1, Math.floor((w - 1.0) / (PW + 1.0) + 1e-6))
  const rows = Math.max(1, Math.floor((d - 1.0) / (PD + 1.0) + 1e-6))
  const gx = (w - cols * PW) / (cols + 1) // largeur des allées, bords compris
  const gz = (d - rows * PD) / (rows + 1)
  const V = Array.from({ length: cols + 1 }, (_, j) => x0 + j * (gx + PW) + gx / 2)
  const H = Array.from({ length: rows + 1 }, (_, k) => z0 + k * (gz + PD) + gz / 2)
  const ilots: [number, number, number, number][] = [] // cx, cz, ligne, colonne
  for (let r = 0; r < rows; r++) for (let j = 0; j < cols; j++) ilots.push([x0 + gx + j * (gx + PW) + PW / 2, z0 + gz + r * (gz + PD) + PD / 2, r, j])
  const nIlots = Math.min(ilots.length, Math.ceil(z.effectif_max / 4))
  let restant = z.effectif_max
  for (let i = 0; i < nIlots; i++) {
    const [cx, cz, r] = ilots[Math.floor((i * ilots.length) / nIlots)] // îlots répartis dans toute la zone
    const places: [number, number, number, number][] = [ // x, z, côté chaise, allée de sortie
      [cx - 0.85, cz - 0.45, -1, r], [cx + 0.85, cz - 0.45, -1, r], [cx - 0.85, cz + 0.45, 1, r + 1], [cx + 0.85, cz + 0.45, 1, r + 1],
    ]
    for (const [px, pz, sc, k] of places) {
      if (restant-- <= 0) break
      poste(b, c, px, pz, sc)
      const sg = derniere()
      if (sg) sg.acces = [px, H[k]]
    }
  }
  plante(b, c, x0 + 0.3, z0 + 0.3)
  plante(b, c, x0 + w - 0.3, z0 + d - 0.3)
  const poi: Poi[] = []
  if (rows >= 1 && H.length > 1) {
    const hm = H[1]
    b(x0 + w - 0.2, 0, hm, 0.35, 1.1, 0.7, c.comptoir) // coin café contre le mur de droite
    b(x0 + w - 0.2, 1.1, hm, 0.3, 0.3, 0.4, c.pied)
    poi.push({ x: V[cols], z: hm, ry: Math.PI / 2, pose: 'boire', nom: 'coin café' })
    b(x0 + 0.2, 0, hm, 0.35, 0.9, 0.7, c.rack) // imprimante contre le mur de gauche
    poi.push({ x: V[0], z: hm, ry: -Math.PI / 2, pose: 'imprimante', nom: 'imprimante' })
    if (cols > 1) poi.push({ x: V[1], z: hm, ry: 0, pose: 'discute', nom: 'discussion entre collègues' })
    if (cols > 2) poi.push({ x: V[2], z: hm, ry: Math.PI, pose: 'discute', nom: 'discussion entre collègues' })
  }
  voiesCollectees?.push({ zone: z.id, H, V, poi })
}

function bureauIndividuel(b: Poser, c: Couleurs, z: Zone) {
  const [x0, z0, w, d] = z.rect
  const k = Math.max(1, z.effectif_max)
  for (let i = 0; i < k; i++) poste(b, c, x0 + w / 2 + (i - (k - 1) / 2) * 2.0, z0 + 1.2, 1)
  b(x0 + w - 0.6, 0, z0 + d - 0.5, 0.9, 1.8, 0.45, c.armoire)
}

function reunion(b: Poser, c: Couleurs, z: Zone) {
  const [x0, z0, w, d] = z.rect
  const L = Math.min(w - 3, 5.2)
  const P = Math.min(d - 2.6, 1.5)
  const cx = x0 + w / 2
  const cz = z0 + d / 2
  b(cx, 0.72, cz, L, 0.06, P, c.table)
  b(cx, 0, cz, 0.15, 0.72, P * 0.6, c.pied)
  const parCote = Math.max(1, Math.min(Math.floor(L / 0.75), Math.ceil(z.effectif_max / 2)))
  for (const s of [-1, 1]) {
    for (let i = 0; i < parCote; i++) chaise(b, c, cx + (i - (parCote - 1) / 2) * (L / parCote), cz + s * (P / 2 + 0.45), -s)
  }
  b(cx, 1.0, z0 + 0.15, 2.0, 1.1, 0.06, c.ecran) // écran mural
  siege(cx + 1.4, z0 + 0.95, 0, 0, 'presente') // une personne présente devant l'écran
}

function accueil(b: Poser, c: Couleurs, z: Zone) {
  const [x0, z0, w, d] = z.rect
  const cx = x0 + w / 2
  b(cx, 0, z0 + 4.5, 4.0, 1.1, 0.9, c.comptoir) // banque d'accueil
  b(cx, 1.1, z0 + 4.5, 4.2, 0.05, 1.05, c.table)
  // salon d'attente : deux canapés face à face autour d'une table basse
  b(cx, 0, z0 + 11.0, 2.2, 0.45, 0.85, c.canape)
  b(cx, 0.45, z0 + 10.7, 2.2, 0.45, 0.2, c.canape)
  b(cx, 0, z0 + 13.6, 2.2, 0.45, 0.85, c.canape)
  b(cx, 0.45, z0 + 13.9, 2.2, 0.45, 0.2, c.canape)
  b(cx, 0, z0 + 12.3, 1.0, 0.4, 0.5, c.table)
  siege(cx, z0 + 3.4, 0, 0, 'accueil') // personne à l'accueil, derrière la banque
  for (const dx of [-0.5, 0.5]) { siege(cx + dx, z0 + 11.0, 0.45, 0, 'attente'); siege(cx + dx, z0 + 13.6, 0.45, Math.PI, 'attente') }
  for (const [px, pz] of [[1, 1.2], [w - 1, 1.2], [1, d - 1.2], [w - 1, d - 1.2]]) plante(b, c, x0 + px, z0 + pz)
}

function technique(b: Poser, c: Couleurs, z: Zone) {
  const [x0, z0, w, d] = z.rect
  const k = Math.max(1, Math.min(6, Math.floor((w - 1) / 1.0)))
  for (let i = 0; i < k; i++) {
    const x = k === 1 ? x0 + w / 2 : x0 + 0.75 + (i * (w - 1.5)) / (k - 1)
    b(x, 0, z0 + d - 0.55, 0.65, 2.0, 0.8, c.rack) // baies et armoires
  }
}

function cafeteria(b: Poser, c: Couleurs, z: Zone) {
  const [x0, z0, w, d] = z.rect
  const nt = Math.max(1, Math.ceil(z.effectif_max / 4))
  const cols = Math.max(1, Math.min(Math.ceil(nt / 2), Math.floor((w - 4) / 5)))
  for (let i = 0; i < nt; i++) {
    // tables en quinconce : une rangée sur deux est décalée, comme dans un vrai restaurant d'entreprise
    const x = x0 + 3.0 + (i % cols) * 5.0 + (Math.floor(i / cols) % 2) * 2.2
    const zz = z0 + 2.2 + Math.floor(i / cols) * 3.4
    b(x, 0.72, zz, 1.0, 0.05, 1.0, c.table)
    b(x, 0, zz, 0.12, 0.72, 0.12, c.pied)
    for (const [dx, dz] of [[0.75, 0], [-0.75, 0], [0, 0.75], [0, -0.75]]) {
      b(x + dx, 0, zz + dz, 0.35, 0.45, 0.35, c.chaise)
      siege(x + dx, zz + dz, 0.45, Math.atan2(-dx, -dz))
    }
  }
  plante(b, c, x0 + 0.5, z0 + d - 0.7)
  b(x0 + w - 3.2, 0, z0 + d - 0.8, 5.0, 1.0, 0.7, c.comptoir) // comptoir
  for (const dx of [-1.2, 1.2]) siege(x0 + w - 3.2 + dx, z0 + d - 1.8, 0, 0, 'comptoir')
}

function amenagement(z: Zone): NonNullable<Zone['amenagement']> {
  if (z.amenagement) return z.amenagement
  switch (z.type) {
    case 'open_space': return 'bureaux'
    case 'bureau': return 'bureau_individuel'
    case 'reunion': return 'reunion'
    case 'hall': return 'accueil'
    case 'technique': return 'technique'
    default: return 'aucun'
  }
}

type BoiteNiveau = Boite & { niveau: string; zone: string }

function tacheDe(z: Zone): Siege['tache'] {
  switch (amenagement(z)) {
    case 'reunion': return 'reunion'
    case 'cafeteria': return 'cafe'
    case 'accueil': return 'attente'
    default: return 'bureau'
  }
}

/** Tous les emplacements possibles de personnages, générés avec le mobilier (même géométrie). */
export function genererSieges(c: Couleurs): { sieges: Siege[]; voies: Map<string, Voie> } {
  collecteur = []
  voiesCollectees = []
  const rien: Poser = () => {}
  try {
    for (const z of donnees.batiment.zones) {
      contexte = { zone: z, tache: tacheDe(z) }
      switch (amenagement(z)) {
        case 'bureaux': openSpace(rien, c, z); break
        case 'bureau_individuel': bureauIndividuel(rien, c, z); break
        case 'reunion': reunion(rien, c, z); break
        case 'accueil': accueil(rien, c, z); break
        case 'cafeteria': cafeteria(rien, c, z); break
      }
    }
    return { sieges: collecteur, voies: new Map(voiesCollectees.map((v) => [v.zone, v])) }
  } finally { collecteur = null; voiesCollectees = null; contexte = null }
}

export function genererMobilier(c: Couleurs): BoiteNiveau[] {
  const [W, D] = donnees.batiment.emprise
  const sortie: BoiteNiveau[] = []
  for (const z of donnees.batiment.zones) {
    const n = donnees.batiment.niveaux.find((x) => x.id === z.niveau)
    if (!n) continue
    // x et zz en mètres dans le repère du bâtiment ; y0 = hauteur du bas au-dessus de la dalle
    const b: Poser = (x, y0, zz, sx, sy, sz, couleur) =>
      sortie.push({ p: [x - W / 2, n.altitude + 0.02 + y0 + sy / 2, zz - D / 2], s: [sx, sy, sz], c: couleur, niveau: z.niveau, zone: z.id })
    switch (amenagement(z)) {
      case 'bureaux': openSpace(b, c, z); break
      case 'bureau_individuel': bureauIndividuel(b, c, z); break
      case 'reunion': reunion(b, c, z); break
      case 'accueil': accueil(b, c, z); break
      case 'technique': technique(b, c, z); break
      case 'cafeteria': cafeteria(b, c, z); break
    }
  }
  return sortie
}

export function Mobilier() {
  const meubles = useEtat((s) => s.deco.meubles)
  const { niveau, coupe, vue, ecart, pieces, reglages } = useEtat()
  const p = usePalette()
  const tous = useMemo(() => genererMobilier(p.meuble), [p.meuble])
  const items = useMemo(
    () => tous
      .filter((m) => (!niveau || m.niveau === niveau) && niveauVisible(m.niveau, niveau, coupe))
      .map((m) => {
        if (!ecart && !pieces) return m
        const [dx, dz] = decalageZone(donnees.zoneParId.get(m.zone), pieces)
        return { ...m, p: [m.p[0] + dx, m.p[1] + decalageNiveau(m.niveau, ecart), m.p[2] + dz] as [number, number, number] }
      }),
    [tous, niveau, coupe, ecart, pieces],
  )
  if (!meubles) return null
  // hors vue Architecture, les meubles s'effacent pour laisser lire les équipements
  return <Boites items={items} opacite={vue === 'architecture' ? 1 : reglages.opaciteMeubles} />
}
