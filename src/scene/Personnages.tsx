import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { donnees, decalageZone, altitudeNiveau } from '../data'
import { useEtat } from '../store'
import { effectifSimule } from '../simulation'
import { usePalette, type Palette } from './palette'
import { genererSieges, type Siege, type Voie } from './Mobilier'
import { niveauVisible } from './visibles'
import { hash, etatDe, cibleDe, routesDepuis, LIBELLE_POSE, type Occupant, type Pose } from './personnage/comportement'
import { registre } from './personnage/registre'

/** Heure affichée quand la simulation d'une journée est éteinte : une matinée de travail type. */
export const HEURE_AMBIANTE = 10.5

// Trajet des personnes qui traversent le hall : boucle le long des murs, hors banque d'accueil et canapés.
const BOUCLE_HALL: [number, number][] = [[2.2, 17], [2.2, 2], [9.8, 2], [9.8, 17]]

/** Qui est où : n personnes par zone, sur des sièges tirés dans un ordre stable (pas de saut quand n varie). */
function repartir(sieges: Siege[], voies: Map<string, Voie>, effectifs: Map<string, number>): Occupant[] {
  const sortie: Occupant[] = []
  for (const z of donnees.batiment.zones) {
    const n = effectifs.get(z.id) ?? 0
    if (n <= 0) continue
    const siegesZ = sieges.filter((s) => s.zone === z.id)
    const voie = voies.get(z.id)
    const fixe = (t: Siege['tache']) => siegesZ.filter((s) => s.tache === t)
    const assis = siegesZ
      .filter((s) => s.tache !== 'accueil' && s.tache !== 'presente' && s.tache !== 'comptoir' && !(z.type === 'hall' && s.tache === 'attente'))
      .map((s, i) => ({ s, k: hash(`${z.id}:${i}`) }))
      .sort((a, b) => a.k - b.k)
      .map((o) => o.s)
    const sofas = z.type === 'hall' ? siegesZ.filter((s) => s.tache === 'attente') : []
    const liste: Occupant[] = []
    const poser = (s: Siege, i: number) => {
      const o: Occupant = { cle: `${z.id}#${liste.length}`, zone: z.id, niveau: z.niveau, tache: s.tache, x: s.x, z: s.z, y: s.y, ry: s.ry, phase: ((hash(z.id) + i * 7) % 100) / 16 }
      if (s.tache === 'bureau') o.routes = routesDepuis({ x: s.x, z: s.z, ry: s.ry, acces: s.acces }, voie)
      liste.push(o)
    }
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
  anneau: new THREE.RingGeometry(0.42, 0.52, 28),
}
const matCache = new Map<string, THREE.MeshStandardMaterial>()
const mat = (c: string) => {
  let m = matCache.get(c)
  if (!m) { m = new THREE.MeshStandardMaterial({ color: c }); matCache.set(c, m) }
  return m
}
const MAT_ANNEAU = new THREE.MeshBasicMaterial({ color: '#f08c00', side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthTest: false })

function Bonhomme({ o, p, animer, decal }: { o: Occupant; p: Palette['personnage']; animer: boolean; decal: [number, number, number] }) {
  const racine = useRef<THREE.Group>(null)
  const tete = useRef<THREE.Mesh>(null)
  const buste = useRef<THREE.Group>(null)
  const bg = useRef<THREE.Group>(null), bd = useRef<THREE.Group>(null)
  const jg = useRef<THREE.Group>(null), jd = useRef<THREE.Group>(null)
  const jambesAssis = useRef<THREE.Group>(null), jambesDebout = useRef<THREE.Group>(null)
  const tasse = useRef<THREE.Mesh>(null)
  const cur = useRef({ gx: 0, gz: 0, dx: 0, dz: 0, tx: 0, ty: 0, tz: 0, bx: 0, by: 0, h: -1 })
  const survol = useRef(false)
  const [etiquette, setEtiquette] = useState<string | null>(null)
  const infobulles = useEtat((s) => s.reglages.infobulles)
  const setSelection = useEtat((s) => s.setSelection)
  const choisi = useEtat((s) => s.selection === `pers:${o.cle}`)
  const haut = p.hauts[hash(o.cle) % p.hauts.length]
  const epaule = 0.47

  useFrame((_, dt) => {
    const g = racine.current
    if (!g) return
    const t = animer ? registre.horloge : 0
    const e = etatDe(o, t)
    g.position.set(e.x, 0, e.z)
    g.rotation.y = e.ry
    const hanche = e.assis ? o.y + 0.06 : 0.8
    const c = cur.current
    const k = c.h < 0 ? 1 : 1 - Math.exp(-dt * 7)
    const cible = cibleDe(e.pose, t)
    if (e.marche) {
      const s = Math.sin(t * 5.2)
      if (jg.current) jg.current.rotation.x = s * 0.6
      if (jd.current) jd.current.rotation.x = -s * 0.6
      if (e.pose === 'marche') { cible.gx = -s * 0.5; cible.dx = s * 0.5 }
      else { cible.gx = -s * 0.5 } // « arpente » : un bras tient le téléphone
    } else {
      if (jg.current) jg.current.rotation.x = 0
      if (jd.current) jd.current.rotation.x = 0
    }
    c.h = hanche
    for (const key of ['gx', 'gz', 'dx', 'dz', 'tx', 'ty', 'tz', 'bx', 'by'] as const) c[key] += (cible[key] - c[key]) * k
    if (bg.current) { bg.current.rotation.set(c.gx, 0, c.gz) }
    if (bd.current) { bd.current.rotation.set(c.dx, 0, c.dz) }
    if (tete.current) tete.current.rotation.set(c.tx, c.ty, c.tz)
    if (buste.current) { buste.current.position.y = hanche; buste.current.rotation.set(c.bx, c.by, 0) }
    if (jambesAssis.current) { jambesAssis.current.visible = e.assis; jambesAssis.current.position.y = hanche }
    if (jambesDebout.current) jambesDebout.current.visible = !e.assis
    if (tasse.current) tasse.current.visible = e.pose === 'boire' || e.pose === 'comptoir'
    registre.positions.set(o.cle, [decal[0] + e.x, decal[1] + 1.0, decal[2] + e.z])
    registre.poses.set(o.cle, e.pose)
    if (survol.current) {
      const l = LIBELLE_POSE[e.pose]
      setEtiquette((prev) => (prev === l ? prev : l))
    }
  })

  return (
    <group position={decal}>
      <group ref={racine}
        onPointerOver={(e) => { e.stopPropagation(); survol.current = true; setEtiquette(LIBELLE_POSE[registre.poses.get(o.cle) as Pose] ?? '') }}
        onPointerOut={() => { survol.current = false; setEtiquette(null) }}
        onClick={(e) => { e.stopPropagation(); setSelection(`pers:${o.cle}`) }}>
        <group ref={jambesAssis}>
          {[-0.08, 0.08].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh geometry={G.cuisse} material={mat(p.pantalon)} position={[0, 0, 0.2]} />
              <mesh geometry={G.tibia} material={mat(p.pantalon)} position={[0, -0.22, 0.4]} />
            </group>
          ))}
        </group>
        <group ref={jambesDebout}>
          <group ref={jg} position={[-0.08, 0.8, 0]}><mesh geometry={G.jambe} material={mat(p.pantalon)} position={[0, -0.4, 0]} /></group>
          <group ref={jd} position={[0.08, 0.8, 0]}><mesh geometry={G.jambe} material={mat(p.pantalon)} position={[0, -0.4, 0]} /></group>
        </group>
        <group ref={buste}>
          <mesh geometry={G.torse} material={mat(haut)} position={[0, 0.27, 0]} />
          <mesh ref={tete} geometry={G.tete} material={mat(p.peau)} position={[0, 0.65, 0]} />
          <group ref={bg} position={[-0.21, epaule, 0]}><mesh geometry={G.bras} material={mat(haut)} position={[0, -0.25, 0]} /></group>
          <group ref={bd} position={[0.21, epaule, 0]}>
            <mesh geometry={G.bras} material={mat(haut)} position={[0, -0.25, 0]} />
            <mesh ref={tasse} visible={false} geometry={G.tasse} material={mat('#f8f9fa')} position={[0, -0.55, 0.03]} />
          </group>
        </group>
        {choisi && <mesh geometry={G.anneau} material={MAT_ANNEAU} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} renderOrder={5} />}
        {etiquette && infobulles && (
          <Html position={[0, 1.9, 0]} center style={{ pointerEvents: 'none' }}>
            <span className="etiquette-zone">{etiquette}</span>
          </Html>
        )}
      </group>
    </group>
  )
}

export function Personnages() {
  const actif = useEtat((s) => s.reglages.personnages)
  const { niveau, coupe, ecart, pieces, reglages } = useEtat()
  const pal = usePalette()
  const { sieges, voies } = useMemo(() => genererSieges(pal.meuble), [pal.meuble])
  // clé texte : le composant ne se met à jour que si un effectif change, pas à chaque image de la simulation
  const cle = useEtat((s) => {
    const h = s.simulation.actif ? s.simulation.heure : HEURE_AMBIANTE
    return donnees.batiment.zones.map((z) => effectifSimule(z, h)).join(',')
  })
  const occupants = useMemo(() => {
    const m = new Map<string, number>()
    const n = cle.split(',').map(Number)
    donnees.batiment.zones.forEach((z, i) => m.set(z.id, n[i]))
    const liste = repartir(sieges, voies, m)
    registre.occupants = liste
    return liste
  }, [cle, sieges, voies])
  useFrame((_, dt) => { if (reglages.animations) registre.horloge += Math.min(dt, 0.1) * reglages.vitessePersonnages })
  if (!actif) return null
  const [W, D] = donnees.batiment.emprise
  return (
    <group>
      {occupants
        .filter((o) => (!niveau || o.niveau === niveau) && niveauVisible(o.niveau, niveau, coupe))
        .map((o) => {
          const [dx, dz] = decalageZone(donnees.zoneParId.get(o.zone), pieces)
          return <Bonhomme key={o.cle} o={o} p={pal.personnage} animer={reglages.animations} decal={[-W / 2 + dx, altitudeNiveau(o.niveau, ecart) + 0.02, -D / 2 + dz]} />
        })}
    </group>
  )
}
