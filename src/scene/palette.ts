import { useEtat } from '../store'

export type Palette = {
  theme: 'clair' | 'sombre'
  fond: string // arrière-plan sans décor
  ciel: string // arrière-plan avec décor
  herbe: string
  solNeutre: string
  chemin: string
  route: string
  marquage: string
  dalle: string
  dalleBord: string
  enveloppeBord: string
  enveloppeBordInactif: string
  zoneBord: string
  grille: [string, string]
  zones: Record<string, string>
  zoneOpacite: { architecture: number; autre: number }
  lumiere: { ambiante: number; directe: number }
  feuillage: string[]
  tronc: string
  immeubles: string[]
  fenetres: string
  meuble: {
    bois: string; pied: string; chaise: string; ecran: string; table: string; armoire: string
    canape: string; comptoir: string; rack: string; plante: string; pot: string
  }
  ascenseur: { cage: string; bord: string; cabine: string; porte: string }
  personnage: { peau: string; pantalon: string; hauts: string[] }
}

const CLAIR: Palette = {
  theme: 'clair',
  fond: '#f5f1ea', ciel: '#d4e6f0', herbe: '#93c46d', solNeutre: '#e8e2d6', chemin: '#d3ccbc', route: '#70767a', marquage: '#f1ede2',
  dalle: '#e9e4da', dalleBord: '#8d8577', enveloppeBord: '#b5ad9f', enveloppeBordInactif: '#e3ddd2', zoneBord: '#9c9384',
  grille: ['#d9d2c5', '#e8e2d6'],
  zones: { open_space: '#a5d8ff', bureau: '#ffd8a8', reunion: '#d0bfff', hall: '#c3fae8', technique: '#dee2e6', circulation: '#f1f3f5' },
  zoneOpacite: { architecture: 0.55, autre: 0.25 },
  lumiere: { ambiante: 0.8, directe: 1.2 },
  feuillage: ['#5aa04a', '#4f9142', '#6bb15a'], tronc: '#7a5a3a',
  immeubles: ['#b9c4cc', '#a7b3bd', '#c8d0d6', '#9eabb6'], fenetres: '#7f95a6',
  meuble: {
    bois: '#c9a77a', pied: '#6b7076', chaise: '#4a5560', ecran: '#2b2f33', table: '#d8c7a8', armoire: '#a98f6a',
    canape: '#6a8caf', comptoir: '#8e7b63', rack: '#667380', plante: '#4f9a45', pot: '#8b6b4a',
  },
  ascenseur: { cage: '#9fb4c2', bord: '#6f8493', cabine: '#aab4bc', porte: '#d6dde2' },
  personnage: { peau: '#f0c8a4', pantalon: '#3b4452', hauts: ['#e8590c', '#1c7ed6', '#37b24d', '#ae3ec9', '#f08c00', '#0ca678', '#d6336c', '#495057'] },
}

const SOMBRE: Palette = {
  theme: 'sombre',
  fond: '#0f1917', ciel: '#13202e', herbe: '#2f5d36', solNeutre: '#1b2a26', chemin: '#3a4440', route: '#262b2e', marquage: '#6b7378',
  dalle: '#34423e', dalleBord: '#74867f', enveloppeBord: '#5a6c65', enveloppeBordInactif: '#27342f', zoneBord: '#7a8c85',
  grille: ['#24362f', '#1b2b27'],
  zones: { open_space: '#3a78a6', bureau: '#a8742f', reunion: '#6a4fb3', hall: '#2a8f78', technique: '#5b6670', circulation: '#46515a' },
  zoneOpacite: { architecture: 0.5, autre: 0.3 },
  lumiere: { ambiante: 0.55, directe: 0.85 },
  feuillage: ['#2f6b35', '#2a5f31', '#38793f'], tronc: '#4a3826',
  immeubles: ['#2b3846', '#344354', '#27323d', '#3b4b5e'], fenetres: '#4a6580',
  meuble: {
    bois: '#9a7d57', pied: '#59616a', chaise: '#6b7a88', ecran: '#4d5a66', table: '#a8946f', armoire: '#82694a',
    canape: '#4f6f92', comptoir: '#76644f', rack: '#5f6a74', plante: '#3d8037', pot: '#6e5139',
  },
  ascenseur: { cage: '#7f98aa', bord: '#9fb6c6', cabine: '#7d8791', porte: '#b3bdc5' },
  personnage: { peau: '#d9ad8a', pantalon: '#222a36', hauts: ['#f0700c', '#339af0', '#51cf66', '#cc5de8', '#fab005', '#20c997', '#f06595', '#868e96'] },
}

export const usePalette = (): Palette => (useEtat((s) => s.theme) === 'sombre' ? SOMBRE : CLAIR)
