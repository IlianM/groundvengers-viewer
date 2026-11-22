import { hash } from './comportement'
import type { Zone } from '../../schema'
import { donnees } from '../../data'

/** Profils FICTIFS, déterministes : aucun lien avec une personne réelle. */
const PRENOMS = ['Camille', 'Lucas', 'Inès', 'Hugo', 'Léa', 'Nolan', 'Manon', 'Yanis', 'Zoé', 'Théo', 'Jade', 'Adam', 'Louise', 'Rayan', 'Alice', 'Samir', 'Chloé', 'Maël', 'Nina', 'Karim', 'Eva', 'Tom', 'Salomé', 'Ilyès', 'Anaïs', 'Bastien', 'Lina', 'Malo', 'Maya', 'Enzo']
const POSTES = ['Data scientist', 'Ingénieur réseau', 'Analyste cybersécurité', 'Chef de projet', 'Designer', 'Développeur', 'Technicien GTB', 'Product owner', 'Architecte SI', 'Juriste', 'Comptable', 'Chargé de support']
const EQUIPES = ['IA', 'Cyber', 'Domotique', 'Produit', 'Support', 'Finance']

export type Bloc = { debut: number; fin: number; type: 'arrivee' | 'travail' | 'reunion' | 'dejeuner' | 'pause' | 'depart' | 'accueil'; lieu: string }
export type Profil = {
  nom: string
  poste: string
  equipe: string
  planning: Bloc[]
  temperature: number // °C préférée
  luminosite: number // lux préférés
  ventilation: 'douce' | 'moyenne' | 'forte'
  fenetre: boolean
}

export const COULEUR_BLOC: Record<Bloc['type'], string> = {
  arrivee: '#868e96', travail: '#4dabf7', reunion: '#9775fa', dejeuner: '#ffa94d', pause: '#69db7c', depart: '#868e96', accueil: '#3bc9db',
}
export const LIBELLE_BLOC: Record<Bloc['type'], string> = {
  arrivee: 'Arrivée', travail: 'Travail individuel', reunion: 'Réunion', dejeuner: 'Déjeuner', pause: 'Pause café', depart: 'Départ', accueil: 'Accueil des visiteurs',
}

const nomZone = (id: string | undefined, repli: string) => (id ? donnees.zoneParId.get(id)?.nom : undefined) ?? repli

/** Retire d'un bloc la partie qui chevauche `f` (le bloc peut se scinder en deux). */
function sans(b: Bloc, f: Bloc): Bloc[] {
  if (b.fin <= f.debut || b.debut >= f.fin) return [b]
  const r: Bloc[] = []
  if (b.debut < f.debut) r.push({ ...b, fin: f.debut })
  if (b.fin > f.fin) r.push({ ...b, debut: f.fin })
  return r
}

/**
 * Agenda fictif d'une personne. Il reste cohérent avec l'endroit où elle se trouve à `heure` :
 * en salle de réunion elle est en réunion, à la cafétéria en pause ou au déjeuner, à son bureau elle travaille.
 */
export function profilDe(cle: string, zone: Zone, heure = 10.5, tache = 'bureau'): Profil {
  const h = hash(cle)
  const t0 = Math.floor(heure * 4) / 4
  const accueil = tache === 'accueil'
  const visiteur = zone.type === 'hall' && !accueil
  const zonesBureau = donnees.batiment.zones.filter((z) => (z.type === 'open_space' && z.amenagement !== 'cafeteria') || z.type === 'bureau')
  const domicile = zone.type === 'open_space' && zone.amenagement !== 'cafeteria' || zone.type === 'bureau'
    ? zone
    : (zonesBureau.filter((z) => z.niveau === zone.niveau)[0] ?? zonesBureau[h % Math.max(1, zonesBureau.length)] ?? zone)
  const salleReunion = (rang: number) => {
    const salles = donnees.batiment.zones.filter((z) => z.type === 'reunion' && z.niveau === zone.niveau)
    const toutes = salles.length ? salles : donnees.batiment.zones.filter((z) => z.type === 'reunion')
    return toutes[rang % toutes.length]?.nom ?? 'Salle de réunion'
  }
  const cafeteria = donnees.batiment.zones.find((z) => z.amenagement === 'cafeteria')?.nom ?? 'Cafétéria'
  const hall = nomZone('ZONE-R0-HALL', 'Hall')
  const arr = 8 + (h % 6) * 0.25
  const dep = 16.75 + (h % 7) * 0.25
  const r1 = 10 + (h % 3) * 0.5
  const dej = 12.25 + (h % 3) * 0.25
  const r2 = 14.5 + (h % 3) * 0.5

  let planning: Bloc[]
  if (accueil) planning = [{ debut: arr, fin: dep, type: 'accueil', lieu: zone.nom }]
  else if (visiteur) planning = [{ debut: t0 - 0.25, fin: t0 + 0.5, type: t0 > 13 ? 'depart' : 'arrivee', lieu: hall }]
  else {
    // bloc imposé par l'endroit où se trouve la personne à cette heure
    let force: Bloc | null = null
    if (zone.type === 'reunion') force = { debut: Math.max(8.5, t0 - (h % 3) * 0.25), fin: Math.max(8.5, t0 - (h % 3) * 0.25) + 1, type: 'reunion', lieu: zone.nom }
    else if (zone.amenagement === 'cafeteria') {
      force = heure >= 11.5 && heure < 14.5
        ? { debut: t0 - (h % 2) * 0.25, fin: t0 - (h % 2) * 0.25 + 1, type: 'dejeuner', lieu: cafeteria }
        : { debut: t0, fin: t0 + 0.5, type: 'pause', lieu: cafeteria }
    } else force = { debut: t0 - (h % 3) * 0.25, fin: t0 - (h % 3) * 0.25 + 1, type: 'travail', lieu: zone.nom }
    const base: Bloc[] = [
      { debut: arr, fin: arr + 0.25, type: 'arrivee', lieu: hall },
      { debut: r1, fin: r1 + 1, type: 'reunion', lieu: salleReunion(h) },
      { debut: dej, fin: dej + 1, type: 'dejeuner', lieu: cafeteria },
      { debut: r2, fin: r2 + 0.75, type: 'reunion', lieu: salleReunion(h + 1) },
      { debut: r2 + 0.75, fin: r2 + 1, type: 'pause', lieu: cafeteria },
      { debut: dep - 0.25, fin: dep, type: 'depart', lieu: hall },
    ].flatMap((b) => sans(b as Bloc, force!)).concat(force)
    base.sort((a, b) => a.debut - b.debut)
    // on comble les trous par du travail à son poste habituel
    planning = []
    let curseur = Math.min(arr, base[0].debut)
    for (const b of base) {
      if (b.debut > curseur + 1e-6) planning.push({ debut: curseur, fin: b.debut, type: 'travail', lieu: domicile.nom })
      planning.push(b)
      curseur = Math.max(curseur, b.fin)
    }
  }
  const poste = zone.id.includes('DIR') ? 'Direction' : zone.id.includes('RH') ? 'Ressources humaines' : accueil ? 'Accueil' : visiteur ? 'Visite' : POSTES[(h >> 2) % POSTES.length]
  return {
    nom: `${PRENOMS[h % PRENOMS.length]} ${String.fromCharCode(65 + ((h >> 3) % 26))}.`,
    poste,
    equipe: accueil ? 'Services généraux' : visiteur ? 'Extérieur' : zone.id.includes('RH') ? 'RH' : EQUIPES[(h >> 4) % EQUIPES.length],
    planning,
    temperature: 19.5 + (h % 10) * 0.5,
    luminosite: 300 + (h % 9) * 50,
    ventilation: (['douce', 'moyenne', 'forte'] as const)[(h >> 5) % 3],
    fenetre: h % 3 === 0,
  }
}

export const blocA = (p: Profil, heure: number): Bloc | null => p.planning.find((b) => heure >= b.debut && heure < b.fin) ?? null
