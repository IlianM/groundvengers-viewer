import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Line, Edges, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { donnees, positionMonde, altitudeNiveau } from '../data'
import { useEtat, CAMERA_DEFAUT } from '../store'
import { useVisibles, niveauVisible } from './visibles'
import { usePalette, type Palette } from './palette'
import { Sol, Arbres, ImmeublesLointains } from './Decor'
import { Mobilier } from './Mobilier'
import { phraseOccupant, zoneNonAnonyme, COULEURS } from '../views'
import type { Equipement, Zone } from '../schema'

const [W, D] = donnees.batiment.emprise

export function Scene3D() {
  const setSelection = useEtat((s) => s.setSelection)
  const deco = useEtat((s) => s.deco)
  const p = usePalette()
  const ciel = deco.herbe || deco.arbres || deco.batiments
  return (
    <Canvas
      camera={{ position: CAMERA_DEFAUT.position, fov: 42 }}
      onPointerMissed={() => setSelection(null)}
      dpr={[1, 2]}
    >
      <color attach="background" args={[ciel ? p.ciel : p.fond]} />
      {ciel && <fogExp2 attach="fog" args={[p.ciel, 0.0105]} />}
      <ambientLight intensity={p.lumiere.ambiante} />
      <directionalLight position={[20, 40, 10]} intensity={p.lumiere.directe} />
      <OrbitControls makeDefault target={CAMERA_DEFAUT.cible} maxPolarAngle={Math.PI / 2.05} minDistance={6} maxDistance={120} />
      <CameraRig />
      {donnees.batiment.modele ? (
        <Suspense fallback={null}>
          <ModeleGLB url={`./models/${donnees.batiment.modele}`} />
        </Suspense>
      ) : (
        <BatimentTemporaire />
      )}
      <Sol />
      <Arbres />
      <ImmeublesLointains />
      <Mobilier />
      <Zones />
      <VolumesReseau />
      <Liens />
      <FluxIA />
      <CouvertureWifi />
      <Equipements />
      {!ciel && <gridHelper args={[60, 30, p.grille[0], p.grille[1]]} position={[0, -0.11, 0]} />}
    </Canvas>
  )
}

/** Déplace la caméra en douceur vers la cible demandée (scène de présentation, boutons de vue). */
function CameraRig() {
  const cible = useEtat((s) => s.cameraCible)
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3; update: () => void
    addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void
  } | null
  const camera = useThree((s) => s.camera)
  const anim = useRef<{ pos: THREE.Vector3; tgt: THREE.Vector3; t: number } | null>(null)

  useEffect(() => {
    if (cible.n === 0) return // état initial : la caméra est déjà bien placée
    anim.current = { pos: new THREE.Vector3(...cible.position), tgt: new THREE.Vector3(...cible.cible), t: 0 }
  }, [cible])

  useEffect(() => {
    if (!controls) return
    const arreter = () => { anim.current = null } // la personne reprend la main : on s'arrête
    controls.addEventListener('start', arreter)
    return () => controls.removeEventListener('start', arreter)
  }, [controls])

  // Clavier : flèches = déplacer, Maj + flèches = tourner / incliner, + et − = zoom
  const touches = useRef(new Set<string>())
  const shiftRef = useRef(false)
  useEffect(() => {
    const utile = (k: string) => k.startsWith('Arrow') || ['+', '-', '=', '_', 'PageUp', 'PageDown'].includes(k)
    const saisie = (e: KeyboardEvent) => ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
    const bas = (e: KeyboardEvent) => {
      shiftRef.current = e.shiftKey
      if (!utile(e.key) || saisie(e) || e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      touches.current.add(e.key)
      anim.current = null // la personne reprend la main
    }
    const haut = (e: KeyboardEvent) => { shiftRef.current = e.shiftKey; touches.current.delete(e.key) }
    const vider = () => touches.current.clear()
    window.addEventListener('keydown', bas)
    window.addEventListener('keyup', haut)
    window.addEventListener('blur', vider)
    return () => { window.removeEventListener('keydown', bas); window.removeEventListener('keyup', haut); window.removeEventListener('blur', vider) }
  }, [])

  useFrame((_, dt) => {
    const t = touches.current
    if (t.size > 0 && controls) {
      const pas = Math.min(dt, 0.05)
      const decal = camera.position.clone().sub(controls.target)
      if (t.has('ArrowLeft') || t.has('ArrowRight') || t.has('ArrowUp') || t.has('ArrowDown')) {
        if (shiftRef.current) {
          const sph = new THREE.Spherical().setFromVector3(decal)
          sph.theta += ((t.has('ArrowLeft') ? 1 : 0) - (t.has('ArrowRight') ? 1 : 0)) * pas * 1.4
          sph.phi = THREE.MathUtils.clamp(sph.phi + ((t.has('ArrowDown') ? 1 : 0) - (t.has('ArrowUp') ? 1 : 0)) * pas * 1.0, 0.12, Math.PI / 2 - 0.04)
          camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph))
        } else {
          const avant = new THREE.Vector3(-decal.x, 0, -decal.z).normalize()
          const droite = new THREE.Vector3().crossVectors(avant, new THREE.Vector3(0, 1, 0))
          const v = Math.max(6, decal.length() * 0.9) * pas
          const dep = new THREE.Vector3()
            .addScaledVector(avant, ((t.has('ArrowUp') ? 1 : 0) - (t.has('ArrowDown') ? 1 : 0)) * v)
            .addScaledVector(droite, ((t.has('ArrowRight') ? 1 : 0) - (t.has('ArrowLeft') ? 1 : 0)) * v)
          camera.position.add(dep)
          controls.target.add(dep)
        }
      }
      const zoom = ((t.has('-') || t.has('_') || t.has('PageDown') ? 1 : 0) - (t.has('+') || t.has('=') || t.has('PageUp') ? 1 : 0))
      if (zoom) camera.position.copy(controls.target).add(decal.multiplyScalar(Math.exp(zoom * pas * 1.5)))
      controls.update()
    }
    const a = anim.current
    if (!a || !controls) return
    a.t += dt
    const k = 1 - Math.exp(-dt * 3.5)
    camera.position.lerp(a.pos, k)
    controls.target.lerp(a.tgt, k)
    controls.update()
    if (a.t > 3 || (camera.position.distanceTo(a.pos) < 0.05 && controls.target.distanceTo(a.tgt) < 0.05)) anim.current = null
  })
  return null
}

/** Mode F-01 : modèle exporté par l'équipe Domotique (public/models/*.glb). */
function ModeleGLB({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

/** Bâtiment temporaire du MVP, généré à partir de batiment.json (emprise + niveaux). */
function BatimentTemporaire() {
  const { niveau: niveauActif, coupe, ecart } = useEtat()
  const p = usePalette()
  return (
    <group>
      {donnees.batiment.niveaux
        .filter((n) => niveauVisible(n.id, niveauActif, coupe))
        .map((n) => {
          const actif = !niveauActif || niveauActif === n.id
          return (
            <group key={n.id} position={[0, altitudeNiveau(n.id, ecart), 0]}>
              <mesh position={[0, -0.1, 0]}>
                <boxGeometry args={[W, 0.2, D]} />
                <meshStandardMaterial color={p.dalle} transparent opacity={niveauActif === n.id ? 0.9 : actif ? 0.3 : 0.05} depthWrite={niveauActif === n.id} />
                <Edges color={p.dalleBord} />
              </mesh>
              <mesh position={[0, n.hauteur / 2, 0]}>
                <boxGeometry args={[W, n.hauteur, D]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={actif ? 0.06 : 0.02} depthWrite={false} />
                <Edges color={actif ? p.enveloppeBord : p.enveloppeBordInactif} />
              </mesh>
              <Html position={[W / 2 + 1.5, 0.1, D / 2 + 1.5]} center style={{ pointerEvents: 'none' }}>
                <span className={`etiquette-niveau ${actif ? '' : 'inactif'}`}>{n.id}</span>
              </Html>
            </group>
          )
        })}
    </group>
  )
}

function couleurZone(z: Zone, vue: string, seuil: number, mv: boolean, p: Palette): { couleur: string; opacite: number } {
  if (vue === 'ia' || vue === 'occupant') {
    if (zoneNonAnonyme(z, seuil, mv)) return { couleur: '#e03131', opacite: 0.4 }
    if (vue === 'occupant' && z.type === 'bureau') return { couleur: '#37b24d', opacite: 0.3 }
  }
  return { couleur: p.zones[z.type] ?? p.zones.technique, opacite: vue === 'architecture' ? p.zoneOpacite.architecture : p.zoneOpacite.autre }
}

function Zones() {
  const { vue, niveau, coupe, calquesMasques, seuilAnonymat, minimumVital, setSelection, ecart } = useEtat()
  const p = usePalette()
  if (calquesMasques.has('zones')) return null
  const etiquettes = vue === 'architecture' || vue === 'occupant' || niveau !== null
  return (
    <group>
      {donnees.batiment.zones
        .filter((z) => (!niveau || z.niveau === niveau) && niveauVisible(z.niveau, niveau, coupe))
        .map((z) => {
          const n = donnees.batiment.niveaux.find((x) => x.id === z.niveau)!
          const [x, zz, w, d] = z.rect
          const { couleur, opacite } = couleurZone(z, vue, seuilAnonymat, minimumVital, p)
          const cx = x + w / 2 - W / 2
          const cz = zz + d / 2 - D / 2
          return (
            <group key={z.id} position={[cx, altitudeNiveau(n.id, ecart) + 0.02, cz]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={(ev) => { ev.stopPropagation(); setSelection(z.id) }}>
                <planeGeometry args={[w - 0.15, d - 0.15]} />
                <meshStandardMaterial color={couleur} transparent opacity={opacite} side={THREE.DoubleSide} depthWrite={false} />
                <Edges color={p.zoneBord} />
              </mesh>
              {etiquettes && (
                <Html position={[0, 0.3, 0]} center style={{ pointerEvents: 'none' }}>
                  <span className="etiquette-zone">
                    {z.nom}
                    {vue === 'occupant' && z.type === 'bureau' && !z.detection_presence && <em> · sans détection</em>}
                    {zoneNonAnonyme(z, seuilAnonymat, minimumVital) && (vue === 'ia' || vue === 'occupant') && <em className="alerte"> · non anonyme</em>}
                  </span>
                </Html>
              )}
            </group>
          )
        })}
    </group>
  )
}

function Forme({ e }: { e: Equipement }) {
  switch (e.categorie) {
    case 'capteur': return <sphereGeometry args={[0.35, 20, 16]} />
    case 'actionneur': return <coneGeometry args={[0.35, 0.7, 16]} />
    case 'automate': return <boxGeometry args={[0.9, 0.6, 0.4]} />
    case 'compteur': return <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
    case 'passerelle': return <octahedronGeometry args={[0.45]} />
    case 'serveur': return <boxGeometry args={[0.6, 1.6, 0.8]} />
    case 'firewall': return <boxGeometry args={[1.2, 0.5, 0.6]} />
    case 'switch': return <boxGeometry args={[1, 0.2, 0.5]} />
    case 'borne_wifi': return <cylinderGeometry args={[0.4, 0.4, 0.12, 24]} />
    case 'baie': return <boxGeometry args={[0.8, 2, 0.8]} />
    case 'ecran': return <boxGeometry args={[0.9, 0.6, 0.08]} />
    case 'camera': return <boxGeometry args={[0.3, 0.3, 0.6]} />
    case 'lecteur_badge': return <boxGeometry args={[0.25, 0.4, 0.1]} />
    default: return <sphereGeometry args={[0.3]} />
  }
}

function Equipements() {
  const { equipements, def, ctx } = useVisibles()
  const { selection, survol, vue, setSelection, setSurvol, ecart } = useEtat()
  return (
    <group>
      {equipements.map((e) => {
        const pos = positionMonde(e, ecart)
        const sel = selection === e.id
        const couleur = def.couleur(e, ctx)
        return (
          <group key={e.id} position={pos}>
            <mesh
              scale={sel ? 1.5 : survol === e.id ? 1.25 : 1}
              onPointerOver={(ev) => { ev.stopPropagation(); setSurvol(e.id); document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { setSurvol(null); document.body.style.cursor = 'auto' }}
              onClick={(ev) => { ev.stopPropagation(); setSelection(e.id) }}
            >
              <Forme e={e} />
              <meshStandardMaterial color={couleur} emissive={sel ? couleur : '#000000'} emissiveIntensity={sel ? 0.5 : 0} />
            </mesh>
            {vue === 'cyber' && e.point_entree && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.75, 0.06, 8, 32]} />
                <meshBasicMaterial color="#e03131" />
              </mesh>
            )}
            {survol === e.id && !sel && (
              <Html position={[0, 0.9, 0]} center style={{ pointerEvents: 'none' }}>
                <div className="infobulle">
                  <strong>{e.nom}</strong>
                  <span>{vue === 'occupant' ? phraseOccupant(e) : `${e.type} · ${e.niveau} · ${donnees.zoneParId.get(e.zone ?? '')?.nom ?? '—'}`}</span>
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}

function Trait({ a, b, couleur, pointille, anime, opacite, epaisseur }: {
  a: [number, number, number]; b: [number, number, number]; couleur: string
  pointille?: boolean; anime?: boolean; opacite: number; epaisseur: number
}) {
  const ref = useRef<any>(null)
  useFrame((_, dt) => {
    if (anime && ref.current?.material) ref.current.material.dashOffset -= dt * 1.5
  })
  return (
    <Line
      ref={ref}
      points={[a, b]}
      color={couleur}
      lineWidth={epaisseur}
      dashed={pointille || anime}
      dashSize={0.4}
      gapSize={0.25}
      transparent
      opacity={opacite}
    />
  )
}

function Liens() {
  const { liens, def, ids } = useVisibles()
  const selection = useEtat((s) => s.selection)
  const ecart = useEtat((s) => s.ecart)
  return (
    <group>
      {liens.flatMap((l) => {
        const de = donnees.parId.get(l.de)!
        return l.vers
          .filter((v) => ids.has(v))
          .map((v) => {
            const vers = donnees.parId.get(v)!
            const touche = !selection || selection === l.de || selection === v
            return (
              <Trait
                key={`${l.id}-${v}`}
                a={positionMonde(de, ecart)}
                b={positionMonde(vers, ecart)}
                couleur={def.couleurLien(l)}
                pointille={l.autorise_par_firewall === false}
                anime={l.type === 'flux_reseau' && l.autorise_par_firewall !== false}
                opacite={touche ? 0.95 : 0.12}
                epaisseur={touche && selection ? 3 : l.type === 'fibre' ? 2.5 : 1.6}
              />
            )
          })
      })}
    </group>
  )
}

/** Vue IA : flux animés des capteurs vers le nœud de calcul (Edge par étage ou central cloisonné). */
function FluxIA() {
  const { vue, architectureIA, niveau, selection, minimumVital, ecart } = useEtat()
  const { ids } = useVisibles()
  if (vue !== 'ia') return null
  const noeuds = donnees.noeuds.filter((n) => n.architecture === architectureIA)
  return (
    <group>
      {noeuds.flatMap((n) => {
        const hote = donnees.parId.get(n.heberge_sur)
        if (!hote || (niveau && architectureIA === 'edge' && hote.niveau !== niveau)) return []
        const ph = positionMonde(hote, ecart)
        return [
          <mesh key={`${n.id}-halo`} position={ph}>
            <sphereGeometry args={[1.1, 24, 16]} />
            <meshBasicMaterial color={COULEURS.equipe.ia} transparent opacity={0.15} depthWrite={false} />
          </mesh>,
          ...n.entrees
            .filter((id) => ids.has(id))
            .filter((id) => !minimumVital || donnees.parId.get(id)?.donnee.minimum_vital)
            .map((id) => {
              const touche = !selection || selection === id || selection === n.heberge_sur
              return (
                <Trait key={`${n.id}-${id}`} a={positionMonde(donnees.parId.get(id)!, ecart)} b={ph}
                  couleur={COULEURS.equipe.ia} anime opacite={touche ? 0.9 : 0.12} epaisseur={1.8} />
              )
            }),
        ]
      })}
    </group>
  )
}

/** Cyber (F-16) : périmètre de chaque réseau, un volume translucide par niveau autour de ses équipements affichés. */
function VolumesReseau() {
  const { vue, calquesMasques, niveau, coupe, ecart } = useEtat()
  const { equipements } = useVisibles()
  if (vue !== 'cyber' || calquesMasques.has('volumes')) return null
  const reseaux = [
    { id: 'GTB', libelle: 'GTB isolé', hauteur: 2.4, opacite: 0.16 },
    { id: 'bureautique', libelle: 'Bureautique', hauteur: 3.4, opacite: 0.08 },
  ] as const
  return (
    <group>
      {reseaux.flatMap((r) =>
        donnees.batiment.niveaux
          .filter((n) => niveauVisible(n.id, niveau, coupe))
          .flatMap((n) => {
            const eqs = equipements.filter((e) => e.reseau === r.id && e.niveau === n.id)
            if (eqs.length === 0) return []
            const xs = eqs.map((e) => e.position[0])
            const zs = eqs.map((e) => e.position[2])
            const largeur = Math.max(Math.max(...xs) - Math.min(...xs) + 3, 4)
            const profondeur = Math.max(Math.max(...zs) - Math.min(...zs) + 3, 4)
            const cx = (Math.max(...xs) + Math.min(...xs)) / 2 - W / 2
            const cz = (Math.max(...zs) + Math.min(...zs)) / 2 - D / 2
            const couleur = COULEURS.reseau[r.id]
            return [
              <group key={`${r.id}-${n.id}`} position={[cx, altitudeNiveau(n.id, ecart) + r.hauteur / 2 + 0.03, cz]}>
                <mesh>
                  <boxGeometry args={[largeur, r.hauteur, profondeur]} />
                  <meshBasicMaterial color={couleur} transparent opacity={r.opacite} depthWrite={false} />
                  <Edges color={couleur} />
                </mesh>
                <Html position={[-largeur / 2, r.hauteur / 2, -profondeur / 2]} style={{ pointerEvents: 'none' }}>
                  <span className="etiquette-reseau" style={{ borderColor: couleur, color: couleur }}>{r.libelle} · {n.id}</span>
                </Html>
              </group>,
            ]
          }),
      )}
    </group>
  )
}

function CouvertureWifi() {
  const { vue, calquesMasques, ecart } = useEtat()
  const { equipements } = useVisibles()
  if (vue !== 'cyber' || calquesMasques.has('couverture')) return null
  return (
    <group>
      {equipements
        .filter((e) => e.categorie === 'borne_wifi')
        .map((e) => {
          const [x, y, z] = positionMonde(e, ecart)
          const r = Number(e.config.portee_m ?? 10)
          return (
            <mesh key={`${e.id}-wifi`} position={[x, y - e.position[1] + 0.05, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[r, 48]} />
              <meshBasicMaterial color={COULEURS.reseau.bureautique} transparent opacity={0.08} depthWrite={false} />
            </mesh>
          )
        })}
    </group>
  )
}
