import { create } from 'zustand'
import type { VueId } from '../views'

export type Deco = { herbe: boolean; arbres: boolean; batiments: boolean; meubles: boolean; structure: boolean }
export type Theme = 'clair' | 'sombre'
type Vec3 = [number, number, number]

export const ECART_ECLATE = 5 // m ajoutés entre deux niveaux en vue éclatée

export const CAMERA_DEFAUT = { position: [26, 20, 28] as Vec3, cible: [0, 4, 0] as Vec3 }

type Etat = {
  vue: VueId
  niveau: string | null // null = tous les niveaux
  coupe: boolean // masque les niveaux au-dessus du niveau sélectionné
  selection: string | null
  survol: string | null
  calquesMasques: Set<string>
  minimumVital: boolean
  architectureIA: 'edge' | 'central'
  seuilAnonymat: number // N : effectif minimal d'une zone avec détection de présence
  scene: number | null // index du mode présentation, null = hors présentation
  theme: Theme
  deco: Deco
  cameraCible: { n: number; position: Vec3; cible: Vec3 }
  modeleLocal: { url: string; nom: string } | null // .glb chargé par la personne (glisser-déposer), prioritaire sur batiment.json
  eclate: boolean // vue éclatée demandée
  ecart: number // écart actuel entre niveaux (animé de 0 à ECART_ECLATE)
  eclatePieces: boolean // pièces écartées horizontalement
  pieces: number // avancement animé de 0 à 1

  setVue: (v: VueId) => void
  setNiveau: (n: string | null) => void
  setCoupe: (b: boolean) => void
  setSelection: (id: string | null) => void
  setSurvol: (id: string | null) => void
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
}

// Options d'apparence gardées dans le navigateur (aucune donnée envoyée nulle part).
const CLE = 'gv-options-v1'
const DECO_DEFAUT: Deco = { herbe: true, arbres: true, batiments: true, meubles: true, structure: true }

function lireOptions(): { theme?: Theme; deco?: Partial<Deco> } {
  try {
    const brut = localStorage.getItem(CLE)
    return brut ? JSON.parse(brut) : {}
  } catch {
    return {}
  }
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
  vue: 'architecture',
  niveau: null,
  coupe: false,
  selection: null,
  survol: null,
  calquesMasques: new Set(),
  minimumVital: false,
  architectureIA: 'edge',
  seuilAnonymat: 5,
  scene: null,
  theme: sauvegarde.theme === 'sombre' || sauvegarde.theme === 'clair' ? sauvegarde.theme : themeSysteme(),
  deco: { ...DECO_DEFAUT, ...sauvegarde.deco },
  cameraCible: { n: 0, ...CAMERA_DEFAUT },
  modeleLocal: null,
  eclate: false,
  ecart: 0,
  eclatePieces: false,
  pieces: 0,

  setVue: (vue) => set({ vue, selection: null, calquesMasques: new Set() }),
  setNiveau: (niveau) => set({ niveau }),
  setCoupe: (coupe) => set({ coupe }),
  setSelection: (selection) => set({ selection }),
  setSurvol: (survol) => set({ survol }),
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

// Applique le thème au document et garde les options.
function appliquer(s: Pick<Etat, 'theme' | 'deco'>) {
  document.documentElement.dataset.theme = s.theme
  try {
    localStorage.setItem(CLE, JSON.stringify({ theme: s.theme, deco: s.deco }))
  } catch {
    /* stockage indisponible : les options restent valables pour la session */
  }
}
appliquer(useEtat.getState())
useEtat.subscribe((s, prev) => {
  if (s.theme !== prev.theme || s.deco !== prev.deco) appliquer(s)
})

// On recule la caméra quand le bâtiment s'étale, pour le garder dans le cadre.
function recadrer(get: () => Etat, set: (p: Partial<Etat>) => void) {
  const { eclate, eclatePieces, cameraCible: c } = get()
  const [position, cible]: [Vec3, Vec3] = eclatePieces
    ? [[40, 34, 46], [0, eclate ? 7 : 4, 0]]
    : eclate ? [[34, 28, 38], [0, 7, 0]] : [CAMERA_DEFAUT.position, CAMERA_DEFAUT.cible]
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
    const e2 = vers(ecart, eclate ? ECART_ECLATE : 0)
    const p2 = vers(pieces, eclatePieces ? 1 : 0)
    useEtat.setState({ ecart: e2, pieces: p2 })
    animation = e2 === (eclate ? ECART_ECLATE : 0) && p2 === (eclatePieces ? 1 : 0) ? 0 : requestAnimationFrame(pas)
  }
  animation = requestAnimationFrame(pas)
}
