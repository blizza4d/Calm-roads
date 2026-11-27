import {
  getRoadCenter,
  getRoadElevation,
  getRoadTangent,
  getRoadBanking,
  getRoadSplineSample,
  getTerrainHeight,
  getClosestRoadPoint,
  ROAD_WIDTH,
  ROAD_PROTECTED_RADIUS,
  getTerrainSlopeNormalY,
  getInterpolatedMacroProfile,
  type BiomeConfig,
} from '../../../../utils/roadMath'

const CHUNK_LEN = 200

export interface SceneryData {
  pines: { pos: [number, number, number]; scale: number; rotY: number }[]
  broadleafs: { pos: [number, number, number]; scale: number; rotY: number }[]
  saguaros: { pos: [number, number, number]; scale: number; rotY: number }[]
  shrubs: { pos: [number, number, number]; scale: number; rotY: number }[]
  rocks: { pos: [number, number, number]; scale: [number, number, number]; rot: [number, number, number] }[]
  grassTufts: { pos: [number, number, number]; scale: number; rotY: number }[]
  poles: { pos: [number, number, number] }[]
  delineators: { pos: [number, number, number]; rotY: number }[]
  guardrailPosts: { pos: [number, number, number] }[]
  cabins: { pos: [number, number, number]; rotY: number }[]
}

export function generateSceneryDataForChunk(chunkZ: number, biomeConfig: BiomeConfig): SceneryData {
  const pines: { pos: [number, number, number]; scale: number; rotY: number }[] = []
  const broadleafs: { pos: [number, number, number]; scale: number; rotY: number }[] = []
  const saguaros: { pos: [number, number, number]; scale: number; rotY: number }[] = []
  const shrubs: { pos: [number, number, number]; scale: number; rotY: number }[] = []
  const rocks: { pos: [number, number, number]; scale: [number, number, number]; rot: [number, number, number] }[] = []
  const grassTufts: { pos: [number, number, number]; scale: number; rotY: number }[] = []
  const poles: { pos: [number, number, number] }[] = []
  const delineators: { pos: [number, number, number]; rotY: number }[] = []
  const guardrailPosts: { pos: [number, number, number] }[] = []
  const cabins: { pos: [number, number, number]; rotY: number }[] = []

  const bid = biomeConfig.id
  const isDesert = bid === 'desert'
  const isSnowy = bid === 'tundra' || bid === 'twisted_mountains'
  const isAlpine = bid === 'alpine'
  const isTwisted = bid === 'twisted_mountains'
  const isEnchanted = bid === 'enchanted_forest'

  const numClusters = 6
  const clusterStep = CHUNK_LEN / numClusters

  for (let c = 0; c < numClusters; c++) {
    const clusterZ = -CHUNK_LEN / 2 + c * clusterStep + clusterStep * 0.5
    const worldZ = chunkZ + clusterZ
    const roadCx = getRoadCenter(worldZ)
    const tan = getRoadTangent(worldZ)
    const macro = getInterpolatedMacroProfile(worldZ)

    const hash1 = Math.abs(Math.sin(worldZ * 17.13 + 31.415))
    const hash2 = Math.abs(Math.sin(worldZ * 59.29 + 17.821))
    const hash3 = Math.abs(Math.sin(worldZ * 83.71 + 92.119))

    // Ground elevation matching terrain vertices precisely (ceiling and sea level floor clamped)
    const getSceneryGroundY = (gx: number, gz: number) => {
      return getTerrainHeight(gx, gz, biomeConfig.id)
    }

    // Utility Poles along the right road shoulder every ~33m (strictly anchored into terrain surface)
    if (c % 2 === 0) {
      const poleDist = ROAD_WIDTH / 2 + 2.6
      const poleX = roadCx + tan.nx * poleDist
      const poleLocalZ = clusterZ + tan.nz * poleDist
      const poleWorldZ = chunkZ + poleLocalZ
      const poleY = getSceneryGroundY(poleX, poleWorldZ) - 0.35
      const checkSlopeY = getSceneryGroundY(poleX + 0.5, poleWorldZ)
      if (Math.abs(checkSlopeY - (poleY + 0.35)) < 1.4) {
        poles.push({ pos: [poleX, poleY, poleLocalZ] })
      }
    }

    // Roadside grass tufts along shoulder borders (suppressed in desert and snowy biomes)
    if (!isDesert && !isSnowy) {
      const sides = [-1, 1]
      sides.forEach((side) => {
        const grassDist = ROAD_WIDTH / 2 + 1.6 + hash1 * 1.8
        const grassX = roadCx + tan.nx * side * grassDist
        const grassLocalZ = clusterZ + tan.nz * side * grassDist + (hash2 - 0.5) * 6
        const grassWorldZ = chunkZ + grassLocalZ
        const grassY = getSceneryGroundY(grassX, grassWorldZ) - 0.05
        grassTufts.push({
          pos: [grassX, grassY, grassLocalZ],
          scale: 0.8 + hash3 * 0.5,
          rotY: hash1 * Math.PI * 2,
        })
      })
    }

    // Cozy roadside log cabins in Twisted Mountains (at scenic roadside pullouts)
    if (isTwisted && c === 2 && hash1 > 0.35) {
      const cabinSide = hash2 > 0.5 ? 1 : -1
      const cabinDist = ROAD_PROTECTED_RADIUS + 6.0 + hash3 * 6.0
      const cabinX = roadCx + tan.nx * cabinSide * cabinDist
      const cabinLocalZ = clusterZ + tan.nz * cabinSide * cabinDist
      const cabinWorldZ = chunkZ + cabinLocalZ
      const closest = getClosestRoadPoint(cabinX, cabinWorldZ)
      if (closest.dist >= ROAD_PROTECTED_RADIUS + 4.0) {
        const cabinSlopeNy = getTerrainSlopeNormalY(cabinX, cabinWorldZ, biomeConfig.id)
        if (cabinSlopeNy >= 0.95) {
          const cabinY = getSceneryGroundY(cabinX, cabinWorldZ) - 0.35
          const rotY = cabinSide === 1 ? -Math.PI / 2 + 0.15 : Math.PI / 2 - 0.15
          cabins.push({
            pos: [cabinX, cabinY, cabinLocalZ],
            rotY,
          })
        }
      }
    }

    // Scenery on both sides of highway with true Euclidean road corridor protection
    const sides = [-1, 1]
    sides.forEach((side) => {
      const clusterDist = ROAD_PROTECTED_RADIUS + 1.5 + (side === -1 ? hash1 : hash2) * 36
      const clusterCenterX = roadCx + tan.nx * side * clusterDist
      const clusterCenterZ = clusterZ + tan.nz * side * clusterDist

      if (isDesert) {
        const numSaguaros = Math.max(0, Math.round((1 + Math.floor(hash3 * 2.5)) * macro.vegetationDensity))
        for (let i = 0; i < numSaguaros; i++) {
          const offsetX = (Math.sin(i * 2.4 + hash1) - 0.5) * 14
          const offsetZ = (Math.cos(i * 3.1 + hash2) - 0.5) * 16
          const treeX = clusterCenterX + offsetX
          const treeZ = clusterCenterZ + offsetZ
          const treeWorldZ = chunkZ + treeZ

          const closest = getClosestRoadPoint(treeX, treeWorldZ)
          if (closest.dist >= ROAD_PROTECTED_RADIUS + 1.0) {
            const slopeNy = getTerrainSlopeNormalY(treeX, treeWorldZ, biomeConfig.id)
            if (slopeNy >= 0.866) {
              const treeY = getSceneryGroundY(treeX, treeWorldZ)
              saguaros.push({
                pos: [treeX, treeY - 0.2, treeZ],
                scale: 0.85 + hash1 * 0.65,
                rotY: (hash2 * 10 + i) % (Math.PI * 2),
              })
            }
          }
        }

        if (hash3 > 0.45 / Math.max(0.2, macro.vegetationDensity)) {
          const shrubX = clusterCenterX + (hash2 - 0.5) * 10
          const shrubZ = clusterCenterZ + (hash1 - 0.5) * 12
          const shrubWorldZ = chunkZ + shrubZ
          const closest = getClosestRoadPoint(shrubX, shrubWorldZ)
          if (closest.dist >= ROAD_PROTECTED_RADIUS + 1.0) {
            const shrubSlopeNy = getTerrainSlopeNormalY(shrubX, shrubWorldZ, biomeConfig.id)
            if (shrubSlopeNy >= 0.80) {
              const shrubY = getSceneryGroundY(shrubX, shrubWorldZ)
              shrubs.push({
                pos: [shrubX, shrubY - 0.12, shrubZ],
                scale: 0.7 + hash3 * 0.7,
                rotY: hash1 * Math.PI,
              })
            }
          }
        }
      } else {
        const baseTrees = 2 + Math.floor(hash2 * 3.2)
        const treesInCluster = Math.max(1, Math.round(baseTrees * macro.vegetationDensity))
        for (let i = 0; i < treesInCluster; i++) {
          const angle = (i / treesInCluster) * Math.PI * 2 + hash1
          const radius = 3.5 + (i * 3.8 + hash3 * 6.5)
          const treeX = clusterCenterX + Math.cos(angle) * radius
          const treeZ = clusterCenterZ + Math.sin(angle) * radius
          const treeWorldZ = chunkZ + treeZ

          const closest = getClosestRoadPoint(treeX, treeWorldZ)
          if (closest.dist >= ROAD_PROTECTED_RADIUS + 1.0) {
            const slopeNy = getTerrainSlopeNormalY(treeX, treeWorldZ, biomeConfig.id)
            if (slopeNy >= 0.866) {
              const treeY = getSceneryGroundY(treeX, treeWorldZ)
              const scale = 0.85 + ((hash1 + i * 0.3) % 0.6)
              const isPine = (isTwisted || isAlpine || isSnowy)
                ? true
                : isDesert
                ? false
                : isEnchanted
                ? (i % 2 === 0)
                : bid === 'autumn'
                ? (i % 3 === 0)
                : (i % 2 === 0)

              if (isPine) {
                pines.push({
                  pos: [treeX, treeY - 0.25, treeZ],
                  scale,
                  rotY: angle,
                })
              } else {
                broadleafs.push({
                  pos: [treeX, treeY - 0.25, treeZ],
                  scale,
                  rotY: angle + 0.5,
                })
              }
            }
          }
        }

        if (hash1 > 0.45 / Math.max(0.2, macro.vegetationDensity)) {
          const shrubDist = ROAD_PROTECTED_RADIUS + 1.5 + hash2 * 12
          const shrubX = roadCx + tan.nx * side * shrubDist
          const shrubZ = clusterZ + tan.nz * side * shrubDist + (hash3 - 0.5) * 8
          const shrubWorldZ = chunkZ + shrubZ
          const closest = getClosestRoadPoint(shrubX, shrubWorldZ)
          if (closest.dist >= ROAD_PROTECTED_RADIUS + 1.0) {
            const shrubSlopeNy = getTerrainSlopeNormalY(shrubX, shrubWorldZ, biomeConfig.id)
            if (shrubSlopeNy >= 0.80) {
              const shrubY = getSceneryGroundY(shrubX, shrubWorldZ)
              shrubs.push({
                pos: [shrubX, shrubY - 0.12, shrubZ],
                scale: 0.65 + hash3 * 0.6,
                rotY: hash2 * Math.PI,
              })
            }
          }
        }
      }

      // Stratified geological rock outcrops
      const rockSpawnThreshold = 1.0 - 0.55 * Math.min(1.5, macro.rockDensity)
      if (hash3 > rockSpawnThreshold) {
        const rockDist = ROAD_PROTECTED_RADIUS + 2.0 + hash1 * 22
        const rockX = roadCx + tan.nx * side * rockDist
        const rockZ = clusterZ + tan.nz * side * rockDist + (hash2 - 0.5) * 10
        const rockWorldZ = chunkZ + rockZ
        const closest = getClosestRoadPoint(rockX, rockWorldZ)
        if (closest.dist >= ROAD_PROTECTED_RADIUS + 1.0) {
          const rockSlopeNy = getTerrainSlopeNormalY(rockX, rockWorldZ, biomeConfig.id)
          if (rockSlopeNy >= 0.65) {
            const rockY = getSceneryGroundY(rockX, rockWorldZ)
            const scaleMult = 0.75 + 0.35 * macro.rockDensity
            const sx = (0.9 + hash3 * 1.6) * scaleMult
            const sy = (0.65 + hash1 * 0.8) * sx
            const sz = (0.85 + hash2 * 1.2) * sx

            rocks.push({
              pos: [rockX, rockY - 0.25 * sy, rockZ],
              scale: [sx, sy, sz],
              rot: [hash1 * 0.12, hash2 * Math.PI * 2, hash3 * 0.12],
            })
          }
        }
      }
    })
  }

  // Roadside Reflector Delineator Posts (Guide Posts)
  const numDelineators = 8
  const delineatorSpacing = CHUNK_LEN / numDelineators
  for (let d = 0; d < numDelineators; d++) {
    const delinZ = -CHUNK_LEN / 2 + d * delineatorSpacing + delineatorSpacing * 0.5
    const worldZ = chunkZ + delinZ
    const roadCx = getRoadCenter(worldZ)
    const roadY = getRoadElevation(worldZ)
    const { nx, nz } = getRoadTangent(worldZ)
    const banking = getRoadBanking(worldZ)
    const sides = [-1, 1]
    sides.forEach((side) => {
      const delinDist = ROAD_WIDTH / 2 + 1.2
      const delinX = roadCx + nx * side * delinDist
      const delinLocalZ = delinZ + nz * side * delinDist
      const bankY = Math.tan(banking) * side * delinDist
      const delinY = roadY + 0.05 + bankY
      delineators.push({
        pos: [delinX, delinY, delinLocalZ],
        rotY: side === -1 ? 0.06 : -0.06,
      })
    })
  }

  // Guardrail Steel Support Posts
  const railSegments = 28
  const railOffset = ROAD_WIDTH / 2 + 1.2
  for (let i = 0; i < railSegments; i++) {
    const z1 = CHUNK_LEN / 2 - (i / railSegments) * CHUNK_LEN
    const z2 = CHUNK_LEN / 2 - ((i + 1) / railSegments) * CHUNK_LEN
    const wz1 = chunkZ + z1
    const wz2 = chunkZ + z2
    const cx1 = getRoadCenter(wz1)
    const cx2 = getRoadCenter(wz2)
    if (Math.abs(cx2 - cx1) > 0.4) {
      const s1 = getRoadSplineSample(wz1)
      const side = cx2 > cx1 ? 1 : -1
      const px = s1.x + s1.rx * railOffset * side
      const py = s1.y + 0.05 + s1.ry * railOffset * side
      const pz = z1 + s1.rz * railOffset * side
      guardrailPosts.push({ pos: [px, py, pz] })
    }
  }

  return { pines, broadleafs, saguaros, shrubs, rocks, grassTufts, poles, delineators, guardrailPosts, cabins }
}
