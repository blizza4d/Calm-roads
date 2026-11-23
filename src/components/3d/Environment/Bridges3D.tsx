import { memo, useMemo } from 'react'
import * as THREE from 'three'
import {
  getRoadSplineSample,
  ROAD_WIDTH,
  getTerrainHeight,
  BRIDGE_ZONES,
} from '../../../utils/roadMath'

const CHUNK_LEN = 200

// Shared Materials for Bridges
const concreteMat = new THREE.MeshStandardMaterial({
  color: '#94a3b8',
  roughness: 0.88,
  metalness: 0.08,
})

const bridgePillarMat = new THREE.MeshStandardMaterial({
  color: '#64748b',
  roughness: 0.92,
  metalness: 0.05,
})

const steelRailMat = new THREE.MeshStandardMaterial({
  color: '#cbd5e1',
  roughness: 0.35,
  metalness: 0.82,
})

const stoneArchMat = new THREE.MeshStandardMaterial({
  color: '#475569',
  roughness: 0.94,
  metalness: 0.02,
})

export const Bridges3D = memo(function Bridges3D({ chunkZ }: { chunkZ: number }) {
  const minChunkZ = chunkZ - CHUNK_LEN
  const maxChunkZ = chunkZ

  // Find if any bridge zone intersects this chunk
  const activeBridges = useMemo(() => {
    return BRIDGE_ZONES.filter((b) => {
      const bMin = Math.min(b.startZ, b.endZ)
      const bMax = Math.max(b.startZ, b.endZ)
      return bMin <= maxChunkZ && bMax >= minChunkZ
    })
  }, [minChunkZ, maxChunkZ])

  if (activeBridges.length === 0) return null

  return (
    <group position={[0, 0, 0]}>
      {activeBridges.map((bridge) => {
        const bMin = Math.min(bridge.startZ, bridge.endZ)
        const bMax = Math.max(bridge.startZ, bridge.endZ)

        // Clip bridge interval to this chunk
        const startZ = Math.max(minChunkZ, bMin)
        const endZ = Math.min(maxChunkZ, bMax)
        const length = endZ - startZ
        if (length <= 2.0) return null

        // Sample along the bridge segment in 10-meter steps
        const step = 8.0
        const sampleCount = Math.max(2, Math.ceil(length / step))
        const samples: Array<{
          x: number
          y: number
          z: number
          rx: number
          rz: number
          tx: number
          tz: number
          localZ: number
          groundY: number
        }> = []

        for (let i = 0; i <= sampleCount; i++) {
          const wz = startZ + (i / sampleCount) * length
          const s = getRoadSplineSample(wz)
          const groundY = getTerrainHeight(s.x, wz, 'forest')
          samples.push({
            x: s.x,
            y: s.y,
            z: wz,
            rx: s.rx,
            rz: s.rz,
            tx: s.tx,
            tz: s.tz,
            localZ: wz - chunkZ,
            groundY,
          })
        }

        // Bridge pier intervals every ~24m
        const pierSamples = samples.filter((_, idx) => idx > 0 && idx < samples.length - 1 && idx % 3 === 0)

        return (
          <group key={bridge.id}>
            {/* 1. Bridge Continuous Under-Deck Girder & Side Parapets */}
            {samples.slice(0, -1).map((s1, idx) => {
              const s2 = samples[idx + 1]
              const midX = (s1.x + s2.x) * 0.5
              const midY = (s1.y + s2.y) * 0.5
              const midZ = (s1.localZ + s2.localZ) * 0.5
              const dx = s2.x - s1.x
              const dz = s2.localZ - s1.localZ
              const segLen = Math.hypot(dx, dz)
              const angleY = Math.atan2(dx, -dz)

              const halfRoad = ROAD_WIDTH * 0.5 + 0.35

              return (
                <group key={idx} position={[midX, midY, midZ]} rotation={[0, angleY, 0]}>
                  {/* Reinforced Concrete Deck Slab Under Asphalt */}
                  <mesh position={[0, -0.45, 0]} material={bridge.bridgeType === 'stone' ? stoneArchMat : concreteMat}>
                    <boxGeometry args={[ROAD_WIDTH + 1.2, 0.7, segLen + 0.1]} />
                  </mesh>

                  {/* Left Concrete Parapet Barrier Wall */}
                  <mesh position={[-halfRoad, 0.45, 0]} material={bridge.bridgeType === 'stone' ? stoneArchMat : concreteMat}>
                    <boxGeometry args={[0.38, 0.95, segLen + 0.1]} />
                  </mesh>
                  {/* Left Galvanized Top Safety Handrail */}
                  <mesh position={[-halfRoad, 0.95, 0]} material={steelRailMat}>
                    <boxGeometry args={[0.12, 0.08, segLen + 0.1]} />
                  </mesh>

                  {/* Right Concrete Parapet Barrier Wall */}
                  <mesh position={[halfRoad, 0.45, 0]} material={bridge.bridgeType === 'stone' ? stoneArchMat : concreteMat}>
                    <boxGeometry args={[0.38, 0.95, segLen + 0.1]} />
                  </mesh>
                  {/* Right Galvanized Top Safety Handrail */}
                  <mesh position={[halfRoad, 0.95, 0]} material={steelRailMat}>
                    <boxGeometry args={[0.12, 0.08, segLen + 0.1]} />
                  </mesh>
                </group>
              )
            })}

            {/* 2. Deep Structural Piers / Columns Down to Canyon / Water Floor */}
            {pierSamples.map((ps, pIdx) => {
              const dropDistance = Math.max(4.0, (ps.y - 0.75) - ps.groundY)
              const pillarCenterY = ps.y - 0.75 - dropDistance * 0.5
              const rotY = Math.atan2(ps.tx, -ps.tz)

              return (
                <group key={`pier-${pIdx}`} position={[ps.x, 0, ps.localZ]} rotation={[0, rotY, 0]}>
                  {/* Left Pillar Column */}
                  <mesh position={[-ROAD_WIDTH * 0.35, pillarCenterY, 0]} material={bridgePillarMat}>
                    <cylinderGeometry args={[1.1, 1.4, dropDistance, 12]} />
                  </mesh>
                  {/* Left Footing Plinth */}
                  <mesh position={[-ROAD_WIDTH * 0.35, ps.groundY + 0.5, 0]} material={stoneArchMat}>
                    <boxGeometry args={[3.2, 1.2, 3.2]} />
                  </mesh>

                  {/* Right Pillar Column */}
                  <mesh position={[ROAD_WIDTH * 0.35, pillarCenterY, 0]} material={bridgePillarMat}>
                    <cylinderGeometry args={[1.1, 1.4, dropDistance, 12]} />
                  </mesh>
                  {/* Right Footing Plinth */}
                  <mesh position={[ROAD_WIDTH * 0.35, ps.groundY + 0.5, 0]} material={stoneArchMat}>
                    <boxGeometry args={[3.2, 1.2, 3.2]} />
                  </mesh>

                  {/* Crossbeam Cap Joining the Columns */}
                  <mesh position={[0, ps.y - 1.1, 0]} material={concreteMat}>
                    <boxGeometry args={[ROAD_WIDTH + 0.8, 0.85, 2.2]} />
                  </mesh>
                </group>
              )
            })}

            {/* 3. Suspension Bridge A-Frame Towers & Stay Cables (for suspension type) */}
            {bridge.bridgeType === 'suspension' && pierSamples.length > 0 && (
              <group position={[pierSamples[0].x, pierSamples[0].y, pierSamples[0].localZ]}>
                {/* Left Tower Mast */}
                <mesh position={[-ROAD_WIDTH * 0.5 - 0.6, 9.5, 0]} material={steelRailMat}>
                  <cylinderGeometry args={[0.5, 0.8, 20.0, 8]} />
                </mesh>
                {/* Right Tower Mast */}
                <mesh position={[ROAD_WIDTH * 0.5 + 0.6, 9.5, 0]} material={steelRailMat}>
                  <cylinderGeometry args={[0.5, 0.8, 20.0, 8]} />
                </mesh>
                {/* Tower Overhead Arch Crossbeam */}
                <mesh position={[0, 18.5, 0]} material={steelRailMat}>
                  <boxGeometry args={[ROAD_WIDTH + 2.4, 0.9, 1.2]} />
                </mesh>
              </group>
            )}
          </group>
        )
      })}
    </group>
  )
})
