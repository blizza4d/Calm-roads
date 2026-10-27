import {
  getTerrainHeight,
  getRoadCenter,
  getActiveBiomeAt,
  ROAD_WIDTH,
  BiomeType,
} from '../utils/roadMath'

export interface TerrainWorkerRequest {
  id: number
  chunkZ: number
  biomeId: BiomeType
  gridX: number
  gridZ: number
  chunkLen: number
  terrainW: number
}

export interface TerrainWorkerResponse {
  id: number
  chunkZ: number
  positions: Float32Array
  normals: Float32Array
  colors: Float32Array
  uvs: Float32Array
}

self.onmessage = (e: MessageEvent<TerrainWorkerRequest>) => {
  const { id, chunkZ, biomeId, gridX, gridZ, chunkLen, terrainW } = e.data
  const countX = gridX + 1
  const countZ = gridZ + 1
  const count = countX * countZ

  const positions = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const uvs = new Float32Array(count * 2)

  const biomeConfig = getActiveBiomeAt(chunkZ, biomeId)

  // 1. Compute vertex positions
  for (let iz = 0; iz < countZ; iz++) {
    const localZ = (iz / gridZ - 0.5) * chunkLen
    const worldZ = chunkZ + localZ
    for (let ix = 0; ix < countX; ix++) {
      const idx = iz * countX + ix
      const localX = (ix / gridX - 0.5) * terrainW
      const y = getTerrainHeight(localX, worldZ, biomeConfig.id)

      positions[idx * 3] = localX
      positions[idx * 3 + 1] = y
      positions[idx * 3 + 2] = localZ
    }
  }

  // 2. Compute analytical / central-difference vertex normals
  const stepX = terrainW / gridX
  const stepZ = chunkLen / gridZ

  for (let iz = 0; iz < countZ; iz++) {
    const localZ = (iz / gridZ - 0.5) * chunkLen
    const worldZ = chunkZ + localZ
    for (let ix = 0; ix < countX; ix++) {
      const idx = iz * countX + ix
      const localX = (ix / gridX - 0.5) * terrainW

      // Central difference for gradient
      const hL = getTerrainHeight(localX - stepX, worldZ, biomeConfig.id)
      const hR = getTerrainHeight(localX + stepX, worldZ, biomeConfig.id)
      const hD = getTerrainHeight(localX, worldZ - stepZ, biomeConfig.id)
      const hU = getTerrainHeight(localX, worldZ + stepZ, biomeConfig.id)

      const dhdx = (hR - hL) / (2 * stepX)
      const dhdz = (hU - hD) / (2 * stepZ)

      // Normal = normalize(-dhdx, 1, -dhdz)
      const len = Math.hypot(-dhdx, 1.0, -dhdz)
      const nx = -dhdx / len
      const ny = 1.0 / len
      const nz = -dhdz / len

      normals[idx * 3] = nx
      normals[idx * 3 + 1] = ny
      normals[idx * 3 + 2] = nz

      // Slope-compensated UVs
      const py = positions[idx * 3 + 1]
      const steepness = Math.max(0, 1.0 - ny)
      const baseU = localX / terrainW + 0.5
      const baseV = localZ / chunkLen + 0.5
      const uSlope = (localX >= 0 ? 1 : -1) * (py / terrainW) * steepness * 1.6
      const vSlope = (py / chunkLen) * steepness * 1.8
      uvs[idx * 2] = baseU + uSlope
      uvs[idx * 2 + 1] = baseV + vSlope

      // Smooth slope blending (smoothstep Hermite transition between grass and rock)
      const rawSlope = Math.max(0, Math.min(1, (ny - 0.62) / 0.25))
      const slope = rawSlope * rawSlope * (3.0 - 2.0 * rawSlope)
      const roadCx = getRoadCenter(worldZ)
      // Continuous world-coordinate variation across chunks (zero chunk boundary seams, zero horizontal stripes)
      const organicVar = (Math.sin(localX * 0.018 + worldZ * 0.018) + Math.cos(localX * 0.035 - worldZ * 0.028)) * 0.022

      // Continuous worldZ biome color sampling
      const vertexBiome = getActiveBiomeAt(worldZ, biomeId)
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

      const distFromCenter = Math.abs(localX - roadCx)
      if (distFromCenter < ROAD_WIDTH / 2 + 5.5) {
        const blendToSoil = Math.max(0, 1 - (distFromCenter - (ROAD_WIDTH / 2 + 2.0)) / 3.5)
        cr = cr * (1 - blendToSoil * 0.45) + 0.36 * (blendToSoil * 0.45)
        cg = cg * (1 - blendToSoil * 0.45) + 0.32 * (blendToSoil * 0.45)
        cb = cb * (1 - blendToSoil * 0.45) + 0.28 * (blendToSoil * 0.45)
      }

      colors[idx * 3] = Math.max(0, Math.min(1, cr + organicVar))
      colors[idx * 3 + 1] = Math.max(0, Math.min(1, cg + organicVar))
      colors[idx * 3 + 2] = Math.max(0, Math.min(1, cb + organicVar))
    }
  }

  // Transfer back to main thread with ZERO memory copy
  const response: TerrainWorkerResponse = {
    id,
    chunkZ,
    positions,
    normals,
    colors,
    uvs,
  }

  ;(self as unknown as { postMessage: (msg: any, transfer: Transferable[]) => void }).postMessage(response, [
    positions.buffer,
    normals.buffer,
    colors.buffer,
    uvs.buffer,
  ])
}
