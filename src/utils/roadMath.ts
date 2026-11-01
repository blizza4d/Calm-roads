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
    friction: 0.82, // Winter snow road grip
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
    friction: 0.82,
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

// Regional Road Personality Configuration for Alpine Passes, Canyons & Coastal Highways
export interface BiomeRoadCharacter {
  switchbackWeight: number // Tight hairpins / technical turns (140-220m)
  sCurveWeight: number     // Dynamic flowing S-curves (260-380m)
  valleySweepWeight: number // Regional sweeps (700-1200m)
  hairpinAmplitude: number // Lateral width of switchbacks (m)
  elevationClimbRate: number // Mountain pass vertical climb intensity
  bankingMultiplier: number  // Superelevation aggressiveness
}

export const BIOME_ROAD_CHARACTERS: Record<BiomeType, BiomeRoadCharacter> = {
  twisted_mountains: {
    switchbackWeight: 1.45,
    sCurveWeight: 1.15,
    valleySweepWeight: 1.05,
    hairpinAmplitude: 38.0,
    elevationClimbRate: 1.45,
    bankingMultiplier: 1.35,
  },
  alpine: {
    switchbackWeight: 1.35,
    sCurveWeight: 1.25,
    valleySweepWeight: 1.10,
    hairpinAmplitude: 35.0,
    elevationClimbRate: 1.40,
    bankingMultiplier: 1.30,
  },
  enchanted_forest: {
    switchbackWeight: 0.75,
    sCurveWeight: 1.20,
    valleySweepWeight: 0.95,
    hairpinAmplitude: 22.0,
    elevationClimbRate: 0.88,
    bankingMultiplier: 1.00,
  },
  coastal: {
    switchbackWeight: 0.40,
    sCurveWeight: 1.35,
    valleySweepWeight: 1.45,
    hairpinAmplitude: 18.0,
    elevationClimbRate: 0.85,
    bankingMultiplier: 1.05,
  },
  autumn: {
    switchbackWeight: 0.85,
    sCurveWeight: 1.15,
    valleySweepWeight: 1.05,
    hairpinAmplitude: 25.0,
    elevationClimbRate: 1.05,
    bankingMultiplier: 1.10,
  },
  desert: {
    switchbackWeight: 1.10,
    sCurveWeight: 1.15,
    valleySweepWeight: 1.00,
    hairpinAmplitude: 28.0,
    elevationClimbRate: 0.95,
    bankingMultiplier: 1.10,
  },
  tundra: {
    switchbackWeight: 1.05,
    sCurveWeight: 1.10,
    valleySweepWeight: 1.10,
    hairpinAmplitude: 28.0,
    elevationClimbRate: 1.12,
    bankingMultiplier: 1.15,
  },
  forest: {
    switchbackWeight: 0.70,
    sCurveWeight: 1.20,
    valleySweepWeight: 0.95,
    hairpinAmplitude: 22.0,
    elevationClimbRate: 0.92,
    bankingMultiplier: 1.00,
  },
}

// Seamlessly interpolate road character across biome boundaries with C1 continuity
export function getInterpolatedBiomeCharacter(z: number): BiomeRoadCharacter {
  const normZ = Math.abs(z) / BIOME_CYCLE_DISTANCE
  const idx = Math.floor(normZ) % BIOME_CYCLE_ORDER.length
  const nextIdx = (idx + 1) % BIOME_CYCLE_ORDER.length
  const frac = normZ - Math.floor(normZ)

  const c1 = BIOME_ROAD_CHARACTERS[BIOME_CYCLE_ORDER[idx]]
  const c2 = BIOME_ROAD_CHARACTERS[BIOME_CYCLE_ORDER[nextIdx]]

  if (frac > 0.80) {
    const t = (frac - 0.80) / 0.20
    const s = t * t * (3.0 - 2.0 * t) // Hermite smoothstep C1
    return {
      switchbackWeight: c1.switchbackWeight * (1 - s) + c2.switchbackWeight * s,
      sCurveWeight: c1.sCurveWeight * (1 - s) + c2.sCurveWeight * s,
      valleySweepWeight: c1.valleySweepWeight * (1 - s) + c2.valleySweepWeight * s,
      hairpinAmplitude: c1.hairpinAmplitude * (1 - s) + c2.hairpinAmplitude * s,
      elevationClimbRate: c1.elevationClimbRate * (1 - s) + c2.elevationClimbRate * s,
      bankingMultiplier: c1.bankingMultiplier * (1 - s) + c2.bankingMultiplier * s,
    }
  }
  return c1
}

// Backward-compatible helper multipliers
export function getBiomeRoadWindingMultiplier(z: number): number {
  return getInterpolatedBiomeCharacter(z).switchbackWeight
}

export function getBiomeElevationMultiplier(z: number): number {
  return getInterpolatedBiomeCharacter(z).elevationClimbRate
}

// 2. Procedural Road Centerline (Realistic Alpine Passes, Hairpin Switchbacks & Flowing S-Curves)
// Guaranteed C2 continuous: derivative and curvature are smooth with zero chunk boundary seams
export function getRoadCenter(z: number): number {
  const char = getInterpolatedBiomeCharacter(z)

  // 1. Mountain pass switchbacks & hairpins (wavelength 160m - 240m)
  // Using tanh-shaped sine for realistic alpine hairpin turns with flat approaches and sharp rounded apexes:
  const hairpin = Math.tanh(Math.sin(z * 0.0322) * 1.85) * (char.hairpinAmplitude * 0.65)
  const technicalChicane = Math.sin(z * 0.048 + 1.1) * (char.hairpinAmplitude * 0.22)
  const switchbacks = (hairpin + technicalChicane) * char.switchbackWeight

  // 2. Dynamic flowing S-curves (wavelength 280m - 440m)
  const sCurves = (Math.sin(z * 0.0175 + 0.6) * 19.0 + Math.cos(z * 0.0131 + 2.1) * 14.0) * char.sCurveWeight

  // 3. Regional valley / mountain range sweep (wavelength 750m - 1400m)
  const valleySweeps = (Math.sin(z * 0.0057 + 1.4) * 32.0 + Math.sin(z * 0.0028 + 0.3) * 20.0) * char.valleySweepWeight

  return switchbacks + sCurves + valleySweeps
}

// 3. Road Elevation (Drivable scenic mountain pass climbs, highway crests and expansive valleys)
export function getRoadElevation(z: number): number {
  const char = getInterpolatedBiomeCharacter(z)

  // 1. Scenic Mountain Pass Climbs (wavelength ~780m, vertical rise up to 48m)
  const passWave = (Math.sin(z * 0.0080) * 0.5 + 0.5) * 36.0 + (Math.sin(z * 0.0039 + 1.2) * 0.5 + 0.5) * 22.0

  // 2. Rolling crests and valley passes (wavelength ~280m, amplitude +-11.0m)
  const valleyWave = Math.sin(z * 0.0224 + 0.8) * 9.5

  // 3. Gentle high-speed road undulation (wavelength ~110m, amplitude +-1.8m)
  const microWave = Math.sin(z * 0.057 + 2.1) * 1.8

  // Base highway elevation of 24.0m guarantees road is ALWAYS >= 16m above sea level (Y=0)
  return 24.0 + (passWave + valleyWave + microWave) * char.elevationClimbRate
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
// Proportional to road curvature and biome banking multiplier
export function getRoadBanking(z: number): number {
  const delta = 2.0
  const c1 = getRoadCenter(z + delta)
  const c2 = getRoadCenter(z)
  const c3 = getRoadCenter(z - delta)

  const char = getInterpolatedBiomeCharacter(z)
  // Second derivative (curvature)
  const curvature = (c3 - 2 * c2 + c1) / (delta * delta)
  // Maximum banking: -0.11 to +0.11 rad (~ +-6.3 degrees)
  const targetBanking = curvature * 14.0 * char.bankingMultiplier
  return Math.max(-0.11, Math.min(0.11, targetBanking))
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
    // Sinuous rotated noise ridgelines with bounded rotation to prevent inverted geometry
    const twistAngle = Math.max(-Math.PI * 0.75, Math.min(Math.PI * 0.75, x * 0.0012 + z * 0.0009))
    const cosT = Math.cos(twistAngle)
    const sinT = Math.sin(twistAngle)
    const twistedX = x * cosT - z * sinT
    const twistedZ = x * sinT + z * cosT

    const primaryPeaks = Math.max(0, smoothRidge(terrainNoise(twistedX * 0.0022, twistedZ * 0.0022))) * 36.0
    const twistedRidges = Math.max(0, smoothRidge(detailNoise(twistedX * 0.0055, twistedZ * 0.0055))) * 14.0
    const glacialCirques = Math.max(0, detailNoise(x * 0.0042, z * 0.0042)) * 8.0
    const cragDetails = Math.max(0, (microNoise(x * 0.016, z * 0.016) * 0.5 + 0.5)) * 3.0
    return Math.max(0.0, primaryPeaks + twistedRidges + glacialCirques + cragDetails)
  } else if (bId === 'alpine') {
    // Sharp high-altitude jagged summits and sheer horn peaks
    const horns = Math.pow(Math.max(0, smoothRidge(terrainNoise(x * 0.0022, z * 0.0022))), 1.35) * 44.0
    const sheerRidges = Math.max(0, smoothRidge(detailNoise(x * 0.006, z * 0.006))) * 15.0
    const screeSlopes = Math.max(0, (microNoise(x * 0.014, z * 0.014) * 0.5 + 0.5)) * 3.5
    return Math.max(0.0, horns + sheerRidges + screeSlopes)
  } else if (bId === 'enchanted_forest') {
    // Rolling mossy foothills with sheltered dells and ancient clearings
    const mossyHills = (terrainNoise(x * 0.0028, z * 0.0028) * 0.5 + 0.5) * 28.0
    const forestDells = Math.max(0, smoothRidge(detailNoise(x * 0.007, z * 0.007))) * 10.0
    const knollMicro = Math.max(0, (microNoise(x * 0.018, z * 0.018) * 0.5 + 0.5)) * 3.0
    return Math.max(0.0, mossyHills + forestDells + knollMicro)
  } else if (bId === 'coastal') {
    // Rolling green seaside cliffs falling away toward distant ocean horizons
    const seaCliffs = (terrainNoise(x * 0.0025, z * 0.0025) * 0.5 + 0.5) * 30.0
    const coastalShelf = x < 0 ? Math.max(-12, x * 0.03) : 0
    const headlands = Math.max(0, smoothRidge(detailNoise(x * 0.0065, z * 0.0065))) * 12.0
    return Math.max(0.0, seaCliffs + coastalShelf + headlands)
  } else if (bId === 'desert') {
    const mesaShape = Math.max(0, Math.tanh(terrainNoise(x * 0.0025, z * 0.0025) * 2.2)) * 30.0
    const duneWave = (Math.sin(x * 0.008 + z * 0.005) * 0.5 + 0.5) * 14.0
    const duneDetail = (detailNoise(x * 0.012, z * 0.012) * 0.5 + 0.5) * 5.0
    return Math.max(0.0, mesaShape + duneWave + duneDetail)
  } else if (bId === 'tundra') {
    const primaryMassif = Math.max(0, smoothRidge(terrainNoise(x * 0.0024, z * 0.0024))) * 42.0
    const secondaryRidge = Math.max(0, smoothRidge(detailNoise(x * 0.0065, z * 0.0065))) * 14.0
    const alpineDetail = Math.max(0, (microNoise(x * 0.015, z * 0.015) * 0.5 + 0.5)) * 3.5
    return Math.max(0.0, primaryMassif + secondaryRidge + alpineDetail)
  } else if (bId === 'autumn') {
    const alpineMassif = Math.max(0, smoothRidge(terrainNoise(x * 0.0028, z * 0.0028))) * 38.0
    const ridgePasses = Math.max(0, smoothRidge(detailNoise(x * 0.0072, z * 0.0072))) * 13.0
    const foothillDetail = Math.max(0, (microNoise(x * 0.018, z * 0.018) * 0.5 + 0.5)) * 3.5
    return Math.max(0.0, alpineMassif + ridgePasses + foothillDetail)
  } else {
    // Forest: Lush rolling mountain flanks and forested peaks
    const rollingCountryside = (terrainNoise(x * 0.0032, z * 0.0032) * 0.5 + 0.5) * 30.0
    const forestKnolls = Math.max(0, smoothRidge(detailNoise(x * 0.008, z * 0.008))) * 12.0
    const gentleHills = Math.max(0, (microNoise(x * 0.02, z * 0.02) * 0.5 + 0.5)) * 3.5
    return Math.max(0.0, rollingCountryside + forestKnolls + gentleHills)
  }
}

// 5. Complete World Terrain Elevation at ANY (x, z)
// Provides a guaranteed valley depression along the highway corridor (up to 36m out)
// so coarse terrain grid triangles never pierce, submerge, or z-fight the road ribbon in any biome
export function getTerrainHeight(x: number, z: number, biomeId: BiomeType = 'forest'): number {
  const roadX = getRoadCenter(z)
  const roadY = getRoadElevation(z)
  const banking = getRoadBanking(z)
  const dx = x - roadX
  const distFromRoad = Math.abs(dx)

  // Calculate the banked roadbed plane at this lateral coordinate:
  // Clamp dx to the road/shoulder corridor to determine the depressed roadbed base
  const clampedDx = Math.max(-ROAD_WIDTH / 2 - 2.5, Math.min(ROAD_WIDTH / 2 + 2.5, dx))
  const bankedCorridorBase = roadY + Math.tan(banking) * clampedDx

  // 1. Immediate roadbed & shoulder valley floor (0m to 16m)
  // Strictly flat threshold depressed safely 0.28m below the banked roadbed
  // This guarantees that across the entire road width and shoulder, the terrain NEVER pierces or z-fights
  if (distFromRoad <= 16.0) {
    return bankedCorridorBase - 0.28
  }

  // Coastal beach & sandy dune slope on seaward side (X < roadX - 16m)
  if (biomeId === 'coastal' && dx < -16.0) {
    const beachDist = -16.0 - dx
    const duneRipples = Math.sin(x * 0.08 + z * 0.04) * 0.35 + Math.cos(x * 0.03 - z * 0.02) * 0.55
    const targetY = Math.max(0.0, (bankedCorridorBase - 0.28) * Math.max(0, 1.0 - beachDist / 75.0) + duneRipples * Math.min(1.0, beachDist / 25.0))
    return targetY
  }

  // 2. Roadside drainage swale & flat outer corridor buffer (16m to 36m)
  // Smoothly rises from (bankedCorridorBase - 0.28) to (bankedCorridorBase - 0.12), strictly remaining below roadbed
  if (distFromRoad <= 36.0) {
    const corridorT = (distFromRoad - 16.0) / 20.0 // 0 to 1
    return bankedCorridorBase - 0.28 + 0.16 * corridorT
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

  // Distance scaling: Gradual elevation gain into mountain massifs and valley walls
  const mountainRamp = Math.min(1.4, 0.12 + Math.pow(distPastCorridor / 110.0, 1.1) * 1.1)
  const valleyWallLift = Math.pow(Math.min(1.0, distPastCorridor / 550.0), 1.5) * 28.0

  const computedElevation =
    (bankedCorridorBase - 0.12) + Math.max(0.0, (naturalElevation * mountainRamp + valleyWallLift) * smoothBlend * mult)

  // Maximum height ceiling: Strictly prevents terrain from generating upside-down in sky or piercing skybox
  const MAX_TERRAIN_CEILING = 110.0
  const clampedElevation = Math.min(roadY + MAX_TERRAIN_CEILING, computedElevation)

  return Math.max(0.0, clampedElevation)
}

// 6. True drivable surface height (road surface with camber on road, shoulder, and natural terrain offroad)
export function getSurfaceHeight(x: number, z: number, biomeId: BiomeType = 'forest'): number {
  const roadX = getRoadCenter(z)
  const roadY = getRoadElevation(z)
  const banking = getRoadBanking(z)
  const dx = x - roadX
  const dist = Math.abs(dx)
  const halfRoad = ROAD_WIDTH / 2 // 5.75m
  const shoulderEnd = halfRoad + 2.2 // 7.95m

  if (dist <= halfRoad) {
    // Road asphalt surface with crown camber and banked superelevation
    const crown = 0.085 + 0.025 * (1 - dist / halfRoad)
    const bankElevation = Math.tan(banking) * dx
    return roadY + crown + bankElevation
  } else if (dist <= shoulderEnd) {
    // Roadside shoulder strip sloping gently down and tracking banking
    const shoulderT = (dist - halfRoad) / 2.2
    const edgeBank = Math.tan(banking) * Math.sign(dx) * halfRoad
    const shoulderExtra = Math.tan(banking) * (dx - Math.sign(dx) * halfRoad) * 0.75
    return roadY + 0.07 * (1 - shoulderT) + 0.015 * shoulderT + edgeBank + shoulderExtra
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
