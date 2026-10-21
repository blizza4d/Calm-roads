import { createNoise2D } from 'simplex-noise'

// High-precision Simplex Noise generators for rolling terrain & micro-roughness
const terrainNoise = createNoise2D()
const detailNoise = createNoise2D()

export const ROAD_WIDTH = 11.5

export type BiomeType = 'forest' | 'autumn' | 'tundra' | 'desert'

export interface BiomeConfig {
  id: BiomeType
  name: string
  grassColor: string
  rockColor: string
  roadColor: string
  shoulderColor: string
  treeFoliageColor: string
  treeTrunkColor: string
  skyHemiSky: string
  skyHemiGround: string
  fogColor: string
  fogDensity: number
  hillHeightMultiplier: number
  roughness: number
}

export const BIOMES: Record<BiomeType, BiomeConfig> = {
  forest: {
    id: 'forest',
    name: 'Lush Forest',
    grassColor: '#36603a',
    rockColor: '#64748b',
    roadColor: '#1e242c',
    shoulderColor: '#6b7280',
    treeFoliageColor: '#1c4a24',
    treeTrunkColor: '#3b2516',
    skyHemiSky: '#dbeafe',
    skyHemiGround: '#2d4a1e',
    fogColor: '#bfdbfe',
    fogDensity: 0.0022,
    hillHeightMultiplier: 1.0,
    roughness: 0.85,
  },
  autumn: {
    id: 'autumn',
    name: 'Autumn Mountains',
    grassColor: '#645432',
    rockColor: '#78350f',
    roadColor: '#191d24',
    shoulderColor: '#92400e',
    treeFoliageColor: '#b91c1c', // Rich crimson & amber maples
    treeTrunkColor: '#451a03',
    skyHemiSky: '#fed7aa',
    skyHemiGround: '#78350f',
    fogColor: '#f97316',
    fogDensity: 0.003,
    hillHeightMultiplier: 1.25,
    roughness: 0.88,
  },
  tundra: {
    id: 'tundra',
    name: 'Snowy Tundra',
    grassColor: '#f8fafc', // Crisp winter snow cover
    rockColor: '#94a3b8',
    roadColor: '#242c38',
    shoulderColor: '#e2e8f0',
    treeFoliageColor: '#cbd5e1', // Frosted snow pines
    treeTrunkColor: '#334155',
    skyHemiSky: '#e0f2fe',
    skyHemiGround: '#94a3b8',
    fogColor: '#e2e8f0',
    fogDensity: 0.004,
    hillHeightMultiplier: 1.1,
    roughness: 0.95,
  },
  desert: {
    id: 'desert',
    name: 'Desert Dunes',
    grassColor: '#d97706', // Warm golden terracotta sand dunes
    rockColor: '#92400e',
    roadColor: '#292524',
    shoulderColor: '#b45309',
    treeFoliageColor: '#15803d', // Desert cacti / shrubs
    treeTrunkColor: '#78350f',
    skyHemiSky: '#fef3c7',
    skyHemiGround: '#92400e',
    fogColor: '#fde68a',
    fogDensity: 0.0018,
    hillHeightMultiplier: 0.95, // Smooth sweeping parabolic dunes
    roughness: 0.98,
  },
}

// 1. Procedural Biome Resolution
export function getActiveBiomeAt(z: number, manualBiome: 'dynamic' | BiomeType): BiomeConfig {
  if (manualBiome !== 'dynamic') {
    return BIOMES[manualBiome]
  }

  // Seamless cycle across the 4 biomes as player journeys forward (every 900m)
  const cycleDistance = 900
  const normZ = Math.abs(z) / cycleDistance
  const biomeKeys: BiomeType[] = ['forest', 'autumn', 'tundra', 'desert']
  const index = Math.floor(normZ) % biomeKeys.length
  return BIOMES[biomeKeys[index]]
}

// 2. Procedural Road Centerline (Smooth, natural sweeping highway curves)
export function getRoadCenter(z: number): number {
  return Math.sin(z * 0.0035) * 18 + Math.sin(z * 0.008) * 8
}

// 3. Road Elevation (Gentle undulating highway crests and valleys)
export function getRoadElevation(z: number): number {
  return Math.sin(z * 0.005) * 4.5 + Math.cos(z * 0.011) * 2.2
}

// 4. Road Tangent & Perpendicular Normal vectors (for constant width & banking)
export function getRoadTangent(z: number) {
  const delta = 1.0
  const dx = getRoadCenter(z - delta) - getRoadCenter(z + delta) // forward is negative Z
  const dz = -2 * delta
  const len = Math.hypot(dx, dz)
  const tx = dx / len
  const tz = dz / len

  // Right-hand perpendicular normal (nx, nz)
  const nx = -tz
  const nz = tx

  return { tx, tz, nx, nz }
}

// Superelevation / road banking into curves (degrees converted to radians)
export function getRoadBanking(z: number): number {
  const delta = 2.0
  const c1 = getRoadCenter(z + delta)
  const c2 = getRoadCenter(z)
  const c3 = getRoadCenter(z - delta)
  // Second derivative (curvature)
  const curvature = (c3 - 2 * c2 + c1) / (delta * delta)
  return Math.max(-0.08, Math.min(0.08, curvature * 2.8))
}

// 5. Complete World Terrain Elevation at ANY (x, z)
export function getTerrainHeight(x: number, z: number, biomeId: BiomeType = 'forest'): number {
  const roadX = getRoadCenter(z)
  const roadY = getRoadElevation(z)
  const distFromRoad = Math.abs(x - roadX)
  const shoulderWidth = ROAD_WIDTH / 2 + 1.8

  // Asphalt road surface and immediate shoulder bed
  if (distFromRoad <= shoulderWidth) {
    return roadY
  }

  // Smooth Hermite smoothstep transition from road shoulder to natural terrain
  const distPastShoulder = distFromRoad - shoulderWidth
  const t = Math.min(1.0, Math.max(0.0, distPastShoulder / 18.0))
  const smoothBlend = t * t * (3.0 - 2.0 * t) // C1 continuous, zero slope at shoulder edge

  const config = BIOMES[biomeId] || BIOMES.forest
  const mult = config.hillHeightMultiplier

  // Multi-octave natural rolling hills designed for cozy, drivable exploration
  let rollingHills = 0
  if (biomeId === 'desert') {
    // Sweeping parabolic sand dunes
    rollingHills =
      Math.sin(x * 0.012 + z * 0.007) * 9.5 +
      terrainNoise(x * 0.007, z * 0.007) * 7.0
  } else {
    // Rolling knolls and scenic ridges
    rollingHills =
      terrainNoise(x * 0.009, z * 0.009) * 11.0 +
      terrainNoise(x * 0.02, z * 0.02) * 4.0
  }

  const fineRidges = detailNoise(x * 0.035, z * 0.035) * 2.2
  // Gentle distance scaling that remains climbable without cliff walls
  const distanceFactor = Math.min(2.2, 0.45 + (distPastShoulder / 55.0) * 0.85)

  return roadY + (rollingHills + fineRidges) * smoothBlend * distanceFactor * mult
}

// 6. Heading-Aware Terrain Slope for Vehicle (Pitch & Roll in local vehicle coordinates)
export function getTerrainSlopeForVehicle(
  x: number,
  z: number,
  forwardX: number,
  forwardZ: number,
  rightX: number,
  rightZ: number,
  biomeId: BiomeType = 'forest'
) {
  const delta = 1.3
  const yCenter = getTerrainHeight(x, z, biomeId)

  // Ground elevation ahead and behind along vehicle's actual forward travel direction
  const yFront = getTerrainHeight(x + forwardX * delta, z + forwardZ * delta, biomeId)
  const yBack = getTerrainHeight(x - forwardX * delta, z - forwardZ * delta, biomeId)

  // Ground elevation to the right and left along vehicle's lateral axis
  const yRight = getTerrainHeight(x + rightX * delta, z + rightZ * delta, biomeId)
  const yLeft = getTerrainHeight(x - rightX * delta, z - rightZ * delta, biomeId)

  // Local Pitch (positive = nose tilted up)
  const pitch = Math.atan2(yFront - yBack, delta * 2)

  // Local Roll (positive = right side tilted up)
  const roll = Math.atan2(yRight - yLeft, delta * 2)

  return { pitch, roll, height: yCenter }
}

// Legacy fallback for backward compatibility
export function getTerrainAngles(x: number, z: number, biomeId: BiomeType = 'forest') {
  return getTerrainSlopeForVehicle(x, z, 0, -1, 1, 0, biomeId)
}

// 7. Check if coordinate is currently on asphalt highway surface
export function isRoadSurface(x: number, z: number): boolean {
  const roadX = getRoadCenter(z)
  return Math.abs(x - roadX) <= ROAD_WIDTH / 2 + 0.6
}
