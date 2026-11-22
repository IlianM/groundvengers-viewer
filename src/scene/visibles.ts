import { useMemo } from 'react'
import { donnees } from '../data'
import { useEtat } from '../store'
import { vueParId } from '../views'
import type { Equipement } from '../schema'

/** Équipements et liens à dessiner pour l'état courant (vue, niveau, calques, minimum vital). */
export function useVisibles() {
  const { vue, niveau, calquesMasques, minimumVital, architectureIA } = useEtat()
  return useMemo(() => {
    const def = vueParId(vue)
    const ctx = { architectureIA }
    const equipements = donnees.equipements.filter(
      (e) =>
        def.montre(e, ctx) &&
        (!minimumVital || e.donnee.minimum_vital) &&
        (!niveau || e.niveau === niveau) &&
        !calquesMasques.has(e.categorie),
    )
    const ids = new Set(equipements.map((e) => e.id))
    const liens = calquesMasques.has('liens')
      ? []
      : donnees.liens.filter(
          (l) =>
            def.lienVisible(l) &&
            (!minimumVital || l.minimum_vital) &&
            ids.has(l.de) &&
            l.vers.some((v) => ids.has(v)),
        )
    return { def, ctx, equipements, ids, liens }
  }, [vue, niveau, calquesMasques, minimumVital, architectureIA])
}

/** Indicateurs globaux (bandeau bas), calculés sur tout le bâtiment, selon le mode minimum vital. */
export function indicateurs(minimumVital: boolean) {
  const eqs: Equipement[] = donnees.equipements.filter((e) => !minimumVital || e.donnee.minimum_vital)
  const liens = donnees.liens.filter((l) => !minimumVital || l.minimum_vital)
  const protocoles = new Set(eqs.map((e) => e.protocole).filter(Boolean))
  return {
    equipements: eqs.length,
    capteurs: eqs.filter((e) => ['capteur', 'camera', 'lecteur_badge'].includes(e.categorie)).length,
    mesuresJour: Math.round(eqs.reduce((s, e) => s + (e.donnee.periode_s ? 86400 / e.donnee.periode_s : 0), 0)),
    identifiantes: eqs.filter((e) => e.donnee.identifiante).length,
    pointsEntree: eqs.filter((e) => e.point_entree).length,
    fluxCloud: liens.filter((l) => l.vers.some((v) => donnees.parId.get(v)?.reseau === 'internet')).length,
    protocoles: protocoles.size,
  }
}
