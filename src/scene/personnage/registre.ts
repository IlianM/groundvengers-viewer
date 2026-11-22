import type { Occupant, Pose } from './comportement'

/** État partagé entre la scène 3D et la fiche personne (mis à jour par la scène, lu par l'interface). */
export const registre = {
  occupants: [] as Occupant[],
  horloge: 0, // secondes d'animation écoulées (déjà multipliées par la vitesse)
  positions: new Map<string, [number, number, number]>(), // position monde de chaque personnage
  poses: new Map<string, Pose>(),
}
