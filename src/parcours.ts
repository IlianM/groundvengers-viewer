import { donnees } from './data'
import type { Equipement, Lien } from './schema'

export type EtapeParcours = { equipement: Equipement; via?: Lien }

/**
 * Chemin que suit une donnée, de l'équipement qui la produit jusqu'au serveur de supervision le plus proche
 * (en priorité Niagara), en suivant les liens du réseau. Vide si l'équipement ne mène à aucun serveur.
 */
export function parcoursDonnee(id: string): EtapeParcours[] {
  const depart = donnees.parId.get(id)
  if (!depart) return []
  if (depart.categorie === 'serveur') return [{ equipement: depart }]
  const voisins = new Map<string, { id: string; l: Lien }[]>()
  const ajouter = (a: string, b: string, l: Lien) => voisins.set(a, [...(voisins.get(a) ?? []), { id: b, l }])
  for (const l of donnees.liens) for (const v of l.vers) { ajouter(l.de, v, l); ajouter(v, l.de, l) }
  // parcours en largeur : le plus court chemin vers un serveur
  const prec = new Map<string, { de: string; l: Lien } | null>([[id, null]])
  const file = [id]
  const serveurs: string[] = []
  while (file.length) {
    const cur = file.shift()!
    if (cur !== id && donnees.parId.get(cur)?.categorie === 'serveur') serveurs.push(cur)
    for (const n of voisins.get(cur) ?? []) if (!prec.has(n.id)) { prec.set(n.id, { de: cur, l: n.l }); file.push(n.id) }
  }
  if (!serveurs.length) return []
  const cible = serveurs.find((s) => s.includes('NIAGARA')) ?? serveurs[0]
  const chemin: EtapeParcours[] = []
  for (let cur: string | undefined = cible; cur; ) {
    const p = prec.get(cur)
    const eq = donnees.parId.get(cur)
    if (eq) chemin.unshift({ equipement: eq, via: p?.l })
    cur = p?.de
  }
  return chemin
}
