import { donnees } from './data'
import type { Scenario } from './schema'

/** Un équipement absent en mode Minimum vital coupe le chemin du scénario à partir de son étape. */
export function etapeCoupee(sc: Scenario, minimumVital: boolean): { index: number; equipement: string } | null {
  if (!minimumVital) return null
  for (const [i, et] of sc.etapes.entries()) {
    for (const id of [et.de, et.vers]) {
      const e = donnees.parId.get(id)
      if (e && !e.donnee.minimum_vital) return { index: i, equipement: e.nom }
    }
  }
  return null
}
