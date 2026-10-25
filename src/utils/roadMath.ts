import { createNoise2D } from 'simplex-noise'

// High-precision Simplex Noise generators for realistic multi-octave geological terrain
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
    roadColor: '#2b3038',
    shoulderColor: '#5c5449',
    treeFoliageColor: '#194520',
    treeTrunkColor: '#3d2817',
    skyHemiSky: '#dbeafe',
    skyHemiGround: '#3f4f34',
    fogColor: '#bed3eb',
    fogDensity: 0.00050,
    hillHeightMultiplier: 0.95,
    roughness: 0.88,
  },
  autumn: {
    id: 'autumn',
    name: 'Autumn Mountains',
    grassColor: '#5c4826',
    rockColor: '#6b3414',
    roadColor: '#282d35',
    shoulderColor: '#78461b',
    treeFoliageColor: '#b91c1c', // Rich crimson & amber maples
    treeTrunkColor: '#3b1805',
    skyHemiSky: '#ffedd5',
    skyHemiGround: '#6b472e',
    fogColor: '#c27845',
    fogDensity: 0.00052,
    hillHeightMultiplier: 1.12,
    roughness: 0.9,
  },
  tundra: {
    id: 'tundra',
    name: 'Snowy Tundra',
    grassColor: '#f1f5f9', // Pure winter snow cover
    rockColor: '#64748b',
    roadColor: '#2b323f',
    shoulderColor: '#cbd5e1',
    treeFoliageColor: '#cbd5e1', // Frosted snow pines
    treeTrunkColor: '#334155',
    skyHemiSky: '#e0f2fe',
    skyHemiGround: '#718096',
    fogColor: '#cbd5e1',
    fogDensity: 0.00055,
    hillHeightMultiplier: 1.08,
    roughness: 0.94,
  },
  desert: {
    id: 'desert',
    name: 'Desert Dunes',
    grassColor: '#c27823', // Warm golden terracotta sand dunes
    rockColor: '#854d0e',
    roadColor: '#2e2c2a',
    shoulderColor: '#a15c15',
    treeFoliageColor: '#15803d', // Desert cacti / shrubs
    treeTrunkColor: '#78350f',
    skyHemiSky: '#fef3c7',
    skyHemiGround: '#8c5930',
    fogColor: '#edd8aa',
    fogDensity: 0.00048,
    hillHeightMultiplier: 0.95,
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

// 3. Road Elevation (Drivable scenic mountain pass climbs, highway crests and expansive valleys)
export function getRoadElevation(z: number): number {
  // Long-wave scenic mountain pass climbs (wavelength ~1100m, height up to 18m)
  const passWave = Math.sin(z * 0.0018) * 18.0
  // Medium-wave rolling valley undulating highway crests (wavelength ~380m, height 6.5m)
  const valleyWave = Math.cos(z * 0.0052) * 6.5
  // Gentle high-speed road undulation (wavelength ~140m, height 1.8m)
  const microWave = Math.sin(z * 0.014) * 1.8
  return passWave + valleyWave + microWave
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

/**
 * Smooth continuous ridged multi-fractal shaping function.
 * Unlike Math.abs() which produces sharp V-creases and triangular pyramid spikes,
 * this continuous function produces natural rounded mountain summits, broad
 * sweeping arêtes, and geological plateaus with zero gradient discontinuities.
 */
function smoothRidge(n: number): number {
  const clamped = Math.max(-1, Math.min(1, n))
  // Smooth parabolic peak with C1 zero derivative at the summit (n = 0)
  return 1.0 - clamped * clamped
}

function getRawBiomeElevation(x: number, z: number, bId: BiomeType): number {
  if (bId === 'desert') {
    const mesaShape = Math.tanh(terrainNoise(x * 0.0032, z * 0.0032) * 2.4) * 32.0
    const duneWave = (Math.sin(x * 0.012 + z * 0.006) * 0.65 + detailNoise(x * 0.014, z * 0.014) * 0.35) * 14.0
    const duneRipple = microNoise(x * 0.028, z * 0.028) * 2.2
    return mesaShape + duneWave + duneRipple
  } else if (bId === 'tundra') {
    const primaryMassif = (smoothRidge(terrainNoise(x * 0.0028, z * 0.0028)) * 0.72 + terrainNoise(x * 0.0032, z * 0.0032) * 0.28) * 52.0
    const secondaryRidge = smoothRidge(detailNoise(x * 0.0075, z * 0.0075)) * 16.0
    const glacialValley = microNoise(x * 0.018, z * 0.018) * 3.8 - 12.0
    return primaryMassif + secondaryRidge + glacialValley
  } else if (bId === 'autumn') {
    const alpineMassif = (smoothRidge(terrainNoise(x * 0.0034, z * 0.0034)) * 0.65 + terrainNoise(x * 0.0038, z * 0.0038) * 0.35) * 44.0
    const ridgePasses = smoothRidge(detailNoise(x * 0.0085, z * 0.0085)) * 14.0
    const valleyFoothills = microNoise(x * 0.022, z * 0.022) * 3.4
    return alpineMassif + ridgePasses + valleyFoothills - 6.0
  } else {
    const rollingCountryside = terrainNoise(x * 0.0038, z * 0.0038) * 28.0
    const forestKnolls = detailNoise(x * 0.0095, z * 0.0095) * 9.5
    const gentleHills = microNoise(x * 0.025, z * 0.025) * 2.8
    return rollingCountryside + forestKnolls + gentleHills
  }
}

// 5. Complete World Terrain Elevation at ANY (x, z)
export function getTerrainHeight(x: number, z: number, biomeId: BiomeType = 'forest'): number {
  const roadX = getRoadCenter(z)
  const roadY = getRoadElevation(z)
  const distFromRoad = Math.abs(x - roadX)
  const shoulderWidth = ROAD_WIDTH / 2 + 2.4

  // Immediate roadbed and shoulder: perfectly level with road surface
  if (distFromRoad <= shoulderWidth) {
    return roadY
  }

  // Smooth Hermite smoothstep transition from road shoulder to natural terrain (26m smooth blend)
  const distPastShoulder = distFromRoad - shoulderWidth
  const t = Math.min(1.0, Math.max(0.0, distPastShoulder / 26.0))
  const smoothBlend = t * t * (3.0 - 2.0 * t) // C1 continuous, zero slope at shoulder edge

  // Multi-octave continuous geological terrain synthesis with seamless transition between biomes
  const cycleDistance = 900
  const normZ = Math.abs(z) / cycleDistance
  const biomeKeys: BiomeType[] = ['forest', 'autumn', 'tundra', 'desert']
  const idx = Math.floor(normZ) % biomeKeys.length
  const nextIdx = (idx + 1) % biomeKeys.length
  const frac = normZ - Math.floor(normZ)

  let naturalElevation = 0
  let mult = BIOMES[biomeId]?.hillHeightMultiplier || 1.0

  if (frac > 0.82) {
    // 160m smooth Hermite blend zone between adjacent biomes along Z axis
    const blendT = (frac - 0.82) / 0.18
    const sBlend = blendT * blendT * (3.0 - 2.0 * blendT)
    const elev1 = getRawBiomeElevation(x, z, biomeKeys[idx])
    const elev2 = getRawBiomeElevation(x, z, biomeKeys[nextIdx])
    naturalElevation = elev1 * (1 - sBlend) + elev2 * sBlend
    const mult1 = BIOMES[biomeKeys[idx]].hillHeightMultiplier
    const mult2 = BIOMES[biomeKeys[nextIdx]].hillHeightMultiplier
    mult = mult1 * (1 - sBlend) + mult2 * sBlend
  } else {
    naturalElevation = getRawBiomeElevation(x, z, biomeKeys[idx])
    mult = BIOMES[biomeKeys[idx]].hillHeightMultiplier
  }

  // Distance scaling: Gradual elevation gain into distant mountain horizons
  const mountainRamp = Math.min(2.5, 0.15 + Math.pow(distPastShoulder / 95.0, 1.35) * 1.8)
  const valleyWallLift = Math.pow(Math.min(1.0, distPastShoulder / 520.0), 1.6) * 55.0

  return roadY + (naturalElevation * mountainRamp + valleyWallLift) * smoothBlend * mult
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
