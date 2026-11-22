// Configuration partagée par lien : seuls les réglages qui diffèrent des valeurs par défaut sont écrits, en JSON puis base64url,
// dans le paramètre « cfg » du hash. Le thème clair/sombre reste personnel et n'est pas transmis.
// Aucune dépendance au store : ce module se teste seul.
import { Config, Reglages, REGLAGES_DEFAUT, DECO_IDS, FORMAT_CONFIG } from './reglages'

export const LONGUEUR_MAX_CFG = 6000
const DECO_DEFAUT = Object.fromEntries(DECO_IDS.map((k) => [k, true])) as Record<(typeof DECO_IDS)[number], boolean>

type Charge = { v: 1; r?: Record<string, unknown>; d?: Record<string, boolean> }

const versBase64Url = (t: string) => {
  const octets = new TextEncoder().encode(t)
  let b = ''
  octets.forEach((o) => { b += String.fromCharCode(o) })
  return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const depuisBase64Url = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)))
}

/** Réglages et décor qui diffèrent des valeurs par défaut. */
export function ecarts(reglages: Reglages, deco: Record<string, boolean>) {
  const r: Record<string, unknown> = {}
  for (const k of Object.keys(REGLAGES_DEFAUT) as (keyof Reglages)[]) {
    if (JSON.stringify(reglages[k]) !== JSON.stringify(REGLAGES_DEFAUT[k])) r[k] = reglages[k]
  }
  const d: Record<string, boolean> = {}
  for (const k of DECO_IDS) if (deco[k] !== DECO_DEFAUT[k]) d[k] = deco[k]
  return { r, d }
}

/** Texte à mettre dans `cfg=` ; chaîne vide si tout est par défaut. */
export function encoderConfig(reglages: Reglages, deco: Record<string, boolean>): string {
  const { r, d } = ecarts(reglages, deco)
  if (Object.keys(r).length === 0 && Object.keys(d).length === 0) return ''
  const charge: Charge = { v: 1 }
  if (Object.keys(r).length) charge.r = r
  if (Object.keys(d).length) charge.d = d
  return versBase64Url(JSON.stringify(charge))
}

/** Relit un `cfg=` : renvoie la configuration validée (valeurs hors bornes ramenées, inconnues ignorées) ou null si illisible. */
export function decoderConfig(texte: string, theme: 'clair' | 'sombre'): { config: Config; nb: number } | null {
  if (!texte || texte.length > LONGUEUR_MAX_CFG) return null
  let brut: unknown
  try { brut = JSON.parse(depuisBase64Url(texte)) } catch { return null }
  if (typeof brut !== 'object' || brut === null || (brut as Charge).v !== 1) return null
  const { r, d } = brut as Charge
  const regl = typeof r === 'object' && r !== null && !Array.isArray(r) ? r : {}
  const deco = typeof d === 'object' && d !== null && !Array.isArray(d) ? d : {}
  const connus = new Set(Object.keys(REGLAGES_DEFAUT))
  const reglages = Reglages.parse({ ...REGLAGES_DEFAUT, ...Object.fromEntries(Object.entries(regl).filter(([k]) => connus.has(k))) })
  const decoPropre = { ...DECO_DEFAUT, ...Object.fromEntries(Object.entries(deco).filter(([k, v]) => (DECO_IDS as readonly string[]).includes(k) && typeof v === 'boolean')) }
  const config = Config.parse({ format: FORMAT_CONFIG, version: 1, theme, deco: decoPropre, reglages })
  const e = ecarts(config.reglages, config.deco)
  return { config, nb: Object.keys(e.r).length + Object.keys(e.d).length }
}
