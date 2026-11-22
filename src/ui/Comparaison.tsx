import { Scene3D } from '../scene/Scene'
import { indicateurs } from '../scene/visibles'
import { useEtat } from '../store'

const LIGNES: [string, keyof ReturnType<typeof indicateurs>][] = [
  ['équipements', 'equipements'], ['capteurs', 'capteurs'], ['mesures / jour', 'mesuresJour'],
  ['données identifiantes', 'identifiantes'], ['points d’entrée', 'pointsEntree'], ['flux Internet', 'fluxCloud'], ['score d’attaque', 'surface'],
]

function Bandeau({ minimumVital }: { minimumVital: boolean }) {
  const tout = indicateurs(false)
  const ici = indicateurs(minimumVital)
  return (
    <div className={`duo-bandeau ${minimumVital ? 'vital' : 'tout'}`}>
      <strong>{minimumVital ? 'Minimum vital' : 'Tout collecter'}</strong>
      <div className="duo-chiffres">
        {LIGNES.map(([lib, k]) => (
          <span key={k}>
            <b>{ici[k].toLocaleString('fr-FR')}</b> {lib}
            {minimumVital && ici[k] !== tout[k] && <em> ({(ici[k] - tout[k]).toLocaleString('fr-FR')})</em>}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Comparaison : le même bâtiment, la même vue, la même heure, la même caméra — avec et sans minimisation. */
export function Comparaison() {
  const vue = useEtat((s) => s.vue)
  return (
    <div className="duo" data-vue={vue}>
      <section className="duo-vue"><Bandeau minimumVital={false} /><Scene3D mode={false} nom="gauche" /></section>
      <section className="duo-vue"><Bandeau minimumVital /><Scene3D mode secondaire nom="droite" /></section>
    </div>
  )
}
