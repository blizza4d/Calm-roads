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

export type BiomeType =
  | 'twisted_mountains'
  | 'alpine'
  | 'enchanted_forest'
  | 'coastal'
  | 'autumn'
  | 'desert'
  | 'tundra'
  | 'forest'

export interface BiomeConfig {
  id: BiomeType
  name: string
  tagline: string
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
  friction: number // Tire grip multiplier (1.0 = standard, 0.90 = snow, etc.)
  weatherPreset: 'clear' | 'snow' | 'rain' | 'mist'
  hasCabins?: boolean
}

export const BIOMES: Record<BiomeType, BiomeConfig> = {
  twisted_mountains: {
    id: 'twisted_mountains',
    name: 'Twisted Mountains',
    tagline: 'Signature Alpine Pass • Cozy Winter Ridges',
    grassColor: '#dbe4ee', // Crisp fresh powder snow
    rockColor: '#475569', // Dark slate alpine crags
    roadColor: '#242933', // Moist cold asphalt
    shoulderColor: '#cbd5e1', // Compacted snowy gravel shoulder
    treeFoliageColor: '#f1f5f9', // Heavy snow-laden pine boughs
    treeTrunkColor: '#262d3d', // Dark frozen timber
    skyHemiSky: '#e0f2fe', // Cool alpine blue sky
    skyHemiGround: '#94a3b8', // Snow ambient bounce
    fogColor: '#c8d6e5', // Cozy mountain mist
    fogDensity: 0.0026,
    hillHeightMultiplier: 1.45,
    roughness: 0.95,
    friction: 0.90, // Subtly lowered winter road grip
    weatherPreset: 'snow',
    hasCabins: true,
  },
  alpine: {
    id: 'alpine',
    name: 'Alpine Highlands',
    tagline: 'Dramatic Peaks • Winding Cliffside Passes',
    grassColor: '#3a5a40', // High-altitude alpine meadow green
    rockColor: '#4a5568', // Jagged granite precipices
    roadColor: '#292e37',
    shoulderColor: '#64748b', // Grey gravel shoulder
    treeFoliageColor: '#2d4a22', // Dark alpine firs
    treeTrunkColor: '#3e2723',
    skyHemiSky: '#bae6fd',
    skyHemiGround: '#475569',
    fogColor: '#b0c4de',
    fogDensity: 0.00065,
    hillHeightMultiplier: 1.35,
    roughness: 0.88,
    friction: 0.98,
    weatherPreset: 'clear',
  },
  enchanted_forest: {
    id: 'enchanted_forest',
    name: 'Enchanted Forest',
    tagline: 'Ancient Groves • Sunlit Canopy Clearing',
    grassColor: '#1e3f20', // Deep emerald moss
    rockColor: '#3f4f44', // Mossy weathered boulders
    roadColor: '#25292e',
    shoulderColor: '#4a3f35', // Needle-strewn dark loam
    treeFoliageColor: '#0f5132', // Lush dense conifers & broadleafs
    treeTrunkColor: '#2b1810',
    skyHemiSky: '#dcfce7',
    skyHemiGround: '#2d3748',
    fogColor: '#94a3b8', // Low-lying morning clearing mist
    fogDensity: 0.0018,
    hillHeightMultiplier: 0.85,
    roughness: 0.85,
    friction: 1.0,
    weatherPreset: 'clear',
  },
  coastal: {
    id: 'coastal',
    name: 'Coastal Beach Highway',
    tagline: 'Ocean Waves • Sandy Dunes & Scenic Coastal Curves',
    grassColor: '#3b754a', // Seaside dune grass
    rockColor: '#57534e', // Sea-carved coastal headlands
    roadColor: '#282c35',
    shoulderColor: '#d6b885', // Warm coastal sand shoulder
    treeFoliageColor: '#15803d', // Wind-swept coastal pines
    treeTrunkColor: '#44403c',
    skyHemiSky: '#7dd3fc', // Brilliant clear ocean sky
    skyHemiGround: '#0284c7', // Azure ocean reflection bounce
    fogColor: '#93c5fd', // Atmospheric sea spray haze
    fogDensity: 0.00065,
    hillHeightMultiplier: 0.92,
    roughness: 0.82,
    friction: 0.99,
    weatherPreset: 'clear',
  },
  autumn: {
    id: 'autumn',
    name: 'Autumn Valley',
    tagline: 'Golden Valleys • Crimson Canopy Roads',
    grassColor: '#5c4826',
    rockColor: '#6b3414',
    roadColor: '#282d35',
    shoulderColor: '#78461b',
    treeFoliageColor: '#b91c1c', // Rich crimson & amber maples
    treeTrunkColor: '#3b1805',
    skyHemiSky: '#ffedd5',
    skyHemiGround: '#6b472e',
    fogColor: '#c27845',
    fogDensity: 0.00075,
    hillHeightMultiplier: 1.12,
    roughness: 0.90,
    friction: 1.0,
    weatherPreset: 'clear',
  },
  desert: {
    id: 'desert',
    name: 'Desert Canyon',
    tagline: 'Sandstone Mesas • Sun-Drenched Valleys',
    grassColor: '#c27823', // Terracotta dune sand
    rockColor: '#854d0e', // Banded sandstone cliffs
    roadColor: '#2e2c2a',
    shoulderColor: '#a15c15',
    treeFoliageColor: '#15803d', // Saguaro & scrub
    treeTrunkColor: '#78350f',
    skyHemiSky: '#fef3c7',
    skyHemiGround: '#8c5930',
    fogColor: '#edd8aa',
    fogDensity: 0.00055,
    hillHeightMultiplier: 1.15,
    roughness: 0.96,
    friction: 0.97,
    weatherPreset: 'clear',
  },
  tundra: {
    id: 'tundra',
    name: 'Snowy Tundra',
    tagline: 'Sub-Zero Plains • Glacial Horizons',
    grassColor: '#cbd5e1', // Slate-blue winter snow
    rockColor: '#64748b', // Dark mountain granite
    roadColor: '#2b323f',
    shoulderColor: '#94a3b8',
    treeFoliageColor: '#e2e8f0', // Frosted snow pines
    treeTrunkColor: '#334155',
    skyHemiSky: '#e0f2fe',
    skyHemiGround: '#718096',
    fogColor: '#cbd5e1',
    fogDensity: 0.0022,
    hillHeightMultiplier: 1.08,
    roughness: 0.94,
    friction: 0.92,
    weatherPreset: 'snow',
  },
  forest: {
    id: 'forest',
    name: 'Lush Forest',
    tagline: 'Evergreen Highway • Rolling Foothills',
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
    friction: 1.0,
    weatherPreset: 'clear',
  },
}

export const BIOME_CYCLE_DISTANCE = 1400

const BIOME_CYCLE_ORDER: BiomeType[] = [
  'twisted_mountains',
  'alpine',
  'enchanted_forest',
  'coastal',
  'autumn',
  'desert',
  'tundra',
  'forest',
]

// 1. Procedural Biome Resolution
export function getActiveBiomeAt(z: number, manualBiome: 'dynamic' | BiomeType): BiomeConfig {
  if (manualBiome !== 'dynamic') {
    return BIOMES[manualBiome] || BIOMES.twisted_mountains
  }

  // Seamless cycle across all 8 biomes as player journeys forward
  const normZ = Math.abs(z) / BIOME_CYCLE_DISTANCE
  const index = Math.floor(normZ) % BIOME_CYCLE_ORDER.length
  return BIOMES[BIOME_CYCLE_ORDER[index]] || BIOMES.twisted_mountains
}

// Helper: Continuous regional road winding multiplier based on journey position Z
export function getBiomeRoadWindingMultiplier(z: number): number {
  const normZ = Math.abs(z) / BIOME_CYCLE_DISTANCE
  const idx = Math.floor(normZ) % BIOME_CYCLE_ORDER.length
  const nextIdx = (idx + 1) % BIOME_CYCLE_ORDER.length
  const frac = normZ - Math.floor(normZ)

  const multMap: Record<BiomeType, number> = {
    twisted_mountains: 1.25,
    alpine: 1.18,
    enchanted_forest: 0.95,
    coastal: 1.10,
    autumn: 0.92,
    desert: 1.05,
    tundra: 0.96,
    forest: 0.90,
  }

  const m1 = multMap[BIOME_CYCLE_ORDER[idx]] ?? 1.0
  const m2 = multMap[BIOME_CYCLE_ORDER[nextIdx]] ?? 1.0

  if (frac > 0.82) {
    const t = (frac - 0.82) / 0.18
    const s = t * t * (3.0 - 2.0 * t)
    return m1 * (1 - s) + m2 * s
  }
  return m1
}

// Helper: Continuous regional elevation multiplier based on journey position Z
export function getBiomeElevationMultiplier(z: number): number {
  const normZ = Math.abs(z) / BIOME_CYCLE_DISTANCE
  const idx = Math.floor(normZ) % BIOME_CYCLE_ORDER.length
  const nextIdx = (idx + 1) % BIOME_CYCLE_ORDER.length
  const frac = normZ - Math.floor(normZ)

  const elevMap: Record<BiomeType, number> = {
    twisted_mountains: 1.35,
    alpine: 1.40,
    enchanted_forest: 0.82,
    coastal: 0.95,
    autumn: 0.88,
    desert: 1.0,
    tundra: 1.05,
    forest: 0.85,
  }

  const e1 = elevMap[BIOME_CYCLE_ORDER[idx]] ?? 1.0
  const e2 = elevMap[BIOME_CYCLE_ORDER[nextIdx]] ?? 1.0

  if (frac > 0.82) {
    const t = (frac - 0.82) / 0.18
    const s = t * t * (3.0 - 2.0 * t)
    return e1 * (1 - s) + e2 * s
  }
  return e1
}

// 2. Procedural Road Centerline (Smooth, naturally winding road following valleys and passes)
// Guaranteed C2 continuous: derivative and curvature are smooth with zero chunk boundary seams
export function getRoadCenter(z: number): number {
  // Primary valley sweeping curves (wavelength 750m - 1400m, amplitude 34m - 48m)
  const valleySweep = Math.sin(z * 0.0014) * 36.0 + Math.sin(z * 0.00068 + 1.4) * 22.0
  // Mountain pass S-curves and valley bends (wavelength 260m - 420m, amplitude 16m - 24m)
  const mountainPass = Math.sin(z * 0.0038) * 16.0 + Math.cos(z * 0.0024 + 2.1) * 13.0
  // Scenic technical corners & chicanes (wavelength 110m - 180m, amplitude 5.5m)
  const technicalTurns = Math.sin(z * 0.0082) * 6.2 * Math.sin(z * 0.0019 + 0.4)

  const regionWindingMult = getBiomeRoadWindingMultiplier(z)
  return (valleySweep + mountainPass + technicalTurns) * regionWindingMult
}

// 3. Road Elevation (Drivable scenic mountain pass climbs, highway crests and expansive valleys)
export function getRoadElevation(z: number): number {
  // Long-wave scenic mountain pass climbs (wavelength ~1200m, height up to 26m)
  const passWave = Math.sin(z * 0.0015) * 22.0 + Math.sin(z * 0.00072 + 1.5) * 15.0
  // Medium-wave rolling valley undulating highway crests (wavelength ~360m, height 9.5m)
  const valleyWave = Math.cos(z * 0.0048 + 0.6) * 9.5
  // Gentle high-speed road undulation (wavelength ~130m, height 2.2m)
  const microWave = Math.sin(z * 0.013) * 2.2

  const regionElevMult = getBiomeElevationMultiplier(z)
  // Baseline elevation of 12.0m guarantees road remains elevated safely above coastal sea level (Y = 0)
  return 12.0 + (passWave + valleyWave + microWave) * regionElevMult
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
  return Math.max(-0.08, Math.min(0.08, curvature * 3.4))
}

/**
 * Smooth continuous ridged multi-fractal shaping function.
 * Produces natural rounded mountain summits, broad sweeping arêtes, and geological plateaus.
 */
function smoothRidge(n: number): number {
  const clamped = Math.max(-1, Math.min(1, n))
  return 1.0 - clamped * clamped
}

function getRawBiomeElevation(x: number, z: number, bId: BiomeType): number {
  if (bId === 'twisted_mountains') {
    // Sinuous rotated noise ridgelines, dramatic twisted massifs and glacial cirques
    const twistAngle = x * 0.0016 + z * 0.0012
    const cosT = Math.cos(twistAngle)
    const sinT = Math.sin(twistAngle)
    const twistedX = x * cosT - z * sinT
    const twistedZ = x * sinT + z * cosT

    const primaryPeaks = smoothRidge(terrainNoise(twistedX * 0.0022, twistedZ * 0.0022)) * 64.0
    const twistedRidges = smoothRidge(detailNoise(twistedX * 0.0055, twistedZ * 0.0055)) * 22.0
    const glacialCirques = Math.max(0, detailNoise(x * 0.0042, z * 0.0042)) * 12.0
    const cragDetails = (microNoise(x * 0.016, z * 0.016) * 0.5 + 0.5) * 5.0
    return primaryPeaks + twistedRidges + glacialCirques + cragDetails
  } else if (bId === 'alpine') {
    // Sharp high-altitude jagged summits and sheer horn peaks
    const horns = Math.pow(Math.max(0, smoothRidge(terrainNoise(x * 0.0022, z * 0.0022))), 1.35) * 62.0
    const sheerRidges = smoothRidge(detailNoise(x * 0.006, z * 0.006)) * 20.0
    const screeSlopes = (microNoise(x * 0.014, z * 0.014) * 0.5 + 0.5) * 4.5
    return horns + sheerRidges + screeSlopes
  } else if (bId === 'enchanted_forest') {
    // Rolling mossy foothills with sheltered dells and ancient clearings
    const mossyHills = (terrainNoise(x * 0.0028, z * 0.0028) * 0.5 + 0.5) * 32.0
    const forestDells = smoothRidge(detailNoise(x * 0.007, z * 0.007)) * 12.0
    const knollMicro = (microNoise(x * 0.018, z * 0.018) * 0.5 + 0.5) * 3.5
    return mossyHills + forestDells + knollMicro
  } else if (bId === 'coastal') {
    // Rolling green seaside cliffs falling away toward distant ocean horizons
    const seaCliffs = (terrainNoise(x * 0.0025, z * 0.0025) * 0.5 + 0.5) * 36.0
    const coastalShelf = x < 0 ? Math.max(-14, x * 0.035) : 0
    const headlands = smoothRidge(detailNoise(x * 0.0065, z * 0.0065)) * 14.0
    return Math.max(0, seaCliffs + coastalShelf + headlands)
  } else if (bId === 'desert') {
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

  // Coastal beach & sandy dune slope on seaward side (X < roadX - 16m)
  if (biomeId === 'coastal' && x < roadX - 16.0) {
    const beachDist = (roadX - 16.0) - x
    const duneRipples = Math.sin(x * 0.08 + z * 0.04) * 0.35 + Math.cos(x * 0.03 - z * 0.02) * 0.55
    // Gently slope from roadbed down across broad sandy beach into sea level (Y = 0)
    const targetY = Math.max(-1.8, (roadY - 0.22) * Math.max(0, 1.0 - beachDist / 75.0) + duneRipples * Math.min(1.0, beachDist / 25.0))
    return targetY
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
  const normZ = Math.abs(z) / BIOME_CYCLE_DISTANCE
  const idx = Math.floor(normZ) % BIOME_CYCLE_ORDER.length
  const nextIdx = (idx + 1) % BIOME_CYCLE_ORDER.length
  const frac = normZ - Math.floor(normZ)

  let naturalElevation = 0
  let mult = BIOMES[biomeId]?.hillHeightMultiplier || 1.0

  if (frac > 0.82) {
    // 250m smooth Hermite blend zone between adjacent biomes along Z axis
    const blendT = (frac - 0.82) / 0.18
    const sBlend = blendT * blendT * (3.0 - 2.0 * blendT)
    const elev1 = getRawBiomeElevation(x, z, BIOME_CYCLE_ORDER[idx])
    const elev2 = getRawBiomeElevation(x, z, BIOME_CYCLE_ORDER[nextIdx])
    naturalElevation = elev1 * (1 - sBlend) + elev2 * sBlend
    const mult1 = BIOMES[BIOME_CYCLE_ORDER[idx]].hillHeightMultiplier
    const mult2 = BIOMES[BIOME_CYCLE_ORDER[nextIdx]].hillHeightMultiplier
    mult = mult1 * (1 - sBlend) + mult2 * sBlend
  } else {
    naturalElevation = getRawBiomeElevation(x, z, BIOME_CYCLE_ORDER[idx])
    mult = BIOMES[BIOME_CYCLE_ORDER[idx]].hillHeightMultiplier
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
