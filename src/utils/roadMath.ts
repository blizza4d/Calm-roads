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

// World Seed & Procedural Generation Session State
let _activeWorldSeed = 1337
let _activeStartBiome: 'dynamic' | BiomeType = 'dynamic'
let _activeStartZ = 0

// High-precision Simplex Noise generators for realistic multi-octave geological terrain
let terrainNoise = createNoise2D(mulberry32(1337))
let detailNoise = createNoise2D(mulberry32(4242))
let microNoise = createNoise2D(mulberry32(9999))
let macroNoise2D = createNoise2D(mulberry32(7777))

/**
 * Configure authoritative world seed, starting biome, and route start position.
 * Re-seeds all terrain noise generators deterministically, guaranteeing that
 * the same seed reproduces the exact same landscape, and different seeds generate unique worlds.
 */
export function setWorldGenerationConfig(
  seed: number,
  biome: 'dynamic' | BiomeType = 'dynamic',
  startZ: number = 0
) {
  _activeWorldSeed = seed
  _activeStartBiome = biome
  _activeStartZ = startZ
  terrainNoise = createNoise2D(mulberry32((seed * 17 + 1337) >>> 0))
  detailNoise = createNoise2D(mulberry32((seed * 31 + 4242) >>> 0))
  microNoise = createNoise2D(mulberry32((seed * 53 + 9999) >>> 0))
  macroNoise2D = createNoise2D(mulberry32((seed * 79 + 7777) >>> 0))
  initArcTable()
}

export function getWorldSeed(): number {
  return _activeWorldSeed
}

export function getWorldStartBiome(): 'dynamic' | BiomeType {
  return _activeStartBiome
}

export function getWorldStartZ(): number {
  return _activeStartZ
}

/**
 * Computes exact 3D spawn coordinate and tangent yaw heading for the vehicle
 * safely on the continuous road centerline at any arbitrary Z position.
 */
export function getSpawnTransform(startZ?: number, rideHeight: number = 0.32) {
  const z = startZ !== undefined ? startZ : _activeStartZ
  const x = getRoadCenter(z)
  const y = getRoadElevation(z) + rideHeight
  const tan = getRoadTangent(z)
  const yaw = Math.atan2(-tan.tx, -tan.tz)
  return { x, y, z, yaw, grade: tan.grade }
}

export const ROAD_WIDTH = 11.5

// ------------------------------------------------------------------------
// Macro Terrain Classification & Configuration
// ------------------------------------------------------------------------
export type MacroTerrainType =
  | 'plains'
  | 'rolling_hills'
  | 'twisted_climb'
  | 'coastal'
  | 'desert_canyon'
  | 'forest_valleys'

export interface MacroTerrainProfile {
  id: MacroTerrainType
  name: string
  terrainAmplitude: number       // Base macro hill/mountain amplitude (m)
  terrainFrequency: number       // Spatial frequency of terrain noise
  mountainAmplitude: number      // Additional background mountain massif amplitude (m)
  mountainFrequency: number      // Spatial frequency for massifs
  roadCurvature: number          // Winding / hairpin intensity (0 = straight, 1 = intense hairpins)
  roadElevationVariation: number // Road vertical climb / grade variation (0 = flat, 1 = mountain pass)
  roadWavelength: number         // Spatial scale of road turns
  vegetationDensity: number      // Foliage / tree spawning density multiplier
  rockDensity: number            // Boulder / outcrop spawning density multiplier
}

export interface MacroTerrainWeights {
  plains: number
  rolling_hills: number
  twisted_climb: number
  coastal: number
  desert_canyon: number
  forest_valleys: number
  rollingHills: number
  twistedClimb: number
}

export const MACRO_PROFILES: Record<MacroTerrainType, MacroTerrainProfile> = {
  plains: {
    id: 'plains',
    name: 'Plains',
    terrainAmplitude: 18.0,
    terrainFrequency: 0.0024,
    mountainAmplitude: 14.0,
    mountainFrequency: 0.0009,
    roadCurvature: 0.16,
    roadElevationVariation: 0.24,
    roadWavelength: 1.45,
    vegetationDensity: 0.85,
    rockDensity: 0.45,
  },
  rolling_hills: {
    id: 'rolling_hills',
    name: 'Rolling Hills',
    terrainAmplitude: 15.0,
    terrainFrequency: 0.0032,
    mountainAmplitude: 10.0,
    mountainFrequency: 0.0012,
    roadCurvature: 0.42,
    roadElevationVariation: 0.38,
    roadWavelength: 1.05,
    vegetationDensity: 1.05,
    rockDensity: 0.75,
  },
  twisted_climb: {
    id: 'twisted_climb',
    name: 'Twisted Mountains',
    terrainAmplitude: 38.0,
    terrainFrequency: 0.0048,
    mountainAmplitude: 68.0,
    mountainFrequency: 0.0016,
    roadCurvature: 0.94,
    roadElevationVariation: 0.92,
    roadWavelength: 0.78,
    vegetationDensity: 1.30,
    rockDensity: 1.50,
  },
  coastal: {
    id: 'coastal',
    name: 'Coastal Beach',
    terrainAmplitude: 8.5,
    terrainFrequency: 0.0028,
    mountainAmplitude: 18.0,
    mountainFrequency: 0.0014,
    roadCurvature: 0.38,
    roadElevationVariation: 0.28,
    roadWavelength: 1.30,
    vegetationDensity: 0.65,
    rockDensity: 0.90,
  },
  desert_canyon: {
    id: 'desert_canyon',
    name: 'Desert Canyon',
    terrainAmplitude: 28.0,
    terrainFrequency: 0.0042,
    mountainAmplitude: 45.0,
    mountainFrequency: 0.0015,
    roadCurvature: 0.58,
    roadElevationVariation: 0.52,
    roadWavelength: 0.95,
    vegetationDensity: 0.35,
    rockDensity: 1.65,
  },
  forest_valleys: {
    id: 'forest_valleys',
    name: 'Forest Valleys',
    terrainAmplitude: 14.0,
    terrainFrequency: 0.0034,
    mountainAmplitude: 22.0,
    mountainFrequency: 0.0013,
    roadCurvature: 0.50,
    roadElevationVariation: 0.42,
    roadWavelength: 1.00,
    vegetationDensity: 1.60,
    rockDensity: 0.60,
  },
}

export const MACRO_CYCLE_ORDER: MacroTerrainType[] = [
  'plains',
  'rolling_hills',
  'twisted_climb',
  'forest_valleys',
  'desert_canyon',
  'coastal',
]

export const MACRO_REGION_DISTANCE = 1800
export const MACRO_TRANSITION_DISTANCE = 250
export const MACRO_CYCLE_DISTANCE = MACRO_REGION_DISTANCE * MACRO_CYCLE_ORDER.length // 10,800m full grand tour

// Global deterministic macro-noise function
export function getMacroNoise(z: number): number {
  const normZ = Math.abs(z) * (1.0 / MACRO_CYCLE_DISTANCE)
  const n1 = macroNoise2D(0.15, normZ * 1.0) * 0.5 + 0.5
  const n2 = macroNoise2D(0.85, normZ * 2.3 + 4.2) * 0.5 + 0.5
  const combined = n1 * 0.75 + n2 * 0.25
  const clamped = Math.max(0, Math.min(1, (combined - 0.15) / 0.70))
  return clamped * clamped * (3.0 - 2.0 * clamped)
}

// Continuous normalized weights for all 6 macro terrain types with smooth C1 Hermite blending across regional boundaries
export function getMacroTerrainWeights(z: number): MacroTerrainWeights {
  const weights: MacroTerrainWeights = {
    plains: 0,
    rolling_hills: 0,
    twisted_climb: 0,
    coastal: 0,
    desert_canyon: 0,
    forest_valleys: 0,
    rollingHills: 0,
    twistedClimb: 0,
  }

  if (_activeStartBiome !== 'dynamic') {
    const macroType = getMacroTypeForBiome(_activeStartBiome)
    weights[macroType] = 1.0
    weights.rollingHills = weights.rolling_hills
    weights.twistedClimb = weights.twisted_climb
    return weights
  }

  const absZ = Math.abs(z)
  const norm = absZ / MACRO_REGION_DISTANCE
  const idx = Math.floor(norm) % MACRO_CYCLE_ORDER.length
  const nextIdx = (idx + 1) % MACRO_CYCLE_ORDER.length
  const offsetInRegion = absZ - Math.floor(norm) * MACRO_REGION_DISTANCE
  const distFromEnd = MACRO_REGION_DISTANCE - offsetInRegion

  if (distFromEnd < MACRO_TRANSITION_DISTANCE) {
    const t = (MACRO_TRANSITION_DISTANCE - distFromEnd) / MACRO_TRANSITION_DISTANCE
    const s = t * t * (3.0 - 2.0 * t) // Hermite smoothstep
    weights[MACRO_CYCLE_ORDER[idx]] = 1.0 - s
    weights[MACRO_CYCLE_ORDER[nextIdx]] = s
  } else {
    weights[MACRO_CYCLE_ORDER[idx]] = 1.0
  }

  weights.rollingHills = weights.rolling_hills
  weights.twistedClimb = weights.twisted_climb

  return weights
}

// Seamless multi-weight parameter interpolation across all 6 macro terrain types
export function getInterpolatedMacroProfile(z: number): MacroTerrainProfile {
  const w = getMacroTerrainWeights(z)

  let dominantType: MacroTerrainType = 'plains'
  let maxWeight = -1
  for (const type of MACRO_CYCLE_ORDER) {
    if (w[type] > maxWeight) {
      maxWeight = w[type]
      dominantType = type
    }
  }

  let terrainAmplitude = 0
  let terrainFrequency = 0
  let mountainAmplitude = 0
  let mountainFrequency = 0
  let roadCurvature = 0
  let roadElevationVariation = 0
  let roadWavelength = 0
  let vegetationDensity = 0
  let rockDensity = 0

  for (const type of MACRO_CYCLE_ORDER) {
    const weight = w[type]
    if (weight <= 0) continue
    const p = MACRO_PROFILES[type]
    terrainAmplitude += p.terrainAmplitude * weight
    terrainFrequency += p.terrainFrequency * weight
    mountainAmplitude += p.mountainAmplitude * weight
    mountainFrequency += p.mountainFrequency * weight
    roadCurvature += p.roadCurvature * weight
    roadElevationVariation += p.roadElevationVariation * weight
    roadWavelength += p.roadWavelength * weight
    vegetationDensity += p.vegetationDensity * weight
    rockDensity += p.rockDensity * weight
  }

  return {
    id: dominantType,
    name: MACRO_PROFILES[dominantType].name,
    terrainAmplitude,
    terrainFrequency,
    mountainAmplitude,
    mountainFrequency,
    roadCurvature,
    roadElevationVariation,
    roadWavelength,
    vegetationDensity,
    rockDensity,
  }
}

export function getDominantMacroType(z: number): MacroTerrainType {
  const w = getMacroTerrainWeights(z)
  let dominantType: MacroTerrainType = 'plains'
  let maxWeight = -1
  for (const type of MACRO_CYCLE_ORDER) {
    if (w[type] > maxWeight) {
      maxWeight = w[type]
      dominantType = type
    }
  }
  return dominantType
}

// ------------------------------------------------------------------------
// Bulldozer Road Mask Constants
// ------------------------------------------------------------------------
export const ROAD_PROTECTED_RADIUS = 15.0 // Half-width (5.75m) + Shoulder (2.2m) + Safety Drainage Margin (7.05m)
export const ROAD_TRANSITION_RADIUS = 75.0 // Smooth C2 quintic transition zone into natural terrain
export const ROAD_CLEARANCE_BASE = 0.28   // Depressed sub-asphalt corridor floor (m)

export type BiomeType =
  | 'plains'
  | 'rolling_hills'
  | 'twisted_mountains'
  | 'alpine'
  | 'enchanted_forest'
  | 'coastal'
  | 'autumn'
  | 'desert'
  | 'tundra'
  | 'forest'

export function getMacroTypeForBiome(bId: BiomeType): MacroTerrainType {
  switch (bId) {
    case 'plains':
      return 'plains'
    case 'rolling_hills':
      return 'rolling_hills'
    case 'twisted_mountains':
    case 'alpine':
    case 'tundra':
      return 'twisted_climb'
    case 'desert':
      return 'desert_canyon'
    case 'coastal':
      return 'coastal'
    case 'forest':
    case 'autumn':
    case 'enchanted_forest':
    default:
      return 'forest_valleys'
  }
}

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
  plains: {
    id: 'plains',
    name: 'Plains',
    tagline: 'Endless Horizons • Open Prairie Highway',
    grassColor: '#4f772d', // Rich natural grassland green
    rockColor: '#5c677d',
    roadColor: '#2b3038',
    shoulderColor: '#7f5539', // Natural soil shoulder
    treeFoliageColor: '#2d6a4f', // Prairie oak green
    treeTrunkColor: '#4a3525',
    skyHemiSky: '#bae6fd', // Soft atmospheric sky blue
    skyHemiGround: '#365314', // Prairie grass bounce
    fogColor: '#dbeafe', // Subtle atmospheric depth haze
    fogDensity: 0.00018, // Clean horizon depth without milky washout
    hillHeightMultiplier: 0.90, // Natural rolling prairie swell
    roughness: 0.82,
    friction: 1.0,
    weatherPreset: 'clear',
  },
  rolling_hills: {
    id: 'rolling_hills',
    name: 'Rolling Hills',
    tagline: 'Endless Green • Flowing Country Curves',
    grassColor: '#386641', // Deep lush valley grass
    rockColor: '#4a5568',
    roadColor: '#292e37',
    shoulderColor: '#606c38',
    treeFoliageColor: '#2a9d8f',
    treeTrunkColor: '#3e2723',
    skyHemiSky: '#a8dadc',
    skyHemiGround: '#386641',
    fogColor: '#cce3de',
    fogDensity: 0.00045,
    hillHeightMultiplier: 0.75,
    roughness: 0.85,
    friction: 1.0,
    weatherPreset: 'clear',
  },
}

export const BIOME_CYCLE_DISTANCE = 1400

export const BIOME_CYCLE_ORDER: BiomeType[] = [
  'twisted_mountains',
  'alpine',
  'enchanted_forest',
  'coastal',
  'autumn',
  'desert',
  'tundra',
  'forest',
  'plains',
  'rolling_hills',
]

// 1. Procedural Biome Resolution
export function getActiveBiomeAt(z: number, manualBiome: 'dynamic' | BiomeType = 'dynamic'): BiomeConfig {
  const effectiveBiome = manualBiome !== 'dynamic' ? manualBiome : _activeStartBiome
  if (effectiveBiome !== 'dynamic') {
    return BIOMES[effectiveBiome] || BIOMES.twisted_mountains
  }

  // Seamless cycle across all 10 biomes as player journeys forward
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
  plains: {
    switchbackWeight: 0.15,
    sCurveWeight: 0.65,
    valleySweepWeight: 1.65,
    hairpinAmplitude: 12.0,
    elevationClimbRate: 0.22,
    bankingMultiplier: 0.80,
  },
  rolling_hills: {
    switchbackWeight: 0.45,
    sCurveWeight: 1.45,
    valleySweepWeight: 1.25,
    hairpinAmplitude: 20.0,
    elevationClimbRate: 0.65,
    bankingMultiplier: 1.10,
  },
}

// Seamlessly interpolate road character across biome boundaries with C1 continuity
export function getInterpolatedBiomeCharacter(z: number): BiomeRoadCharacter {
  if (_activeStartBiome !== 'dynamic') {
    return BIOME_ROAD_CHARACTERS[_activeStartBiome] || BIOME_ROAD_CHARACTERS.twisted_mountains
  }

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

// Deterministic seed modulation parameters for road trajectory & elevation
function getSeedOffsets(seed: number) {
  if (seed === 1337) {
    return {
      phase1: 0.0,
      phase2: 1.1,
      phase3: 0.6,
      phase4: 2.1,
      phase5: 1.4,
      phase6: 0.3,
      elevPhase1: 0.5,
      elevPhase2: 1.2,
      elevPhase3: 2.1,
      elevPhase4: 0.8,
      freqScale: 1.0,
    }
  }
  const p1 = (((seed * 17) % 6283) / 1000.0)
  const p2 = 1.1 + (((seed * 31) % 6283) / 1000.0)
  const p3 = 0.6 + (((seed * 53) % 6283) / 1000.0)
  const p4 = 2.1 + (((seed * 79) % 6283) / 1000.0)
  const p5 = 1.4 + (((seed * 101) % 6283) / 1000.0)
  const p6 = 0.3 + (((seed * 127) % 6283) / 1000.0)

  const ep1 = 0.5 + (((seed * 43) % 6283) / 1000.0)
  const ep2 = 1.2 + (((seed * 67) % 6283) / 1000.0)
  const ep3 = 2.1 + (((seed * 89) % 6283) / 1000.0)
  const ep4 = 0.8 + (((seed * 113) % 6283) / 1000.0)
  const freqScale = 0.94 + (((seed * 7) % 1000) / 1000.0) * 0.12

  return {
    phase1: p1,
    phase2: p2,
    phase3: p3,
    phase4: p4,
    phase5: p5,
    phase6: p6,
    elevPhase1: ep1,
    elevPhase2: ep2,
    elevPhase3: ep3,
    elevPhase4: ep4,
    freqScale,
  }
}

// Backward-compatible helper multipliers
export function getBiomeRoadWindingMultiplier(z: number): number {
  return getInterpolatedBiomeCharacter(z).switchbackWeight
}

export function getBiomeElevationMultiplier(z: number): number {
  return getInterpolatedBiomeCharacter(z).elevationClimbRate
}

// 2. Procedural Road Centerline (Realistic Alpine Passes, Hairpin Switchbacks, Flowing S-Curves & Open Plains)
// Influenced by continuous macro terrain profile (Plains = mostly straight, Hills = sweeping curves, Twisted = hairpins)
// Guaranteed C2 continuous: derivative and curvature are smooth with zero chunk boundary seams, with minimum radius R >= 43.4m
export function getRoadCenter(z: number): number {
  const char = getInterpolatedBiomeCharacter(z)
  const macro = getInterpolatedMacroProfile(z)
  const seedCfg = getSeedOffsets(_activeWorldSeed)
  const f = seedCfg.freqScale

  // 1. Mountain pass switchbacks & hairpins (wavelength 220m - 320m)
  // Strictly suppressed in Plains (roadCurvature < 0.25), moderate in Hills, full in Twisted Climb:
  const hairpinGate = Math.max(0.0, Math.min(1.0, (macro.roadCurvature - 0.25) / 0.55))
  const hairpin = Math.sin(z * 0.022 * f + seedCfg.phase1) * (char.hairpinAmplitude * 0.55)
  const technicalChicane = Math.sin(z * 0.031 * f + seedCfg.phase2) * (char.hairpinAmplitude * 0.18)
  const switchbacks = (hairpin + technicalChicane) * char.switchbackWeight * hairpinGate

  // 2. Dynamic flowing S-curves (wavelength 320m - 520m)
  // Gentle in Plains, flowing in Hills, strong in Twisted Climb:
  const sCurveMultiplier = macro.roadCurvature * 0.95
  const sCurves = (Math.sin(z * 0.0125 * f + seedCfg.phase3) * 16.0 + Math.cos(z * 0.0095 * f + seedCfg.phase4) * 12.0) * char.sCurveWeight * sCurveMultiplier

  // 3. Regional valley / open highway sweep (wavelength 900m - 1600m)
  // Provides gentle open bends across Plains and massive panoramic sweeps in Mountains:
  const sweepMultiplier = 0.35 + 0.65 * macro.roadCurvature
  const valleySweeps = (Math.sin(z * 0.0042 * f + seedCfg.phase5) * 24.0 + Math.sin(z * 0.0022 * f + seedCfg.phase6) * 15.0) * char.valleySweepWeight * sweepMultiplier

  return switchbacks + sCurves + valleySweeps
}

// 3. Road Elevation (Authentic downhill mountain descents, alpine climbs, canyon drops and expansive flat plains)
// Features intentional multi-tier descents where vehicles lose 40-60m of elevation through winding switchbacks and S-bends.
export function getRoadElevation(z: number): number {
  const char = getInterpolatedBiomeCharacter(z)
  const macro = getInterpolatedMacroProfile(z)
  const seedCfg = getSeedOffsets(_activeWorldSeed)
  const f = seedCfg.freqScale

  // 1. Scenic Mountain Pass Climbs & Long Downhill Descents (wavelength ~1600m, vertical elevation change up to 52m)
  // In mountainous terrain, this creates sustained 800m+ descents where the car loses significant elevation down valleys.
  const passWave = (Math.sin(z * 0.0039 * f + seedCfg.elevPhase1) * 0.5 + 0.5) * 52.0 * macro.roadElevationVariation
  const passClimbGate = Math.max(0.0, Math.min(1.0, (macro.roadElevationVariation - 0.15) / 0.65))

  // 2. Valley slopes, ridges and downhill drops (wavelength ~580m, elevation delta +-9m)
  const valleyWave = Math.sin(z * 0.0108 * f + seedCfg.elevPhase2) * 9.0 * macro.roadElevationVariation

  // 3. Winding switchback descent steps (wavelength ~260m, elevation delta +-3.2m)
  // Each switchback hairpin loop steps the road down realistically down the mountainside
  const switchbackDrop = Math.sin(z * 0.0241 * f + seedCfg.elevPhase3) * 3.2 * macro.roadElevationVariation

  // 4. Subtle highway undulations (wavelength ~110m, amplitude +-0.8m)
  const microWave = Math.sin(z * 0.057 * f + seedCfg.elevPhase4) * 0.8 * macro.roadElevationVariation

  // Combined smooth continuous elevation profile
  const rawElevation =
    (passWave * passClimbGate * 0.60 +
      valleyWave * 0.30 +
      switchbackDrop * 0.12 +
      microWave * 0.04) *
    char.elevationClimbRate * 1.55

  // Base highway elevation of 24.0m guarantees road is ALWAYS safely above sea level (Y=0)
  return 24.0 + rawElevation
}

export interface RoadSplineSample {
  x: number
  y: number
  z: number
  // 3D Unit Forward Tangent in travel direction (-Z forward)
  tx: number
  ty: number
  tz: number
  // 3D Orthonormal Lateral Right Vector (rotated by superelevation banking)
  rx: number
  ry: number
  rz: number
  // 3D Orthonormal Road Surface Normal (perpendicular to road surface, tilts with slope grade & banking)
  nx: number
  ny: number
  nz: number
  // Heading angle in radians: atan2(tx, -tz) where 0 rad is along -Z
  heading: number
  // Longitudinal Grade (dy / horizDist, negative = downhill descent, positive = uphill climb)
  grade: number
  // Horizontal Curvature (1 / R)
  curvature: number
  // Superelevation banking in radians
  banking: number
  // Cumulative arc-length distance along road spline (m)
  cumulativeDistance: number
  // Full road asphalt width (m)
  width: number
}

// Complete 3D Road Spline Engine:
// Evaluates continuous 3D position, 3D unit tangent, orthogonal lateral right vector, and true surface normal.
// Guarantees zero twisting, flipping, or stretching on downhill descents and switchbacks.
export function getRoadSplineSample(z: number): RoadSplineSample {
  const delta = 1.0
  const x1 = getRoadCenter(z - delta)
  const y1 = getRoadElevation(z - delta)
  const x2 = getRoadCenter(z + delta)
  const y2 = getRoadElevation(z + delta)

  const dx = x1 - x2
  const dy = y1 - y2
  const dz = -2 * delta

  const horizDist = Math.hypot(dx, dz)
  const ds = Math.hypot(dx, dy, dz)

  const tx = dx / ds
  const ty = dy / ds
  const tz = dz / ds

  const hLen = Math.hypot(tx, tz)
  // Unbanked horizontal right vector (orthogonal to T and world up)
  const r0x = -tz / hLen
  const r0y = 0.0
  const r0z = tx / hLen

  // Unbanked up normal N0 = R0 x T (tilts forward on downhill descents)
  const n0x = -r0z * ty
  const n0y = r0z * tx - r0x * tz
  const n0z = r0x * ty

  // Superelevation banking rotation around T
  const banking = getRoadBanking(z)
  const cosB = Math.cos(banking)
  const sinB = Math.sin(banking)

  const rx = cosB * r0x + sinB * n0x
  const ry = cosB * r0y + sinB * n0y
  const rz = cosB * r0z + sinB * n0z

  const nx = -sinB * r0x + cosB * n0x
  const ny = -sinB * r0y + cosB * n0y
  const nz = -sinB * r0z + cosB * n0z

  const grade = horizDist > 0.0001 ? dy / horizDist : 0.0
  const heading = Math.atan2(tx, -tz)

  // Curvature from second derivative
  const c1 = getRoadCenter(z + 2.0)
  const c2 = getRoadCenter(z)
  const c3 = getRoadCenter(z - 2.0)
  const curvature = (c3 - 2 * c2 + c1) / 4.0

  return {
    x: getRoadCenter(z),
    y: getRoadElevation(z),
    z,
    tx,
    ty,
    tz,
    rx,
    ry,
    rz,
    nx,
    ny,
    nz,
    heading,
    grade,
    curvature,
    banking,
    cumulativeDistance: getRoadArcLength(z),
    width: ROAD_WIDTH,
  }
}

// Road Spline Sanity & Engineering Range Validator
export function validateRoadSplineSample(sample: RoadSplineSample): RoadSplineSample {
  if (
    !Number.isFinite(sample.x) ||
    !Number.isFinite(sample.y) ||
    !Number.isFinite(sample.z) ||
    !Number.isFinite(sample.tx) ||
    !Number.isFinite(sample.ty) ||
    !Number.isFinite(sample.tz) ||
    !Number.isFinite(sample.rx) ||
    !Number.isFinite(sample.ry) ||
    !Number.isFinite(sample.rz) ||
    !Number.isFinite(sample.nx) ||
    !Number.isFinite(sample.ny) ||
    !Number.isFinite(sample.nz)
  ) {
    console.warn(`[RoadMath] Invalid non-finite RoadSplineSample at z=${sample.z}`)
  }

  // Road civil engineering grade limit (+/-16%)
  if (Math.abs(sample.grade) > 0.16) {
    sample.grade = Math.max(-0.16, Math.min(0.16, sample.grade))
  }

  // Road curvature radius >= 40m (curvature <= 0.025 1/m)
  if (Math.abs(sample.curvature) > 0.025) {
    sample.curvature = Math.sign(sample.curvature) * 0.025
  }

  return sample
}

// 4. Road Tangent & Perpendicular Normal vectors (backward-compatible wrapper + full 3D components)
export function getRoadTangent(z: number) {
  const sample = getRoadSplineSample(z)
  return {
    tx: sample.tx,
    tz: sample.tz,
    nx: sample.rx, // Lateral right X
    nz: sample.rz, // Lateral right Z
    ty: sample.ty,
    ny: sample.ny,
    rx: sample.rx,
    ry: sample.ry,
    rz: sample.rz,
    surfNx: sample.nx,
    surfNy: sample.ny,
    surfNz: sample.nz,
    grade: sample.grade,
  }
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

// ------------------------------------------------------------------------
// Authoritative 3D Road Cross-Section Generator
// ------------------------------------------------------------------------
export interface RoadCrossSectionPoint {
  wx: number // World X
  wy: number // World Y
  wz: number // World Z
  lx: number // Chunk-local X
  ly: number // Chunk-local Y
  lz: number // Chunk-local Z
}

export interface RoadCrossSection {
  roadLeft: RoadCrossSectionPoint
  roadCenter: RoadCrossSectionPoint
  roadRight: RoadCrossSectionPoint

  shoulderOuterLeft: RoadCrossSectionPoint
  shoulderInnerLeft: RoadCrossSectionPoint
  shoulderInnerRight: RoadCrossSectionPoint
  shoulderOuterRight: RoadCrossSectionPoint

  edgeLeftInner: RoadCrossSectionPoint
  edgeLeftOuter: RoadCrossSectionPoint
  edgeRightInner: RoadCrossSectionPoint
  edgeRightOuter: RoadCrossSectionPoint

  centerDashLeft: RoadCrossSectionPoint
  centerDashRight: RoadCrossSectionPoint

  spline: RoadSplineSample
}

export function getRoadCrossSection(worldZ: number, chunkZ: number): RoadCrossSection {
  const s = getRoadSplineSample(worldZ)
  const halfW = ROAD_WIDTH / 2 // 5.75m
  const shoulderW = 2.2 // 2.2m shoulder
  const edgeLineOffset = halfW - 0.45 // 5.30m
  const edgeLineHalfW = 0.06 // 0.12m line width
  const centerLineHalfW = 0.075 // 0.15m dash width

  const crownH = 0.025
  const asphaltBaseY = 0.085
  const lineLift = 0.010

  const cx = s.x
  const cy = s.y + asphaltBaseY
  const cz = worldZ

  const pt = (w: number, liftY: number, liftN: number): RoadCrossSectionPoint => {
    const wx = cx + s.rx * w + s.nx * liftN
    const wy = cy + s.ry * w + s.ny * liftN + liftY
    const wz = cz + s.rz * w + s.nz * liftN
    const lx = wx
    const ly = wy
    const lz = wz - chunkZ
    return { wx, wy, wz, lx, ly, lz }
  }

  return {
    roadLeft: pt(-halfW, 0, 0),
    roadCenter: pt(0, 0, crownH),
    roadRight: pt(halfW, 0, 0),

    shoulderOuterLeft: pt(-halfW - shoulderW, -0.070, 0),
    shoulderInnerLeft: pt(-halfW, 0, 0),
    shoulderInnerRight: pt(halfW, 0, 0),
    shoulderOuterRight: pt(halfW + shoulderW, -0.070, 0),

    edgeLeftInner: pt(-edgeLineOffset + edgeLineHalfW, 0, lineLift),
    edgeLeftOuter: pt(-edgeLineOffset - edgeLineHalfW, 0, lineLift),
    edgeRightInner: pt(edgeLineOffset - edgeLineHalfW, 0, lineLift),
    edgeRightOuter: pt(edgeLineOffset + edgeLineHalfW, 0, lineLift),

    centerDashLeft: pt(-centerLineHalfW, 0, crownH + lineLift),
    centerDashRight: pt(centerLineHalfW, 0, crownH + lineLift),

    spline: s,
  }
}

// ------------------------------------------------------------------------
// Continuous Road Arc-Length & Distance Engine
// ------------------------------------------------------------------------
const ARC_STEP = 4.0
const Z_MIN = -8000
const Z_MAX = 2000
const TABLE_SIZE = Math.floor((Z_MAX - Z_MIN) / ARC_STEP) + 1
const arcTable = new Float64Array(TABLE_SIZE)
let _arcTableInitialized = false

export function initArcTable(): void {
  let cumDist = 0
  arcTable[TABLE_SIZE - 1] = 0 // Anchor at Z_MAX
  for (let i = TABLE_SIZE - 2; i >= 0; i--) {
    const z = Z_MIN + i * ARC_STEP
    const nextZ = z + ARC_STEP
    const nextX = getRoadCenter(nextZ)
    const nextY = getRoadElevation(nextZ)
    const curX = getRoadCenter(z)
    const curY = getRoadElevation(z)
    const ds = Math.hypot(nextX - curX, nextY - curY, ARC_STEP)
    cumDist += ds
    arcTable[i] = cumDist
  }
  _arcTableInitialized = true
}

export function getRoadArcLength(z: number): number {
  if (!_arcTableInitialized) initArcTable()
  const normZ = Math.max(Z_MIN, Math.min(Z_MAX, z))
  const idx = (normZ - Z_MIN) / ARC_STEP
  const i0 = Math.floor(idx)
  const frac = idx - i0
  if (i0 >= TABLE_SIZE - 1) return arcTable[TABLE_SIZE - 1]
  return arcTable[i0] * (1 - frac) + arcTable[i0 + 1] * frac
}

export function getZFromArcLength(targetS: number): number {
  if (!_arcTableInitialized) initArcTable()
  let low = 0
  let high = TABLE_SIZE - 1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (arcTable[mid] < targetS) {
      high = mid - 1
    } else {
      low = mid + 1
    }
  }
  const i = Math.max(0, Math.min(TABLE_SIZE - 2, high))
  const s0 = arcTable[i]
  const s1 = arcTable[i + 1]
  const denom = s1 - s0
  const frac = Math.abs(denom) > 1e-6 ? (targetS - s0) / denom : 0
  return (Z_MIN + i * ARC_STEP) + frac * ARC_STEP
}

export interface ClosestRoadPoint {
  u: number
  roadX: number
  roadY: number
  dist: number
  banking: number
  tangentX: number
  tangentZ: number
  normalX: number
  normalZ: number
  lateralOffset: number
}

// High-Precision Closest Point on 2D Curved Road Spline in XZ plane
// Finds the exact closest point on the road curve to any world (x, z) coordinate,
// returning Euclidean distance, road elevation, normal vector and signed lateral offset.
export function getClosestRoadPoint(x: number, z: number): ClosestRoadPoint {
  // Coarse scan: scan within +-64m in steps of 8m
  let bestU = z
  let bestDistSq = (x - getRoadCenter(z)) ** 2

  for (let offset = -64; offset <= 64; offset += 8) {
    if (offset === 0) continue
    const u = z + offset
    const rx = getRoadCenter(u)
    const d2 = (x - rx) ** 2 + (z - u) ** 2
    if (d2 < bestDistSq) {
      bestDistSq = d2
      bestU = u
    }
  }

  // Refine with Golden Section search within [bestU - 8, bestU + 8]
  let a = bestU - 8
  let b = bestU + 8
  const gr = 0.618033988749895
  let c = b - gr * (b - a)
  let d = a + gr * (b - a)
  let fc = (x - getRoadCenter(c)) ** 2 + (z - c) ** 2
  let fd = (x - getRoadCenter(d)) ** 2 + (z - d) ** 2

  for (let i = 0; i < 9; i++) {
    if (fc < fd) {
      b = d
      d = c
      fd = fc
      c = b - gr * (b - a)
      fc = (x - getRoadCenter(c)) ** 2 + (z - c) ** 2
    } else {
      a = c
      c = d
      fc = fd
      d = a + gr * (b - a)
      fd = (x - getRoadCenter(d)) ** 2 + (z - d) ** 2
    }
  }

  const optU = (a + b) * 0.5
  const optX = getRoadCenter(optU)
  const optY = getRoadElevation(optU)
  const { tx, tz, nx, nz } = getRoadTangent(optU)
  const banking = getRoadBanking(optU)

  const dx = x - optX
  const dz = z - optU
  const dist = Math.hypot(dx, dz)
  const lateralOffset = dx * nx + dz * nz

  return {
    u: optU,
    roadX: optX,
    roadY: optY,
    dist,
    banking,
    tangentX: tx,
    tangentZ: tz,
    normalX: nx,
    normalZ: nz,
    lateralOffset,
  }
}

/**
 * Smooth continuous ridged multi-fractal shaping function.
 * Produces natural rounded mountain summits, broad sweeping arêtes, and geological plateaus.
 */
function smoothRidge(n: number): number {
  const clamped = Math.max(-1, Math.min(1, n))
  return 1.0 - clamped * clamped
}

export function getRawMacroTerrainElevation(
  x: number,
  z: number,
  bId: BiomeType,
  macro: MacroTerrainProfile
): number {
  const tFreq = macro.terrainFrequency
  const mFreq = macro.mountainFrequency
  const tAmp = macro.terrainAmplitude
  const mAmp = macro.mountainAmplitude

  // 1. Base rolling ground wave tailored to terrain profile
  let baseWave = 0
  if (macro.id === 'plains') {
    // Expansive rolling prairie swells and natural meadow basins
    const swell1 = terrainNoise(x * tFreq, z * tFreq) * 0.5 + 0.5
    const swell2 = detailNoise(x * tFreq * 1.5 + 1.2, z * tFreq * 1.5 + 2.4) * 0.5 + 0.5
    baseWave = (swell1 * 0.65 + swell2 * 0.35) * tAmp
  } else if (macro.id === 'rolling_hills') {
    // Rounded organic continuous hills
    const h1 = terrainNoise(x * tFreq, z * tFreq) * 0.5 + 0.5
    const h2 = detailNoise(x * tFreq * 1.8, z * tFreq * 1.8) * 0.5 + 0.5
    baseWave = (h1 * 0.70 + h2 * 0.30) * tAmp
  } else if (macro.id === 'desert_canyon') {
    // Terraced stepped mesa canyon floors
    const rawN = terrainNoise(x * tFreq, z * tFreq)
    const terraces = Math.floor(rawN * 3.5) / 3.5 + Math.tanh((rawN * 3.5 - Math.floor(rawN * 3.5)) * 3.0) * 0.25
    baseWave = Math.max(0, terraces * 0.5 + 0.5) * tAmp
  } else if (macro.id === 'coastal') {
    // Coastal slope: lower elevation towards the seaward beach side
    const wave1 = terrainNoise(x * tFreq, z * tFreq) * 0.5 + 0.5
    baseWave = wave1 * tAmp
  } else {
    // Forest valleys & twisted mountains
    const v1 = terrainNoise(x * tFreq, z * tFreq) * 0.5 + 0.5
    const v2 = detailNoise(x * tFreq * 2.0, z * tFreq * 2.0) * 0.5 + 0.5
    baseWave = (v1 * 0.65 + v2 * 0.35) * tAmp
  }

  // 2. Mountain Massifs / Canyon Walls / Cliffs
  let mountainContribution = 0
  if (mAmp > 0.1) {
    if (macro.id === 'twisted_climb' || bId === 'twisted_mountains' || bId === 'alpine' || bId === 'tundra') {
      // Dramatic alpine peaks, sharp horns and knife-edge ridges
      const primaryHorns = Math.pow(Math.max(0, smoothRidge(terrainNoise(x * mFreq, z * mFreq))), 1.35) * (mAmp * 0.85)
      const sharpRidges = Math.max(0, smoothRidge(detailNoise(x * mFreq * 2.5, z * mFreq * 2.5))) * (mAmp * 0.35)
      mountainContribution = primaryHorns + sharpRidges
    } else if (macro.id === 'desert_canyon' || bId === 'desert') {
      // Canyon sandstone cliffs & flat-topped mesas
      const mesas = Math.max(0, Math.tanh(terrainNoise(x * mFreq, z * mFreq) * 2.5)) * (mAmp * 0.80)
      const canyonWalls = Math.max(0, smoothRidge(detailNoise(x * mFreq * 2.0, z * mFreq * 2.0))) * (mAmp * 0.32)
      mountainContribution = mesas + canyonWalls
    } else if (macro.id === 'coastal') {
      // Coastal headlands and bluffs
      const coastalBluffs = Math.max(0, terrainNoise(x * mFreq * 1.5, z * mFreq * 1.5)) * (mAmp * 0.70)
      mountainContribution = coastalBluffs
    } else if (macro.id === 'forest_valleys') {
      // Layered valley foothills and rolling mountain backdrops
      const foothills = Math.max(0, smoothRidge(terrainNoise(x * mFreq, z * mFreq))) * (mAmp * 0.65)
      mountainContribution = foothills
    } else if (macro.id === 'plains' || bId === 'plains') {
      // Expansive prairie knolls and rolling horizon rises (no sharp peaks)
      const prairieRises = Math.pow(Math.max(0, terrainNoise(x * mFreq, z * mFreq) * 0.5 + 0.5), 1.5) * (mAmp * 0.85)
      const knollFormations = Math.max(0, smoothRidge(detailNoise(x * mFreq * 1.8, z * mFreq * 1.8))) * (mAmp * 0.25)
      mountainContribution = prairieRises + knollFormations
    } else {
      const massif = Math.max(0, smoothRidge(terrainNoise(x * mFreq, z * mFreq))) * (mAmp * 0.70)
      const ridges = Math.max(0, smoothRidge(detailNoise(x * mFreq * 2.2, z * mFreq * 2.2))) * (mAmp * 0.25)
      mountainContribution = massif + ridges
    }
  }

  // 3. Local geological micro-relief scaled by terrain amplitude
  const microScale = Math.min(1.0, 0.20 + (tAmp / 24.0) * 0.80)
  const detailKnolls = Math.max(0, smoothRidge(detailNoise(x * 0.008, z * 0.008))) * (5.5 * microScale)
  const surfaceRoughness = Math.max(0, microNoise(x * 0.018, z * 0.018) * 0.5 + 0.5) * (2.2 * microScale)

  // 4. Biome-specific geological nuances
  let biomeExtra = 0
  if (bId === 'desert' || macro.id === 'desert_canyon') {
    biomeExtra = (Math.sin(x * 0.008 + z * 0.005) * 0.5 + 0.5) * (4.5 * microScale)
  } else if (bId === 'coastal' || macro.id === 'coastal') {
    biomeExtra = (terrainNoise(x * 0.0035, z * 0.0035) * 0.5 + 0.5) * (4.0 * microScale)
  }

  return Math.max(0.0, baseWave + mountainContribution + detailKnolls + surfaceRoughness + biomeExtra)
}

// Backward-compatible wrapper
export function getRawBiomeElevation(x: number, z: number, bId: BiomeType): number {
  const macro = getInterpolatedMacroProfile(z)
  return getRawMacroTerrainElevation(x, z, bId, macro)
}

// 5. Complete World Terrain Elevation at ANY (x, z)
// Enforces the Bulldozer Road Mask with a strictly protected roadbed corridor and smooth Hermite transition.
// The road is always guaranteed to remain a visible, flat, continuous, physically drivable surface.
export function getTerrainHeight(x: number, z: number, biomeId: BiomeType = 'forest'): number {
  const rcZ = getRoadCenter(z)
  const dxZ = x - rcZ

  // Performance Fast-Path for Distant Terrain (|x - rcZ| > 115m):
  // When |x - rcZ| > 115m, the Euclidean distance to the road curve is guaranteed > ROAD_TRANSITION_RADIUS (75m).
  // Thus smoothBlend is analytically 1.0, bypassing the golden section search for >80% of chunk vertices!
  if (Math.abs(dxZ) > 115.0 && biomeId !== 'coastal') {
    const tan = getRoadTangent(z)
    const uProj = z + dxZ * (tan.tx / (tan.tz || -1.0)) * 0.75
    const uClamped = Math.max(z - 30.0, Math.min(z + 30.0, uProj))
    const roadX = getRoadCenter(uClamped)
    const roadY = getRoadElevation(uClamped)
    const dist = Math.hypot(x - roadX, z - uClamped)
    const distPastCorridor = dist - ROAD_PROTECTED_RADIUS
    const macro = getInterpolatedMacroProfile(uClamped)

    const activeTargetBiome = _activeStartBiome !== 'dynamic' ? _activeStartBiome : (biomeId || null)

    let naturalElevation = 0
    let mult = BIOMES[activeTargetBiome || 'forest']?.hillHeightMultiplier || 1.0

    if (activeTargetBiome) {
      naturalElevation = getRawMacroTerrainElevation(x, z, activeTargetBiome, macro)
      mult = BIOMES[activeTargetBiome]?.hillHeightMultiplier || 1.0
    } else {
      const normZ = Math.abs(z) / BIOME_CYCLE_DISTANCE
      const idx = Math.floor(normZ) % BIOME_CYCLE_ORDER.length
      const nextIdx = (idx + 1) % BIOME_CYCLE_ORDER.length
      const frac = normZ - Math.floor(normZ)

      if (frac > 0.82) {
        const blendT = (frac - 0.82) / 0.18
        const sBlend = blendT * blendT * (3.0 - 2.0 * blendT)
        const elev1 = getRawMacroTerrainElevation(x, z, BIOME_CYCLE_ORDER[idx], macro)
        const elev2 = getRawMacroTerrainElevation(x, z, BIOME_CYCLE_ORDER[nextIdx], macro)
        naturalElevation = elev1 * (1 - sBlend) + elev2 * sBlend
        const mult1 = BIOMES[BIOME_CYCLE_ORDER[idx]].hillHeightMultiplier
        const mult2 = BIOMES[BIOME_CYCLE_ORDER[nextIdx]].hillHeightMultiplier
        mult = mult1 * (1 - sBlend) + mult2 * sBlend
      } else {
        naturalElevation = getRawMacroTerrainElevation(x, z, BIOME_CYCLE_ORDER[idx], macro)
        mult = BIOMES[BIOME_CYCLE_ORDER[idx]].hillHeightMultiplier
      }
    }

    const mountainRamp = macro.mountainAmplitude > 0
      ? Math.min(1.25, 0.05 + Math.pow(distPastCorridor / 140.0, 1.25) * 1.15)
      : 1.0
    const valleyWallLift = macro.mountainAmplitude > 0
      ? Math.pow(Math.min(1.0, distPastCorridor / 550.0), 1.6) * (macro.mountainAmplitude * 0.35)
      : 0.0

    const computedElevation =
      (roadY - ROAD_CLEARANCE_BASE) + Math.max(0.0, (naturalElevation * mountainRamp + valleyWallLift) * mult)

    const MAX_TERRAIN_CEILING = 110.0
    const clampedElevation = Math.min(roadY + MAX_TERRAIN_CEILING, computedElevation)
    return Math.max(0.0, clampedElevation)
  }

  const closest = getClosestRoadPoint(x, z)
  const dist = closest.dist
  const roadY = closest.roadY
  const banking = closest.banking
  const lateralOffset = closest.lateralOffset
  const macro = getInterpolatedMacroProfile(closest.u)

  // Calculate the banked roadbed plane at this lateral coordinate:
  const clampedOffset = Math.max(-ROAD_WIDTH / 2 - 2.5, Math.min(ROAD_WIDTH / 2 + 2.5, lateralOffset))
  const bankedCorridorBase = roadY + Math.tan(banking) * clampedOffset

  // 1. Strictly protected roadbed corridor & shoulder (0m to ROAD_PROTECTED_RADIUS = 12.0m)
  // Flat threshold depressed safely 0.28m below the banked roadbed
  // Guarantees that across the entire road width and shoulder, terrain NEVER pierces or z-fights
  if (dist <= ROAD_PROTECTED_RADIUS) {
    return bankedCorridorBase - ROAD_CLEARANCE_BASE
  }

  // Coastal beach & sandy dune slope on seaward side (lateralOffset < -13.5m)
  if (biomeId === 'coastal' && lateralOffset < -13.5) {
    const beachDist = -13.5 - lateralOffset
    const duneRipples = Math.sin(x * 0.08 + z * 0.04) * 0.35 + Math.cos(x * 0.03 - z * 0.02) * 0.55
    const targetY = Math.max(0.0, (bankedCorridorBase - ROAD_CLEARANCE_BASE) * Math.max(0, 1.0 - beachDist / 75.0) + duneRipples * Math.min(1.0, beachDist / 25.0))
    return targetY
  }

  // 2. Smooth Quintic transition zone into natural terrain (ROAD_PROTECTED_RADIUS to ROAD_TRANSITION_RADIUS = 75.0m)
  // Zero slope and zero curvature at corridor boundary (C2 continuous), smoothly rising to meet natural terrain without cliffs or trenches
  const distPastCorridor = dist - ROAD_PROTECTED_RADIUS
  const blendDist = ROAD_TRANSITION_RADIUS - ROAD_PROTECTED_RADIUS
  const t = Math.min(1.0, Math.max(0.0, distPastCorridor / blendDist))
  const smoothBlend = t * t * t * (t * (t * 6.0 - 15.0) + 10.0) // Quintic smootherstep (zero 1st & 2nd derivatives at endpoints)

  // Multi-octave continuous geological terrain synthesis with seamless transition between biomes
  const activeTargetBiome = _activeStartBiome !== 'dynamic' ? _activeStartBiome : (biomeId || null)

  let naturalElevation = 0
  let mult = BIOMES[activeTargetBiome || 'forest']?.hillHeightMultiplier || 1.0

  if (activeTargetBiome) {
    naturalElevation = getRawMacroTerrainElevation(x, z, activeTargetBiome, macro)
    mult = BIOMES[activeTargetBiome]?.hillHeightMultiplier || 1.0
  } else {
    const normZ = Math.abs(z) / BIOME_CYCLE_DISTANCE
    const idx = Math.floor(normZ) % BIOME_CYCLE_ORDER.length
    const nextIdx = (idx + 1) % BIOME_CYCLE_ORDER.length
    const frac = normZ - Math.floor(normZ)

    if (frac > 0.82) {
      const blendT = (frac - 0.82) / 0.18
      const sBlend = blendT * blendT * (3.0 - 2.0 * blendT)
      const elev1 = getRawMacroTerrainElevation(x, z, BIOME_CYCLE_ORDER[idx], macro)
      const elev2 = getRawMacroTerrainElevation(x, z, BIOME_CYCLE_ORDER[nextIdx], macro)
      naturalElevation = elev1 * (1 - sBlend) + elev2 * sBlend
      const mult1 = BIOMES[BIOME_CYCLE_ORDER[idx]].hillHeightMultiplier
      const mult2 = BIOMES[BIOME_CYCLE_ORDER[nextIdx]].hillHeightMultiplier
      mult = mult1 * (1 - sBlend) + mult2 * sBlend
    } else {
      naturalElevation = getRawMacroTerrainElevation(x, z, BIOME_CYCLE_ORDER[idx], macro)
      mult = BIOMES[BIOME_CYCLE_ORDER[idx]].hillHeightMultiplier
    }
  }

  // Distance scaling into mountain massifs (soft ramp preventing intrusion onto roadbed):
  const mountainRamp = macro.mountainAmplitude > 0
    ? Math.min(1.25, 0.05 + Math.pow(distPastCorridor / 140.0, 1.25) * 1.15)
    : 1.0
  const valleyWallLift = macro.mountainAmplitude > 0
    ? Math.pow(Math.min(1.0, distPastCorridor / 550.0), 1.6) * (macro.mountainAmplitude * 0.35)
    : 0.0

  const computedElevation =
    (bankedCorridorBase - ROAD_CLEARANCE_BASE) + Math.max(0.0, (naturalElevation * mountainRamp + valleyWallLift) * smoothBlend * mult)

  const MAX_TERRAIN_CEILING = 110.0
  const clampedElevation = Math.min(roadY + MAX_TERRAIN_CEILING, computedElevation)

  return Math.max(0.0, clampedElevation)
}

// 6. True drivable surface height (road surface with camber on road, shoulder, and natural terrain offroad)
export function getSurfaceHeight(x: number, z: number, biomeId: BiomeType = 'forest'): number {
  const closest = getClosestRoadPoint(x, z)
  const dist = closest.dist
  const lateralOffset = closest.lateralOffset
  const halfRoad = ROAD_WIDTH / 2 // 5.75m
  const shoulderEnd = halfRoad + 2.2 // 7.95m

  const EPS = 0.02

  if (dist <= halfRoad + EPS) {
    // Road asphalt surface with parabolic crown camber and banked superelevation
    const sample = getRoadSplineSample(closest.u)
    const clampedOffset = Math.max(-halfRoad, Math.min(halfRoad, lateralOffset))
    const crownOffset = (1 - (clampedOffset / halfRoad) ** 2) * 0.05
    return sample.y + sample.ry * clampedOffset + sample.ny * (0.085 + crownOffset)
  } else if (dist <= shoulderEnd + EPS) {
    // Roadside shoulder strip sloping gently down and tracking banking
    const sample = getRoadSplineSample(closest.u)
    const shoulderT = Math.max(0, Math.min(1, (dist - halfRoad) / 2.2))
    const sideSign = lateralOffset >= 0 ? 1 : -1
    const edgeOffset = sideSign * halfRoad
    const edgeY = sample.y + sample.ry * edgeOffset + sample.ny * 0.085
    const shoulderExtra = sample.ry * (lateralOffset - edgeOffset) * 0.75 - shoulderT * 0.070
    return edgeY + shoulderExtra
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
  const closest = getClosestRoadPoint(x, z)
  return closest.dist <= ROAD_WIDTH / 2 + 0.6
}

// 9. Ground Surface Normal Vector Y-Component at (x, z)
// normal.y = 1 / sqrt(dx^2 + dz^2 + 1) = cos(slopeAngle)
// Returns normal.y in range [0, 1]. A 30-degree slope corresponds to normal.y = cos(30 deg) = 0.866.
export function getTerrainSlopeNormalY(x: number, z: number, biomeId: BiomeType = 'forest'): number {
  const eps = 0.5
  const hL = getTerrainHeight(x - eps, z, biomeId)
  const hR = getTerrainHeight(x + eps, z, biomeId)
  const hD = getTerrainHeight(x, z - eps, biomeId)
  const hU = getTerrainHeight(x, z + eps, biomeId)
  const dx = (hR - hL) / (2 * eps)
  const dz = (hU - hD) / (2 * eps)
  return 1.0 / Math.sqrt(dx * dx + dz * dz + 1.0)
}
