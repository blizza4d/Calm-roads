import { createNoise2D } from 'simplex-noise'

// Deterministic Mulberry32 PRNG to ensure 100% synchronized elevation across Main Thread & Web Worker
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// High-precision Simplex Noise generators for realistic multi-octave geological terrain
const terrainNoise = createNoise2D(mulberry32(1337))
const detailNoise = createNoise2D(mulberry32(4242))
const microNoise = createNoise2D(mulberry32(9999))

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
    grassColor: '#cbd5e1', // Cool slate-blue winter snow cover with realistic depth
    rockColor: '#64748b', // Dark mountain granite
    roadColor: '#2b323f',
    shoulderColor: '#94a3b8', // Snowy gravel shoulder
    treeFoliageColor: '#e2e8f0', // Frosted snow pines
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
    const mesaShape = Math.max(0, Math.tanh(terrainNoise(x * 0.0025, z * 0.0025) * 2.2)) * 36.0
    const duneWave = (Math.sin(x * 0.008 + z * 0.005) * 0.5 + 0.5) * 16.0
    const duneDetail = (detailNoise(x * 0.012, z * 0.012) * 0.5 + 0.5) * 6.0
    return mesaShape + duneWave + duneDetail
  } else if (bId === 'tundra') {
    const primaryMassif = smoothRidge(terrainNoise(x * 0.0024, z * 0.0024)) * 56.0
    const secondaryRidge = smoothRidge(detailNoise(x * 0.0065, z * 0.0065)) * 18.0
    const alpineDetail = (microNoise(x * 0.015, z * 0.015) * 0.5 + 0.5) * 5.0
    return primaryMassif + secondaryRidge + alpineDetail
  } else if (bId === 'autumn') {
    const alpineMassif = smoothRidge(terrainNoise(x * 0.0028, z * 0.0028)) * 48.0
    const ridgePasses = smoothRidge(detailNoise(x * 0.0072, z * 0.0072)) * 16.0
    const foothillDetail = (microNoise(x * 0.018, z * 0.018) * 0.5 + 0.5) * 4.5
    return alpineMassif + ridgePasses + foothillDetail
  } else {
    // Forest: Lush rolling mountain flanks and forested peaks
    const rollingCountryside = (terrainNoise(x * 0.0032, z * 0.0032) * 0.5 + 0.5) * 36.0
    const forestKnolls = smoothRidge(detailNoise(x * 0.008, z * 0.008)) * 14.0
    const gentleHills = (microNoise(x * 0.02, z * 0.02) * 0.5 + 0.5) * 4.0
    return rollingCountryside + forestKnolls + gentleHills
  }
}

// 5. Complete World Terrain Elevation at ANY (x, z)
// Provides a guaranteed valley depression along the highway corridor (up to 36m out)
// so coarse terrain grid triangles never pierce, submerge, or z-fight the road ribbon in any biome
export function getTerrainHeight(x: number, z: number, biomeId: BiomeType = 'forest'): number {
  const roadX = getRoadCenter(z)
  const roadY = getRoadElevation(z)
  const distFromRoad = Math.abs(x - roadX)

  // 1. Immediate roadbed & shoulder valley floor (0m to 16m)
  // Strictly flat threshold depressed safely below the road ribbon (which sits at roadY + 0.07 to +0.11)
  if (distFromRoad <= 16.0) {
    return roadY - 0.22
  }

  // 2. Roadside drainage swale & flat outer corridor buffer (16m to 36m)
  // Ensures all coarse grid triangles (12.5m pitch) remain strictly below road level
  if (distFromRoad <= 36.0) {
    const corridorT = (distFromRoad - 16.0) / 20.0 // 0 to 1
    // Smoothly rises from roadY - 0.22 to roadY - 0.10, remaining strictly below road surface
    return roadY - 0.22 + 0.12 * corridorT
  }

  // 3. Smooth Hermite smoothstep transition into mountains (36m to 105m)
  const distPastCorridor = distFromRoad - 36.0
  const t = Math.min(1.0, Math.max(0.0, distPastCorridor / 68.0))
  const smoothBlend = t * t * (3.0 - 2.0 * t) // C1 continuous, zero slope at corridor boundary

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
  const mountainRamp = Math.min(2.2, 0.12 + Math.pow(distPastCorridor / 95.0, 1.25) * 1.6)
  const valleyWallLift = Math.pow(Math.min(1.0, distPastCorridor / 520.0), 1.5) * 52.0

  return (roadY - 0.10) + (naturalElevation * mountainRamp + valleyWallLift) * smoothBlend * mult
}

// 6. True drivable surface height (road surface with camber on road, shoulder, and natural terrain offroad)
export function getSurfaceHeight(x: number, z: number, biomeId: BiomeType = 'forest'): number {
  const roadX = getRoadCenter(z)
  const roadY = getRoadElevation(z)
  const dist = Math.abs(x - roadX)
  const halfRoad = ROAD_WIDTH / 2 // 5.75m
  const shoulderEnd = halfRoad + 2.2 // 7.95m

  if (dist <= halfRoad) {
    // Road asphalt surface with crown camber
    const crown = 0.085 + 0.025 * (1 - dist / halfRoad)
    return roadY + crown
  } else if (dist <= shoulderEnd) {
    // Roadside shoulder strip sloping gently down
    const shoulderT = (dist - halfRoad) / 2.2
    return roadY + 0.07 * (1 - shoulderT) + 0.015 * shoulderT
  } else {
    // Offroad terrain
    return getTerrainHeight(x, z, biomeId)
  }
}

// 7. Heading-Aware Surface Slope for Vehicle (Pitch & Roll in local vehicle coordinates)
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
  const yCenter = getSurfaceHeight(x, z, biomeId)

  // Surface elevation ahead and behind along vehicle's actual forward travel direction
  const yFront = getSurfaceHeight(x + forwardX * delta, z + forwardZ * delta, biomeId)
  const yBack = getSurfaceHeight(x - forwardX * delta, z - forwardZ * delta, biomeId)

  // Surface elevation to the right and left along vehicle's lateral axis
  const yRight = getSurfaceHeight(x + rightX * delta, z + rightZ * delta, biomeId)
  const yLeft = getSurfaceHeight(x - rightX * delta, z - rightZ * delta, biomeId)

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

// 8. Check if coordinate is currently on asphalt highway surface
export function isRoadSurface(x: number, z: number): boolean {
  const roadX = getRoadCenter(z)
  return Math.abs(x - roadX) <= ROAD_WIDTH / 2 + 0.6
}
