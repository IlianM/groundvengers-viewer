import { create } from 'zustand'
import type { VueId } from '../views'
import { parametres } from '../data'
import { Config, Reglages, REGLAGES_DEFAUT, FORMAT_CONFIG } from '../reglages'

export type Deco = { herbe: boolean; arbres: boolean; batiments: boolean; meubles: boolean; structure: boolean }
export type Theme = 'clair' | 'sombre'
type Vec3 = [number, number, number]

/** Mètres ajoutés entre deux niveaux en vue éclatée (réglage). */
export const ecartNiveaux = () => useEtat.getState().reglages.ecartNiveaux

export const CAMERA_DEFAUT = { position: [78, 52, 92] as Vec3, cible: [0, 3, 0] as Vec3 }

type Etat = {
  vue: VueId
  niveau: string | null // null = tous les niveaux
  coupe: boolean // masque les niveaux au-dessus du niveau sélectionné
  selection: string | null
  survol: string | null
  parcours3D: boolean
  configEnAttente: { config: Config; nb: number } | null // configuration reçue par lien, à confirmer
  visite: { i: number; auto: boolean } | null // visite guidée de l'appli (index d'étape, lecture automatique)
  comparaison: boolean // deux vues 3D côte à côte : Tout collecter / Minimum vital
  risqueActif: string | null // vue Risques : risque isolé dans la matrice
  scenarioActif: { id: string; etape: number; lecture: boolean } | null // scénario d'intrusion (vue Cyber)
  simulation: { actif: boolean; heure: number; lecture: boolean } // F-26 : simulation d'une journée
  calquesMasques: Set<string>
  minimumVital: boolean
  architectureIA: 'edge' | 'central'
  seuilAnonymat: number // N : effectif minimal d'une zone avec détection de présence
  scene: number | null // index du mode présentation, null = hors présentation
  theme: Theme
  deco: Deco
  cameraCible: { n: number; position: Vec3; cible: Vec3 }
  modeleLocal: { url: string; nom: string } | null // .glb chargé par la personne (glisser-déposer), prioritaire sur batiment.json
  reglages: Reglages // personnalisation (Options)
  eclate: boolean // vue éclatée demandée
  ecart: number // écart actuel entre niveaux (animé de 0 à ECART_ECLATE)
  eclatePieces: boolean // pièces écartées horizontalement
  pieces: number // avancement animé de 0 à 1

  setVue: (v: VueId) => void
  setNiveau: (n: string | null) => void
  setCoupe: (b: boolean) => void
  setSelection: (id: string | null) => void
  setSurvol: (id: string | null) => void
  setRisqueActif: (id: string | null) => void
  setParcours3D: (b: boolean) => void
  setComparaison: (b: boolean) => void
  setVisite: (v: { i: number; auto: boolean } | null) => void
  proposerConfig: (c: { config: Config; nb: number } | null) => void
  setSimulation: (p: Partial<{ actif: boolean; heure: number; lecture: boolean }>) => void
  lancerScenario: (id: string | null) => void
  setEtapeScenario: (n: number) => void
  setLecture: (b: boolean) => void
  basculerCalque: (c: string) => void
  setMinimumVital: (b: boolean) => void
  setArchitectureIA: (a: 'edge' | 'central') => void
  setSeuilAnonymat: (n: number) => void
  setScene: (i: number | null) => void
  setTheme: (t: Theme) => void
  setDeco: (k: keyof Deco, v: boolean) => void
  allerA: (position: Vec3, cible: Vec3) => void
  setEclate: (b: boolean) => void
  setEclatePieces: (b: boolean) => void
  setModeleLocal: (fichier: File | null) => void
  setReglage: <K extends keyof Reglages>(k: K, v: Reglages[K]) => void
  reinitialiserReglages: (cles?: (keyof Reglages)[]) => void
  appliquerConfig: (c: Config) => void
  exporterConfig: () => Config
}

// Options d'apparence gardées dans le navigateur (aucune donnée envoyée nulle part).
const CLE = 'gv-options-v1'

function lireOptions(): Config {
  let brut: Record<string, unknown> = {}
  try {
    const t = localStorage.getItem(CLE)
    if (t) brut = JSON.parse(t)
  } catch { /* stockage indisponible : valeurs par défaut */ }
  return Config.parse({ format: FORMAT_CONFIG, version: 1, theme: themeSysteme(), ...brut })
}
function themeSysteme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'sombre' : 'clair'
  } catch {
    return 'clair'
  }
}
const sauvegarde = lireOptions()

export const useEtat = create<Etat>((set, get) => ({
  vue: sauvegarde.reglages.demarrageVue as VueId,
  niveau: null,
  coupe: false,
  selection: null,
  survol: null,
  risqueActif: null,
  comparaison: false,
  visite: null,
  configEnAttente: null,
  parcours3D: false, // dessine en 3D le chemin de la donnée de l'équipement sélectionné
  simulation: { actif: false, heure: 8.5, lecture: false },
  scenarioActif: null,
  calquesMasques: new Set(),
  minimumVital: sauvegarde.reglages.demarrageMinimumVital,
  architectureIA: 'edge',
  seuilAnonymat: sauvegarde.reglages.demarrageSeuil,
  scene: null,
  theme: sauvegarde.theme,
  deco: sauvegarde.deco as Deco,
  reglages: sauvegarde.reglages,
  cameraCible: { n: 0, ...CAMERA_DEFAUT },
  modeleLocal: null,
  eclate: false,
  ecart: 0,
  eclatePieces: false,
  pieces: 0,

  setVue: (vue) => set({ vue, selection: null, risqueActif: null, scenarioActif: null, calquesMasques: new Set() }),
  setNiveau: (niveau) => set({ niveau }),
  setCoupe: (coupe) => set({ coupe }),
  setSelection: (selection) => set({ selection }),
  setSurvol: (survol) => set({ survol }),
  setSimulation: (p) => set((s) => ({ simulation: { ...s.simulation, ...p } })),
  setParcours3D: (parcours3D) => set({ parcours3D }),
  setComparaison: (comparaison) => set({ comparaison }),
  setVisite: (visite) => set({ visite }),
  proposerConfig: (configEnAttente) => set({ configEnAttente }),
  setRisqueActif: (risqueActif) => set({ risqueActif, selection: null }),
  lancerScenario: (id) => {
    set({ scenarioActif: id ? { id, etape: 0, lecture: true } : null, selection: null })
    // on recule pour voir l'attaquant, qui part de devant le bâtiment
    if (id) get().allerA([34, 26, 46], [0, 3, 6])
  },
  setEtapeScenario: (etape) => set((s) => (s.scenarioActif ? { scenarioActif: { ...s.scenarioActif, etape, lecture: false } } : {})),
  setLecture: (lecture) => set((s) => (s.scenarioActif ? { scenarioActif: { ...s.scenarioActif, lecture } } : {})),
  basculerCalque: (c) =>
    set((s) => {
      const m = new Set(s.calquesMasques)
      if (m.has(c)) m.delete(c)
      else m.add(c)
      return { calquesMasques: m }
    }),
  setMinimumVital: (minimumVital) => set({ minimumVital }),
  setArchitectureIA: (architectureIA) => set({ architectureIA }),
  setSeuilAnonymat: (seuilAnonymat) => set({ seuilAnonymat }),
  setScene: (scene) => set({ scene }),
  setTheme: (theme) => set({ theme }),
  setDeco: (k, v) => set((s) => ({ deco: { ...s.deco, [k]: v } })),
  setEclate: (eclate) => {
    set({ eclate })
    animerEcart()
    recadrer(get, set)
  },
  setReglage: (k, v) => set((s) => ({ reglages: Reglages.parse({ ...s.reglages, [k]: v }) })),
  reinitialiserReglages: (cles) => set((s) => ({
    reglages: cles ? { ...s.reglages, ...Object.fromEntries(cles.map((k) => [k, REGLAGES_DEFAUT[k]])) } as Reglages : REGLAGES_DEFAUT,
    ...(cles ? {} : { deco: { herbe: true, arbres: true, batiments: true, meubles: true, structure: true }, theme: themeSysteme() }),
  })),
  appliquerConfig: (c) => set({ theme: c.theme, deco: c.deco as Deco, reglages: c.reglages }),
  exporterConfig: () => ({ format: FORMAT_CONFIG, version: 1, theme: get().theme, deco: get().deco, reglages: get().reglages }),
  setModeleLocal: (fichier) => {
    const ancien = get().modeleLocal
    if (ancien) URL.revokeObjectURL(ancien.url)
    set({ modeleLocal: fichier ? { url: URL.createObjectURL(fichier), nom: fichier.name } : null })
  },
  setEclatePieces: (eclatePieces) => {
    set({ eclatePieces })
    animerEcart()
    recadrer(get, set)
  },
  allerA: (position, cible) => set((s) => ({ cameraCible: { n: s.cameraCible.n + 1, position, cible } })),
}))

// Applique thème et réglages d'interface au document, et garde la personnalisation dans le navigateur.
function appliquer(s: Pick<Etat, 'theme' | 'deco' | 'reglages'>) {
  const r = s.reglages
  const el = document.documentElement
  el.dataset.theme = s.theme
  el.style.setProperty('--echelle', String(r.tailleTexte / 100))
  el.style.setProperty('--echelle-etiq', String(r.tailleEtiquettes / 100))
  el.style.setProperty('--w-gauche', `${r.panneauGauche ? r.largeurGauche : 0}px`)
  el.style.setProperty('--w-droite', `${r.panneauDroit ? r.largeurDroite : 0}px`)
  el.style.setProperty('--h-bandeau', r.bandeauBas ? '64px' : '0px')
  if (r.accent) el.style.setProperty('--accent-2', r.accent)
  else el.style.removeProperty('--accent-2')
  parametres.ecartPieces = r.ecartPieces
  try {
    localStorage.setItem(CLE, JSON.stringify({ theme: s.theme, deco: s.deco, reglages: r }))
  } catch {
    /* stockage indisponible : les options restent valables pour la session */
  }
}
appliquer(useEtat.getState())
useEtat.subscribe((s, prev) => {
  if (s.theme !== prev.theme || s.deco !== prev.deco || s.reglages !== prev.reglages) appliquer(s)
})

// On recule la caméra quand le bâtiment s'étale, pour le garder dans le cadre.
function recadrer(get: () => Etat, set: (p: Partial<Etat>) => void) {
  const { eclate, eclatePieces, cameraCible: c } = get()
  const [position, cible]: [Vec3, Vec3] = eclatePieces
    ? [[110, 80, 130], [0, eclate ? 8 : 3, 0]]
    : eclate ? [[96, 70, 118], [0, 8, 0]] : [CAMERA_DEFAUT.position, CAMERA_DEFAUT.cible]
  set({ cameraCible: { n: c.n + 1, position, cible } })
}

// Animation des écarts : on rapproche `ecart` et `pieces` de leur cible à chaque image (0,5 s environ) ; les composants suivent via le store.
let animation = 0
function animerEcart() {
  if (animation) return
  let dernier = performance.now()
  const pas = (t: number) => {
    const { eclate, eclatePieces, ecart, pieces } = useEtat.getState()
    const k = 1 - Math.exp(-((t - dernier) / 1000) * 8)
    dernier = t
    const vers = (v: number, cible: number) => (Math.abs(cible - v) < 0.005 ? cible : v + (cible - v) * k)
    const cibleE = eclate ? ecartNiveaux() : 0
    const e2 = vers(ecart, cibleE)
    const p2 = vers(pieces, eclatePieces ? 1 : 0)
    useEtat.setState({ ecart: e2, pieces: p2 })
    animation = e2 === cibleE && p2 === (eclatePieces ? 1 : 0) ? 0 : requestAnimationFrame(pas)
  }
  animation = requestAnimationFrame(pas)
}
