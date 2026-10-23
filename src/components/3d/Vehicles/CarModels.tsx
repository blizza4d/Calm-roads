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
  // PBR Automotive Materials with Authentic Clearcoat & IBL Specular Highlights
  const bodyPaint = (
    <meshPhysicalMaterial
      color={paintColor || '#cbd5e1'}
      metalness={metallic ?? 0.82}
      roughness={roughness ?? 0.18}
      clearcoat={1.0}
      clearcoatRoughness={0.06}
      reflectivity={0.92}
      envMapIntensity={2.4}
    />
  )
  const iconicGtrBlue = (
    <meshPhysicalMaterial
      color="#1e40af"
      metalness={0.78}
      roughness={0.2}
      clearcoat={1.0}
      clearcoatRoughness={0.08}
      envMapIntensity={2.0}
    />
  )
  const carbonFiber = (
    <meshStandardMaterial color="#111827" metalness={0.65} roughness={0.35} />
  )
  const matteTrim = (
    <meshStandardMaterial color="#18181b" metalness={0.25} roughness={0.75} />
  )
  const darkGlass = (
    <meshPhysicalMaterial
      color="#0a0f1d"
      roughness={0.04}
      transmission={0.85}
      transparent
      opacity={0.94}
      reflectivity={0.98}
    />
  )
  const polishedChrome = (
    <meshStandardMaterial color="#f8fafc" metalness={0.98} roughness={0.04} envMapIntensity={2.2} />
  )
  const exhaustTitanium = (
    <meshStandardMaterial color="#475569" metalness={0.92} roughness={0.16} envMapIntensity={1.8} />
  )
  const burntTipBlue = (
    <meshStandardMaterial color="#2563eb" metalness={0.88} roughness={0.18} envMapIntensity={2.0} />
  )
  const tireRubber = (
    <meshStandardMaterial color="#1c1d22" roughness={0.92} metalness={0.06} />
  )
  const bremboBlue = (
    <meshStandardMaterial color="#1d4ed8" metalness={0.82} roughness={0.22} envMapIntensity={1.8} />
  )
  const brakeRotor = (
    <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.28} />
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
  // Split Taillight E46 Materials
  const taillightRed = (
    <meshStandardMaterial
      color="#991b1b"
      emissive="#ef4444"
      emissiveIntensity={isBraking ? 5.2 : 1.4}
      roughness={0.12}
      toneMapped={false}
    />
  )
  const taillightAmber = (
    <meshStandardMaterial
      color="#d97706"
      emissive="#f59e0b"
      emissiveIntensity={0.6}
      roughness={0.12}
      toneMapped={false}
    />
  )
  const taillightReverse = (
    <meshStandardMaterial
      color="#f8fafc"
      emissive="#e2e8f0"
      emissiveIntensity={0.4}
      roughness={0.12}
      toneMapped={false}
    />
  )
  const taillightLens = (
    <meshPhysicalMaterial
      color="#450a0a"
      roughness={0.05}
      transmission={0.65}
      transparent
      opacity={0.75}
      reflectivity={0.9}
    />
  )

  // Realistic Wheel Assembly with Deep Dish BBS Rim, Cross-Drilled Rotors, and Blue Brembos
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

    const sideMult = isLeft ? 1 : -1

    return (
      <group rotation={[0, isFront ? steeringAngle : 0, 0]}>
        <group rotation={[wheelRotation, 0, 0]}>
          {/* Low-Profile Performance Treaded Tire */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.36, 0.36, 0.28, 28]} />
            {tireRubber}
          </mesh>
          {/* Polished Stepped Chrome Deep-Dish Outer Barrel Lip */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[sideMult * 0.02, 0, 0]}>
            <cylinderGeometry args={[0.29, 0.29, 0.29, 28]} />
            {polishedChrome}
          </mesh>
          {/* Inverted Concave BBS Motorsport Wheel Center Face */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[sideMult * 0.08, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.04, 24]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.88} roughness={0.15} />
          </mesh>
          {/* Multi-Spoke Geometry Overlay (16 spoke radial mesh pattern) */}
          {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5].map((deg, idx) => (
            <mesh
              key={idx}
              rotation={[0, 0, (deg * Math.PI) / 180]}
              position={[sideMult * 0.10, 0, 0]}
            >
              <boxGeometry args={[0.02, 0.48, 0.025]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.14} />
            </mesh>
          ))}
          {/* Center Hub Nut with Blue BMW Motorsport Accent */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[sideMult * 0.12, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.025, 12]} />
            {bremboBlue}
          </mesh>
          {/* Cross-Drilled Ventilated Cast-Iron Brake Rotor */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[-sideMult * 0.02, 0, 0]}>
            <cylinderGeometry args={[0.23, 0.23, 0.022, 24]} />
            {brakeRotor}
          </mesh>
          {/* Brembo 6-Piston Performance Brake Caliper */}
          <mesh position={[sideMult * 0.02, 0.14, 0]}>
            <boxGeometry args={[0.075, 0.14, 0.095]} />
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

      {/* 2. Iconic M3 GTR Blue Racing Livery Stripes on Hood, Roof & Trunk */}
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

      {/* 3. Muscular Widebody Flares (Swollen GT Front & Rear Arches) */}
      {/* Front Widebody Arches */}
      <mesh position={[-0.94, 0.38, -1.35]} castShadow>
        <boxGeometry args={[0.16, 0.32, 1.05]} />
        {bodyPaint}
      </mesh>
      <mesh position={[0.94, 0.38, -1.35]} castShadow>
        <boxGeometry args={[0.16, 0.32, 1.05]} />
        {bodyPaint}
      </mesh>
      {/* Iconic Front Fender Side Gills with Chrome Slats & M Tricolor Badge */}
      <group position={[-0.96, 0.52, -0.92]}>
        <mesh>
          <boxGeometry args={[0.03, 0.12, 0.26]} />
          {matteTrim}
        </mesh>
        <mesh position={[-0.01, 0.02, 0]}>
          <boxGeometry args={[0.02, 0.015, 0.22]} />
          {polishedChrome}
        </mesh>
        <mesh position={[-0.01, -0.02, 0]}>
          <boxGeometry args={[0.02, 0.015, 0.22]} />
          {polishedChrome}
        </mesh>
      </group>
      <group position={[0.96, 0.52, -0.92]}>
        <mesh>
          <boxGeometry args={[0.03, 0.12, 0.26]} />
          {matteTrim}
        </mesh>
        <mesh position={[0.01, 0.02, 0]}>
          <boxGeometry args={[0.02, 0.015, 0.22]} />
          {polishedChrome}
        </mesh>
        <mesh position={[0.01, -0.02, 0]}>
          <boxGeometry args={[0.02, 0.015, 0.22]} />
          {polishedChrome}
        </mesh>
      </group>

      {/* Rear Widebody Haunches (Swollen Muscle Hips) */}
      <mesh position={[-0.96, 0.40, 1.35]} castShadow>
        <boxGeometry args={[0.18, 0.34, 1.15]} />
        {bodyPaint}
      </mesh>
      <mesh position={[0.96, 0.40, 1.35]} castShadow>
        <boxGeometry args={[0.18, 0.34, 1.15]} />
        {bodyPaint}
      </mesh>
      {/* Rear Wheel Arch Hot Air Extractor Vents (Classic E46 GTR cooling cutouts) */}
      <mesh position={[-0.94, 0.38, 1.88]}>
        <boxGeometry args={[0.04, 0.22, 0.12]} />
        {matteTrim}
      </mesh>
      <mesh position={[0.94, 0.38, 1.88]}>
        <boxGeometry args={[0.04, 0.22, 0.12]} />
        {matteTrim}
      </mesh>

      {/* Aerodynamic Carbon Side Skirts with Aero Winglets */}
      <mesh position={[-0.92, 0.2, 0]}>
        <boxGeometry args={[0.09, 0.06, 2.15]} />
        {carbonFiber}
      </mesh>
      <mesh position={[0.92, 0.2, 0]}>
        <boxGeometry args={[0.09, 0.06, 2.15]} />
        {carbonFiber}
      </mesh>

      {/* 4. Sculpted Vented GTR Hood with Power Dome & Louvers */}
      <mesh position={[0, 0.58, -1.26]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[1.68, 0.12, 1.5]} />
        {bodyPaint}
      </mesh>
      {/* Hood Center Bulge (Power Dome) */}
      <mesh position={[0, 0.66, -1.28]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[0.54, 0.05, 1.3]} />
        {bodyPaint}
      </mesh>
      {/* Dual Carbon Hood Heat Extractors (Louvers) */}
      <mesh position={[-0.38, 0.66, -1.2]} rotation={[0.08, 0, 0.08]}>
        <boxGeometry args={[0.26, 0.025, 0.58]} />
        {carbonFiber}
      </mesh>
      <mesh position={[0.38, 0.66, -1.2]} rotation={[0.08, 0, -0.08]}>
        <boxGeometry args={[0.26, 0.025, 0.58]} />
        {carbonFiber}
      </mesh>

      {/* 5. Coupe Greenhouse Cabin, Raked Glass & Pillars */}
      {/* Carbon Fiber Lightweight Roof Panel */}
      <mesh position={[0, 1.18, 0.15]} castShadow>
        <boxGeometry args={[1.34, 0.06, 1.65]} />
        {carbonFiber}
      </mesh>
      {/* A-Pillars, B-Pillars & C-Pillars */}
      <mesh position={[-0.68, 0.98, -0.68]} rotation={[0.58, 0, -0.1]}>
        <boxGeometry args={[0.06, 0.68, 0.06]} />
        {bodyPaint}
      </mesh>
      <mesh position={[0.68, 0.98, -0.68]} rotation={[0.58, 0, 0.1]}>
        <boxGeometry args={[0.06, 0.68, 0.06]} />
        {bodyPaint}
      </mesh>
      <mesh position={[-0.68, 0.98, 0.95]} rotation={[-0.54, 0, -0.1]}>
        <boxGeometry args={[0.06, 0.68, 0.06]} />
        {bodyPaint}
      </mesh>
      <mesh position={[0.68, 0.98, 0.95]} rotation={[-0.54, 0, 0.1]}>
        <boxGeometry args={[0.06, 0.68, 0.06]} />
        {bodyPaint}
      </mesh>

      {/* Raked Windshield (Front) */}
      <mesh position={[0, 0.93, -0.86]} rotation={[0.62, 0, 0]}>
        <boxGeometry args={[1.38, 0.64, 0.04]} />
        {darkGlass}
      </mesh>
      {/* Sloping Fastback Rear Window with Defroster Lines */}
      <mesh position={[0, 0.96, 1.12]} rotation={[-0.58, 0, 0]}>
        <boxGeometry args={[1.36, 0.62, 0.04]} />
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
      {/* Chrome Window Surround Line */}
      <mesh position={[0.71, 1.18, 0.15]}>
        <boxGeometry args={[0.015, 0.02, 1.68]} />
        {polishedChrome}
      </mesh>
      <mesh position={[-0.71, 1.18, 0.15]}>
        <boxGeometry args={[0.015, 0.02, 1.68]} />
        {polishedChrome}
      </mesh>

      {/* Aerodynamic M3 Side Mirrors */}
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
        <boxGeometry args={[1.90, 0.04, 0.38]} />
        {carbonFiber}
      </mesh>
      {/* Central Radiator Air Dam & Heat Exchanger Core */}
      <mesh position={[0, 0.28, -2.22]}>
        <boxGeometry args={[0.88, 0.16, 0.05]} />
        {matteTrim}
      </mesh>
      <mesh position={[0, 0.28, -2.20]}>
        <boxGeometry args={[0.84, 0.14, 0.015]} />
        <meshStandardMaterial color="#334155" metalness={0.88} roughness={0.35} />
      </mesh>
      {/* 4 Inner Wheel Arch Liners (Blocks see-through hollow chassis) */}
      <mesh position={[-0.88, 0.38, -1.35]}>
        <boxGeometry args={[0.04, 0.34, 0.96]} />
        {matteTrim}
      </mesh>
      <mesh position={[0.88, 0.38, -1.35]}>
        <boxGeometry args={[0.04, 0.34, 0.96]} />
        {matteTrim}
      </mesh>
      <mesh position={[-0.88, 0.38, 1.35]}>
        <boxGeometry args={[0.04, 0.34, 0.96]} />
        {matteTrim}
      </mesh>
      <mesh position={[0.88, 0.38, 1.35]}>
        <boxGeometry args={[0.04, 0.34, 0.96]} />
        {matteTrim}
      </mesh>

      {/* Iconic Dual Kidney Grilles with 3D Vertical Slats */}
      <group position={[-0.22, 0.47, -2.21]}>
        <mesh>
          <boxGeometry args={[0.26, 0.18, 0.04]} />
          {matteTrim}
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.28, 0.2, 0.02]} />
          {polishedChrome}
        </mesh>
        {[-0.08, -0.03, 0.03, 0.08].map((sx, k) => (
          <mesh key={k} position={[sx, 0, 0.022]}>
            <boxGeometry args={[0.014, 0.16, 0.012]} />
            {matteTrim}
          </mesh>
        ))}
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
        {[-0.08, -0.03, 0.03, 0.08].map((sx, k) => (
          <mesh key={k} position={[sx, 0, 0.022]}>
            <boxGeometry args={[0.014, 0.16, 0.012]} />
            {matteTrim}
          </mesh>
        ))}
      </group>
      {/* Front BMW Roundel Badge */}
      <mesh position={[0, 0.62, -2.19]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.015, 16]} />
        {bremboBlue}
      </mesh>

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
        <mesh position={[-0.08, 0, 0.03]}>
          <torusGeometry args={[0.065, 0.012, 8, 16]} />
          {angelEyeGlow}
        </mesh>
        <mesh position={[0.08, 0, 0.03]}>
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
        <mesh position={[-0.08, 0, 0.03]}>
          <torusGeometry args={[0.065, 0.012, 8, 16]} />
          {angelEyeGlow}
        </mesh>
        <mesh position={[0.08, 0, 0.03]}>
          <torusGeometry args={[0.065, 0.012, 8, 16]} />
          {angelEyeGlow}
        </mesh>
      </group>

      {/* 7. Sculpted Ducktail Trunk Lid, Badges & License Plate */}
      {/* Trunk Decklid Surface */}
      <mesh position={[0, 0.68, 1.76]} castShadow>
        <boxGeometry args={[1.56, 0.10, 0.72]} />
        {bodyPaint}
      </mesh>
      {/* Integrated Ducktail Kickup Lip Spoiler */}
      <mesh position={[0, 0.74, 2.10]} rotation={[0.18, 0, 0]} castShadow>
        <boxGeometry args={[1.60, 0.06, 0.14]} />
        {bodyPaint}
      </mesh>
      {/* BMW Roundel Trunk Emblem */}
      <mesh position={[0, 0.64, 2.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.015, 18]} />
        {bremboBlue}
      </mesh>
      <mesh position={[0, 0.64, 2.185]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.05, 0.008, 8, 18]} />
        {polishedChrome}
      </mesh>
      {/* Chrome "M3 GTR" Trunk Badge */}
      <mesh position={[0.48, 0.63, 2.18]}>
        <boxGeometry args={[0.18, 0.04, 0.015]} />
        {polishedChrome}
      </mesh>
      {/* Recessed License Plate Cavity */}
      <mesh position={[0, 0.44, 2.18]}>
        <boxGeometry args={[0.56, 0.18, 0.04]} />
        {matteTrim}
      </mesh>
      {/* Calm Roads German-Style Number Plate ("CR • 05 GTR") */}
      <group position={[0, 0.44, 2.205]}>
        <mesh>
          <boxGeometry args={[0.52, 0.14, 0.01]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
        {/* Blue EU Band on Left */}
        <mesh position={[-0.23, 0, 0.006]}>
          <boxGeometry args={[0.055, 0.13, 0.005]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.3} />
        </mesh>
        {/* Embossed Dark Plate Text Bar */}
        <mesh position={[0.02, 0, 0.006]}>
          <boxGeometry args={[0.38, 0.07, 0.005]} />
          <meshStandardMaterial color="#18181b" roughness={0.8} />
        </mesh>
      </group>

      {/* 8. Authentic E46 L-Shaped Split Taillights */}
      {/* Outer Taillight Units (Fender Cluster) */}
      <group position={[-0.72, 0.55, 2.16]}>
        {/* Upper Ruby Red Brake/Running Chamber */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.26, 0.08, 0.04]} />
          {taillightRed}
        </mesh>
        {/* Lower Amber Indicator Chamber */}
        <mesh position={[0, -0.04, 0]}>
          <boxGeometry args={[0.26, 0.07, 0.04]} />
          {taillightAmber}
        </mesh>
        {/* Crystal Smoked Lens Cover */}
        <mesh position={[0, 0, 0.022]}>
          <boxGeometry args={[0.27, 0.16, 0.01]} />
          {taillightLens}
        </mesh>
      </group>
      <group position={[0.72, 0.55, 2.16]}>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.26, 0.08, 0.04]} />
          {taillightRed}
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <boxGeometry args={[0.26, 0.07, 0.04]} />
          {taillightAmber}
        </mesh>
        <mesh position={[0, 0, 0.022]}>
          <boxGeometry args={[0.27, 0.16, 0.01]} />
          {taillightLens}
        </mesh>
      </group>

      {/* Inner Taillight Units (Trunk Decklid Cluster) */}
      <group position={[-0.42, 0.55, 2.17]}>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.22, 0.08, 0.03]} />
          {taillightRed}
        </mesh>
        {/* White Reverse Lamp Strip */}
        <mesh position={[0, -0.04, 0]}>
          <boxGeometry args={[0.22, 0.07, 0.03]} />
          {taillightReverse}
        </mesh>
        <mesh position={[0, 0, 0.018]}>
          <boxGeometry args={[0.23, 0.16, 0.01]} />
          {taillightLens}
        </mesh>
      </group>
      <group position={[0.42, 0.55, 2.17]}>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.22, 0.08, 0.03]} />
          {taillightRed}
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <boxGeometry args={[0.22, 0.07, 0.03]} />
          {taillightReverse}
        </mesh>
        <mesh position={[0, 0, 0.018]}>
          <boxGeometry args={[0.23, 0.16, 0.01]} />
          {taillightLens}
        </mesh>
      </group>

      {/* 9. Rear Aerodynamics: High-Downforce Carbon GT Wing */}
      {/* Solid Milled Aluminum Swan-Neck Wing Uprights */}
      <mesh position={[-0.50, 0.96, 1.96]} rotation={[0.14, 0, 0]} castShadow>
        <boxGeometry args={[0.04, 0.46, 0.14]} />
        <meshStandardMaterial color="#334155" metalness={0.92} roughness={0.2} />
      </mesh>
      <mesh position={[0.50, 0.96, 1.96]} rotation={[0.14, 0, 0]} castShadow>
        <boxGeometry args={[0.04, 0.46, 0.14]} />
        <meshStandardMaterial color="#334155" metalness={0.92} roughness={0.2} />
      </mesh>
      {/* High-Downforce Carbon Wing Blade with Aerodynamic Camber & Gurney Flap */}
      <mesh position={[0, 1.18, 2.02]} rotation={[-0.06, 0, 0]} castShadow>
        <boxGeometry args={[1.82, 0.04, 0.38]} />
        {carbonFiber}
      </mesh>
      {/* Rear Gurney Flap on Wing Trailing Edge */}
      <mesh position={[0, 1.21, 2.18]}>
        <boxGeometry args={[1.80, 0.025, 0.02]} />
        {carbonFiber}
      </mesh>
      {/* Aerodynamic Carbon Wing Endplates */}
      <mesh position={[-0.91, 1.18, 2.02]}>
        <boxGeometry args={[0.02, 0.24, 0.44]} />
        {carbonFiber}
      </mesh>
      <mesh position={[0.91, 1.18, 2.02]}>
        <boxGeometry args={[0.02, 0.24, 0.44]} />
        {carbonFiber}
      </mesh>

      {/* 10. Rear Bumper, Carbon Diffuser & Staggered Quad Titanium Exhaust */}
      <mesh position={[0, 0.38, 2.15]} castShadow>
        <boxGeometry args={[1.84, 0.34, 0.16]} />
        {bodyPaint}
      </mesh>
      {/* High-Downforce Carbon Fiber Rear Diffuser */}
      <mesh position={[0, 0.20, 2.18]}>
        <boxGeometry args={[1.56, 0.14, 0.26]} />
        {carbonFiber}
      </mesh>
      {/* 4 Vertical Diffuser Flow Strakes */}
      {[-0.52, -0.18, 0.18, 0.52].map((dx, i) => (
        <mesh key={i} position={[dx, 0.18, 2.24]}>
          <boxGeometry args={[0.025, 0.16, 0.24]} />
          {carbonFiber}
        </mesh>
      ))}
      {/* FIA-Style Center Rear Rain/Fog Light */}
      <mesh position={[0, 0.24, 2.28]}>
        <boxGeometry args={[0.08, 0.045, 0.02]} />
        {taillightRed}
      </mesh>

      {/* Staggered Quad Titanium Exhaust System */}
      {/* Left Pair */}
      <group position={[-0.38, 0.22, 2.24]}>
        {/* Outer Tip (larger) */}
        <mesh position={[-0.08, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.16, 18]} />
          {exhaustTitanium}
        </mesh>
        <mesh position={[-0.08, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.056, 0.056, 0.015, 18]} />
          {burntTipBlue}
        </mesh>
        <mesh position={[-0.08, 0, 0.085]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.044, 0.044, 0.02, 18]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* Inner Tip (slightly recessed) */}
        <mesh position={[0.06, -0.01, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.052, 0.052, 0.15, 18]} />
          {exhaustTitanium}
        </mesh>
        <mesh position={[0.06, -0.01, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.053, 0.053, 0.015, 18]} />
          {burntTipBlue}
        </mesh>
        <mesh position={[0.06, -0.01, 0.065]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.042, 0.042, 0.02, 18]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>

      {/* Right Pair */}
      <group position={[0.38, 0.22, 2.24]}>
        {/* Inner Tip (slightly recessed) */}
        <mesh position={[-0.06, -0.01, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.052, 0.052, 0.15, 18]} />
          {exhaustTitanium}
        </mesh>
        <mesh position={[-0.06, -0.01, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.053, 0.053, 0.015, 18]} />
          {burntTipBlue}
        </mesh>
        <mesh position={[-0.06, -0.01, 0.065]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.042, 0.042, 0.02, 18]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* Outer Tip */}
        <mesh position={[0.08, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.16, 18]} />
          {exhaustTitanium}
        </mesh>
        <mesh position={[0.08, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.056, 0.056, 0.015, 18]} />
          {burntTipBlue}
        </mesh>
        <mesh position={[0.08, 0, 0.085]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.044, 0.044, 0.02, 18]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>

      {/* Dynamic Forward Headlights */}
      {headlightsOn && <HeadlightBeams x={0.64} y={0.5} z={-2.25} color="#fffbeb" intensity={72} />}

      {/* 4 Corners with Independent Suspension Tracking */}
      <group position={[-0.92, 0.36 + (wheelSuspensions[0] || 0), -1.35]}>
        {renderWheelOrRepulsor(true, true)}
      </group>
      <group position={[0.92, 0.36 + (wheelSuspensions[1] || 0), -1.35]}>
        {renderWheelOrRepulsor(true, false)}
      </group>
      <group position={[-0.94, 0.36 + (wheelSuspensions[2] || 0), 1.35]}>
        {renderWheelOrRepulsor(false, true)}
      </group>
      <group position={[0.94, 0.36 + (wheelSuspensions[3] || 0), 1.35]}>
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
