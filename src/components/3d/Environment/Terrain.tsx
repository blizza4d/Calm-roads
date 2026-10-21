import { useMemo, useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../../store/useGameStore'
import {
  getRoadCenter,
  getRoadElevation,
  getRoadTangent,
  getTerrainHeight,
  ROAD_WIDTH,
  getActiveBiomeAt,
  BiomeConfig,
} from '../../../utils/roadMath'

const CHUNK_LEN = 200
const TERRAIN_W = 280
const GRID_X = 56
const GRID_Z = 36

interface ChunkProps {
  chunkZ: number
  biomeConfig: BiomeConfig
  isRaining: boolean
}

// Single Procedural Infinite Chunk Tile containing:
// 1. Terrain Mesh (Simplex noise rolling hills)
// 2. Continuous Curved Highway Ribbon with true perpendicular width
// 3. Highway Markings: Yellow Dashed Centerline + Dual Solid White Edge Lines
// 4. Roadside Gravel Shoulder Strips
// 5. Biome-Specific Instanced Scenery (Pines, Maples, Cacti, Boulders, Poles)
function TerrainChunkTile({ chunkZ, biomeConfig, isRaining }: ChunkProps) {
  // 1. Terrain Ground Mesh Geometry
  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(TERRAIN_W, CHUNK_LEN, GRID_X, GRID_Z)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const localX = pos.getX(i)
      const localZ = pos.getZ(i)
      const worldZ = chunkZ + localZ
      const y = getTerrainHeight(localX, worldZ, biomeConfig.id)
      pos.setY(i, y)
    }

    geo.computeVertexNormals()
    return geo
  }, [chunkZ, biomeConfig.id])

  // 2. Curved Asphalt Highway Ribbon Geometry (uniform width calculated via curve normals)
  const roadGeo = useMemo(() => {
    const segments = 44 // Every ~4.5m along the 200m chunk
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    const halfW = ROAD_WIDTH / 2

    for (let i = 0; i <= segments; i++) {
      const localZ = CHUNK_LEN / 2 - (i / segments) * CHUNK_LEN
      const worldZ = chunkZ + localZ
      const cx = getRoadCenter(worldZ)
      const cy = getRoadElevation(worldZ) + 0.045
      const { nx, nz } = getRoadTangent(worldZ)

      // Left road edge
      positions.push(cx - nx * halfW, cy, localZ - nz * halfW)
      normals.push(0, 1, 0)
      uvs.push(0, i * 0.8)

      // Right road edge
      positions.push(cx + nx * halfW, cy, localZ + nz * halfW)
      normals.push(0, 1, 0)
      uvs.push(1, i * 0.8)

      if (i < segments) {
        const v1 = i * 2
        const v2 = i * 2 + 1
        const v3 = (i + 1) * 2
        const v4 = (i + 1) * 2 + 1

        indices.push(v1, v2, v3)
        indices.push(v2, v4, v3)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [chunkZ])

  // 3. Roadside Gravel / Dirt Shoulder Strips
  const shoulderGeo = useMemo(() => {
    const segments = 24
    const positions: number[] = []
    const normals: number[] = []
    const indices: number[] = []

    const innerW = ROAD_WIDTH / 2
    const outerW = ROAD_WIDTH / 2 + 1.8

    for (let i = 0; i <= segments; i++) {
      const localZ = CHUNK_LEN / 2 - (i / segments) * CHUNK_LEN
      const worldZ = chunkZ + localZ
      const cx = getRoadCenter(worldZ)
      const cy = getRoadElevation(worldZ) + 0.02
      const { nx, nz } = getRoadTangent(worldZ)

      // Left shoulder (inner to outer)
      positions.push(cx - nx * innerW, cy, localZ - nz * innerW)
      positions.push(cx - nx * outerW, cy - 0.02, localZ - nz * outerW)

      // Right shoulder (inner to outer)
      positions.push(cx + nx * innerW, cy, localZ + nz * innerW)
      positions.push(cx + nx * outerW, cy - 0.02, localZ + nz * outerW)

      for (let j = 0; j < 4; j++) normals.push(0, 1, 0)

      if (i < segments) {
        const base = i * 4
        // Left strip
        indices.push(base, base + 1, base + 4)
        indices.push(base + 1, base + 5, base + 4)
        // Right strip
        indices.push(base + 2, base + 6, base + 3)
        indices.push(base + 3, base + 6, base + 7)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [chunkZ])

  // 4. Highway Markings: Yellow Dashed Centerline + White Solid Outer Edge Lines
  const markingsGeo = useMemo(() => {
    const positions: number[] = []
    const normals: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    let vertCount = 0

    // A. Yellow Dashed Centerline
    const dashSpacing = 14
    const dashLen = 7.0
    const halfLineW = 0.14
    const numDashes = Math.floor(CHUNK_LEN / dashSpacing)

    for (let i = 0; i < numDashes; i++) {
      const localZCenter = CHUNK_LEN / 2 - (i * dashSpacing + dashSpacing * 0.5)
      const localZStart = localZCenter + dashLen / 2
      const localZEnd = localZCenter - dashLen / 2

      const wzStart = chunkZ + localZStart
      const wzEnd = chunkZ + localZEnd

      const cxStart = getRoadCenter(wzStart)
      const cyStart = getRoadElevation(wzStart) + 0.065
      const cxEnd = getRoadCenter(wzEnd)
      const cyEnd = getRoadElevation(wzEnd) + 0.065

      const tanStart = getRoadTangent(wzStart)
      const tanEnd = getRoadTangent(wzEnd)

      // Centerline quads (Yellow)
      positions.push(cxStart - tanStart.nx * halfLineW, cyStart, localZStart - tanStart.nz * halfLineW)
      positions.push(cxStart + tanStart.nx * halfLineW, cyStart, localZStart + tanStart.nz * halfLineW)
      positions.push(cxEnd - tanEnd.nx * halfLineW, cyEnd, localZEnd - tanEnd.nz * halfLineW)
      positions.push(cxEnd + tanEnd.nx * halfLineW, cyEnd, localZEnd + tanEnd.nz * halfLineW)

      for (let j = 0; j < 4; j++) {
        normals.push(0, 1, 0)
        colors.push(0.98, 0.8, 0.08) // Yellow
      }

      indices.push(vertCount, vertCount + 1, vertCount + 2)
      indices.push(vertCount + 1, vertCount + 3, vertCount + 2)
      vertCount += 4
    }

    // B. Solid White Outer Edge Boundary Lines
    const edgeOffset = ROAD_WIDTH / 2 - 0.45
    const edgeHalfW = 0.1
    const edgeSegments = 30

    for (let i = 0; i <= edgeSegments; i++) {
      const localZ = CHUNK_LEN / 2 - (i / edgeSegments) * CHUNK_LEN
      const worldZ = chunkZ + localZ
      const cx = getRoadCenter(worldZ)
      const cy = getRoadElevation(worldZ) + 0.065
      const { nx, nz } = getRoadTangent(worldZ)

      // Left solid white edge
      const lx = cx - nx * edgeOffset
      const lz = localZ - nz * edgeOffset
      positions.push(lx - nx * edgeHalfW, cy, lz - nz * edgeHalfW)
      positions.push(lx + nx * edgeHalfW, cy, lz + nz * edgeHalfW)

      // Right solid white edge
      const rx = cx + nx * edgeOffset
      const rz = localZ + nz * edgeOffset
      positions.push(rx - nx * edgeHalfW, cy, rz - nz * edgeHalfW)
      positions.push(rx + nx * edgeHalfW, cy, rz + nz * edgeHalfW)

      for (let j = 0; j < 4; j++) {
        normals.push(0, 1, 0)
        colors.push(0.95, 0.96, 0.98) // White
      }

      if (i < edgeSegments) {
        const base = vertCount + i * 4
        // Left edge quad
        indices.push(base, base + 1, base + 4)
        indices.push(base + 1, base + 5, base + 4)
        // Right edge quad
        indices.push(base + 2, base + 6, base + 3)
        indices.push(base + 3, base + 6, base + 7)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.setIndex(indices)
    return geo
  }, [chunkZ])

  // 5. Deterministic Roadside Scenery (Trees, Cacti, Rocks, Poles)
  const sceneryData = useMemo(() => {
    const trees: { pos: [number, number, number]; scale: number }[] = []
    const rocks: { pos: [number, number, number]; scale: number; rot: number }[] = []
    const poles: { pos: [number, number, number] }[] = []

    const step = 16
    for (let localZ = -CHUNK_LEN / 2 + 10; localZ <= CHUNK_LEN / 2 - 10; localZ += step) {
      const worldZ = chunkZ + localZ
      const roadCx = getRoadCenter(worldZ)

      // Deterministic hashes based on integer worldZ
      const h1 = Math.abs(Math.sin(worldZ * 12.9898 + 78.233))
      const h2 = Math.abs(Math.sin(worldZ * 43.123 + 19.827))
      const h3 = Math.abs(Math.sin(worldZ * 91.827 + 34.129))

      // Left Flora / Cacti
      const leftDist = ROAD_WIDTH / 2 + 5.2 + h1 * 46
      const leftX = roadCx - leftDist
      const leftY = getTerrainHeight(leftX, worldZ, biomeConfig.id)
      trees.push({ pos: [leftX, leftY, localZ], scale: 0.85 + h2 * 0.65 })

      // Right Flora / Cacti
      const rightDist = ROAD_WIDTH / 2 + 5.2 + h2 * 46
      const rightX = roadCx + rightDist
      const rightY = getTerrainHeight(rightX, worldZ, biomeConfig.id)
      trees.push({ pos: [rightX, rightY, localZ], scale: 0.85 + h1 * 0.65 })

      // Scattered Boulders / Rocks
      if (h3 > 0.44) {
        const rockSide = h1 > 0.5 ? 1 : -1
        const rockDist = ROAD_WIDTH / 2 + 4.5 + h2 * 30
        const rockX = roadCx + rockSide * rockDist
        const rockY = getTerrainHeight(rockX, worldZ, biomeConfig.id)
        rocks.push({
          pos: [rockX, rockY, localZ],
          scale: 0.7 + h3 * 1.25,
          rot: h1 * Math.PI * 2,
        })
      }

      // Utility Poles along right shoulder every ~32m
      if (Math.abs(Math.floor(worldZ / 32) * 32 - worldZ) < 8) {
        const poleX = roadCx + (ROAD_WIDTH / 2 + 2.8)
        const poleY = getRoadElevation(worldZ)
        poles.push({ pos: [poleX, poleY, localZ] })
      }
    }

    return { trees, rocks, poles }
  }, [chunkZ, biomeConfig.id])

  // Instanced Meshes for Props
  const treeTrunkRef = useRef<THREE.InstancedMesh>(null)
  const treeFoliageRef = useRef<THREE.InstancedMesh>(null)
  const rockRef = useRef<THREE.InstancedMesh>(null)
  const poleRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const dummy = new THREE.Object3D()

    if (treeTrunkRef.current && treeFoliageRef.current) {
      sceneryData.trees.forEach((t, i) => {
        dummy.position.set(t.pos[0], t.pos[1] + 1.3 * t.scale, t.pos[2])
        dummy.scale.set(t.scale, t.scale, t.scale)
        dummy.rotation.set(0, (t.scale * 10) % Math.PI, 0)
        dummy.updateMatrix()
        treeTrunkRef.current?.setMatrixAt(i, dummy.matrix)

        dummy.position.set(t.pos[0], t.pos[1] + 3.4 * t.scale, t.pos[2])
        dummy.scale.set(t.scale, t.scale, t.scale)
        dummy.updateMatrix()
        treeFoliageRef.current?.setMatrixAt(i, dummy.matrix)
      })
      treeTrunkRef.current.instanceMatrix.needsUpdate = true
      treeFoliageRef.current.instanceMatrix.needsUpdate = true
    }

    if (rockRef.current) {
      sceneryData.rocks.forEach((r, i) => {
        dummy.position.set(r.pos[0], r.pos[1] + 0.5 * r.scale, r.pos[2])
        dummy.scale.set(r.scale, r.scale * 0.75, r.scale)
        dummy.rotation.set(0, r.rot, r.rot * 0.35)
        dummy.updateMatrix()
        rockRef.current?.setMatrixAt(i, dummy.matrix)
      })
      rockRef.current.instanceMatrix.needsUpdate = true
    }

    if (poleRef.current) {
      sceneryData.poles.forEach((p, i) => {
        dummy.position.set(p.pos[0], p.pos[1] + 3.2, p.pos[2])
        dummy.scale.set(1, 1, 1)
        dummy.rotation.set(0, 0, 0)
        dummy.updateMatrix()
        poleRef.current?.setMatrixAt(i, dummy.matrix)
      })
      poleRef.current.instanceMatrix.needsUpdate = true
    }
  }, [sceneryData])

  // Strict Three.js Memory Cleanup on unmount
  useEffect(() => {
    return () => {
      terrainGeo.dispose()
      roadGeo.dispose()
      shoulderGeo.dispose()
      markingsGeo.dispose()
    }
  }, [terrainGeo, roadGeo, shoulderGeo, markingsGeo])

  return (
    <group position={[0, 0, chunkZ]}>
      {/* 1. Terrain Surface Mesh */}
      <mesh geometry={terrainGeo} receiveShadow>
        <meshStandardMaterial
          color={biomeConfig.grassColor}
          roughness={biomeConfig.roughness}
          metalness={0.06}
        />
      </mesh>

      {/* 2. Curved Asphalt Highway Ribbon with Wet Road Shader support */}
      <mesh geometry={roadGeo} receiveShadow>
        <meshStandardMaterial
          color={biomeConfig.roadColor}
          roughness={isRaining ? 0.12 : biomeConfig.id === 'tundra' ? 0.38 : 0.62}
          metalness={isRaining ? 0.42 : 0.14}
        />
      </mesh>

      {/* 3. Roadside Gravel Shoulder Strips */}
      <mesh geometry={shoulderGeo} receiveShadow>
        <meshStandardMaterial
          color={biomeConfig.shoulderColor}
          roughness={0.88}
          metalness={0.08}
        />
      </mesh>

      {/* 4. Highway Markings (Yellow Dashed Centerline + White Edge Lines) */}
      <mesh geometry={markingsGeo}>
        <meshBasicMaterial vertexColors />
      </mesh>

      {/* 5. Roadside Scenery: Trees / Flora */}
      {sceneryData.trees.length > 0 && (
        <>
          <instancedMesh
            ref={treeTrunkRef}
            args={[undefined, undefined, sceneryData.trees.length]}
            castShadow
            receiveShadow
          >
            {biomeConfig.id === 'desert' ? (
              // Desert saguaro green ribbed trunk
              <cylinderGeometry args={[0.34, 0.38, 3.6, 10]} />
            ) : (
              <cylinderGeometry args={[0.22, 0.36, 2.8, 8]} />
            )}
            <meshStandardMaterial
              color={biomeConfig.id === 'desert' ? '#166534' : biomeConfig.treeTrunkColor}
              roughness={0.85}
            />
          </instancedMesh>

          <instancedMesh
            ref={treeFoliageRef}
            args={[undefined, undefined, sceneryData.trees.length]}
            castShadow
          >
            {biomeConfig.id === 'desert' ? (
              // Desert cacti top dome
              <dodecahedronGeometry args={[0.45, 0]} />
            ) : biomeConfig.id === 'autumn' ? (
              // Autumn maple rounded canopy
              <dodecahedronGeometry args={[1.75, 1]} />
            ) : (
              // Pine tree cone
              <coneGeometry args={[1.65, 4.8, 8]} />
            )}
            <meshStandardMaterial
              color={biomeConfig.treeFoliageColor}
              roughness={0.72}
            />
          </instancedMesh>
        </>
      )}

      {/* 6. Roadside Scenery: Rocks / Spires */}
      {sceneryData.rocks.length > 0 && (
        <instancedMesh
          ref={rockRef}
          args={[undefined, undefined, sceneryData.rocks.length]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial color={biomeConfig.rockColor} roughness={0.84} />
        </instancedMesh>
      )}

      {/* 7. Roadside Scenery: Utility Poles */}
      {sceneryData.poles.length > 0 && (
        <instancedMesh
          ref={poleRef}
          args={[undefined, undefined, sceneryData.poles.length]}
          castShadow
        >
          <cylinderGeometry args={[0.13, 0.16, 6.4, 8]} />
          <meshStandardMaterial color="#362316" roughness={0.95} />
        </instancedMesh>
      )}
    </group>
  )
}

// Infinite Chunk Manager: Tracks player camera Z and dynamically streams tiles
export default function Terrain() {
  const biome = useGameStore((state) => state.biome)
  const weather = useGameStore((state) => state.weather)
  const { camera } = useThree()

  // Initial active chunks around spawn
  const [chunks, setChunks] = useState<number[]>([200, 0, -200, -400, -600, -800])
  const lastCenterIndex = useRef<number>(0)

  useFrame(() => {
    const camZ = camera.position.z
    const centerIndex = Math.round(camZ / CHUNK_LEN)

    if (centerIndex !== lastCenterIndex.current) {
      lastCenterIndex.current = centerIndex
      const centerZ = centerIndex * CHUNK_LEN
      setChunks([
        centerZ + CHUNK_LEN,
        centerZ,
        centerZ - CHUNK_LEN,
        centerZ - CHUNK_LEN * 2,
        centerZ - CHUNK_LEN * 3,
        centerZ - CHUNK_LEN * 4,
      ])
    }
  })

  return (
    <group>
      {chunks.map((cz) => {
        const chunkBiome = getActiveBiomeAt(cz, biome)
        return (
          <TerrainChunkTile
            key={cz}
            chunkZ={cz}
            biomeConfig={chunkBiome}
            isRaining={weather === 'rain'}
          />
        )
      })}
    </group>
  )
}
