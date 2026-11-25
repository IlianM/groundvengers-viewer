import { useMemo } from 'react'
import { donnees } from './data'
import { useEtat } from './store'
import { effectifsZones, HEURE_AMBIANTE } from './simulation'

/** Effectif de chaque zone à l'heure affichée, réglage « nombre de personnes » compris. Ne change de référence que si un effectif change. */
export function useEffectifs(): Map<string, number> {
  const cle = useEtat((s) => {
    const h = s.simulation.actif ? s.simulation.heure : HEURE_AMBIANTE
    const m = effectifsZones(h, s.reglages.effectifForce)
    return donnees.batiment.zones.map((z) => m.get(z.id)).join(',')
  })
  return useMemo(() => {
    const n = cle.split(',').map(Number)
    return new Map(donnees.batiment.zones.map((z, i) => [z.id, n[i]]))
  }, [cle])
}
