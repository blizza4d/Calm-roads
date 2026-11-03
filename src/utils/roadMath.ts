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
const macroNoise2D = createNoise2D(mulberry32(7777))

export const ROAD_WIDTH = 11.5

// ------------------------------------------------------------------------
// Macro Terrain Classification & Configuration
// ------------------------------------------------------------------------
export type MacroTerrainType = 'plains' | 'rolling_hills' | 'twisted_climb'

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
  rollingHills: number
  twistedClimb: number
}

export const MACRO_PROFILES: Record<MacroTerrainType, MacroTerrainProfile> = {
  plains: {
    id: 'plains',
    name: 'Plains',
    terrainAmplitude: 3.2,
    terrainFrequency: 0.0022,
    mountainAmplitude: 0.0,
    mountainFrequency: 0.0010,
    roadCurvature: 0.12,
    roadElevationVariation: 0.10,
    roadWavelength: 1.35,
    vegetationDensity: 0.55,
    rockDensity: 0.35,
  },
  rolling_hills: {
    id: 'rolling_hills',
    name: 'Rolling Hills',
    terrainAmplitude: 13.5,
    terrainFrequency: 0.0035,
    mountainAmplitude: 8.5,
    mountainFrequency: 0.0014,
    roadCurvature: 0.44,
    roadElevationVariation: 0.40,
    roadWavelength: 1.05,
    vegetationDensity: 1.00,
    rockDensity: 0.85,
  },
  twisted_climb: {
    id: 'twisted_climb',
    name: 'Twisted Climb',
    terrainAmplitude: 30.0,
    terrainFrequency: 0.0050,
    mountainAmplitude: 48.0,
    mountainFrequency: 0.0018,
    roadCurvature: 0.92,
    roadElevationVariation: 0.88,
    roadWavelength: 0.80,
    vegetationDensity: 1.25,
    rockDensity: 1.40,
  },
}

export const MACRO_CYCLE_DISTANCE = 3800

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3.0 - 2.0 * x)
}

// Global deterministic macro-noise function
export function getMacroNoise(z: number): number {
  const normZ = Math.abs(z) * (1.0 / MACRO_CYCLE_DISTANCE)
  const n1 = macroNoise2D(0.15, normZ * 1.0) * 0.5 + 0.5
  const n2 = macroNoise2D(0.85, normZ * 2.3 + 4.2) * 0.5 + 0.5
  const combined = n1 * 0.75 + n2 * 0.25
  const clamped = Math.max(0, Math.min(1, (combined - 0.15) / 0.70))
  return clamped * clamped * (3.0 - 2.0 * clamped)
}

// Continuous normalized weights for transition bands
export function getMacroTerrainWeights(z: number): MacroTerrainWeights {
  const m = getMacroNoise(z)
  const plainsW = 1.0 - smoothstep(0.24, 0.44, m)
  const twistedW = smoothstep(0.56, 0.76, m)
  const hillsW = Math.max(0.001, 1.0 - plainsW - twistedW)
  const sum = plainsW + hillsW + twistedW
  return {
    plains: plainsW / sum,
    rollingHills: hillsW / sum,
    twistedClimb: twistedW / sum,
  }
}

// Seamless multi-weight parameter interpolation across macro terrain types
export function getInterpolatedMacroProfile(z: number): MacroTerrainProfile {
  const w = getMacroTerrainWeights(z)
  const p = MACRO_PROFILES.plains
  const h = MACRO_PROFILES.rolling_hills
  const t = MACRO_PROFILES.twisted_climb

  return {
    id: w.twistedClimb >= 0.48 ? 'twisted_climb' : w.plains >= 0.48 ? 'plains' : 'rolling_hills',
    name: w.twistedClimb >= 0.48 ? 'Twisted Climb' : w.plains >= 0.48 ? 'Plains' : 'Rolling Hills',
    terrainAmplitude: p.terrainAmplitude * w.plains + h.terrainAmplitude * w.rollingHills + t.terrainAmplitude * w.twistedClimb,
    terrainFrequency: p.terrainFrequency * w.plains + h.terrainFrequency * w.rollingHills + t.terrainFrequency * w.twistedClimb,
    mountainAmplitude: p.mountainAmplitude * w.plains + h.mountainAmplitude * w.rollingHills + t.mountainAmplitude * w.twistedClimb,
    mountainFrequency: p.mountainFrequency * w.plains + h.mountainFrequency * w.rollingHills + t.mountainFrequency * w.twistedClimb,
    roadCurvature: p.roadCurvature * w.plains + h.roadCurvature * w.rollingHills + t.roadCurvature * w.twistedClimb,
    roadElevationVariation: p.roadElevationVariation * w.plains + h.roadElevationVariation * w.rollingHills + t.roadElevationVariation * w.twistedClimb,
    roadWavelength: p.roadWavelength * w.plains + h.roadWavelength * w.rollingHills + t.roadWavelength * w.twistedClimb,
    vegetationDensity: p.vegetationDensity * w.plains + h.vegetationDensity * w.rollingHills + t.vegetationDensity * w.twistedClimb,
    rockDensity: p.rockDensity * w.plains + h.rockDensity * w.rollingHills + t.rockDensity * w.twistedClimb,
  }
}

export function getDominantMacroType(z: number): MacroTerrainType {
  const w = getMacroTerrainWeights(z)
  if (w.plains >= 0.48) return 'plains'
  if (w.twistedClimb >= 0.48) return 'twisted_climb'
  return 'rolling_hills'
}

// ------------------------------------------------------------------------
// Bulldozer Road Mask Constants
// ------------------------------------------------------------------------
export const ROAD_PROTECTED_RADIUS = 14.5 // Half-width (5.75m) + Flat Shoulder (3.25m) + Safety Drainage Margin (5.5m)
export const ROAD_TRANSITION_RADIUS = 75.0 // Smooth C2 quintic transition zone into natural terrain
export const ROAD_CLEARANCE_BASE = 0.28   // Depressed sub-asphalt corridor floor (m)

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

// 2. Procedural Road Centerline (Realistic Alpine Passes, Hairpin Switchbacks, Flowing S-Curves & Open Plains)
// Influenced by continuous macro terrain profile (Plains = mostly straight, Hills = sweeping curves, Twisted = hairpins)
// Guaranteed C2 continuous: derivative and curvature are smooth with zero chunk boundary seams
export function getRoadCenter(z: number): number {
  const char = getInterpolatedBiomeCharacter(z)
  const macro = getInterpolatedMacroProfile(z)

  // 1. Mountain pass switchbacks & hairpins (wavelength 160m - 240m)
  // Strictly suppressed in Plains (roadCurvature < 0.32), moderate in Hills, full in Twisted Climb:
  const hairpinGate = Math.max(0.0, Math.min(1.0, (macro.roadCurvature - 0.32) / 0.52))
  const hairpin = Math.tanh(Math.sin(z * 0.0322) * 1.85) * (char.hairpinAmplitude * 0.65)
  const technicalChicane = Math.sin(z * 0.048 + 1.1) * (char.hairpinAmplitude * 0.22)
  const switchbacks = (hairpin + technicalChicane) * char.switchbackWeight * hairpinGate

  // 2. Dynamic flowing S-curves (wavelength 280m - 440m)
  // Gentle in Plains, flowing in Hills, strong in Twisted Climb:
  const sCurveMultiplier = macro.roadCurvature * 0.95
  const sCurves = (Math.sin(z * 0.0175 + 0.6) * 19.0 + Math.cos(z * 0.0131 + 2.1) * 14.0) * char.sCurveWeight * sCurveMultiplier

  // 3. Regional valley / open highway sweep (wavelength 750m - 1400m)
  // Provides gentle open bends across Plains and massive panoramic sweeps in Mountains:
  const sweepMultiplier = 0.35 + 0.65 * macro.roadCurvature
  const valleySweeps = (Math.sin(z * 0.0057 + 1.4) * 28.0 + Math.sin(z * 0.0028 + 0.3) * 18.0) * char.valleySweepWeight * sweepMultiplier

  return switchbacks + sCurves + valleySweeps
}

// 3. Road Elevation (Drivable scenic mountain pass climbs, highway crests and expansive plains)
export function getRoadElevation(z: number): number {
  const char = getInterpolatedBiomeCharacter(z)
  const macro = getInterpolatedMacroProfile(z)

  // 1. Scenic Mountain Pass Climbs (wavelength ~780m, vertical rise up to 48m)
  // Suppressed in Plains to allow long flat driving stretches:
  const passWave = (Math.sin(z * 0.0080) * 0.5 + 0.5) * 36.0 + (Math.sin(z * 0.0039 + 1.2) * 0.5 + 0.5) * 22.0
  const passClimbGate = Math.max(0.0, Math.min(1.0, (macro.roadElevationVariation - 0.22) / 0.65))

  // 2. Rolling crests and valley passes (wavelength ~280m, amplitude +-9.5m)
  const valleyWave = Math.sin(z * 0.0224 + 0.8) * 9.5

  // 3. Gentle high-speed road undulation (wavelength ~110m, amplitude +-1.8m)
  const microWave = Math.sin(z * 0.057 + 2.1) * 1.8

  // Base highway elevation of 24.0m guarantees road is ALWAYS >= 16m above sea level (Y=0)
  return 24.0 + (passWave * passClimbGate + valleyWave * macro.roadElevationVariation + microWave * 0.5) * char.elevationClimbRate
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
  // Coarse scan +-60m in 6m steps around z for robust global basin detection
  let bestU = z
  let bestDistSq = (x - getRoadCenter(z)) ** 2

  for (let offset = -60; offset <= 60; offset += 6) {
    if (offset === 0) continue
    const u = z + offset
    const rx = getRoadCenter(u)
    const d2 = (x - rx) ** 2 + (z - u) ** 2
    if (d2 < bestDistSq) {
      bestDistSq = d2
      bestU = u
    }
  }

  // Refine with Golden Section search within [bestU - 6, bestU + 6]
  let a = bestU - 6
  let b = bestU + 6
  const gr = 0.618033988749895
  let c = b - gr * (b - a)
  let d = a + gr * (b - a)
  let fc = (x - getRoadCenter(c)) ** 2 + (z - c) ** 2
  let fd = (x - getRoadCenter(d)) ** 2 + (z - d) ** 2

  for (let i = 0; i < 12; i++) {
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

  // 1. Base rolling hill / lowland ground wave (scaled by macro terrain amplitude)
  const baseWave = (terrainNoise(x * tFreq, z * tFreq) * 0.5 + 0.5) * tAmp

  // 2. Mountain Massifs / alpine peaks (active when mountainAmplitude > 0, e.g. in Twisted Climb or background of Rolling Hills)
  let mountainContribution = 0
  if (mAmp > 0.1) {
    if (bId === 'twisted_mountains' || bId === 'alpine' || bId === 'tundra') {
      const primaryHorns = Math.pow(Math.max(0, smoothRidge(terrainNoise(x * mFreq, z * mFreq))), 1.35) * (mAmp * 0.85)
      const sharpRidges = Math.max(0, smoothRidge(detailNoise(x * mFreq * 2.5, z * mFreq * 2.5))) * (mAmp * 0.35)
      mountainContribution = primaryHorns + sharpRidges
    } else if (bId === 'desert') {
      const mesas = Math.max(0, Math.tanh(terrainNoise(x * mFreq, z * mFreq) * 2.2)) * (mAmp * 0.80)
      const canyonWalls = Math.max(0, smoothRidge(detailNoise(x * mFreq * 2.0, z * mFreq * 2.0))) * (mAmp * 0.30)
      mountainContribution = mesas + canyonWalls
    } else {
      const massif = Math.max(0, smoothRidge(terrainNoise(x * mFreq, z * mFreq))) * (mAmp * 0.75)
      const ridges = Math.max(0, smoothRidge(detailNoise(x * mFreq * 2.2, z * mFreq * 2.2))) * (mAmp * 0.28)
      mountainContribution = massif + ridges
    }
  }

  // 3. Local geological micro-relief scaled by terrain amplitude
  const microScale = Math.min(1.0, 0.25 + (tAmp / 24.0) * 0.75)
  const detailKnolls = Math.max(0, smoothRidge(detailNoise(x * 0.008, z * 0.008))) * (5.5 * microScale)
  const surfaceRoughness = Math.max(0, microNoise(x * 0.018, z * 0.018) * 0.5 + 0.5) * (2.2 * microScale)

  // 4. Biome-specific geological nuances
  let biomeExtra = 0
  if (bId === 'desert') {
    biomeExtra = (Math.sin(x * 0.008 + z * 0.005) * 0.5 + 0.5) * (4.5 * microScale)
  } else if (bId === 'coastal') {
    biomeExtra = (terrainNoise(x * 0.0035, z * 0.0035) * 0.5 + 0.5) * (5.0 * microScale)
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
  const normZ = Math.abs(z) / BIOME_CYCLE_DISTANCE
  const idx = Math.floor(normZ) % BIOME_CYCLE_ORDER.length
  const nextIdx = (idx + 1) % BIOME_CYCLE_ORDER.length
  const frac = normZ - Math.floor(normZ)

  let naturalElevation = 0
  let mult = BIOMES[biomeId]?.hillHeightMultiplier || 1.0

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
  const roadY = closest.roadY
  const banking = closest.banking
  const lateralOffset = closest.lateralOffset
  const halfRoad = ROAD_WIDTH / 2 // 5.75m
  const shoulderEnd = halfRoad + 2.2 // 7.95m

  const EPS = 0.02

  if (dist <= halfRoad + EPS) {
    // Road asphalt surface with crown camber and banked superelevation
    const clampedDist = Math.min(halfRoad, dist)
    const crown = 0.085 + 0.025 * (1 - clampedDist / halfRoad)
    const bankElevation = Math.tan(banking) * lateralOffset
    return roadY + crown + bankElevation
  } else if (dist <= shoulderEnd + EPS) {
    // Roadside shoulder strip sloping gently down and tracking banking
    const shoulderT = Math.max(0, Math.min(1, (dist - halfRoad) / 2.2))
    const edgeBank = Math.tan(banking) * Math.sign(lateralOffset) * halfRoad
    const shoulderExtra = Math.tan(banking) * (lateralOffset - Math.sign(lateralOffset) * halfRoad) * 0.75
    return roadY + 0.085 * (1 - shoulderT) + 0.015 * shoulderT + edgeBank + shoulderExtra
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
