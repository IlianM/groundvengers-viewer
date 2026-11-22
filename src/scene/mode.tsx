import { createContext, useContext } from 'react'
import { useEtat } from '../store'

/** Force le mode (minimum vital ou non) pour une vue 3D précise : sert à la comparaison côte à côte. null = suit le réglage global. */
export const ModeContexte = createContext<boolean | null>(null)

export function useMinimumVital(): boolean {
  const force = useContext(ModeContexte)
  const global = useEtat((s) => s.minimumVital)
  return force ?? global
}
