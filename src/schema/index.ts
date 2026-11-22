// Contrat de données commun aux trois équipes (section 7 de la proposition).
// Toute modification de ce fichier se décide en weekly.
import { z } from 'zod'

export const Equipe = z.enum(['domotique', 'cyber', 'ia'])
export type Equipe = z.infer<typeof Equipe>

export const StatutPreuve = z.enum(['sourcee', 'observee', 'simulee'])

export const Niveau = z.object({
  id: z.string(), // R0, R1, R2
  nom: z.string(),
  altitude: z.number(), // m, bas de la dalle
  hauteur: z.number(), // m, hauteur d'étage
})

export const Zone = z.object({
  id: z.string(),
  niveau: z.string(),
  nom: z.string(),
  type: z.enum(['open_space', 'bureau', 'reunion', 'hall', 'technique', 'circulation']),
  effectif_max: z.number().int().nonnegative(),
  detection_presence: z.boolean(),
  // rectangle au sol en mètres, dans le repère du bâtiment : [x, z, largeur, profondeur]
  rect: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  preuves: z.array(z.string()).default([]),
})
export type Zone = z.infer<typeof Zone>

export const Batiment = z.object({
  nom: z.string(),
  emprise: z.tuple([z.number(), z.number()]), // [largeur x, profondeur z] en m
  // chemin d'un .glb dans public/models ; null = bâtiment temporaire généré par le code
  modele: z.string().nullable(),
  niveaux: z.array(Niveau),
  zones: z.array(Zone),
})
export type Batiment = z.infer<typeof Batiment>

export const Categorie = z.enum([
  'capteur', 'actionneur', 'automate', 'compteur', 'passerelle', 'serveur',
  'firewall', 'switch', 'borne_wifi', 'baie', 'ecran', 'camera', 'lecteur_badge',
])
export type Categorie = z.infer<typeof Categorie>

export const NatureDonnee = z.enum(['technique', 'environnementale', 'occupation_agregee', 'identifiante'])
export type NatureDonnee = z.infer<typeof NatureDonnee>

export const Equipement = z.object({
  id: z.string(),
  equipe: Equipe,
  categorie: Categorie,
  type: z.string(),
  nom: z.string(),
  niveau: z.string(),
  zone: z.string().optional(),
  // position en m : [x, hauteur au-dessus de la dalle, z]
  position: z.tuple([z.number(), z.number(), z.number()]),
  protocole: z.string().optional(),
  reseau: z.enum(['GTB', 'bureautique', 'internet', 'aucun']).optional(),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  donnee: z.object({
    nature: NatureDonnee,
    identifiante: z.boolean(),
    conservation: z.string(),
    minimum_vital: z.boolean(),
    // période de mesure en secondes, pour compter les mesures par jour
    periode_s: z.number().positive().optional(),
  }),
  point_entree: z.boolean().default(false),
  risques: z.array(z.string()).default([]),
  preuves: z.array(z.string()).default([]),
  description: z.string().optional(),
})
export type Equipement = z.infer<typeof Equipement>

export const Lien = z.object({
  id: z.string(),
  equipe: Equipe,
  type: z.enum(['bus', 'cable', 'fibre', 'wifi', 'flux_reseau', 'flux_donnees']),
  protocole: z.string().optional(),
  de: z.string(),
  vers: z.array(z.string()).min(1),
  autorise_par_firewall: z.boolean().nullable().default(null),
  minimum_vital: z.boolean().default(true),
})
export type Lien = z.infer<typeof Lien>

export const NoeudIA = z.object({
  id: z.string(),
  heberge_sur: z.string(), // id d'un équipement
  architecture: z.enum(['edge', 'central']),
  modele: z.string(),
  entrees: z.array(z.string()),
  sorties: z.array(z.string()),
  frequence: z.string(),
  conservation: z.object({ brut: z.string(), agrege: z.string() }),
  mode_degrade: z.string(),
  preuves: z.array(z.string()).default([]),
})
export type NoeudIA = z.infer<typeof NoeudIA>

export const Preuve = z.object({
  id: z.string(),
  statut: StatutPreuve,
  titre: z.string(),
  document: z.string(),
  lien: z.string().nullable(),
})
export type Preuve = z.infer<typeof Preuve>

export const Risque = z.object({
  id: z.string(),
  nom: z.string(),
  impact: z.enum(['Faible', 'Moyen', 'Critique']),
  probabilite: z.enum(['Faible', 'Moyenne', 'Élevée']),
  preventif: z.string(),
  correctif: z.string(),
})
export type Risque = z.infer<typeof Risque>

export const FichierEquipe = z.object({
  equipements: z.array(Equipement).default([]),
  liens: z.array(Lien).default([]),
})

export const FichierIA = FichierEquipe.extend({
  noeuds: z.array(NoeudIA).default([]),
})

export const FichierPreuves = z.object({
  preuves: z.array(Preuve),
  risques: z.array(Risque).default([]),
})

export const Scene = z.object({
  titre: z.string(),
  texte: z.string(),
  vue: z.string(),
  niveau: z.string().nullable(),
  minimum_vital: z.boolean().optional(),
  architecture_ia: z.enum(['edge', 'central']).optional(),
  selection: z.string().nullable().default(null),
})
export type Scene = z.infer<typeof Scene>
export const FichierScenes = z.object({ scenes: z.array(Scene) })
