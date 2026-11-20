import { memo, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  WORLD_LANDMARKS,
} from '../../../utils/landmarks'
import {
  getRoadSplineSample,
  getSurfaceHeight,
} from '../../../utils/roadMath'

// ------------------------------------------------------------------------
// 1. Procedural Landmark Geometries & Shared Materials
// ------------------------------------------------------------------------

// Shared Materials
const stoneMat = new THREE.MeshStandardMaterial({
  color: '#475569',
  roughness: 0.92,
  metalness: 0.05,
})

const redTimberMat = new THREE.MeshStandardMaterial({
  color: '#991b1b', // Classic covered bridge barn red
  roughness: 0.85,
  metalness: 0.04,
})

const darkWoodMat = new THREE.MeshStandardMaterial({
  color: '#3b2f2f',
  roughness: 0.88,
  metalness: 0.02,
})

const snowRoofMat = new THREE.MeshStandardMaterial({
  color: '#e2e8f0',
  roughness: 0.72,
  metalness: 0.02,
})

const lighthouseWhiteMat = new THREE.MeshStandardMaterial({
  color: '#f8fafc',
  roughness: 0.45,
  metalness: 0.05,
})

const lighthouseRedMat = new THREE.MeshStandardMaterial({
  color: '#dc2626',
  roughness: 0.50,
  metalness: 0.05,
})

const sandstoneMat = new THREE.MeshStandardMaterial({
  color: '#c27823', // Terracotta sandstone
  roughness: 0.95,
  metalness: 0.02,
})

const turbineWhiteMat = new THREE.MeshStandardMaterial({
  color: '#f1f5f9',
  roughness: 0.35,
  metalness: 0.15,
})

const glowingWindowMat = new THREE.MeshBasicMaterial({
  color: '#fef08a',
})

// ------------------------------------------------------------------------
// Procedural Landmark 3D Components
// ------------------------------------------------------------------------

/**
 * 1. Coastal Lighthouse with 360° Rotating Spotlight Beam
 */
const LighthouseModel = memo(function LighthouseModel() {
  const beaconRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (beaconRef.current) {
      beaconRef.current.rotation.y += delta * 0.85
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Stone Foundation */}
      <mesh position={[0, 1.5, 0]} material={stoneMat}>
        <cylinderGeometry args={[4.2, 4.8, 3.0, 16]} />
      </mesh>
      {/* Lower White Section */}
      <mesh position={[0, 6.0, 0]} material={lighthouseWhiteMat}>
        <cylinderGeometry args={[3.4, 4.0, 6.0, 16]} />
      </mesh>
      {/* Mid Red Band */}
      <mesh position={[0, 11.0, 0]} material={lighthouseRedMat}>
        <cylinderGeometry args={[2.8, 3.4, 4.0, 16]} />
      </mesh>
      {/* Upper White Section */}
      <mesh position={[0, 15.5, 0]} material={lighthouseWhiteMat}>
        <cylinderGeometry args={[2.3, 2.8, 5.0, 16]} />
      </mesh>
      {/* Lantern Gallery Balcony */}
      <mesh position={[0, 18.2, 0]} material={stoneMat}>
        <cylinderGeometry args={[2.8, 2.8, 0.4, 16]} />
      </mesh>
      {/* Glass Lantern Room */}
      <mesh position={[0, 19.5, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 2.2, 12]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.65} roughness={0.1} />
      </mesh>
      {/* Lantern Dome Roof */}
      <mesh position={[0, 21.0, 0]} material={lighthouseRedMat}>
        <coneGeometry args={[2.3, 1.8, 16]} />
      </mesh>

      {/* Rotating Beacon Housing & Spotlight */}
      <group ref={beaconRef} position={[0, 19.5, 0]}>
        <spotLight
          position={[0, 0, 0.8]}
          target-position={[0, -2, 120]}
          color="#fef08a"
          intensity={45}
          distance={280}
          angle={Math.PI / 7}
          penumbra={0.4}
        />
        <pointLight position={[0, 0, 0]} color="#fef08a" intensity={8} distance={20} />
      </group>
    </group>
  )
})

/**
 * 2. Historic Timber Covered Bridge
 */
const CoveredBridgeModel = memo(function CoveredBridgeModel() {
  return (
    <group position={[0, 0, 0]}>
      {/* Stone Abutments / Foundation Piers */}
      <mesh position={[-6.5, 1.5, 0]} material={stoneMat}>
        <boxGeometry args={[3.2, 3.0, 16.0]} />
      </mesh>
      <mesh position={[6.5, 1.5, 0]} material={stoneMat}>
        <boxGeometry args={[3.2, 3.0, 16.0]} />
      </mesh>

      {/* Red Timber Side Walls */}
      <mesh position={[-5.8, 5.5, 0]} material={redTimberMat}>
        <boxGeometry args={[0.5, 5.0, 15.5]} />
      </mesh>
      <mesh position={[5.8, 5.5, 0]} material={redTimberMat}>
        <boxGeometry args={[0.5, 5.0, 15.5]} />
      </mesh>

      {/* Timber Overhead Crossbeams */}
      {[-6, -3, 0, 3, 6].map((z, idx) => (
        <mesh key={idx} position={[0, 7.8, z]} material={darkWoodMat}>
          <boxGeometry args={[12.2, 0.45, 0.45]} />
        </mesh>
      ))}

      {/* Pitched Cedar Shingle Roof */}
      <mesh position={[-3.1, 9.2, 0]} rotation={[0, 0, 0.42]} material={darkWoodMat}>
        <boxGeometry args={[6.8, 0.35, 16.5]} />
      </mesh>
      <mesh position={[3.1, 9.2, 0]} rotation={[0, 0, -0.42]} material={darkWoodMat}>
        <boxGeometry args={[6.8, 0.35, 16.5]} />
      </mesh>
    </group>
  )
})

/**
 * 3. Rustic Windmill with 4 Rotating Sail Blades
 */
const WindmillModel = memo(function WindmillModel() {
  const sailsRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (sailsRef.current) {
      sailsRef.current.rotation.z += delta * 0.95
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Octagonal Stone Base */}
      <mesh position={[0, 2.5, 0]} material={stoneMat}>
        <cylinderGeometry args={[3.8, 4.5, 5.0, 8]} />
      </mesh>
      {/* Tapered Timber Mill House */}
      <mesh position={[0, 8.5, 0]} material={darkWoodMat}>
        <cylinderGeometry args={[2.5, 3.8, 7.0, 8]} />
      </mesh>
      {/* Conical Roof Cap */}
      <mesh position={[0, 13.0, 0]} material={redTimberMat}>
        <coneGeometry args={[2.9, 3.2, 8]} />
      </mesh>

      {/* Horizontal Axle & Rotating 4-Blade Sails */}
      <group position={[0, 11.2, 2.8]}>
        {/* Axle Shaft */}
        <mesh rotation={[Math.PI / 2, 0, 0]} material={darkWoodMat}>
          <cylinderGeometry args={[0.22, 0.22, 1.2, 8]} />
        </mesh>
        {/* Hub and 4 Sails */}
        <group ref={sailsRef}>
          <mesh material={darkWoodMat}>
            <sphereGeometry args={[0.45, 12, 8]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
              {/* Spar */}
              <mesh position={[0, 4.2, 0]} material={darkWoodMat}>
                <boxGeometry args={[0.18, 8.2, 0.12]} />
              </mesh>
              {/* Canvas Sail Blade */}
              <mesh position={[0.55, 4.6, 0.05]} material={lighthouseWhiteMat}>
                <boxGeometry args={[1.0, 6.5, 0.04]} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  )
})

/**
 * 4. Alpine Pine Lodge / Cozy Winter Refuge
 */
const AlpineLodgeModel = memo(function AlpineLodgeModel() {
  return (
    <group position={[0, 0, 0]}>
      {/* Stone Foundation */}
      <mesh position={[0, 0.9, 0]} material={stoneMat}>
        <boxGeometry args={[9.5, 1.8, 8.5]} />
      </mesh>
      {/* Log Walls */}
      <mesh position={[0, 3.6, 0]} material={darkWoodMat}>
        <boxGeometry args={[9.0, 3.6, 8.0]} />
      </mesh>
      {/* Warm Glowing Windows */}
      <mesh position={[-4.55, 3.6, 0]} material={glowingWindowMat}>
        <boxGeometry args={[0.1, 1.2, 1.6]} />
      </mesh>
      <mesh position={[4.55, 3.6, 0]} material={glowingWindowMat}>
        <boxGeometry args={[0.1, 1.2, 1.6]} />
      </mesh>
      <mesh position={[0, 3.6, 4.05]} material={glowingWindowMat}>
        <boxGeometry args={[1.6, 1.2, 0.1]} />
      </mesh>
      {/* Pitched Heavy Snow Roof */}
      <mesh position={[-2.8, 6.2, 0]} rotation={[0, 0, 0.65]} material={snowRoofMat}>
        <boxGeometry args={[6.5, 0.55, 9.6]} />
      </mesh>
      <mesh position={[2.8, 6.2, 0]} rotation={[0, 0, -0.65]} material={snowRoofMat}>
        <boxGeometry args={[6.5, 0.55, 9.6]} />
      </mesh>
      {/* Stone Chimney */}
      <mesh position={[2.8, 6.8, -2.2]} material={stoneMat}>
        <boxGeometry args={[1.2, 4.5, 1.2]} />
      </mesh>
      {/* Chimney Glow */}
      <pointLight position={[0, 3.6, 4.5]} color="#fef08a" intensity={3} distance={15} />
    </group>
  )
})

/**
 * 5. Colossal Sandstone Natural Arch
 */
const SandstoneArchModel = memo(function SandstoneArchModel() {
  return (
    <group position={[0, 0, 0]}>
      {/* Left Pillar */}
      <mesh position={[-14.0, 12.0, 0]} rotation={[0, 0.3, 0.08]} material={sandstoneMat}>
        <cylinderGeometry args={[4.2, 6.8, 24.0, 12]} />
      </mesh>
      {/* Right Pillar */}
      <mesh position={[14.0, 11.5, 0]} rotation={[0, -0.4, -0.06]} material={sandstoneMat}>
        <cylinderGeometry args={[3.8, 6.2, 23.0, 12]} />
      </mesh>
      {/* Soaring Curved Arch Span */}
      <mesh position={[0, 24.5, 0]} rotation={[Math.PI / 2, 0, 0]} material={sandstoneMat}>
        <torusGeometry args={[14.0, 3.5, 12, 18, Math.PI]} />
      </mesh>
    </group>
  )
})

/**
 * 6. Scenic Vista Observation Pergola / Overlook Deck
 */
const ScenicLookoutModel = memo(function ScenicLookoutModel() {
  return (
    <group position={[0, 0, 0]}>
      {/* Foundation Deck Posts */}
      {[-3, 3].map((x) =>
        [-3, 3].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 1.6, z]} material={darkWoodMat}>
            <cylinderGeometry args={[0.2, 0.22, 3.2, 8]} />
          </mesh>
        ))
      )}
      {/* Wooden Deck Floor */}
      <mesh position={[0, 3.2, 0]} material={darkWoodMat}>
        <boxGeometry args={[7.5, 0.28, 7.5]} />
      </mesh>
      {/* Perimeter Safety Railings */}
      <mesh position={[0, 4.0, -3.6]} material={darkWoodMat}>
        <boxGeometry args={[7.2, 0.9, 0.12]} />
      </mesh>
      <mesh position={[-3.6, 4.0, 0]} material={darkWoodMat}>
        <boxGeometry args={[0.12, 0.9, 7.2]} />
      </mesh>
      <mesh position={[3.6, 4.0, 0]} material={darkWoodMat}>
        <boxGeometry args={[0.12, 0.9, 7.2]} />
      </mesh>
      {/* Pergola Roof Beams */}
      {[-2.5, -0.8, 0.8, 2.5].map((x, i) => (
        <mesh key={i} position={[x, 6.2, 0]} material={darkWoodMat}>
          <boxGeometry args={[0.18, 0.35, 7.6]} />
        </mesh>
      ))}
      {/* Brass Observation Telescope Stanchion */}
      <mesh position={[0, 4.2, -3.0]}>
        <cylinderGeometry args={[0.08, 0.14, 1.4, 8]} />
        <meshStandardMaterial color="#d97706" metalness={0.88} roughness={0.2} />
      </mesh>
    </group>
  )
})

/**
 * 7. Modern Prairie Wind Turbine (38m Tower + Spinning Blades)
 */
const WindTurbineModel = memo(function WindTurbineModel() {
  const rotorRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (rotorRef.current) {
      rotorRef.current.rotation.z += delta * 0.75
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Tapered White Monopole Mast */}
      <mesh position={[0, 18.0, 0]} material={turbineWhiteMat}>
        <cylinderGeometry args={[0.85, 2.2, 36.0, 16]} />
      </mesh>
      {/* Nacelle Generator Housing */}
      <mesh position={[0, 36.5, 0.4]} material={turbineWhiteMat}>
        <boxGeometry args={[1.8, 1.6, 4.5]} />
      </mesh>
      {/* Aviation Warning Strobe Light */}
      <pointLight position={[0, 37.8, 0]} color="#ef4444" intensity={2.5} distance={35} />

      {/* Hub & 3 Aerodynamic Rotor Blades */}
      <group position={[0, 36.5, 2.8]}>
        <group ref={rotorRef}>
          {/* Nose Cone */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={turbineWhiteMat}>
            <coneGeometry args={[0.75, 1.4, 16]} />
          </mesh>
          {/* 3 Blades at 120° intervals */}
          {[0, 1, 2].map((i) => (
            <group key={i} rotation={[0, 0, (i * (Math.PI * 2)) / 3]}>
              <mesh position={[0, 8.5, 0]} material={turbineWhiteMat}>
                <boxGeometry args={[0.55, 16.5, 0.15]} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  )
})

/**
 * 8. Highland Megalithic Wayfarer Shrine
 */
const HighlandCairnModel = memo(function HighlandCairnModel() {
  return (
    <group position={[0, 0, 0]}>
      {/* Stacked Granite Boulders */}
      <mesh position={[0, 1.2, 0]} material={stoneMat}>
        <dodecahedronGeometry args={[2.5, 1]} />
      </mesh>
      <mesh position={[0.2, 3.2, 0.1]} material={stoneMat}>
        <dodecahedronGeometry args={[1.8, 1]} />
      </mesh>
      <mesh position={[-0.1, 4.8, -0.1]} material={stoneMat}>
        <dodecahedronGeometry args={[1.2, 1]} />
      </mesh>
      {/* Upright Carved Granite Stele */}
      <mesh position={[0, 6.2, 0]} material={stoneMat}>
        <boxGeometry args={[0.75, 2.4, 0.45]} />
      </mesh>
    </group>
  )
})

// ------------------------------------------------------------------------
// Master Landmarks3D Component
// Positioned dynamically along highway based on WORLD_LANDMARKS definitions.
// ------------------------------------------------------------------------
export const Landmarks3D = memo(function Landmarks3D({ chunkZ }: { chunkZ: number }) {
  const CHUNK_LEN = 200

  // Filter landmarks falling within this chunk's Z range
  const activeLandmarks = useMemo(() => {
    const minZ = chunkZ - CHUNK_LEN / 2
    const maxZ = chunkZ + CHUNK_LEN / 2

    return WORLD_LANDMARKS.filter((lm) => {
      const z = -lm.targetZ // Travel direction is negative Z
      return z >= minZ && z <= maxZ
    }).map((lm) => {
      const worldZ = -lm.targetZ
      const sample = getRoadSplineSample(worldZ)
      const posX = sample.x + sample.rx * lm.lateralOffset * lm.side
      const posZ = (worldZ - chunkZ) + sample.rz * lm.lateralOffset * lm.side
      const groundY = getSurfaceHeight(posX, worldZ, lm.biome) + lm.elevationOffset
      const rotY = Math.atan2(sample.tx, -sample.tz)

      return {
        ...lm,
        worldPos: [posX, groundY, posZ] as [number, number, number],
        rotY,
      }
    })
  }, [chunkZ])

  if (activeLandmarks.length === 0) return null

  return (
    <group>
      {activeLandmarks.map((lm) => (
        <group key={lm.id} position={lm.worldPos} rotation={[0, lm.rotY, 0]}>
          {lm.type === 'lighthouse' && <LighthouseModel />}
          {lm.type === 'covered_bridge' && <CoveredBridgeModel />}
          {lm.type === 'windmill' && <WindmillModel />}
          {lm.type === 'alpine_lodge' && <AlpineLodgeModel />}
          {lm.type === 'sandstone_arch' && <SandstoneArchModel />}
          {lm.type === 'scenic_lookout' && <ScenicLookoutModel />}
          {lm.type === 'wind_turbine' && <WindTurbineModel />}
          {lm.type === 'highland_cairn' && <HighlandCairnModel />}
        </group>
      ))}
    </group>
  )
})
