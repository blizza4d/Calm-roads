import { memo, useMemo } from 'react'
import * as THREE from 'three'
import {
  getRoadSplineSample,
  ROAD_WIDTH,
  TUNNEL_ZONES,
} from '../../../utils/roadMath'

const CHUNK_LEN = 200

// Shared Materials for Tunnels
const tunnelLiningMat = new THREE.MeshStandardMaterial({
  color: '#334155', // Dark reinforced concrete lining
  roughness: 0.86,
  metalness: 0.12,
  side: THREE.DoubleSide,
})

const portalArchMat = new THREE.MeshStandardMaterial({
  color: '#1e293b', // Heavy stone masonry portal
  roughness: 0.92,
  metalness: 0.05,
})

const sodiumLampHousingMat = new THREE.MeshStandardMaterial({
  color: '#0f172a',
  roughness: 0.5,
  metalness: 0.6,
})

const sodiumLampBulbMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  emissive: new THREE.Color('#f59e0b'),
  emissiveIntensity: 3.8,
  roughness: 0.1,
  toneMapped: false,
})

export const Tunnels3D = memo(function Tunnels3D({ chunkZ }: { chunkZ: number }) {
  const minChunkZ = chunkZ - CHUNK_LEN
  const maxChunkZ = chunkZ

  // Find active tunnel zones intersecting this chunk
  const activeTunnels = useMemo(() => {
    return TUNNEL_ZONES.filter((t) => {
      const tMin = Math.min(t.startZ, t.endZ)
      const tMax = Math.max(t.startZ, t.endZ)
      return tMin <= maxChunkZ && tMax >= minChunkZ
    })
  }, [minChunkZ, maxChunkZ])

  if (activeTunnels.length === 0) return null

  return (
    <group position={[0, 0, 0]}>
      {activeTunnels.map((tunnel) => {
        const tMin = Math.min(tunnel.startZ, tunnel.endZ)
        const tMax = Math.max(tunnel.startZ, tunnel.endZ)

        // Clip tunnel interval to this chunk
        const startZ = Math.max(minChunkZ, tMin)
        const endZ = Math.min(maxChunkZ, tMax)
        const length = endZ - startZ
        if (length <= 2.0) return null

        // Sample along tunnel segment in 8-meter steps
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
        }> = []

        for (let i = 0; i <= sampleCount; i++) {
          const wz = startZ + (i / sampleCount) * length
          const s = getRoadSplineSample(wz)
          samples.push({
            x: s.x,
            y: s.y,
            z: wz,
            rx: s.rx,
            rz: s.rz,
            tx: s.tx,
            tz: s.tz,
            localZ: wz - chunkZ,
          })
        }

        // Check if tunnel entrance or exit falls within this chunk
        const hasEntrance = tMax >= minChunkZ && tMax <= maxChunkZ
        const hasExit = tMin >= minChunkZ && tMin <= maxChunkZ

        const entranceSample = hasEntrance ? getRoadSplineSample(tMax) : null
        const exitSample = hasExit ? getRoadSplineSample(tMin) : null

        // Sodium lamps spaced every 24m
        const lampSamples = samples.filter((_, idx) => idx % 3 === 0)

        return (
          <group key={tunnel.id}>
            {/* 1. Arched Concrete Tunnel Bore Segments */}
            {samples.slice(0, -1).map((s1, idx) => {
              const s2 = samples[idx + 1]
              const midX = (s1.x + s2.x) * 0.5
              const midY = (s1.y + s2.y) * 0.5
              const midZ = (s1.localZ + s2.localZ) * 0.5
              const dx = s2.x - s1.x
              const dz = s2.localZ - s1.localZ
              const segLen = Math.hypot(dx, dz)
              const angleY = Math.atan2(dx, -dz)

              return (
                <group key={idx} position={[midX, midY, midZ]} rotation={[0, angleY, 0]}>
                  {/* Left Vertical Tunnel Wall */}
                  <mesh position={[-ROAD_WIDTH * 0.5 - 0.75, 2.8, 0]} material={tunnelLiningMat}>
                    <boxGeometry args={[0.6, 5.6, segLen + 0.1]} />
                  </mesh>

                  {/* Right Vertical Tunnel Wall */}
                  <mesh position={[ROAD_WIDTH * 0.5 + 0.75, 2.8, 0]} material={tunnelLiningMat}>
                    <boxGeometry args={[0.6, 5.6, segLen + 0.1]} />
                  </mesh>

                  {/* Arched Semi-Cylindrical Vaulted Ceiling */}
                  <mesh position={[0, 4.8, 0]} rotation={[0, 0, Math.PI / 2]} material={tunnelLiningMat}>
                    <cylinderGeometry args={[ROAD_WIDTH * 0.5 + 0.8, ROAD_WIDTH * 0.5 + 0.8, segLen + 0.1, 16, 1, true, 0, Math.PI]} />
                  </mesh>
                </group>
              )
            })}

            {/* 2. Overhead Sodium Ceiling Strip Lamps with Downward Illumination */}
            {lampSamples.map((ls, lIdx) => {
              const rotY = Math.atan2(ls.tx, -ls.tz)
              return (
                <group key={`lamp-${lIdx}`} position={[ls.x, ls.y + 6.2, ls.localZ]} rotation={[0, rotY, 0]}>
                  {/* Steel Lamp Fixture Bracket */}
                  <mesh position={[0, 0.1, 0]} material={sodiumLampHousingMat}>
                    <boxGeometry args={[1.6, 0.22, 0.45]} />
                  </mesh>
                  {/* Glowing Amber Sodium Bulb */}
                  <mesh position={[0, 0, 0]} material={sodiumLampBulbMat}>
                    <boxGeometry args={[1.3, 0.1, 0.25]} />
                  </mesh>
                  {/* Downward Sodium Point Light */}
                  <pointLight
                    position={[0, -0.6, 0]}
                    color="#f59e0b"
                    intensity={4.2}
                    distance={18.0}
                    decay={2.0}
                  />
                </group>
              )
            })}

            {/* 3. Heavy Mountain Entrance Portal Arch */}
            {entranceSample && (
              <group
                position={[entranceSample.x, entranceSample.y, entranceSample.z - chunkZ]}
                rotation={[0, Math.atan2(entranceSample.tx, -entranceSample.tz), 0]}
              >
                {/* Left Masonry Portal Pier */}
                <mesh position={[-ROAD_WIDTH * 0.5 - 1.6, 3.8, 0]} material={portalArchMat}>
                  <boxGeometry args={[2.2, 7.8, 2.4]} />
                </mesh>
                {/* Right Masonry Portal Pier */}
                <mesh position={[ROAD_WIDTH * 0.5 + 1.6, 3.8, 0]} material={portalArchMat}>
                  <boxGeometry args={[2.2, 7.8, 2.4]} />
                </mesh>
                {/* Overhead Portal Crown Arch */}
                <mesh position={[0, 7.8, 0]} material={portalArchMat}>
                  <boxGeometry args={[ROAD_WIDTH + 5.4, 2.2, 2.6]} />
                </mesh>
              </group>
            )}

            {/* 4. Heavy Mountain Exit Portal Arch */}
            {exitSample && (
              <group
                position={[exitSample.x, exitSample.y, exitSample.z - chunkZ]}
                rotation={[0, Math.atan2(exitSample.tx, -exitSample.tz), 0]}
              >
                <mesh position={[-ROAD_WIDTH * 0.5 - 1.6, 3.8, 0]} material={portalArchMat}>
                  <boxGeometry args={[2.2, 7.8, 2.4]} />
                </mesh>
                <mesh position={[ROAD_WIDTH * 0.5 + 1.6, 3.8, 0]} material={portalArchMat}>
                  <boxGeometry args={[2.2, 7.8, 2.4]} />
                </mesh>
                <mesh position={[0, 7.8, 0]} material={portalArchMat}>
                  <boxGeometry args={[ROAD_WIDTH + 5.4, 2.2, 2.6]} />
                </mesh>
              </group>
            )}
          </group>
        )
      })}
    </group>
  )
})
