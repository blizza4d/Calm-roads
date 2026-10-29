import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { VehicleModelType } from '../../../store/useGameStore'

interface CarModelProps {
  type: VehicleModelType
  paintColor: string
  metallic: number
  roughness: number
  steeringAngle: number
  wheelRotation: number
  isBraking: boolean
  headlightsOn: boolean
  isHoverMode: boolean
  wheelSuspensions?: [number, number, number, number]
}

// Reusable Forward Headlight Projector with realistic Three.js Target
function HeadlightBeams({
  x,
  y,
  z,
  color = '#fffbeb',
  intensity = 280,
}: {
  x: number
  y: number
  z: number
  color?: string
  intensity?: number
}) {
  const targetLeft = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(-x * 0.85, y - 0.2, -50)
    return o
  }, [x, y])

  const targetRight = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(x * 0.85, y - 0.2, -50)
    return o
  }, [x, y])

  return (
    <>
      <primitive object={targetLeft} />
      <primitive object={targetRight} />
      <spotLight
        position={[-x, y, z]}
        target={targetLeft}
        angle={0.48}
        penumbra={0.5}
        decay={2}
        distance={100}
        intensity={intensity}
        color={color}
        castShadow
        shadow-bias={-0.0006}
        shadow-mapSize={[512, 512]}
      />
      <spotLight
        position={[x, y, z]}
        target={targetRight}
        angle={0.48}
        penumbra={0.5}
        decay={2}
        distance={100}
        intensity={intensity}
        color={color}
        castShadow
        shadow-bias={-0.0006}
        shadow-mapSize={[512, 512]}
      />
    </>
  )
}

// ----------------------------------------------------
// 1. Authentic BMW M3 GTR '05 (ALMS / GT Widebody Monocoque)
// ----------------------------------------------------

// Shared wheel materials to avoid redundant allocations across 4 wheels
const sharedTireMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#1c1d20'),
  roughness: 0.88,
  metalness: 0.04,
})

const sharedCaliperMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#d97706'), // Brembo racing gold/amber
  metalness: 0.85,
  roughness: 0.22,
})

function BmwGtrWheel({
  wheelScene,
  side, // 1 for left (-X), -1 for right (+X)
  steeringAngle = 0,
  wheelRotation = 0,
  suspension = 0,
  isHoverMode = false,
  position,
  rimColor,
  metallic = 0.85,
  roughness = 0.18,
}: {
  wheelScene: THREE.Group
  side: 1 | -1
  steeringAngle?: number
  wheelRotation?: number
  suspension?: number
  isHoverMode?: boolean
  position: [number, number, number]
  rimColor?: string
  metallic?: number
  roughness?: number
}) {
  const cloned = useMemo(() => {
    const root = wheelScene.clone(true)
    // The actual wheel in tuner_wheel.glb is centered at Y=2.505 with diameter ~5.00
    root.position.set(0, -2.505, 0)
    return root
  }, [wheelScene])

  const rimMat = useMemo(() => {
    // Calibrated automotive satin/semi-gloss alloy to prevent blown-out specular highlights
    const effMetal = Math.min(0.78, Math.max(0.45, (metallic ?? 0.85) * 0.82))
    const effRough = Math.max(0.28, roughness ?? 0.28)
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(rimColor || '#d1d5db'),
      metalness: effMetal,
      roughness: effRough,
      envMapIntensity: 1.05,
    })
  }, [rimColor, metallic, roughness])

  useEffect(() => {
    cloned.traverse((child) => {
      // Hide corrupted giant Object_8 mesh from tuner_wheel.glb
      if (child.name === 'Object_8') {
        child.visible = false
        return
      }

      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        const name = child.material?.name || ''
        if (name.includes('WheelBase')) {
          child.material = rimMat
        } else if (name.includes('Tire')) {
          child.material = sharedTireMat
        } else if (name.includes('Calliper')) {
          child.material = sharedCaliperMat
        }
      }
    })
  }, [cloned, rimMat])

  const hoverFold = isHoverMode ? 0.78 : 0.0

  return (
    <group position={[position[0], position[1] + suspension, position[2]]}>
      {/* Antigravity hover fold angle */}
      <group rotation={[0, 0, side === 1 ? -hoverFold : hoverFold]}>
        {/* Steering angle (wheel knuckle) */}
        <group rotation={[0, steeringAngle, 0]}>
          {/* Non-spinning Brembo racing brake caliper fixed to wheel knuckle */}
          <mesh
            position={[side === 1 ? 0.05 : -0.05, 0.13, -0.11]}
            rotation={[0, 0, side === 1 ? -0.38 : 0.38]}
            castShadow
          >
            <boxGeometry args={[0.075, 0.11, 0.08]} />
            <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.22} />
          </mesh>

          {/* Outboard wheel rim face alignment: Left wheel side===1 rotates 180° around Y to face outboard (-X) */}
          <group rotation={[0, side === 1 ? Math.PI : 0, 0]}>
            {/* Wheel spin around axle (X). Rolls forward synchronized with car motion */}
            <group rotation={[side === 1 ? wheelRotation : -wheelRotation, 0, 0]}>
              {/* Ventilated Drilled Steel Racing Brake Rotor */}
              <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.028, 0, 0]}>
                <cylinderGeometry args={[0.23, 0.23, 0.022, 28]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.25} />
              </mesh>

              {/* Scaled from 5.0m mesh diameter to exact 0.68m visual wheel diameter (0.34m radius) */}
              <group scale={0.136}>
                <primitive object={cloned} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

export function BmwM3GtrModel({
  paintColor,
  metallic,
  roughness,
  steeringAngle,
  wheelRotation,
  isBraking,
  headlightsOn,
  isHoverMode,
  wheelSuspensions = [0, 0, 0, 0],
}: CarModelProps) {
  const { scene: bodyScene } = useGLTF('/models/bmw_m3_gtr_e46.glb')
  const { scene: wheelScene } = useGLTF('/models/tuner_wheel.glb')

  const clonedBody = useMemo(() => {
    return bodyScene.clone(true)
  }, [bodyScene])

  const bodyPaintMaterial = useMemo(() => {
    // Calibrated metallic & roughness to prevent blown-out white glowing artifacts on body and wheel arches
    const effMetal = Math.min(0.72, Math.max(0.2, (metallic ?? 0.72)))
    const effRough = Math.max(0.25, (roughness ?? 0.25))
    return new THREE.MeshPhysicalMaterial({
      color: paintColor ? new THREE.Color(paintColor) : new THREE.Color('#cbd5e1'),
      metalness: effMetal,
      roughness: effRough,
      clearcoat: 0.8,
      clearcoatRoughness: 0.06,
      reflectivity: 0.8,
      envMapIntensity: 0.95, // Balanced environment reflection to prevent specular blowout
    })
  }, [paintColor, metallic, roughness])

  const glassMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0a1128'),
      metalness: 0.1,
      roughness: 0.04,
      transmission: 0.88,
      transparent: true,
      opacity: 0.92,
      reflectivity: 0.98,
      envMapIntensity: 2.6,
    })
  }, [])

  const carbonFiberMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#18181b'),
      metalness: 0.32,
      roughness: 0.42,
    })
  }, [])

  const wingUprightMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#111827'),
      metalness: 0.65,
      roughness: 0.48,
    })
  }, [])

  const taillightMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#7f1d1d'),
      emissive: new THREE.Color('#330000'),
      emissiveIntensity: 0.5,
      roughness: 0.15,
    })
  }, [])

  const headlightMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      emissive: headlightsOn ? new THREE.Color('#fffbeb') : new THREE.Color('#000000'),
      emissiveIntensity: headlightsOn ? 3.5 : 0.0,
      roughness: 0.1,
      toneMapped: false,
    })
  }, [headlightsOn])

  useEffect(() => {
    taillightMaterial.color.set(isBraking ? '#ff0000' : '#7f1d1d')
    taillightMaterial.emissive.set(isBraking ? '#ef4444' : '#330000')
    taillightMaterial.emissiveIntensity = isBraking ? 3.2 : 0.5
    taillightMaterial.needsUpdate = true
  }, [isBraking, taillightMaterial])

  useEffect(() => {
    clonedBody.traverse((child) => {
      // Hide static merged tire mesh
      if (child.name.includes('M_Tire_High')) {
        child.visible = false
        return
      }

      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true

        const matName = child.material?.name || ''
        if (child.name.includes('Object_124') || child.name.includes('Spoiler_0000_001_MAT_Carbon')) {
          // Refine rear wing airfoil: sleek racing profile, thin carbon blade
          child.scale.set(1.0, 0.72, 1.0)
          child.material = carbonFiberMaterial
        } else if (child.name.includes('Object_121')) {
          // Wing stanchions: matte anodized aero brackets
          child.scale.set(0.9, 1.0, 0.9)
          child.material = wingUprightMaterial
        } else if (matName.includes('Carpaint')) {
          child.material = bodyPaintMaterial
        } else if (matName.includes('Carbon')) {
          child.material = carbonFiberMaterial
        } else if (matName.includes('Glass')) {
          child.material = glassMaterial
        } else if (matName.includes('red_glass')) {
          child.material = taillightMaterial
        } else if (matName.includes('Lights')) {
          child.material = headlightMaterial
        } else if (child.material instanceof THREE.MeshStandardMaterial) {
          // Clamp unmapped model materials to prevent blown-out white specular artifacts on arches
          child.material.envMapIntensity = 0.95
          child.material.roughness = Math.max(0.25, child.material.roughness)
          child.material.metalness = Math.min(0.70, child.material.metalness)
        }
      }
    })
  }, [clonedBody, bodyPaintMaterial, carbonFiberMaterial, wingUprightMaterial, glassMaterial, taillightMaterial, headlightMaterial])

  // Strict suspension travel clamp for sports car (max travel ±0.06m)
  const suspFl = isHoverMode ? 0 : Math.max(-0.06, Math.min(0.06, wheelSuspensions[0] || 0))
  const suspFr = isHoverMode ? 0 : Math.max(-0.06, Math.min(0.06, wheelSuspensions[1] || 0))
  const suspRl = isHoverMode ? 0 : Math.max(-0.06, Math.min(0.06, wheelSuspensions[2] || 0))
  const suspRr = isHoverMode ? 0 : Math.max(-0.06, Math.min(0.06, wheelSuspensions[3] || 0))

  return (
    <group position={[0, 0.048, 0]}>
      {/* High-Fidelity BMW M3 GTR '05 Monocoque - Aligned with Ground Clearance */}
      <group position={[0, -0.135, 0]} rotation={[0, Math.PI, 0]} scale={98.0}>
        <primitive object={clonedBody} />
      </group>

      {/* Front-Left Articulated BBS Race Wheel: Positioned flush inside front wheel arch */}
      <BmwGtrWheel
        wheelScene={wheelScene}
        side={1}
        position={[-0.83, -0.02, -1.48]}
        steeringAngle={steeringAngle}
        wheelRotation={wheelRotation}
        suspension={suspFl}
        isHoverMode={isHoverMode}
        rimColor="#cbd5e1"
        metallic={metallic}
        roughness={roughness}
      />

      {/* Front-Right Articulated BBS Race Wheel: Positioned flush inside front wheel arch */}
      <BmwGtrWheel
        wheelScene={wheelScene}
        side={-1}
        position={[0.83, -0.02, -1.48]}
        steeringAngle={steeringAngle}
        wheelRotation={wheelRotation}
        suspension={suspFr}
        isHoverMode={isHoverMode}
        rimColor="#cbd5e1"
        metallic={metallic}
        roughness={roughness}
      />

      {/* Rear-Left Articulated BBS Race Wheel: Positioned flush inside rear widebody arch */}
      <BmwGtrWheel
        wheelScene={wheelScene}
        side={1}
        position={[-0.83, -0.02, 1.18]}
        steeringAngle={0}
        wheelRotation={wheelRotation}
        suspension={suspRl}
        isHoverMode={isHoverMode}
        rimColor="#cbd5e1"
        metallic={metallic}
        roughness={roughness}
      />

      {/* Rear-Right Articulated BBS Race Wheel: Positioned flush inside rear widebody arch */}
      <BmwGtrWheel
        wheelScene={wheelScene}
        side={-1}
        position={[0.83, -0.02, 1.18]}
        steeringAngle={0}
        wheelRotation={wheelRotation}
        suspension={suspRr}
        isHoverMode={isHoverMode}
        rimColor="#cbd5e1"
        metallic={metallic}
        roughness={roughness}
      />

      {/* Dynamic Headlight Projectors */}
      {headlightsOn && <HeadlightBeams x={0.65} y={0.24} z={-2.2} color="#fffbeb" intensity={280} />}

      {/* Antigravity Repulsor Glow Emitters under Wheel Arches */}
      {isHoverMode && (
        <>
          <pointLight position={[-0.82, -0.12, -1.38]} color="#38bdf8" intensity={2.5} distance={3} />
          <pointLight position={[0.82, -0.12, -1.38]} color="#38bdf8" intensity={2.5} distance={3} />
          <pointLight position={[-0.82, -0.12, 1.28]} color="#38bdf8" intensity={2.5} distance={3} />
          <pointLight position={[0.82, -0.12, 1.28]} color="#38bdf8" intensity={2.5} distance={3} />
        </>
      )}
    </group>
  )
}

// ----------------------------------------------------
// 2. High-Performance Modern Supercar (Italian V8 Monocoque)
// ----------------------------------------------------

const REST_WHEEL_POSITIONS = {
  fl: new THREE.Vector3(-0.84256, 0.35802, -1.15532),
  fr: new THREE.Vector3(0.82869, 0.36065, -1.15446),
  rl: new THREE.Vector3(-0.82134, 0.35802, 1.49499),
  rr: new THREE.Vector3(0.82439, 0.35802, 1.49632),
  steering: new THREE.Vector3(-0.34596, 0.79887, -0.34566),
}

const BASE_WHEEL_QUAT = new THREE.Quaternion(-0.7071068, 0, 0, 0.7071068)
const BASE_STEER_QUAT = new THREE.Quaternion(-0.819152, 0, 0, 0.573576)

const _vUp = new THREE.Vector3(0, 1, 0)
const _vRight = new THREE.Vector3(1, 0, 0)
const _vForward = new THREE.Vector3(0, 0, 1)

// Reusable scratch objects to eliminate per-frame garbage collections in animation loops
const _qSteer = new THREE.Quaternion()
const _qSpin = new THREE.Quaternion()
const _qHover = new THREE.Quaternion()
const _qTurn = new THREE.Quaternion()
const _spinAxis = new THREE.Vector3()

export function SupercarModel({
  paintColor,
  metallic,
  roughness,
  steeringAngle,
  wheelRotation,
  isBraking,
  headlightsOn,
  isHoverMode,
  wheelSuspensions = [0, 0, 0, 0],
}: CarModelProps) {
  const { scene } = useGLTF('/models/ferrari.glb')

  // Clone scene hierarchy to ensure independent transforms and instance safety
  const clonedScene = useMemo(() => {
    return scene.clone(true)
  }, [scene])

  // Dynamic PBR Automotive Materials
  const bodyPaintMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: paintColor ? new THREE.Color(paintColor) : new THREE.Color('#cbd5e1'),
      metalness: metallic ?? 0.85,
      roughness: roughness ?? 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.95,
      envMapIntensity: 2.2,
    })
  }, [paintColor, metallic, roughness])

  const glassMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0a1128'),
      metalness: 0.1,
      roughness: 0.04,
      transmission: 0.88,
      transparent: true,
      opacity: 0.92,
      reflectivity: 0.98,
      envMapIntensity: 2.6,
    })
  }, [])

  const carbonFiberMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#18181b'),
      metalness: 0.65,
      roughness: 0.35,
    })
  }, [])

  const taillightMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#7f1d1d'),
      emissive: new THREE.Color('#330000'),
      emissiveIntensity: 0.5,
      roughness: 0.15,
    })
  }, [])

  // React to brake changes dynamically without re-traversing or rebuilding scene
  useEffect(() => {
    taillightMaterial.color.set(isBraking ? '#ff0000' : '#7f1d1d')
    taillightMaterial.emissive.set(isBraking ? '#ef4444' : '#330000')
    taillightMaterial.emissiveIntensity = isBraking ? 3.0 : 0.5
    taillightMaterial.needsUpdate = true
  }, [isBraking, taillightMaterial])

  // Store references to articulated nodes
  const nodesRef = useRef<{
    wheelFl: THREE.Object3D | null
    wheelFr: THREE.Object3D | null
    wheelRl: THREE.Object3D | null
    wheelRr: THREE.Object3D | null
    steeringWheel: THREE.Object3D | null
  }>({
    wheelFl: null,
    wheelFr: null,
    wheelRl: null,
    wheelRr: null,
    steeringWheel: null,
  })

  // Traverse and apply high-quality PBR materials and bind node references (never re-run on braking)
  useEffect(() => {
    nodesRef.current = {
      wheelFl: null,
      wheelFr: null,
      wheelRl: null,
      wheelRr: null,
      steeringWheel: null,
    }

    clonedScene.traverse((child) => {
      // Normalize local transforms and scale on all nodes
      child.scale.set(1, 1, 1)

      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true

        const matName = child.material?.name?.toLowerCase() || ''
        const meshName = child.name.toLowerCase()

        if (matName.includes('body_color') || meshName === 'body') {
          child.material = bodyPaintMaterial
        } else if (matName.includes('glass') || meshName === 'glass') {
          child.material = glassMaterial
        } else if (matName.includes('carbon') || meshName.includes('carbon')) {
          child.material = carbonFiberMaterial
        } else if (matName.includes('tire') || matName.includes('rubber') || meshName.includes('tire') || meshName.includes('rubber')) {
          child.material = sharedTireMat
        } else if (matName.includes('rim') || matName.includes('wheel') || meshName.includes('rim') || meshName.includes('spoke')) {
          child.material = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.22 })
        } else if (
          matName.includes('taillight') ||
          meshName.includes('lights_red') ||
          meshName.includes('taillight')
        ) {
          child.material = taillightMaterial
        }
      }

      if (child.name === 'wheel_fl') {
        nodesRef.current.wheelFl = child
        child.position.copy(REST_WHEEL_POSITIONS.fl)
        child.quaternion.copy(BASE_WHEEL_QUAT)
      } else if (child.name === 'wheel_fr') {
        nodesRef.current.wheelFr = child
        child.position.copy(REST_WHEEL_POSITIONS.fr)
        child.quaternion.copy(BASE_WHEEL_QUAT)
      } else if (child.name === 'wheel_rl') {
        nodesRef.current.wheelRl = child
        child.position.copy(REST_WHEEL_POSITIONS.rl)
        child.quaternion.copy(BASE_WHEEL_QUAT)
      } else if (child.name === 'wheel_rr') {
        nodesRef.current.wheelRr = child
        child.position.copy(REST_WHEEL_POSITIONS.rr)
        child.quaternion.copy(BASE_WHEEL_QUAT)
      } else if (child.name === 'steering_wheel') {
        nodesRef.current.steeringWheel = child
        child.position.copy(REST_WHEEL_POSITIONS.steering)
        child.quaternion.copy(BASE_STEER_QUAT)
      }
    })
  }, [clonedScene, bodyPaintMaterial, glassMaterial, carbonFiberMaterial, taillightMaterial])

  // Articulate wheels, steering, and suspension travel each frame with strict anchoring
  useFrame(() => {
    const { wheelFl, wheelFr, wheelRl, wheelRr, steeringWheel } = nodesRef.current

    // Antigravity hover fold angle (tilt wheels inward 45 deg)
    const hoverFold = isHoverMode ? 0.78 : 0.0

    // Strict suspension travel clamp for sports car (max travel ±0.06m)
    const suspFl = isHoverMode ? 0 : Math.max(-0.06, Math.min(0.06, wheelSuspensions[0] || 0))
    const suspFr = isHoverMode ? 0 : Math.max(-0.06, Math.min(0.06, wheelSuspensions[1] || 0))
    const suspRl = isHoverMode ? 0 : Math.max(-0.06, Math.min(0.06, wheelSuspensions[2] || 0))
    const suspRr = isHoverMode ? 0 : Math.max(-0.06, Math.min(0.06, wheelSuspensions[3] || 0))

    // Front-Left Wheel (steering + spin + suspension + hover)
    if (wheelFl) {
      wheelFl.position.set(
        REST_WHEEL_POSITIONS.fl.x,
        REST_WHEEL_POSITIONS.fl.y + suspFl,
        REST_WHEEL_POSITIONS.fl.z
      )
      wheelFl.scale.set(1, 1, 1)

      _qSteer.setFromAxisAngle(_vUp, steeringAngle)
      _spinAxis.copy(_vRight).applyQuaternion(_qSteer)
      _qSpin.setFromAxisAngle(_spinAxis, wheelRotation)
      _qHover.setFromAxisAngle(_vForward, -hoverFold)
      wheelFl.quaternion.copy(_qHover).multiply(_qSpin).multiply(_qSteer).multiply(BASE_WHEEL_QUAT)
    }

    // Front-Right Wheel
    if (wheelFr) {
      wheelFr.position.set(
        REST_WHEEL_POSITIONS.fr.x,
        REST_WHEEL_POSITIONS.fr.y + suspFr,
        REST_WHEEL_POSITIONS.fr.z
      )
      wheelFr.scale.set(1, 1, 1)

      _qSteer.setFromAxisAngle(_vUp, steeringAngle)
      _spinAxis.copy(_vRight).applyQuaternion(_qSteer)
      _qSpin.setFromAxisAngle(_spinAxis, wheelRotation)
      _qHover.setFromAxisAngle(_vForward, hoverFold)
      wheelFr.quaternion.copy(_qHover).multiply(_qSpin).multiply(_qSteer).multiply(BASE_WHEEL_QUAT)
    }

    // Rear-Left Wheel (spin + suspension + hover)
    if (wheelRl) {
      wheelRl.position.set(
        REST_WHEEL_POSITIONS.rl.x,
        REST_WHEEL_POSITIONS.rl.y + suspRl,
        REST_WHEEL_POSITIONS.rl.z
      )
      wheelRl.scale.set(1, 1, 1)

      _qSpin.setFromAxisAngle(_vRight, wheelRotation)
      _qHover.setFromAxisAngle(_vForward, -hoverFold)
      wheelRl.quaternion.copy(_qHover).multiply(_qSpin).multiply(BASE_WHEEL_QUAT)
    }

    // Rear-Right Wheel
    if (wheelRr) {
      wheelRr.position.set(
        REST_WHEEL_POSITIONS.rr.x,
        REST_WHEEL_POSITIONS.rr.y + suspRr,
        REST_WHEEL_POSITIONS.rr.z
      )
      wheelRr.scale.set(1, 1, 1)

      _qSpin.setFromAxisAngle(_vRight, wheelRotation)
      _qHover.setFromAxisAngle(_vForward, hoverFold)
      wheelRr.quaternion.copy(_qHover).multiply(_qSpin).multiply(BASE_WHEEL_QUAT)
    }

    // Cockpit Steering Wheel Column
    if (steeringWheel) {
      steeringWheel.position.set(
        REST_WHEEL_POSITIONS.steering.x,
        REST_WHEEL_POSITIONS.steering.y,
        REST_WHEEL_POSITIONS.steering.z
      )
      steeringWheel.scale.set(1, 1, 1)
      _qTurn.setFromAxisAngle(_vForward, -steeringAngle * 2.8)
      steeringWheel.quaternion.copy(BASE_STEER_QUAT).multiply(_qTurn)
    }
  })

  return (
    <group position={[0, -0.358, 0]}>
      {/* High-Fidelity Automotive GLTF Monocoque */}
      <primitive object={clonedScene} />

      {/* Dynamic Headlight Projectors */}
      {headlightsOn && <HeadlightBeams x={0.68} y={0.48} z={-2.2} color="#fffbeb" intensity={280} />}

      {/* Antigravity Repulsor Glow Emitters under Wheel Arches */}
      {isHoverMode && (
        <>
          <pointLight position={[-0.84, 0.25, -1.15]} color="#38bdf8" intensity={2.5} distance={3} />
          <pointLight position={[0.84, 0.25, -1.15]} color="#38bdf8" intensity={2.5} distance={3} />
          <pointLight position={[-0.82, 0.25, 1.49]} color="#38bdf8" intensity={2.5} distance={3} />
          <pointLight position={[0.82, 0.25, 1.49]} color="#38bdf8" intensity={2.5} distance={3} />
        </>
      )}
    </group>
  )
}

useGLTF.preload('/models/bmw_m3_gtr_e46.glb')
useGLTF.preload('/models/tuner_wheel.glb')

// ----------------------------------------------------
// 2. Realistic Cozy Camper Van (Vintage Type 2 Style)
// ----------------------------------------------------
export function CamperVanModel({
  paintColor,
  metallic,
  roughness,
  steeringAngle,
  wheelRotation,
  isBraking,
  headlightsOn,
  wheelSuspensions = [0, 0, 0, 0],
}: CarModelProps) {
  const lowerBody = <meshStandardMaterial color={paintColor || '#2d4e30'} roughness={roughness || 0.45} metalness={metallic || 0.2} />
  const creamRoof = <meshStandardMaterial color="#fef3c7" roughness={0.35} />
  const chromeMat = <meshStandardMaterial color="#f8fafc" metalness={0.96} roughness={0.06} />
  const woodMat = <meshStandardMaterial color="#b45309" roughness={0.7} />
  const glassMat = (
    <meshPhysicalMaterial color="#38bdf8" roughness={0.06} transmission={0.84} transparent opacity={0.9} />
  )
  const headlightMat = (
    <meshStandardMaterial
      color={headlightsOn ? '#fef08a' : '#cbd5e1'}
      emissive={headlightsOn ? '#fef08a' : '#000'}
      emissiveIntensity={headlightsOn ? 3.0 : 0}
      toneMapped={false}
    />
  )
  const taillightMat = (
    <meshStandardMaterial
      color="#ef4444"
      emissive="#ef4444"
      emissiveIntensity={isBraking ? 4.5 : 1.0}
      toneMapped={false}
    />
  )

  const renderVanWheel = (isFront: boolean, isLeft: boolean) => (
    <group rotation={[0, isFront ? steeringAngle : 0, 0]}>
      <group rotation={[-wheelRotation, 0, 0]}>
        {/* Rubber Tire with Tread */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.28, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.90} metalness={0.04} />
        </mesh>
        {/* Rounded Tire Outer Shoulders */}
        <mesh rotation={[0, Math.PI / 2, 0]} position={[isLeft ? -0.11 : 0.11, 0, 0]}>
          <torusGeometry args={[0.30, 0.08, 12, 24]} />
          <meshStandardMaterial color="#1f2937" roughness={0.90} metalness={0.04} />
        </mesh>
        {/* White-wall ring */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? -0.13 : 0.13, 0, 0]}>
          <cylinderGeometry args={[0.31, 0.31, 0.02, 24]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.35} />
        </mesh>
        {/* Vintage Steel Wheel Rim Lip */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? -0.135 : 0.135, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.03, 22]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Chrome Baby Moon Dome Hubcap */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? -0.15 : 0.15, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.045, 20]} />
          {chromeMat}
        </mesh>
      </group>
    </group>
  )

  return (
    <group position={[0, -0.35, 0]}>
      {/* Lower Two-Tone Van Body */}
      <mesh position={[0, 0.58, 0]} castShadow>
        <boxGeometry args={[1.92, 0.64, 4.4]} />
        {lowerBody}
      </mesh>
      {/* Upper Cream Cabin */}
      <mesh position={[0, 1.25, -0.05]} castShadow>
        <boxGeometry args={[1.88, 0.72, 4.2]} />
        {creamRoof}
      </mesh>
      {/* Rounded Pop-top Roof */}
      <mesh position={[0, 1.68, 0]} castShadow>
        <boxGeometry args={[1.82, 0.22, 4.1]} />
        {creamRoof}
      </mesh>

      {/* Classic V-shaped Chevron on Front Nose */}
      <mesh position={[0, 0.65, -2.22]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.55, 0.22, 0.04]} />
        {creamRoof}
      </mesh>
      {/* Chrome VW-style Front Emblem */}
      <mesh position={[0, 0.65, -2.24]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 20]} />
        {chromeMat}
      </mesh>

      {/* Chrome Curved Front & Rear Bumpers with Overriders */}
      <mesh position={[0, 0.32, -2.28]}>
        <boxGeometry args={[2.04, 0.14, 0.14]} />
        {chromeMat}
      </mesh>
      <mesh position={[0, 0.32, 2.26]}>
        <boxGeometry args={[2.04, 0.14, 0.14]} />
        {chromeMat}
      </mesh>

      {/* Roof Rack with Wood Slats & Surfboard */}
      <mesh position={[0, 1.84, 0.2]}>
        <boxGeometry args={[1.56, 0.08, 2.5]} />
        {chromeMat}
      </mesh>
      {[-0.6, -0.2, 0.2, 0.6].map((sz, i) => (
        <mesh key={i} position={[0, 1.88, 0.2 + sz]}>
          <boxGeometry args={[1.48, 0.03, 0.16]} />
          {woodMat}
        </mesh>
      ))}
      {/* Vintage Surfboard */}
      <mesh position={[0.3, 1.96, 0.2]} rotation={[0, 0.08, 0.06]}>
        <boxGeometry args={[0.42, 0.06, 2.2]} />
        <meshStandardMaterial color="#f97316" roughness={0.3} />
      </mesh>

      {/* Split Windshield Glass */}
      <mesh position={[-0.45, 1.28, -2.12]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.78, 0.52, 0.05]} />
        {glassMat}
      </mesh>
      <mesh position={[0.45, 1.28, -2.12]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.78, 0.52, 0.05]} />
        {glassMat}
      </mesh>
      {/* Side Windows */}
      <mesh position={[0.95, 1.28, 0]}>
        <boxGeometry args={[0.02, 0.46, 3.4]} />
        {glassMat}
      </mesh>
      <mesh position={[-0.95, 1.28, 0]}>
        <boxGeometry args={[0.02, 0.46, 3.4]} />
        {glassMat}
      </mesh>

      {/* Round Vintage Headlights with Chrome Rings */}
      <group position={[-0.64, 0.72, -2.22]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.16, 0.16, 0.06, 18]} />
          {headlightMat}
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <torusGeometry args={[0.16, 0.02, 10, 18]} />
          {chromeMat}
        </mesh>
      </group>
      <group position={[0.64, 0.72, -2.22]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.16, 0.16, 0.06, 18]} />
          {headlightMat}
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <torusGeometry args={[0.16, 0.02, 10, 18]} />
          {chromeMat}
        </mesh>
      </group>

      {/* Tail Lamps */}
      <mesh position={[-0.68, 0.65, 2.22]}>
        <boxGeometry args={[0.18, 0.24, 0.06]} />
        {taillightMat}
      </mesh>
      <mesh position={[0.68, 0.65, 2.22]}>
        <boxGeometry args={[0.18, 0.24, 0.06]} />
        {taillightMat}
      </mesh>

      {/* Single Pea-Shooter Chrome Exhaust Tip */}
      <mesh position={[-0.48, 0.22, 2.24]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.18, 14]} />
        {chromeMat}
      </mesh>

      {headlightsOn && <HeadlightBeams x={0.64} y={0.75} z={-2.3} color="#fef3c7" intensity={260} />}

      <group position={[-0.92, 0.38 + (wheelSuspensions[0] || 0), -1.3]}>{renderVanWheel(true, true)}</group>
      <group position={[0.92, 0.38 + (wheelSuspensions[1] || 0), -1.3]}>{renderVanWheel(true, false)}</group>
      <group position={[-0.92, 0.38 + (wheelSuspensions[2] || 0), 1.3]}>{renderVanWheel(false, true)}</group>
      <group position={[0.92, 0.38 + (wheelSuspensions[3] || 0), 1.3]}>{renderVanWheel(false, false)}</group>
    </group>
  )
}

// ----------------------------------------------------
// 3. Futuristic Antigravity Stealth Hovercraft
// ----------------------------------------------------
export function HovercraftModel({
  paintColor,
  metallic,
  roughness,
  steeringAngle,
  headlightsOn,
  wheelSuspensions = [0, 0, 0, 0],
}: CarModelProps) {
  const hullMat = (
    <meshStandardMaterial
      color={paintColor || '#0284c7'}
      metalness={Math.max(0.75, metallic)}
      roughness={Math.min(0.25, roughness)}
      envMapIntensity={1.8}
    />
  )
  const darkAero = <meshStandardMaterial color="#0f172a" metalness={0.65} roughness={0.35} />
  const canopyGlass = (
    <meshPhysicalMaterial
      color="#0284c7"
      roughness={0.04}
      transmission={0.88}
      transparent
      opacity={0.92}
      reflectivity={0.98}
    />
  )
  const repulsorGlow = (
    <meshStandardMaterial
      color="#38bdf8"
      emissive="#0284c7"
      emissiveIntensity={4.2}
      toneMapped={false}
    />
  )
  const thrusterGlow = (
    <meshStandardMaterial
      color="#38bdf8"
      emissive="#38bdf8"
      emissiveIntensity={5.2}
      toneMapped={false}
    />
  )

  return (
    <group position={[0, -0.2, 0]}>
      {/* Central Aerodynamic Stealth Fuselage */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.68, 0.38, 4.2]} />
        {hullMat}
      </mesh>

      {/* Swept-back Faceted Nose Cone */}
      <mesh position={[0, 0.42, -2.15]} rotation={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[1.38, 0.28, 0.85]} />
        {hullMat}
      </mesh>

      {/* Tinted Cockpit Bubble Canopy */}
      <mesh position={[0, 0.76, -0.1]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[1.24, 0.44, 2.15]} />
        {canopyGlass}
      </mesh>

      {/* Aerodynamic Side Sponsons / Winglets */}
      <mesh position={[-1.02, 0.38, 0]} rotation={[0, 0, 0.12]} castShadow>
        <boxGeometry args={[0.38, 0.18, 3.4]} />
        {darkAero}
      </mesh>
      <mesh position={[1.02, 0.38, 0]} rotation={[0, 0, -0.12]} castShadow>
        <boxGeometry args={[0.38, 0.18, 3.4]} />
        {darkAero}
      </mesh>

      {/* 4 Corner Antigravity Repulsor Emitters with Floating Rings */}
      <group position={[-0.88, 0.16 + (wheelSuspensions[0] || 0), -1.35]} rotation={[0, steeringAngle * 0.5, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.28, 0.06, 16, 24]} />
          {repulsorGlow}
        </mesh>
        <pointLight color="#38bdf8" intensity={2.2} distance={3.5} />
      </group>
      <group position={[0.88, 0.16 + (wheelSuspensions[1] || 0), -1.35]} rotation={[0, steeringAngle * 0.5, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.28, 0.06, 16, 24]} />
          {repulsorGlow}
        </mesh>
        <pointLight color="#38bdf8" intensity={2.2} distance={3.5} />
      </group>
      <group position={[-0.88, 0.16 + (wheelSuspensions[2] || 0), 1.35]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.06, 16, 24]} />
          {repulsorGlow}
        </mesh>
        <pointLight color="#38bdf8" intensity={2.2} distance={3.5} />
      </group>
      <group position={[0.88, 0.16 + (wheelSuspensions[3] || 0), 1.35]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.06, 16, 24]} />
          {repulsorGlow}
        </mesh>
        <pointLight color="#38bdf8" intensity={2.2} distance={3.5} />
      </group>

      {/* Twin Vectoring Rear Ion Thrusters */}
      <mesh position={[-0.42, 0.44, 2.14]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.35, 20]} />
        {darkAero}
      </mesh>
      <mesh position={[-0.42, 0.44, 2.24]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.08, 16]} />
        {thrusterGlow}
      </mesh>
      <mesh position={[0.42, 0.44, 2.14]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.35, 20]} />
        {darkAero}
      </mesh>
      <mesh position={[0.42, 0.44, 2.24]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.08, 16]} />
        {thrusterGlow}
      </mesh>

      {/* Twin Swept Vertical Stabilizer Fins */}
      <mesh position={[-0.7, 0.85, 1.7]} rotation={[0.1, 0, 0.28]} castShadow>
        <boxGeometry args={[0.04, 0.62, 0.85]} />
        {darkAero}
      </mesh>
      <mesh position={[0.7, 0.85, 1.7]} rotation={[0.1, 0, -0.28]} castShadow>
        <boxGeometry args={[0.04, 0.62, 0.85]} />
        {darkAero}
      </mesh>

      {headlightsOn && <HeadlightBeams x={0.55} y={0.45} z={-2.4} color="#e0f2fe" intensity={280} />}
    </group>
  )
}

// ----------------------------------------------------
// 4. Vintage Rally Spec Hatchback (Group A Homologation)
// ----------------------------------------------------
export function VintageHatchbackModel({
  paintColor,
  metallic,
  roughness,
  steeringAngle,
  wheelRotation,
  isBraking,
  headlightsOn,
  wheelSuspensions = [0, 0, 0, 0],
}: CarModelProps) {
  const redMat = (
    <meshStandardMaterial
      color={paintColor || '#dc2626'}
      roughness={roughness || 0.3}
      metalness={metallic || 0.4}
      envMapIntensity={1.5}
    />
  )
  const trimMat = <meshStandardMaterial color="#1e293b" roughness={0.75} />
  const whiteRimMat = <meshStandardMaterial color="#f8fafc" roughness={0.15} metalness={0.7} />
  const glassMat = (
    <meshPhysicalMaterial color="#0284c7" roughness={0.06} transmission={0.8} transparent opacity={0.92} />
  )
  const headlightMat = (
    <meshStandardMaterial
      color={headlightsOn ? '#fef08a' : '#94a3b8'}
      emissive={headlightsOn ? '#fef08a' : '#000'}
      emissiveIntensity={headlightsOn ? 2.8 : 0}
      toneMapped={false}
    />
  )
  const rallyFogMat = (
    <meshStandardMaterial
      color={headlightsOn ? '#facc15' : '#e2e8f0'}
      emissive={headlightsOn ? '#facc15' : '#000'}
      emissiveIntensity={headlightsOn ? 3.2 : 0}
      toneMapped={false}
    />
  )
  const taillightMat = (
    <meshStandardMaterial
      color="#ef4444"
      emissive="#ef4444"
      emissiveIntensity={isBraking ? 4.6 : 1.0}
      toneMapped={false}
    />
  )

  const renderHatchWheel = (isFront: boolean, isLeft: boolean) => (
    <group rotation={[0, isFront ? steeringAngle : 0, 0]}>
      {/* Non-spinning Red Racing Brake Caliper on knuckle */}
      <mesh
        position={[isLeft ? 0.04 : -0.04, 0.12, -0.1]}
        rotation={[0, 0, isLeft ? -0.4 : 0.4]}
        castShadow
      >
        <boxGeometry args={[0.065, 0.09, 0.07]} />
        <meshStandardMaterial color="#dc2626" metalness={0.78} roughness={0.25} />
      </mesh>

      <group rotation={[-wheelRotation, 0, 0]}>
        {/* Rubber Tire with Rounded Tread Profile */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.25, 24]} />
          <meshStandardMaterial color="#1c1d20" roughness={0.88} metalness={0.05} />
        </mesh>
        {/* Rounded Tire Outer Shoulders */}
        <mesh rotation={[0, Math.PI / 2, 0]} position={[isLeft ? -0.1 : 0.1, 0, 0]}>
          <torusGeometry args={[0.26, 0.08, 12, 24]} />
          <meshStandardMaterial color="#1c1d20" roughness={0.88} metalness={0.05} />
        </mesh>
        {/* Drilled Steel Brake Rotor */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.28} />
        </mesh>
        {/* White OZ Rally Racing Rim with Dish */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? -0.11 : 0.11, 0, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.04, 20]} />
          {whiteRimMat}
        </mesh>
      </group>
    </group>
  )

  return (
    <group position={[0, -0.38, 0]}>
      {/* Lower Hot-Hatch Body */}
      <mesh position={[0, 0.44, 0]} castShadow>
        <boxGeometry args={[1.74, 0.44, 3.82]} />
        {redMat}
      </mesh>
      {/* Flared Boxy Rally Wheel Arches */}
      <mesh position={[-0.88, 0.4, -1.15]} castShadow>
        <boxGeometry args={[0.08, 0.32, 0.88]} />
        {redMat}
      </mesh>
      <mesh position={[0.88, 0.4, -1.15]} castShadow>
        <boxGeometry args={[0.08, 0.32, 0.88]} />
        {redMat}
      </mesh>
      <mesh position={[-0.88, 0.4, 1.15]} castShadow>
        <boxGeometry args={[0.08, 0.32, 0.88]} />
        {redMat}
      </mesh>
      <mesh position={[0.88, 0.4, 1.15]} castShadow>
        <boxGeometry args={[0.08, 0.32, 0.88]} />
        {redMat}
      </mesh>

      {/* Protective Bodyside Rubbing Strips */}
      <mesh position={[0.88, 0.42, 0]}>
        <boxGeometry args={[0.02, 0.08, 3.75]} />
        {trimMat}
      </mesh>
      <mesh position={[-0.88, 0.42, 0]}>
        <boxGeometry args={[0.02, 0.08, 3.75]} />
        {trimMat}
      </mesh>

      {/* Boxy Cabin & Slanted Windshield */}
      <mesh position={[0, 0.88, -0.1]} castShadow>
        <boxGeometry args={[1.52, 0.48, 2.1]} />
        {redMat}
      </mesh>
      <mesh position={[0, 0.86, -1.02]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[1.46, 0.54, 0.05]} />
        {glassMat}
      </mesh>
      <mesh position={[0, 0.86, 0.98]} rotation={[-0.6, 0, 0]}>
        <boxGeometry args={[1.44, 0.54, 0.05]} />
        {glassMat}
      </mesh>

      {/* Roof Rally Air Scoop */}
      <mesh position={[0, 1.16, -0.2]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.38, 0.08, 0.42]} />
        {trimMat}
      </mesh>

      {/* Rear High Rally Spoiler */}
      <mesh position={[0, 1.12, 1.05]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[1.56, 0.04, 0.28]} />
        {trimMat}
      </mesh>

      {/* Quad Front Rally Pod Lights */}
      {[-0.38, -0.13, 0.13, 0.38].map((fx, i) => (
        <group key={i} position={[fx, 0.52, -1.98]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.05, 16]} />
          <mesh>
            <cylinderGeometry args={[0.09, 0.09, 0.05, 16]} />
            {rallyFogMat}
          </mesh>
        </group>
      ))}

      {/* Standard Rectangular Headlamps */}
      <mesh position={[-0.64, 0.44, -1.94]}>
        <boxGeometry args={[0.32, 0.18, 0.05]} />
        {headlightMat}
      </mesh>
      <mesh position={[0.64, 0.44, -1.94]}>
        <boxGeometry args={[0.32, 0.18, 0.05]} />
        {headlightMat}
      </mesh>

      {/* Taillights */}
      <mesh position={[-0.62, 0.52, 1.93]}>
        <boxGeometry args={[0.32, 0.22, 0.05]} />
        {taillightMat}
      </mesh>
      <mesh position={[0.62, 0.52, 1.93]}>
        <boxGeometry args={[0.32, 0.22, 0.05]} />
        {taillightMat}
      </mesh>

      {/* Big Bore Rally Exhaust Cannon */}
      <mesh position={[0.54, 0.22, 1.96]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.18, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Red Rally Mudflaps behind Rear Wheels */}
      <mesh position={[-0.86, 0.18, 1.62]}>
        <boxGeometry args={[0.02, 0.24, 0.18]} />
        <meshStandardMaterial color="#dc2626" roughness={0.7} />
      </mesh>
      <mesh position={[0.86, 0.18, 1.62]}>
        <boxGeometry args={[0.02, 0.24, 0.18]} />
        <meshStandardMaterial color="#dc2626" roughness={0.7} />
      </mesh>

      {headlightsOn && <HeadlightBeams x={0.62} y={0.5} z={-2.0} color="#fff" intensity={260} />}

      <group position={[-0.86, 0.34 + (wheelSuspensions[0] || 0), -1.15]}>{renderHatchWheel(true, true)}</group>
      <group position={[0.86, 0.34 + (wheelSuspensions[1] || 0), -1.15]}>{renderHatchWheel(true, false)}</group>
      <group position={[-0.86, 0.34 + (wheelSuspensions[2] || 0), 1.15]}>{renderHatchWheel(false, true)}</group>
      <group position={[0.86, 0.34 + (wheelSuspensions[3] || 0), 1.15]}>{renderHatchWheel(false, false)}</group>
    </group>
  )
}

export function ActiveCarModel(props: CarModelProps) {
  switch (props.type) {
    case 'hovercraft':
      return <HovercraftModel {...props} />
    case 'bmw_m3':
      return <BmwM3GtrModel {...props} />
    case 'supercar':
      return <SupercarModel {...props} />
    case 'camper':
      return <CamperVanModel {...props} />
    case 'hatchback':
      return <VintageHatchbackModel {...props} />
    default:
      return <BmwM3GtrModel {...props} />
  }
}

useGLTF.preload('/models/bmw_m3_gtr_e46.glb')
useGLTF.preload('/models/tuner_wheel.glb')
