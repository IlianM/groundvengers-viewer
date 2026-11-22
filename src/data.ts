// Charge les fichiers data/*.json, les valide contre le schéma commun et les fusionne.
// Les erreurs ne bloquent pas l'appli : elles s'affichent dans un bandeau rouge.
import batimentJson from '../data/batiment.json'
import domotiqueJson from '../data/domotique.json'
import cyberJson from '../data/cyber.json'
import iaJson from '../data/ia.json'
import preuvesJson from '../data/preuves.json'
import scenesJson from '../data/scenes.json'
import {
  Batiment, FichierEquipe, type Gaine, type Scenario, FichierIA, FichierPreuves, FichierScenes,
  type Equipement, type Lien, type NoeudIA, type Preuve, type Risque, type Scene, type Zone,
} from './schema'
import type { z } from 'zod'

export type Donnees = {
  batiment: z.infer<typeof Batiment>
  equipements: Equipement[]
  liens: Lien[]
  gaines: Gaine[]
  scenarios: Scenario[]
  noeuds: NoeudIA[]
  preuves: Preuve[]
  risques: Risque[]
  scenes: Scene[]
  parId: Map<string, Equipement>
  zoneParId: Map<string, Zone>
  gaineParId: Map<string, Gaine>
}

function valider<T>(fichier: string, schema: z.ZodType<T>, brut: unknown, erreurs: string[], vide: T): T {
  const r = schema.safeParse(brut)
  if (r.success) return r.data
  for (const issue of r.error.issues.slice(0, 5)) {
    erreurs.push(`${fichier} → ${issue.path.join('.')} : ${issue.message}`)
  }
  return vide
}

export function chargerDonnees(): { donnees: Donnees; erreurs: string[] } {
  const erreurs: string[] = []
  const batiment = valider('batiment.json', Batiment, batimentJson, erreurs,
    { nom: '?', emprise: [10, 10], modele: null, niveaux: [], zones: [], ascenseurs: [] })
  const domo = valider('domotique.json', FichierEquipe, domotiqueJson, erreurs, { equipements: [], liens: [], gaines: [], scenarios: [] })
  const cyber = valider('cyber.json', FichierEquipe, cyberJson, erreurs, { equipements: [], liens: [], gaines: [], scenarios: [] })
  const ia = valider('ia.json', FichierIA, iaJson, erreurs, { equipements: [], liens: [], gaines: [], scenarios: [], noeuds: [] })
  const pr = valider('preuves.json', FichierPreuves, preuvesJson, erreurs, { preuves: [], risques: [] })
  const sc = valider('scenes.json', FichierScenes, scenesJson, erreurs, { scenes: [] })

  const equipements = [...domo.equipements, ...cyber.equipements, ...ia.equipements]
  const liens = [...domo.liens, ...cyber.liens, ...ia.liens]
  const gaines = [...domo.gaines, ...cyber.gaines, ...ia.gaines]
  const scenarios = [...domo.scenarios, ...cyber.scenarios, ...ia.scenarios]
  const parId = new Map<string, Equipement>()
  for (const e of equipements) {
    if (parId.has(e.id)) erreurs.push(`Identifiant en double : ${e.id}`)
    parId.set(e.id, e)
  }
  const zoneParId = new Map(batiment.zones.map((z) => [z.id, z]))
  const niveaux = new Set(batiment.niveaux.map((n) => n.id))
  const preuveIds = new Set(pr.preuves.map((p) => p.id))
  const risqueIds = new Set(pr.risques.map((r) => r.id))

  // Contrôles de cohérence entre fichiers : identifiants orphelins
  for (const e of equipements) {
    if (!niveaux.has(e.niveau)) erreurs.push(`${e.id} : niveau inconnu « ${e.niveau} »`)
    if (e.zone && !zoneParId.has(e.zone)) erreurs.push(`${e.id} : zone inconnue « ${e.zone} »`)
    for (const p of e.preuves) if (!preuveIds.has(p)) erreurs.push(`${e.id} : preuve inconnue « ${p} »`)
    for (const r of e.risques) if (!risqueIds.has(r)) erreurs.push(`${e.id} : risque inconnu « ${r} »`)
  }
  for (const l of liens) {
    for (const id of [l.de, ...l.vers]) if (!parId.has(id)) erreurs.push(`${l.id} : équipement inconnu « ${id} »`)
  }
  const gaineParId = new Map<string, Gaine>()
  const lienIds = new Set(liens.map((l) => l.id))
  for (const g of gaines) {
    if (gaineParId.has(g.id)) erreurs.push(`Identifiant en double : ${g.id}`)
    gaineParId.set(g.id, g)
    if (g.type === 'horizontale' && (!g.niveau || !niveaux.has(g.niveau))) erreurs.push(`${g.id} : niveau manquant ou inconnu`)
    if (g.type === 'horizontale' && g.chemin.length < 2) erreurs.push(`${g.id} : un chemin horizontal demande au moins 2 points`)
    if (g.type === 'montante' && (!g.de || !g.a || !niveaux.has(g.de) || !niveaux.has(g.a))) erreurs.push(`${g.id} : « de » et « a » doivent être des niveaux connus`)
    for (const l of g.contient) if (!lienIds.has(l)) erreurs.push(`${g.id} : lien inconnu « ${l} »`)
    for (const pr of g.preuves) if (!preuveIds.has(pr)) erreurs.push(`${g.id} : preuve inconnue « ${pr} »`)
  }
  for (const sc of scenarios) {
    for (const [i, et] of sc.etapes.entries()) {
      for (const id of [et.de, et.vers]) if (id !== 'externe' && !parId.has(id)) erreurs.push(`${sc.id} étape ${i + 1} : équipement inconnu « ${id} »`)
      if (et.vers === 'externe') erreurs.push(`${sc.id} étape ${i + 1} : « externe » ne peut être qu'au départ`)
    }
    for (const r of sc.risques) if (!risqueIds.has(r)) erreurs.push(`${sc.id} : risque inconnu « ${r} »`)
  }
  for (const n of ia.noeuds) {
    if (!parId.has(n.heberge_sur)) erreurs.push(`${n.id} : hébergeur inconnu « ${n.heberge_sur} »`)
    for (const id of n.entrees) if (!parId.has(id)) erreurs.push(`${n.id} : entrée inconnue « ${id} »`)
  }

  return {
    donnees: {
      batiment, equipements, liens, gaines, scenarios, noeuds: ia.noeuds, preuves: pr.preuves, risques: pr.risques,
      scenes: sc.scenes, parId, zoneParId, gaineParId,
    },
    erreurs,
  }
}

export const { donnees, erreurs } = chargerDonnees()

/** Écart horizontal des pièces en vue éclatée : part de la distance au centre du bâtiment (à pieces = 1). */
/** Paramètres modifiables à l'exécution (réglages) : écart horizontal des pièces à pieces = 1. */
export const parametres = { ecartPieces: 0.5 }

/** Zone d'un niveau contenant le point [x, z] (repère bâtiment), ou la plus proche. */
export function zoneContenant(niveau: string, x: number, z: number): Zone | undefined {
  let meilleure: Zone | undefined
  let dMin = Infinity
  for (const zn of donnees.batiment.zones) {
    if (zn.niveau !== niveau) continue
    const [rx, rz, rw, rd] = zn.rect
    const dx = Math.max(rx - x, 0, x - (rx + rw))
    const dz = Math.max(rz - z, 0, z - (rz + rd))
    const d = dx * dx + dz * dz
    if (d < dMin) { dMin = d; meilleure = zn }
  }
  return meilleure
}

/** Décalage horizontal [dx, dz] d'une zone quand les pièces s'écartent (0 ≤ pieces ≤ 1). */
export function decalageZone(zn: Zone | undefined, pieces: number): [number, number] {
  if (!zn || !pieces) return [0, 0]
  const [w, d] = donnees.batiment.emprise
  return [(zn.rect[0] + zn.rect[2] / 2 - w / 2) * parametres.ecartPieces * pieces, (zn.rect[1] + zn.rect[3] / 2 - d / 2) * parametres.ecartPieces * pieces]
}

/** Décalage vertical d'un niveau en vue éclatée : chaque niveau monte de (rang × écart). */
export function decalageNiveau(id: string, ecart: number): number {
  if (!ecart) return 0
  const tries = [...donnees.batiment.niveaux].sort((a, b) => a.altitude - b.altitude)
  return Math.max(0, tries.findIndex((n) => n.id === id)) * ecart
}

/** Altitude monde du bas de la dalle d'un niveau, vue éclatée comprise. */
export function altitudeNiveau(id: string, ecart = 0): number {
  return (donnees.batiment.niveaux.find((n) => n.id === id)?.altitude ?? 0) + decalageNiveau(id, ecart)
}

/** Point monde (Three.js) à partir de coordonnées bâtiment [x, h au-dessus de la dalle, z] ; zone = pièce qui se déplace avec l'éclatement. */
export function pointMonde(niveau: string, x: number, h: number, z: number, ecart = 0, pieces = 0, zone?: Zone): [number, number, number] {
  const [w, d] = donnees.batiment.emprise
  const [dx, dz] = decalageZone(zone ?? zoneContenant(niveau, x, z), pieces)
  return [x - w / 2 + dx, altitudeNiveau(niveau, ecart) + h, z - d / 2 + dz]
}

/** Position monde (Three.js) d'un équipement : bâtiment centré sur l'origine. */
export function positionMonde(e: Equipement, ecart = 0, pieces = 0): [number, number, number] {
  return pointMonde(e.niveau, e.position[0], e.position[1], e.position[2], ecart, pieces, e.zone ? donnees.zoneParId.get(e.zone) : undefined)
}
