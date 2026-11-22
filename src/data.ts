// Charge les fichiers data/*.json, les valide contre le schéma commun et les fusionne.
// Les erreurs ne bloquent pas l'appli : elles s'affichent dans un bandeau rouge.
import batimentJson from '../data/batiment.json'
import domotiqueJson from '../data/domotique.json'
import cyberJson from '../data/cyber.json'
import iaJson from '../data/ia.json'
import preuvesJson from '../data/preuves.json'
import scenesJson from '../data/scenes.json'
import {
  Batiment, FichierEquipe, FichierIA, FichierPreuves, FichierScenes,
  type Equipement, type Lien, type NoeudIA, type Preuve, type Risque, type Scene, type Zone,
} from './schema'
import type { z } from 'zod'

export type Donnees = {
  batiment: z.infer<typeof Batiment>
  equipements: Equipement[]
  liens: Lien[]
  noeuds: NoeudIA[]
  preuves: Preuve[]
  risques: Risque[]
  scenes: Scene[]
  parId: Map<string, Equipement>
  zoneParId: Map<string, Zone>
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
    { nom: '?', emprise: [10, 10], modele: null, niveaux: [], zones: [] })
  const domo = valider('domotique.json', FichierEquipe, domotiqueJson, erreurs, { equipements: [], liens: [] })
  const cyber = valider('cyber.json', FichierEquipe, cyberJson, erreurs, { equipements: [], liens: [] })
  const ia = valider('ia.json', FichierIA, iaJson, erreurs, { equipements: [], liens: [], noeuds: [] })
  const pr = valider('preuves.json', FichierPreuves, preuvesJson, erreurs, { preuves: [], risques: [] })
  const sc = valider('scenes.json', FichierScenes, scenesJson, erreurs, { scenes: [] })

  const equipements = [...domo.equipements, ...cyber.equipements, ...ia.equipements]
  const liens = [...domo.liens, ...cyber.liens, ...ia.liens]
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
  for (const n of ia.noeuds) {
    if (!parId.has(n.heberge_sur)) erreurs.push(`${n.id} : hébergeur inconnu « ${n.heberge_sur} »`)
    for (const id of n.entrees) if (!parId.has(id)) erreurs.push(`${n.id} : entrée inconnue « ${id} »`)
  }

  return {
    donnees: {
      batiment, equipements, liens, noeuds: ia.noeuds, preuves: pr.preuves, risques: pr.risques,
      scenes: sc.scenes, parId, zoneParId,
    },
    erreurs,
  }
}

export const { donnees, erreurs } = chargerDonnees()

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

/** Position monde (Three.js) d'un équipement : bâtiment centré sur l'origine. */
export function positionMonde(e: Equipement, ecart = 0): [number, number, number] {
  const [w, d] = donnees.batiment.emprise
  return [e.position[0] - w / 2, altitudeNiveau(e.niveau, ecart) + e.position[1], e.position[2] - d / 2]
}
