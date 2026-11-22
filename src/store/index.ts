import { create } from 'zustand'
import type { VueId } from '../views'

export type Deco = { herbe: boolean; arbres: boolean; batiments: boolean; meubles: boolean }
export type Theme = 'clair' | 'sombre'
type Vec3 = [number, number, number]

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
}

// Options d'apparence gardées dans le navigateur (aucune donnée envoyée nulle part).
const CLE = 'gv-options-v1'
const DECO_DEFAUT: Deco = { herbe: true, arbres: true, batiments: true, meubles: true }

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

export const useEtat = create<Etat>((set) => ({
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
