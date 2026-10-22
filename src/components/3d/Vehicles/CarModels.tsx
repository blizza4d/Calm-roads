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

// Reusable Forward Headlight Projector with realistic Three.js Target
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
    o.position.set(-x, y - 0.25, -45)
    return o
  }, [x, y])

  const targetRight = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(x, y - 0.25, -45)
    return o
  }, [x, y])

  return (
    <>
      <primitive object={targetLeft} />
      <primitive object={targetRight} />
      <spotLight
        position={[-x, y, z]}
        target={targetLeft}
        angle={0.55}
        penumbra={0.7}
        intensity={intensity}
        color={color}
        distance={85}
        castShadow
        shadow-bias={-0.0006}
      />
      <spotLight
        position={[x, y, z]}
        target={targetRight}
        angle={0.55}
        penumbra={0.7}
        intensity={intensity}
        color={color}
        distance={85}
        castShadow
        shadow-bias={-0.0006}
      />
    </>
  )
}

// ----------------------------------------------------
// 1. Realistic BMW M3 GTR '05 (Sculpted GT Widebody)
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
  // PBR Automotive Materials
  const bodyPaint = (
    <meshStandardMaterial
      color={paintColor}
      metalness={metallic}
      roughness={roughness}
      envMapIntensity={1.8}
    />
  )
  const iconicGtrBlue = (
    <meshStandardMaterial color="#1e40af" metalness={0.75} roughness={0.25} envMapIntensity={1.5} />
  )
  const carbonFiber = (
    <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.4} />
  )
  const matteTrim = (
    <meshStandardMaterial color="#18181b" metalness={0.2} roughness={0.75} />
  )
  const darkGlass = (
    <meshPhysicalMaterial
      color="#0f172a"
      roughness={0.06}
      transmission={0.82}
      transparent
      opacity={0.92}
      reflectivity={0.95}
    />
  )
  const polishedChrome = (
    <meshStandardMaterial color="#f8fafc" metalness={0.98} roughness={0.04} />
  )
  const exhaustTitanium = (
    <meshStandardMaterial color="#64748b" metalness={0.92} roughness={0.18} />
  )
  const tireRubber = (
    <meshStandardMaterial color="#18181b" roughness={0.92} metalness={0.08} />
  )
  const bremboBlue = (
    <meshStandardMaterial color="#2563eb" metalness={0.7} roughness={0.25} />
  )
  const brakeRotor = (
    <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.3} />
  )
  const repulsorGlow = (
    <meshStandardMaterial
      color="#38bdf8"
      emissive="#0284c7"
      emissiveIntensity={3.8}
      toneMapped={false}
    />
  )
  const projectorLens = (
    <meshStandardMaterial
      color={headlightsOn ? '#fef9c3' : '#cbd5e1'}
      emissive={headlightsOn ? '#fef08a' : '#000'}
      emissiveIntensity={headlightsOn ? 3.5 : 0}
      toneMapped={false}
    />
  )
  const angelEyeGlow = (
    <meshStandardMaterial
      color={headlightsOn ? '#60a5fa' : '#475569'}
      emissive={headlightsOn ? '#93c5fd' : '#000'}
      emissiveIntensity={headlightsOn ? 2.8 : 0}
      toneMapped={false}
    />
  )
  const taillightGlow = (
    <meshStandardMaterial
      color="#dc2626"
      emissive="#ef4444"
      emissiveIntensity={isBraking ? 4.8 : 1.2}
      toneMapped={false}
    />
  )

  // Realistic Wheel Assembly with BBS Cross-Spoke Rim, Brake Disc, and Caliper
  const renderWheelOrRepulsor = (isFront: boolean, isLeft: boolean) => {
    if (isHoverMode) {
      return (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.32, 0.32, 0.12, 24]} />
            {repulsorGlow}
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.34, 0.04, 16, 24]} />
            {carbonFiber}
          </mesh>
          <pointLight color="#38bdf8" intensity={1.8} distance={3} />
        </group>
      )
    }

    return (
      <group rotation={[0, isFront ? steeringAngle : 0, 0]}>
        <group rotation={[wheelRotation, 0, 0]}>
          {/* Treaded Tire */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.36, 0.36, 0.28, 28]} />
            {tireRubber}
          </mesh>
          {/* Wheel Rim Lip */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.27, 0.27, 0.29, 24]} />
            {polishedChrome}
          </mesh>
          {/* BBS Multi-Spoke Mesh Pattern */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? 0.05 : -0.05, 0, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.04, 18]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.88} roughness={0.15} />
          </mesh>
          {/* Center Hub Nut */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? 0.07 : -0.07, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.02, 12]} />
            {bremboBlue}
          </mesh>
          {/* Ventilated Brake Rotor */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? -0.02 : 0.02, 0, 0]}>
            <cylinderGeometry args={[0.21, 0.21, 0.02, 20]} />
            {brakeRotor}
          </mesh>
          {/* Performance Brake Caliper */}
          <mesh position={[isLeft ? 0.03 : -0.03, 0.13, 0]}>
            <boxGeometry args={[0.07, 0.12, 0.09]} />
            {bremboBlue}
          </mesh>
        </group>
      </group>
    )
  }

  return (
    <group position={[0, -0.38, 0]}>
      {/* 1. Main Lower Sculpted Body & Sills */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.76, 0.38, 4.28]} />
        {bodyPaint}
      </mesh>

      {/* 2. Iconic M3 GTR Blue Racing Livery Stripes */}
      <mesh position={[-0.18, 0.62, 0]} castShadow>
        <boxGeometry args={[0.16, 0.02, 4.26]} />
        {iconicGtrBlue}
      </mesh>
      <mesh position={[0.18, 0.62, 0]} castShadow>
        <boxGeometry args={[0.16, 0.02, 4.26]} />
        {iconicGtrBlue}
      </mesh>
      {/* Side Livery Slanted Accents */}
      <mesh position={[-0.89, 0.42, 0.3]} rotation={[0, 0, 0.22]}>
        <boxGeometry args={[0.02, 0.22, 1.8]} />
        {iconicGtrBlue}
      </mesh>
      <mesh position={[0.89, 0.42, 0.3]} rotation={[0, 0, -0.22]}>
        <boxGeometry args={[0.02, 0.22, 1.8]} />
        {iconicGtrBlue}
      </mesh>

      {/* 3. Blistered Widebody Wheel Arches (Front & Rear) */}
      <mesh position={[-0.92, 0.38, -1.35]} castShadow>
        <boxGeometry args={[0.12, 0.28, 0.95]} />
        {bodyPaint}
      </mesh>
      <mesh position={[0.92, 0.38, -1.35]} castShadow>
        <boxGeometry args={[0.12, 0.28, 0.95]} />
        {bodyPaint}
      </mesh>
      <mesh position={[-0.92, 0.38, 1.35]} castShadow>
        <boxGeometry args={[0.12, 0.28, 0.95]} />
        {bodyPaint}
      </mesh>
      <mesh position={[0.92, 0.38, 1.35]} castShadow>
        <boxGeometry args={[0.12, 0.28, 0.95]} />
        {bodyPaint}
      </mesh>

      {/* Aerodynamic Carbon Side Skirts */}
      <mesh position={[-0.91, 0.2, 0]}>
        <boxGeometry args={[0.08, 0.06, 2.1]} />
        {carbonFiber}
      </mesh>
      <mesh position={[0.91, 0.2, 0]}>
        <boxGeometry args={[0.08, 0.06, 2.1]} />
        {carbonFiber}
      </mesh>

      {/* 4. Sculpted Vented GTR Hood with Extractor Vents */}
      <mesh position={[0, 0.58, -1.26]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[1.66, 0.12, 1.5]} />
        {bodyPaint}
      </mesh>
      {/* Hood Center Bulge (Power Dome) */}
      <mesh position={[0, 0.65, -1.28]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[0.54, 0.04, 1.3]} />
        {bodyPaint}
      </mesh>
      {/* Dual Carbon Hood Heat Extractors */}
      <mesh position={[-0.38, 0.65, -1.2]} rotation={[0.08, 0, 0.08]}>
        <boxGeometry args={[0.26, 0.02, 0.58]} />
        {carbonFiber}
      </mesh>
      <mesh position={[0.38, 0.65, -1.2]} rotation={[0.08, 0, -0.08]}>
        <boxGeometry args={[0.26, 0.02, 0.58]} />
        {carbonFiber}
      </mesh>

      {/* 5. Aerodynamic Coupe Greenhouse Cabin & Raked Glass */}
      {/* Carbon Fiber Roof Panel */}
      <mesh position={[0, 1.18, 0.15]} castShadow>
        <boxGeometry args={[1.34, 0.06, 1.62]} />
        {carbonFiber}
      </mesh>
      {/* Raked Windshield (Front) */}
      <mesh position={[0, 0.93, -0.86]} rotation={[0.62, 0, 0]}>
        <boxGeometry args={[1.4, 0.64, 0.04]} />
        {darkGlass}
      </mesh>
      {/* Sloping Fastback Rear Window */}
      <mesh position={[0, 0.95, 1.12]} rotation={[-0.58, 0, 0]}>
        <boxGeometry args={[1.36, 0.6, 0.04]} />
        {darkGlass}
      </mesh>
      {/* Side Windows */}
      <mesh position={[0.7, 0.95, 0.15]}>
        <boxGeometry args={[0.02, 0.44, 1.64]} />
        {darkGlass}
      </mesh>
      <mesh position={[-0.7, 0.95, 0.15]}>
        <boxGeometry args={[0.02, 0.44, 1.64]} />
        {darkGlass}
      </mesh>
      {/* Aerodynamic Side Mirrors */}
      <group position={[-0.82, 0.88, -0.62]}>
        <mesh rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.16, 0.09, 0.22]} />
          {bodyPaint}
        </mesh>
        <mesh position={[0.08, 0, 0.02]}>
          <boxGeometry args={[0.02, 0.07, 0.18]} />
          {polishedChrome}
        </mesh>
      </group>
      <group position={[0.82, 0.88, -0.62]}>
        <mesh rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.16, 0.09, 0.22]} />
          {bodyPaint}
        </mesh>
        <mesh position={[-0.08, 0, 0.02]}>
          <boxGeometry args={[0.02, 0.07, 0.18]} />
          {polishedChrome}
        </mesh>
      </group>

      {/* 6. Aggressive Front Bumper, Kidney Grilles & Splitter */}
      <mesh position={[0, 0.38, -2.18]} castShadow>
        <boxGeometry args={[1.78, 0.36, 0.18]} />
        {bodyPaint}
      </mesh>
      {/* Lower Carbon Splitter with Endplates */}
      <mesh position={[0, 0.18, -2.26]} castShadow>
        <boxGeometry args={[1.88, 0.04, 0.38]} />
        {carbonFiber}
      </mesh>
      {/* Central Radiator Air Dam */}
      <mesh position={[0, 0.28, -2.22]}>
        <boxGeometry args={[0.88, 0.16, 0.05]} />
        {matteTrim}
      </mesh>
      {/* Iconic Dual Kidney Grilles */}
      <group position={[-0.22, 0.47, -2.21]}>
        <mesh>
          <boxGeometry args={[0.26, 0.18, 0.04]} />
          {matteTrim}
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.28, 0.2, 0.02]} />
          {polishedChrome}
        </mesh>
      </group>
      <group position={[0.22, 0.47, -2.21]}>
        <mesh>
          <boxGeometry args={[0.26, 0.18, 0.04]} />
          {matteTrim}
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.28, 0.2, 0.02]} />
          {polishedChrome}
        </mesh>
      </group>

      {/* Headlight Assemblies (Dual Projectors & Angel Eye Halos) */}
      <group position={[-0.64, 0.48, -2.2]}>
        <mesh>
          <boxGeometry args={[0.38, 0.16, 0.04]} />
          {matteTrim}
        </mesh>
        <mesh position={[-0.08, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.02, 16]} />
          {projectorLens}
        </mesh>
        <mesh position={[0.08, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.02, 16]} />
          {projectorLens}
        </mesh>
        {/* Halo Rings */}
        <mesh position={[-0.08, 0, 0.03]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.065, 0.012, 8, 16]} />
          {angelEyeGlow}
        </mesh>
        <mesh position={[0.08, 0, 0.03]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.065, 0.012, 8, 16]} />
          {angelEyeGlow}
        </mesh>
      </group>
      <group position={[0.64, 0.48, -2.2]}>
        <mesh>
          <boxGeometry args={[0.38, 0.16, 0.04]} />
          {matteTrim}
        </mesh>
        <mesh position={[-0.08, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.02, 16]} />
          {projectorLens}
        </mesh>
        <mesh position={[0.08, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.02, 16]} />
          {projectorLens}
        </mesh>
        {/* Halo Rings */}
        <mesh position={[-0.08, 0, 0.03]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.065, 0.012, 8, 16]} />
          {angelEyeGlow}
        </mesh>
        <mesh position={[0.08, 0, 0.03]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.065, 0.012, 8, 16]} />
          {angelEyeGlow}
        </mesh>
      </group>

      {/* 7. Rear Aerodynamics: High-Mount GT Wing, Diffuser & Roaring Quad Exhausts */}
      {/* Aluminum Wing Uprights */}
      <mesh position={[-0.52, 0.98, 1.95]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.03, 0.44, 0.12]} />
        {carbonFiber}
      </mesh>
      <mesh position={[0.52, 0.98, 1.95]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.03, 0.44, 0.12]} />
        {carbonFiber}
      </mesh>
      {/* High-Downforce Carbon Wing Blade with Aerodynamic Camber */}
      <mesh position={[0, 1.18, 2.0]} rotation={[-0.06, 0, 0]} castShadow>
        <boxGeometry args={[1.76, 0.04, 0.38]} />
        {carbonFiber}
      </mesh>
      {/* Wing Endplates */}
      <mesh position={[-0.88, 1.18, 2.0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.02, 0.22, 0.42]} />
        {carbonFiber}
      </mesh>
      <mesh position={[0.88, 1.18, 2.0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.02, 0.22, 0.42]} />
        {carbonFiber}
      </mesh>

      {/* Rear Bumper & Aerodynamic Diffuser Fins */}
      <mesh position={[0, 0.38, 2.15]} castShadow>
        <boxGeometry args={[1.76, 0.34, 0.16]} />
        {bodyPaint}
      </mesh>
      <mesh position={[0, 0.2, 2.18]}>
        <boxGeometry args={[1.44, 0.12, 0.24]} />
        {carbonFiber}
      </mesh>
      {/* Diffuser Vertical Strakes */}
      {[-0.45, -0.15, 0.15, 0.45].map((dx, i) => (
        <mesh key={i} position={[dx, 0.18, 2.22]}>
          <boxGeometry args={[0.02, 0.14, 0.2]} />
          {carbonFiber}
        </mesh>
      ))}

      {/* Visceral Dual-Side Quad Exhaust System with Hollow Dark Interiors */}
      {/* Left Dual Tips */}
      <group position={[-0.38, 0.22, 2.22]}>
        <mesh position={[-0.07, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.16, 16]} />
          {exhaustTitanium}
        </mesh>
        <mesh position={[-0.07, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.02, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh position={[0.07, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.16, 16]} />
          {exhaustTitanium}
        </mesh>
        <mesh position={[0.07, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.02, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>
      {/* Right Dual Tips */}
      <group position={[0.38, 0.22, 2.22]}>
        <mesh position={[-0.07, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.16, 16]} />
          {exhaustTitanium}
        </mesh>
        <mesh position={[-0.07, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.02, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh position={[0.07, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.16, 16]} />
          {exhaustTitanium}
        </mesh>
        <mesh position={[0.07, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.02, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>

      {/* Realistic Taillight Assemblies */}
      <mesh position={[-0.64, 0.54, 2.18]}>
        <boxGeometry args={[0.38, 0.16, 0.05]} />
        {taillightGlow}
      </mesh>
      <mesh position={[0.64, 0.54, 2.18]}>
        <boxGeometry args={[0.38, 0.16, 0.05]} />
        {taillightGlow}
      </mesh>

      {/* Dynamic Forward Headlights */}
      {headlightsOn && <HeadlightBeams x={0.64} y={0.5} z={-2.25} color="#fffbeb" intensity={72} />}

      {/* 4 Corners with Independent Suspension Tracking */}
      <group position={[-0.88, 0.36 + (wheelSuspensions[0] || 0), -1.35]}>
        {renderWheelOrRepulsor(true, true)}
      </group>
      <group position={[0.88, 0.36 + (wheelSuspensions[1] || 0), -1.35]}>
        {renderWheelOrRepulsor(true, false)}
      </group>
      <group position={[-0.88, 0.36 + (wheelSuspensions[2] || 0), 1.35]}>
        {renderWheelOrRepulsor(false, true)}
      </group>
      <group position={[0.88, 0.36 + (wheelSuspensions[3] || 0), 1.35]}>
        {renderWheelOrRepulsor(false, false)}
      </group>
    </group>
  )
}

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
      <group rotation={[wheelRotation, 0, 0]}>
        {/* Rubber Tire */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.38, 0.38, 0.28, 24]} />
          <meshStandardMaterial color="#27272a" roughness={0.88} />
        </mesh>
        {/* White-wall ring */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? 0.12 : -0.12, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.02, 22]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        {/* Chrome Baby Moon Dome Hubcap */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? 0.14 : -0.14, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 18]} />
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

      {headlightsOn && <HeadlightBeams x={0.64} y={0.75} z={-2.3} color="#fef3c7" intensity={58} />}

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

      {headlightsOn && <HeadlightBeams x={0.55} y={0.45} z={-2.4} color="#e0f2fe" intensity={65} />}
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
      <group rotation={[wheelRotation, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.34, 0.34, 0.25, 24]} />
          <meshStandardMaterial color="#18181b" roughness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[isLeft ? -0.11 : 0.11, 0, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.05, 18]} />
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

      {headlightsOn && <HeadlightBeams x={0.62} y={0.5} z={-2.0} color="#fff" intensity={58} />}

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
    case 'camper':
      return <CamperVanModel {...props} />
    case 'hatchback':
      return <VintageHatchbackModel {...props} />
    default:
      return <BmwM3GtrModel {...props} />
  }
}
