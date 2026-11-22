import { FichePersonne } from './FichePersonne'
import { effectifSimule, identifiableA, formatHeure } from '../simulation'
import { Fragment, useEffect, useRef, useState } from 'react'
import { donnees, erreurs } from '../data'
import { useEtat, CAMERA_DEFAUT, type Deco } from '../store'
import { copierLien } from '../partage'
import { Options } from './Options'
import { chargerModele } from './modele'
import { VUES, LIBELLES, COULEURS, zoneNonAnonyme, phraseOccupant, criticite, classeCriticite, COULEUR_CRITICITE, NIVEAU_IMPACT, NIVEAU_PROBA, type VueId } from '../views'
import { reveler } from '../navigation'
import { etapeCoupee } from '../scenario'
import { useVisibles, indicateurs, POIDS_SURFACE } from '../scene/visibles'
import type { Equipement } from '../schema'

export function BarreHaut() {
  const { vue, setVue, minimumVital, setMinimumVital, scene, setScene } = useEtat()
  return (
    <header className="barre-haut">
      <div className="titre-app">GroundVengers Viewer</div>
      <nav className="onglets">
        {VUES.map((v) => (
          <button key={v.id} className={vue === v.id ? 'actif' : ''} onClick={() => setVue(v.id as VueId)} title={v.description}>
            {v.nom}
          </button>
        ))}
      </nav>
      <label className="interrupteur" title="Masque les capteurs et flux qui ne servent pas au pilotage">
        <input type="checkbox" checked={minimumVital} onChange={(e) => setMinimumVital(e.target.checked)} />
        <span>{minimumVital ? 'Minimum vital' : 'Tout collecter'}</span>
      </label>
      <Options />
      <button className="bouton-presentation" onClick={() => setScene(scene === null ? 0 : null)}>
        {scene === null ? 'Présentation' : 'Quitter'}
      </button>
    </header>
  )
}

/** Recentrer et vues prédéfinies (F-03), en haut à droite du viewer. */
export function OutilsCamera() {
  const allerA = useEtat((s) => s.allerA)
  const vues: [string, [number, number, number], [number, number, number]][] = [
    ['Recentrer', CAMERA_DEFAUT.position, CAMERA_DEFAUT.cible],
    ['Dessus', [0.01, 46, 0.01], [0, 0, 0]],
    ['Façade', [0, 8, 40], [0, 5, 0]],
  ]
  const sim = useEtat((st) => st.simulation.actif)
  const setSim = useEtat((st) => st.setSimulation)
  const [etat, setEtat] = useState<'' | 'ok' | 'ko'>('')
  const copier = async () => {
    setEtat((await copierLien()) ? 'ok' : 'ko')
    setTimeout(() => setEtat(''), 2200)
  }
  return (
    <div className="outils-camera">
      {vues.map(([nom, pos, cible]) => <button key={nom} onClick={() => allerA(pos, cible)}>{nom}</button>)}
      <button className={sim ? 'actif' : ''} onClick={() => setSim({ actif: !sim, lecture: false })} title="Simule les présences au fil d’une journée (données fictives)">Journée</button>
      <button onClick={copier} title="Copie un lien qui rouvre cette vue, ce niveau et cette sélection">
        {etat === 'ok' ? 'Lien copié ✓' : etat === 'ko' ? 'Copie impossible' : 'Copier le lien'}
      </button>
    </div>
  )
}

export function PanneauGauche() {
  const { vue, niveau, setNiveau, coupe, setCoupe, eclate, setEclate, eclatePieces, setEclatePieces, reglages, calquesMasques, basculerCalque, architectureIA, setArchitectureIA, seuilAnonymat, setSeuilAnonymat, minimumVital } = useEtat()
  const def = VUES.find((v) => v.id === vue)!
  const ctx = { architectureIA }
  const categories = [...new Set(donnees.equipements.filter((e) => def.montre(e, ctx)).map((e) => e.categorie))]
  const zonesAlerte = donnees.batiment.zones.filter((z) => zoneNonAnonyme(z, seuilAnonymat, minimumVital))
  return (
    <aside className="panneau gauche">
      <h2>{def.nom}</h2>
      <p className="discret">{def.description}</p>
      {vue === 'risques' && <MatriceRisques />}
      {vue === 'cyber' && <PanneauScenarios />}

      <h3>Niveau</h3>
      <div className="niveaux">
        <button className={niveau === null ? 'actif' : ''} onClick={() => setNiveau(null)}>Tous</button>
        {donnees.batiment.niveaux.map((n) => (
          <button key={n.id} className={niveau === n.id ? 'actif' : ''} onClick={() => setNiveau(n.id)}>{n.id}</button>
        ))}
      </div>

      {niveau !== null && (
        <label className="calque" title="Masque les niveaux au-dessus du niveau choisi pour voir l'étage de dessus">
          <input type="checkbox" checked={coupe} onChange={(e) => setCoupe(e.target.checked)} />
          Coupe : masquer les niveaux au-dessus
        </label>
      )}

      <label className="calque" title="Écarte les niveaux les uns des autres pour mieux voir les étages et les liens qui les traversent">
        <input type="checkbox" checked={eclate} onChange={(e) => setEclate(e.target.checked)} />
        Vue éclatée (écarter les niveaux)
      </label>
      <label className="calque" title="Écarte chaque pièce de son voisin, à l'horizontale, à partir du centre du bâtiment">
        <input type="checkbox" checked={eclatePieces} onChange={(e) => setEclatePieces(e.target.checked)} />
        Éclater aussi les pièces
      </label>

      <h3>Calques</h3>
      {categories.map((c) => (
        <label key={c} className="calque">
          <input type="checkbox" checked={!calquesMasques.has(c)} onChange={() => basculerCalque(c)} />
          {LIBELLES.categorie[c] ?? c}
        </label>
      ))}
      <label className="calque"><input type="checkbox" checked={!calquesMasques.has('zones')} onChange={() => basculerCalque('zones')} />Zones</label>
      {vue !== 'architecture' && vue !== 'occupant' && vue !== 'ia' && vue !== 'risques' && (
        <label className="calque"><input type="checkbox" checked={!calquesMasques.has('liens')} onChange={() => basculerCalque('liens')} />Liens</label>
      )}
      {vue === 'cyber' && (
        <>
          <label className="calque"><input type="checkbox" checked={!calquesMasques.has('couverture')} onChange={() => basculerCalque('couverture')} />Couverture Wi-Fi</label>
          <label className="calque"><input type="checkbox" checked={!calquesMasques.has('volumes')} onChange={() => basculerCalque('volumes')} />Volumes réseau</label>
          <label className="calque"><input type="checkbox" checked={!calquesMasques.has('gaines')} onChange={() => basculerCalque('gaines')} />Gaines et chemins de câbles</label>
        </>
      )}

      {vue === 'cyber' && <ScoreSurface />}

      {vue === 'ia' && (
        <>
          <h3>Architecture IA</h3>
          <div className="niveaux">
            <button className={architectureIA === 'edge' ? 'actif' : ''} onClick={() => setArchitectureIA('edge')}>Edge par étage</button>
            <button className={architectureIA === 'central' ? 'actif' : ''} onClick={() => setArchitectureIA('central')}>Central cloisonné</button>
          </div>
          <ComparatifIA />
        </>
      )}
      {(vue === 'ia' || vue === 'occupant') && (
        <>
          <h3>Seuil d'anonymat : {seuilAnonymat} personnes</h3>
          <input type="range" min={2} max={20} value={seuilAnonymat} onChange={(e) => setSeuilAnonymat(Number(e.target.value))} />
          <p className="discret">{zonesAlerte.length} zone(s) avec détection de présence sous ce seuil.</p>
        </>
      )}

      {def.legende.length > 0 && (
        <>
          <h3>Légende</h3>
          {def.legende.map((l) => (
            <div key={l.libelle} className="legende"><i style={{ background: l.couleur }} />{l.libelle}</div>
          ))}
        </>
      )}
    {reglages.aideClavier && <p className="discret aide-clavier">Clavier : flèches = se déplacer · Maj + flèches = tourner · + / − = zoom</p>}
    </aside>
  )
}

function ComparatifIA() {
  const edge = donnees.noeuds.filter((n) => n.architecture === 'edge')
  const central = donnees.noeuds.filter((n) => n.architecture === 'central')
  const entrees = (ns: typeof edge) => new Set(ns.flatMap((n) => n.entrees)).size
  return (
    <table className="comparatif">
      <thead><tr><th></th><th>Edge</th><th>Central</th></tr></thead>
      <tbody>
        <tr><td>Points de calcul</td><td>{edge.length}</td><td>{central.length}</td></tr>
        <tr><td>Capteurs lus</td><td>{entrees(edge)}</td><td>{entrees(central)}</td></tr>
        <tr><td>Flux inter-étages</td><td>0</td><td>{central.flatMap((n) => n.entrees).filter((id) => donnees.parId.get(id)?.niveau !== donnees.parId.get(central[0]?.heberge_sur ?? '')?.niveau).length}</td></tr>
        <tr><td>Si un nœud tombe</td><td>1 étage</td><td>tout le bâtiment</td></tr>
      </tbody>
    </table>
  )
}

function BadgePreuve({ id }: { id: string }) {
  const p = donnees.preuves.find((x) => x.id === id)
  if (!p) return null
  return (
    <li className="preuve">
      <span className="badge" style={{ background: COULEURS.preuve[p.statut] }}>{LIBELLES.preuve[p.statut]}</span>
      {p.lien ? <a href={p.lien} target="_blank" rel="noreferrer">{p.titre}</a> : <span>{p.titre}</span>}
      <small>{p.document}</small>
    </li>
  )
}

export function FicheDetail() {
  const { selection, setSelection, vue, seuilAnonymat, minimumVital } = useEtat()
  if (!selection) {
    return (
      <aside className="panneau droite vide">
        <p className="discret">Survolez un élément pour un aperçu, cliquez pour sa fiche détail.</p>
      </aside>
    )
  }
  if (selection.startsWith('pers:')) return <FichePersonne cle={selection.slice(5)} />
  const zone = donnees.zoneParId.get(selection)
  if (zone) {
    const dans = donnees.equipements.filter((e) => e.zone === zone.id)
    const alerte = zoneNonAnonyme(zone, seuilAnonymat, minimumVital)
    return (
      <aside className="panneau droite">
        <button className="fermer" onClick={() => setSelection(null)}>×</button>
        <h2>{zone.nom}</h2>
        <p className="id">{zone.id}</p>
        <dl>
          <dt>Niveau</dt><dd>{zone.niveau}</dd>
          <dt>Type</dt><dd>{zone.type}</dd>
          <dt>Effectif max</dt><dd>{zone.effectif_max}</dd>
          <dt>Détection de présence</dt><dd>{zone.detection_presence ? 'oui' : 'non'}</dd>
        </dl>
        {alerte && <p className="alerte-bloc">Zone de moins de {seuilAnonymat} personnes avec détection de présence : la donnée n'est pas anonyme (règle DPO).</p>}
        <h3>Équipements ({dans.length})</h3>
        <ul className="liste-liens">{dans.map((e) => <li key={e.id}><button onClick={() => setSelection(e.id)}>{e.nom}</button></li>)}</ul>
        {zone.preuves.length > 0 && <><h3>Preuves</h3><ul className="preuves">{zone.preuves.map((p) => <BadgePreuve key={p} id={p} />)}</ul></>}
      </aside>
    )
  }
  const g = donnees.gaineParId.get(selection)
  if (g) {
    return (
      <aside className="panneau droite">
        <button className="fermer" onClick={() => setSelection(null)}>×</button>
        <span className="badge" style={{ background: COULEURS.equipe[g.equipe] }}>{g.equipe}</span>
        <h2>{g.nom}</h2>
        <p className="id">{g.id}</p>
        <dl>
          <dt>Type</dt><dd>{g.type === 'montante' ? 'Montante technique' : 'Chemin de câbles'}</dd>
          <dt>Réseau</dt><dd>{g.reseau}</dd>
          <dt>{g.type === 'montante' ? 'Niveaux' : 'Niveau'}</dt><dd>{g.type === 'montante' ? `${g.de} → ${g.a}` : g.niveau}</dd>
          <dt>Hauteur</dt><dd>{g.hauteur} m au-dessus de la dalle</dd>
        </dl>
        <h3>Liens transportés ({g.contient.length})</h3>
        <ul className="liste-liens">
          {g.contient.map((id) => {
            const l = donnees.liens.find((x) => x.id === id)
            const nom = (i: string) => donnees.parId.get(i)?.nom ?? i
            return <li key={id}>{l ? `${nom(l.de)} → ${l.vers.map(nom).join(', ')}` : id}<small>{l?.type}</small></li>
          })}
        </ul>
        {g.preuves.length > 0 && <><h3>Preuves</h3><ul className="preuves">{g.preuves.map((p) => <BadgePreuve key={p} id={p} />)}</ul></>}
      </aside>
    )
  }
  const e = donnees.parId.get(selection)
  if (!e) return null
  return <FicheEquipement e={e} vue={vue} />
}

function FicheEquipement({ e, vue }: { e: Equipement; vue: string }) {
  const setSelection = useEtat((s) => s.setSelection)
  const voisins = donnees.liens
    .filter((l) => l.de === e.id || l.vers.includes(e.id))
    .map((l) => ({ l, autre: l.de === e.id ? l.vers : [l.de] }))
  const noeuds = donnees.noeuds.filter((n) => n.heberge_sur === e.id)
  const lu = donnees.noeuds.filter((n) => n.entrees.includes(e.id))
  const risques = donnees.risques.filter((r) => e.risques.includes(r.id))
  return (
    <aside className="panneau droite">
      <button className="fermer" onClick={() => setSelection(null)}>×</button>
      <span className="badge" style={{ background: COULEURS.equipe[e.equipe] }}>{e.equipe}</span>
      <h2>{e.nom}</h2>
      <p className="id">{e.id}</p>
      {vue === 'occupant' && <p className="phrase-occupant">{phraseOccupant(e)}</p>}
      {e.description && <p>{e.description}</p>}
      <dl>
        <dt>Catégorie</dt><dd>{LIBELLES.categorie[e.categorie] ?? e.categorie} · {e.type}</dd>
        <dt>Niveau / zone</dt><dd>{e.niveau} · {donnees.zoneParId.get(e.zone ?? '')?.nom ?? '—'}</dd>
        {e.protocole && <><dt>Protocole</dt><dd>{LIBELLES.protocole[e.protocole] ?? e.protocole}</dd></>}
        {e.reseau && <><dt>Réseau</dt><dd>{e.reseau}</dd></>}
        {Object.entries(e.config).map(([k, v]) => <Fragment key={k}><dt>{k.replaceAll('_', ' ')}</dt><dd>{String(v)}</dd></Fragment>)}
      </dl>

      <h3>Donnée produite</h3>
      <dl>
        <dt>Nature</dt><dd><i className="pastille" style={{ background: COULEURS.nature[e.donnee.nature] }} />{LIBELLES.nature[e.donnee.nature]}</dd>
        <dt>Identifiante</dt><dd>{e.donnee.identifiante ? 'oui' : 'non'}</dd>
        <dt>Conservation</dt><dd>{e.donnee.conservation}</dd>
        {e.donnee.periode_s && <><dt>Mesures / jour</dt><dd>{Math.round(86400 / e.donnee.periode_s)}</dd></>}
        <dt>Minimum vital</dt><dd>{e.donnee.minimum_vital ? 'oui, conservé' : 'non, retiré'}</dd>
        {e.point_entree && <><dt>Point d'entrée</dt><dd className="rouge">oui</dd></>}
      </dl>

      {noeuds.map((n) => (
        <div key={n.id} className="bloc-ia">
          <h3>Nœud IA · {n.architecture === 'edge' ? 'Edge' : 'Central cloisonné'}</h3>
          <dl>
            <dt>Modèle</dt><dd>{n.modele}</dd>
            <dt>Entrées</dt><dd>{n.entrees.length} capteurs</dd>
            <dt>Sorties</dt><dd>{n.sorties.join(', ')}</dd>
            <dt>Fréquence</dt><dd>{n.frequence}</dd>
            <dt>Données brutes</dt><dd>{n.conservation.brut}</dd>
            <dt>Agrégats</dt><dd>{n.conservation.agrege}</dd>
            <dt>Mode dégradé</dt><dd>{n.mode_degrade}</dd>
          </dl>
          <div className="cycle">
            <span>Mesure</span>→<span>Calcul local</span>→<span>Agrégat zone/heure</span>→<span>Effacé ({n.conservation.agrege})</span>
          </div>
        </div>
      ))}
      {lu.length > 0 && <p className="discret">Lu par : {lu.map((n) => n.id).join(', ')}</p>}

      {voisins.length > 0 && (
        <>
          <h3>Liens</h3>
          <ul className="liste-liens">
            {voisins.flatMap(({ l, autre }) => autre.map((id) => (
              <li key={`${l.id}-${id}`}>
                <i className="pastille" style={{ background: COULEURS.protocole[l.protocole ?? ''] ?? COULEURS.neutre }} />
                <button onClick={() => setSelection(id)}>{donnees.parId.get(id)?.nom ?? id}</button>
                <small> {l.type}{l.autorise_par_firewall === false ? ' · bloqué' : ''}</small>
              </li>
            )))}
          </ul>
        </>
      )}

      {risques.length > 0 && (
        <>
          <h3>Risques</h3>
          {risques.map((r) => (
            <div key={r.id} className="risque">
              <strong>{r.nom}</strong> <small>impact {r.impact} · probabilité {r.probabilite}</small>
              <div>Préventif : {r.preventif}</div>
              <div>Correctif : {r.correctif}</div>
            </div>
          ))}
        </>
      )}

      {e.preuves.length > 0 && <><h3>Preuves</h3><ul className="preuves">{e.preuves.map((p) => <BadgePreuve key={p} id={p} />)}</ul></>}
    </aside>
  )
}

export function BandeauBas() {
  const minimumVital = useEtat((s) => s.minimumVital)
  const { equipements } = useVisibles()
  const actuel = indicateurs(minimumVital)
  const tout = indicateurs(false)
  const items: [string, keyof typeof actuel][] = [
    ['Équipements', 'equipements'], ['Capteurs', 'capteurs'], ['Mesures / jour', 'mesuresJour'],
    ['Données identifiantes', 'identifiantes'], ['Points d’entrée réseau', 'pointsEntree'],
    ['Flux vers Internet', 'fluxCloud'], ['Protocoles', 'protocoles'], ['Surface d’attaque (score)', 'surface'],
  ]
  return (
    <footer className="bandeau-bas">
      <span className="mode">{minimumVital ? 'Minimum vital' : 'Tout collecter'}</span>
      {items.map(([lib, k]) => {
        const delta = actuel[k] - tout[k]
        return (
          <div key={k} className="indicateur">
            <b>{actuel[k].toLocaleString('fr-FR')}</b>
            {minimumVital && delta !== 0 && <em>{delta.toLocaleString('fr-FR')}</em>}
            <span>{lib}</span>
          </div>
        )
      })}
      <span className="discret visibles">{equipements.length} affichés dans cette vue</span>
    </footer>
  )
}

export function Presentation() {
  const { scene, setScene, setVue, setNiveau, setMinimumVital, setArchitectureIA, setSelection, allerA } = useEtat()
  const s = scene !== null ? donnees.scenes[scene] : null
  useEffect(() => {
    if (!s) return
    setVue(s.vue as VueId)
    setNiveau(s.niveau)
    if (s.minimum_vital !== undefined) setMinimumVital(s.minimum_vital)
    if (s.architecture_ia) setArchitectureIA(s.architecture_ia)
    setSelection(s.selection)
    if (s.camera) allerA(s.camera.position, s.camera.cible)
  }, [s, setVue, setNiveau, setMinimumVital, setArchitectureIA, setSelection, allerA])
  if (!s || scene === null) return null
  const n = donnees.scenes.length
  return (
    <div className="presentation">
      <div className="presentation-titre">{s.titre}</div>
      <p>{s.texte}</p>
      <div className="presentation-nav">
        <button disabled={scene === 0} onClick={() => setScene(scene - 1)}>← Précédent</button>
        <span>{scene + 1} / {n}</span>
        {scene < n - 1 ? <button onClick={() => setScene(scene + 1)}>Suivant →</button> : <button onClick={() => setScene(null)}>Terminer</button>}
      </div>
    </div>
  )
}

export function BandeauErreurs() {
  if (erreurs.length === 0) return null
  return (
    <div className="erreurs">
      <strong>{erreurs.length} problème(s) dans les fichiers data/ :</strong>
      <ul>{erreurs.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul>
    </div>
  )
}

/** Bandeau « modèle local » + zone de dépôt sur la vue 3D. */
export function ZoneDepot({ children }: { children: React.ReactNode }) {
  const { modeleLocal, setModeleLocal } = useEtat()
  const [survol, setSurvol] = useState(false)
  return (
    <main
      className={`viewer ${survol ? 'depot' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setSurvol(true) }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => { e.preventDefault(); setSurvol(false); const f = e.dataTransfer.files[0]; if (f) chargerModele(f) }}
    >
      {children}
      {survol && <div className="depot-message">Déposez un fichier .glb pour l'afficher</div>}
      {modeleLocal && (
        <div className="bandeau-modele">
          Modèle local : {modeleLocal.nom} <button onClick={() => setModeleLocal(null)}>Retirer</button>
        </div>
      )}
    </main>
  )
}

/** Matrice impact × probabilité des risques (F-30) ; un clic isole les équipements concernés. */
function MatriceRisques() {
  const { risqueActif, setRisqueActif } = useEtat()
  const impacts = (['Critique', 'Moyen', 'Faible'] as const)
  const probas = (['Faible', 'Moyenne', 'Élevée'] as const)
  const actif = donnees.risques.find((r) => r.id === risqueActif)
  const concernes = actif ? donnees.equipements.filter((e) => e.risques.includes(actif.id)) : []
  return (
    <>
      <h3>Matrice des risques</h3>
      <p className="discret">Lignes : impact. Colonnes : probabilité.</p>
      <div className="matrice" role="grid" aria-label="Matrice impact par probabilité">
        {impacts.map((imp) => (
          <Fragment key={imp}>
            <span className="axe-lib">{imp}</span>
            {probas.map((pr) => {
              const c = NIVEAU_IMPACT[imp] * NIVEAU_PROBA[pr]
              const risques = donnees.risques.filter((r) => r.impact === imp && r.probabilite === pr)
              return (
                <div key={pr} className="cellule" style={{ background: COULEUR_CRITICITE[classeCriticite(c)] + '33', borderColor: COULEUR_CRITICITE[classeCriticite(c)] }}>
                  {risques.map((r) => (
                    <button key={r.id} className={risqueActif === r.id ? 'actif' : ''} title={r.nom}
                      onClick={() => setRisqueActif(risqueActif === r.id ? null : r.id)}>{r.nom}</button>
                  ))}
                </div>
              )
            })}
          </Fragment>
        ))}
        <span />
        {probas.map((pr) => <span key={pr} className="axe-lib">{pr}</span>)}
      </div>
      {!actif && <p className="discret">Cliquez un risque pour ne garder que les équipements concernés.</p>}
      {actif && (
        <div className="risque">
          <b>{actif.nom}</b> <small>impact {actif.impact} · probabilité {actif.probabilite} · criticité {criticite(actif)}/9</small>
          <p><b>Préventif :</b> {actif.preventif}</p>
          <p><b>Correctif :</b> {actif.correctif}</p>
          <b>{concernes.length} équipement(s) concerné(s)</b>
          <ul className="liste-liens">
            {concernes.map((e) => <li key={e.id}><button onClick={() => reveler({ id: e.id, vue: 'risques' })}>{e.nom}</button></li>)}
          </ul>
        </div>
      )}
    </>
  )
}

/** Score de surface d'attaque (F-20) : détail du calcul, tout collecter contre minimum vital. */
function ScoreSurface() {
  const minimumVital = useEtat((s) => s.minimumVital)
  const actuel = indicateurs(minimumVital)
  const tout = indicateurs(false)
  const vital = indicateurs(true)
  const lignes: [string, keyof typeof POIDS_SURFACE][] = [
    ['Points d’entrée réseau', 'pointsEntree'], ['Flux vers Internet', 'fluxCloud'],
    ['Protocoles distincts', 'protocoles'], ['Équipements à donnée identifiante', 'identifiantes'],
  ]
  const baisse = tout.surface > 0 ? Math.round((1 - vital.surface / tout.surface) * 100) : 0
  return (
    <>
      <h3>Surface d’attaque</h3>
      <table className="comparatif">
        <tbody>
          {lignes.map(([lib, k]) => (
            <tr key={k}><td>{lib}</td><td className="calcul">{actuel[k]} × {POIDS_SURFACE[k]} = <b>{actuel[k] * POIDS_SURFACE[k]}</b></td></tr>
          ))}
          <tr><td><b>Score ({minimumVital ? 'minimum vital' : 'tout collecter'})</b></td><td className="calcul"><b>{actuel.surface}</b></td></tr>
        </tbody>
      </table>
      <p className="discret">Tout collecter : {tout.surface} · Minimum vital : {vital.surface} (−{baisse} %). Formule indicative, à valider avec l’équipe Cyber.</p>
    </>
  )
}

/** Scénarios d'intrusion (F-21) : liste, lecture pas à pas et lecture automatique. */
function PanneauScenarios() {
  const { scenarioActif, lancerScenario, setEtapeScenario, setLecture, minimumVital } = useEtat()
  const sc = donnees.scenarios.find((x) => x.id === scenarioActif?.id)
  const etape = scenarioActif?.etape ?? 0
  const lecture = scenarioActif?.lecture ?? false
  const coupe = sc ? etapeCoupee(sc, minimumVital) : null
  const derniere = sc ? sc.etapes.length - 1 : 0

  // lecture automatique : une étape toutes les 3 secondes, puis arrêt sur la dernière
  useEffect(() => {
    if (!lecture || !sc) return
    const t = setTimeout(() => {
      const st = useEtat.getState().scenarioActif
      if (!st) return
      if (st.etape >= derniere || (coupe && st.etape >= coupe.index)) useEtat.getState().setLecture(false)
      else useEtat.setState({ scenarioActif: { ...st, etape: st.etape + 1 } })
    }, useEtat.getState().reglages.dureeEtapeScenario * 1000)
    return () => clearTimeout(t)
  }, [lecture, etape, sc, derniere, coupe])

  if (donnees.scenarios.length === 0) return null
  const fini = sc && (etape >= derniere || (coupe !== null && etape >= coupe.index))
  return (
    <>
      <h3>Scénarios d’intrusion</h3>
      <div className="scenarios">
        {donnees.scenarios.map((x) => (
          <button key={x.id} className={scenarioActif?.id === x.id ? 'actif' : ''} onClick={() => lancerScenario(scenarioActif?.id === x.id ? null : x.id)}>{x.nom}</button>
        ))}
      </div>
      {sc && (
        <div className="scenario-etape">
          <p className="discret">{sc.resume}</p>
          <b>Étape {etape + 1} / {sc.etapes.length}</b>
          <p>{sc.etapes[etape].texte}</p>
          {coupe && etape >= coupe.index && (
            <p className="alerte-bloc">Chemin coupé en Minimum vital : « {coupe.equipement} » n’est pas collecté. L’attaque s’arrête ici.</p>
          )}
          {fini && !(coupe && etape >= coupe.index) && <p className="phrase-occupant">{sc.conclusion}</p>}
          <div className="scenario-boutons">
            <button disabled={etape === 0} onClick={() => setEtapeScenario(etape - 1)}>←</button>
            <button onClick={() => (fini ? useEtat.setState({ scenarioActif: { id: sc.id, etape: 0, lecture: true } }) : setLecture(!lecture))}>{lecture ? 'Pause' : fini ? 'Rejouer' : 'Lecture'}</button>
            <button disabled={etape >= derniere} onClick={() => setEtapeScenario(etape + 1)}>→</button>
            <button onClick={() => lancerScenario(null)}>Arrêter</button>
          </div>
          {!minimumVital && sc.id !== 'SCN-WIFI' && <p className="discret">Astuce : activez « Minimum vital » (barre du haut) pour voir ce chemin disparaître.</p>}
        </div>
      )}
    </>
  )
}

/** F-26 — barre de simulation d'une journée : curseur horaire, lecture, effectifs et zones identifiables. */
export function BarreSimulation() {
  const { simulation: sim, setSimulation, seuilAnonymat, minimumVital, niveau } = useEtat()
  const vitesse = useEtat((s) => s.reglages.vitesseJournee)
  useEffect(() => {
    if (!sim.actif || !sim.lecture) return
    let id = 0, t0 = performance.now()
    const tick = (t: number) => {
      const dt = (t - t0) / 1000; t0 = t
      setSimulation({ heure: (useEtat.getState().simulation.heure + dt * vitesse) % 24 })
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [sim.actif, sim.lecture, vitesse, setSimulation])
  if (!sim.actif) return null
  const zones = donnees.batiment.zones.filter((z) => !niveau || z.niveau === niveau)
  const eff = zones.map((z) => [z, effectifSimule(z, sim.heure)] as const)
  const total = eff.reduce((a, [, n]) => a + n, 0)
  const ident = eff.filter(([z, n]) => identifiableA(z, n, seuilAnonymat, minimumVital))
  return (
    <div className="barre-simulation" role="group" aria-label="Simulation d’une journée">
      <div className="sim-ligne">
        <button className="sim-lecture" onClick={() => setSimulation({ lecture: !sim.lecture })} aria-label={sim.lecture ? 'Pause' : 'Lecture'}>{sim.lecture ? '❚❚' : '▶'}</button>
        <b className="sim-heure">{formatHeure(sim.heure)}</b>
        <input type="range" min={0} max={23.75} step={0.25} value={sim.heure} aria-label="Heure de la journée"
          onChange={(e) => setSimulation({ heure: Number(e.target.value), lecture: false })} />
        <button className="sim-fermer" onClick={() => setSimulation({ actif: false, lecture: false })} aria-label="Fermer la simulation">×</button>
      </div>
      <div className="sim-ligne sim-stats">
        <span><b>{total}</b> personnes{niveau ? ` en ${niveau}` : ''}</span>
        <span className={ident.length ? 'alerte' : ''} title={ident.map(([z, n]) => `${z.nom} (${n})`).join(', ')}>
          <b>{ident.length}</b> zone{ident.length > 1 ? 's' : ''} identifiable{ident.length > 1 ? 's' : ''} (&lt; {seuilAnonymat} pers. avec détection)
        </span>
      </div>
      <div className="sim-mention">Journée type simulée, présences fictives.</div>
    </div>
  )
}
