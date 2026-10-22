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
import { getAsphaltTexture, getAsphaltBumpTexture } from '../../../utils/asphaltTexture'

const CHUNK_LEN = 200
const TERRAIN_W = 300
const GRID_X = 64
const GRID_Z = 48

interface ChunkProps {
  chunkZ: number
  biomeConfig: BiomeConfig
  isRaining: boolean
}

// Single Procedural Infinite Chunk Tile containing:
// 1. Terrain Ground Mesh Geometry with slope-based rock/grass vertex coloring
// 2. Curved Asphalt Highway Ribbon with realistic road camber & edge bevels
// 3. Roadside Gravel Shoulder Strips
// 4. Highway Markings: Yellow Dashed Centerline + Dual Solid White Edge Lines
// 5. Realistic Steel W-Beam Guardrails on curved segments
// 6. Biome-Specific Instanced Scenery (Multi-tier Pines, Maples, Cacti, Boulders, Poles)
function TerrainChunkTile({ chunkZ, biomeConfig, isRaining }: ChunkProps) {
  const asphaltTex = useMemo(() => getAsphaltTexture(), [])
  const asphaltBumpTex = useMemo(() => getAsphaltBumpTexture(), [])
  // 1. Terrain Ground Mesh Geometry with slope-aware natural shading
  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(TERRAIN_W, CHUNK_LEN, GRID_X, GRID_Z)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position
    const count = pos.count
    for (let i = 0; i < count; i++) {
      const localX = pos.getX(i)
      const localZ = pos.getZ(i)
      const worldZ = chunkZ + localZ
      const y = getTerrainHeight(localX, worldZ, biomeConfig.id)
      pos.setY(i, y)
    }

    geo.computeVertexNormals()

    // Generate slope-based vertex colors (steep slopes show natural rock strata)
    const normals = geo.attributes.normal
    const colors = new Float32Array(count * 3)

    const grassColor = new THREE.Color(biomeConfig.grassColor)
    const rockColor = new THREE.Color(biomeConfig.rockColor)
    const tempColor = new THREE.Color()

    for (let i = 0; i < count; i++) {
      const ny = normals.getY(i) // 1.0 = flat horizontal, 0.0 = sheer vertical
      const slope = Math.max(0, Math.min(1, (ny - 0.72) / 0.25)) // 0 (steep rock) to 1 (flat grass)

      // Add subtle spatial color variation
      const px = pos.getX(i)
      const pz = pos.getZ(i)
      const noiseVar = Math.sin(px * 0.05 + pz * 0.05) * 0.04

      tempColor.copy(rockColor).lerp(grassColor, slope)
      tempColor.r = Math.max(0, Math.min(1, tempColor.r + noiseVar))
      tempColor.g = Math.max(0, Math.min(1, tempColor.g + noiseVar))
      tempColor.b = Math.max(0, Math.min(1, tempColor.b + noiseVar))

      colors[i * 3] = tempColor.r
      colors[i * 3 + 1] = tempColor.g
      colors[i * 3 + 2] = tempColor.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [chunkZ, biomeConfig])

  // 2. Curved Asphalt Highway Ribbon Geometry (uniform width calculated via curve normals)
  const roadGeo = useMemo(() => {
    const segments = 50 // Every 4m along the 200m chunk
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    const halfW = ROAD_WIDTH / 2

    for (let i = 0; i <= segments; i++) {
      const localZ = CHUNK_LEN / 2 - (i / segments) * CHUNK_LEN
      const worldZ = chunkZ + localZ
      const cx = getRoadCenter(worldZ)
      const cy = getRoadElevation(worldZ) + 0.048
      const { nx, nz } = getRoadTangent(worldZ)

      // Crown camber in the road center (+0.02m) for realistic highway drainage profile
      // Left edge
      positions.push(cx - nx * halfW, cy - 0.02, localZ - nz * halfW)
      normals.push(-nx * 0.1, 0.98, -nz * 0.1)
      uvs.push(0, i * 0.8)

      // Center crown
      positions.push(cx, cy, localZ)
      normals.push(0, 1, 0)
      uvs.push(0.5, i * 0.8)

      // Right edge
      positions.push(cx + nx * halfW, cy - 0.02, localZ + nz * halfW)
      normals.push(nx * 0.1, 0.98, nz * 0.1)
      uvs.push(1, i * 0.8)

      if (i < segments) {
        const row1 = i * 3
        const row2 = (i + 1) * 3

        // Left half quad
        indices.push(row1, row2, row1 + 1)
        indices.push(row1 + 1, row2, row2 + 1)

        // Right half quad
        indices.push(row1 + 1, row2 + 1, row1 + 2)
        indices.push(row1 + 2, row2 + 1, row2 + 2)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    return geo
  }, [chunkZ])

  // 3. Roadside Gravel / Dirt Shoulder Strips
  const shoulderGeo = useMemo(() => {
    const segments = 32
    const positions: number[] = []
    const normals: number[] = []
    const indices: number[] = []

    const innerW = ROAD_WIDTH / 2
    const outerW = ROAD_WIDTH / 2 + 2.2

    for (let i = 0; i <= segments; i++) {
      const localZ = CHUNK_LEN / 2 - (i / segments) * CHUNK_LEN
      const worldZ = chunkZ + localZ
      const cx = getRoadCenter(worldZ)
      const cy = getRoadElevation(worldZ) + 0.022
      const { nx, nz } = getRoadTangent(worldZ)

      // Left shoulder (inner to outer)
      positions.push(cx - nx * innerW, cy - 0.015, localZ - nz * innerW)
      positions.push(cx - nx * outerW, cy - 0.04, localZ - nz * outerW)

      // Right shoulder (inner to outer)
      positions.push(cx + nx * innerW, cy - 0.015, localZ + nz * innerW)
      positions.push(cx + nx * outerW, cy - 0.04, localZ + nz * outerW)

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
      const cyStart = getRoadElevation(wzStart) + 0.068
      const cxEnd = getRoadCenter(wzEnd)
      const cyEnd = getRoadElevation(wzEnd) + 0.068

      const tanStart = getRoadTangent(wzStart)
      const tanEnd = getRoadTangent(wzEnd)

      // Centerline quads (Vibrant highway amber-yellow)
      positions.push(cxStart - tanStart.nx * halfLineW, cyStart, localZStart - tanStart.nz * halfLineW)
      positions.push(cxStart + tanStart.nx * halfLineW, cyStart, localZStart + tanStart.nz * halfLineW)
      positions.push(cxEnd - tanEnd.nx * halfLineW, cyEnd, localZEnd - tanEnd.nz * halfLineW)
      positions.push(cxEnd + tanEnd.nx * halfLineW, cyEnd, localZEnd + tanEnd.nz * halfLineW)

      for (let j = 0; j < 4; j++) {
        normals.push(0, 1, 0)
        colors.push(0.98, 0.78, 0.12) // Yellow
      }

      indices.push(vertCount, vertCount + 1, vertCount + 2)
      indices.push(vertCount + 1, vertCount + 3, vertCount + 2)
      vertCount += 4
    }

    // B. Solid White Outer Edge Boundary Lines
    const edgeOffset = ROAD_WIDTH / 2 - 0.45
    const edgeHalfW = 0.1
    const edgeSegments = 36

    for (let i = 0; i <= edgeSegments; i++) {
      const localZ = CHUNK_LEN / 2 - (i / edgeSegments) * CHUNK_LEN
      const worldZ = chunkZ + localZ
      const cx = getRoadCenter(worldZ)
      const cy = getRoadElevation(worldZ) + 0.068
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
        colors.push(0.96, 0.97, 0.98) // Crisp white
      }

      if (i < edgeSegments) {
        const base = vertCount + i * 4
        // Left edge quad (Upward CCW winding)
        indices.push(base, base + 1, base + 4)
        indices.push(base + 1, base + 5, base + 4)
        // Right edge quad (Upward CCW winding - fixed missing right line bug)
        indices.push(base + 2, base + 3, base + 6)
        indices.push(base + 3, base + 7, base + 6)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.setIndex(indices)
    return geo
  }, [chunkZ])

  // 5. Realistic Steel Highway Guardrails on Curved Outer Segments
  const guardrailGeo = useMemo(() => {
    const segments = 28
    const positions: number[] = []
    const normals: number[] = []
    const indices: number[] = []

    let vertIndex = 0
    const railOffset = ROAD_WIDTH / 2 + 1.2
    const railHeight = 0.65
    const railThickness = 0.22

    for (let i = 0; i < segments; i++) {
      const z1 = CHUNK_LEN / 2 - (i / segments) * CHUNK_LEN
      const z2 = CHUNK_LEN / 2 - ((i + 1) / segments) * CHUNK_LEN

      const wz1 = chunkZ + z1
      const wz2 = chunkZ + z2

      // Check curvature along this section
      const cx1 = getRoadCenter(wz1)
      const cx2 = getRoadCenter(wz2)
      const cy1 = getRoadElevation(wz1)
      const cy2 = getRoadElevation(wz2)

      const tan1 = getRoadTangent(wz1)
      const tan2 = getRoadTangent(wz2)

      // Guardrails appear on outer curves
      const isCurving = Math.abs(cx2 - cx1) > 0.4
      if (isCurving) {
        const side = cx2 > cx1 ? 1 : -1
        const p1x = cx1 + tan1.nx * railOffset * side
        const p1z = z1 + tan1.nz * railOffset * side
        const p2x = cx2 + tan2.nx * railOffset * side
        const p2z = z2 + tan2.nz * railOffset * side

        // Guardrail beam ribbon
        positions.push(p1x, cy1 + railHeight, p1z)
        positions.push(p1x, cy1 + railHeight - railThickness, p1z)
        positions.push(p2x, cy2 + railHeight, p2z)
        positions.push(p2x, cy2 + railHeight - railThickness, p2z)

        for (let j = 0; j < 4; j++) normals.push(tan1.nx * side, 0, tan1.nz * side)

        indices.push(vertIndex, vertIndex + 1, vertIndex + 2)
        indices.push(vertIndex + 1, vertIndex + 3, vertIndex + 2)
        vertIndex += 4
      }
    }

    if (positions.length === 0) return null

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geo.setIndex(indices)
    return geo
  }, [chunkZ])

  // 6. Deterministic Roadside Scenery (Trees, Cacti, Rocks, Poles)
  const sceneryData = useMemo(() => {
    const trees: { pos: [number, number, number]; scale: number }[] = []
    const rocks: { pos: [number, number, number]; scale: number; rot: number }[] = []
    const poles: { pos: [number, number, number] }[] = []

    const step = 14
    for (let localZ = -CHUNK_LEN / 2 + 10; localZ <= CHUNK_LEN / 2 - 10; localZ += step) {
      const worldZ = chunkZ + localZ
      const roadCx = getRoadCenter(worldZ)

      // Deterministic hashes based on integer worldZ
      const h1 = Math.abs(Math.sin(worldZ * 12.9898 + 78.233))
      const h2 = Math.abs(Math.sin(worldZ * 43.123 + 19.827))
      const h3 = Math.abs(Math.sin(worldZ * 91.827 + 34.129))

      // Left Flora / Cacti
      const leftDist = ROAD_WIDTH / 2 + 6.2 + h1 * 48
      const leftX = roadCx - leftDist
      const leftY = getTerrainHeight(leftX, worldZ, biomeConfig.id)
      trees.push({ pos: [leftX, leftY, localZ], scale: 0.85 + h2 * 0.75 })

      // Right Flora / Cacti
      const rightDist = ROAD_WIDTH / 2 + 6.2 + h2 * 48
      const rightX = roadCx + rightDist
      const rightY = getTerrainHeight(rightX, worldZ, biomeConfig.id)
      trees.push({ pos: [rightX, rightY, localZ], scale: 0.85 + h1 * 0.75 })

      // Scattered Boulders / Rocks
      if (h3 > 0.42) {
        const rockSide = h1 > 0.5 ? 1 : -1
        const rockDist = ROAD_WIDTH / 2 + 5.5 + h2 * 32
        const rockX = roadCx + rockSide * rockDist
        const rockY = getTerrainHeight(rockX, worldZ, biomeConfig.id)
        rocks.push({
          pos: [rockX, rockY, localZ],
          scale: 0.8 + h3 * 1.4,
          rot: h1 * Math.PI * 2,
        })
      }

      // Utility Poles along right shoulder every ~32m
      if (Math.abs(Math.floor(worldZ / 32) * 32 - worldZ) < 7) {
        const poleX = roadCx + (ROAD_WIDTH / 2 + 3.2)
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
        dummy.position.set(t.pos[0], t.pos[1] + 1.4 * t.scale, t.pos[2])
        dummy.scale.set(t.scale, t.scale, t.scale)
        dummy.rotation.set(0, (t.scale * 10) % Math.PI, 0)
        dummy.updateMatrix()
        treeTrunkRef.current?.setMatrixAt(i, dummy.matrix)

        dummy.position.set(t.pos[0], t.pos[1] + 3.8 * t.scale, t.pos[2])
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
        dummy.scale.set(r.scale, r.scale * 0.72, r.scale)
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
      if (guardrailGeo) guardrailGeo.dispose()
    }
  }, [terrainGeo, roadGeo, shoulderGeo, markingsGeo, guardrailGeo])

  return (
    <group position={[0, 0, chunkZ]}>
      {/* 1. Terrain Surface Mesh with slope-based Rock/Grass Vertex Colors */}
      <mesh geometry={terrainGeo} receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={biomeConfig.roughness}
          metalness={0.04}
        />
      </mesh>

      {/* 2. Curved Asphalt Highway Ribbon with Procedural Aggregate Texture & Camber */}
      <mesh geometry={roadGeo} receiveShadow>
        <meshStandardMaterial
          map={asphaltTex}
          bumpMap={asphaltBumpTex}
          bumpScale={0.015}
          color={biomeConfig.roadColor}
          roughness={isRaining ? 0.08 : biomeConfig.id === 'tundra' ? 0.35 : 0.72}
          metalness={isRaining ? 0.48 : 0.12}
          envMapIntensity={isRaining ? 1.6 : 0.6}
        />
      </mesh>

      {/* 3. Roadside Gravel Shoulder Strips */}
      <mesh geometry={shoulderGeo} receiveShadow>
        <meshStandardMaterial
          color={biomeConfig.shoulderColor}
          roughness={0.92}
          metalness={0.06}
        />
      </mesh>

      {/* 4. Highway Markings: Yellow Dashed Centerline + Symmetrical Dual White Edge Lines (Zero Z-Fighting) */}
      <mesh geometry={markingsGeo} renderOrder={2}>
        <meshStandardMaterial
          vertexColors
          roughness={0.3}
          polygonOffset
          polygonOffsetFactor={-3}
          polygonOffsetUnits={-3}
          depthTest
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 5. Steel W-Beam Guardrails on Outer Highway Curves */}
      {guardrailGeo && (
        <mesh geometry={guardrailGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
        </mesh>
      )}

      {/* 6. Roadside Scenery: Trees / Flora */}
      {sceneryData.trees.length > 0 && (
        <>
          <instancedMesh
            ref={treeTrunkRef}
            args={[undefined, undefined, sceneryData.trees.length]}
            castShadow
            receiveShadow
          >
            {biomeConfig.id === 'desert' ? (
              // Desert saguaro ribbed trunk
              <cylinderGeometry args={[0.34, 0.38, 3.6, 12]} />
            ) : (
              <cylinderGeometry args={[0.24, 0.38, 3.0, 8]} />
            )}
            <meshStandardMaterial
              color={biomeConfig.id === 'desert' ? '#166534' : biomeConfig.treeTrunkColor}
              roughness={0.88}
            />
          </instancedMesh>

          <instancedMesh
            ref={treeFoliageRef}
            args={[undefined, undefined, sceneryData.trees.length]}
            castShadow
          >
            {biomeConfig.id === 'desert' ? (
              // Desert cacti top dome
              <dodecahedronGeometry args={[0.48, 1]} />
            ) : biomeConfig.id === 'autumn' ? (
              // Autumn maple rounded canopy
              <dodecahedronGeometry args={[1.9, 1]} />
            ) : (
              // Pine tree cone
              <coneGeometry args={[1.75, 5.2, 8]} />
            )}
            <meshStandardMaterial
              color={biomeConfig.treeFoliageColor}
              roughness={0.76}
            />
          </instancedMesh>
        </>
      )}

      {/* 7. Roadside Scenery: Rocks / Spires */}
      {sceneryData.rocks.length > 0 && (
        <instancedMesh
          ref={rockRef}
          args={[undefined, undefined, sceneryData.rocks.length]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1.2, 1]} />
          <meshStandardMaterial color={biomeConfig.rockColor} roughness={0.88} />
        </instancedMesh>
      )}

      {/* 8. Roadside Scenery: Utility Poles */}
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

  // Initial active chunks around spawn (1 chunk behind, 5 chunks forward)
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
