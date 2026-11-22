import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Line, Edges, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { donnees, positionMonde } from '../data'
import { useEtat } from '../store'
import { useVisibles } from './visibles'
import { phraseOccupant, zoneNonAnonyme, COULEURS } from '../views'
import type { Equipement, Zone } from '../schema'

const [W, D] = donnees.batiment.emprise

export function Scene3D() {
  const setSelection = useEtat((s) => s.setSelection)
  return (
    <Canvas
      camera={{ position: [26, 20, 28], fov: 42 }}
      onPointerMissed={() => setSelection(null)}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#f5f1ea']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[20, 40, 10]} intensity={1.2} />
      <OrbitControls makeDefault target={[0, 4, 0]} maxPolarAngle={Math.PI / 2.05} />
      {donnees.batiment.modele ? (
        <Suspense fallback={null}>
          <ModeleGLB url={`./models/${donnees.batiment.modele}`} />
        </Suspense>
      ) : (
        <BatimentTemporaire />
      )}
      <Zones />
      <Liens />
      <FluxIA />
      <CouvertureWifi />
      <Equipements />
      <gridHelper args={[60, 30, '#d9d2c5', '#e8e2d6']} position={[0, -0.11, 0]} />
    </Canvas>
  )
}

/** Mode F-01 : modèle exporté par l'équipe Domotique (public/models/*.glb). */
function ModeleGLB({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

/** Bâtiment temporaire du MVP, généré à partir de batiment.json (emprise + niveaux). */
function BatimentTemporaire() {
  const niveauActif = useEtat((s) => s.niveau)
  return (
    <group>
      {donnees.batiment.niveaux.map((n) => {
        const actif = !niveauActif || niveauActif === n.id
        return (
          <group key={n.id} position={[0, n.altitude, 0]}>
            <mesh position={[0, -0.1, 0]}>
              <boxGeometry args={[W, 0.2, D]} />
              <meshStandardMaterial color="#e9e4da" transparent opacity={niveauActif === n.id ? 0.9 : actif ? 0.3 : 0.05} depthWrite={niveauActif === n.id} />
              <Edges color="#8d8577" />
            </mesh>
            <mesh position={[0, n.hauteur / 2, 0]}>
              <boxGeometry args={[W, n.hauteur, D]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={actif ? 0.06 : 0.02} depthWrite={false} />
              <Edges color={actif ? '#b5ad9f' : '#e3ddd2'} />
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

function couleurZone(z: Zone, vue: string, seuil: number, mv: boolean): { couleur: string; opacite: number } {
  if (vue === 'ia' || vue === 'occupant') {
    if (zoneNonAnonyme(z, seuil, mv)) return { couleur: '#e03131', opacite: 0.35 }
    if (vue === 'occupant' && z.type === 'bureau') return { couleur: '#37b24d', opacite: 0.25 }
  }
  const parType: Record<string, string> = {
    open_space: '#a5d8ff', bureau: '#ffd8a8', reunion: '#d0bfff', hall: '#c3fae8', technique: '#dee2e6', circulation: '#f1f3f5',
  }
  return { couleur: parType[z.type] ?? '#dee2e6', opacite: vue === 'architecture' ? 0.55 : 0.25 }
}

function Zones() {
  const { vue, niveau, calquesMasques, seuilAnonymat, minimumVital, setSelection } = useEtat()
  if (calquesMasques.has('zones')) return null
  const etiquettes = vue === 'architecture' || vue === 'occupant' || niveau !== null
  return (
    <group>
      {donnees.batiment.zones
        .filter((z) => !niveau || z.niveau === niveau)
        .map((z) => {
          const n = donnees.batiment.niveaux.find((x) => x.id === z.niveau)!
          const [x, zz, w, d] = z.rect
          const { couleur, opacite } = couleurZone(z, vue, seuilAnonymat, minimumVital)
          const cx = x + w / 2 - W / 2
          const cz = zz + d / 2 - D / 2
          return (
            <group key={z.id} position={[cx, n.altitude + 0.02, cz]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={(ev) => { ev.stopPropagation(); setSelection(z.id) }}>
                <planeGeometry args={[w - 0.15, d - 0.15]} />
                <meshStandardMaterial color={couleur} transparent opacity={opacite} side={THREE.DoubleSide} depthWrite={false} />
                <Edges color="#9c9384" />
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
  const { selection, survol, vue, setSelection, setSurvol } = useEtat()
  return (
    <group>
      {equipements.map((e) => {
        const pos = positionMonde(e)
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
                a={positionMonde(de)}
                b={positionMonde(vers)}
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
  const { vue, architectureIA, niveau, selection, minimumVital } = useEtat()
  const { ids } = useVisibles()
  if (vue !== 'ia') return null
  const noeuds = donnees.noeuds.filter((n) => n.architecture === architectureIA)
  return (
    <group>
      {noeuds.flatMap((n) => {
        const hote = donnees.parId.get(n.heberge_sur)
        if (!hote || (niveau && architectureIA === 'edge' && hote.niveau !== niveau)) return []
        const ph = positionMonde(hote)
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
                <Trait key={`${n.id}-${id}`} a={positionMonde(donnees.parId.get(id)!)} b={ph}
                  couleur={COULEURS.equipe.ia} anime opacite={touche ? 0.9 : 0.12} epaisseur={1.8} />
              )
            }),
        ]
      })}
    </group>
  )
}

function CouvertureWifi() {
  const { vue, calquesMasques } = useEtat()
  const { equipements } = useVisibles()
  if (vue !== 'cyber' || calquesMasques.has('couverture')) return null
  return (
    <group>
      {equipements
        .filter((e) => e.categorie === 'borne_wifi')
        .map((e) => {
          const [x, y, z] = positionMonde(e)
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
