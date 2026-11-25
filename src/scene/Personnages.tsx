import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { donnees, decalageZone, altitudeNiveau, pointMonde, zoneContenant } from '../data'
import { useEtat } from '../store'
import { useEffectifs } from '../effectifs'
import { usePalette, type Palette } from './palette'
import { genererSieges } from './Mobilier'
import { niveauVisible } from './visibles'
import { hash, etatDe, cibleDe, construireNavette, LIBELLE_POSE, type Occupant, type Pose } from './personnage/comportement'
import { DEC_CABINE } from './personnage/ascenseur'
import { planifierDeplacements } from './personnage/deplacements'
import { repartir, boucleHall, zoneHall } from './personnage/repartition'
import { registre } from './personnage/registre'

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
    const mobile = !!(o.navette || o.deplacement)
    let monde: [number, number, number] | null = null
    if (mobile) {
      // usager d'ascenseur ou occupant en déplacement : il change de niveau, donc sa position monde est recalculée à chaque image
      const st = useEtat.getState()
      const a = ancre.current
      const niv = e.niveau ?? o.niveau
      if (a) {
        const niveauOk = (!st.niveau || niv === st.niveau) && niveauVisible(niv, st.niveau, st.coupe)
        a.visible = (e.visible ?? true) && niveauOk
        if (e.libre) {
          monde = pointMonde(niv, e.x, 0.02, e.z, st.ecart, st.pieces)
          a.position.set(monde[0], monde[1], monde[2])
          g.position.set(0, 0, 0)
        } else {
          a.position.set(decal[0], decal[1], decal[2])
          g.position.set(e.x, 0, e.z)
        }
        g.scale.setScalar(Math.max(0.001, e.echelle ?? 1))
      }
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
    if (!o.navette) {
      registre.positions.set(o.cle, monde ? [monde[0], monde[1] + 1.0, monde[2]] : [decal[0] + e.x, decal[1] + 1.0, decal[2] + e.z])
      if (o.deplacement) {
        const niv = e.niveau ?? o.niveau
        const lieu = e.visible === false ? 'Dans l’ascenseur' : (e.libre ? zoneContenant(niv, e.x, e.z)?.nom : undefined) ?? null
        registre.lieux.set(o.cle, { niveau: niv, lieu, ailleurs: !!e.libre })
      }
    }
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
    planifierDeplacements(liste, voies, sieges)
    registre.occupants = liste
    return liste
  }, [effectifs, sieges, voies])
  // usagers d'ascenseur : quelques personnes en plus, selon l'affluence, qui montent et redescendent
  const total = [...effectifs.values()].reduce((a, b) => a + b, 0)
  const nNavettes = Math.min(4, Math.floor(total / 15))
  const navettes = useMemo(() => {
    const cages = donnees.batiment.ascenseurs
    const idHall = zoneHall()?.id ?? donnees.batiment.zones[0].id
    const liste: Occupant[] = []
    for (let j = 0; j < nNavettes && cages.length; j++) {
      const a = cages[j % cages.length]
      const niveaux = a.niveaux.map((id) => donnees.batiment.niveaux.find((n) => n.id === id)).filter((n): n is NonNullable<typeof n> => !!n)
        .sort((x, y) => x.altitude - y.altitude).map((n) => n.id)
      const sol = Math.max(0, niveaux.findIndex((id) => (donnees.batiment.niveaux.find((n) => n.id === id)?.altitude ?? 0) >= 0)) // niveau d'entrée : le premier hors sous-sol
      const etages = niveaux.length - 1 - sol - (niveaux.length - sol > 3 ? 1 : 0) // on n'envoie personne sur la toiture
      if (niveaux.length < 2 || etages < 1) continue
      const nav = construireNavette(
        { x: a.position[0], z: a.position[1], profondeur: a.taille[1], niveaux, dec: (j % cages.length) * DEC_CABINE, sol },
        sol + 1 + (j % etages), j * 100, boucleHall()[3][0], (zoneHall()?.rect[1] ?? 0) + (zoneHall()?.rect[3] ?? 20) + 4,
      )
      if (nav) liste.push({ cle: `NAV#${j}`, zone: idHall, niveau: niveaux[sol], tache: 'marche', x: 0, z: 0, y: 0, ry: 0, phase: j, navette: nav })
    }
    return liste
  }, [nNavettes])
  const vue = useEtat((st) => st.vue)
  if (!actif || (!reglages.personnagesToutesVues && vue !== 'architecture' && vue !== 'occupant')) return null
  const [W, D] = donnees.batiment.emprise
  return (
    <group>
      {occupants
        .filter((o) => o.deplacement || ((!niveau || o.niveau === niveau) && niveauVisible(o.niveau, niveau, coupe)))
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
