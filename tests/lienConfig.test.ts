import { describe, it, expect } from 'vitest'
import { encoderConfig, decoderConfig, LONGUEUR_MAX_CFG } from '../src/lienConfig'
import { Reglages, REGLAGES_DEFAUT } from '../src/reglages'

const deco = { herbe: true, arbres: true, batiments: true, meubles: true, structure: true }
const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

describe('configuration partagée par lien', () => {
  it('rien à encoder quand tout est par défaut', () => {
    expect(encoderConfig(REGLAGES_DEFAUT, deco)).toBe('')
  })

  it('aller-retour : seuls les écarts sont transmis et retrouvés', () => {
    const r = Reglages.parse({ ...REGLAGES_DEFAUT, tailleTexte: 120, accent: '#aa0000', effectifForce: null, qualite: 'haute' })
    const texte = encoderConfig(r, { ...deco, herbe: false })
    expect(texte.length).toBeLessThan(300)
    expect(texte).toMatch(/^[A-Za-z0-9_-]+$/) // sûr dans une URL
    const lu = decoderConfig(texte, 'clair')!
    expect(lu.nb).toBe(5)
    expect(lu.config.reglages).toEqual(r)
    expect(lu.config.deco.herbe).toBe(false)
    expect(lu.config.theme).toBe('clair') // le thème reste celui de la personne qui ouvre
  })

  it('le lien reproduit les réglages du partageur, pas ceux du destinataire', () => {
    const lu = decoderConfig(b64({ v: 1, r: { fov: 60 } }), 'sombre')!
    expect(lu.config.reglages).toEqual({ ...REGLAGES_DEFAUT, fov: 60 })
  })

  it('une valeur hors bornes ou invalide est ramenée, jamais appliquée telle quelle', () => {
    const lu = decoderConfig(b64({ v: 1, r: { fov: 1e9, accent: 'url(javascript:alert(1))', tailleTexte: 'gros' } }), 'clair')!
    expect(lu.config.reglages.fov).toBe(80)
    expect(lu.config.reglages.accent).toBeNull()
    expect(lu.config.reglages.tailleTexte).toBe(REGLAGES_DEFAUT.tailleTexte)
  })

  it('ignore les clés inconnues et la pollution de prototype', () => {
    const brut = '{"v":1,"r":{"__proto__":{"admin":true},"constructor":{"x":1},"inconnu":3,"fov":55},"d":{"herbe":false,"pirate":false}}'
    const texte = btoa(brut).replace(/=+$/, '')
    const lu = decoderConfig(texte, 'clair')!
    expect(lu.config.reglages.fov).toBe(55)
    expect(({} as Record<string, unknown>).admin).toBeUndefined()
    expect('inconnu' in lu.config.reglages).toBe(false)
    expect(Object.keys(lu.config.deco)).not.toContain('pirate')
  })

  it('refuse ce qui est illisible, de mauvaise version ou trop gros', () => {
    expect(decoderConfig('%%%', 'clair')).toBeNull()
    expect(decoderConfig(b64({ v: 2, r: { fov: 60 } }), 'clair')).toBeNull()
    expect(decoderConfig(b64([1, 2, 3]), 'clair')).toBeNull()
    expect(decoderConfig('A'.repeat(LONGUEUR_MAX_CFG + 1), 'clair')).toBeNull()
    expect(decoderConfig('', 'clair')).toBeNull()
  })

  it('gère les caractères accentués', () => {
    // aucune valeur texte libre aujourd'hui, mais l'encodage doit rester sûr si l'on en ajoute
    const lu = decoderConfig(btoa(unescape(encodeURIComponent('{"v":1,"r":{"fov":50},"x":"é€"}'))).replace(/=+$/, ''), 'clair')
    expect(lu?.config.reglages.fov).toBe(50)
  })
})
