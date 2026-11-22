import { Fragment } from 'react'
import { useEtat } from '../store'
import { LIBELLES } from '../views'
import { parcoursDonnee } from '../parcours'
import type { Equipement } from '../schema'

const duree = (s?: number) => (s ? (s >= 3600 ? `${s / 3600} h` : s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`) : 'sur événement')

/** Cycle de vie d'une donnée : mesure, trajet sur le réseau, stockage, effacement. */
export function ParcoursDonnee({ e }: { e: Equipement }) {
  const { minimumVital, setSelection, parcours3D, setParcours3D } = useEtat()
  const chemin = parcoursDonnee(e.id)
  const coupee = minimumVital && !e.donnee.minimum_vital
  const serveur = chemin.length ? chemin[chemin.length - 1].equipement : null
  return (
    <>
      <h3>Cycle de vie de la donnée</h3>
      {coupee && <p className="alerte-bloc">En Minimum vital, cette donnée n’est pas collectée : le cycle ci-dessous n’a pas lieu.</p>}
      <ol className={`cycle-vie ${coupee ? 'coupe' : ''}`}>
        <li><b>Mesure</b><span>{e.nom} · {e.donnee.periode_s ? `toutes les ${duree(e.donnee.periode_s)}, ${Math.round(86400 / e.donnee.periode_s).toLocaleString('fr-FR')} par jour` : 'sur événement'}</span></li>
        {chemin.slice(1).map(({ equipement, via }, i) => (
          <Fragment key={equipement.id}>
            <li>
              <b>{i === chemin.length - 2 ? 'Supervision' : 'Transit'}</b>
              <span>
                <button className="lien-bouton" onClick={() => setSelection(equipement.id)}>{equipement.nom}</button>
                {via && <small> via {via.protocole ? LIBELLES.protocole[via.protocole] ?? via.protocole : via.type}</small>}
              </span>
            </li>
          </Fragment>
        ))}
        {chemin.length === 0 && <li><b>Transit</b><span>aucun lien vers un serveur dans les données</span></li>}
        <li><b>Conservation</b><span>{e.donnee.conservation}{serveur && serveur.id !== e.id && serveur.donnee.conservation !== e.donnee.conservation ? ` · le serveur garde : ${serveur.donnee.conservation}` : ''}</span></li>
        <li><b>Effacement</b><span>à l’échéance de la conservation</span></li>
      </ol>
      {chemin.length > 1 && !coupee && (
        <button className="bouton-menu" onClick={() => setParcours3D(!parcours3D)}>
          {parcours3D ? 'Masquer le parcours en 3D' : 'Suivre la donnée en 3D'}
        </button>
      )}
    </>
  )
}
