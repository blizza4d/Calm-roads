import { useMemo } from 'react'
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

// Reusable Forward Headlight Projector with true Three.js Target
function HeadlightBeams({
  x,
  y,
  z,
  color = '#fffbeb',
  intensity = 65,
}: {
  x: number
  y: number
  z: number
  color?: string
  intensity?: number
}) {
  const targetLeft = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(-x, y - 0.2, -42)
    return o
  }, [x, y])

  const targetRight = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(x, y - 0.2, -42)
    return o
  }, [x, y])

  return (
    <>
      <primitive object={targetLeft} />
      <primitive object={targetRight} />
      <spotLight
        position={[-x, y, z]}
        target={targetLeft}
        angle={0.52}
        penumbra={0.65}
        intensity={intensity}
        color={color}
        distance={80}
        castShadow
        shadow-bias={-0.0008}
      />
      <spotLight
        position={[x, y, z]}
        target={targetRight}
        angle={0.52}
        penumbra={0.65}
        intensity={intensity}
        color={color}
        distance={80}
        castShadow
        shadow-bias={-0.0008}
      />
    </>
  )
}

// ----------------------------------------------------
// 1. Futuristic Antigravity Hovercraft
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
      color={paintColor}
      metalness={Math.max(0.7, metallic)}
      roughness={Math.min(0.25, roughness)}
      envMapIntensity={1.5}
    />
  )
  const darkAero = <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.4} />
  const canopyGlass = (
    <meshPhysicalMaterial
      color="#0284c7"
      roughness={0.05}
      transmission={0.88}
      transparent
      opacity={0.9}
    />
  )
  const repulsorGlow = (
    <meshStandardMaterial
      color="#38bdf8"
      emissive="#0284c7"
      emissiveIntensity={3.5}
      toneMapped={false}
    />
  )
  const thrusterGlow = (
    <meshStandardMaterial
      color="#38bdf8"
      emissive="#38bdf8"
      emissiveIntensity={4.8}
      toneMapped={false}
    />
  )

  return (
    <group position={[0, -0.2, 0]}>
      {/* Central Aerodynamic Fuselage */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.65, 0.38, 4.2]} />
        {hullMat}
      </mesh>

      {/* Swept-back Nose Cone */}
      <mesh position={[0, 0.42, -2.1]} rotation={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[1.35, 0.28, 0.8]} />
        {hullMat}
      </mesh>

      {/* Tinted Cockpit Bubble Canopy */}
      <mesh position={[0, 0.76, -0.1]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[1.22, 0.42, 2.1]} />
        {canopyGlass}
      </mesh>

      {/* Aerodynamic Side Sponsons / Winglets */}
      <mesh position={[-0.98, 0.38, 0]} rotation={[0, 0, 0.1]} castShadow>
        <boxGeometry args={[0.35, 0.18, 3.4]} />
        {darkAero}
      </mesh>
      <mesh position={[0.98, 0.38, 0]} rotation={[0, 0, -0.1]} castShadow>
        <boxGeometry args={[0.35, 0.18, 3.4]} />
        {darkAero}
      </mesh>

      {/* 4 Corner Antigravity Repulsor Emitters */}
      {/* Front Left Repulsor */}
      <group position={[-0.85, 0.15 + (wheelSuspensions[0] || 0), -1.35]} rotation={[0, steeringAngle * 0.5, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.06, 16, 24]} />
          {repulsorGlow}
        </mesh>
        <pointLight color="#38bdf8" intensity={2} distance={3} />
      </group>
      {/* Front Right Repulsor */}
      <group position={[0.85, 0.15 + (wheelSuspensions[1] || 0), -1.35]} rotation={[0, steeringAngle * 0.5, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.06, 16, 24]} />
          {repulsorGlow}
        </mesh>
        <pointLight color="#38bdf8" intensity={2} distance={3} />
      </group>
      {/* Rear Left Repulsor */}
      <group position={[-0.85, 0.15 + (wheelSuspensions[2] || 0), 1.35]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.28, 0.06, 16, 24]} />
          {repulsorGlow}
        </mesh>
        <pointLight color="#38bdf8" intensity={2} distance={3} />
      </group>
      {/* Rear Right Repulsor */}
      <group position={[0.85, 0.15 + (wheelSuspensions[3] || 0), 1.35]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.28, 0.06, 16, 24]} />
          {repulsorGlow}
        </mesh>
        <pointLight color="#38bdf8" intensity={2} distance={3} />
      </group>

      {/* Twin Rear Ion Thrusters */}
      <mesh position={[-0.42, 0.44, 2.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.35, 20]} />
        {darkAero}
      </mesh>
      <mesh position={[-0.42, 0.44, 2.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.08, 16]} />
        {thrusterGlow}
      </mesh>
      <mesh position={[0.42, 0.44, 2.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.35, 20]} />
        {darkAero}
      </mesh>
      <mesh position={[0.42, 0.44, 2.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.08, 16]} />
        {thrusterGlow}
      </mesh>

      {/* Twin Swept Vertical Stabilizer Fins */}
      <mesh position={[-0.68, 0.85, 1.7]} rotation={[0.1, 0, 0.25]} castShadow>
        <boxGeometry args={[0.04, 0.6, 0.8]} />
        {darkAero}
      </mesh>
      <mesh position={[0.68, 0.85, 1.7]} rotation={[0.1, 0, -0.25]} castShadow>
        <boxGeometry args={[0.04, 0.6, 0.8]} />
        {darkAero}
      </mesh>

      {/* Headlights with authentic forward projection */}
      {headlightsOn && <HeadlightBeams x={0.55} y={0.45} z={-2.4} color="#e0f2fe" intensity={60} />}
    </group>
  )
}

// ----------------------------------------------------
// 2. BMW M3 GTR '05 (Customizable Paint & Metal)
// ----------------------------------------------------
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
  const customPaint = (
    <meshStandardMaterial
      color={paintColor}
      metalness={metallic}
      roughness={roughness}
      envMapIntensity={1.4}
    />
  )
  const blueLivery = <meshStandardMaterial color="#1d4ed8" metalness={0.7} roughness={0.3} />
  const darkCarbon = <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.6} />
  const darkGlass = <meshPhysicalMaterial color="#0b1120" roughness={0.08} transmission={0.8} transparent opacity={0.92} />
  const polishedChrome = <meshStandardMaterial color="#f8fafc" metalness={0.98} roughness={0.05} />
  const tireRubber = <meshStandardMaterial color="#18181b" roughness={0.85} metalness={0.1} />
  const blueCaliper = <meshStandardMaterial color="#2563eb" metalness={0.6} roughness={0.3} />
  const repulsorGlow = <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={3.5} toneMapped={false} />
  const headlightBeam = (
    <meshStandardMaterial
      color={headlightsOn ? '#fef9c3' : '#94a3b8'}
      emissive={headlightsOn ? '#fef08a' : '#000000'}
      emissiveIntensity={headlightsOn ? 3.0 : 0}
    />
  )
  const taillightGlow = (
    <meshStandardMaterial
      color="#ef4444"
      emissive="#ef4444"
      emissiveIntensity={isBraking ? 4.5 : 0.9}
    />
  )

  const renderWheelOrRepulsor = (isFront: boolean, isLeft: boolean) => {
    if (isHoverMode) {
      return (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.1, 20]} />
            {repulsorGlow}
          </mesh>
          <pointLight color="#38bdf8" intensity={1.5} distance={2.5} />
        </group>
      )
    }

    return (
      <group rotation={[0, isFront ? steeringAngle : 0, 0]}>
        <group rotation={[wheelRotation, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.36, 0.36, 0.28, 26]} />
            {tireRubber}
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.27, 0.27, 0.29, 20]} />
            {polishedChrome}
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? 0.04 : -0.04, 0, 0]}>
            <cylinderGeometry args={[0.21, 0.21, 0.02, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.25} />
          </mesh>
          <mesh position={[isLeft ? 0.05 : -0.05, 0.13, 0]}>
            <boxGeometry args={[0.06, 0.11, 0.07]} />
            {blueCaliper}
          </mesh>
        </group>
      </group>
    )
  }

  return (
    <group position={[0, -0.38, 0]}>
      {/* Main Widebody Chassis */}
      <mesh position={[0, 0.44, 0]} castShadow>
        <boxGeometry args={[1.78, 0.42, 4.3]} />
        {customPaint}
      </mesh>

      {/* Iconic Racing Stripes */}
      <mesh position={[-0.17, 0.66, 0]} castShadow>
        <boxGeometry args={[0.16, 0.02, 4.28]} />
        {blueLivery}
      </mesh>
      <mesh position={[0.17, 0.66, 0]} castShadow>
        <boxGeometry args={[0.16, 0.02, 4.28]} />
        {blueLivery}
      </mesh>

      {/* Vented GTR Hood */}
      <mesh position={[0, 0.61, -1.25]} rotation={[0.07, 0, 0]} castShadow>
        <boxGeometry args={[1.68, 0.12, 1.48]} />
        {customPaint}
      </mesh>
      <mesh position={[-0.38, 0.67, -1.2]} rotation={[0.07, 0, 0.08]}>
        <boxGeometry args={[0.26, 0.03, 0.6]} />
        {darkCarbon}
      </mesh>
      <mesh position={[0.38, 0.67, -1.2]} rotation={[0.07, 0, -0.08]}>
        <boxGeometry args={[0.26, 0.03, 0.6]} />
        {darkCarbon}
      </mesh>

      {/* Cabin & Tinted Windows */}
      <mesh position={[0, 0.94, 0.15]} castShadow>
        <boxGeometry args={[1.44, 0.54, 1.96]} />
        {customPaint}
      </mesh>
      <mesh position={[0, 0.91, -0.88]} rotation={[0.62, 0, 0]}>
        <boxGeometry args={[1.4, 0.62, 0.06]} />
        {darkGlass}
      </mesh>
      <mesh position={[0, 0.94, 1.15]} rotation={[-0.6, 0, 0]}>
        <boxGeometry args={[1.36, 0.58, 0.06]} />
        {darkGlass}
      </mesh>
      <mesh position={[0.73, 0.93, 0.15]}>
        <boxGeometry args={[0.02, 0.46, 1.7]} />
        {darkGlass}
      </mesh>
      <mesh position={[-0.73, 0.93, 0.15]}>
        <boxGeometry args={[0.02, 0.46, 1.7]} />
        {darkGlass}
      </mesh>

      {/* Front Splitter & Kidney Grilles */}
      <mesh position={[0, 0.17, -2.24]} castShadow>
        <boxGeometry args={[1.88, 0.05, 0.36]} />
        {darkCarbon}
      </mesh>
      <mesh position={[-0.2, 0.46, -2.19]}>
        <boxGeometry args={[0.26, 0.18, 0.04]} />
        {darkCarbon}
      </mesh>
      <mesh position={[0.2, 0.46, -2.19]}>
        <boxGeometry args={[0.26, 0.18, 0.04]} />
        {darkCarbon}
      </mesh>

      {/* High-mount Rear GT Spoiler */}
      <mesh position={[-0.52, 0.94, 1.95]} rotation={[0.14, 0, 0]}>
        <boxGeometry args={[0.04, 0.42, 0.12]} />
        {darkCarbon}
      </mesh>
      <mesh position={[0.52, 0.94, 1.95]} rotation={[0.14, 0, 0]}>
        <boxGeometry args={[0.04, 0.42, 0.12]} />
        {darkCarbon}
      </mesh>
      <mesh position={[0, 1.14, 2.0]} rotation={[-0.07, 0, 0]} castShadow>
        <boxGeometry args={[1.74, 0.04, 0.38]} />
        {darkCarbon}
      </mesh>

      {/* Dual Chrome Exhaust Tips */}
      <mesh position={[-0.32, 0.22, 2.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.18, 16]} />
        {polishedChrome}
      </mesh>
      <mesh position={[0.32, 0.22, 2.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.18, 16]} />
        {polishedChrome}
      </mesh>

      {/* Headlights & Taillights */}
      <mesh position={[-0.64, 0.46, -2.16]}>
        <boxGeometry args={[0.38, 0.16, 0.06]} />
        {headlightBeam}
      </mesh>
      <mesh position={[0.64, 0.46, -2.16]}>
        <boxGeometry args={[0.38, 0.16, 0.06]} />
        {headlightBeam}
      </mesh>
      <mesh position={[-0.64, 0.54, 2.16]}>
        <boxGeometry args={[0.36, 0.16, 0.06]} />
        {taillightGlow}
      </mesh>
      <mesh position={[0.64, 0.54, 2.16]}>
        <boxGeometry args={[0.36, 0.16, 0.06]} />
        {taillightGlow}
      </mesh>

      {/* Authentic Forward Headlights */}
      {headlightsOn && <HeadlightBeams x={0.64} y={0.5} z={-2.2} color="#fffbeb" intensity={70} />}

      {/* 4 Corners with Independent Suspension */}
      <group position={[-0.88, 0.36 + (wheelSuspensions[0] || 0), -1.35]}>{renderWheelOrRepulsor(true, true)}</group>
      <group position={[0.88, 0.36 + (wheelSuspensions[1] || 0), -1.35]}>{renderWheelOrRepulsor(true, false)}</group>
      <group position={[-0.88, 0.36 + (wheelSuspensions[2] || 0), 1.35]}>{renderWheelOrRepulsor(false, true)}</group>
      <group position={[0.88, 0.36 + (wheelSuspensions[3] || 0), 1.35]}>{renderWheelOrRepulsor(false, false)}</group>
    </group>
  )
}

// ----------------------------------------------------
// 3. Cozy Camper Van
// ----------------------------------------------------
export function CamperVanModel({
  steeringAngle,
  wheelRotation,
  isBraking,
  headlightsOn,
  wheelSuspensions = [0, 0, 0, 0],
}: CarModelProps) {
  const sageMat = <meshStandardMaterial color="#3b694b" roughness={0.45} />
  const creamMat = <meshStandardMaterial color="#fef3c7" roughness={0.35} />
  const whiteMat = <meshStandardMaterial color="#f8fafc" roughness={0.3} />
  const chromeMat = <meshStandardMaterial color="#f1f5f9" metalness={0.96} roughness={0.08} />
  const glassMat = <meshPhysicalMaterial color="#38bdf8" roughness={0.08} transmission={0.82} transparent opacity={0.88} />
  const headlightMat = <meshStandardMaterial color={headlightsOn ? '#fef08a' : '#cbd5e1'} emissive={headlightsOn ? '#fef08a' : '#000'} emissiveIntensity={headlightsOn ? 2.8 : 0} />
  const taillightMat = <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={isBraking ? 4.2 : 0.8} />

  const renderVanWheel = (isFront: boolean, isLeft: boolean) => (
    <group rotation={[0, isFront ? steeringAngle : 0, 0]}>
      <group rotation={[wheelRotation, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.38, 0.38, 0.28, 24]} /><meshStandardMaterial color="#27272a" roughness={0.85} /></mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? -0.12 : 0.12, 0, 0]}><cylinderGeometry args={[0.32, 0.32, 0.02, 20]} />{whiteMat}</mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? -0.14 : 0.14, 0, 0]}><cylinderGeometry args={[0.22, 0.22, 0.04, 16]} />{chromeMat}</mesh>
      </group>
    </group>
  )

  return (
    <group position={[0, -0.35, 0]}>
      <mesh position={[0, 0.58, 0]} castShadow><boxGeometry args={[1.9, 0.65, 4.4]} />{sageMat}</mesh>
      <mesh position={[0, 1.25, -0.05]} castShadow><boxGeometry args={[1.86, 0.72, 4.2]} />{creamMat}</mesh>
      <mesh position={[0, 1.68, 0]} castShadow><boxGeometry args={[1.82, 0.2, 4.1]} />{creamMat}</mesh>
      <mesh position={[0, 1.84, 0.2]}><boxGeometry args={[1.5, 0.08, 2.4]} />{chromeMat}</mesh>
      <mesh position={[0.3, 1.96, 0.2]} rotation={[0, 0.1, 0.05]}><boxGeometry args={[0.42, 0.06, 2.2]} /><meshStandardMaterial color="#f97316" roughness={0.3} /></mesh>
      <mesh position={[-0.44, 1.28, -2.12]} rotation={[0.2, 0, 0]}><boxGeometry args={[0.78, 0.52, 0.06]} />{glassMat}</mesh>
      <mesh position={[0.44, 1.28, -2.12]} rotation={[0.2, 0, 0]}><boxGeometry args={[0.78, 0.52, 0.06]} />{glassMat}</mesh>
      <mesh position={[0.94, 1.28, 0]}><boxGeometry args={[0.02, 0.46, 3.4]} />{glassMat}</mesh>
      <mesh position={[-0.94, 1.28, 0]}><boxGeometry args={[0.02, 0.46, 3.4]} />{glassMat}</mesh>
      <mesh position={[0, 0.32, -2.25]}><boxGeometry args={[2.0, 0.14, 0.15]} />{chromeMat}</mesh>
      <mesh position={[-0.64, 0.72, -2.22]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.16, 0.16, 0.06, 16]} />{headlightMat}</mesh>
      <mesh position={[0.64, 0.72, -2.22]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.16, 0.16, 0.06, 16]} />{headlightMat}</mesh>
      <mesh position={[-0.68, 0.65, 2.21]}><boxGeometry args={[0.18, 0.22, 0.06]} />{taillightMat}</mesh>
      <mesh position={[0.68, 0.65, 2.21]}><boxGeometry args={[0.18, 0.22, 0.06]} />{taillightMat}</mesh>

      {headlightsOn && <HeadlightBeams x={0.64} y={0.75} z={-2.3} color="#fef3c7" intensity={55} />}

      <group position={[-0.92, 0.38 + (wheelSuspensions[0] || 0), -1.3]}>{renderVanWheel(true, true)}</group>
      <group position={[0.92, 0.38 + (wheelSuspensions[1] || 0), -1.3]}>{renderVanWheel(true, false)}</group>
      <group position={[-0.92, 0.38 + (wheelSuspensions[2] || 0), 1.3]}>{renderVanWheel(false, true)}</group>
      <group position={[0.92, 0.38 + (wheelSuspensions[3] || 0), 1.3]}>{renderVanWheel(false, false)}</group>
    </group>
  )
}

// ----------------------------------------------------
// 4. Vintage Rally Hatchback
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
  const redMat = <meshStandardMaterial color={paintColor} roughness={roughness} metalness={metallic} />
  const trimMat = <meshStandardMaterial color="#1e293b" roughness={0.7} />
  const whiteRimMat = <meshStandardMaterial color="#f8fafc" roughness={0.15} metalness={0.65} />
  const glassMat = <meshPhysicalMaterial color="#0284c7" roughness={0.08} transmission={0.78} transparent opacity={0.9} />
  const headlightMat = <meshStandardMaterial color={headlightsOn ? '#fef08a' : '#94a3b8'} emissive={headlightsOn ? '#fef08a' : '#000'} emissiveIntensity={headlightsOn ? 2.6 : 0} />
  const taillightMat = <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={isBraking ? 4.2 : 0.8} />

  const renderHatchWheel = (isFront: boolean, isLeft: boolean) => (
    <group rotation={[0, isFront ? steeringAngle : 0, 0]}>
      <group rotation={[wheelRotation, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.34, 0.34, 0.25, 22]} /><meshStandardMaterial color="#18181b" roughness={0.9} /></mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? -0.11 : 0.11, 0, 0]}><cylinderGeometry args={[0.23, 0.23, 0.05, 16]} />{whiteRimMat}</mesh>
      </group>
    </group>
  )

  return (
    <group position={[0, -0.38, 0]}>
      <mesh position={[0, 0.44, 0]} castShadow><boxGeometry args={[1.72, 0.44, 3.8]} />{redMat}</mesh>
      <mesh position={[0.87, 0.42, 0]}><boxGeometry args={[0.02, 0.08, 3.75]} />{trimMat}</mesh>
      <mesh position={[-0.87, 0.42, 0]}><boxGeometry args={[0.02, 0.08, 3.75]} />{trimMat}</mesh>
      <mesh position={[0, 0.86, -0.1]} castShadow><boxGeometry args={[1.52, 0.48, 2.1]} />{redMat}</mesh>
      <mesh position={[0, 0.85, -1.02]} rotation={[0.55, 0, 0]}> <boxGeometry args={[1.46, 0.52, 0.05]} />{glassMat}</mesh>
      <mesh position={[0, 0.85, 0.98]} rotation={[-0.6, 0, 0]}><boxGeometry args={[1.44, 0.54, 0.05]} />{glassMat}</mesh>
      <mesh position={[-0.62, 0.44, -1.92]}><boxGeometry args={[0.34, 0.18, 0.05]} />{headlightMat}</mesh>
      <mesh position={[0.62, 0.44, -1.92]}><boxGeometry args={[0.34, 0.18, 0.05]} />{headlightMat}</mesh>
      <mesh position={[-0.62, 0.48, 1.91]}><boxGeometry args={[0.34, 0.2, 0.05]} />{taillightMat}</mesh>
      <mesh position={[0.62, 0.48, 1.91]}><boxGeometry args={[0.34, 0.2, 0.05]} />{taillightMat}</mesh>

      {headlightsOn && <HeadlightBeams x={0.62} y={0.5} z={-2.0} color="#fff" intensity={55} />}

      <group position={[-0.84, 0.34 + (wheelSuspensions[0] || 0), -1.15]}>{renderHatchWheel(true, true)}</group>
      <group position={[0.84, 0.34 + (wheelSuspensions[1] || 0), -1.15]}>{renderHatchWheel(true, false)}</group>
      <group position={[-0.84, 0.34 + (wheelSuspensions[2] || 0), 1.15]}>{renderHatchWheel(false, true)}</group>
      <group position={[0.84, 0.34 + (wheelSuspensions[3] || 0), 1.15]}>{renderHatchWheel(false, false)}</group>
    </group>
  )
}

export function ActiveCarModel(props: CarModelProps) {
  switch (props.type) {
    case 'hovercraft':
      return <HovercraftModel {...props} />
    case 'bmw_m3':
      return <BmwM3GtrModel {...props} />
    case 'camper':
      return <CamperVanModel {...props} />
    case 'hatchback':
      return <VintageHatchbackModel {...props} />
    default:
      return <BmwM3GtrModel {...props} />
  }
}
