// Réglages de personnalisation : valeurs par défaut, bornes, validation et format d'échange (import / export).
// Toute valeur invalide ou hors bornes est ramenée à la borne ou au défaut : une config importée ne peut pas casser l'appli.
import { z } from 'zod'

const nombre = (def: number, min: number, max: number) =>
  z.number().finite().transform((v) => Math.min(max, Math.max(min, v))).catch(def)
const entier = (def: number, min: number, max: number) =>
  z.number().finite().transform((v) => Math.round(Math.min(max, Math.max(min, v)))).catch(def)
const bool = (def: boolean) => z.boolean().catch(def)
const choix = <T extends string>(def: T, valeurs: readonly [T, ...T[]]) => z.enum(valeurs).catch(def)
const couleur = z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().catch(null)

export const VUES_IDS = ['architecture', 'domotique', 'cyber', 'ia', 'donnees', 'occupant', 'risques'] as const

export const Reglages = z.object({
  // Interface
  accent: couleur,
  tailleTexte: entier(100, 80, 140),
  largeurGauche: entier(300, 240, 440),
  largeurDroite: entier(320, 260, 480),
  panneauGauche: bool(true),
  panneauDroit: bool(true),
  bandeauBas: bool(true),
  mentionFictif: bool(true),
  boutonsCamera: bool(true),
  recherche: bool(true),
  aideClavier: bool(true),
  // Étiquettes et infobulles
  etiquettesZones: bool(true),
  etiquettesNiveaux: bool(true),
  infobulles: bool(true),
  tailleEtiquettes: entier(100, 70, 160),
  // Caméra et navigation
  fov: entier(42, 25, 80),
  rotationAuto: bool(false),
  vitesseRotation: nombre(1, 0.2, 4),
  sensRotation: nombre(1, 0.3, 2.5),
  sensZoom: nombre(1, 0.3, 2.5),
  sensDeplacement: nombre(1, 0.3, 2.5),
  vitesseClavier: nombre(1, 0.4, 3),
  distanceMax: entier(120, 60, 260),
  animations: bool(true),
  vitesseCamera: nombre(1, 0.4, 3),
  // Rendu
  qualite: choix('normale', ['economique', 'normale', 'haute'] as const),
  brouillard: bool(true),
  densiteBrouillard: nombre(1, 0.2, 3),
  couleurCiel: couleur,
  couleurHerbe: couleur,
  // Éléments 3D
  tailleEquipements: nombre(1, 0.5, 2.5),
  epaisseurLiens: nombre(1, 0.5, 3),
  opaciteZones: nombre(1, 0.3, 2),
  opaciteMeubles: nombre(0.4, 0.1, 1),
  anneaux: bool(true),
  personnages: bool(true),
  personnagesToutesVues: bool(false), // sinon : seulement dans les vues Architecture et Occupant, pour ne pas masquer les équipements
  // 20 par défaut ; null = effectifs de la simulation ; sinon nombre total de personnes imposé (réparti selon l'occupation simulée)
  effectifForce: z.number().finite().transform((v) => Math.round(Math.min(300, Math.max(0, v)))).nullable().catch(20),
  vitessePersonnages: nombre(1, 0.3, 2.5),
  ascenseurs: bool(true),
  // Éclatement
  ecartNiveaux: nombre(5, 2, 14),
  ecartPieces: nombre(0.5, 0.2, 1.2),
  // Décor
  densiteArbres: entier(100, 0, 100),
  nbImmeubles: entier(16, 0, 16),
  graineDecor: entier(7, 1, 999),
  // Démarrage et animations
  demarrageVue: choix('architecture', VUES_IDS),
  demarrageMinimumVital: bool(false),
  demarrageSeuil: entier(5, 2, 20),
  dureeEtapeScenario: nombre(3, 1, 10),
  vitesseJournee: nombre(0.5, 0.1, 3),
})
export type Reglages = z.infer<typeof Reglages>
export const REGLAGES_DEFAUT: Reglages = Reglages.parse({})

export const DECO_IDS = ['herbe', 'arbres', 'batiments', 'meubles', 'structure'] as const
const Deco = z.object(Object.fromEntries(DECO_IDS.map((k) => [k, z.boolean().catch(true)])) as Record<(typeof DECO_IDS)[number], z.ZodCatch<z.ZodBoolean>>)

export const FORMAT_CONFIG = 'groundvengers-config'
export const Config = z.object({
  format: z.literal(FORMAT_CONFIG),
  version: z.number().int().positive(),
  theme: z.enum(['clair', 'sombre']).catch('clair'),
  deco: Deco.catch(Deco.parse({})),
  reglages: Reglages.catch(REGLAGES_DEFAUT),
})
export type Config = z.infer<typeof Config>

/** Lit un texte JSON de configuration ; renvoie la config propre ou la raison du refus. */
export function lireConfig(texte: string): { ok: true; config: Config; ignores: string[] } | { ok: false; raison: string } {
  let brut: unknown
  try { brut = JSON.parse(texte) } catch { return { ok: false, raison: 'Ce texte n’est pas du JSON valide.' } }
  if (typeof brut !== 'object' || brut === null || (brut as { format?: unknown }).format !== FORMAT_CONFIG) {
    return { ok: false, raison: `Ce n’est pas une configuration GroundVengers (champ « format » attendu : ${FORMAT_CONFIG}).` }
  }
  const r = Config.safeParse(brut)
  if (!r.success) return { ok: false, raison: 'Configuration illisible : ' + r.error.issues.slice(0, 2).map((i) => i.path.join('.') + ' ' + i.message).join(' ; ') }
  const connus = new Set(Object.keys(REGLAGES_DEFAUT))
  const recus = Object.keys(((brut as { reglages?: object }).reglages ?? {}) as object)
  return { ok: true, config: r.data, ignores: recus.filter((k) => !connus.has(k)) }
}
