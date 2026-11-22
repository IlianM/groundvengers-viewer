import type { Poi, Voie } from '../Mobilier'
import { arretOuvert, arretApres, cycle, DWELL, TOUR } from './ascenseur'

/** Ce que fait un personnage à un instant donné : fonction pure du temps, donc rejouable et sans état caché. */
export type Pose =
  | 'taper' | 'souris' | 'croise' | 'penser' | 'telephone' | 'lire' | 'etire' | 'boire' | 'discute'
  | 'reunion' | 'note' | 'presente' | 'attente' | 'accueil' | 'comptoir' | 'marche' | 'imprimante' | 'arpente' | 'asc' | 'patiente'

export const LIBELLE_POSE: Record<Pose, string> = {
  taper: 'Travaille sur son poste', souris: 'Travaille sur son poste', croise: 'Réfléchit, bras croisés', penser: 'Réfléchit à un problème',
  telephone: 'Au téléphone', lire: 'Lit un document', etire: 'S’étire', boire: 'Prend un café', discute: 'Discute avec un collègue',
  reunion: 'Écoute en réunion', note: 'Prend des notes', presente: 'Présente en réunion', attente: 'Attend à l’accueil',
  accueil: 'Accueille les visiteurs', comptoir: 'Attend au comptoir', marche: 'Se déplace', imprimante: 'Récupère une impression', arpente: 'Téléphone en marchant', asc: 'Attend l’ascenseur', patiente: 'Consulte son téléphone',
}

export const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 100003; return h }

type Pt = [number, number]
export type Route = { poi: Poi; pts: Pt[]; longueur: number }

export type Occupant = {
  cle: string
  zone: string
  niveau: string
  tache: 'bureau' | 'reunion' | 'cafe' | 'attente' | 'accueil' | 'presente' | 'comptoir' | 'marche'
  x: number; z: number; y: number; ry: number // siège (y > 0) ou position debout
  phase: number
  boucle?: Pt[]
  decalageDepart?: number
  routes?: Route[] // sorties possibles depuis le poste (open space)
  navette?: Navette // usager d'ascenseur : entre par le hall, monte, redescend et sort
  acces?: [number, number] // point d'allée devant le siège (open space)
  deplacement?: Navette // occupant qui quitte son poste, change d'étage (café, imprimante) puis revient
}

export type Etat = {
  niveau?: string // niveau où se trouve un usager d'ascenseur
  visible?: boolean // faux dans la cabine
  echelle?: number // 0–1 : apparition et disparition à l'entrée du bâtiment
  x: number; z: number; ry: number
  assis: boolean
  marche: boolean
  pose: Pose
  libre?: boolean // vrai : x, z sont des coordonnées du bâtiment (usager en déplacement) ; faux : relatives à l'ancre de la zone
}

const VITESSE_MARCHE = 1.15 // m/s

const longueurs = (pts: Pt[]) => pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
const dedoublonner = (pts: Pt[]) => pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.05)

/** Routes d'un poste de l'open space vers chaque point d'intérêt, en suivant uniquement les allées. */
export function routesDepuis(o: { x: number; z: number; ry: number; acces?: [number, number] }, voie: Voie | undefined): Route[] {
  if (!voie || !o.acces) return []
  const depart: Pt = [o.x - Math.sin(o.ry) * 0.1, o.z - Math.cos(o.ry) * 0.1]
  return voie.poi.map((poi) => {
    const pts = dedoublonner([depart, o.acces!, [poi.x, o.acces![1]], [poi.x, poi.z]])
    return { poi, pts, longueur: longueurs(pts).reduce((a, b) => a + b, 0) }
  })
}

/** Poses possibles à un poste de travail, avec leur fréquence relative. */
const POSES_BUREAU: Pose[] = ['taper', 'taper', 'taper', 'souris', 'croise', 'penser', 'telephone', 'lire', 'etire', 'boire', 'discute']
const POSES_PAR_TACHE: Record<string, Pose[]> = {
  reunion: ['reunion', 'reunion', 'note', 'note', 'penser', 'croise'],
  cafe: ['boire', 'boire', 'discute', 'attente', 'croise'],
  attente: ['attente', 'lire', 'attente'],
  accueil: ['accueil', 'accueil', 'telephone', 'souris'],
  presente: ['presente'],
  comptoir: ['comptoir'],
}

function poseAssise(o: Occupant, t: number): Pose {
  const liste = o.tache === 'bureau' ? POSES_BUREAU : POSES_PAR_TACHE[o.tache] ?? ['attente']
  const duree = 8 + (hash(o.cle) % 6)
  const creneau = Math.floor((t + o.phase * 4) / duree)
  return liste[hash(`${o.cle}:${creneau}`) % liste.length]
}

/** Position le long d'une ligne brisée, à la distance d, avec le cap du segment courant. */
function surChemin(pts: Pt[], d: number): { x: number; z: number; ry: number } {
  const L = longueurs(pts)
  let i = 0
  while (i < L.length - 1 && d > L[i]) { d -= L[i]; i++ }
  const a = pts[i], b = pts[i + 1], f = L[i] > 0 ? Math.min(1, d / L[i]) : 1
  return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, ry: Math.atan2(b[0] - a[0], b[1] - a[1]) }
}

// ---------- usagers d'ascenseur ----------
type Seg = { t0: number; t1: number; kind: 'marche' | 'attend' | 'cache' | 'poste'; niveau: string; pts: Pt[]; ry?: number; pose?: Pose }
export type Navette = { segs: Seg[]; periode: number; decalage: number }

export type CageInfo = { x: number; z: number; profondeur: number; niveaux: string[]; dec: number }

/**
 * Scénario d'un usager : entre par la porte du hall, attend la cabine, monte au niveau `dest`, patiente un instant,
 * redescend et ressort. Les temps d'attente sont calculés sur l'horaire exact de la cabine : on n'embarque que porte ouverte.
 */
export function construireNavette(cage: CageInfo, dest: number, decalage: number, xEntree: number, zEntree: number): Navette | null {
  const n = cage.niveaux.length
  if (n < 2) return null
  // période et décalage multiples du cycle de la cabine : le scénario se rejoue à l'identique, calé sur ses arrêts
  const cd = cycle(n) * TOUR
  const periode = Math.ceil(120 / cd) * cd
  decalage = Math.round(decalage / cd) * cd
  const V = VITESSE_MARCHE
  const zPorte = cage.z + cage.profondeur / 2 + 0.25
  const zHall = cage.z + cage.profondeur / 2 + 0.9
  const L: Pt = [cage.x, zHall], porte: Pt = [cage.x, zPorte], W: Pt = [cage.x, zHall + 2]
  const segs: Seg[] = []
  let u = 0
  const marche = (niveau: string, pts: Pt[]) => {
    const p = dedoublonner(pts)
    const d = longueurs(p).reduce((a, b) => a + b, 0) / V
    segs.push({ t0: u, t1: u + d, kind: 'marche', niveau, pts: p }); u += d
  }
  const attend = (niveau: string, jusqua: number, at: Pt, ry: number, pose: Pose) => {
    if (jusqua > u) { segs.push({ t0: u, t1: jusqua, kind: 'attend', niveau, pts: [at], ry, pose }); u = jusqua }
  }
  const cache = (niveau: string, jusqua: number) => { segs.push({ t0: u, t1: jusqua, kind: 'cache', niveau, pts: [porte] }); u = jusqua }
  const bas = cage.niveaux[0], haut = cage.niveaux[dest]
  const dec = cage.dec
  // montée
  marche(bas, [[xEntree, zEntree], [xEntree, zHall], L])
  const sUp = arretOuvert(0, n, dec, u)
  attend(bas, sUp + 0.3, L, Math.PI, 'asc')
  marche(bas, [L, porte])
  const sDest = arretApres(dest, n, dec, sUp + DWELL)
  cache(bas, sDest + 0.4)
  // en haut : quelques mètres, un coup d'œil au téléphone, retour à l'ascenseur
  marche(haut, [porte, L, W])
  attend(haut, u + 6, W, 0, 'patiente')
  marche(haut, [W, L])
  const sDown = arretOuvert(dest, n, dec, u)
  attend(haut, sDown + 0.3, L, Math.PI, 'asc')
  marche(haut, [L, porte])
  const sBas = arretApres(0, n, dec, sDown + DWELL)
  cache(haut, sBas + 0.4)
  // sortie du bâtiment
  marche(bas, [porte, L, [xEntree, L[1]], [xEntree, zEntree]])
  if (u > periode - 4) return null
  return { segs, periode, decalage }
}


export type Destination = { niveau: string; pts: Pt[]; ry: number; pose: Pose; nom: string }

/**
 * Déplacement d'un occupant : il quitte son poste, rejoint l'ascenseur de son étage, monte ou descend, va jusqu'au point
 * de destination (machine à café, imprimante, comptoir), y reste un moment, puis refait le trajet à l'envers pour se rasseoir.
 * `aller` va du siège à la porte de la cabine (point L, premier élément exclu) ; `chemin` va de L au point de destination.
 * Même principe que les usagers d'ascenseur : les attentes sont calées sur l'horaire exact de la cabine.
 */
export function construireDeplacement(
  cage: CageInfo, idxDepart: number, aller: Pt[], dest: Destination, idxDest: number, debut: number, sejour: number, periode: number, decalage: number,
): Navette | null {
  const n = cage.niveaux.length
  if (n < 2 || idxDepart === idxDest) return null
  const cd = cycle(n) * TOUR
  if (periode % cd > 1e-6) return null
  decalage = Math.round(decalage / cd) * cd
  const V = VITESSE_MARCHE
  const zPorte = cage.z + cage.profondeur / 2 + 0.25
  const zHall = cage.z + cage.profondeur / 2 + 0.9
  const L: Pt = [cage.x, zHall], porte: Pt = [cage.x, zPorte]
  const segs: Seg[] = []
  let u = 0
  const depart = cage.niveaux[idxDepart], arrivee = cage.niveaux[idxDest]
  const poste = (jusqua: number) => { segs.push({ t0: u, t1: jusqua, kind: 'poste', niveau: depart, pts: [aller[0]] }); u = jusqua }
  const marche = (niveau: string, pts: Pt[]) => {
    const p = dedoublonner(pts)
    const d = longueurs(p).reduce((a, b) => a + b, 0) / V
    segs.push({ t0: u, t1: u + d, kind: 'marche', niveau, pts: p }); u += d
  }
  const attend = (niveau: string, jusqua: number, at: Pt, ry: number, pose: Pose) => {
    if (jusqua > u) { segs.push({ t0: u, t1: jusqua, kind: 'attend', niveau, pts: [at], ry, pose }); u = jusqua }
  }
  const cache = (niveau: string, jusqua: number) => { segs.push({ t0: u, t1: jusqua, kind: 'cache', niveau, pts: [porte] }); u = jusqua }
  const dec = cage.dec
  const versL = [...aller, L]
  const versDest = dest.pts // commence à L
  // au poste jusqu'au départ, puis vers l'ascenseur
  poste(debut)
  marche(depart, versL)
  const s1 = arretOuvert(idxDepart, n, dec, u)
  attend(depart, s1 + 0.3, L, Math.PI, 'asc')
  marche(depart, [L, porte])
  const s2 = arretApres(idxDest, n, dec, s1 + DWELL)
  cache(depart, s2 + 0.4)
  // à destination
  marche(arrivee, [porte, ...versDest])
  attend(arrivee, u + sejour, versDest[versDest.length - 1], dest.ry, dest.pose)
  marche(arrivee, [...versDest].reverse())
  const s3 = arretOuvert(idxDest, n, dec, u)
  attend(arrivee, s3 + 0.3, L, Math.PI, 'asc')
  marche(arrivee, [L, porte])
  const s4 = arretApres(idxDepart, n, dec, s3 + DWELL)
  cache(arrivee, s4 + 0.4)
  // retour au poste
  marche(depart, [porte, ...[...versL].reverse()])
  if (u > periode - 2) return null
  segs.push({ t0: u, t1: periode, kind: 'poste', niveau: depart, pts: [aller[0]] })
  return { segs, periode, decalage }
}

/** État d'un occupant en déplacement ; null quand il est à son poste (le comportement habituel s'applique alors). */
function etatDeplacement(o: Occupant, t: number): Etat | null {
  const nv = o.deplacement!
  const u = (((t + nv.decalage) % nv.periode) + nv.periode) % nv.periode
  const seg = nv.segs.find((s) => u >= s.t0 && u < s.t1)
  if (!seg || seg.kind === 'poste') return null
  return { ...etatNavetteBrut(o, nv, t), libre: true }
}

function etatNavette(o: Occupant, t: number): Etat {
  return { ...etatNavetteBrut(o, o.navette!, t), libre: true }
}

function etatNavetteBrut(o: Occupant, nv: Navette, t: number): Etat {
  const u = (((t + nv.decalage) % nv.periode) + nv.periode) % nv.periode
  const dernier = nv.segs[nv.segs.length - 1]
  const seg = nv.segs.find((s) => u >= s.t0 && u < s.t1)
  if (!seg) return { niveau: dernier.niveau, visible: false, x: 0, z: 0, ry: 0, assis: false, marche: false, pose: 'attente' }
  const premier = nv.segs[0]
  const echelle = nv !== o.navette ? 1 : seg === premier ? Math.min(1, (u - seg.t0) / 1.2) : seg === dernier ? Math.min(1, (seg.t1 - u) / 1.5) : 1
  if (seg.kind === 'cache') return { niveau: seg.niveau, visible: false, x: seg.pts[0][0], z: seg.pts[0][1], ry: 0, assis: false, marche: false, pose: 'attente' }
  if (seg.kind === 'attend') return { niveau: seg.niveau, visible: true, echelle, x: seg.pts[0][0], z: seg.pts[0][1], ry: seg.ry ?? 0, assis: false, marche: false, pose: seg.pose ?? 'attente' }
  const p = surChemin(seg.pts, (u - seg.t0) * VITESSE_MARCHE)
  return { niveau: seg.niveau, visible: true, echelle, ...p, assis: false, marche: true, pose: 'marche' }
}

export function etatDe(o: Occupant, t: number): Etat {
  if (o.navette) return etatNavette(o, t)
  if (o.deplacement) { const e = etatDeplacement(o, t); if (e) return e }
  const assis = o.y > 0
  const px = assis ? o.x - Math.sin(o.ry) * 0.1 : o.x
  const pz = assis ? o.z - Math.cos(o.ry) * 0.1 : o.z

  // piéton du hall : boucle le long des murs
  if (o.boucle) {
    const B = o.boucle
    const pts = [...B, B[0]]
    const total = longueurs(pts).reduce((a, b) => a + b, 0)
    const p = surChemin(pts, (t * VITESSE_MARCHE + (o.decalageDepart ?? 0)) % total)
    return { ...p, assis: false, marche: true, pose: 'marche' }
  }

  // sorties périodiques depuis un poste de l'open space : café, imprimante, discussion
  if (o.routes && o.routes.length && !o.deplacement) {
    const h = hash(o.cle)
    const periode = 80 + (h % 40)
    const decalage = o.phase * 3
    const k = Math.floor((t + decalage) / periode)
    const u = (t + decalage) - k * periode
    const debut = 12 + (h % 20)
    if (hash(`${o.cle}:${k}`) % 10 < 7) {
      const r = o.routes[hash(`${o.cle}:r${k}`) % o.routes.length]
      const dAller = r.longueur / VITESSE_MARCHE
      const sejour = 5 + (hash(`${o.cle}:s${k}`) % 5)
      const total = 2 * dAller + sejour
      if (dAller > 0 && debut + total < periode - 1 && u >= debut && u < debut + total) {
        const v = u - debut
        if (v < dAller) return { ...surChemin(r.pts, v * VITESSE_MARCHE), assis: false, marche: true, pose: hash(o.cle) % 4 === 0 ? 'arpente' : 'marche' }
        if (v < dAller + sejour) {
          const dernier = r.pts[r.pts.length - 1]
          return { x: dernier[0], z: dernier[1], ry: r.poi.ry, assis: false, marche: false, pose: r.poi.pose }
        }
        const retour = [...r.pts].reverse()
        return { ...surChemin(retour, (v - dAller - sejour) * VITESSE_MARCHE), assis: false, marche: true, pose: 'marche' }
      }
    }
  }

  // bureau individuel : de temps en temps, se lève pour téléphoner en marchant ou s'étirer
  if (o.tache === 'bureau' && !o.routes?.length && !o.deplacement) {
    const h = hash(o.cle)
    const periode = 70 + (h % 40)
    const k = Math.floor((t + o.phase * 3) / periode)
    const u = t + o.phase * 3 - k * periode
    const debut = 15 + (h % 15)
    if (hash(`${o.cle}:${k}`) % 10 < 6 && u >= debut && u < debut + 22) {
      const dx = -Math.sin(o.ry), dz = -Math.cos(o.ry) // vers l'arrière du siège
      const p0: Pt = [px, pz]
      const pts: Pt[] = [p0, [px + dx * 0.9, pz + dz * 0.9], [px + dx * 2.6, pz + dz * 2.6], [px + dx * 0.9, pz + dz * 0.9]]
      const v = u - debut
      if (v < 18) return { ...surChemin(pts, Math.min(v * 0.9, longueurs(pts).reduce((a, b) => a + b, 0))), assis: false, marche: true, pose: 'arpente' }
      return { x: px + dx * 0.9, z: pz + dz * 0.9, ry: Math.atan2(dx, dz) + Math.PI, assis: false, marche: false, pose: 'etire' }
    }
  }

  return { x: px, z: pz, ry: o.ry, assis, marche: false, pose: poseAssise(o, t) }
}

/**
 * Angles cibles (rad) pour une pose ; t en secondes.
 * Bras articulés : épaule (x = avant/arrière, z = écart latéral) + coude (e). Aucune pose ne lève un bras tendu
 * vers l'avant : les mains montent toujours coude plié (téléphone, café) ou les deux bras en V (étirement).
 */
export type Cible = { gx: number; gz: number; ge: number; dx: number; dz: number; de: number; tx: number; ty: number; tz: number; bx: number; by: number }
export function cibleDe(pose: Pose, t: number): Cible {
  const base: Cible = { gx: 0.05, gz: 0, ge: -0.1, dx: 0.05, dz: 0, de: -0.1, tx: 0, ty: 0, tz: 0, bx: 0, by: 0 }
  const s = Math.sin
  // mains sur un clavier ou une table, coudes pliés
  const clavier = { gx: -0.55, ge: -0.85, dx: -0.55, de: -0.85 }
  switch (pose) {
    case 'taper': return { ...base, ...clavier, ge: -0.85 + 0.06 * s(t * 9), de: -0.85 + 0.06 * s(t * 9 + 2), tx: 0.12 }
    case 'souris': return { ...base, ...clavier, ge: -0.85 + 0.03 * s(t * 8), dx: -0.6, de: -0.8 + 0.05 * s(t * 2.5), tx: 0.1 }
    case 'croise': return { ...base, gx: -0.3, gz: 0.3, ge: -1.9, dx: -0.3, dz: -0.3, de: -1.9, bx: -0.15, ty: 0.3 * s(t * 0.4) }
    case 'penser': return { ...base, gx: -0.55, ge: -0.85, dx: -0.9, dz: -0.2, de: -1.9, tx: 0.2, tz: 0.08, bx: 0.08 }
    case 'telephone': return { ...base, gx: -0.55, ge: -0.85, dx: -0.9, dz: -0.5, de: -2.1, tz: 0.25, ty: 0.15 }
    case 'lire': return { ...base, ...clavier, tx: 0.5, bx: 0.14 }
    case 'etire': return { ...base, gx: -0.2, gz: -2.4 + 0.1 * s(t * 2), ge: -0.3, dx: -0.2, dz: 2.4 - 0.1 * s(t * 2 + 1), de: -0.3, tx: -0.2, bx: -0.12 }
    case 'boire': return { ...base, gx: -0.55, ge: -0.85, dx: -0.9, de: -1.9 + 0.12 * s(t * 0.9), tx: -0.1, ty: 0.3 * s(t * 0.5) }
    case 'discute': return { ...base, gx: -0.5 + 0.25 * s(t * 3), ge: -0.9 + 0.2 * s(t * 3 + 1), dx: -0.5 + 0.25 * s(t * 3 + 1.5), de: -0.9 + 0.2 * s(t * 3 + 2.5), ty: 0.6 * s(t * 0.8), by: 0.15 * s(t * 0.8) }
    case 'reunion': return { ...base, ...clavier, ty: 0.6 * s(t * 0.7) }
    case 'note': return { ...base, gx: -0.55, ge: -0.85, dx: -0.6, de: -0.8 + 0.08 * s(t * 5), tx: 0.5, bx: 0.1 }
    // présentation : mains ouvertes à hauteur de poitrine, jamais de bras levé
    case 'presente': return { ...base, gx: -0.35, ge: -0.7, dx: -0.6, dz: 0.5, de: -0.9 + 0.3 * s(t * 1.6), by: 0.25 * s(t * 0.5) }
    case 'accueil': return { ...base, gx: -0.5, ge: -0.9 + 0.06 * s(t * 8), dx: -0.5, de: -0.9 + 0.06 * s(t * 8 + 2), ty: 0.5 * s(t * 0.6) }
    case 'comptoir': return { ...base, dx: -0.9, de: -1.9 + 0.1 * s(t * 0.8), ty: 0.3 * s(t * 0.4) }
    case 'imprimante': return { ...base, gx: -0.7, ge: -0.5, dx: -0.7, de: -0.5, tx: 0.12 }
    case 'arpente': return { ...base, dx: -0.9, dz: -0.5, de: -2.1, tz: 0.25 }
    case 'marche': return { ...base, ge: -0.3, de: -0.3 }
    default: return { ...base, gx: -0.7, ge: -1.0 + 0.04 * s(t * 2), dx: -0.7, de: -1.0, tx: 0.25 } // attente : consulte son téléphone
  }
}
