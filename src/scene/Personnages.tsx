import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { donnees, decalageZone, altitudeNiveau, pointMonde } from '../data'
import { useEtat } from '../store'
import { useEffectifs } from '../effectifs'
import { usePalette, type Palette } from './palette'
import { genererSieges, type Siege, type Voie } from './Mobilier'
import { niveauVisible } from './visibles'
import { hash, etatDe, cibleDe, routesDepuis, construireNavette, LIBELLE_POSE, type Occupant, type Pose } from './personnage/comportement'
import { DEC_CABINE } from './personnage/ascenseur'
import { registre } from './personnage/registre'

// Trajet des personnes qui traversent le hall : boucle le long des murs, hors banque d'accueil et canapés.
// (le bord est reste à 8,6 m : au-delà, la cage des ascenseurs)
const BOUCLE_HALL: [number, number][] = [[2.2, 17], [2.2, 2], [8.6, 2], [8.6, 17]]

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
  brasHaut: new THREE.BoxGeometry(0.08, 0.3, 0.08),
  avantBras: new THREE.BoxGeometry(0.07, 0.28, 0.07),
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
  const ancre = useRef<THREE.Group>(null)
  const racine = useRef<THREE.Group>(null)
  const tete = useRef<THREE.Mesh>(null)
  const buste = useRef<THREE.Group>(null)
  const bg = useRef<THREE.Group>(null), bd = useRef<THREE.Group>(null)
  const cg = useRef<THREE.Group>(null), cd = useRef<THREE.Group>(null) // coudes
  const jg = useRef<THREE.Group>(null), jd = useRef<THREE.Group>(null)
  const jambesAssis = useRef<THREE.Group>(null), jambesDebout = useRef<THREE.Group>(null)
  const tasse = useRef<THREE.Mesh>(null)
  const cur = useRef({ gx: 0, gz: 0, ge: 0, dx: 0, dz: 0, de: 0, tx: 0, ty: 0, tz: 0, bx: 0, by: 0, h: -1 })
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
    if (o.navette) {
      // usager d'ascenseur : change de niveau, donc sa position monde est recalculée à chaque image
      const st = useEtat.getState()
      const a = ancre.current
      if (a && e.niveau) {
        const w = pointMonde(e.niveau, e.x, 0.02, e.z, st.ecart, st.pieces)
        a.position.set(w[0], w[1], w[2])
        const niveauOk = (!st.niveau || e.niveau === st.niveau) && niveauVisible(e.niveau, st.niveau, st.coupe)
        a.visible = !!e.visible && niveauOk
        g.scale.setScalar(Math.max(0.001, e.echelle ?? 1))
      }
      g.position.set(0, 0, 0)
    } else g.position.set(e.x, 0, e.z)
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
      else { cible.gx = -s * 0.5 } // « arpente » : l'autre main tient le téléphone
    } else {
      if (jg.current) jg.current.rotation.x = 0
      if (jd.current) jd.current.rotation.x = 0
    }
    c.h = hanche
    for (const key of ['gx', 'gz', 'ge', 'dx', 'dz', 'de', 'tx', 'ty', 'tz', 'bx', 'by'] as const) c[key] += (cible[key] - c[key]) * k
    if (bg.current) { bg.current.rotation.set(c.gx, 0, c.gz) }
    if (bd.current) { bd.current.rotation.set(c.dx, 0, c.dz) }
    if (cg.current) cg.current.rotation.x = c.ge
    if (cd.current) cd.current.rotation.x = c.de
    if (tete.current) tete.current.rotation.set(c.tx, c.ty, c.tz)
    if (buste.current) { buste.current.position.y = hanche; buste.current.rotation.set(c.bx, c.by, 0) }
    if (jambesAssis.current) { jambesAssis.current.visible = e.assis; jambesAssis.current.position.y = hanche }
    if (jambesDebout.current) jambesDebout.current.visible = !e.assis
    if (tasse.current) tasse.current.visible = e.pose === 'boire' || e.pose === 'comptoir'
    if (!o.navette) registre.positions.set(o.cle, [decal[0] + e.x, decal[1] + 1.0, decal[2] + e.z])
    registre.poses.set(o.cle, e.pose)
    if (survol.current) {
      const l = LIBELLE_POSE[e.pose]
      setEtiquette((prev) => (prev === l ? prev : l))
    }
  })

  return (
    <group ref={ancre} position={decal}>
      <group ref={racine}
        onPointerOver={(e) => { e.stopPropagation(); survol.current = true; setEtiquette(LIBELLE_POSE[registre.poses.get(o.cle) as Pose] ?? '') }}
        onPointerOut={() => { survol.current = false; setEtiquette(null) }}
        onClick={(e) => { e.stopPropagation(); if (!o.navette) setSelection(`pers:${o.cle}`) }}>
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
          <group ref={bg} position={[-0.21, epaule, 0]}>
            <mesh geometry={G.brasHaut} material={mat(haut)} position={[0, -0.15, 0]} />
            <group ref={cg} position={[0, -0.3, 0]}><mesh geometry={G.avantBras} material={mat(haut)} position={[0, -0.14, 0]} /></group>
          </group>
          <group ref={bd} position={[0.21, epaule, 0]}>
            <mesh geometry={G.brasHaut} material={mat(haut)} position={[0, -0.15, 0]} />
            <group ref={cd} position={[0, -0.3, 0]}>
              <mesh geometry={G.avantBras} material={mat(haut)} position={[0, -0.14, 0]} />
              <mesh ref={tasse} visible={false} geometry={G.tasse} material={mat('#f8f9fa')} position={[0, -0.3, 0.03]} />
            </group>
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
  const effectifs = useEffectifs()
  const occupants = useMemo(() => {
    const liste = repartir(sieges, voies, effectifs)
    registre.occupants = liste
    return liste
  }, [effectifs, sieges, voies])
  // usagers d'ascenseur : quelques personnes en plus, selon l'affluence, qui montent et redescendent
  const total = [...effectifs.values()].reduce((a, b) => a + b, 0)
  const nNavettes = Math.min(4, Math.floor(total / 15))
  const navettes = useMemo(() => {
    const cages = donnees.batiment.ascenseurs
    const liste: Occupant[] = []
    for (let j = 0; j < nNavettes && cages.length; j++) {
      const a = cages[j % cages.length]
      const niveaux = a.niveaux.map((id) => donnees.batiment.niveaux.find((n) => n.id === id)).filter((n): n is NonNullable<typeof n> => !!n)
        .sort((x, y) => x.altitude - y.altitude).map((n) => n.id)
      if (niveaux.length < 2) continue
      const nav = construireNavette(
        { x: a.position[0], z: a.position[1], profondeur: a.taille[1], niveaux, dec: (j % cages.length) * DEC_CABINE },
        1 + (j % (niveaux.length - 1)), j * 100, BOUCLE_HALL[3][0], 24,
      )
      if (nav) liste.push({ cle: `NAV#${j}`, zone: 'ZONE-R0-HALL', niveau: niveaux[0], tache: 'marche', x: 0, z: 0, y: 0, ry: 0, phase: j, navette: nav })
    }
    return liste
  }, [nNavettes])
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
      {navettes.map((o) => <Bonhomme key={o.cle} o={o} p={pal.personnage} animer={reglages.animations} decal={[0, 0, 0]} />)}
    </group>
  )
}

/** Horloge d'animation commune aux personnages et aux cabines : mêmes arrêts, mêmes portes, mêmes embarquements. */
export function Horloge() {
  const animations = useEtat((s) => s.reglages.animations)
  const vitesse = useEtat((s) => s.reglages.vitessePersonnages)
  useFrame((_, dt) => { if (animations) registre.horloge += Math.min(dt, 0.1) * vitesse })
  return null
}
