// Vérifie les fichiers data/*.json (schéma + identifiants orphelins). Lancé en CI à chaque pull request.
import { chargerDonnees } from '../src/data'

const { donnees, erreurs } = chargerDonnees()
console.log(`${donnees.equipements.length} équipements, ${donnees.liens.length} liens, ${donnees.noeuds.length} nœuds IA, ${donnees.batiment.zones.length} zones`)
if (erreurs.length) {
  console.error(`\n${erreurs.length} erreur(s) :`)
  for (const e of erreurs) console.error(' - ' + e)
  process.exit(1)
}
console.log('Données valides.')
