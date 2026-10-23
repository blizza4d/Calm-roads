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
const TERRAIN_W = 320
const GRID_X = 64
const GRID_Z = 48

// Helper to merge multiple BufferGeometries into a single geometry
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry()
  const posList: number[] = []
  const normList: number[] = []
  const indexList: number[] = []
  let vertexOffset = 0

  for (const g of geometries) {
    const pos = g.attributes.position
    const norm = g.attributes.normal
    const index = g.index

    for (let i = 0; i < pos.count; i++) {
      posList.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (norm) normList.push(norm.getX(i), norm.getY(i), norm.getZ(i))
      else normList.push(0, 1, 0)
    }

    if (index) {
      for (let i = 0; i < index.count; i++) {
        indexList.push(index.getX(i) + vertexOffset)
      }
    } else {
      for (let i = 0; i < pos.count; i++) {
        indexList.push(i + vertexOffset)
      }
    }
    vertexOffset += pos.count
  }

  merged.setAttribute('position', new THREE.Float32BufferAttribute(posList, 3))
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normList, 3))
  merged.setIndex(indexList)
  return merged
}

// ------------------------------------------------------------------------
// Realistic Procedural Vegetation & Geological Geometries
// ------------------------------------------------------------------------
// 1. Alpine / Mountain Conifer: 3-tiered conical skirt canopy
const pineCanopyGeo = (() => {
  const t1 = new THREE.ConeGeometry(2.3, 2.2, 8).translate(0, 2.0, 0)
  const t2 = new THREE.ConeGeometry(1.75, 2.0, 8).translate(0, 3.2, 0)
  const t3 = new THREE.ConeGeometry(1.15, 1.8, 8).translate(0, 4.4, 0)
  return mergeBufferGeometries([t1, t2, t3])
})()
const pineTrunkGeo = new THREE.CylinderGeometry(0.18, 0.42, 4.2, 8).translate(0, 2.1, 0)

// 2. Deciduous Broadleaf / Mountain Maple: Asymmetrical 3-lobed organic crown
const broadleafCanopyGeo = (() => {
  const c1 = new THREE.DodecahedronGeometry(1.75, 1).translate(0, 3.8, 0)
  const c2 = new THREE.DodecahedronGeometry(1.3, 1).translate(-0.75, 3.4, 0.35)
  const c3 = new THREE.DodecahedronGeometry(1.35, 1).translate(0.8, 3.5, -0.35)
  return mergeBufferGeometries([c1, c2, c3])
})()
const broadleafTrunkGeo = new THREE.CylinderGeometry(0.22, 0.45, 3.8, 8).translate(0, 1.9, 0)

// 3. Desert Saguaro Cactus: Multi-armed branching columnar cactus
const saguaroGeo = (() => {
  const main = new THREE.CylinderGeometry(0.34, 0.38, 4.8, 10).translate(0, 2.4, 0)
  const armL1 = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8).rotateZ(Math.PI / 2).translate(-0.55, 2.2, 0)
  const armL2 = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8).translate(-0.95, 2.9, 0)
  const armR1 = new THREE.CylinderGeometry(0.18, 0.18, 0.8, 8).rotateZ(-Math.PI / 2).translate(0.55, 2.8, 0)
  const armR2 = new THREE.CylinderGeometry(0.18, 0.18, 1.3, 8).translate(0.95, 3.4, 0)
  return mergeBufferGeometries([main, armL1, armL2, armR1, armR2])
})()

// 4. Roadside Shrub / Bush
const shrubGeo = new THREE.DodecahedronGeometry(1.15, 1).scale(1.2, 0.65, 1.1).translate(0, 0.6, 0)

// 5. Geological Weathered Boulders with sharp fracture cleavage planes
const rockGeo = (() => {
  const geo = new THREE.DodecahedronGeometry(1.4, 0)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    // Irregular geological shearing and cleavage facets
    const shear = Math.sin(x * 2.8 + y * 1.9) * 0.22
    pos.setXYZ(i, x * (1.15 + shear), y * 0.74 + shear * 0.35, z * (0.92 - shear))
  }
  geo.computeVertexNormals()
  return geo
})()

// 6. Roadside Wild Grass / Meadow Foliage Clumps
const grassTuftGeo = (() => {
  const p1 = new THREE.PlaneGeometry(0.85, 0.65).translate(0, 0.32, 0)
  const p2 = new THREE.PlaneGeometry(0.85, 0.65).rotateY(Math.PI / 3).translate(0, 0.32, 0)
  const p3 = new THREE.PlaneGeometry(0.85, 0.65).rotateY(-Math.PI / 3).translate(0, 0.32, 0)
  return mergeBufferGeometries([p1, p2, p3])
})()

// 7. Utility Poles
const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6.4, 8).translate(0, 3.2, 0)

interface ChunkProps {
  chunkZ: number
  biomeConfig: BiomeConfig
  isRaining: boolean
}

// Single Procedural Infinite Chunk Tile containing:
// 1. High-Density Smooth Geological Terrain Ground Mesh
// 2. Curved Asphalt Highway Ribbon with Realistic Diffuse Aggregate & Camber
// 3. Roadside Gravel Shoulder Strips
// 4. Highway Markings: Yellow Dashed Centerline + Symmetrical Dual White Edge Lines
// 5. Realistic Steel W-Beam Guardrails on curved segments
// 6. Biome-Specific Instanced Scenery (Pines, Maples, Cacti, Boulders, Grass Tufts, Poles)
function TerrainChunkTile({ chunkZ, biomeConfig, isRaining }: ChunkProps) {
  const asphaltTex = useMemo(() => getAsphaltTexture(), [])
  const asphaltBumpTex = useMemo(() => getAsphaltBumpTexture(), [])

  // 1. Terrain Ground Mesh Geometry with slope-aware natural shading and dense vertices
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

    // Multi-gradient natural vertex coloring:
    // Steep slopes expose rock strata; flat regions display lush vegetation; high elevations get alpine tone
    const normals = geo.attributes.normal
    const colors = new Float32Array(count * 3)

    const grassColor = new THREE.Color(biomeConfig.grassColor)
    const rockColor = new THREE.Color(biomeConfig.rockColor)
    const shoulderColor = new THREE.Color(biomeConfig.shoulderColor)
    const tempColor = new THREE.Color()

    for (let i = 0; i < count; i++) {
      const ny = normals.getY(i) // 1.0 = flat horizontal, 0.0 = sheer vertical
      const slope = Math.max(0, Math.min(1, (ny - 0.65) / 0.28)) // 0 (steep rock) to 1 (flat grass)

      const px = pos.getX(i)
      const py = pos.getY(i)
      const pz = pos.getZ(i)

      // Subtle geological strata banding
      const strataNoise = Math.sin(py * 0.35 + px * 0.02) * 0.05
      const spatialVar = Math.sin(px * 0.04 + pz * 0.04) * 0.03

      tempColor.copy(rockColor).lerp(grassColor, slope)

      // Alpine summit frosting for tundra at high elevations
      if (biomeConfig.id === 'tundra' && py > 24) {
        const snowT = Math.min(1.0, (py - 24) / 18.0)
        tempColor.lerp(new THREE.Color('#f8fafc'), snowT * 0.6)
      }

      // Proximity to road shoulder - subtle soil blending
      const distFromCenter = Math.abs(px - getRoadCenter(chunkZ + pz))
      if (distFromCenter < ROAD_WIDTH / 2 + 5.5) {
        const blendToSoil = Math.max(0, 1 - (distFromCenter - (ROAD_WIDTH / 2 + 2.0)) / 3.5)
        tempColor.lerp(shoulderColor, blendToSoil * 0.45)
      }

      tempColor.r = Math.max(0, Math.min(1, tempColor.r + strataNoise + spatialVar))
      tempColor.g = Math.max(0, Math.min(1, tempColor.g + strataNoise + spatialVar))
      tempColor.b = Math.max(0, Math.min(1, tempColor.b + strataNoise + spatialVar))

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
        // Right edge quad (Upward CCW winding)
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

      const cx1 = getRoadCenter(wz1)
      const cx2 = getRoadCenter(wz2)
      const cy1 = getRoadElevation(wz1)
      const cy2 = getRoadElevation(wz2)

      const tan1 = getRoadTangent(wz1)
      const tan2 = getRoadTangent(wz2)

      const isCurving = Math.abs(cx2 - cx1) > 0.4
      if (isCurving) {
        const side = cx2 > cx1 ? 1 : -1
        const p1x = cx1 + tan1.nx * railOffset * side
        const p1z = z1 + tan1.nz * railOffset * side
        const p2x = cx2 + tan2.nx * railOffset * side
        const p2z = z2 + tan2.nz * railOffset * side

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

  // 6. Natural Clustered Roadside Scenery (Trees, Boulders, Grass Tufts, Poles)
  const sceneryData = useMemo(() => {
    const pines: { pos: [number, number, number]; scale: number; rotY: number }[] = []
    const broadleafs: { pos: [number, number, number]; scale: number; rotY: number }[] = []
    const saguaros: { pos: [number, number, number]; scale: number; rotY: number }[] = []
    const shrubs: { pos: [number, number, number]; scale: number; rotY: number }[] = []
    const rocks: { pos: [number, number, number]; scale: [number, number, number]; rot: [number, number, number] }[] = []
    const grassTufts: { pos: [number, number, number]; scale: number; rotY: number }[] = []
    const poles: { pos: [number, number, number] }[] = []

    const isDesert = biomeConfig.id === 'desert'
    const isTundra = biomeConfig.id === 'tundra'
    const isAutumn = biomeConfig.id === 'autumn'

    const numClusters = 6
    const clusterStep = CHUNK_LEN / numClusters

    for (let c = 0; c < numClusters; c++) {
      const clusterZ = -CHUNK_LEN / 2 + c * clusterStep + clusterStep * 0.5
      const worldZ = chunkZ + clusterZ
      const roadCx = getRoadCenter(worldZ)

      const hash1 = Math.abs(Math.sin(worldZ * 17.13 + 31.415))
      const hash2 = Math.abs(Math.sin(worldZ * 59.29 + 17.821))
      const hash3 = Math.abs(Math.sin(worldZ * 83.71 + 92.119))

      // Utility Poles along the right road shoulder every ~36m
      if (c % 2 === 0) {
        const poleX = roadCx + (ROAD_WIDTH / 2 + 2.8)
        const poleY = getRoadElevation(worldZ)
        poles.push({ pos: [poleX, poleY, clusterZ] })
      }

      // Roadside grass tufts along shoulder borders
      if (!isDesert) {
        const sides = [-1, 1]
        sides.forEach((side) => {
          const grassDist = ROAD_WIDTH / 2 + 1.6 + hash1 * 1.8
          const grassX = roadCx + side * grassDist
          const grassZ = clusterZ + (hash2 - 0.5) * 12
          const grassWorldZ = chunkZ + grassZ
          const grassY = getTerrainHeight(grassX, grassWorldZ, biomeConfig.id)
          grassTufts.push({
            pos: [grassX, grassY, grassZ],
            scale: 0.8 + hash3 * 0.5,
            rotY: hash1 * Math.PI * 2,
          })
        })
      }

      // Scenery on both sides of highway
      const sides = [-1, 1]
      sides.forEach((side) => {
        const clusterDist = ROAD_WIDTH / 2 + 7.5 + (side === -1 ? hash1 : hash2) * 36
        const clusterCenterX = roadCx + side * clusterDist

        if (isDesert) {
          const numSaguaros = 1 + Math.floor(hash3 * 2.5)
          for (let i = 0; i < numSaguaros; i++) {
            const offsetX = (Math.sin(i * 2.4 + hash1) - 0.5) * 14
            const offsetZ = (Math.cos(i * 3.1 + hash2) - 0.5) * 16
            const treeX = clusterCenterX + offsetX
            const treeZ = clusterZ + offsetZ
            const treeWorldZ = chunkZ + treeZ

            if (Math.abs(treeX - getRoadCenter(treeWorldZ)) > ROAD_WIDTH / 2 + 3.8) {
              const treeY = getTerrainHeight(treeX, treeWorldZ, biomeConfig.id)
              saguaros.push({
                pos: [treeX, treeY, treeZ],
                scale: 0.85 + hash1 * 0.65,
                rotY: (hash2 * 10 + i) % (Math.PI * 2),
              })
            }
          }

          if (hash3 > 0.3) {
            const shrubX = clusterCenterX + (hash2 - 0.5) * 10
            const shrubZ = clusterZ + (hash1 - 0.5) * 12
            const shrubWorldZ = chunkZ + shrubZ
            if (Math.abs(shrubX - getRoadCenter(shrubWorldZ)) > ROAD_WIDTH / 2 + 3.5) {
              const shrubY = getTerrainHeight(shrubX, shrubWorldZ, biomeConfig.id)
              shrubs.push({
                pos: [shrubX, shrubY, shrubZ],
                scale: 0.7 + hash3 * 0.7,
                rotY: hash1 * Math.PI,
              })
            }
          }
        } else {
          const treesInCluster = 2 + Math.floor(hash2 * 3.2)
          for (let i = 0; i < treesInCluster; i++) {
            const angle = (i / treesInCluster) * Math.PI * 2 + hash1
            const radius = 3.5 + (i * 3.8 + hash3 * 6.5)
            const treeX = clusterCenterX + Math.cos(angle) * radius
            const treeZ = clusterZ + Math.sin(angle) * radius
            const treeWorldZ = chunkZ + treeZ

            if (Math.abs(treeX - getRoadCenter(treeWorldZ)) > ROAD_WIDTH / 2 + 4.2) {
              const treeY = getTerrainHeight(treeX, treeWorldZ, biomeConfig.id)
              const scale = 0.85 + ((hash1 + i * 0.3) % 0.6)
              const isPine = isTundra ? true : isAutumn ? (i % 3 === 0) : (i % 2 === 0)

              if (isPine) {
                pines.push({
                  pos: [treeX, treeY, treeZ],
                  scale,
                  rotY: angle,
                })
              } else {
                broadleafs.push({
                  pos: [treeX, treeY, treeZ],
                  scale,
                  rotY: angle + 0.5,
                })
              }
            }
          }

          if (hash1 > 0.35) {
            const shrubDist = ROAD_WIDTH / 2 + 4.8 + hash2 * 12
            const shrubX = roadCx + side * shrubDist
            const shrubZ = clusterZ + (hash3 - 0.5) * 16
            const shrubWorldZ = chunkZ + shrubZ
            const shrubY = getTerrainHeight(shrubX, shrubWorldZ, biomeConfig.id)
            shrubs.push({
              pos: [shrubX, shrubY, shrubZ],
              scale: 0.65 + hash3 * 0.6,
              rotY: hash2 * Math.PI,
            })
          }
        }

        // Stratified geological rock outcrops
        if (hash3 > 0.4) {
          const rockDist = ROAD_WIDTH / 2 + 6.0 + hash1 * 26
          const rockX = roadCx + side * rockDist
          const rockZ = clusterZ + (hash2 - 0.5) * 18
          const rockWorldZ = chunkZ + rockZ
          const rockY = getTerrainHeight(rockX, rockWorldZ, biomeConfig.id)

          // Non-uniform geological scaling for natural boulder silhouette
          const sx = 0.9 + hash3 * 1.6
          const sy = (0.65 + hash1 * 0.8) * sx
          const sz = (0.85 + hash2 * 1.2) * sx

          rocks.push({
            pos: [rockX, rockY + 0.3 * sy, rockZ],
            scale: [sx, sy, sz],
            rot: [hash1 * 0.3, hash2 * Math.PI * 2, hash3 * 0.25],
          })
        }
      })
    }

    return { pines, broadleafs, saguaros, shrubs, rocks, grassTufts, poles }
  }, [chunkZ, biomeConfig.id])

  // Instanced Meshes for Vegetation & Scenery Props
  const pineTrunkRef = useRef<THREE.InstancedMesh>(null)
  const pineCanopyRef = useRef<THREE.InstancedMesh>(null)
  const broadleafTrunkRef = useRef<THREE.InstancedMesh>(null)
  const broadleafCanopyRef = useRef<THREE.InstancedMesh>(null)
  const saguaroRef = useRef<THREE.InstancedMesh>(null)
  const shrubRef = useRef<THREE.InstancedMesh>(null)
  const rockRef = useRef<THREE.InstancedMesh>(null)
  const grassRef = useRef<THREE.InstancedMesh>(null)
  const poleRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const dummy = new THREE.Object3D()

    // 1. Pines
    if (pineTrunkRef.current && pineCanopyRef.current) {
      sceneryData.pines.forEach((p, i) => {
        dummy.position.set(p.pos[0], p.pos[1], p.pos[2])
        dummy.scale.set(p.scale, p.scale, p.scale)
        dummy.rotation.set(0, p.rotY, 0)
        dummy.updateMatrix()
        pineTrunkRef.current?.setMatrixAt(i, dummy.matrix)
        pineCanopyRef.current?.setMatrixAt(i, dummy.matrix)
      })
      pineTrunkRef.current.instanceMatrix.needsUpdate = true
      pineCanopyRef.current.instanceMatrix.needsUpdate = true
    }

    // 2. Broadleafs
    if (broadleafTrunkRef.current && broadleafCanopyRef.current) {
      sceneryData.broadleafs.forEach((b, i) => {
        dummy.position.set(b.pos[0], b.pos[1], b.pos[2])
        dummy.scale.set(b.scale, b.scale, b.scale)
        dummy.rotation.set(0, b.rotY, 0)
        dummy.updateMatrix()
        broadleafTrunkRef.current?.setMatrixAt(i, dummy.matrix)
        broadleafCanopyRef.current?.setMatrixAt(i, dummy.matrix)
      })
      broadleafTrunkRef.current.instanceMatrix.needsUpdate = true
      broadleafCanopyRef.current.instanceMatrix.needsUpdate = true
    }

    // 3. Saguaros
    if (saguaroRef.current) {
      sceneryData.saguaros.forEach((s, i) => {
        dummy.position.set(s.pos[0], s.pos[1], s.pos[2])
        dummy.scale.set(s.scale, s.scale, s.scale)
        dummy.rotation.set(0, s.rotY, 0)
        dummy.updateMatrix()
        saguaroRef.current?.setMatrixAt(i, dummy.matrix)
      })
      saguaroRef.current.instanceMatrix.needsUpdate = true
    }

    // 4. Shrubs
    if (shrubRef.current) {
      sceneryData.shrubs.forEach((s, i) => {
        dummy.position.set(s.pos[0], s.pos[1], s.pos[2])
        dummy.scale.set(s.scale, s.scale, s.scale)
        dummy.rotation.set(0, s.rotY, 0)
        dummy.updateMatrix()
        shrubRef.current?.setMatrixAt(i, dummy.matrix)
      })
      shrubRef.current.instanceMatrix.needsUpdate = true
    }

    // 5. Rocks
    if (rockRef.current) {
      sceneryData.rocks.forEach((r, i) => {
        dummy.position.set(r.pos[0], r.pos[1], r.pos[2])
        dummy.scale.set(r.scale[0], r.scale[1], r.scale[2])
        dummy.rotation.set(r.rot[0], r.rot[1], r.rot[2])
        dummy.updateMatrix()
        rockRef.current?.setMatrixAt(i, dummy.matrix)
      })
      rockRef.current.instanceMatrix.needsUpdate = true
    }

    // 6. Grass Tufts
    if (grassRef.current) {
      sceneryData.grassTufts.forEach((g, i) => {
        dummy.position.set(g.pos[0], g.pos[1], g.pos[2])
        dummy.scale.set(g.scale, g.scale, g.scale)
        dummy.rotation.set(0, g.rotY, 0)
        dummy.updateMatrix()
        grassRef.current?.setMatrixAt(i, dummy.matrix)
      })
      grassRef.current.instanceMatrix.needsUpdate = true
    }

    // 7. Utility Poles
    if (poleRef.current) {
      sceneryData.poles.forEach((p, i) => {
        dummy.position.set(p.pos[0], p.pos[1], p.pos[2])
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

      {/* 2. Curved Asphalt Highway Ribbon with Calibrated PBR Texture & Camber */}
      <mesh geometry={roadGeo} receiveShadow>
        <meshStandardMaterial
          map={asphaltTex}
          bumpMap={asphaltBumpTex}
          bumpScale={0.018}
          color="#ffffff"
          roughness={isRaining ? 0.08 : biomeConfig.id === 'tundra' ? 0.42 : 0.65}
          metalness={isRaining ? 0.45 : 0.08}
          envMapIntensity={isRaining ? 1.6 : 0.8}
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

      {/* 4. Highway Markings: Yellow Dashed Centerline + Symmetrical Dual White Edge Lines */}
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

      {/* 6. Multi-Tiered Mountain Pines (Conifers) */}
      <instancedMesh
        ref={pineTrunkRef}
        args={[pineTrunkGeo, undefined, 36]}
        count={sceneryData.pines.length}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={biomeConfig.treeTrunkColor} roughness={0.88} />
      </instancedMesh>
      <instancedMesh
        ref={pineCanopyRef}
        args={[pineCanopyGeo, undefined, 36]}
        count={sceneryData.pines.length}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={biomeConfig.id === 'tundra' ? '#e2e8f0' : biomeConfig.treeFoliageColor}
          roughness={0.82}
        />
      </instancedMesh>

      {/* 7. Organic Broadleaf / Mountain Maples */}
      <instancedMesh
        ref={broadleafTrunkRef}
        args={[broadleafTrunkGeo, undefined, 36]}
        count={sceneryData.broadleafs.length}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={biomeConfig.treeTrunkColor} roughness={0.88} />
      </instancedMesh>
      <instancedMesh
        ref={broadleafCanopyRef}
        args={[broadleafCanopyGeo, undefined, 36]}
        count={sceneryData.broadleafs.length}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={biomeConfig.treeFoliageColor} roughness={0.76} />
      </instancedMesh>

      {/* 8. Desert Saguaro Cacti */}
      <instancedMesh
        ref={saguaroRef}
        args={[saguaroGeo, undefined, 24]}
        count={sceneryData.saguaros.length}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#166534" roughness={0.85} />
      </instancedMesh>

      {/* 9. Mountain Shrubs & Roadside Bushes */}
      <instancedMesh
        ref={shrubRef}
        args={[shrubGeo, undefined, 24]}
        count={sceneryData.shrubs.length}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={biomeConfig.id === 'desert' ? '#854d0e' : biomeConfig.treeFoliageColor}
          roughness={0.88}
        />
      </instancedMesh>

      {/* 10. Weathered Boulders & Rock Outcrops */}
      <instancedMesh
        ref={rockRef}
        args={[rockGeo, undefined, 24]}
        count={sceneryData.rocks.length}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={biomeConfig.rockColor} roughness={0.92} />
      </instancedMesh>

      {/* 11. Roadside Wild Grass Tufts */}
      <instancedMesh
        ref={grassRef}
        args={[grassTuftGeo, undefined, 36]}
        count={sceneryData.grassTufts.length}
        receiveShadow
      >
        <meshStandardMaterial
          color={biomeConfig.id === 'autumn' ? '#854d0e' : biomeConfig.treeFoliageColor}
          roughness={0.85}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      {/* 12. Roadside Highway Utility Poles */}
      <instancedMesh
        ref={poleRef}
        args={[poleGeo, undefined, 16]}
        count={sceneryData.poles.length}
        castShadow
      >
        <meshStandardMaterial color="#362316" roughness={0.95} />
      </instancedMesh>
    </group>
  )
}

// Predictive High-Speed Chunk Manager:
// Pre-generates a 2.4-kilometer forward horizon buffer (14 active chunks).
// Uses stable slot-based object pooling so React never unmounts/remounts components,
// eliminating GC freezes and guaranteeing the world stays 2+ km ahead of the vehicle at any speed.
const NUM_CHUNKS = 14
const CHUNKS_BEHIND = 2

export default function Terrain() {
  const biome = useGameStore((state) => state.biome)
  const weather = useGameStore((state) => state.weather)
  const { camera } = useThree()

  // Initial chunks spanning 400m behind down to -2200m ahead
  const [chunkSlots, setChunkSlots] = useState<number[]>(() => {
    const initial: number[] = []
    for (let i = 0; i < NUM_CHUNKS; i++) {
      initial.push((CHUNKS_BEHIND - i) * CHUNK_LEN)
    }
    return initial
  })

  // Ref to track chunk slots synchronously across frames without React re-render lag
  const slotsRef = useRef<number[]>(chunkSlots)
  slotsRef.current = chunkSlots

  const isRecyclingRef = useRef(false)

  useFrame(() => {
    const camZ = camera.position.z

    // Find the rearmost chunk (highest Z value, since forward is negative Z)
    let rearmostIdx = 0
    let rearmostZ = slotsRef.current[0]
    let frontmostZ = slotsRef.current[0]

    for (let i = 0; i < NUM_CHUNKS; i++) {
      const z = slotsRef.current[i]
      if (z > rearmostZ) {
        rearmostZ = z
        rearmostIdx = i
      }
      if (z < frontmostZ) {
        frontmostZ = z
      }
    }

    // If the rearmost chunk is further behind the camera than (CHUNKS_BEHIND * CHUNK_LEN + 60m):
    const retireThreshold = camZ + (CHUNKS_BEHIND + 0.3) * CHUNK_LEN
    if (rearmostZ > retireThreshold && !isRecyclingRef.current) {
      isRecyclingRef.current = true
      const nextFrontZ = frontmostZ - CHUNK_LEN

      // Recycle the single rearmost slot to the far front horizon
      const updated = [...slotsRef.current]
      updated[rearmostIdx] = nextFrontZ
      slotsRef.current = updated
      setChunkSlots(updated)

      // Throttle recycling to avoid multiple updates in the same frame
      setTimeout(() => {
        isRecyclingRef.current = false
      }, 16)
    }
  })

  return (
    <group>
      {chunkSlots.map((cz, slotIndex) => {
        const chunkBiome = getActiveBiomeAt(cz, biome)
        return (
          <TerrainChunkTile
            key={slotIndex}
            chunkZ={cz}
            biomeConfig={chunkBiome}
            isRaining={weather === 'rain'}
          />
        )
      })}
    </group>
  )
}
