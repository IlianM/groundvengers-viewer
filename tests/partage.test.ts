import { describe, it, expect, beforeAll } from 'vitest'
import { useEtat } from '../src/store'
import { installerPartage, appliquerHash } from '../src/partage'

beforeAll(() => installerPartage())

const reinit = () => {
  const s = useEtat.getState()
  s.setComparaison(false); s.setVue('architecture'); s.setNiveau(null); s.setCoupe(false); s.setMinimumVital(false)
  s.setArchitectureIA('edge'); s.setSeuilAnonymat(5); s.setSimulation({ actif: false, heure: 8.5, lecture: false }); s.setSelection(null)
}

describe('lien de partage (hash de l’URL)', () => {
  it('une vue complète fait l’aller-retour', () => {
    reinit()
    const s = useEtat.getState()
    s.setVue('occupant'); s.setNiveau('R1'); s.setMinimumVital(true); s.setComparaison(true); s.setSeuilAnonymat(8)
    s.setSimulation({ actif: true, heure: 12.25, lecture: false })
    const hash = window.location.hash
    expect(hash).toContain('vue=occupant'); expect(hash).toContain('cmp=1'); expect(hash).toContain('mv=1')
    reinit()
    appliquerHash(hash)
    const t = useEtat.getState()
    expect([t.vue, t.niveau, t.minimumVital, t.comparaison, t.seuilAnonymat, t.simulation.actif, t.simulation.heure]).toEqual(['occupant', 'R1', true, true, 8, true, 12.25])
  })

  it('une valeur inconnue ou absurde est ignorée', () => {
    reinit()
    appliquerHash('#vue=nimporte&niveau=R9&seuil=9999&h=abc&sim=1&sel=XXX')
    const t = useEtat.getState()
    expect(t.vue).toBe('architecture'); expect(t.niveau).toBeNull(); expect(t.seuilAnonymat).toBe(5)
    expect(Number.isFinite(t.simulation.heure)).toBe(true); expect(t.selection).toBeNull()
  })

  it('une configuration reçue par lien attend l’accord avant d’être appliquée', () => {
    reinit()
    useEtat.getState().proposerConfig(null)
    const avant = useEtat.getState().reglages
    const cfg = btoa(JSON.stringify({ v: 1, r: { tailleTexte: 130 } })).replace(/=+$/, '')
    appliquerHash(`#vue=ia&cfg=${cfg}`)
    const t = useEtat.getState()
    expect(t.configEnAttente?.nb).toBe(1)
    expect(t.reglages).toBe(avant) // rien n'a changé tant que la personne n'a pas accepté
  })

  it('un cfg illisible ne propose rien', () => {
    useEtat.getState().proposerConfig(null)
    appliquerHash('#cfg=%%%pasbase64')
    expect(useEtat.getState().configEnAttente).toBeNull()
  })
})
