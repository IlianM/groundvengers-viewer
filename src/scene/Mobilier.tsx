// Meubles générés à partir des zones de batiment.json (effectif, type, aménagement).
// Rien à dessiner à la main : changer l'effectif d'une zone change ses bureaux.
import { useMemo } from 'react'
import { donnees, decalageNiveau } from '../data'
import { useEtat } from '../store'
import { usePalette, type Palette } from './palette'
import { Boites, type Boite } from './Boites'
import { niveauVisible } from './visibles'
import type { Zone } from '../schema'

type Couleurs = Palette['meuble']
type Poser = (x: number, y0: number, z: number, sx: number, sy: number, sz: number, couleur: string) => void

// chaise : `face` = sens vers lequel elle regarde (+1 vers z croissant)
function chaise(b: Poser, c: Couleurs, x: number, z: number, face: number) {
  b(x, 0, z, 0.08, 0.42, 0.08, c.chaise)
  b(x, 0.42, z, 0.46, 0.06, 0.46, c.chaise)
  b(x, 0.48, z - face * 0.22, 0.46, 0.46, 0.05, c.chaise)
}

// poste de travail : `s` = côté de la chaise (−1 côté z−, +1 côté z+)
function poste(b: Poser, c: Couleurs, x: number, z: number, s: number) {
  b(x, 0.7, z, 1.6, 0.05, 0.8, c.bois)
  b(x - 0.72, 0, z, 0.06, 0.7, 0.7, c.pied)
  b(x + 0.72, 0, z, 0.06, 0.7, 0.7, c.pied)
  b(x, 0.75, z - s * 0.2, 0.15, 0.12, 0.12, c.ecran)
  b(x, 0.87, z - s * 0.2, 0.55, 0.32, 0.03, c.ecran)
  chaise(b, c, x, z + s * 0.8, -s)
}

function plante(b: Poser, c: Couleurs, x: number, z: number) {
  b(x, 0, z, 0.4, 0.4, 0.4, c.pot)
  b(x, 0.4, z, 0.6, 0.9, 0.6, c.plante)
}

function openSpace(b: Poser, c: Couleurs, z: Zone) {
  const [x0, z0, w, d] = z.rect
  const cols = Math.max(1, Math.floor((w - 1.6) / 2.0))
  const xDebut = x0 + (w - (cols - 1) * 2.0) / 2
  const slots: [number, number, number][] = []
  // rangées de deux bureaux dos à dos, une colonne tous les 2 m
  for (let zA = z0 + 1.6; zA + 0.9 + 1.2 <= z0 + d - 0.3; zA += 3.6) {
    for (let i = 0; i < cols; i++) {
      slots.push([xDebut + i * 2.0, zA, -1])
      slots.push([xDebut + i * 2.0, zA + 0.9, 1])
    }
  }
  const n = Math.min(z.effectif_max, slots.length)
  for (let i = 0; i < n; i++) {
    const [x, zz, s] = slots[Math.floor((i * slots.length) / n)] // répartis sur toute la zone
    poste(b, c, x, zz, s)
  }
  plante(b, c, x0 + 0.7, z0 + d - 0.7)
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
  const cols = Math.min(nt, Math.max(1, Math.floor((w - 2) / 3.6)))
  for (let i = 0; i < nt; i++) {
    const x = x0 + 2.2 + (i % cols) * 3.6
    const zz = z0 + 2.2 + Math.floor(i / cols) * 3.2
    b(x, 0.72, zz, 1.0, 0.05, 1.0, c.table)
    b(x, 0, zz, 0.12, 0.72, 0.12, c.pied)
    for (const [dx, dz] of [[0.75, 0], [-0.75, 0], [0, 0.75], [0, -0.75]]) b(x + dx, 0, zz + dz, 0.35, 0.45, 0.35, c.chaise)
  }
  b(x0 + w - 3.2, 0, z0 + d - 0.8, 5.0, 1.0, 0.7, c.comptoir) // comptoir
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

type BoiteNiveau = Boite & { niveau: string }

export function genererMobilier(c: Couleurs): BoiteNiveau[] {
  const [W, D] = donnees.batiment.emprise
  const sortie: BoiteNiveau[] = []
  for (const z of donnees.batiment.zones) {
    const n = donnees.batiment.niveaux.find((x) => x.id === z.niveau)
    if (!n) continue
    // x et zz en mètres dans le repère du bâtiment ; y0 = hauteur du bas au-dessus de la dalle
    const b: Poser = (x, y0, zz, sx, sy, sz, couleur) =>
      sortie.push({ p: [x - W / 2, n.altitude + 0.02 + y0 + sy / 2, zz - D / 2], s: [sx, sy, sz], c: couleur, niveau: z.niveau })
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
  const { niveau, coupe, vue, ecart } = useEtat()
  const p = usePalette()
  const tous = useMemo(() => genererMobilier(p.meuble), [p.meuble])
  const items = useMemo(
    () => tous
      .filter((m) => (!niveau || m.niveau === niveau) && niveauVisible(m.niveau, niveau, coupe))
      .map((m) => (ecart ? { ...m, p: [m.p[0], m.p[1] + decalageNiveau(m.niveau, ecart), m.p[2]] as [number, number, number] } : m)),
    [tous, niveau, coupe, ecart],
  )
  if (!meubles) return null
  // hors vue Architecture, les meubles s'effacent pour laisser lire les équipements
  return <Boites items={items} opacite={vue === 'architecture' ? 1 : 0.4} />
}
