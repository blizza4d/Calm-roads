import { useMemo, useRef, useEffect, useLayoutEffect, useState, memo } from 'react'
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
import { getAsphaltTexture, getAsphaltBumpTexture, getTerrainBumpTexture, getWoodBumpTexture } from '../../../utils/asphaltTexture'
import { requestTerrainChunk } from '../../../workers/terrainWorkerPool'

const CHUNK_LEN = 200
const TERRAIN_W = 1200
const GRID_X = 96
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
// 1. Alpine / Mountain Conifer: 5-tiered organic asymmetrical conical skirt canopy
const pineCanopyGeo = (() => {
  const t1 = new THREE.ConeGeometry(2.5, 2.1, 10).translate(0, 2.0, 0)
  const t2 = new THREE.ConeGeometry(2.05, 1.9, 10).rotateY(0.4).translate(0, 3.2, 0)
  const t3 = new THREE.ConeGeometry(1.55, 1.7, 10).rotateY(-0.3).translate(0, 4.4, 0)
  const t4 = new THREE.ConeGeometry(1.05, 1.5, 9).rotateY(0.6).translate(0, 5.5, 0)
  const t5 = new THREE.ConeGeometry(0.55, 1.2, 8).rotateY(-0.5).translate(0, 6.4, 0)
  return mergeBufferGeometries([t1, t2, t3, t4, t5])
})()
const pineTrunkGeo = new THREE.CylinderGeometry(0.16, 0.45, 5.2, 8).translate(0, 2.6, 0)

// 2. Deciduous Broadleaf / Mountain Maple: Organic 5-cluster asymmetrical canopy
const broadleafCanopyGeo = (() => {
  const c1 = new THREE.DodecahedronGeometry(1.8, 1).translate(0, 4.0, 0)
  const c2 = new THREE.DodecahedronGeometry(1.35, 1).translate(-0.85, 3.6, 0.35)
  const c3 = new THREE.DodecahedronGeometry(1.4, 1).translate(0.8, 3.7, -0.3)
  const c4 = new THREE.DodecahedronGeometry(1.1, 1).translate(0.1, 3.2, 0.85)
  const c5 = new THREE.DodecahedronGeometry(1.15, 1).translate(-0.2, 3.5, -0.8)
  return mergeBufferGeometries([c1, c2, c3, c4, c5])
})()
const broadleafTrunkGeo = new THREE.CylinderGeometry(0.2, 0.48, 4.2, 8).translate(0, 2.1, 0)

// 3. Desert Saguaro Cactus: Multi-armed branching columnar cactus with accordion pleats & dome caps
const saguaroGeo = (() => {
  // Main fluted trunk with accordion pleats
  const main = new THREE.CylinderGeometry(0.34, 0.38, 5.0, 16, 10)
  const mainPos = main.attributes.position
  for (let i = 0; i < mainPos.count; i++) {
    const x = mainPos.getX(i)
    const z = mainPos.getZ(i)
    const r = Math.sqrt(x * x + z * z)
    if (r > 0.05) {
      const angle = Math.atan2(z, x)
      const flute = Math.sin(angle * 12) * 0.028
      const newR = r + flute
      mainPos.setX(i, Math.cos(angle) * newR)
      mainPos.setZ(i, Math.sin(angle) * newR)
    }
  }
  main.translate(0, 2.5, 0)
  main.computeVertexNormals()

  // Dome cap on main trunk
  const mainCap = new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 5.0, 0)

  // Left branching arm (curved elbow + vertical column + dome cap)
  const armLHoriz = new THREE.CylinderGeometry(0.2, 0.22, 0.75, 10).rotateZ(Math.PI / 2).translate(-0.55, 2.4, 0)
  const armLElbow = new THREE.SphereGeometry(0.21, 10, 8).translate(-0.95, 2.4, 0)
  const armLVert = new THREE.CylinderGeometry(0.19, 0.21, 1.6, 10).translate(-0.95, 3.2, 0)
  const armLCap = new THREE.SphereGeometry(0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(-0.95, 4.0, 0)

  // Right branching arm (higher offset, organic asymmetry)
  const armRHoriz = new THREE.CylinderGeometry(0.18, 0.2, 0.75, 10).rotateZ(-Math.PI / 2).translate(0.55, 3.0, 0)
  const armRElbow = new THREE.SphereGeometry(0.19, 10, 8).translate(0.95, 3.0, 0)
  const armRVert = new THREE.CylinderGeometry(0.17, 0.19, 1.35, 10).translate(0.95, 3.7, 0)
  const armRCap = new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0.95, 4.38, 0)

  const merged = mergeBufferGeometries([
    main, mainCap,
    armLHoriz, armLElbow, armLVert, armLCap,
    armRHoriz, armRElbow, armRVert, armRCap
  ])
  merged.computeVertexNormals()
  return merged
})()

// 4. Roadside Shrub / Bush: Multi-lobed low foliage clump
const shrubGeo = (() => {
  const s1 = new THREE.DodecahedronGeometry(0.95, 1).scale(1.2, 0.7, 1.1).translate(0, 0.55, 0)
  const s2 = new THREE.DodecahedronGeometry(0.7, 1).scale(1.1, 0.65, 1.0).translate(-0.45, 0.42, 0.2)
  const s3 = new THREE.DodecahedronGeometry(0.75, 1).scale(1.0, 0.65, 1.1).translate(0.42, 0.45, -0.25)
  return mergeBufferGeometries([s1, s2, s3])
})()

// 5. Geological Weathered Boulders with sharp fracture cleavage planes
const rockGeo = (() => {
  const geo = new THREE.DodecahedronGeometry(1.5, 1)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    // Geological strata cleavage planes and natural chisel facets
    const strata = Math.sin(y * 2.8) * 0.12
    const cleavage = Math.sin(x * 1.9 + z * 1.6) * 0.15
    const facet = Math.sin(x * 3.8 + y * 1.8) * 0.07
    // Ground embedding: flatten base slightly
    const yFlatten = y < -0.4 ? y * 0.5 - 0.2 : y * 0.75
    pos.setXYZ(i, x * (1.15 + strata) + cleavage * 0.18, yFlatten + strata * 0.35, z * (0.95 - strata) + facet * 0.12)
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

// 7. Highway Utility Pole: Heavy creosote timber mast, crossarm, metal angle braces, ceramic insulators, transformer & apex spike
const poleGeo = (() => {
  // Tapered Creosote Timber Mast
  const mast = new THREE.CylinderGeometry(0.13, 0.19, 7.2, 10).translate(0, 3.6, 0)

  // Heavy Horizontal Wooden Crossarm
  const crossarm = new THREE.BoxGeometry(2.3, 0.13, 0.13).translate(0, 6.4, 0)

  // Diagonal Metal Support Braces
  const braceL = new THREE.BoxGeometry(0.035, 0.95, 0.035).rotateZ(0.72).translate(-0.46, 6.0, 0.08)
  const braceR = new THREE.BoxGeometry(0.035, 0.95, 0.035).rotateZ(-0.72).translate(0.46, 6.0, 0.08)

  // Ceramic Bell Insulators atop Crossarm
  const insulL = new THREE.CylinderGeometry(0.045, 0.065, 0.22, 8).translate(-0.92, 6.56, 0)
  const insulC = new THREE.CylinderGeometry(0.045, 0.065, 0.22, 8).translate(0, 6.56, 0)
  const insulR = new THREE.CylinderGeometry(0.045, 0.065, 0.22, 8).translate(0.92, 6.56, 0)

  // Metal Apex Lightning Ground Spike
  const spike = new THREE.ConeGeometry(0.03, 0.38, 6).translate(0, 7.38, 0)

  // Distribution Transformer on Pole Mast
  const trans = new THREE.CylinderGeometry(0.15, 0.15, 0.48, 8).translate(0.28, 5.75, 0)

  const merged = mergeBufferGeometries([
    mast, crossarm, braceL, braceR, insulL, insulC, insulR, spike, trans
  ])
  merged.computeVertexNormals()
  return merged
})()

// 8. Highway Reflector Delineator Posts (Guide Posts / Leitpfosten)
const delineatorPostGeo = new THREE.BoxGeometry(0.12, 1.05, 0.08).translate(0, 0.525, 0)
const delineatorReflectorGeo = new THREE.BoxGeometry(0.08, 0.18, 0.085).translate(0, 0.88, 0)

// Pre-assign chunk-spanning bounding spheres to all instanced geometries to enable
// hardware-accelerated frustum culling without edge-of-screen false-culling pops
const CHUNK_SPHERE = new THREE.Sphere(new THREE.Vector3(0, 30, 0), 220)
pineTrunkGeo.boundingSphere = CHUNK_SPHERE
pineCanopyGeo.boundingSphere = CHUNK_SPHERE
broadleafTrunkGeo.boundingSphere = CHUNK_SPHERE
broadleafCanopyGeo.boundingSphere = CHUNK_SPHERE
saguaroGeo.boundingSphere = CHUNK_SPHERE
shrubGeo.boundingSphere = CHUNK_SPHERE
rockGeo.boundingSphere = CHUNK_SPHERE
grassTuftGeo.boundingSphere = CHUNK_SPHERE
poleGeo.boundingSphere = CHUNK_SPHERE
delineatorPostGeo.boundingSphere = CHUNK_SPHERE
delineatorReflectorGeo.boundingSphere = CHUNK_SPHERE

// ----------------------------------------------------------------------------
// Shared Static Materials: Pre-allocated once to eliminate 200+ redundant WebGL material state changes
// ----------------------------------------------------------------------------
const sharedGuardrailMat = new THREE.MeshStandardMaterial({
  color: '#cbd5e1',
  metalness: 0.85,
  roughness: 0.25,
})

const sharedMarkingsMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.65,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
  depthTest: true,
  depthWrite: false,
  side: THREE.DoubleSide,
})

const sharedDelineatorPostMat = new THREE.MeshStandardMaterial({
  color: '#f8fafc',
  roughness: 0.45,
})

const sharedDelineatorReflectorMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  emissive: new THREE.Color('#f59e0b'),
  emissiveIntensity: 1.8,
  roughness: 0.12,
  toneMapped: false,
})

const sharedSaguaroMat = new THREE.MeshStandardMaterial({
  color: '#1e4e27',
  roughness: 0.86,
  metalness: 0.05,
})

const sharedPoleMat = new THREE.MeshStandardMaterial({
  color: '#382518',
  bumpMap: getWoodBumpTexture(),
  bumpScale: 0.024,
  roughness: 0.92,
})

// Persistent reusable Object3D to eliminate GC memory churn during instanced scenery updates
const _dummy = new THREE.Object3D()

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
const TerrainChunkTile = memo(function TerrainChunkTile({ chunkZ, biomeConfig, isRaining }: ChunkProps) {
  const asphaltTex = useMemo(() => getAsphaltTexture(), [])
  const asphaltBumpTex = useMemo(() => getAsphaltBumpTexture(), [])
  const terrainBumpTex = useMemo(() => getTerrainBumpTexture(), [])

  // Triplanar Shader for seamless rock strata & granular soil texture on steep terrain
  const onTerrainMaterialCompile = useMemo(() => {
    return (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vCustomWorldPos;
         varying vec3 vCustomWorldNorm;`
      )
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vCustomWorldPos = worldPosition.xyz;
         vCustomWorldNorm = normalize(mat3(modelMatrix) * normal);`
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vCustomWorldPos;
         varying vec3 vCustomWorldNorm;`
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         vec3 triWeight = abs(vCustomWorldNorm);
         triWeight = normalize(max(triWeight, 0.001));
         float bSum = triWeight.x + triWeight.y + triWeight.z;
         triWeight /= bSum;

         // Continuous per-pixel altitude-based alpine snow blending on mountain peaks
         float snowLine = 48.0;
         float snowCeiling = 82.0;
         float altT = clamp((vCustomWorldPos.y - snowLine) / (snowCeiling - snowLine), 0.0, 1.0);
         float snowCoverage = smoothstep(0.0, 1.0, altT);
         float slopeHold = clamp(vCustomWorldNorm.y * 1.25, 0.0, 1.0);
         float finalSnow = snowCoverage * (0.35 + 0.65 * slopeHold);
         vec3 alpineSnow = vec3(0.95, 0.97, 1.0);
         diffuseColor.rgb = mix(diffuseColor.rgb, alpineSnow, finalSnow * 0.85);
         roughnessFactor = mix(roughnessFactor, 0.42, finalSnow * 0.85);`
      )
    }
  }, [])

  // --------------------------------------------------------------------------
  // Geometry Buffer Pooling: Geometries are allocated ONCE per chunk slot.
  // When chunkZ recycles, Float32Array buffers are mutated in-place and flagged
  // with .needsUpdate = true, completely preventing GC spikes and VBO recreation.
  // --------------------------------------------------------------------------

  // 1. Terrain Ground Mesh Geometry (Pooled)
  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(TERRAIN_W, CHUNK_LEN, GRID_X, GRID_Z)
    geo.rotateX(-Math.PI / 2)
    const count = geo.attributes.position.count
    const colors = new Float32Array(count * 3)
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    // Initial synchronous populate so first frame ground is instantly available
    const pos = geo.attributes.position
    for (let i = 0; i < count; i++) {
      const localX = pos.getX(i)
      const localZ = pos.getZ(i)
      const worldZ = chunkZ + localZ
      const y = getTerrainHeight(localX, worldZ, biomeConfig.id)
      pos.setY(i, y)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()

    const normals = geo.attributes.normal
    const uvs = geo.attributes.uv.array as Float32Array
    const colArray = colors

    for (let i = 0; i < count; i++) {
      const ny = normals.getY(i)
      const px = pos.getX(i)
      const py = pos.getY(i)
      const pz = pos.getZ(i)
      const worldZ = chunkZ + pz
      const roadCx = getRoadCenter(worldZ)

      const steepness = Math.max(0, 1.0 - Math.min(1.0, Math.max(0.0, ny)))
      const baseU = px / TERRAIN_W + 0.5
      const baseV = pz / CHUNK_LEN + 0.5
      const uSlope = (px >= 0 ? 1 : -1) * (py / TERRAIN_W) * steepness * 1.6
      const vSlope = (py / CHUNK_LEN) * steepness * 1.8
      uvs[i * 2] = baseU + uSlope
      uvs[i * 2 + 1] = baseV + vSlope

      // Smooth slope blending (smoothstep Hermite transition between grass and rock)
      const rawSlope = Math.max(0, Math.min(1, (ny - 0.62) / 0.25))
      const slope = rawSlope * rawSlope * (3.0 - 2.0 * rawSlope)

      // Continuous world-coordinate variation across chunks (zero chunk boundary seams, zero horizontal stripes)
      const organicVar = (Math.sin(px * 0.018 + worldZ * 0.018) + Math.cos(px * 0.035 - worldZ * 0.028)) * 0.022

      // Continuous worldZ biome color sampling
      const vertexBiome = getActiveBiomeAt(worldZ, biomeConfig.id)
      const isDesert = vertexBiome.id === 'desert'
      const isTundra = vertexBiome.id === 'tundra'
      const isAutumn = vertexBiome.id === 'autumn'

      let cr = 0.18 * slope + 0.17 * (1 - slope)
      let cg = 0.24 * slope + 0.32 * (1 - slope)
      let cb = 0.28 * slope + 0.18 * (1 - slope)

      if (isDesert) {
        cr = 0.62 * slope + 0.74 * (1 - slope)
        cg = 0.44 * slope + 0.52 * (1 - slope)
        cb = 0.25 * slope + 0.30 * (1 - slope)
      } else if (isAutumn) {
        cr = 0.42 * slope + 0.48 * (1 - slope)
        cg = 0.26 * slope + 0.32 * (1 - slope)
        cb = 0.18 * slope + 0.14 * (1 - slope)
      } else if (isTundra) {
        cr = 0.40 * slope + 0.68 * (1 - slope)
        cg = 0.44 * slope + 0.72 * (1 - slope)
        cb = 0.50 * slope + 0.76 * (1 - slope)
      }

      // Smooth alpine summit snow transition
      if (isTundra && py > 22) {
        const snowT = Math.min(1.0, (py - 22) / 20.0)
        cr = cr * (1 - snowT) + 0.94 * snowT
        cg = cg * (1 - snowT) + 0.96 * snowT
        cb = cb * (1 - snowT) + 0.98 * snowT
      } else if (py > 62) {
        const snowT = Math.min(1.0, (py - 62) / 36.0)
        cr = cr * (1 - snowT) + 0.94 * snowT
        cg = cg * (1 - snowT) + 0.96 * snowT
        cb = cb * (1 - snowT) + 0.98 * snowT
      }

      const distFromCenter = Math.abs(px - roadCx)
      if (distFromCenter < ROAD_WIDTH / 2 + 5.5) {
        const blendToSoil = Math.max(0, 1 - (distFromCenter - (ROAD_WIDTH / 2 + 2.0)) / 3.5)
        cr = cr * (1 - blendToSoil * 0.45) + 0.36 * (blendToSoil * 0.45)
        cg = cg * (1 - blendToSoil * 0.45) + 0.32 * (blendToSoil * 0.45)
        cb = cb * (1 - blendToSoil * 0.45) + 0.28 * (blendToSoil * 0.45)
      }

      colArray[i * 3] = Math.max(0, Math.min(1, cr + organicVar))
      colArray[i * 3 + 1] = Math.max(0, Math.min(1, cg + organicVar))
      colArray[i * 3 + 2] = Math.max(0, Math.min(1, cb + organicVar))
    }
    geo.computeBoundingSphere()

    return geo
  }, [])

  // Web Worker offloaded heightmap & normal computation for smooth recycling without main-thread spikes
  useEffect(() => {
    let cancelled = false

    const applyWorkerData = (res: {
      positions: Float32Array
      normals: Float32Array
      colors: Float32Array
      uvs: Float32Array
    }) => {
      if (cancelled) return
      const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute
      ;(posAttr.array as Float32Array).set(res.positions)
      posAttr.needsUpdate = true

      const normAttr = terrainGeo.attributes.normal as THREE.BufferAttribute
      ;(normAttr.array as Float32Array).set(res.normals)
      normAttr.needsUpdate = true

      const uvAttr = terrainGeo.attributes.uv as THREE.BufferAttribute
      ;(uvAttr.array as Float32Array).set(res.uvs)
      uvAttr.needsUpdate = true

      const colAttr = terrainGeo.attributes.color as THREE.BufferAttribute
      ;(colAttr.array as Float32Array).set(res.colors)
      colAttr.needsUpdate = true

      terrainGeo.computeBoundingSphere()
    }

    const dispatched = requestTerrainChunk(
      chunkZ,
      biomeConfig.id,
      GRID_X,
      GRID_Z,
      CHUNK_LEN,
      TERRAIN_W,
      applyWorkerData
    )

    if (!dispatched) {
      // Synchronous fallback if Web Worker is unavailable
      const pos = terrainGeo.attributes.position
      const count = pos.count

      for (let i = 0; i < count; i++) {
        const localX = pos.getX(i)
        const localZ = pos.getZ(i)
        const worldZ = chunkZ + localZ
        const y = getTerrainHeight(localX, worldZ, biomeConfig.id)
        pos.setY(i, y)
      }
      pos.needsUpdate = true
      terrainGeo.computeVertexNormals()

      const normals = terrainGeo.attributes.normal
      const uvs = terrainGeo.attributes.uv.array as Float32Array
      const colorAttr = terrainGeo.attributes.color as THREE.BufferAttribute
      const colors = colorAttr.array as Float32Array

      for (let i = 0; i < count; i++) {
        const ny = normals.getY(i)
        const px = pos.getX(i)
        const py = pos.getY(i)
        const pz = pos.getZ(i)
        const worldZ = chunkZ + pz
        const roadCx = getRoadCenter(worldZ)

        const steepness = Math.max(0, 1.0 - Math.min(1.0, Math.max(0.0, ny)))
        const baseU = px / TERRAIN_W + 0.5
        const baseV = pz / CHUNK_LEN + 0.5
        const uSlope = (px >= 0 ? 1 : -1) * (py / TERRAIN_W) * steepness * 1.6
        const vSlope = (py / CHUNK_LEN) * steepness * 1.8
        uvs[i * 2] = baseU + uSlope
        uvs[i * 2 + 1] = baseV + vSlope

        // Smooth slope blending (smoothstep Hermite transition between grass and rock)
        const rawSlope = Math.max(0, Math.min(1, (ny - 0.62) / 0.25))
        const slope = rawSlope * rawSlope * (3.0 - 2.0 * rawSlope)

        // Continuous world-coordinate variation across chunks (zero chunk boundary seams, zero horizontal stripes)
        const organicVar = (Math.sin(px * 0.018 + worldZ * 0.018) + Math.cos(px * 0.035 - worldZ * 0.028)) * 0.022

        // Continuous worldZ biome color sampling
        const vertexBiome = getActiveBiomeAt(worldZ, biomeConfig.id)
        const isDesert = vertexBiome.id === 'desert'
        const isTundra = vertexBiome.id === 'tundra'
        const isAutumn = vertexBiome.id === 'autumn'

        let cr = 0.18 * slope + 0.17 * (1 - slope)
        let cg = 0.24 * slope + 0.32 * (1 - slope)
        let cb = 0.28 * slope + 0.18 * (1 - slope)

        if (isDesert) {
          cr = 0.62 * slope + 0.74 * (1 - slope)
          cg = 0.44 * slope + 0.52 * (1 - slope)
          cb = 0.25 * slope + 0.30 * (1 - slope)
        } else if (isAutumn) {
          cr = 0.42 * slope + 0.48 * (1 - slope)
          cg = 0.26 * slope + 0.32 * (1 - slope)
          cb = 0.18 * slope + 0.14 * (1 - slope)
        } else if (isTundra) {
          cr = 0.40 * slope + 0.68 * (1 - slope)
          cg = 0.44 * slope + 0.72 * (1 - slope)
          cb = 0.50 * slope + 0.76 * (1 - slope)
        }

        // Smooth alpine summit snow transition
        if (isTundra && py > 22) {
          const snowT = Math.min(1.0, (py - 22) / 20.0)
          cr = cr * (1 - snowT) + 0.94 * snowT
          cg = cg * (1 - snowT) + 0.96 * snowT
          cb = cb * (1 - snowT) + 0.98 * snowT
        } else if (py > 62) {
          const snowT = Math.min(1.0, (py - 62) / 36.0)
          cr = cr * (1 - snowT) + 0.94 * snowT
          cg = cg * (1 - snowT) + 0.96 * snowT
          cb = cb * (1 - snowT) + 0.98 * snowT
        }

        const distFromCenter = Math.abs(px - roadCx)
        if (distFromCenter < ROAD_WIDTH / 2 + 5.5) {
          const blendToSoil = Math.max(0, 1 - (distFromCenter - (ROAD_WIDTH / 2 + 2.0)) / 3.5)
          cr = cr * (1 - blendToSoil * 0.45) + 0.36 * (blendToSoil * 0.45)
          cg = cg * (1 - blendToSoil * 0.45) + 0.32 * (blendToSoil * 0.45)
          cb = cb * (1 - blendToSoil * 0.45) + 0.28 * (blendToSoil * 0.45)
        }

        colors[i * 3] = Math.max(0, Math.min(1, cr + organicVar))
        colors[i * 3 + 1] = Math.max(0, Math.min(1, cg + organicVar))
        colors[i * 3 + 2] = Math.max(0, Math.min(1, cb + organicVar))
      }
      terrainGeo.attributes.uv.needsUpdate = true
      colorAttr.needsUpdate = true
      normals.needsUpdate = true
      terrainGeo.computeBoundingSphere()
    }

    return () => {
      cancelled = true
    }
  }, [chunkZ, biomeConfig, terrainGeo])

  // 2. Curved Asphalt Highway Ribbon Geometry (Pooled)
  const roadGeo = useMemo(() => {
    const segments = 50
    const geo = new THREE.BufferGeometry()
    const posArr = new Float32Array((segments + 1) * 3 * 3)
    const normArr = new Float32Array((segments + 1) * 3 * 3)
    const uvArr = new Float32Array((segments + 1) * 3 * 2)
    const indices: number[] = []

    for (let i = 0; i <= segments; i++) {
      const idx = i * 3
      uvArr[idx * 2] = 0
      uvArr[idx * 2 + 1] = i * 0.8
      uvArr[(idx + 1) * 2] = 0.5
      uvArr[(idx + 1) * 2 + 1] = i * 0.8
      uvArr[(idx + 2) * 2] = 1.0
      uvArr[(idx + 2) * 2 + 1] = i * 0.8

      if (i < segments) {
        const row1 = i * 3
        const row2 = (i + 1) * 3
        indices.push(row1, row2, row1 + 1)
        indices.push(row1 + 1, row2, row2 + 1)
        indices.push(row1 + 1, row2 + 1, row1 + 2)
        indices.push(row1 + 2, row2 + 1, row2 + 2)
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2))
    geo.setIndex(indices)
    return geo
  }, [])

  useMemo(() => {
    const segments = 50
    const pos = roadGeo.attributes.position.array as Float32Array
    const norm = roadGeo.attributes.normal.array as Float32Array
    const uv = roadGeo.attributes.uv.array as Float32Array
    const halfW = ROAD_WIDTH / 2

    for (let i = 0; i <= segments; i++) {
      const localZ = CHUNK_LEN / 2 - (i / segments) * CHUNK_LEN
      const worldZ = chunkZ + localZ
      const cx = getRoadCenter(worldZ)
      const cy = getRoadElevation(worldZ) + 0.085
      const { nx, nz } = getRoadTangent(worldZ)
      const v = worldZ / 24.0

      const baseIdx = i * 9
      // Left edge
      pos[baseIdx] = cx - nx * halfW
      pos[baseIdx + 1] = cy - 0.015
      pos[baseIdx + 2] = localZ - nz * halfW
      norm[baseIdx] = -nx * 0.1
      norm[baseIdx + 1] = 0.98
      norm[baseIdx + 2] = -nz * 0.1

      // Center crown
      pos[baseIdx + 3] = cx
      pos[baseIdx + 4] = cy + 0.025
      pos[baseIdx + 5] = localZ
      norm[baseIdx + 3] = 0
      norm[baseIdx + 4] = 1
      norm[baseIdx + 5] = 0

      // Right edge
      pos[baseIdx + 6] = cx + nx * halfW
      pos[baseIdx + 7] = cy - 0.015
      pos[baseIdx + 8] = localZ + nz * halfW
      norm[baseIdx + 6] = nx * 0.1
      norm[baseIdx + 7] = 0.98
      norm[baseIdx + 8] = nz * 0.1

      const uvIdx = i * 6
      uv[uvIdx] = 0
      uv[uvIdx + 1] = v
      uv[uvIdx + 2] = 0.5
      uv[uvIdx + 3] = v
      uv[uvIdx + 4] = 1.0
      uv[uvIdx + 5] = v
    }
    roadGeo.attributes.position.needsUpdate = true
    roadGeo.attributes.normal.needsUpdate = true
    roadGeo.attributes.uv.needsUpdate = true
    roadGeo.computeBoundingSphere()
    roadGeo.computeBoundingBox()
  }, [chunkZ, roadGeo])

  // 3. Roadside Gravel / Dirt Shoulder Strips (Pooled)
  const shoulderGeo = useMemo(() => {
    const segments = 32
    const geo = new THREE.BufferGeometry()
    const posArr = new Float32Array((segments + 1) * 4 * 3)
    const normArr = new Float32Array((segments + 1) * 4 * 3)
    const indices: number[] = []

    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j < 4; j++) {
        const nIdx = (i * 4 + j) * 3
        normArr[nIdx] = 0
        normArr[nIdx + 1] = 1
        normArr[nIdx + 2] = 0
      }
      if (i < segments) {
        const base = i * 4
        indices.push(base, base + 1, base + 4)
        indices.push(base + 1, base + 5, base + 4)
        indices.push(base + 2, base + 6, base + 3)
        indices.push(base + 3, base + 6, base + 7)
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3))
    geo.setIndex(indices)
    return geo
  }, [])

  useMemo(() => {
    const segments = 32
    const pos = shoulderGeo.attributes.position.array as Float32Array
    const innerW = ROAD_WIDTH / 2
    const outerW = ROAD_WIDTH / 2 + 2.2

    for (let i = 0; i <= segments; i++) {
      const localZ = CHUNK_LEN / 2 - (i / segments) * CHUNK_LEN
      const worldZ = chunkZ + localZ
      const cx = getRoadCenter(worldZ)
      const cy = getRoadElevation(worldZ) + 0.065
      const { nx, nz } = getRoadTangent(worldZ)

      const baseIdx = i * 12
      // Left shoulder (inner to outer)
      pos[baseIdx] = cx - nx * innerW
      pos[baseIdx + 1] = cy
      pos[baseIdx + 2] = localZ - nz * innerW

      pos[baseIdx + 3] = cx - nx * outerW
      pos[baseIdx + 4] = cy - 0.05
      pos[baseIdx + 5] = localZ - nz * outerW

      // Right shoulder (inner to outer)
      pos[baseIdx + 6] = cx + nx * innerW
      pos[baseIdx + 7] = cy
      pos[baseIdx + 8] = localZ + nz * innerW

      pos[baseIdx + 9] = cx + nx * outerW
      pos[baseIdx + 10] = cy - 0.05
      pos[baseIdx + 11] = localZ + nz * outerW
    }
    shoulderGeo.attributes.position.needsUpdate = true
    shoulderGeo.computeBoundingSphere()
    shoulderGeo.computeBoundingBox()
  }, [chunkZ, shoulderGeo])

  // 4. Highway Markings: Yellow Dashed Centerline + White Solid Outer Edge Lines (Pooled)
  const markingsGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const dashSpacing = 14
    const numDashes = Math.floor(CHUNK_LEN / dashSpacing) // 14
    const edgeSegments = 36
    const totalVerts = numDashes * 4 + (edgeSegments + 1) * 4 // 56 + 148 = 204
    const posArr = new Float32Array(totalVerts * 3)
    const normArr = new Float32Array(totalVerts * 3)
    const colArr = new Float32Array(totalVerts * 3)
    const indices: number[] = []

    let vIdx = 0
    // Centerline indices & colors (traffic amber)
    for (let i = 0; i < numDashes; i++) {
      for (let j = 0; j < 4; j++) {
        normArr[(vIdx + j) * 3 + 1] = 1.0
        colArr[(vIdx + j) * 3] = 0.92
        colArr[(vIdx + j) * 3 + 1] = 0.64
        colArr[(vIdx + j) * 3 + 2] = 0.08
      }
      indices.push(vIdx, vIdx + 1, vIdx + 2)
      indices.push(vIdx + 1, vIdx + 3, vIdx + 2)
      vIdx += 4
    }

    // Outer edge boundary lines indices & colors (weathered highway white)
    const edgeBaseVert = vIdx
    for (let i = 0; i <= edgeSegments; i++) {
      for (let j = 0; j < 4; j++) {
        normArr[(edgeBaseVert + i * 4 + j) * 3 + 1] = 1.0
        colArr[(edgeBaseVert + i * 4 + j) * 3] = 0.82
        colArr[(edgeBaseVert + i * 4 + j) * 3 + 1] = 0.84
        colArr[(edgeBaseVert + i * 4 + j) * 3 + 2] = 0.86
      }
      if (i < edgeSegments) {
        const base = edgeBaseVert + i * 4
        indices.push(base, base + 1, base + 4)
        indices.push(base + 1, base + 5, base + 4)
        indices.push(base + 2, base + 3, base + 6)
        indices.push(base + 3, base + 7, base + 6)
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3))
    geo.setIndex(indices)
    return geo
  }, [])

  useMemo(() => {
    const pos = markingsGeo.attributes.position.array as Float32Array
    const dashSpacing = 14
    const dashLen = 7.0
    const halfLineW = 0.075
    const numDashes = Math.floor(CHUNK_LEN / dashSpacing)

    let vOffset = 0

    // A. Yellow Dashed Centerline positions
    for (let i = 0; i < numDashes; i++) {
      const localZCenter = CHUNK_LEN / 2 - (i * dashSpacing + dashSpacing * 0.5)
      const localZStart = localZCenter + dashLen / 2
      const localZEnd = localZCenter - dashLen / 2

      const wzStart = chunkZ + localZStart
      const wzEnd = chunkZ + localZEnd

      const cxStart = getRoadCenter(wzStart)
      const cyStart = getRoadElevation(wzStart) + 0.115
      const cxEnd = getRoadCenter(wzEnd)
      const cyEnd = getRoadElevation(wzEnd) + 0.115

      const tanStart = getRoadTangent(wzStart)
      const tanEnd = getRoadTangent(wzEnd)

      pos[vOffset] = cxStart - tanStart.nx * halfLineW
      pos[vOffset + 1] = cyStart
      pos[vOffset + 2] = localZStart - tanStart.nz * halfLineW

      pos[vOffset + 3] = cxStart + tanStart.nx * halfLineW
      pos[vOffset + 4] = cyStart
      pos[vOffset + 5] = localZStart + tanStart.nz * halfLineW

      pos[vOffset + 6] = cxEnd - tanEnd.nx * halfLineW
      pos[vOffset + 7] = cyEnd
      pos[vOffset + 8] = localZEnd - tanEnd.nz * halfLineW

      pos[vOffset + 9] = cxEnd + tanEnd.nx * halfLineW
      pos[vOffset + 10] = cyEnd
      pos[vOffset + 11] = localZEnd + tanEnd.nz * halfLineW

      vOffset += 12
    }

    // B. Solid White Outer Edge Boundary positions
    const edgeOffset = ROAD_WIDTH / 2 - 0.45
    const edgeHalfW = 0.06
    const edgeSegments = 36

    for (let i = 0; i <= edgeSegments; i++) {
      const localZ = CHUNK_LEN / 2 - (i / edgeSegments) * CHUNK_LEN
      const worldZ = chunkZ + localZ
      const cx = getRoadCenter(worldZ)
      const cy = getRoadElevation(worldZ) + 0.078
      const { nx, nz } = getRoadTangent(worldZ)

      const lx = cx - nx * edgeOffset
      const lz = localZ - nz * edgeOffset
      pos[vOffset] = lx - nx * edgeHalfW
      pos[vOffset + 1] = cy
      pos[vOffset + 2] = lz - nz * edgeHalfW

      pos[vOffset + 3] = lx + nx * edgeHalfW
      pos[vOffset + 4] = cy
      pos[vOffset + 5] = lz + nz * edgeHalfW

      const rx = cx + nx * edgeOffset
      const rz = localZ + nz * edgeOffset
      pos[vOffset + 6] = rx - nx * edgeHalfW
      pos[vOffset + 7] = cy
      pos[vOffset + 8] = rz - nz * edgeHalfW

      pos[vOffset + 9] = rx + nx * edgeHalfW
      pos[vOffset + 10] = cy
      pos[vOffset + 11] = rz + nz * edgeHalfW

      vOffset += 12
    }

    markingsGeo.attributes.position.needsUpdate = true
    markingsGeo.computeBoundingSphere()
    markingsGeo.computeBoundingBox()
  }, [chunkZ, markingsGeo])

  // 5. Realistic Steel Highway Guardrails on Curved Outer Segments (Pooled)
  const guardrailGeo = useMemo(() => {
    const maxSegments = 28
    const geo = new THREE.BufferGeometry()
    const posArr = new Float32Array(maxSegments * 4 * 3)
    const normArr = new Float32Array(maxSegments * 4 * 3)
    const indices: number[] = []

    for (let i = 0; i < maxSegments; i++) {
      const v = i * 4
      indices.push(v, v + 1, v + 2)
      indices.push(v + 1, v + 3, v + 2)
    }

    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3))
    geo.setIndex(indices)
    return geo
  }, [])

  useMemo(() => {
    const segments = 28
    const pos = guardrailGeo.attributes.position.array as Float32Array
    const norm = guardrailGeo.attributes.normal.array as Float32Array
    const railOffset = ROAD_WIDTH / 2 + 1.2
    const railHeight = 0.65
    const railThickness = 0.22

    let quadCount = 0

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

        const pIdx = quadCount * 12
        pos[pIdx] = p1x
        pos[pIdx + 1] = cy1 + railHeight
        pos[pIdx + 2] = p1z

        pos[pIdx + 3] = p1x
        pos[pIdx + 4] = cy1 + railHeight - railThickness
        pos[pIdx + 5] = p1z

        pos[pIdx + 6] = p2x
        pos[pIdx + 7] = cy2 + railHeight
        pos[pIdx + 8] = p2z

        pos[pIdx + 9] = p2x
        pos[pIdx + 10] = cy2 + railHeight - railThickness
        pos[pIdx + 11] = p2z

        for (let j = 0; j < 4; j++) {
          norm[pIdx + j * 3] = tan1.nx * side
          norm[pIdx + j * 3 + 1] = 0
          norm[pIdx + j * 3 + 2] = tan1.nz * side
        }
        quadCount++
      }
    }

    if (quadCount > 0) {
      guardrailGeo.attributes.position.needsUpdate = true
      guardrailGeo.attributes.normal.needsUpdate = true
      guardrailGeo.setDrawRange(0, quadCount * 6)
      guardrailGeo.computeBoundingSphere()
      guardrailGeo.computeBoundingBox()
    } else {
      guardrailGeo.setDrawRange(0, 0)
    }
  }, [chunkZ, guardrailGeo])

  // 6. Natural Clustered Roadside Scenery (Trees, Boulders, Grass Tufts, Poles)
  const sceneryData = useMemo(() => {
    const pines: { pos: [number, number, number]; scale: number; rotY: number }[] = []
    const broadleafs: { pos: [number, number, number]; scale: number; rotY: number }[] = []
    const saguaros: { pos: [number, number, number]; scale: number; rotY: number }[] = []
    const shrubs: { pos: [number, number, number]; scale: number; rotY: number }[] = []
    const rocks: { pos: [number, number, number]; scale: [number, number, number]; rot: [number, number, number] }[] = []
    const grassTufts: { pos: [number, number, number]; scale: number; rotY: number }[] = []
    const poles: { pos: [number, number, number] }[] = []
    const delineators: { pos: [number, number, number]; rotY: number }[] = []

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

    // Roadside Reflector Delineator Posts (Guide Posts along both shoulders)
    const numDelineators = 8
    const delineatorSpacing = CHUNK_LEN / numDelineators
    for (let d = 0; d < numDelineators; d++) {
      const delinZ = -CHUNK_LEN / 2 + d * delineatorSpacing + delineatorSpacing * 0.5
      const worldZ = chunkZ + delinZ
      const roadCx = getRoadCenter(worldZ)
      const roadY = getRoadElevation(worldZ)
      const sides = [-1, 1]
      sides.forEach((side) => {
        const delinX = roadCx + side * (ROAD_WIDTH / 2 + 1.15)
        delineators.push({
          pos: [delinX, roadY, delinZ],
          rotY: side === -1 ? 0.06 : -0.06,
        })
      })
    }

    return { pines, broadleafs, saguaros, shrubs, rocks, grassTufts, poles, delineators }
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
  const delineatorPostRef = useRef<THREE.InstancedMesh>(null)
  const delineatorReflectorRef = useRef<THREE.InstancedMesh>(null)

  // Synchronous Matrix Updates before paint to prevent 1-frame visual popping (Zero GC allocations)
  useLayoutEffect(() => {
    // 1. Pines
    if (pineTrunkRef.current && pineCanopyRef.current) {
      sceneryData.pines.forEach((p, i) => {
        _dummy.position.set(p.pos[0], p.pos[1], p.pos[2])
        _dummy.scale.set(p.scale, p.scale, p.scale)
        _dummy.rotation.set(0, p.rotY, 0)
        _dummy.updateMatrix()
        pineTrunkRef.current?.setMatrixAt(i, _dummy.matrix)
        pineCanopyRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      pineTrunkRef.current.instanceMatrix.needsUpdate = true
      pineCanopyRef.current.instanceMatrix.needsUpdate = true
    }

    // 2. Broadleafs
    if (broadleafTrunkRef.current && broadleafCanopyRef.current) {
      sceneryData.broadleafs.forEach((b, i) => {
        _dummy.position.set(b.pos[0], b.pos[1], b.pos[2])
        _dummy.scale.set(b.scale, b.scale, b.scale)
        _dummy.rotation.set(0, b.rotY, 0)
        _dummy.updateMatrix()
        broadleafTrunkRef.current?.setMatrixAt(i, _dummy.matrix)
        broadleafCanopyRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      broadleafTrunkRef.current.instanceMatrix.needsUpdate = true
      broadleafCanopyRef.current.instanceMatrix.needsUpdate = true
    }

    // 3. Saguaros
    if (saguaroRef.current) {
      sceneryData.saguaros.forEach((s, i) => {
        _dummy.position.set(s.pos[0], s.pos[1], s.pos[2])
        _dummy.scale.set(s.scale, s.scale, s.scale)
        _dummy.rotation.set(0, s.rotY, 0)
        _dummy.updateMatrix()
        saguaroRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      saguaroRef.current.instanceMatrix.needsUpdate = true
    }

    // 4. Shrubs
    if (shrubRef.current) {
      sceneryData.shrubs.forEach((s, i) => {
        _dummy.position.set(s.pos[0], s.pos[1], s.pos[2])
        _dummy.scale.set(s.scale, s.scale, s.scale)
        _dummy.rotation.set(0, s.rotY, 0)
        _dummy.updateMatrix()
        shrubRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      shrubRef.current.instanceMatrix.needsUpdate = true
    }

    // 5. Rocks
    if (rockRef.current) {
      sceneryData.rocks.forEach((r, i) => {
        _dummy.position.set(r.pos[0], r.pos[1], r.pos[2])
        _dummy.scale.set(r.scale[0], r.scale[1], r.scale[2])
        _dummy.rotation.set(r.rot[0], r.rot[1], r.rot[2])
        _dummy.updateMatrix()
        rockRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      rockRef.current.instanceMatrix.needsUpdate = true
    }

    // 6. Grass Tufts
    if (grassRef.current) {
      sceneryData.grassTufts.forEach((g, i) => {
        _dummy.position.set(g.pos[0], g.pos[1], g.pos[2])
        _dummy.scale.set(g.scale, g.scale, g.scale)
        _dummy.rotation.set(0, g.rotY, 0)
        _dummy.updateMatrix()
        grassRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      grassRef.current.instanceMatrix.needsUpdate = true
    }

    // 7. Utility Poles
    if (poleRef.current) {
      sceneryData.poles.forEach((p, i) => {
        _dummy.position.set(p.pos[0], p.pos[1], p.pos[2])
        _dummy.scale.set(1, 1, 1)
        _dummy.rotation.set(0, 0, 0)
        _dummy.updateMatrix()
        poleRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      poleRef.current.instanceMatrix.needsUpdate = true
    }

    // 8. Roadside Reflector Delineator Posts
    if (delineatorPostRef.current && delineatorReflectorRef.current) {
      sceneryData.delineators.forEach((d, i) => {
        _dummy.position.set(d.pos[0], d.pos[1], d.pos[2])
        _dummy.scale.set(1, 1, 1)
        _dummy.rotation.set(0, d.rotY, 0)
        _dummy.updateMatrix()
        delineatorPostRef.current?.setMatrixAt(i, _dummy.matrix)
        delineatorReflectorRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      delineatorPostRef.current.instanceMatrix.needsUpdate = true
      delineatorReflectorRef.current.instanceMatrix.needsUpdate = true
    }
  }, [sceneryData])

  // Distance-Based Level of Detail (LOD) Culling:
  // Dynamically gates instanced mesh instance count based on distance to camera,
  // completely eliminating thousands of invisible micro-foliage and prop vertices
  const lodLevelRef = useRef<number>(-1)

  useEffect(() => {
    lodLevelRef.current = -1
  }, [sceneryData])

  useFrame(({ camera }) => {
    const dist = Math.abs(chunkZ - camera.position.z)
    let newLod = 0
    if (dist > 1400) newLod = 3
    else if (dist > 850) newLod = 2
    else if (dist > 420) newLod = 1

    if (newLod !== lodLevelRef.current) {
      lodLevelRef.current = newLod

      const microMult = newLod >= 1 ? 0 : 1
      const midMult = newLod >= 2 ? 0 : 1
      const macroMult = newLod >= 3 ? 0 : 1

      if (grassRef.current) grassRef.current.count = sceneryData.grassTufts.length * microMult
      if (delineatorPostRef.current) delineatorPostRef.current.count = sceneryData.delineators.length * microMult
      if (delineatorReflectorRef.current) delineatorReflectorRef.current.count = sceneryData.delineators.length * microMult
      if (shrubRef.current) shrubRef.current.count = sceneryData.shrubs.length * microMult

      if (rockRef.current) rockRef.current.count = sceneryData.rocks.length * midMult
      if (poleRef.current) poleRef.current.count = sceneryData.poles.length * midMult

      if (pineTrunkRef.current) pineTrunkRef.current.count = sceneryData.pines.length * macroMult
      if (pineCanopyRef.current) pineCanopyRef.current.count = sceneryData.pines.length * macroMult
      if (broadleafTrunkRef.current) broadleafTrunkRef.current.count = sceneryData.broadleafs.length * macroMult
      if (broadleafCanopyRef.current) broadleafCanopyRef.current.count = sceneryData.broadleafs.length * macroMult
      if (saguaroRef.current) saguaroRef.current.count = sceneryData.saguaros.length * macroMult
    }
  })

  // Strict Three.js Memory Cleanup on unmount
  useEffect(() => {
    return () => {
      terrainGeo.dispose()
      roadGeo.dispose()
      shoulderGeo.dispose()
      markingsGeo.dispose()
      guardrailGeo.dispose()
    }
  }, [terrainGeo, roadGeo, shoulderGeo, markingsGeo, guardrailGeo])

  return (
    <group position={[0, 0, chunkZ]}>
      {/* 1. Terrain Surface Mesh with slope-based Rock/Grass Vertex Colors, Triplanar Strata & Micro-Relief */}
      <mesh geometry={terrainGeo} receiveShadow frustumCulled={true}>
        <meshStandardMaterial
          vertexColors
          bumpMap={terrainBumpTex}
          bumpScale={0.032}
          roughness={biomeConfig.roughness}
          metalness={0.04}
          onBeforeCompile={onTerrainMaterialCompile}
        />
      </mesh>

      {/* 2. Curved Asphalt Highway Ribbon with Calibrated PBR Texture & Camber */}
      <mesh geometry={roadGeo} receiveShadow renderOrder={2} frustumCulled={true}>
        <meshStandardMaterial
          map={asphaltTex}
          bumpMap={asphaltBumpTex}
          bumpScale={0.018}
          color="#ffffff"
          roughness={isRaining ? 0.08 : biomeConfig.id === 'tundra' ? 0.78 : 0.82}
          metalness={isRaining ? 0.45 : 0.04}
          envMapIntensity={isRaining ? 1.6 : 0.4}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* 3. Roadside Gravel Shoulder Strips */}
      <mesh geometry={shoulderGeo} receiveShadow renderOrder={1} frustumCulled={true}>
        <meshStandardMaterial
          color={biomeConfig.shoulderColor}
          roughness={0.92}
          metalness={0.06}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* 4. Highway Markings: Yellow Dashed Centerline + Symmetrical Dual White Edge Lines */}
      <mesh geometry={markingsGeo} material={sharedMarkingsMat} renderOrder={3} frustumCulled={true} />

      {/* 5. Steel W-Beam Guardrails on Outer Highway Curves (Pooled & DrawRange controlled) */}
      <mesh geometry={guardrailGeo} material={sharedGuardrailMat} castShadow receiveShadow frustumCulled={true} />

      {/* 6. Multi-Tiered Mountain Pines (Conifers) */}
      <instancedMesh
        ref={pineTrunkRef}
        args={[pineTrunkGeo, undefined, 36]}
        count={sceneryData.pines.length}
        castShadow
        receiveShadow
        frustumCulled={true}
      >
        <meshStandardMaterial color={biomeConfig.treeTrunkColor} roughness={0.88} />
      </instancedMesh>
      <instancedMesh
        ref={pineCanopyRef}
        args={[pineCanopyGeo, undefined, 36]}
        count={sceneryData.pines.length}
        castShadow
        receiveShadow
        frustumCulled={true}
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
        frustumCulled={true}
      >
        <meshStandardMaterial color={biomeConfig.treeTrunkColor} roughness={0.88} />
      </instancedMesh>
      <instancedMesh
        ref={broadleafCanopyRef}
        args={[broadleafCanopyGeo, undefined, 36]}
        count={sceneryData.broadleafs.length}
        castShadow
        receiveShadow
        frustumCulled={true}
      >
        <meshStandardMaterial color={biomeConfig.treeFoliageColor} roughness={0.76} />
      </instancedMesh>

      {/* 8. Desert Saguaro Cacti */}
      <instancedMesh
        ref={saguaroRef}
        args={[saguaroGeo, sharedSaguaroMat, 24]}
        count={sceneryData.saguaros.length}
        castShadow
        receiveShadow
        frustumCulled={true}
      />

      {/* 9. Mountain Shrubs & Roadside Bushes */}
      <instancedMesh
        ref={shrubRef}
        args={[shrubGeo, undefined, 24]}
        count={sceneryData.shrubs.length}
        receiveShadow
        frustumCulled={true}
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
        frustumCulled={true}
      >
        <meshStandardMaterial color={biomeConfig.rockColor} roughness={0.92} />
      </instancedMesh>

      {/* 11. Roadside Wild Grass Tufts */}
      <instancedMesh
        ref={grassRef}
        args={[grassTuftGeo, undefined, 36]}
        count={sceneryData.grassTufts.length}
        receiveShadow
        frustumCulled={true}
      >
        <meshStandardMaterial
          color={biomeConfig.id === 'autumn' ? '#854d0e' : biomeConfig.treeFoliageColor}
          roughness={0.85}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      {/* 12. Roadside Highway Utility Poles with Timber Grain */}
      <instancedMesh
        ref={poleRef}
        args={[poleGeo, sharedPoleMat, 16]}
        count={sceneryData.poles.length}
        castShadow
        frustumCulled={true}
      />

      {/* 13. Roadside Reflector Delineator Posts (Guide Posts) */}
      <instancedMesh
        ref={delineatorPostRef}
        args={[delineatorPostGeo, sharedDelineatorPostMat, 32]}
        count={sceneryData.delineators.length}
        receiveShadow
        frustumCulled={true}
      />

      {/* 14. Delineator Micro-Prismatic Retro-Reflectors (Headlight / Night Glow) */}
      <instancedMesh
        ref={delineatorReflectorRef}
        args={[delineatorReflectorGeo, sharedDelineatorReflectorMat, 32]}
        count={sceneryData.delineators.length}
        frustumCulled={true}
      />
    </group>
  )
}, (prev, next) => prev.chunkZ === next.chunkZ && prev.biomeConfig.id === next.biomeConfig.id && prev.isRaining === next.isRaining)

// Predictive High-Speed World Horizon Streaming Engine:
// Pre-generates 28 active chunks (5.6 kilometers continuous highway coverage).
// Guarantees >=4.8km forward horizon buffer ahead of the vehicle (3 chunks beyond 4,200m camera far plane).
// Uses rate-limited chunk recycling (1 chunk/frame max) to completely eliminate multi-chunk GC/computation stutters.
const NUM_CHUNKS = 28
const CHUNKS_BEHIND = 4

export default function Terrain() {
  const biome = useGameStore((state) => state.biome)
  const weather = useGameStore((state) => state.weather)
  const setDiagnostics = useGameStore((state) => state.setDiagnostics)
  const { camera } = useThree()
  const diagCounter = useRef(0)

  // Initial chunks spanning 600m behind down to -3000m ahead
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
  const lastCamZ = useRef<number>(camera.position.z)

  useFrame(() => {
    const camZ = camera.position.z

    // 1. Detect Vehicle Reset or Teleport (camZ jump > 180m)
    if (Math.abs(camZ - lastCamZ.current) > 180) {
      const centerChunkZ = Math.round(camZ / CHUNK_LEN) * CHUNK_LEN
      const recentered: number[] = []
      for (let i = 0; i < NUM_CHUNKS; i++) {
        recentered.push(centerChunkZ + (CHUNKS_BEHIND - i) * CHUNK_LEN)
      }
      slotsRef.current = recentered
      setChunkSlots(recentered)
      lastCamZ.current = camZ
      return
    }
    lastCamZ.current = camZ

    // 2. High-Speed Horizon Catchup (Bidirectional Streaming)
    let recycledCount = 0
    let didUpdate = false
    const currentSlots = [...slotsRef.current]

    // While rearmost chunk has safely passed behind camera, recycle it to the forward horizon
    // Rate-limited to at most 1 chunk per frame to guarantee a rock-solid 60 FPS without multi-chunk frame drops
    while (recycledCount < 1) {
      let rearmostIdx = 0
      let rearmostZ = currentSlots[0]
      let frontmostIdx = 0
      let frontmostZ = currentSlots[0]

      for (let i = 0; i < NUM_CHUNKS; i++) {
        const z = currentSlots[i]
        if (z > rearmostZ) {
          rearmostZ = z
          rearmostIdx = i
        }
        if (z < frontmostZ) {
          frontmostZ = z
          frontmostIdx = i
        }
      }

      // Forward driving retire threshold: safely past chase camera and rear-view sightline
      const retireRearThreshold = camZ + (CHUNKS_BEHIND + 0.25) * CHUNK_LEN
      // Reverse driving retire threshold: safely ahead of car when reversing
      const retireFrontThreshold = camZ - (NUM_CHUNKS - CHUNKS_BEHIND + 0.25) * CHUNK_LEN

      if (rearmostZ > retireRearThreshold) {
        // Forward driving: recycle rearmost chunk to forward horizon
        currentSlots[rearmostIdx] = frontmostZ - CHUNK_LEN
        recycledCount++
        didUpdate = true
      } else if (frontmostZ < retireFrontThreshold) {
        // Reverse driving: recycle forward chunk to rear horizon
        currentSlots[frontmostIdx] = rearmostZ + CHUNK_LEN
        recycledCount++
        didUpdate = true
      } else {
        break
      }
    }

    if (didUpdate) {
      slotsRef.current = currentSlots
      setChunkSlots(currentSlots)
    }

    // 3. Update Development Diagnostics (throttled every 15 frames ~ 250ms)
    diagCounter.current++
    if (diagCounter.current % 15 === 0) {
      let minZ = slotsRef.current[0]
      for (let i = 1; i < slotsRef.current.length; i++) {
        if (slotsRef.current[i] < minZ) minZ = slotsRef.current[i]
      }
      const buffer = Math.max(0, Math.round(camZ - minZ))
      setDiagnostics({
        activeChunks: NUM_CHUNKS,
        frontierBuffer: buffer,
        drawDistance: NUM_CHUNKS * CHUNK_LEN,
      })
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
