import { encoderConfig, decoderConfig } from '../lienConfig'
import { lienAvecConfig } from '../partage'
import { useEffect, useRef, useState } from 'react'
import { useEtat, type Deco } from '../store'
import { REGLAGES_DEFAUT, lireConfig, VUES_IDS, type Reglages } from '../reglages'
import { VUES } from '../views'
import { chargerModele } from './modele'
import { construireRapport, telechargerTexte } from '../rapport'
import { effectifsZones, capaciteTotale, HEURE_AMBIANTE } from '../simulation'

type Cle = keyof Reglages

function Interrupteur({ k, libelle, aide }: { k: Cle; libelle: string; aide?: string }) {
  const valeur = useEtat((s) => s.reglages[k]) as boolean
  const set = useEtat((s) => s.setReglage)
  return (
    <label className="option-ligne" title={aide}>
      <input type="checkbox" checked={valeur} onChange={(e) => set(k, e.target.checked as never)} />
      <span>{libelle}</span>
      <Retablir k={k} />
    </label>
  )
}

function Retablir({ k }: { k: Cle }) {
  const valeur = useEtat((s) => s.reglages[k])
  const reinit = useEtat((s) => s.reinitialiserReglages)
  if (valeur === REGLAGES_DEFAUT[k]) return <span className="retablir vide" />
  return <button className="retablir" title="Remettre la valeur par défaut" onClick={(e) => { e.preventDefault(); reinit([k]) }}>↺</button>
}

function Curseur({ k, libelle, min, max, pas, unite = '' }: { k: Cle; libelle: string; min: number; max: number; pas: number; unite?: string }) {
  const valeur = useEtat((s) => s.reglages[k]) as number
  const set = useEtat((s) => s.setReglage)
  return (
    <div className="option-bloc">
      <div className="option-ligne"><span>{libelle}</span><b>{Number.isInteger(pas) ? valeur : valeur.toFixed(2)}{unite}</b><Retablir k={k} /></div>
      <input type="range" min={min} max={max} step={pas} value={valeur} onChange={(e) => set(k, Number(e.target.value) as never)} />
    </div>
  )
}

function Couleur({ k, libelle }: { k: Cle; libelle: string }) {
  const valeur = useEtat((s) => s.reglages[k]) as string | null
  const set = useEtat((s) => s.setReglage)
  return (
    <div className="option-ligne">
      <span>{libelle}</span>
      <input type="color" value={valeur ?? '#888888'} onChange={(e) => set(k, e.target.value as never)} />
      <button className="mini" disabled={valeur === null} onClick={() => set(k, null as never)}>Par défaut</button>
    </div>
  )
}

function Choix<K extends Cle>({ k, libelle, options }: { k: K; libelle: string; options: [string, string][] }) {
  const valeur = useEtat((s) => s.reglages[k]) as string
  const set = useEtat((s) => s.setReglage)
  return (
    <div className="option-ligne">
      <span>{libelle}</span>
      <select value={valeur} onChange={(e) => set(k, e.target.value as never)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <Retablir k={k} />
    </div>
  )
}

function InterrupteurDeco({ k, libelle }: { k: keyof Deco; libelle: string }) {
  const valeur = useEtat((s) => s.deco[k])
  const set = useEtat((s) => s.setDeco)
  return (
    <label className="option-ligne">
      <input type="checkbox" checked={valeur} onChange={(e) => set(k, e.target.checked)} />
      <span>{libelle}</span>
      <span className="retablir vide" />
    </label>
  )
}

/** Nombre de personnes : brouillon réglé au curseur, appliqué seulement au clic sur le bouton. */
function NombrePersonnes() {
  const force = useEtat((s) => s.reglages.effectifForce)
  const set = useEtat((s) => s.setReglage)
  const sim = useEtat((s) => s.simulation)
  const auto = [...effectifsZones(sim.actif ? sim.heure : HEURE_AMBIANTE, null).values()].reduce((a, b) => a + b, 0)
  const max = capaciteTotale()
  const [brouillon, setBrouillon] = useState(force ?? auto)
  useEffect(() => { if (force !== null) setBrouillon(force) }, [force])
  return (
    <div className="option-bloc nombre-personnes">
      <div className="option-ligne"><span>Nombre de personnes</span><b>{force === null ? `auto (${auto})` : force}</b></div>
      <p className="discret">
        {force === null
          ? 'Le nombre suit la simulation d’une journée (matinée type si elle est éteinte).'
          : 'Nombre imposé, réparti entre les zones selon l’occupation simulée. La simulation reste active pour les horaires et l’agenda.'}
      </p>
      <div className="option-ligne">
        <input type="range" min={0} max={max} step={1} value={brouillon} aria-label="Nombre de personnes à appliquer" onChange={(e) => setBrouillon(Number(e.target.value))} />
        <input type="number" className="nombre-saisie" min={0} max={max} value={brouillon}
          onChange={(e) => setBrouillon(Math.min(max, Math.max(0, Math.round(Number(e.target.value) || 0))))} />
      </div>
      <div className="option-boutons">
        <button className="bouton-menu" disabled={brouillon === force} onClick={() => set('effectifForce', brouillon as never)}>Appliquer</button>
        <button className="bouton-menu" disabled={force === null} onClick={() => set('effectifForce', null as never)}>Revenir à la simulation</button>
      </div>
      <p className="discret">Maximum : {max} personnes (places de travail du bâtiment).</p>
    </div>
  )
}

function Onglet({ cles, children }: { cles: Cle[]; children: React.ReactNode }) {
  const reinit = useEtat((s) => s.reinitialiserReglages)
  return (
    <div className="onglet-options">
      {children}
      <button className="bouton-menu" onClick={() => reinit(cles)}>Réinitialiser cet onglet</button>
    </div>
  )
}

function Interface() {
  const theme = useEtat((s) => s.theme)
  const setTheme = useEtat((s) => s.setTheme)
  return (
    <Onglet cles={['accent', 'tailleTexte', 'largeurGauche', 'largeurDroite', 'panneauGauche', 'panneauDroit', 'bandeauBas', 'mentionFictif', 'boutonsCamera', 'recherche', 'aideClavier', 'etiquettesZones', 'etiquettesNiveaux', 'infobulles', 'tailleEtiquettes']}>
      <h4>Apparence</h4>
      <label className="option-ligne"><input type="checkbox" checked={theme === 'sombre'} onChange={(e) => setTheme(e.target.checked ? 'sombre' : 'clair')} /><span>Mode sombre</span><span className="retablir vide" /></label>
      <Couleur k="accent" libelle="Couleur d’accent" />
      <Curseur k="tailleTexte" libelle="Taille du texte" min={80} max={140} pas={5} unite=" %" />
      <h4>Panneaux</h4>
      <Interrupteur k="panneauGauche" libelle="Panneau de gauche (niveaux, calques, légende)" />
      <Interrupteur k="panneauDroit" libelle="Panneau de droite (fiche détail)" />
      <Interrupteur k="bandeauBas" libelle="Bandeau du bas (indicateurs)" />
      <Curseur k="largeurGauche" libelle="Largeur du panneau de gauche" min={240} max={440} pas={10} unite=" px" />
      <Curseur k="largeurDroite" libelle="Largeur du panneau de droite" min={260} max={480} pas={10} unite=" px" />
      <h4>Éléments de l’écran</h4>
      <Interrupteur k="recherche" libelle="Barre de recherche" />
      <Interrupteur k="boutonsCamera" libelle="Boutons Recentrer, Dessus, Façade, lien" />
      <Interrupteur k="mentionFictif" libelle="Mention « données fictives »" />
      <Interrupteur k="aideClavier" libelle="Aide du clavier (panneau de gauche)" />
      <h4>Étiquettes et infobulles</h4>
      <Interrupteur k="etiquettesZones" libelle="Noms des zones" />
      <Interrupteur k="etiquettesNiveaux" libelle="Noms des niveaux (R0, R1…)" />
      <Interrupteur k="infobulles" libelle="Infobulles au survol" />
      <Curseur k="tailleEtiquettes" libelle="Taille des étiquettes" min={70} max={160} pas={5} unite=" %" />
    </Onglet>
  )
}

function Camera() {
  return (
    <Onglet cles={['fov', 'rotationAuto', 'vitesseRotation', 'sensRotation', 'sensZoom', 'sensDeplacement', 'vitesseClavier', 'distanceMax', 'animations', 'vitesseCamera']}>
      <h4>Vue</h4>
      <Curseur k="fov" libelle="Champ de vision (grand angle ↔ téléobjectif)" min={25} max={80} pas={1} unite="°" />
      <Curseur k="distanceMax" libelle="Distance de recul maximale" min={60} max={260} pas={10} unite=" m" />
      <Interrupteur k="rotationAuto" libelle="Rotation automatique autour du bâtiment" />
      <Curseur k="vitesseRotation" libelle="Vitesse de la rotation automatique" min={0.2} max={4} pas={0.1} unite=" ×" />
      <h4>Souris et clavier</h4>
      <Curseur k="sensRotation" libelle="Sensibilité de la rotation" min={0.3} max={2.5} pas={0.1} unite=" ×" />
      <Curseur k="sensZoom" libelle="Sensibilité du zoom" min={0.3} max={2.5} pas={0.1} unite=" ×" />
      <Curseur k="sensDeplacement" libelle="Sensibilité du déplacement (clic droit)" min={0.3} max={2.5} pas={0.1} unite=" ×" />
      <Curseur k="vitesseClavier" libelle="Vitesse des flèches du clavier" min={0.4} max={3} pas={0.1} unite=" ×" />
      <h4>Animations</h4>
      <Interrupteur k="animations" libelle="Animations (flux, déplacements de caméra)" aide="Coupées : la caméra saute directement à sa destination, les flux ne bougent plus." />
      <Curseur k="vitesseCamera" libelle="Vitesse des déplacements de caméra" min={0.4} max={3} pas={0.1} unite=" ×" />
    </Onglet>
  )
}

function Rendu() {
  return (
    <Onglet cles={['qualite', 'brouillard', 'densiteBrouillard', 'couleurCiel', 'tailleEquipements', 'epaisseurLiens', 'opaciteZones', 'opaciteMeubles', 'anneaux', 'personnages', 'personnagesToutesVues', 'vitessePersonnages', 'effectifForce', 'ascenseurs']}>
      <h4>Rendu</h4>
      <Choix k="qualite" libelle="Qualité" options={[['economique', 'Économique (ordinateur lent)'], ['normale', 'Normale'], ['haute', 'Haute (écran très net)']]} />
      <Interrupteur k="brouillard" libelle="Brouillard lointain" />
      <Curseur k="densiteBrouillard" libelle="Densité du brouillard" min={0.2} max={3} pas={0.1} unite=" ×" />
      <Couleur k="couleurCiel" libelle="Couleur du ciel / du fond" />
      <h4>Éléments</h4>
      <InterrupteurDeco k="structure" libelle="Rectangles du bâtiment (dalles, enveloppe)" />
      <Curseur k="tailleEquipements" libelle="Taille des équipements" min={0.5} max={2.5} pas={0.1} unite=" ×" />
      <Curseur k="epaisseurLiens" libelle="Épaisseur des liens" min={0.5} max={3} pas={0.1} unite=" ×" />
      <Curseur k="opaciteZones" libelle="Opacité des zones" min={0.3} max={2} pas={0.1} unite=" ×" />
      <Curseur k="opaciteMeubles" libelle="Opacité des meubles (hors vue Architecture)" min={0.1} max={1} pas={0.05} />
      <Interrupteur k="anneaux" libelle="Anneaux (points d’entrée, risques)" />
      <h4>Vie du bâtiment</h4>
      <Interrupteur k="personnages" libelle="Personnages (travail, réunions, café…)" aide="Leur nombre suit la simulation d’une journée ; sans simulation : matinée type." />
      <Interrupteur k="personnagesToutesVues" libelle="Personnages dans toutes les vues" aide="Par défaut, ils n’apparaissent que dans les vues Architecture et Occupant, pour ne pas masquer les équipements." />
      <NombrePersonnes />
      <Curseur k="vitessePersonnages" libelle="Vitesse des personnages" min={0.3} max={2.5} pas={0.1} unite=" ×" />
      <Interrupteur k="ascenseurs" libelle="Ascenseurs animés" />
    </Onglet>
  )
}

function Decor() {
  const set = useEtat((s) => s.setReglage)
  return (
    <Onglet cles={['ecartNiveaux', 'ecartPieces', 'densiteArbres', 'nbImmeubles', 'graineDecor', 'couleurHerbe']}>
      <h4>Vue éclatée</h4>
      <Curseur k="ecartNiveaux" libelle="Écart entre les niveaux" min={2} max={14} pas={0.5} unite=" m" />
      <Curseur k="ecartPieces" libelle="Écart entre les pièces" min={0.2} max={1.2} pas={0.05} unite=" ×" />
      <h4>Décor</h4>
      <p className="discret">Le décor est grossier et purement visuel. Il n’influe pas sur les indicateurs.</p>
      <InterrupteurDeco k="herbe" libelle="Herbe, parvis et route" />
      <InterrupteurDeco k="arbres" libelle="Arbres" />
      <InterrupteurDeco k="batiments" libelle="Bâtiments au loin" />
      <InterrupteurDeco k="meubles" libelle="Meubles à l’intérieur" />
      <Curseur k="densiteArbres" libelle="Quantité d’arbres" min={0} max={100} pas={5} unite=" %" />
      <Curseur k="nbImmeubles" libelle="Nombre de bâtiments au loin" min={0} max={16} pas={1} />
      <Couleur k="couleurHerbe" libelle="Couleur de l’herbe" />
      <div className="option-ligne">
        <span>Disposition du décor (n° {useEtat((s) => s.reglages.graineDecor)})</span>
        <button className="mini" onClick={() => set('graineDecor', 1 + Math.floor(Math.random() * 999))}>Autre disposition</button>
      </div>
    </Onglet>
  )
}

function Demarrage() {
  const s = useEtat()
  return (
    <Onglet cles={['demarrageVue', 'demarrageMinimumVital', 'demarrageSeuil', 'dureeEtapeScenario', 'vitesseJournee']}>
      <h4>Au démarrage de l’appli</h4>
      <p className="discret">Appliqué à l’ouverture, sauf si le lien ouvert impose sa propre vue.</p>
      <Choix k="demarrageVue" libelle="Vue de départ" options={VUES_IDS.map((id) => [id, VUES.find((v) => v.id === id)?.nom ?? id])} />
      <Interrupteur k="demarrageMinimumVital" libelle="Démarrer en mode Minimum vital" />
      <Curseur k="demarrageSeuil" libelle="Seuil d’anonymat de départ" min={2} max={20} pas={1} unite=" pers." />
      <button className="bouton-menu" onClick={() => { s.setReglage('demarrageVue', s.vue); s.setReglage('demarrageMinimumVital', s.minimumVital); s.setReglage('demarrageSeuil', s.seuilAnonymat) }}>
        Utiliser la vue, le mode et le seuil actuels au démarrage
      </button>
      <h4>Animations des scénarios</h4>
      <Curseur k="dureeEtapeScenario" libelle="Durée d’une étape de scénario" min={1} max={10} pas={0.5} unite=" s" />
      <Curseur k="vitesseJournee" libelle="Vitesse de la simulation d’une journée" min={0.1} max={3} pas={0.1} unite=" h/s" />
    </Onglet>
  )
}

function Configuration() {
  const s = useEtat()
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)
  const [colle, setColle] = useState('')
  const fichier = useRef<HTMLInputElement>(null)
  const modele = useRef<HTMLInputElement>(null)

  const exporter = () => JSON.stringify(s.exporterConfig(), null, 2)
  const telecharger = () => {
    const url = URL.createObjectURL(new Blob([exporter()], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'groundvengers-config.json'
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ ok: true, texte: 'Configuration téléchargée (groundvengers-config.json).' })
  }
  const copierLienConfig = async () => {
    const nb = decoderConfig(encoderConfig(s.reglages, s.deco), s.theme)?.nb ?? 0
    try {
      await navigator.clipboard.writeText(lienAvecConfig())
      setMessage({ ok: true, texte: nb ? `Lien copié, avec ${nb} réglage${nb > 1 ? 's' : ''} modifié${nb > 1 ? 's' : ''}. Le thème clair/sombre n’est pas transmis.` : 'Lien copié (réglages par défaut : rien à appliquer pour la personne qui l’ouvre).' })
    } catch { setMessage({ ok: false, texte: 'Copie impossible depuis ce navigateur.' }) }
  }
  const copier = async () => {
    try { await navigator.clipboard.writeText(exporter()); setMessage({ ok: true, texte: 'Configuration copiée dans le presse-papiers.' }) }
    catch { setMessage({ ok: false, texte: 'Copie impossible ici : utilisez le téléchargement.' }) }
  }
  const importer = (texte: string) => {
    const r = lireConfig(texte)
    if (!r.ok) { setMessage({ ok: false, texte: r.raison }); return }
    s.appliquerConfig(r.config)
    setMessage({ ok: true, texte: 'Configuration appliquée.' + (r.ignores.length ? ` Réglages inconnus ignorés : ${r.ignores.join(', ')}.` : '') })
    setColle('')
  }

  return (
    <div className="onglet-options">
      <h4>Exporter</h4>
      <p className="discret">La configuration contient le thème, le décor et tous les réglages de ces onglets. Elle ne contient ni donnée du bâtiment, ni modèle 3D.</p>
      <div className="option-boutons">
        <button className="bouton-menu" onClick={telecharger}>Télécharger (.json)</button>
        <button className="bouton-menu" onClick={copier}>Copier</button>
        <button className="bouton-menu" onClick={copierLienConfig} title="Un lien qui rouvre la vue actuelle ; la personne qui l'ouvre choisit d'appliquer ou non tes réglages">Copier le lien</button>
      </div>
      <button className="bouton-menu" onClick={() => telechargerTexte('groundvengers-rapport.md', construireRapport())}>
        Rapport de l’état actuel (.md)
      </button>
      <p className="discret">Indicateurs dans les deux modes, zones non anonymes, occupation simulée, risques critiques : à coller dans un compte rendu.</p>
      <h4>Importer</h4>
      <button className="bouton-menu" onClick={() => fichier.current?.click()}>Choisir un fichier .json…</button>
      <input ref={fichier} type="file" accept=".json,application/json" hidden
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) importer(await f.text()); e.target.value = '' }} />
      <textarea className="option-colle" placeholder="… ou collez ici une configuration" value={colle} onChange={(e) => setColle(e.target.value)} rows={4} />
      <button className="bouton-menu" disabled={!colle.trim()} onClick={() => importer(colle)}>Appliquer le texte collé</button>
      {message && <p className={message.ok ? 'phrase-occupant' : 'alerte-bloc'} role="status">{message.texte}</p>}
      <h4>Réinitialiser</h4>
      <button className="bouton-menu" onClick={() => { if (confirm('Remettre tous les réglages, le thème et le décor par défaut ?')) { s.reinitialiserReglages(); setMessage({ ok: true, texte: 'Tout est remis par défaut.' }) } }}>
        Tout remettre par défaut
      </button>
      <h4>Modèle 3D</h4>
      <button className="bouton-menu" onClick={() => modele.current?.click()}>Charger un fichier .glb…</button>
      <input ref={modele} type="file" accept=".glb,model/gltf-binary" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) chargerModele(f); e.target.value = '' }} />
      <p className="discret">Ou glissez-déposez un .glb sur la vue 3D. Les objets nommés comme un identifiant ouvrent leur fiche.</p>
    </div>
  )
}

const ONGLETS: [string, string, () => React.ReactElement][] = [
  ['interface', 'Interface', Interface],
  ['camera', 'Caméra', Camera],
  ['rendu', 'Rendu', Rendu],
  ['decor', 'Décor', Decor],
  ['demarrage', 'Démarrage', Demarrage],
  ['config', 'Configuration', Configuration],
]

/** Bouton « Options » de la barre verte et tiroir de personnalisation. */
export function Options() {
  const [ouvert, setOuvert] = useState(false)
  const [onglet, setOnglet] = useState('interface')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ouvert) return
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false) }
    const dehors = (e: MouseEvent) => {
      const cible = e.target as HTMLElement
      if (!ref.current?.contains(cible) && !cible.closest('.bouton-options')) setOuvert(false)
    }
    document.addEventListener('keydown', echap)
    document.addEventListener('mousedown', dehors)
    return () => { document.removeEventListener('keydown', echap); document.removeEventListener('mousedown', dehors) }
  }, [ouvert])
  const Contenu = ONGLETS.find(([id]) => id === onglet)![2]
  return (
    <>
      <button className={`bouton-options ${ouvert ? 'ouvert' : ''}`} onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert}>Options ▾</button>
      {ouvert && (
        <aside className="tiroir-options" ref={ref} role="dialog" aria-label="Options de personnalisation">
          <div className="tiroir-entete">
            <b>Options</b>
            <button className="fermer-tiroir" onClick={() => setOuvert(false)} aria-label="Fermer">×</button>
          </div>
          <nav className="tiroir-onglets">
            {ONGLETS.map(([id, nom]) => <button key={id} className={onglet === id ? 'actif' : ''} onClick={() => setOnglet(id)}>{nom}</button>)}
          </nav>
          <div className="tiroir-corps"><Contenu /></div>
        </aside>
      )}
    </>
  )
}
