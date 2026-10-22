import { createNoise2D } from 'simplex-noise'

// High-precision Simplex Noise generators for realistic multi-octave rolling terrain
const terrainNoise = createNoise2D()
const detailNoise = createNoise2D()
const microNoise = createNoise2D()

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
    grassColor: '#2d4e30',
    rockColor: '#525d6b',
    roadColor: '#1c1f24',
    shoulderColor: '#5c5449',
    treeFoliageColor: '#194520',
    treeTrunkColor: '#3d2817',
    skyHemiSky: '#dbeafe',
    skyHemiGround: '#243e1c',
    fogColor: '#bed3eb',
    fogDensity: 0.002,
    hillHeightMultiplier: 0.95,
    roughness: 0.88,
  },
  autumn: {
    id: 'autumn',
    name: 'Autumn Mountains',
    grassColor: '#5c4826',
    rockColor: '#6b3414',
    roadColor: '#181b20',
    shoulderColor: '#78461b',
    treeFoliageColor: '#b91c1c', // Rich crimson & amber maples
    treeTrunkColor: '#3b1805',
    skyHemiSky: '#ffedd5',
    skyHemiGround: '#632c0f',
    fogColor: '#ea580c',
    fogDensity: 0.0028,
    hillHeightMultiplier: 1.15,
    roughness: 0.9,
  },
  tundra: {
    id: 'tundra',
    name: 'Snowy Tundra',
    grassColor: '#f1f5f9', // Pure winter snow cover
    rockColor: '#64748b',
    roadColor: '#222834',
    shoulderColor: '#cbd5e1',
    treeFoliageColor: '#cbd5e1', // Frosted snow pines
    treeTrunkColor: '#334155',
    skyHemiSky: '#e0f2fe',
    skyHemiGround: '#94a3b8',
    fogColor: '#cbd5e1',
    fogDensity: 0.0035,
    hillHeightMultiplier: 1.05,
    roughness: 0.94,
  },
  desert: {
    id: 'desert',
    name: 'Desert Dunes',
    grassColor: '#c27823', // Warm golden terracotta sand dunes
    rockColor: '#854d0e',
    roadColor: '#262322',
    shoulderColor: '#a15c15',
    treeFoliageColor: '#15803d', // Desert cacti / shrubs
    treeTrunkColor: '#78350f',
    skyHemiSky: '#fef3c7',
    skyHemiGround: '#92400e',
    fogColor: '#fde68a',
    fogDensity: 0.0016,
    hillHeightMultiplier: 0.92, // Smooth sweeping parabolic dunes
    roughness: 0.96,
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
  const shoulderWidth = ROAD_WIDTH / 2 + 2.2

  // Asphalt road surface and immediate shoulder bed - perfectly flat with road bed
  if (distFromRoad <= shoulderWidth) {
    return roadY
  }

  // Smooth Hermite smoothstep transition from road shoulder to natural terrain (22m smooth blend)
  const distPastShoulder = distFromRoad - shoulderWidth
  const t = Math.min(1.0, Math.max(0.0, distPastShoulder / 22.0))
  const smoothBlend = t * t * (3.0 - 2.0 * t) // C1 continuous, zero slope at shoulder edge

  const config = BIOMES[biomeId] || BIOMES.forest
  const mult = config.hillHeightMultiplier

  // Multi-octave natural rolling hills designed for cozy, drivable exploration
  let rollingHills = 0
  if (biomeId === 'desert') {
    // Sweeping parabolic sand dunes with natural ripples
    rollingHills =
      Math.sin(x * 0.012 + z * 0.007) * 8.5 +
      terrainNoise(x * 0.006, z * 0.006) * 6.5 +
      detailNoise(x * 0.018, z * 0.018) * 2.4
  } else {
    // Multi-octave rolling knolls and scenic ridges
    const octave1 = terrainNoise(x * 0.006, z * 0.006) * 10.0
    const octave2 = detailNoise(x * 0.015, z * 0.015) * 4.2
    const octave3 = microNoise(x * 0.035, z * 0.035) * 1.8
    rollingHills = octave1 + octave2 + octave3
  }

  // Distance scaling that remains climbable without cliff walls or sudden dropoffs
  const distanceFactor = Math.min(2.0, 0.4 + (distPastShoulder / 65.0) * 0.8)

  return roadY + rollingHills * smoothBlend * distanceFactor * mult
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
