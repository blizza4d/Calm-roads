import * as THREE from 'three'
import {
  getRoadCenter,
  getRoadElevation,
  getTerrainHeight,
  ROAD_WIDTH,
  getActiveBiomeAt,
  type BiomeConfig,
} from '../../../../utils/roadMath'
import { validateChunkGeometry } from './terrainGeometries'

export const CHUNK_LEN = 200
export const TERRAIN_W = 1200
export const GRID_X = 64
export const GRID_Z = 32

export function createTerrainGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(TERRAIN_W, CHUNK_LEN, GRID_X, GRID_Z)
  geo.rotateX(-Math.PI / 2)
  const count = geo.attributes.position.count
  const colors = new Float32Array(count * 3)
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 900)
  return geo
}

export function updateTerrainGeometry(
  terrainGeo: THREE.BufferGeometry,
  chunkZ: number,
  biomeConfig: BiomeConfig
): void {
  const pos = terrainGeo.attributes.position
  const count = pos.count
  const countX = GRID_X + 1
  const countZ = GRID_Z + 1

  for (let iz = 0; iz < countZ; iz++) {
    const localZ = (iz / GRID_Z - 0.5) * CHUNK_LEN
    const worldZ = chunkZ + localZ
    for (let ix = 0; ix < countX; ix++) {
      const idx = iz * countX + ix
      const localX = (ix / GRID_X - 0.5) * TERRAIN_W
      const roadY = getRoadElevation(worldZ)
      const rawY = getTerrainHeight(localX, worldZ, biomeConfig.id)
      const y = Math.max(0.0, Math.min(roadY + 105.0, rawY))
      pos.setXYZ(idx, localX, y, localZ)
    }
  }
  pos.needsUpdate = true

  // Seamless C1 central-difference normals directly on regular grid
  const norm = terrainGeo.attributes.normal.array as Float32Array
  const dx = TERRAIN_W / GRID_X
  const dz = CHUNK_LEN / GRID_Z
  const sampleClampedY = (lx: number, wz: number) => {
    const rY = getRoadElevation(wz)
    return Math.max(0.0, Math.min(rY + 105.0, getTerrainHeight(lx, wz, biomeConfig.id)))
  }
  for (let iz = 0; iz < countZ; iz++) {
    const localZ = (iz / GRID_Z - 0.5) * CHUNK_LEN
    const worldZ = chunkZ + localZ
    for (let ix = 0; ix < countX; ix++) {
      const ixPrev = ix > 0 ? ix - 1 : 0
      const ixNext = ix < GRID_X ? ix + 1 : GRID_X
      const dxDist = (ixNext - ixPrev) * dx
      const idx = iz * countX + ix
      const localX = (ix / GRID_X - 0.5) * TERRAIN_W
      const yL = pos.getY(iz * countX + ixPrev)
      const yR = pos.getY(iz * countX + ixNext)
      const yD = iz > 0 ? pos.getY((iz - 1) * countX + ix) : sampleClampedY(localX, worldZ - dz)
      const yU = iz < GRID_Z ? pos.getY((iz + 1) * countX + ix) : sampleClampedY(localX, worldZ + dz)
      const gradX = -(yR - yL) / dxDist
      const gradZ = -(yU - yD) / (2 * dz)
      const invLen = 1 / Math.sqrt(gradX * gradX + 1 + gradZ * gradZ)
      norm[idx * 3] = gradX * invLen
      norm[idx * 3 + 1] = invLen
      norm[idx * 3 + 2] = gradZ * invLen
    }
  }
  terrainGeo.attributes.normal.needsUpdate = true

  const uvs = terrainGeo.attributes.uv.array as Float32Array
  const colorAttr = terrainGeo.attributes.color as THREE.BufferAttribute
  const colors = colorAttr.array as Float32Array

  for (let i = 0; i < count; i++) {
    const ny = norm[i * 3 + 1]
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

    // Smooth slope blending (slope = 1 on flat ground, 0 on sheer cliffs)
    const rawSlope = Math.max(0, Math.min(1, (ny - 0.60) / 0.26))
    const flat = rawSlope * rawSlope * (3.0 - 2.0 * rawSlope)

    const macroPatch = Math.sin(px * 0.0085 + worldZ * 0.0072) * 0.5 + 0.5
    const organicVar = (Math.sin(px * 0.018 + worldZ * 0.018) + Math.cos(px * 0.035 - worldZ * 0.028)) * 0.025
    const vertexBiome = getActiveBiomeAt(worldZ, biomeConfig.id)
    const bid = vertexBiome.id
    const isDesert = bid === 'desert'
    const isTundra = bid === 'tundra'
    const isAutumn = bid === 'autumn'
    const isCoastal = bid === 'coastal'
    const isTwisted = bid === 'twisted_mountains'
    const isEnchanted = bid === 'enchanted_forest'
    const isAlpine = bid === 'alpine'

    // Default Lush Forest / Plains
    let cr = (0.20 + macroPatch * 0.08) * flat + 0.34 * (1 - flat)
    let cg = (0.36 + macroPatch * 0.10) * flat + 0.35 * (1 - flat)
    let cb = (0.16 + macroPatch * 0.04) * flat + 0.36 * (1 - flat)

    if (isEnchanted) {
      cr = (0.10 + macroPatch * 0.05) * flat + 0.22 * (1 - flat)
      cg = (0.27 + macroPatch * 0.09) * flat + 0.28 * (1 - flat)
      cb = (0.14 + macroPatch * 0.06) * flat + 0.25 * (1 - flat)
    } else if (isAlpine) {
      cr = (0.22 + macroPatch * 0.06) * flat + 0.36 * (1 - flat)
      cg = (0.34 + macroPatch * 0.07) * flat + 0.39 * (1 - flat)
      cb = (0.20 + macroPatch * 0.04) * flat + 0.44 * (1 - flat)
    } else if (isDesert) {
      const strata = Math.sin(py * 0.52 + px * 0.012) * 0.5 + 0.5
      const rockR = 0.58 + strata * 0.22
      const rockG = 0.31 + strata * 0.18
      const rockB = 0.16 + strata * 0.12
      const sandR = 0.78 + macroPatch * 0.09
      const sandG = 0.56 + macroPatch * 0.08
      const sandB = 0.32 + macroPatch * 0.06
      cr = sandR * flat + rockR * (1 - flat)
      cg = sandG * flat + rockG * (1 - flat)
      cb = sandB * flat + rockB * (1 - flat)
    } else if (isAutumn) {
      const leafMix = macroPatch
      const floorR = 0.46 + leafMix * 0.18
      const floorG = 0.30 + leafMix * 0.11
      const floorB = 0.12 + leafMix * 0.04
      cr = floorR * flat + 0.38 * (1 - flat)
      cg = floorG * flat + 0.26 * (1 - flat)
      cb = floorB * flat + 0.19 * (1 - flat)
    } else if (isTundra) {
      cr = (0.64 + macroPatch * 0.08) * flat + 0.34 * (1 - flat)
      cg = (0.70 + macroPatch * 0.07) * flat + 0.38 * (1 - flat)
      cb = (0.78 + macroPatch * 0.06) * flat + 0.44 * (1 - flat)
    } else if (isTwisted) {
      cr = (0.68 + macroPatch * 0.07) * flat + 0.24 * (1 - flat)
      cg = (0.74 + macroPatch * 0.06) * flat + 0.29 * (1 - flat)
      cb = (0.82 + macroPatch * 0.05) * flat + 0.37 * (1 - flat)
    } else if (isCoastal) {
      const isBeachSide = px < roadCx - 12
      if (isBeachSide) {
        const wetShore = Math.max(0, Math.min(1, 1.0 - py / 4.2))
        const sandR = 0.85 - wetShore * 0.28
        const sandG = 0.76 - wetShore * 0.26
        const sandB = 0.56 - wetShore * 0.22
        cr = sandR * flat + 0.46 * (1 - flat)
        cg = sandG * flat + 0.42 * (1 - flat)
        cb = sandB * flat + 0.36 * (1 - flat)
      } else {
        cr = (0.24 + macroPatch * 0.06) * flat + 0.40 * (1 - flat)
        cg = (0.44 + macroPatch * 0.08) * flat + 0.38 * (1 - flat)
        cb = (0.20 + macroPatch * 0.04) * flat + 0.34 * (1 - flat)
      }
    }

    if ((isTundra || isTwisted) && py > 28) {
      const snowT = Math.min(1.0, (py - 28) / 28.0) * 0.72
      cr = cr * (1 - snowT) + 0.78 * snowT
      cg = cg * (1 - snowT) + 0.82 * snowT
      cb = cb * (1 - snowT) + 0.88 * snowT
    } else if (py > 62) {
      const snowT = Math.min(1.0, (py - 62) / 36.0) * 0.8
      cr = cr * (1 - snowT) + 0.80 * snowT
      cg = cg * (1 - snowT) + 0.84 * snowT
      cb = cb * (1 - snowT) + 0.89 * snowT
    }

    const distFromCenter = Math.abs(px - roadCx)
    if (distFromCenter < ROAD_WIDTH / 2 + 5.5) {
      const blendToSoil = Math.max(0, 1 - (distFromCenter - (ROAD_WIDTH / 2 + 2.0)) / 3.5)
      const soilR = isCoastal ? 0.78 : 0.36
      const soilG = isCoastal ? 0.70 : 0.32
      const soilB = isCoastal ? 0.54 : 0.28
      cr = cr * (1 - blendToSoil * 0.45) + soilR * (blendToSoil * 0.45)
      cg = cg * (1 - blendToSoil * 0.45) + soilG * (blendToSoil * 0.45)
      cb = cb * (1 - blendToSoil * 0.45) + soilB * (blendToSoil * 0.45)
    }

    colors[i * 3] = Math.max(0, Math.min(1, cr + organicVar))
    colors[i * 3 + 1] = Math.max(0, Math.min(1, cg + organicVar))
    colors[i * 3 + 2] = Math.max(0, Math.min(1, cb + organicVar))
  }

  terrainGeo.attributes.uv.needsUpdate = true
  colorAttr.needsUpdate = true
  validateChunkGeometry(terrainGeo, 'terrainGeo')
}
