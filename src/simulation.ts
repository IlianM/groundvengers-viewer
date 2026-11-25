import type { Zone } from './schema'
import { zoneNonAnonyme } from './views'
import { donnees } from './data'

/** Simulation d'une journée (F-26) : profils d'occupation FICTIFS, déterministes (pas d'aléa à l'exécution). */

const bosse = (h: number, debut: number, fin: number, montee = 0.5) =>
  Math.max(0, Math.min(1, (h - debut) / montee, (fin - h) / montee))

/** Petit bruit stable par zone (0.8–1.0), pour que deux zones du même type ne soient pas identiques. */
function jitter(id: string, h: number): number {
  let s = 0
  for (const c of id) s = (s * 31 + c.charCodeAt(0)) % 997
  return 0.8 + 0.2 * Math.abs(Math.sin(s + Math.floor(h * 2)))
}

/** Taux d'occupation (0–1) d'une zone à l'heure h (0–24). */
export function tauxOccupation(z: Zone, h: number): number {
  if (z.effectif_max === 0) return 0
  const jour = bosse(h, 8, 18.5, 1.2)
  const midi = bosse(h, 12, 13.75, 0.4)
  switch (z.type) {
    case 'open_space':
      if (z.amenagement === 'cafeteria') return Math.max(0.6 * midi, 0.25 * bosse(h, 9.75, 10.5) + 0.2 * bosse(h, 15.75, 16.5))
      return jour * (0.9 - 0.55 * midi)
    case 'bureau': return jour * (0.9 - 0.7 * midi)
    case 'reunion': {
      const decalage = z.id.length % 2 ? 0 : 0.5 // les salles ne se remplissent pas toutes en même temps
      return 0.75 * Math.max(bosse(h, 9.5 + decalage, 11 + decalage, 0.15), bosse(h, 14 + decalage, 15.5 + decalage, 0.15), 0.8 * bosse(h, 16.5, 17.5, 0.15))
    }
    case 'hall': return Math.max(0.9 * bosse(h, 8, 9.5, 0.4), 0.5 * bosse(h, 12, 14, 0.4), 0.7 * bosse(h, 17, 18.5, 0.4))
    default: return 0
  }
}

export const effectifSimule = (z: Zone, h: number) =>
  Math.min(z.effectif_max, Math.round(z.effectif_max * tauxOccupation(z, h) * jitter(z.id, h)))

/** Zone où quelqu'un est présent, avec détection de présence active, mais moins de `seuil` personnes. */
export const identifiableA = (z: Zone, n: number, seuil: number, minimumVital: boolean) =>
  n > 0 && zoneNonAnonyme({ ...z, effectif_max: n }, seuil, minimumVital)

export const formatHeure = (h: number) => {
  const m = Math.round(h * 60) % (24 * 60)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Température simulée d'une zone (°C) : l'extérieur se réchauffe dans la journée, les occupants ajoutent un peu de chaleur. */
export function temperatureZone(z: Zone, h: number, n: number): number {
  const soleil = Math.max(0, Math.sin((Math.PI * (h - 6)) / 14))
  const etage = ((donnees.batiment.niveaux.find((n) => n.id === z.niveau)?.altitude ?? 4) - 4) * 0.08 // un peu plus chaud en montant
  const technique = z.type === 'technique' ? 3 : 0
  return 18.6 + 3.4 * soleil + 0.07 * n + etage + technique
}

/** Éclairement simulé (lux) : lumière du jour + éclairage d'appoint tant que la zone est occupée. */
export function luminositeZone(h: number, n: number): number {
  const jour = Math.max(0, Math.sin((Math.PI * (h - 6.5)) / 12)) * 350
  return Math.round(n > 0 ? Math.max(450, jour + 250) : jour * 0.3)
}

/** Heure affichée quand la simulation d'une journée est éteinte : une matinée de travail type. */
export const HEURE_AMBIANTE = 10.5

/** Nombre de places de travail de tout le bâtiment : plafond du nombre de personnes affichables. */
export const capaciteTotale = () => donnees.batiment.zones.reduce((a, z) => a + z.effectif_max, 0)

/**
 * Effectif de chaque zone à l'heure h. Avec `force`, le total est imposé : il est réparti entre les zones
 * proportionnellement à l'occupation simulée (à la capacité si le bâtiment est vide), sans dépasser l'effectif max.
 */
export function effectifsZones(h: number, force: number | null): Map<string, number> {
  const zones = donnees.batiment.zones
  const simule = new Map(zones.map((z) => [z.id, effectifSimule(z, h)]))
  if (force === null) return simule
  const somme = [...simule.values()].reduce((a, b) => a + b, 0)
  const poids = new Map(zones.map((z) => [z.id, z.effectif_max === 0 ? 0 : somme > 0 ? simule.get(z.id)! : z.effectif_max]))
  const sortie = new Map(zones.map((z) => [z.id, 0]))
  let reste = Math.min(Math.max(0, Math.round(force)), capaciteTotale())
  while (reste > 0) {
    const actives = zones.filter((z) => sortie.get(z.id)! < z.effectif_max && poids.get(z.id)! > 0)
    // si les zones pondérées sont pleines, on complète dans les autres, au prorata de leur capacité
    const candidates = actives.length ? actives : zones.filter((z) => sortie.get(z.id)! < z.effectif_max)
    if (!candidates.length) break
    const W = candidates.reduce((a, z) => a + (actives.length ? poids.get(z.id)! : z.effectif_max), 0)
    const quotas = candidates.map((z) => ({ z, q: (reste * (actives.length ? poids.get(z.id)! : z.effectif_max)) / W }))
    let donne = 0
    for (const { z, q } of quotas) {
      const n = Math.min(Math.floor(q), z.effectif_max - sortie.get(z.id)!)
      sortie.set(z.id, sortie.get(z.id)! + n); donne += n
    }
    reste -= donne
    if (donne === 0) { // plus petits restes : on distribue les dernières personnes une à une
      quotas.sort((a, b) => (b.q - Math.floor(b.q)) - (a.q - Math.floor(a.q)))
      for (const { z } of quotas) { if (reste <= 0) break; sortie.set(z.id, sortie.get(z.id)! + 1); reste-- }
    }
  }
  return sortie
}
