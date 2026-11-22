import { useEtat } from '../store'

/** Charge un .glb choisi par la personne ; refuse les autres formats. */
export function chargerModele(f: File): boolean {
  if (!/\.glb$/i.test(f.name)) { alert('Seuls les fichiers .glb sont acceptés (glTF binaire). Voir docs/EXPORT-3D.md.'); return false }
  useEtat.getState().setModeleLocal(f)
  return true
}
