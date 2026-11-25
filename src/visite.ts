// Visite guidée de toute l'application : une suite d'étapes qui règlent l'état (vue, niveau, mode, caméra, sélection…),
// montrent l'élément d'interface concerné et expliquent ce qu'on voit. Chaque étape part d'un état de base identique :
// on peut donc avancer, reculer ou sauter sans que l'étape précédente laisse des restes.
import { donnees, pointMonde } from './data'
import { useEtat, CAMERA_DEFAUT } from './store'
import { registre } from './scene/personnage/registre'
import type { VueId } from './views'
import type { Zone } from './schema'

type Vec3 = [number, number, number]
type Base = {
  vue?: VueId; niveau?: string | null; minimumVital?: boolean; eclate?: boolean; pieces?: boolean; comparaison?: boolean
  simulation?: { heure: number; lecture: boolean }; ia?: 'edge' | 'central'; camera?: [Vec3, Vec3]
}

export type Etape = {
  titre: string
  texte: string
  cible?: string // sélecteur CSS de l'élément d'interface à mettre en évidence
  base?: Base
  extra?: () => void // réglages propres à l'étape, appliqués après l'état de base
}

// Points de vue : le bâtiment fait environ 100 m × 30 m, centré sur l'origine, du sous-sol 2 (−5,85 m) à la toiture (+15 m).
const DESSUS: [Vec3, Vec3] = [[0.01, 150, 0.01], [0, 0, 0]]
const GENERAL = (x: number, y: number, z: number): [Vec3, Vec3] => [[x, y, z], [0, 3, 0]]
/** Le plus grand open space (hors cafétéria) : le décor des étapes sur les personnes et les postes. */
const openDemo: Zone | undefined = donnees.batiment.zones
  .filter((z) => z.type === 'open_space' && !z.amenagement)
  .sort((a, b) => b.rect[2] * b.rect[3] - a.rect[2] * a.rect[3])[0]
/** Caméra posée près d'une zone : `recul` = décalage de la caméra par rapport à son centre. */
function surZone(z: Zone | undefined, recul: Vec3): [Vec3, Vec3] {
  if (!z) return [CAMERA_DEFAUT.position, CAMERA_DEFAUT.cible]
  const c = pointMonde(z.niveau, z.rect[0] + z.rect[2] / 2, 1, z.rect[1] + z.rect[3] / 2)
  return [[c[0] + recul[0], c[1] + recul[1], c[2] + recul[2]], c]
}
const niveauDemo = openDemo?.niveau ?? 'R1'
function ascenseursVue(): [Vec3, Vec3] {
  const a = donnees.batiment.ascenseurs[0]
  if (!a) return [CAMERA_DEFAUT.position, CAMERA_DEFAUT.cible]
  const c = pointMonde('R1', a.position[0], 0, a.position[1])
  return [[c[0] + 16, c[1] + 12, c[2] + 26], [c[0], c[1] + 2, c[2]]]
}

/** Remet tout dans un état neutre puis applique `b` : chaque étape se suffit à elle-même. */
function appliquerBase(b: Base = {}) {
  const s = useEtat.getState()
  s.lancerScenario(null)
  s.setParcours3D(false)
  s.setSelection(null)
  s.setComparaison(!!b.comparaison)
  s.setVue(b.vue ?? 'architecture')
  s.setNiveau(b.niveau ?? null)
  s.setCoupe(false)
  s.setMinimumVital(!!b.minimumVital)
  s.setArchitectureIA(b.ia ?? 'edge')
  s.setSimulation({ actif: !!b.simulation, heure: b.simulation?.heure ?? 8.5, lecture: !!b.simulation?.lecture })
  if (s.eclate !== !!b.eclate) s.setEclate(!!b.eclate)
  if (s.eclatePieces !== !!b.pieces) s.setEclatePieces(!!b.pieces)
  const [pos, cible] = b.camera ?? [CAMERA_DEFAUT.position, CAMERA_DEFAUT.cible]
  // la vue éclatée recadre elle-même la caméra : on ne la remplace que si l'étape en demande une
  if (b.camera || (!b.eclate && !b.pieces)) s.allerA(pos, cible)
}

let courante = -1 // étape en cours, pour ignorer les minuteries d'une étape déjà quittée

/** Le premier occupant de l'open space qui part en déplacement : on cale l'horloge juste avant son départ. */
function voyageurDemo() {
  const o = registre.occupants.find((x) => x.deplacement && x.zone === openDemo?.id) ?? registre.occupants.find((x) => x.deplacement)
  if (!o?.deplacement) return null
  const marche = o.deplacement.segs.find((sg) => sg.kind === 'marche')
  if (marche) registre.horloge = (((marche.t0 - o.deplacement.decalage - 2) % o.deplacement.periode) + o.deplacement.periode) % o.deplacement.periode
  return o
}

function suivre(cle: string, i: number, dist: Vec3) {
  setTimeout(() => {
    if (courante !== i) return
    const p = registre.positions.get(cle)
    if (p) useEtat.getState().allerA([p[0] + dist[0], p[1] + dist[1], p[2] + dist[2]], p)
  }, 500)
}

const capteurDemo = () => donnees.equipements.find((e) => e.categorie === 'capteur' && e.donnee.minimum_vital && e.niveau === niveauDemo) ?? donnees.equipements[0]

export const ETAPES: Etape[] = [
  { titre: 'Bienvenue', texte: 'Ce viewer montre un bâtiment de bureaux de sept niveaux, issu du fichier IFC de l’équipe Domotique, avec toute sa donnée : capteurs, réseau, IA, sécurité. L’IFC ne contient aucun capteur : leurs emplacements sont des propositions. Entreprise, personnes et données sont fictives. La visite dure environ cinq minutes : ← → pour naviguer, Espace pour mettre en pause, Échap pour quitter.' },
  { titre: 'Se déplacer dans la 3D', texte: 'Clic gauche : tourner. Clic droit : déplacer. Molette : zoomer. Au clavier : flèches pour se déplacer, Maj + flèches pour tourner, + et − pour zoomer. Les boutons recentrent la caméra, d’en haut ou de face.', cible: '.outils-camera', base: { camera: DESSUS } },
  { titre: 'Les niveaux', texte: 'Le bâtiment compte sept niveaux : deux sous-sols (parking, archives, locaux techniques), le rez-de-chaussée et trois étages de bureaux, puis la toiture technique. Choisir un niveau isole ses zones et ses équipements ; la coupe masque ce qui est au-dessus.', cible: '.niveaux', base: { niveau: 'R1', camera: [[48, 30, 58], [0, 5, 0]] } },
  { titre: 'Vue éclatée', texte: 'Les niveaux s’écartent pour lire ce qui se passe à chaque étage, sans qu’un plancher cache l’autre. L’écart se règle dans les options.', cible: '.panneau.gauche', base: { eclate: true } },
  { titre: 'Pièces écartées', texte: 'On peut aussi écarter les pièces entre elles : chaque zone devient lisible, avec ses meubles, ses équipements et les personnes qui s’y trouvent.', cible: '.panneau.gauche', base: { eclate: true, pieces: true } },
  { titre: 'Des personnes, une fiche', texte: 'Chaque personnage est cliquable. Sa fiche donne son planning, ses préférences de température et de luminosité, et le confort réel de sa zone. En mode Minimum vital, le planning et les préférences sont verrouillés : ils ne sont tout simplement pas collectés.', cible: '.fiche-personne', base: { niveau: niveauDemo, camera: surZone(openDemo, [12, 14, 20]) },
    extra: () => {
      const o = registre.occupants.find((x) => x.zone === openDemo?.id && !x.deplacement) ?? registre.occupants.find((x) => x.tache === 'bureau')
      if (!o) return
      useEtat.getState().setSelection(`pers:${o.cle}`)
      suivre(o.cle, courante, [4, 3, 6])
    } },
  { titre: 'Ascenseurs', texte: 'Trois ascenseurs desservent les sept niveaux, des sous-sols à la toiture. Les cabines suivent un horaire et ouvrent leurs portes à chaque étage ; des visiteurs les empruntent depuis le hall. Les déplacements des occupants entre étages ne sont pas encore adaptés à ce plan : voir docs/IFC.md.', base: { camera: ascenseursVue() },
    extra: () => {
      const o = voyageurDemo()
      if (!o) return
      useEtat.getState().setSelection(`pers:${o.cle}`)
      suivre(o.cle, courante, [5, 3.5, 7])
    } },
  { titre: 'Open space en îlots', texte: 'Le bâtiment compte surtout des bureaux individuels ; les rares open spaces sont au niveau 3. Les postes y sont groupés en îlots, avec un coin café et une imprimante. Les configurations d’écran varient : un, deux, trois écrans, ultrawide, portable. Les postures changent aussi : taper, réfléchir, téléphoner, discuter…', base: { niveau: niveauDemo, camera: surZone(openDemo, [8, 11, 15]) } },
  { titre: 'Domotique', texte: 'La GTB existe déjà : capteurs, automates par étage, compteurs, bus LonWorks, M-Bus, Modbus et DALI. Les couleurs des liens indiquent le protocole. Cliquer un équipement ouvre sa fiche, avec ses preuves.', cible: '.onglets', base: { vue: 'domotique', niveau: niveauDemo, camera: [[46, 30, 54], [0, 10, 0]] } },
  { titre: 'Cyber : deux réseaux', texte: 'Le réseau GTB est isolé derrière le firewall ; la bureautique est à part. Les volumes colorés montrent ces périmètres, les anneaux rouges les points d’entrée, et les gaines les chemins physiques des câbles.', cible: '.onglets', base: { vue: 'cyber', camera: [[62, 22, 62], [0, 0, 0]] } },
  { titre: 'Un scénario d’intrusion', texte: 'Les scénarios déroulent une attaque étape par étage, avec l’attaquant dessiné devant le bâtiment. Ici, un rebond depuis une borne Wi-Fi : on voit où chaque étape passe et ce qu’elle permet.', cible: '.panneau.gauche', base: { vue: 'cyber' },
    extra: () => { const s = useEtat.getState(); s.lancerScenario('SCN-WIFI'); s.setEtapeScenario(2) } },
  { titre: 'Le minimum vital coupe le chemin', texte: 'Même scénario, mais avec Minimum vital : l’équipement qui ne sert pas au pilotage a disparu, et le chemin d’attaque est coupé à cette étape. Réduire la collecte réduit la surface d’attaque.', cible: '.interrupteur', base: { vue: 'cyber', minimumVital: true },
    extra: () => { const s = useEtat.getState(); s.lancerScenario('SCN-WIFI'); s.setEtapeScenario(2) } },
  { titre: 'IA locale : un modèle par étage', texte: 'Le calcul se fait dans le bâtiment. En architecture Edge, chaque étage a son propre nœud : les flux des capteurs ne quittent pas leur niveau.', cible: '.panneau.gauche', base: { vue: 'ia', ia: 'edge', camera: [[-60, 34, 66], [0, 4, 0]] } },
  { titre: 'IA locale : un serveur cloisonné', texte: 'En architecture centrale, un seul serveur cloisonné reçoit tout. Le basculement montre comment les flux se concentrent, et ce que cela change pour la sécurité et la confidentialité.', cible: '.panneau.gauche', base: { vue: 'ia', ia: 'central', camera: [[-60, 34, 66], [0, 4, 0]] } },
  { titre: 'Les données', texte: 'Chaque donnée est classée : technique, environnementale, occupation agrégée ou potentiellement identifiante. Le bandeau du bas chiffre le mode choisi : équipements, mesures par jour, données identifiantes, points d’entrée, surface d’attaque.', cible: '.bandeau-bas', base: { vue: 'donnees', camera: GENERAL(66, 44, 78) } },
  { titre: 'Le chemin d’une donnée', texte: 'Pour un équipement choisi, la fiche déroule le cycle de vie : collecte, transport, traitement, conservation. « Suivre la donnée en 3D » dessine le chemin jusqu’au serveur, avec un paquet qui voyage.', cible: '.panneau.droite', base: { vue: 'donnees' },
    extra: () => {
      const e = capteurDemo()
      const s = useEtat.getState()
      s.setNiveau(e.niveau)
      s.setSelection(e.id)
      s.setParcours3D(true)
      s.allerA([e.position[0] + 8 - 15, 12, e.position[2] + 14 - 9], [e.position[0] - 15, 4, e.position[2] - 9])
    } },
  { titre: 'Occupant et anonymat', texte: 'La vue Occupant montre ce que chaque capteur sait de qui. Une zone avec détection de présence et moins de N personnes devient identifiable : elle passe en rouge. Le seuil N se règle dans le panneau de gauche.', cible: '.panneau.gauche', base: { vue: 'occupant', camera: GENERAL(58, 38, 68) } },
  { titre: 'Une journée simulée', texte: 'La simulation fait vivre le bâtiment sur une journée : effectifs par zone, température et luminosité simulées, personnes qui arrivent et partent. Les zones deviennent identifiables quand elles se vident, tôt le matin ou à midi.', cible: '.barre-simulation', base: { vue: 'occupant', simulation: { heure: 7.75, lecture: true }, camera: GENERAL(58, 38, 68) } },
  { titre: 'Tout collecter ou Minimum vital', texte: 'Ce commutateur est le cœur du projet. En Minimum vital, ne restent que les données utiles au pilotage et à OPERAT. Le bandeau du bas affiche l’écart par rapport à Tout collecter.', cible: '.interrupteur', base: { vue: 'donnees', minimumVital: true, camera: GENERAL(66, 44, 78) } },
  { titre: 'Comparer côte à côte', texte: 'Le bouton Comparer affiche les deux modes l’un à côté de l’autre : même bâtiment, même heure, même caméra. À gauche, davantage de zones rouges (identifiables) parce que tout est collecté ; à droite, seules restent signalées celles où un capteur de présence est indispensable.', cible: '.outils-camera', base: { vue: 'occupant', comparaison: true, simulation: { heure: 8, lecture: false }, camera: GENERAL(58, 38, 68) } },
  { titre: 'Les risques', texte: 'La matrice classe les risques par probabilité et gravité. Choisir un risque isole les équipements concernés dans la 3D. Les preuves rattachées indiquent ce qui est sourcé, observé ou encore simulé.', cible: '.panneau.gauche', base: { vue: 'risques', camera: GENERAL(60, 40, 70) } },
  { titre: 'Rechercher', texte: 'La touche / ouvre la recherche : équipements, zones, gaines et personnes. Choisir un résultat change de vue et de niveau si nécessaire, et centre la caméra dessus.', cible: '.recherche' },
  { titre: 'Personnaliser', texte: 'Le menu Options règle plus de cinquante paramètres : thème, taille du texte, caméra, rendu, décor, nombre de personnes, vue de démarrage. Tout s’exporte, s’importe, et se réinitialise.', cible: '.bouton-options' },
  { titre: 'Partager et documenter', texte: 'Copier le lien rouvre la même vue, niveau et sélection. Dans Options, on peut aussi copier un lien avec ses réglages : la personne qui l’ouvre décide de les appliquer. Capture enregistre l’image, et le rapport .md résume l’état en cours.', cible: '.outils-camera' },
  { titre: 'Présentation et validation', texte: 'Le bouton Présentation déroule sept scènes pour la soutenance. Le fichier docs/VALIDATION.md liste ce que chaque équipe doit valider : gaines et scénarios pour Cyber, export 3D pour Domotique, seuils et préférences pour IA.', cible: '.bouton-presentation' },
  { titre: 'À retenir', texte: 'Tout ce que vous avez vu repose sur des données fictives, et plusieurs formules restent à valider par les équipes. Le contraste reste l’essentiel : le même bâtiment, avec ou sans minimisation des données.' },
]

/** Durée de lecture automatique d'une étape, en secondes, selon la longueur du texte. */
export const dureeEtape = (e: Etape) => Math.max(9, Math.round(e.texte.split(/\s+/).length * 0.42))

let instantane: ReturnType<typeof prendre> | null = null
function prendre() {
  const s = useEtat.getState()
  return {
    vue: s.vue, niveau: s.niveau, coupe: s.coupe, minimumVital: s.minimumVital, architectureIA: s.architectureIA, eclate: s.eclate, eclatePieces: s.eclatePieces,
    comparaison: s.comparaison, simulation: { ...s.simulation }, selection: s.selection, camera: s.cameraCible,
  }
}

export function demarrerVisite() {
  const s = useEtat.getState()
  instantane = prendre()
  s.setScene(null)
  s.setVisite({ i: 0, auto: true })
}

/** Quitte la visite et rend à la personne la vue qu'elle avait avant. */
export function arreterVisite(restaurer = true) {
  const s = useEtat.getState()
  courante = -1
  s.setVisite(null)
  const a = instantane
  instantane = null
  s.lancerScenario(null)
  s.setParcours3D(false)
  if (!restaurer || !a) return
  s.setComparaison(a.comparaison)
  s.setVue(a.vue)
  s.setNiveau(a.niveau)
  s.setCoupe(a.coupe)
  s.setMinimumVital(a.minimumVital)
  s.setArchitectureIA(a.architectureIA)
  s.setSimulation({ actif: a.simulation.actif, heure: a.simulation.heure, lecture: false })
  if (s.eclate !== a.eclate) s.setEclate(a.eclate)
  if (s.eclatePieces !== a.eclatePieces) s.setEclatePieces(a.eclatePieces)
  s.setSelection(a.selection)
  s.allerA(a.camera.position, a.camera.cible)
}

/** Règle l'application pour l'étape i (appelé à chaque changement d'étape). */
export function jouerEtape(i: number) {
  courante = i
  const e = ETAPES[i]
  if (!e) return
  appliquerBase(e.base)
  e.extra?.()
}
