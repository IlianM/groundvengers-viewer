// Une vue = quels équipements et liens on montre, et de quelle couleur.
// Chaque équipe enrichit sa vue ici sans toucher au socle.
import type { Equipement, Lien, Zone } from '../schema'
import { donnees } from '../data'

export type VueId = 'architecture' | 'domotique' | 'cyber' | 'ia' | 'donnees' | 'occupant'

export const COULEURS = {
  equipe: { domotique: '#2f9e44', cyber: '#e8590c', ia: '#7048e8' },
  protocole: {
    lonworks_ftt10: '#1c7ed6', mbus: '#f59f00', modbus_rs485: '#d6336c', dali: '#0ca678',
    ethernet: '#868e96', fibre: '#ae3ec9',
  } as Record<string, string>,
  reseau: { GTB: '#2f9e44', bureautique: '#1c7ed6', internet: '#e03131', aucun: '#868e96' } as Record<string, string>,
  nature: {
    technique: '#868e96', environnementale: '#37b24d', occupation_agregee: '#1c7ed6', identifiante: '#e03131',
  } as Record<string, string>,
  preuve: { sourcee: '#2b8a3e', observee: '#1971c2', simulee: '#e67700' } as Record<string, string>,
  neutre: '#adb5bd',
}

export const LIBELLES = {
  protocole: {
    lonworks_ftt10: 'LonWorks FTT10', mbus: 'M-Bus', modbus_rs485: 'Modbus RS485', dali: 'DALI',
    ethernet: 'Ethernet', fibre: 'Fibre optique',
  } as Record<string, string>,
  nature: {
    technique: 'Technique', environnementale: 'Environnementale', occupation_agregee: 'Occupation agrégée',
    identifiante: 'Potentiellement identifiante',
  } as Record<string, string>,
  preuve: { sourcee: 'Sourcée', observee: 'Observée', simulee: 'Simulée' } as Record<string, string>,
  categorie: {
    capteur: 'Capteurs', actionneur: 'Actionneurs', automate: 'Automates', compteur: 'Compteurs',
    passerelle: 'Passerelles', serveur: 'Serveurs', firewall: 'Firewall', switch: 'Switchs',
    borne_wifi: 'Bornes Wi-Fi', baie: 'Baies et coffrets', ecran: 'Écrans', camera: 'Caméras',
    lecteur_badge: 'Lecteurs de badge',
  } as Record<string, string>,
}

export type DefVue = {
  id: VueId
  nom: string
  description: string
  montre: (e: Equipement, ctx: Ctx) => boolean
  couleur: (e: Equipement, ctx: Ctx) => string
  lienVisible: (l: Lien) => boolean
  couleurLien: (l: Lien) => string
  legende: { couleur: string; libelle: string }[]
}

export type Ctx = { architectureIA: 'edge' | 'central' }

const entreesIA = (archi: 'edge' | 'central') =>
  new Set(donnees.noeuds.filter((n) => n.architecture === archi).flatMap((n) => n.entrees))
const hotesIA = (archi: 'edge' | 'central') =>
  new Set(donnees.noeuds.filter((n) => n.architecture === archi).map((n) => n.heberge_sur))

export const VUES: DefVue[] = [
  {
    id: 'architecture',
    nom: 'Architecture',
    description: 'Le bâtiment, ses niveaux et ses zones.',
    montre: () => false,
    couleur: () => COULEURS.neutre,
    lienVisible: () => false,
    couleurLien: () => COULEURS.neutre,
    legende: [],
  },
  {
    id: 'domotique',
    nom: 'Domotique',
    description: 'Capteurs, actionneurs, automates et bus de terrain, colorés par protocole.',
    montre: (e) => e.equipe === 'domotique',
    couleur: (e) => COULEURS.protocole[e.protocole ?? ''] ?? COULEURS.neutre,
    lienVisible: (l) => l.equipe === 'domotique',
    couleurLien: (l) => COULEURS.protocole[l.protocole ?? ''] ?? COULEURS.neutre,
    legende: Object.entries(LIBELLES.protocole).map(([k, v]) => ({ couleur: COULEURS.protocole[k], libelle: v })),
  },
  {
    id: 'cyber',
    nom: 'Cyber',
    description: 'Réseaux, firewall, Wi-Fi, baies et points d’entrée.',
    montre: (e) =>
      e.equipe === 'cyber' || e.point_entree || ['serveur', 'passerelle', 'automate', 'ecran'].includes(e.categorie),
    couleur: (e) => (e.reseau ? COULEURS.reseau[e.reseau] : '#495057'),
    lienVisible: (l) => l.equipe === 'cyber' || l.protocole === 'ethernet',
    couleurLien: (l) =>
      l.autorise_par_firewall === false ? '#e03131' : l.type === 'fibre' ? COULEURS.protocole.fibre : '#495057',
    legende: [
      { couleur: COULEURS.reseau.GTB, libelle: 'Réseau GTB isolé (volume vert)' },
      { couleur: COULEURS.reseau.bureautique, libelle: 'Réseau bureautique (volume bleu)' },
      { couleur: COULEURS.reseau.internet, libelle: 'Internet' },
      { couleur: '#f08c00', libelle: 'Montante technique (colonne orange)' },
      { couleur: COULEURS.protocole.fibre, libelle: 'Gaine fibre (chemin violet)' },
      { couleur: '#495057', libelle: 'Équipement de coupure (firewall, baie)' },
      { couleur: '#e03131', libelle: 'Flux bloqué / point d’entrée (anneau)' },
    ],
  },
  {
    id: 'ia',
    nom: 'IA',
    description: 'Où tourne le calcul, ce qu’il reçoit, ce qu’il garde.',
    montre: (e, ctx) =>
      entreesIA(ctx.architectureIA).has(e.id) || hotesIA(ctx.architectureIA).has(e.id),
    couleur: (e, ctx) => (hotesIA(ctx.architectureIA).has(e.id) ? COULEURS.equipe.ia : '#748ffc'),
    lienVisible: () => false, // les flux IA sont dessinés depuis les nœuds (scene/FluxIA)
    couleurLien: () => COULEURS.equipe.ia,
    legende: [
      { couleur: COULEURS.equipe.ia, libelle: 'Nœud de calcul IA' },
      { couleur: '#748ffc', libelle: 'Capteur utilisé en entrée' },
      { couleur: '#e03131', libelle: 'Zone trop petite pour être anonyme' },
    ],
  },
  {
    id: 'donnees',
    nom: 'Données',
    description: 'Nature de chaque donnée. Basculez « Tout collecter / Minimum vital ».',
    montre: () => true,
    couleur: (e) => COULEURS.nature[e.donnee.nature],
    lienVisible: () => true,
    couleurLien: () => '#ced4da',
    legende: Object.entries(LIBELLES.nature).map(([k, v]) => ({ couleur: COULEURS.nature[k], libelle: v })),
  },
  {
    id: 'occupant',
    nom: 'Occupant',
    description: 'Ce que chaque capteur mesure, en langage simple.',
    montre: (e) => ['capteur', 'camera', 'lecteur_badge'].includes(e.categorie),
    couleur: (e) => (e.donnee.identifiante ? '#e03131' : '#37b24d'),
    lienVisible: () => false,
    couleurLien: () => COULEURS.neutre,
    legende: [
      { couleur: '#37b24d', libelle: 'Ne permet pas de vous identifier' },
      { couleur: '#e03131', libelle: 'Peut vous identifier' },
    ],
  },
]

export const vueParId = (id: VueId) => VUES.find((v) => v.id === id)!

/** Phrase affichée aux occupants pour un capteur (vue Occupant, F-28). */
export function phraseOccupant(e: Equipement): string {
  const garde = e.donnee.conservation === 'aucune' ? 'aucune donnée n’est stockée' : `conservation : ${e.donnee.conservation}`
  switch (e.type) {
    case 'co2': return `Mesure uniquement le CO2 de la pièce ; ${garde}.`
    case 'temperature': return `Mesure uniquement la température ; ${garde}.`
    case 'presence_ir': return e.donnee.identifiante
      ? 'Détecte une présence dans une petite pièce : peut révéler qui est là.'
      : `Compte une présence dans la zone, sans image ni identité ; ${garde}.`
    case 'presence_poste': return 'Détecte si VOTRE poste est occupé : donnée individuelle.'
    case 'camera_ip': return 'Filme le hall : image identifiante.'
    case 'badge_nominatif': return 'Enregistre votre nom et votre heure d’arrivée.'
    default: return garde
  }
}

/** Règle DPO (F-25) : une zone avec détection de présence et moins de N personnes n'est pas anonyme. */
// En mode minimum vital, une zone n'est signalée que si un capteur de présence y reste actif.
export const zoneNonAnonyme = (z: Zone, seuil: number, minimumVital = false) =>
  z.detection_presence &&
  z.effectif_max < seuil &&
  (!minimumVital ||
    donnees.equipements.some((e) => e.zone === z.id && e.type.startsWith('presence') && e.donnee.minimum_vital))
