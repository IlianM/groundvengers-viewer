import { useEffect, useState } from 'react'
import { useEtat } from '../store'
import { ETAPES, dureeEtape, jouerEtape, arreterVisite } from '../visite'

/** Cadre lumineux autour de l'élément d'interface expliqué ; le reste de l'écran est légèrement assombri. */
function Halo({ selecteur }: { selecteur?: string }) {
  const [r, setR] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!selecteur) { setR(null); return }
    let raf = 0
    const lire = () => {
      const el = document.querySelector(selecteur)
      const b = el ? el.getBoundingClientRect() : null
      setR((prev) => (b && b.width > 0 && b.height > 0 ? (prev && prev.x === b.x && prev.y === b.y && prev.width === b.width && prev.height === b.height ? prev : b) : null))
      raf = requestAnimationFrame(lire)
    }
    lire()
    return () => cancelAnimationFrame(raf)
  }, [selecteur])
  if (!r) return null
  return <div className="visite-halo" style={{ left: r.x - 4, top: r.y - 4, width: r.width + 8, height: r.height + 8 }} />
}

export function Visite() {
  const visite = useEtat((s) => s.visite)
  const setVisite = useEtat((s) => s.setVisite)
  const [ecoule, setEcoule] = useState(0)
  const i = visite?.i ?? -1
  const auto = visite?.auto ?? false
  const n = ETAPES.length

  // à chaque changement d'étape : on règle l'application et on repart de zéro
  useEffect(() => {
    if (i < 0) return
    jouerEtape(i)
    setEcoule(0)
  }, [i])

  const aller = (k: number) => setVisite({ i: Math.min(n - 1, Math.max(0, k)), auto: useEtat.getState().visite?.auto ?? false })

  // lecture automatique
  useEffect(() => {
    if (i < 0 || !auto) return
    const duree = dureeEtape(ETAPES[i])
    const id = setInterval(() => {
      setEcoule((t) => {
        if (t + 0.1 < duree) return t + 0.1
        if (i < n - 1) setVisite({ i: i + 1, auto: true })
        else setVisite({ i, auto: false })
        return t
      })
    }, 100)
    return () => clearInterval(id)
  }, [i, auto, n, setVisite])

  // clavier
  useEffect(() => {
    if (i < 0) return
    const touche = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return
      if (e.key === 'Escape') arreterVisite()
      else if (e.key === 'ArrowRight' && !e.shiftKey) { e.preventDefault(); e.stopImmediatePropagation(); aller(i + 1) }
      else if (e.key === 'ArrowLeft' && !e.shiftKey) { e.preventDefault(); e.stopImmediatePropagation(); aller(i - 1) }
      else if (e.key === ' ') { e.preventDefault(); setVisite({ i, auto: !auto }) }
    }
    window.addEventListener('keydown', touche, true)
    return () => window.removeEventListener('keydown', touche, true)
  })

  if (!visite) return null
  const e = ETAPES[i]
  const duree = dureeEtape(e)
  return (
    <>
      <Halo selecteur={e.cible} />
      <div className="visite" role="dialog" aria-label="Visite guidée">
        <div className="visite-tete">
          <span>Visite guidée · {i + 1} / {n}</span>
          <button className="visite-x" onClick={() => arreterVisite()} aria-label="Quitter la visite">×</button>
        </div>
        <h3>{e.titre}</h3>
        <p>{e.texte}</p>
        <div className="visite-progres"><div style={{ width: `${auto ? Math.min(100, (ecoule / duree) * 100) : (i / (n - 1)) * 100}%` }} className={auto ? 'etape' : 'global'} /></div>
        <div className="visite-nav">
          <button disabled={i === 0} onClick={() => aller(i - 1)}>← Précédent</button>
          <button onClick={() => setVisite({ i, auto: !auto })}>{auto ? '❚❚ Pause' : '▶ Lecture'}</button>
          {i < n - 1 ? <button onClick={() => aller(i + 1)}>Suivant →</button> : <button onClick={() => arreterVisite()}>Terminer</button>}
        </div>
      </div>
    </>
  )
}
