// URL partageable : la vue, le niveau et la sélection sont écrits dans le hash (#vue=cyber&niveau=R1&sel=…).
// Le thème et le décor restent des préférences personnelles et ne sont pas partagés.
import { donnees } from './data'
import { useEtat } from './store'
import { VUES, type VueId } from './views'
import { reveler } from './navigation'

const SEUIL_DEFAUT = 5

function versHash(): string {
  const s = useEtat.getState()
  const p = new URLSearchParams()
  if (s.vue !== 'architecture') p.set('vue', s.vue)
  if (s.niveau) p.set('niveau', s.niveau)
  if (s.coupe && s.niveau) p.set('coupe', '1')
  if (s.minimumVital) p.set('mv', '1')
  if (s.architectureIA !== 'edge') p.set('ia', s.architectureIA)
  if (s.seuilAnonymat !== SEUIL_DEFAUT) p.set('seuil', String(s.seuilAnonymat))
  if (s.eclate) p.set('ecl', '1')
  if (s.eclatePieces) p.set('pcs', '1')
  if (s.risqueActif) p.set('rsk', s.risqueActif)
  if (s.scenarioActif) { p.set('scn', s.scenarioActif.id); if (s.scenarioActif.etape > 0) p.set('etp', String(s.scenarioActif.etape + 1)) }
  if (s.selection) p.set('sel', s.selection)
  return p.toString()
}

/** Applique un hash à l'état ; les valeurs inconnues sont ignorées. */
export function appliquerHash(hash: string) {
  const p = new URLSearchParams(hash.replace(/^#/, ''))
  const s = useEtat.getState()
  const vue = p.get('vue') ?? 'architecture'
  const niveau = p.get('niveau')
  const seuil = Number(p.get('seuil') ?? SEUIL_DEFAUT)
  s.setVue((VUES.some((v) => v.id === vue) ? vue : 'architecture') as VueId)
  s.setNiveau(niveau && donnees.batiment.niveaux.some((n) => n.id === niveau) ? niveau : null)
  s.setCoupe(p.get('coupe') === '1')
  s.setMinimumVital(p.get('mv') === '1')
  s.setArchitectureIA(p.get('ia') === 'central' ? 'central' : 'edge')
  s.setSeuilAnonymat(Number.isFinite(seuil) && seuil >= 1 && seuil <= 50 ? Math.round(seuil) : SEUIL_DEFAUT)
  if (s.eclate !== (p.get('ecl') === '1')) s.setEclate(p.get('ecl') === '1')
  if (s.eclatePieces !== (p.get('pcs') === '1')) s.setEclatePieces(p.get('pcs') === '1')
  const rsk = p.get('rsk')
  if (rsk && useEtat.getState().vue === 'risques' && donnees.risques.some((r) => r.id === rsk)) useEtat.getState().setRisqueActif(rsk)
  const scn = p.get('scn')
  const sc = donnees.scenarios.find((x) => x.id === scn)
  if (sc && useEtat.getState().vue === 'cyber') {
    const etp = Math.min(Math.max(Number(p.get('etp') ?? 1), 1), sc.etapes.length) - 1
    useEtat.setState({ scenarioActif: { id: sc.id, etape: Number.isFinite(etp) ? etp : 0, lecture: false } })
  }
  const sel = p.get('sel')
  if (sel && (donnees.parId.has(sel) || donnees.zoneParId.has(sel) || donnees.gaineParId.has(sel))) reveler({ id: sel })
  else useEtat.getState().setSelection(null)
}

function ecrire() {
  if (useEtat.getState().scene !== null) return // pas pendant la présentation
  const h = versHash()
  if (h === window.location.hash.replace(/^#/, '')) return
  history.replaceState(null, '', window.location.pathname + window.location.search + (h ? `#${h}` : ''))
}

export function installerPartage() {
  if (window.location.hash.length > 1) appliquerHash(window.location.hash)
  useEtat.subscribe(ecrire)
  // un lien collé dans l'onglet déjà ouvert ne recharge pas la page : on relit le hash
  window.addEventListener('hashchange', () => {
    if (window.location.hash.replace(/^#/, '') !== versHash()) appliquerHash(window.location.hash)
  })
}

export async function copierLien(): Promise<boolean> {
  ecrire()
  try {
    await navigator.clipboard.writeText(window.location.href)
    return true
  } catch {
    return false
  }
}
