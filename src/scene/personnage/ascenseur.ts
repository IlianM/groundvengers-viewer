/** Horaire des cabines d'ascenseur : fonction pure du temps, partagée par la cabine (dessin) et les usagers (trajets). */
export const DWELL = 3.2 // s d'arrêt à chaque étage
export const TRAJET = 1.8 // s entre deux étages
export const TOUR = DWELL + TRAJET
export const DEC_CABINE = 5.3 // décalage entre deux ascenseurs, pour qu'ils ne bougent pas ensemble

/** Nombre d'étapes d'un aller-retour sur n niveaux. */
export const cycle = (n: number) => 2 * Math.max(1, n - 1)
/** Niveau (indice) desservi à l'étape k. */
export const niveauEtape = (k: number, n: number) => {
  const c = cycle(n)
  const m = ((k % c) + c) % c
  return m <= n - 1 ? m : c - m
}

/** Position de la cabine (indice d'étage flottant) et ouverture des portes (0–1) à l'instant t. */
export function etage(t: number, n: number, dec: number): { i: number; porte: number } {
  if (n <= 1) return { i: 0, porte: 0 }
  const c = cycle(n)
  const u = (((t + dec) / TOUR) % c + c) % c
  const k = Math.floor(u)
  const f = u - k
  const attente = DWELL / TOUR
  const prog = f <= attente ? 0 : (f - attente) / (1 - attente)
  const lisse = prog * prog * (3 - 2 * prog)
  const a = niveauEtape(k, n), b = niveauEtape(k + 1, n)
  const porte = f <= attente ? Math.min(1, Math.min(f, attente - f) / 0.06) : 0
  return { i: a + (b - a) * lisse, porte }
}

/** Début du premier arrêt au niveau idx où l'on peut encore monter (au moins `marge` s avant la fermeture) à partir de `depuis`. */
export function arretOuvert(idx: number, n: number, dec: number, depuis: number, marge = 1.2): number {
  let k = Math.floor((depuis + dec) / TOUR) - 1
  for (;; k++) if (niveauEtape(k, n) === idx && k * TOUR - dec + DWELL - marge >= depuis) return k * TOUR - dec
}
/** Début du premier arrêt au niveau idx qui commence à partir de `tMin` (arrivée après un départ). */
export function arretApres(idx: number, n: number, dec: number, tMin: number): number {
  let k = Math.floor((tMin + dec) / TOUR) - 1
  for (;; k++) if (niveauEtape(k, n) === idx && k * TOUR - dec >= tMin - 1e-6) return k * TOUR - dec
}
