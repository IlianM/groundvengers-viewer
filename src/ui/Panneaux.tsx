import { Fragment, useEffect, useRef, useState } from 'react'
import { donnees, erreurs } from '../data'
import { useEtat, CAMERA_DEFAUT, type Deco } from '../store'
import { copierLien } from '../partage'
import { VUES, LIBELLES, COULEURS, zoneNonAnonyme, phraseOccupant, type VueId } from '../views'
import { useVisibles, indicateurs } from '../scene/visibles'
import type { Equipement } from '../schema'

const OPTIONS_DECO: [keyof Deco, string][] = [
  ['herbe', 'Herbe, parvis et route'],
  ['arbres', 'Arbres'],
  ['batiments', 'Bâtiments au loin'],
  ['meubles', 'Meubles à l\u2019intérieur'],
]

function MenuOptions() {
  const { theme, setTheme, deco, setDeco } = useEtat()
  const [ouvert, setOuvert] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOuvert(false) }
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false) }
    document.addEventListener('mousedown', dehors)
    document.addEventListener('keydown', echap)
    return () => { document.removeEventListener('mousedown', dehors); document.removeEventListener('keydown', echap) }
  }, [ouvert])
  return (
    <div className="options" ref={ref}>
      <button className={`bouton-options ${ouvert ? 'ouvert' : ''}`} onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert}>
        Options ▾
      </button>
      {ouvert && (
        <div className="options-menu" role="menu">
          <h4>Apparence</h4>
          <label className="calque">
            <input type="checkbox" checked={theme === 'sombre'} onChange={(e) => setTheme(e.target.checked ? 'sombre' : 'clair')} />
            Mode sombre
          </label>
          <h4>Décor</h4>
          {OPTIONS_DECO.map(([k, libelle]) => (
            <label key={k} className="calque">
              <input type="checkbox" checked={deco[k]} onChange={(e) => setDeco(k, e.target.checked)} />
              {libelle}
            </label>
          ))}
          <p className="discret">Le décor est grossier et purement visuel. Il n’influe pas sur les indicateurs.</p>
        </div>
      )}
    </div>
  )
}

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
      <MenuOptions />
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
  const [etat, setEtat] = useState<'' | 'ok' | 'ko'>('')
  const copier = async () => {
    setEtat((await copierLien()) ? 'ok' : 'ko')
    setTimeout(() => setEtat(''), 2200)
  }
  return (
    <div className="outils-camera">
      {vues.map(([nom, pos, cible]) => <button key={nom} onClick={() => allerA(pos, cible)}>{nom}</button>)}
      <button onClick={copier} title="Copie un lien qui rouvre cette vue, ce niveau et cette sélection">
        {etat === 'ok' ? 'Lien copié ✓' : etat === 'ko' ? 'Copie impossible' : 'Copier le lien'}
      </button>
    </div>
  )
}

export function PanneauGauche() {
  const { vue, niveau, setNiveau, coupe, setCoupe, calquesMasques, basculerCalque, architectureIA, setArchitectureIA, seuilAnonymat, setSeuilAnonymat, minimumVital } = useEtat()
  const def = VUES.find((v) => v.id === vue)!
  const ctx = { architectureIA }
  const categories = [...new Set(donnees.equipements.filter((e) => def.montre(e, ctx)).map((e) => e.categorie))]
  const zonesAlerte = donnees.batiment.zones.filter((z) => zoneNonAnonyme(z, seuilAnonymat, minimumVital))
  return (
    <aside className="panneau gauche">
      <h2>{def.nom}</h2>
      <p className="discret">{def.description}</p>

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

      <h3>Calques</h3>
      {categories.map((c) => (
        <label key={c} className="calque">
          <input type="checkbox" checked={!calquesMasques.has(c)} onChange={() => basculerCalque(c)} />
          {LIBELLES.categorie[c] ?? c}
        </label>
      ))}
      <label className="calque"><input type="checkbox" checked={!calquesMasques.has('zones')} onChange={() => basculerCalque('zones')} />Zones</label>
      {vue !== 'architecture' && vue !== 'occupant' && vue !== 'ia' && (
        <label className="calque"><input type="checkbox" checked={!calquesMasques.has('liens')} onChange={() => basculerCalque('liens')} />Liens</label>
      )}
      {vue === 'cyber' && (
        <>
          <label className="calque"><input type="checkbox" checked={!calquesMasques.has('couverture')} onChange={() => basculerCalque('couverture')} />Couverture Wi-Fi</label>
          <label className="calque"><input type="checkbox" checked={!calquesMasques.has('volumes')} onChange={() => basculerCalque('volumes')} />Volumes réseau</label>
        </>
      )}

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
    ['Flux vers Internet', 'fluxCloud'], ['Protocoles', 'protocoles'],
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
