// Aller à un élément : règle l'état de l'appli pour qu'il soit visible, le sélectionne et place la caméra.
import { donnees, positionMonde, altitudeNiveau, pointMonde, decalageZone } from './data'
import { useEtat, ECART_ECLATE } from './store'
import { VUES, type VueId } from './views'

const sansAccent = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export type Resultat = {
  id: string // id à sélectionner (équipement ou zone)
  genre: 'zone' | 'equipement' | 'noeud' | 'gaine'
  titre: string
  detail: string
  score: number
  vue?: VueId // vue à privilégier (nœud IA)
}

type Cible = { id: string; vue?: VueId }

/** Recherche plein texte (sans accent ni casse) ; tous les mots saisis doivent être trouvés. */
export function chercher(requete: string, max = 8): Resultat[] {
  const mots = sansAccent(requete).split(/\s+/).filter(Boolean)
  if (mots.length === 0) return []
  const out: Resultat[] = []
  const evalue = (nom: string, autres: string): number => {
    const n = sansAccent(nom)
    const tout = `${n} ${sansAccent(autres)}`
    if (!mots.every((m) => tout.includes(m))) return -1
    if (n.startsWith(mots[0])) return 3
    if (mots.every((m) => n.includes(m))) return 2
    return 1
  }
  for (const z of donnees.batiment.zones) {
    const s = evalue(z.nom, `${z.id} ${z.type} ${z.niveau} zone`)
    if (s >= 0) out.push({ id: z.id, genre: 'zone', titre: z.nom, detail: `Zone · ${z.niveau} · ${z.id}`, score: s })
  }
  for (const e of donnees.equipements) {
    const zone = e.zone ? donnees.zoneParId.get(e.zone)?.nom ?? '' : ''
    const autres = [e.id, e.type, e.categorie, e.protocole, e.reseau, e.equipe, e.niveau, zone, ...Object.values(e.config)].join(' ')
    const s = evalue(e.nom, autres)
    if (s >= 0) out.push({ id: e.id, genre: 'equipement', titre: e.nom, detail: `${e.type} · ${e.niveau} · ${e.id}`, score: s })
  }
  for (const g of donnees.gaines) {
    const s = evalue(g.nom, `${g.id} ${g.reseau} ${g.niveau ?? ''} ${g.de ?? ''} ${g.a ?? ''} gaine gaines chemin cables cable montante`)
    if (s >= 0) {
      out.push({ id: g.id, genre: 'gaine', vue: 'cyber', score: s, titre: g.nom,
        detail: `${g.type === 'montante' ? 'Montante' : 'Gaine'} · ${g.type === 'montante' ? `${g.de} → ${g.a}` : g.niveau} · ${g.id}` })
    }
  }
  for (const n of donnees.noeuds) {
    const hote = donnees.parId.get(n.heberge_sur)
    const s = evalue(n.id, `${n.modele} ${n.architecture} ${n.frequence} ia nœud noeud modele ${hote?.nom ?? ''}`)
    if (s >= 0) {
      out.push({
        id: n.heberge_sur, genre: 'noeud', vue: 'ia', score: s - 0.5,
        titre: `${n.id} (modèle IA)`, detail: `${n.architecture === 'edge' ? 'Edge' : 'Central'} · hébergé sur ${hote?.nom ?? n.heberge_sur}`,
      })
    }
  }
  return out.sort((a, b) => b.score - a.score || a.titre.localeCompare(b.titre)).slice(0, max)
}

const DECALAGE: [number, number, number] = [12, 9, 15] // distance de la caméra à l'élément trouvé
const DECALAGE_ZONE: [number, number, number] = [16, 14, 20]

export function reveler(cible: Cible) {
  const s = useEtat.getState()
  if (s.scene !== null) s.setScene(null)
  const zone = donnees.zoneParId.get(cible.id)
  if (zone) {
    const [w, d] = donnees.batiment.emprise
    const alt = altitudeNiveau(zone.niveau, s.eclate ? ECART_ECLATE : 0)
    const [dx, dz] = decalageZone(zone, s.eclatePieces ? 1 : 0)
    const c: [number, number, number] = [zone.rect[0] + zone.rect[2] / 2 - w / 2 + dx, alt, zone.rect[1] + zone.rect[3] / 2 - d / 2 + dz]
    if (s.niveau && s.niveau !== zone.niveau) s.setNiveau(zone.niveau)
    if (s.calquesMasques.has('zones')) s.basculerCalque('zones')
    s.setSelection(zone.id)
    s.allerA([c[0] + DECALAGE_ZONE[0], c[1] + DECALAGE_ZONE[1], c[2] + DECALAGE_ZONE[2]], c)
    return
  }
  const g = donnees.gaineParId.get(cible.id)
  if (g) {
    if (s.vue !== 'cyber') s.setVue('cyber')
    if (useEtat.getState().calquesMasques.has('gaines')) s.basculerCalque('gaines')
    const alt = (i: string) => donnees.batiment.niveaux.find((n) => n.id === i)?.altitude ?? 0
    const niv = g.type === 'montante' ? g.de! : g.niveau!
    if (s.niveau && (g.type === 'horizontale' ? s.niveau !== niv : alt(s.niveau) < alt(g.de!) || alt(s.niveau) > alt(g.a!))) s.setNiveau(null)
    s.setSelection(g.id)
    const pts = g.chemin.map(([x, z]) => pointMonde(niv, x, g.hauteur, z, s.eclate ? ECART_ECLATE : 0, s.eclatePieces ? 1 : 0))
    const c: [number, number, number] = [
      pts.reduce((a, q) => a + q[0], 0) / pts.length,
      g.type === 'montante' ? (altitudeNiveau(g.de!, s.eclate ? ECART_ECLATE : 0) + altitudeNiveau(g.a!, s.eclate ? ECART_ECLATE : 0)) / 2 : pts[0][1],
      pts.reduce((a, q) => a + q[2], 0) / pts.length,
    ]
    s.allerA([c[0] + DECALAGE_ZONE[0], c[1] + DECALAGE_ZONE[1], c[2] + DECALAGE_ZONE[2]], c)
    return
  }
  const e = donnees.parId.get(cible.id)
  if (!e) return

  // Vue : on garde la courante si elle montre l'équipement, sinon la première qui le montre.
  const montre = (v: VueId, archi: 'edge' | 'central') => VUES.find((x) => x.id === v)!.montre(e, { architectureIA: archi })
  let vue: VueId = cible.vue ?? s.vue
  let archi = s.architectureIA
  if (!montre(vue, archi)) {
    const trouve = VUES.flatMap((v) => (['edge', 'central'] as const).map((a) => ({ v: v.id, a })))
      .sort((x, y) => Number(y.a === archi) - Number(x.a === archi))
      .find(({ v, a }) => montre(v, a))
    if (trouve) { vue = trouve.v; archi = trouve.a }
  }
  if (vue !== s.vue) s.setVue(vue) // réinitialise calques et sélection
  if (archi !== s.architectureIA) s.setArchitectureIA(archi)
  if (s.minimumVital && !e.donnee.minimum_vital) s.setMinimumVital(false)
  if (s.niveau && s.niveau !== e.niveau) s.setNiveau(e.niveau)
  if (useEtat.getState().calquesMasques.has(e.categorie)) s.basculerCalque(e.categorie)
  s.setSelection(e.id)
  const c = positionMonde(e, s.eclate ? ECART_ECLATE : 0, s.eclatePieces ? 1 : 0)
  s.allerA([c[0] + DECALAGE[0], c[1] + DECALAGE[1], c[2] + DECALAGE[2]], c)
}
