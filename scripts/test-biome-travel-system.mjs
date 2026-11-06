import * as THREE from 'three'
import {
  getRoadCenter,
  getRoadElevation,
  getRoadSplineSample,
  getRoadTangent,
  getRoadBanking,
  getTerrainHeight,
  getSurfaceHeight,
  getMacroTerrainWeights,
  getInterpolatedMacroProfile,
  getInterpolatedBiomeCharacter,
  getActiveBiomeAt,
  setWorldGenerationConfig,
  getWorldSeed,
  getWorldStartBiome,
  BIOMES,
  BIOME_ROAD_CHARACTERS,
  BIOME_CYCLE_ORDER,
  ROAD_WIDTH,
  ROAD_PROTECTED_RADIUS,
} from '../src/utils/roadMath.ts'
import { DESTINATIONS, getDestinationById } from '../src/utils/destinations.ts'

let passed = 0
let failed = 0

function assert(condition, testName, details = '') {
  if (condition) {
    passed++
    console.log(`[PASS] ${testName}`)
  } else {
    failed++
    console.error(`[FAIL] ${testName}${details ? ': ' + details : ''}`)
  }
}

console.log('=== CALM ROADS: INTERACTIVE BIOME TRAVEL & WORLD SEED SYSTEM VERIFICATION ===\n')

// ------------------------------------------------------------------------
// SECTION 1: DESTINATION REGISTRY COMPLETENESS & VISUAL IDENTITY
// ------------------------------------------------------------------------
console.log('--- Section 1: Destination Registry Completeness & Visual Identity ---')

const expectedDestinationIds = [
  'dynamic',
  'plains',
  'rolling_hills',
  'twisted_mountains',
  'desert',
  'coastal',
  'forest',
  'autumn',
  'alpine',
  'tundra',
  'enchanted_forest',
]

assert(
  DESTINATIONS.length >= 11,
  'All 11 destination profiles are registered in DESTINATIONS',
  `Found ${DESTINATIONS.length} destinations`
)

let allFieldsValid = true
for (const id of expectedDestinationIds) {
  const dest = getDestinationById(id)
  if (
    !dest ||
    !dest.name ||
    !dest.subtitle ||
    !dest.tagline ||
    !dest.description ||
    !dest.terrainType ||
    !dest.roadPersonality ||
    !dest.atmosphere ||
    !dest.accentColor ||
    !dest.gradient ||
    !dest.skyColor
  ) {
    allFieldsValid = false
    console.error(`Missing required fields on destination: ${id}`)
  }
}
assert(allFieldsValid, 'Every destination has complete visual identity metadata (name, tags, description, colors)')

const fallbackDest = getDestinationById('unknown_id')
assert(
  fallbackDest && fallbackDest.id === 'dynamic',
  'getDestinationById gracefully falls back to dynamic destination for unknown IDs'
)

// ------------------------------------------------------------------------
// SECTION 2: DETERMINISTIC WORLD SEED SYSTEM & REPRODUCIBILITY
// ------------------------------------------------------------------------
console.log('\n--- Section 2: Deterministic World Seed System & Reproducibility ---')

// 2.1 Configuration state updates
setWorldGenerationConfig(4242, 'plains')
assert(
  getWorldSeed() === 4242 && getWorldStartBiome() === 'plains',
  'setWorldGenerationConfig accurately updates active seed and starting biome'
)

// 2.2 Seed Reproducibility: Same seed generates identical road geometry
setWorldGenerationConfig(8888, 'twisted_mountains')
const samplesA = []
for (let z = 0; z >= -1200; z -= 50) {
  samplesA.push({
    z,
    x: getRoadCenter(z),
    y: getRoadElevation(z),
    terrainY: getTerrainHeight(25, z, 'twisted_mountains'),
  })
}

// Interleave another seed configuration
setWorldGenerationConfig(9999, 'desert')
const samplesOther = []
for (let z = 0; z >= -1200; z -= 50) {
  samplesOther.push({
    z,
    x: getRoadCenter(z),
    y: getRoadElevation(z),
  })
}

// Return to seed 8888 and verify exact reproducibility
setWorldGenerationConfig(8888, 'twisted_mountains')
let maxDiff = 0
for (let i = 0; i < samplesA.length; i++) {
  const z = samplesA[i].z
  const x = getRoadCenter(z)
  const y = getRoadElevation(z)
  const terrainY = getTerrainHeight(25, z, 'twisted_mountains')

  const diffX = Math.abs(x - samplesA[i].x)
  const diffY = Math.abs(y - samplesA[i].y)
  const diffTerrain = Math.abs(terrainY - samplesA[i].terrainY)
  if (diffX > maxDiff) maxDiff = diffX
  if (diffY > maxDiff) maxDiff = diffY
  if (diffTerrain > maxDiff) maxDiff = diffTerrain
}

assert(
  maxDiff === 0,
  'Deterministic world seed reproduces exact road centerline, elevation and terrain (max error: 0.00)',
  `Max diff: ${maxDiff}`
)

// 2.3 Seed Variation: Different seeds generate genuinely unique road layouts
let maxCenterDiff = 0
let maxElevDiff = 0
for (let i = 0; i < samplesA.length; i++) {
  const diffX = Math.abs(samplesA[i].x - samplesOther[i].x)
  const diffY = Math.abs(samplesA[i].y - samplesOther[i].y)
  if (diffX > maxCenterDiff) maxCenterDiff = diffX
  if (diffY > maxElevDiff) maxElevDiff = diffY
}

assert(
  maxCenterDiff > 15.0,
  `Different world seeds generate genuinely distinct road curves (max lateral delta: ${maxCenterDiff.toFixed(1)}m > 15m)`
)
assert(
  maxElevDiff > 8.0,
  `Different world seeds generate genuinely distinct elevation profiles (max vertical delta: ${maxElevDiff.toFixed(1)}m > 8m)`
)

// 2.4 Baseline Invariance for Default Seed
setWorldGenerationConfig(1337, 'dynamic')
assert(
  getWorldSeed() === 1337 && getWorldStartBiome() === 'dynamic',
  'Default configuration (seed=1337, biome=dynamic) restored cleanly'
)

// ------------------------------------------------------------------------
// SECTION 3: DISTINCT ROAD PERSONALITIES & DEDICATED BIOME WORLDS
// ------------------------------------------------------------------------
console.log('\n--- Section 3: Distinct Road Personalities & Dedicated Biome Worlds ---')

// 3.1 Plains Destination
setWorldGenerationConfig(1337, 'plains')
const plainsWeights = getMacroTerrainWeights(0)
const plainsChar = getInterpolatedBiomeCharacter(0)
const plainsBiome = getActiveBiomeAt(0, 'plains')

assert(
  plainsWeights.plains === 1.0 && plainsWeights.twisted_climb === 0.0,
  'Selecting Plains activates 100% Plains macro-terrain profile at starting line'
)
assert(
  plainsChar.switchbackWeight <= 0.25 && plainsChar.valleySweepWeight >= 1.5,
  'Plains road personality strictly suppresses hairpins in favor of wide open valley sweeps'
)
assert(
  plainsBiome.id === 'plains' && plainsBiome.hillHeightMultiplier <= 0.35,
  'Plains generates gentle flat/prairie terrain with low hill height multiplier (0.25)'
)

// 3.2 Rolling Hills Destination
setWorldGenerationConfig(1337, 'rolling_hills')
const hillsWeights = getMacroTerrainWeights(0)
const hillsChar = getInterpolatedBiomeCharacter(0)
const hillsBiome = getActiveBiomeAt(0, 'rolling_hills')

assert(
  hillsWeights.rolling_hills === 1.0,
  'Selecting Rolling Hills activates 100% Rolling Hills macro-terrain profile'
)
assert(
  hillsChar.sCurveWeight >= 1.4 && hillsChar.switchbackWeight <= 0.5,
  'Rolling Hills road personality features high-frequency flowing country S-curves'
)
assert(
  hillsBiome.id === 'rolling_hills' && hillsBiome.hillHeightMultiplier === 0.75,
  'Rolling Hills generates medium-amplitude rounded green hills'
)

// 3.3 Twisted Mountains Destination
setWorldGenerationConfig(1337, 'twisted_mountains')
const twistedWeights = getMacroTerrainWeights(0)
const twistedChar = getInterpolatedBiomeCharacter(0)

assert(
  twistedWeights.twisted_climb === 1.0,
  'Selecting Twisted Mountains activates 100% Twisted Climb alpine pass profile'
)
assert(
  twistedChar.switchbackWeight >= 1.4 && twistedChar.hairpinAmplitude >= 35.0,
  'Twisted Mountains road personality features aggressive hairpin switchbacks and technical turns'
)
assert(
  twistedChar.elevationClimbRate >= 1.4,
  'Twisted Mountains has dramatic vertical mountain pass climb and descent rate (1.45)'
)

// 3.4 Desert Canyon Destination
setWorldGenerationConfig(1337, 'desert')
const desertWeights = getMacroTerrainWeights(0)
const desertBiome = getActiveBiomeAt(0, 'desert')

assert(
  desertWeights.desert_canyon === 1.0,
  'Selecting Desert Canyon activates 100% Desert Canyon macro profile'
)
assert(
  desertBiome.id === 'desert' && desertBiome.tagline.includes('Sandstone Mesas'),
  'Desert Canyon environment correctly loads sandstone mesa and canyon attributes'
)

// 3.5 Coastal Highway Destination
setWorldGenerationConfig(1337, 'coastal')
const coastalWeights = getMacroTerrainWeights(0)
const coastalBiome = getActiveBiomeAt(0, 'coastal')

assert(
  coastalWeights.coastal === 1.0,
  'Selecting Coastal activates 100% Coastal Highway macro profile'
)
assert(
  coastalBiome.id === 'coastal' && coastalBiome.shoulderColor === '#d6b885',
  'Coastal Highway features warm golden sand shoulder and seaside dune profile'
)

// ------------------------------------------------------------------------
// SECTION 4: ROAD INTEGRITY, CONTINUOUS DRIVABILITY & BULLDOZER CLEARANCE
// ------------------------------------------------------------------------
console.log('\n--- Section 4: Road Integrity, Orthonormality & Bulldozer Protection ---')

const testSeeds = [1337, 4242, 77777, 987654]
const testBiomes = ['plains', 'rolling_hills', 'twisted_mountains', 'desert', 'coastal']

let minBulldozerClearanceObserved = Infinity
let orthonormalErrors = 0
let roadWidthViolations = 0

for (let sIdx = 0; sIdx < testSeeds.length; sIdx++) {
  const seed = testSeeds[sIdx]
  const b = testBiomes[sIdx % testBiomes.length]
  setWorldGenerationConfig(seed, b)

  for (let z = 0; z >= -600; z -= 30) {
    const sample = getRoadSplineSample(z)

    // Check constant road width: Left edge to Right edge
    const leftX = sample.x - sample.rx * (ROAD_WIDTH / 2)
    const leftY = sample.y - sample.ry * (ROAD_WIDTH / 2)
    const leftZ = z - sample.rz * (ROAD_WIDTH / 2)
    const rightX = sample.x + sample.rx * (ROAD_WIDTH / 2)
    const rightY = sample.y + sample.ry * (ROAD_WIDTH / 2)
    const rightZ = z + sample.rz * (ROAD_WIDTH / 2)
    const actualWidth = Math.hypot(rightX - leftX, rightY - leftY, rightZ - leftZ)
    if (Math.abs(actualWidth - ROAD_WIDTH) > 1e-3) {
      roadWidthViolations++
    }

    // Check unit lengths
    if (Math.abs(Math.hypot(sample.tx, sample.ty, sample.tz) - 1.0) > 1e-4) orthonormalErrors++
    if (Math.abs(Math.hypot(sample.rx, sample.ry, sample.rz) - 1.0) > 1e-4) orthonormalErrors++
    if (Math.abs(Math.hypot(sample.nx, sample.ny, sample.nz) - 1.0) > 1e-4) orthonormalErrors++

    // Check orthogonality (dot products = 0)
    const dotTR = sample.tx * sample.rx + sample.ty * sample.ry + sample.tz * sample.rz
    const dotTN = sample.tx * sample.nx + sample.ty * sample.ny + sample.tz * sample.nz
    const dotRN = sample.rx * sample.nx + sample.ry * sample.ny + sample.rz * sample.nz
    if (Math.abs(dotTR) > 1e-4 || Math.abs(dotTN) > 1e-4 || Math.abs(dotRN) > 1e-4) {
      orthonormalErrors++
    }

    // Check Bulldozer roadbed clearance across road corridor
    for (let offset = -ROAD_WIDTH / 2; offset <= ROAD_WIDTH / 2; offset += 1.5) {
      const checkX = sample.x + offset
      const surfY = getSurfaceHeight(checkX, z, b)
      const terrH = getTerrainHeight(checkX, z, b)
      const clearance = surfY - terrH
      if (clearance < minBulldozerClearanceObserved) {
        minBulldozerClearanceObserved = clearance
      }
    }
  }
}

assert(
  roadWidthViolations === 0,
  `Road asphalt maintains exact constant 11.5m width across all seeds and destinations`
)
assert(
  orthonormalErrors === 0,
  `Road spline frame (T, R, N) is strictly orthonormal across all seeds and destinations`
)
assert(
  minBulldozerClearanceObserved >= 0.28,
  `Bulldozer clearance strictly satisfies >= 280mm sub-asphalt clearance across all seeds and biomes (observed: ${(minBulldozerClearanceObserved * 1000).toFixed(1)}mm >= 280mm)`
)

// ------------------------------------------------------------------------
// SECTION 5: VEHICLE DESTINATION SPAWN & ROAD HEADING ALIGNMENT
// ------------------------------------------------------------------------
console.log('\n--- Section 5: Vehicle Destination Spawn & Road Heading Alignment ---')

let allSpawnsValid = true
for (const b of expectedDestinationIds) {
  if (b === 'dynamic') continue
  setWorldGenerationConfig(2026, b)

  const spawnZ = 0
  const spawnX = getRoadCenter(spawnZ)
  const spawnY = getRoadElevation(spawnZ) + 0.32 // ride height
  const tan = getRoadTangent(spawnZ)
  const yaw = Math.atan2(-tan.tx, -tan.tz)

  // Verify elevation is above sea level (Y >= 22m)
  if (spawnY < 22.0) {
    allSpawnsValid = false
    console.error(`Invalid spawn Y elevation for ${b}: ${spawnY} < 22.0m`)
  }

  // Verify tangent is pointing forward (-Z)
  if (tan.tz >= 0) {
    allSpawnsValid = false
    console.error(`Tangent tz is not pointing forward for ${b}: ${tan.tz}`)
  }

  // Verify finite numbers
  if (!Number.isFinite(spawnX) || !Number.isFinite(spawnY) || !Number.isFinite(yaw)) {
    allSpawnsValid = false
    console.error(`Non-finite spawn parameters for ${b}: x=${spawnX}, y=${spawnY}, yaw=${yaw}`)
  }
}

assert(
  allSpawnsValid,
  'Vehicle spawn position (X, Y, Z=0) and tangent yaw alignment are verified across all destination biomes'
)

// Restore standard default session
setWorldGenerationConfig(1337, 'dynamic')

// ------------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------------
console.log('\n=======================================================')
console.log(`FINAL RESULT: ${passed} PASSED, ${failed} FAILED`)
console.log('=======================================================')

if (failed > 0) {
  process.exit(1)
}
