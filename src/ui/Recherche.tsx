import { useEffect, useMemo, useRef, useState } from 'react'
import { chercher, reveler } from '../navigation'

/** Recherche d'un équipement, d'une zone ou d'un modèle IA (touche « / » pour y aller). */
export function Recherche() {
  const [texte, setTexte] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(0)
  const champ = useRef<HTMLInputElement>(null)
  const racine = useRef<HTMLDivElement>(null)
  const resultats = useMemo(() => chercher(texte), [texte])

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(cible.tagName)) {
        e.preventDefault()
        champ.current?.focus()
      }
    }
    const dehors = (e: MouseEvent) => { if (!racine.current?.contains(e.target as Node)) setOuvert(false) }
    document.addEventListener('keydown', touche)
    document.addEventListener('mousedown', dehors)
    return () => { document.removeEventListener('keydown', touche); document.removeEventListener('mousedown', dehors) }
  }, [])

  const choisir = (i: number) => {
    const r = resultats[i]
    if (!r) return
    reveler({ id: r.id, vue: r.vue })
    setOuvert(false)
    champ.current?.blur()
  }

  return (
    <div className="recherche" ref={racine}>
      <input
        ref={champ}
        type="search"
        placeholder="Rechercher (touche /)"
        value={texte}
        aria-label="Rechercher un équipement, une zone ou un modèle IA"
        onChange={(e) => { setTexte(e.target.value); setActif(0); setOuvert(true) }}
        onFocus={() => setOuvert(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActif((a) => Math.min(a + 1, resultats.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActif((a) => Math.max(a - 1, 0)) }
          else if (e.key === 'Enter') choisir(actif)
          else if (e.key === 'Escape') { setOuvert(false); champ.current?.blur() }
        }}
      />
      {ouvert && texte.trim() !== '' && (
        <ul className="recherche-liste" role="listbox">
          {resultats.length === 0 && <li className="aucun">Aucun résultat</li>}
          {resultats.map((r, i) => (
            <li key={`${r.genre}-${r.titre}-${r.id}`} role="option" aria-selected={i === actif}
                className={i === actif ? 'actif' : ''} onMouseEnter={() => setActif(i)} onMouseDown={() => choisir(i)}>
              <b>{r.titre}</b>
              <small>{r.detail}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
