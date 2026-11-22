import { create } from 'zustand'
import type { VueId } from '../views'

type Etat = {
  vue: VueId
  niveau: string | null // null = tous les niveaux
  selection: string | null
  survol: string | null
  calquesMasques: Set<string>
  minimumVital: boolean
  architectureIA: 'edge' | 'central'
  seuilAnonymat: number // N : effectif minimal d'une zone avec détection de présence
  scene: number | null // index du mode présentation, null = hors présentation

  setVue: (v: VueId) => void
  setNiveau: (n: string | null) => void
  setSelection: (id: string | null) => void
  setSurvol: (id: string | null) => void
  basculerCalque: (c: string) => void
  setMinimumVital: (b: boolean) => void
  setArchitectureIA: (a: 'edge' | 'central') => void
  setSeuilAnonymat: (n: number) => void
  setScene: (i: number | null) => void
}

export const useEtat = create<Etat>((set) => ({
  vue: 'architecture',
  niveau: null,
  selection: null,
  survol: null,
  calquesMasques: new Set(),
  minimumVital: false,
  architectureIA: 'edge',
  seuilAnonymat: 5,
  scene: null,

  setVue: (vue) => set({ vue, selection: null, calquesMasques: new Set() }),
  setNiveau: (niveau) => set({ niveau }),
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
}))
