import type { Poi, Voie } from '../Mobilier'

/** Ce que fait un personnage à un instant donné : fonction pure du temps, donc rejouable et sans état caché. */
export type Pose =
  | 'taper' | 'souris' | 'croise' | 'penser' | 'telephone' | 'lire' | 'etire' | 'boire' | 'discute'
  | 'reunion' | 'note' | 'presente' | 'attente' | 'accueil' | 'comptoir' | 'marche' | 'imprimante' | 'arpente'

export const LIBELLE_POSE: Record<Pose, string> = {
  taper: 'Travaille sur son poste', souris: 'Travaille sur son poste', croise: 'Réfléchit, bras croisés', penser: 'Réfléchit à un problème',
  telephone: 'Au téléphone', lire: 'Lit un document', etire: 'S’étire', boire: 'Prend un café', discute: 'Discute avec un collègue',
  reunion: 'Écoute en réunion', note: 'Prend des notes', presente: 'Présente en réunion', attente: 'Attend à l’accueil',
  accueil: 'Accueille les visiteurs', comptoir: 'Attend au comptoir', marche: 'Se déplace', imprimante: 'Récupère une impression', arpente: 'Téléphone en marchant',
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
}

export type Etat = {
  x: number; z: number; ry: number
  assis: boolean
  marche: boolean
  pose: Pose
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

export function etatDe(o: Occupant, t: number): Etat {
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
  if (o.routes && o.routes.length) {
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
  if (o.tache === 'bureau' && !o.routes?.length) {
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

/** Angles cibles (rad) des bras, de la tête et du buste pour une pose ; t en secondes. */
export type Cible = { gx: number; gz: number; dx: number; dz: number; tx: number; ty: number; tz: number; bx: number; by: number }
export function cibleDe(pose: Pose, t: number): Cible {
  const base: Cible = { gx: 0.05, gz: 0, dx: 0.05, dz: 0, tx: 0, ty: 0, tz: 0, bx: 0, by: 0 }
  const s = Math.sin
  switch (pose) {
    case 'taper': return { ...base, gx: -1.25 + 0.06 * s(t * 9), dx: -1.25 + 0.06 * s(t * 9 + 2), tx: 0.12 }
    case 'souris': return { ...base, gx: -1.25 + 0.03 * s(t * 8), dx: -1.12 + 0.05 * s(t * 2.5), tx: 0.1 }
    case 'croise': return { ...base, gx: -1.1, gz: 1.15, dx: -1.1, dz: -1.15, bx: -0.15, ty: 0.3 * s(t * 0.4) }
    case 'penser': return { ...base, gx: -1.15, dx: -2.05, dz: -0.25, tx: 0.2, tz: 0.08, bx: 0.08 }
    case 'telephone': return { ...base, gx: -1.1, dx: -2.25, dz: -0.1, tz: 0.25, ty: 0.15 }
    case 'lire': return { ...base, gx: -1.15, dx: -1.15, tx: 0.5, bx: 0.14 }
    case 'etire': return { ...base, gx: -3.0 + 0.1 * s(t * 2), gz: 0.3, dx: -3.0 + 0.1 * s(t * 2 + 1), dz: -0.3, tx: -0.2, bx: -0.12 }
    case 'boire': return { ...base, gx: -1.2, dx: -1.95 + 0.12 * s(t * 0.9), tx: -0.1, ty: 0.3 * s(t * 0.5) }
    case 'discute': return { ...base, gx: -0.9 + 0.4 * s(t * 3), dx: -1.0 + 0.4 * s(t * 3 + 1.5), ty: 0.6 * s(t * 0.8), by: 0.15 * s(t * 0.8) }
    case 'reunion': return { ...base, gx: -0.95, dx: -0.95, ty: 0.6 * s(t * 0.7) }
    case 'note': return { ...base, gx: -1.0, dx: -1.2 + 0.1 * s(t * 5), tx: 0.5, bx: 0.1 }
    case 'presente': return { ...base, dx: -2.5 + 0.18 * s(t * 1.6), dz: -0.15, gz: 0.15, by: 0.25 * s(t * 0.5) }
    case 'accueil': return { ...base, gx: -1.2 + 0.06 * s(t * 8), dx: -1.2 + 0.06 * s(t * 8 + 2), ty: 0.5 * s(t * 0.6) }
    case 'comptoir': return { ...base, dx: -1.75 + 0.1 * s(t * 0.8), ty: 0.3 * s(t * 0.4) }
    case 'imprimante': return { ...base, gx: -1.3, dx: -1.3, tx: 0.12 }
    case 'arpente': return { ...base, dx: -2.25, dz: -0.1, tz: 0.25 }
    case 'marche': return { ...base }
    default: return { ...base, gx: -1.1 + 0.04 * s(t * 2), dx: -1.1, tx: 0.25 } // attente : consulte son téléphone
  }
}
