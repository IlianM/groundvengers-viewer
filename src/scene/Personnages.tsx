import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { donnees, decalageZone, altitudeNiveau } from '../data'
import { useEtat } from '../store'
import { effectifSimule } from '../simulation'
import { usePalette, type Palette } from './palette'
import { genererSieges, type Siege } from './Mobilier'
import { niveauVisible } from './visibles'

/** Heure affichée quand la simulation d'une journée est éteinte : une matinée de travail type. */
const HEURE_AMBIANTE = 10.5

type Tache = Siege['tache'] | 'marche'
const LIBELLE: Record<Tache, string> = {
  bureau: 'Travaille à son poste', reunion: 'En réunion', cafe: 'Prend un café', attente: 'Attend à l’accueil',
  accueil: 'Accueille les visiteurs', presente: 'Présente en réunion', comptoir: 'Attend au comptoir', marche: 'Se déplace',
}

const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 100003; return h }

// Trajet des personnes qui traversent le hall : boucle le long des murs, hors banque d'accueil et canapés.
const BOUCLE_HALL: [number, number][] = [[2.2, 17], [2.2, 2], [9.8, 2], [9.8, 17]]

type Occupant = {
  cle: string
  zone: string
  niveau: string
  tache: Tache
  x: number; z: number; y: number; ry: number
  phase: number
  boucle?: [number, number][]
  decalageDepart?: number
}

/** Qui est où : n personnes par zone, sur des sièges tirés dans un ordre stable (pas de saut quand n varie). */
function repartir(sieges: Siege[], effectifs: Map<string, number>): Occupant[] {
  const sortie: Occupant[] = []
  for (const z of donnees.batiment.zones) {
    const n = effectifs.get(z.id) ?? 0
    if (n <= 0) continue
    const siegesZ = sieges.filter((s) => s.zone === z.id)
    const fixe = (t: Siege['tache']) => siegesZ.filter((s) => s.tache === t)
    const assis = siegesZ
      .filter((s) => s.tache !== 'accueil' && s.tache !== 'presente' && s.tache !== 'comptoir' && !(z.type === 'hall' && s.tache === 'attente'))
      .map((s, i) => ({ s, k: hash(`${z.id}:${i}`) }))
      .sort((a, b) => a.k - b.k)
      .map((o) => o.s)
    const sofas = z.type === 'hall' ? siegesZ.filter((s) => s.tache === 'attente') : []
    const liste: Occupant[] = []
    const poser = (s: Siege, i: number) => liste.push({ cle: `${z.id}#${liste.length}`, zone: z.id, niveau: z.niveau, tache: s.tache, x: s.x, z: s.z, y: s.y, ry: s.ry, phase: (hash(z.id) + i * 7) % 100 / 16 })
    const accueil = fixe('accueil')[0], presente = fixe('presente')[0]
    if (accueil) poser(accueil, 0)
    if (presente && n >= 3) poser(presente, 1)
    const comptoir = fixe('comptoir')
    let ci = 0, si = 0, ai = 0
    while (liste.length < n) {
      const i = liste.length
      if (z.type === 'hall') {
        // alternance : une personne traverse le hall, la suivante s'assoit sur un canapé
        if (i % 2 === 1 && si < sofas.length) { poser(sofas[si++], i); continue }
        liste.push({ cle: `${z.id}#${i}`, zone: z.id, niveau: z.niveau, tache: 'marche', x: 0, z: 0, y: 0, ry: 0, phase: i, boucle: BOUCLE_HALL, decalageDepart: (hash(z.id) % 7) + i * 11 })
        continue
      }
      if (z.type === 'reunion' && ai >= assis.length) break
      if (z.amenagement === 'cafeteria' && i % 5 === 4 && ci < comptoir.length) { poser(comptoir[ci++], i); continue }
      if (ai < assis.length) { poser(assis[ai++], i); continue }
      break
    }
    sortie.push(...liste)
  }
  return sortie
}

// géométries et matériaux partagés par tous les personnages
const G = {
  tete: new THREE.SphereGeometry(0.11, 10, 8),
  torse: new THREE.BoxGeometry(0.34, 0.52, 0.19),
  bras: new THREE.BoxGeometry(0.08, 0.55, 0.08),
  jambe: new THREE.BoxGeometry(0.12, 0.8, 0.12),
  cuisse: new THREE.BoxGeometry(0.12, 0.12, 0.42),
  tibia: new THREE.BoxGeometry(0.11, 0.45, 0.11),
  tasse: new THREE.BoxGeometry(0.07, 0.08, 0.07),
}
const matCache = new Map<string, THREE.MeshStandardMaterial>()
const mat = (c: string) => {
  let m = matCache.get(c)
  if (!m) { m = new THREE.MeshStandardMaterial({ color: c }); matCache.set(c, m) }
  return m
}

function Bonhomme({ o, p, vitesse, animer, decal }: { o: Occupant; p: Palette['personnage']; vitesse: number; animer: boolean; decal: [number, number, number] }) {
  const racine = useRef<THREE.Group>(null)
  const tete = useRef<THREE.Mesh>(null)
  const buste = useRef<THREE.Group>(null)
  const bg = useRef<THREE.Group>(null), bd = useRef<THREE.Group>(null)
  const jg = useRef<THREE.Group>(null), jd = useRef<THREE.Group>(null)
  const [survol, setSurvol] = useState(false)
  const infobulles = useEtat((s) => s.reglages.infobulles)
  const setSelection = useEtat((s) => s.setSelection)
  const haut = p.hauts[hash(o.cle) % p.hauts.length]
  const assis = o.y > 0
  const hanche = assis ? o.y + 0.06 : 0.8
  // petite variété pour les postes de travail : certains téléphonent
  const tache: Tache = o.tache === 'bureau' && hash(o.cle) % 7 === 0 ? 'bureau' : o.tache
  const telephone = o.tache === 'bureau' && hash(o.cle) % 7 === 0

  useFrame(({ clock }) => {
    const t = (animer ? clock.elapsedTime * vitesse : 0) + o.phase
    const g = racine.current
    if (!g) return
    const bras = (r: THREE.Group | null, x: number, z = 0) => { if (r) { r.rotation.x = x; r.rotation.z = z } }
    if (tache === 'marche' && o.boucle) {
      // déplacement le long de la boucle, 1,2 m/s
      const B = o.boucle
      const long = B.map((pt, i) => Math.hypot(B[(i + 1) % B.length][0] - pt[0], B[(i + 1) % B.length][1] - pt[1]))
      const total = long.reduce((a, b) => a + b, 0)
      let d = ((animer ? clock.elapsedTime * vitesse * 1.2 : 0) + (o.decalageDepart ?? 0)) % total
      let i = 0
      while (d > long[i]) { d -= long[i]; i++ }
      const a = B[i], b = B[(i + 1) % B.length], f = d / long[i]
      g.position.set(a[0] + (b[0] - a[0]) * f, 0, a[1] + (b[1] - a[1]) * f)
      g.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1])
      const s = Math.sin(t * 4.2)
      if (jg.current) jg.current.rotation.x = s * 0.6
      if (jd.current) jd.current.rotation.x = -s * 0.6
      bras(bg.current, -s * 0.5); bras(bd.current, s * 0.5)
      return
    }
    switch (tache) {
      case 'bureau': {
        const s = Math.sin(t * 9)
        bras(bg.current, -1.25 + 0.06 * s); bras(bd.current, telephone ? -2.2 : -1.25 + 0.06 * Math.sin(t * 9 + 2))
        if (tete.current) tete.current.rotation.z = telephone ? 0.25 : 0
        break
      }
      case 'accueil': {
        const s = Math.sin(t * 8)
        bras(bg.current, -1.2 + 0.06 * s); bras(bd.current, -1.2 + 0.06 * Math.sin(t * 8 + 2))
        if (tete.current) tete.current.rotation.y = Math.sin(t * 0.6) * 0.5
        break
      }
      case 'reunion':
        bras(bg.current, -0.95); bras(bd.current, -0.95)
        if (tete.current) tete.current.rotation.y = Math.sin(t * 0.7) * 0.6
        break
      case 'presente':
        bras(bd.current, -2.5 + 0.18 * Math.sin(t * 1.6), -0.15); bras(bg.current, -0.15)
        if (buste.current) buste.current.rotation.y = Math.sin(t * 0.5) * 0.25
        break
      case 'cafe':
        bras(bd.current, -1.9 + 0.12 * Math.sin(t * 0.9)); bras(bg.current, -0.7)
        if (tete.current) tete.current.rotation.y = Math.sin(t * 0.5) * 0.5
        break
      case 'comptoir':
        bras(bd.current, -1.7 + 0.1 * Math.sin(t * 0.8)); bras(bg.current, 0.05)
        if (buste.current) buste.current.rotation.z = Math.sin(t * 0.7) * 0.03
        break
      default: // attente : consulte son téléphone
        bras(bg.current, -1.1 + 0.04 * Math.sin(t * 2)); bras(bd.current, -1.1)
        if (tete.current) tete.current.rotation.x = 0.25
    }
  })

  const epaule = hanche + 0.47
  return (
    <group position={[decal[0], decal[1], decal[2]]}>
      <group ref={racine} position={[o.x - (assis ? Math.sin(o.ry) * 0.1 : 0), 0, o.z - (assis ? Math.cos(o.ry) * 0.1 : 0)]} rotation={[0, o.ry, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setSurvol(true) }} onPointerOut={() => setSurvol(false)}
        onClick={(e) => { e.stopPropagation(); setSelection(o.zone) }}>
        {/* jambes */}
        {assis ? (
          <>
            {[-0.08, 0.08].map((x) => (
              <group key={x} position={[x, hanche, 0]}>
                <mesh geometry={G.cuisse} material={mat(p.pantalon)} position={[0, 0, 0.2]} />
                <mesh geometry={G.tibia} material={mat(p.pantalon)} position={[0, -0.22, 0.4]} />
              </group>
            ))}
          </>
        ) : (
          <>
            <group ref={jg} position={[-0.08, hanche, 0]}><mesh geometry={G.jambe} material={mat(p.pantalon)} position={[0, -0.4, 0]} /></group>
            <group ref={jd} position={[0.08, hanche, 0]}><mesh geometry={G.jambe} material={mat(p.pantalon)} position={[0, -0.4, 0]} /></group>
          </>
        )}
        <group ref={buste} position={[0, hanche, 0]}>
          <mesh geometry={G.torse} material={mat(haut)} position={[0, 0.27, 0]} />
          <mesh ref={tete} geometry={G.tete} material={mat(p.peau)} position={[0, 0.65, 0]} />
          <group ref={bg} position={[-0.21, epaule - hanche, 0]}><mesh geometry={G.bras} material={mat(haut)} position={[0, -0.25, 0]} /></group>
          <group ref={bd} position={[0.21, epaule - hanche, 0]}>
            <mesh geometry={G.bras} material={mat(haut)} position={[0, -0.25, 0]} />
            {(tache === 'cafe' || tache === 'comptoir') && <mesh geometry={G.tasse} material={mat('#f8f9fa')} position={[0, -0.55, 0.03]} />}
          </group>
        </group>
        {survol && infobulles && (
          <Html position={[0, hanche + 1.0, 0]} center style={{ pointerEvents: 'none' }}>
            <span className="etiquette-zone">{telephone ? 'Au téléphone' : LIBELLE[tache]}</span>
          </Html>
        )}
      </group>
    </group>
  )
}

export function Personnages() {
  const actif = useEtat((s) => s.reglages.personnages)
  const { niveau, coupe, ecart, pieces, reglages } = useEtat()
  const p = usePalette()
  const pal = usePalette()
  const sieges = useMemo(() => genererSieges(pal.meuble), [pal.meuble])
  // clé texte : le composant ne se met à jour que si un effectif change, pas à chaque image de la simulation
  const cle = useEtat((s) => {
    const h = s.simulation.actif ? s.simulation.heure : HEURE_AMBIANTE
    return donnees.batiment.zones.map((z) => effectifSimule(z, h)).join(',')
  })
  const occupants = useMemo(() => {
    const m = new Map<string, number>()
    const n = cle.split(',').map(Number)
    donnees.batiment.zones.forEach((z, i) => m.set(z.id, n[i]))
    return repartir(sieges, m)
  }, [cle, sieges])
  if (!actif) return null
  const [W, D] = donnees.batiment.emprise
  return (
    <group>
      {occupants
        .filter((o) => (!niveau || o.niveau === niveau) && niveauVisible(o.niveau, niveau, coupe))
        .map((o) => {
          const [dx, dz] = decalageZone(donnees.zoneParId.get(o.zone), pieces)
          return (
            <Bonhomme key={o.cle} o={o} p={p.personnage} vitesse={reglages.vitessePersonnages} animer={reglages.animations}
              decal={[-W / 2 + dx, altitudeNiveau(o.niveau, ecart) + 0.02, -D / 2 + dz]} />
          )
        })}
    </group>
  )
}
