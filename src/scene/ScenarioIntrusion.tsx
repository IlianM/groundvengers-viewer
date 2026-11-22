import { useMinimumVital } from './mode'
import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { donnees, positionMonde } from '../data'
import { useEtat } from '../store'
import { etapeCoupee } from '../scenario'

type V3 = [number, number, number]

/** Scénario d'intrusion rejoué pas à pas : une impulsion rouge suit le chemin de l'attaquant (vue Cyber). */
export function ScenarioIntrusion() {
  const { vue, scenarioActif, ecart, pieces } = useEtat()
  const minimumVital = useMinimumVital()
  const impulsion = useRef<THREE.Mesh>(null)
  const sc = donnees.scenarios.find((x) => x.id === scenarioActif?.id)
  const etape = scenarioActif?.etape ?? 0
  const [W, D] = donnees.batiment.emprise
  const coupe = sc ? etapeCoupee(sc, minimumVital) : null
  const debutBloque = coupe ? coupe.index : Infinity

  // position d'un acteur : équipement, ou « externe » = l'attaquant devant le bâtiment, au niveau de la cible
  const pos = (id: string, cible: string): V3 => {
    const e = donnees.parId.get(id)
    if (e) return positionMonde(e, ecart, pieces)
    const c = donnees.parId.get(cible)
    const x = c ? positionMonde(c, ecart, pieces)[0] : 0
    return [x, 0.8, D / 2 + 11 + (W > 0 ? 0 : 0)]
  }

  useFrame(({ clock }) => {
    const m = impulsion.current
    if (!m || !sc) return
    const et = sc.etapes[Math.min(etape, sc.etapes.length - 1)]
    const a = new THREE.Vector3(...pos(et.de, et.vers))
    const b = new THREE.Vector3(...pos(et.vers, et.vers))
    const t = (clock.elapsedTime * 0.6) % 1
    const f = et.bloque ? Math.min(t * 1.25, 0.82) : t
    m.position.lerpVectors(a, b, f)
    const pulse = 0.28 + 0.1 * Math.sin(clock.elapsedTime * 10)
    m.scale.setScalar(pulse / 0.3)
  })

  if (vue !== 'cyber' || !sc) return null
  const nom = (id: string) => (id === 'externe' ? 'Attaquant' : donnees.parId.get(id)?.nom ?? id)
  const courant = sc.etapes[Math.min(etape, sc.etapes.length - 1)]
  const coupeIci = coupe !== null && coupe.index <= etape
  const fantome = coupe ? sc.etapes[coupe.index] : null
  const fantomeId = fantome ? [fantome.de, fantome.vers].find((id) => { const e = donnees.parId.get(id); return e && !e.donnee.minimum_vital }) : undefined
  const positionAttaquant = pos('externe', sc.etapes[0].vers)

  return (
    <group>
      {/* l'attaquant */}
      <mesh position={positionAttaquant}>
        <coneGeometry args={[0.55, 1.4, 16]} />
        <meshStandardMaterial color="#e03131" emissive="#e03131" emissiveIntensity={0.5} />
      </mesh>
      <Html position={[positionAttaquant[0], positionAttaquant[1] + 1.4, positionAttaquant[2]]} center style={{ pointerEvents: 'none' }}>
        <div className="infobulle"><strong>Attaquant</strong></div>
      </Html>

      {/* étapes déjà franchies */}
      {sc.etapes.slice(0, Math.min(etape, debutBloque)).map((et, i) => (
        <Line key={i} points={[pos(et.de, et.vers), pos(et.vers, et.vers)]} color="#e03131" lineWidth={4} />
      ))}
      {/* étape en cours : trait fin + impulsion, sauf si le chemin est coupé */}
      {!coupeIci && (
        <>
          <Line points={[pos(courant.de, courant.vers), pos(courant.vers, courant.vers)]} color="#e03131" lineWidth={2} dashed dashSize={0.4} gapSize={0.3} />
          <mesh ref={impulsion}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#ff6b6b" />
          </mesh>
          {courant.bloque && (
            <Html position={(() => { const a = pos(courant.de, courant.vers), b = pos(courant.vers, courant.vers); return [a[0] + (b[0] - a[0]) * 0.86, a[1] + (b[1] - a[1]) * 0.86 + 0.6, a[2] + (b[2] - a[2]) * 0.86] as V3 })()} center style={{ pointerEvents: 'none' }}>
              <span className="croix-blocage">✖ bloqué</span>
            </Html>
          )}
        </>
      )}
      {/* chemin coupé en mode Minimum vital : l'équipement absent apparaît en fantôme */}
      {coupe && coupeIci && fantomeId && (
        <group position={pos(fantomeId, fantomeId)}>
          <mesh>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshBasicMaterial color="#868e96" wireframe />
          </mesh>
          <Html position={[0, 1.1, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="infobulle"><strong>{nom(fantomeId)}</strong><span>Absent en Minimum vital : chemin coupé</span></div>
          </Html>
        </group>
      )}
      {/* anneau sur la cible de l'étape en cours */}
      {!coupeIci && donnees.parId.get(courant.vers) && (
        <mesh position={pos(courant.vers, courant.vers)} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.0, 0.09, 8, 32]} />
          <meshBasicMaterial color="#e03131" />
        </mesh>
      )}
    </group>
  )
}
