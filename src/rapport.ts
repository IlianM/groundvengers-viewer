import { donnees } from './data'
import { useEtat } from './store'
import { indicateurs } from './scene/visibles'
import { criticite } from './views'
import { zoneNonAnonyme } from './views'
import { capaciteTotale, effectifsZones, formatHeure, HEURE_AMBIANTE } from './simulation'

/** Rapport Markdown de l'état courant : indicateurs dans les deux modes, zones non anonymes, risques, preuves. */
export function construireRapport(): string {
  const s = useEtat.getState()
  const tout = indicateurs(false)
  const vital = indicateurs(true)
  const pct = (a: number, b: number) => { const v = b ? Math.round(((b - a) / b) * 100) : 0; return b ? (v === 0 ? '0 %' : `−${v} %`) : '—' }
  const lignes: [string, keyof typeof tout][] = [
    ['Équipements', 'equipements'], ['Capteurs', 'capteurs'], ['Mesures par jour', 'mesuresJour'], ['Données identifiantes', 'identifiantes'],
    ['Points d’entrée réseau', 'pointsEntree'], ['Flux vers Internet', 'fluxCloud'], ['Protocoles', 'protocoles'], ['Surface d’attaque (score)', 'surface'],
  ]
  const nonAnonymes = (mv: boolean) => donnees.batiment.zones.filter((z) => zoneNonAnonyme(z, s.seuilAnonymat, mv))
  const h = s.simulation.actif ? s.simulation.heure : HEURE_AMBIANTE
  const eff = effectifsZones(h, s.reglages.effectifForce)
  const total = [...eff.values()].reduce((a, b) => a + b, 0)
  const risques = [...donnees.risques].sort((a, b) => criticite(b) - criticite(a)).slice(0, 5)
  const preuves = donnees.preuves.reduce<Record<string, number>>((m, p) => ({ ...m, [p.statut]: (m[p.statut] ?? 0) + 1 }), {})
  const date = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

  return [
    `# Rapport GroundVengers Viewer`,
    ``,
    `> Données fictives de démonstration. Généré le ${date}. Formules (score de surface, confort) indicatives, à valider avec les équipes Cyber et Domotique.`,
    ``,
    `## Indicateurs : Tout collecter ou Minimum vital`,
    ``,
    `| Indicateur | Tout collecter | Minimum vital | Écart |`,
    `|---|---:|---:|---:|`,
    ...lignes.map(([lib, k]) => `| ${lib} | ${tout[k].toLocaleString('fr-FR')} | ${vital[k].toLocaleString('fr-FR')} | ${pct(vital[k], tout[k])} |`),
    ``,
    `## Anonymat (seuil : ${s.seuilAnonymat} personnes)`,
    ``,
    `Une zone avec détection de présence et moins de ${s.seuilAnonymat} personnes n'est pas anonyme (règle DPO).`,
    ``,
    `- Tout collecter : ${nonAnonymes(false).length} zone(s) : ${nonAnonymes(false).map((z) => z.nom).join(', ') || 'aucune'}`,
    `- Minimum vital : ${nonAnonymes(true).length} zone(s) : ${nonAnonymes(true).map((z) => z.nom).join(', ') || 'aucune'}`,
    ``,
    `## Occupation simulée à ${formatHeure(h)}${s.simulation.actif ? '' : ' (matinée type)'}`,
    ``,
    `${total} personne(s) sur ${capaciteTotale()} places${s.reglages.effectifForce !== null ? ' (nombre imposé dans les Options)' : ''}.`,
    ``,
    ...donnees.batiment.zones.filter((z) => z.effectif_max > 0).map((z) => `- ${z.nom} (${z.niveau}) : ${eff.get(z.id) ?? 0} / ${z.effectif_max}`),
    ``,
    `## Risques les plus critiques`,
    ``,
    ...risques.map((r) => `- **${r.nom}** : impact ${r.impact.toLowerCase()}, probabilité ${r.probabilite.toLowerCase()} (criticité ${criticite(r)}/9). Préventif : ${r.preventif} Correctif : ${r.correctif}`),
    ``,
    `## Statut des preuves`,
    ``,
    ...Object.entries(preuves).map(([statut, n]) => `- ${statut} : ${n}`),
    ``,
  ].join('\n')
}

export function telechargerTexte(nom: string, contenu: string, type = 'text/markdown') {
  const url = URL.createObjectURL(new Blob([contenu], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  a.click()
  URL.revokeObjectURL(url)
}
