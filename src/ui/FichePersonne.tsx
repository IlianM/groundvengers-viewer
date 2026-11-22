import { useEffect, useMemo, useState } from 'react'
import { donnees } from '../data'
import { useEtat } from '../store'
import { registre } from '../scene/personnage/registre'
import { LIBELLE_POSE } from '../scene/personnage/comportement'
import { profilDe, blocA, COULEUR_BLOC, LIBELLE_BLOC } from '../scene/personnage/profil'
import { temperatureZone, luminositeZone, identifiableA, formatHeure, HEURE_AMBIANTE } from '../simulation'

const T_STANDARD = 21 // consigne unique appliquée quand le bâtiment ne connaît personne (Minimum vital)

function Jauge({ min, max, pref, actuel, unite, decimales = 1 }: { min: number; max: number; pref: number; actuel: number; unite: string; decimales?: number }) {
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))}%`
  return (
    <div className="jauge" role="img" aria-label={`Préféré ${pref.toFixed(decimales)} ${unite}, actuel ${actuel.toFixed(decimales)} ${unite}`}>
      <div className="jauge-zone" style={{ left: pos(pref - (max - min) * 0.05), width: `${((max - min) * 0.1 / (max - min)) * 100}%` }} />
      <span className="jauge-pref" style={{ left: pos(pref) }} title="Préférence" />
      <span className="jauge-actuel" style={{ left: pos(actuel) }} title="Valeur actuelle" />
      <div className="jauge-echelle"><span>{min} {unite}</span><span>{max} {unite}</span></div>
    </div>
  )
}

function verdict(ecart: number, unite: string, seuil: number, plusMot: string, moinsMot: string) {
  if (Math.abs(ecart) <= seuil) return { texte: 'Confortable', classe: 'ok' }
  return { texte: `${ecart > 0 ? plusMot : moinsMot} (${ecart > 0 ? '+' : '−'}${Math.abs(ecart).toFixed(unite === '°C' ? 1 : 0)} ${unite})`, classe: 'ko' }
}

export function FichePersonne({ cle }: { cle: string }) {
  const { setSelection, minimumVital, setMinimumVital, seuilAnonymat, simulation, allerA } = useEtat()
  const [, maj] = useState(0)
  useEffect(() => { const i = setInterval(() => maj((n) => n + 1), 600); return () => clearInterval(i) }, [])
  const o = registre.occupants.find((x) => x.cle === cle)
  const zone = o ? donnees.zoneParId.get(o.zone) : undefined
  const hSim = simulation.actif ? simulation.heure : HEURE_AMBIANTE
  const profil = useMemo(() => (zone && o ? profilDe(cle, zone, hSim, o.tache) : null), [cle, zone, o?.tache, Math.floor(hSim * 4)])
  if (!o || !zone || !profil) {
    return (
      <aside className="panneau droite">
        <button className="fermer" onClick={() => setSelection(null)}>×</button>
        <p className="discret">Cette personne a quitté la zone à cette heure de la simulation.</p>
      </aside>
    )
  }
  const h = simulation.actif ? simulation.heure : HEURE_AMBIANTE
  const bloc = blocA(profil, h)
  const pose = registre.poses.get(cle)
  const voisins = registre.occupants.filter((x) => x.zone === zone.id)
  const n = voisins.length
  const T = temperatureZone(zone, h, n)
  const L = luminositeZone(h, n)
  const prefs = voisins.map((x) => profilDe(x.cle, zone, h, x.tache).temperature)
  const collectif = Math.round((prefs.reduce((a, b) => a + b, 0) / prefs.length) * 2) / 2
  const contents = (c: number) => prefs.filter((p) => Math.abs(p - c) <= 1).length
  const capteurs = donnees.equipements.filter((e) => e.zone === zone.id && (!minimumVital || e.donnee.minimum_vital))
  const identifiants = capteurs.filter((e) => e.donnee.identifiante)
  const identifiable = identifiableA(zone, n, seuilAnonymat, minimumVital)
  const vT = verdict(T - profil.temperature, '°C', 0.8, 'Un peu chaud', 'Un peu frais')
  const vL = verdict(L - profil.luminosite, 'lux', 120, 'Trop lumineux', 'Pas assez lumineux')
  const p = registre.positions.get(cle)
  const D0 = 8, D1 = 19

  return (
    <aside className="panneau droite fiche-personne">
      <button className="fermer" onClick={() => setSelection(null)}>×</button>
      <span className="badge" style={{ background: minimumVital ? '#37b24d' : '#e8590c' }}>{minimumVital ? 'Minimum vital' : 'Tout collecter'}</span>
      <h2>{minimumVital ? 'Personne dans la zone' : profil.nom}</h2>
      <p className="id">{minimumVital ? zone.nom : `${profil.poste} · équipe ${profil.equipe} · ${zone.nom}`}</p>
      <p className="phrase-occupant"><b>{pose ? LIBELLE_POSE[pose] : '…'}</b>{!minimumVital && bloc ? ` · agenda : ${LIBELLE_BLOC[bloc.type].toLowerCase()}` : ''}</p>
      {identifiable && <p className="alerte-bloc">Seule dans une zone de moins de {seuilAnonymat} personnes avec détection de présence : cette présence est identifiable.</p>}
      {p && <button className="bouton-menu" onClick={() => allerA([p[0] + 5, p[1] + 3.5, p[2] + 7], p)}>Centrer la caméra sur elle</button>}

      <h3>Planning du jour</h3>
      {minimumVital ? (
        <div className="verrou">
          <b>Non collecté</b>
          <p>L’agenda d’une personne est une donnée identifiante : le mode Minimum vital ne la lit pas. Le bâtiment ne sait que « quelqu’un est là ».</p>
          <button className="mini" onClick={() => setMinimumVital(false)}>Voir en mode Tout collecter</button>
        </div>
      ) : (
        <>
          <div className="timeline" aria-label="Planning de la journée">
            {profil.planning.map((b, i) => (
              <span key={i} className="seg" title={`${formatHeure(b.debut)}–${formatHeure(b.fin)} · ${LIBELLE_BLOC[b.type]} · ${b.lieu}`}
                style={{ left: `${((b.debut - D0) / (D1 - D0)) * 100}%`, width: `${((b.fin - b.debut) / (D1 - D0)) * 100}%`, background: COULEUR_BLOC[b.type] }} />
            ))}
            <span className="maintenant" style={{ left: `${Math.min(100, Math.max(0, ((h - D0) / (D1 - D0)) * 100))}%` }} title={formatHeure(h)} />
          </div>
          <div className="timeline-echelle"><span>{D0} h</span><span>{D1} h</span></div>
          <ul className="planning">
            {profil.planning.map((b, i) => (
              <li key={i} className={bloc === b ? 'courant' : ''}>
                <i style={{ background: COULEUR_BLOC[b.type] }} />
                <span>{formatHeure(b.debut)}–{formatHeure(b.fin)}</span>
                <b>{LIBELLE_BLOC[b.type]}</b>
                <small>{b.lieu}</small>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>Confort</h3>
      {minimumVital ? (
        <div className="verrou">
          <b>Préférences non collectées</b>
          <p>Température et lumière préférées sont individuelles : le bâtiment applique la consigne standard de {T_STANDARD} °C.</p>
        </div>
      ) : (
        <>
          <div className="confort-ligne"><span>Température</span><b className={vT.classe}>{vT.texte}</b></div>
          <Jauge min={17} max={27} pref={profil.temperature} actuel={T} unite="°C" />
          <p className="discret">Préfère {profil.temperature.toFixed(1)} °C · il fait {T.toFixed(1)} °C (simulé)</p>
          <div className="confort-ligne"><span>Luminosité</span><b className={vL.classe}>{vL.texte}</b></div>
          <Jauge min={0} max={800} pref={profil.luminosite} actuel={L} unite="lux" decimales={0} />
          <p className="discret">Préfère {profil.luminosite} lux · {L} lux dans la zone (simulé)</p>
          <dl>
            <dt>Ventilation</dt><dd>{profil.ventilation}</dd>
            <dt>Place</dt><dd>{profil.fenetre ? 'près d’une fenêtre' : 'indifférent'}</dd>
          </dl>
        </>
      )}

      <h3>Ce que coûte le minimalisme</h3>
      <p className="discret">Pour les {n} personne{n > 1 ? 's' : ''} présente{n > 1 ? 's' : ''} dans cette zone, part qui trouve la température acceptable (±1 °C) :</p>
      <div className="comparatif">
        <div className={minimumVital ? 'actif' : ''}>
          <b>{Math.round((contents(collectif) / n) * 100)} %</b>
          <span>Tout collecter<br />consigne {collectif.toFixed(1)} °C, calculée sur les préférences</span>
        </div>
        <div className={minimumVital ? 'actif' : ''}>
          <b>{Math.round((contents(T_STANDARD) / n) * 100)} %</b>
          <span>Minimum vital<br />consigne unique {T_STANDARD} °C</span>
        </div>
      </div>
      <p className="discret">Le surcroît de confort a un prix : il faut connaître l’identité et les goûts de chacun. À chiffrer avec l’équipe Domotique.</p>

      <h3>Ce que le bâtiment sait ici</h3>
      <dl>
        <dt>Capteurs actifs</dt><dd>{capteurs.length}</dd>
        <dt>dont identifiants</dt><dd className={identifiants.length ? 'ko' : ''}>{identifiants.length}</dd>
        <dt>Détection de présence</dt><dd>{zone.detection_presence ? 'oui' : 'non'}</dd>
      </dl>
      {identifiants.length > 0 && <ul className="liste-liens">{identifiants.slice(0, 4).map((e) => <li key={e.id}><button onClick={() => setSelection(e.id)}>{e.nom}</button></li>)}</ul>}
      <button className="bouton-menu" onClick={() => setSelection(zone.id)}>Ouvrir la fiche de la zone</button>
      <p className="mention-fiche">Personne, agenda et préférences fictifs, générés pour la démonstration.</p>
    </aside>
  )
}
