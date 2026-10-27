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

      // Vertex color blending
      const slope = Math.max(0, Math.min(1, (ny - 0.65) / 0.28))
      const roadCx = getRoadCenter(worldZ)
      const strataNoise = Math.sin(py * 0.35 + localX * 0.02) * 0.05
      const spatialVar = Math.sin(localX * 0.04 + localZ * 0.04) * 0.03

      // Parse colors
      let cr = 0.35 * (1 - slope) + 0.18 * slope
      let cg = 0.38 * (1 - slope) + 0.32 * slope
      let cb = 0.42 * (1 - slope) + 0.18 * slope

      if (biomeConfig.id === 'desert') {
        cr = 0.72 * (1 - slope) + 0.65 * slope
        cg = 0.52 * (1 - slope) + 0.46 * slope
        cb = 0.32 * (1 - slope) + 0.26 * slope
      } else if (biomeConfig.id === 'tundra' && py > 24) {
        const snowT = Math.min(1.0, (py - 24) / 18.0)
        cr = cr * (1 - snowT) + 0.96 * snowT
        cg = cg * (1 - snowT) + 0.98 * snowT
        cb = cb * (1 - snowT) + 1.0 * snowT
      } else if (py > 65) {
        const snowT = Math.min(1.0, (py - 65) / 35.0)
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

      colors[idx * 3] = Math.max(0, Math.min(1, cr + strataNoise + spatialVar))
      colors[idx * 3 + 1] = Math.max(0, Math.min(1, cg + strataNoise + spatialVar))
      colors[idx * 3 + 2] = Math.max(0, Math.min(1, cb + strataNoise + spatialVar))
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
