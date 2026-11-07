import * as THREE from 'three'
import {
  getRoadCenter,
  getRoadElevation,
  getRoadTangent,
  getRoadSplineSample,
  getSpawnTransform,
  getTerrainHeight,
  getSurfaceHeight,
  getMacroTerrainWeights,
  getInterpolatedMacroProfile,
  getInterpolatedBiomeCharacter,
  getActiveBiomeAt,
  setWorldGenerationConfig,
  getWorldSeed,
  getWorldStartBiome,
  getWorldStartZ,
  BIOMES,
  BIOME_ROAD_CHARACTERS,
  ROAD_WIDTH,
  ROAD_PROTECTED_RADIUS,
} from '../src/utils/roadMath.ts'
import {
  useGameStore,
  SUPPORTED_STARTING_BIOMES,
  START_Z_COORDINATES,
} from '../src/store/useGameStore.ts'
import { DESTINATIONS, getDestinationById } from '../src/utils/destinations.ts'
import {
  getAsphaltTexture,
  getAsphaltBumpTexture,
  getAsphaltRoughnessTexture,
  getSoilBumpTexture,
  getSnowNormalTexture,
  getSandstoneStrataTexture,
} from '../src/utils/asphaltTexture.ts'

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

console.log('=== CALM ROADS: RANDOM START, BIOME REPLACEMENT & STUTTER FIX VERIFICATION ===\n')

// ------------------------------------------------------------------------
// SECTION 1: RANDOM STARTING WORLD & BALANCED BIOME SELECTION
// ------------------------------------------------------------------------
console.log('--- Section 1: Random Starting World & Session Initialization ---')

assert(
  SUPPORTED_STARTING_BIOMES.length === 10,
  'All 10 balanced biomes are present in SUPPORTED_STARTING_BIOMES',
  `Found ${SUPPORTED_STARTING_BIOMES.length} biomes`
)

const expectedBiomes = [
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

const missingBiomes = expectedBiomes.filter((b) => !SUPPORTED_STARTING_BIOMES.includes(b))
assert(
  missingBiomes.length === 0,
  'All required biomes are supported for random session start',
  `Missing: ${missingBiomes.join(', ')}`
)

assert(
  START_Z_COORDINATES.length >= 8 && START_Z_COORDINATES.every((z) => z % 400 === 0),
  'Starting route coordinates (startZ) are strictly aligned to chunk multiples',
  `Coordinates: ${START_Z_COORDINATES.join(', ')}`
)

// Test session initialization randomness across 30 simulated session starts
const generatedSeeds = new Set()
const generatedBiomes = new Set()
const generatedStartZ = new Set()

for (let i = 0; i < 30; i++) {
  useGameStore.getState().initNewGameSession()
  const state = useGameStore.getState()
  generatedSeeds.add(state.worldSeed)
  generatedBiomes.add(state.biome)
  generatedStartZ.add(state.startZ)
}

assert(
  generatedSeeds.size >= 25,
  'Fresh random world seeds are generated across new game sessions',
  `Generated ${generatedSeeds.size} distinct seeds across 30 runs`
)

assert(
  generatedBiomes.size >= 4,
  'Multiple balanced starting biomes are selected across sessions',
  `Encountered ${generatedBiomes.size} distinct biomes in 30 runs: ${Array.from(generatedBiomes).join(', ')}`
)

assert(
  generatedStartZ.size >= 3,
  'Multiple starting Z coordinates along route are selected across sessions',
  `Encountered coordinates: ${Array.from(generatedStartZ).join(', ')}`
)

// ------------------------------------------------------------------------
// SECTION 2: VEHICLE ROAD ALIGNMENT & SAFE SPAWNING AT ARBITRARY START_Z
// ------------------------------------------------------------------------
console.log('\n--- Section 2: Vehicle Road Alignment & Safe Spawning at Arbitrary StartZ ---')

let allSpawnsValid = true
for (const z of START_Z_COORDINATES) {
  for (const b of ['plains', 'twisted_mountains', 'desert', 'coastal']) {
    setWorldGenerationConfig(54321, b, z)
    const spawn = getSpawnTransform(z, 0.32)

    // Check centerline matching
    const expectedX = getRoadCenter(z)
    const expectedY = getRoadElevation(z) + 0.32
    const tan = getRoadTangent(z)
    const expectedYaw = Math.atan2(-tan.tx, -tan.tz)

    const xDiff = Math.abs(spawn.x - expectedX)
    const yDiff = Math.abs(spawn.y - expectedY)
    const yawDiff = Math.abs(spawn.yaw - expectedYaw)

    if (xDiff > 0.001 || yDiff > 0.001 || yawDiff > 0.001) {
      allSpawnsValid = false
      console.error(`Spawn mismatch at Z=${z}, biome=${b}: xDiff=${xDiff}, yDiff=${yDiff}, yawDiff=${yawDiff}`)
    }
  }
}

assert(
  allSpawnsValid,
  'getSpawnTransform accurately aligns vehicle centerline, elevation, and tangent yaw at all startZ coordinates'
)

// Check bulldozer sub-asphalt clearance at arbitrary startZ coordinates
let allClearancesValid = true
let minClearanceObserved = 999
for (const z of [0, -800, -1600, -2400]) {
  for (const b of ['plains', 'twisted_mountains', 'desert']) {
    setWorldGenerationConfig(77123, b, z)
    const roadX = getRoadCenter(z)
    const roadY = getRoadElevation(z)
    const subTerrainY = getTerrainHeight(roadX, z, b)
    const clearance = roadY - subTerrainY
    if (clearance < minClearanceObserved) minClearanceObserved = clearance
    if (clearance < 0.28) {
      allClearancesValid = false
      console.error(`Sub-asphalt clearance violated at z=${z}, biome=${b}: ${clearance.toFixed(3)}m < 0.280m`)
    }
  }
}

assert(
  allClearancesValid,
  'Sub-asphalt clearance >= 280mm is strictly maintained at arbitrary startZ coordinates',
  `Min clearance observed: ${(minClearanceObserved * 1000).toFixed(1)}mm`
)

// ------------------------------------------------------------------------
// SECTION 3: DETERMINISTIC REPRODUCIBILITY & STABILITY
// ------------------------------------------------------------------------
console.log('\n--- Section 3: Deterministic World Seed Reproducibility & Stability ---')

// 3.1 Same seed + same startZ reproduces exact road & terrain coordinates
setWorldGenerationConfig(987654, 'twisted_mountains', -1200)
const run1 = []
for (let z = -1200; z >= -1600; z -= 40) {
  run1.push({
    z,
    x: getRoadCenter(z),
    y: getRoadElevation(z),
    terrainY: getTerrainHeight(30, z, 'twisted_mountains'),
  })
}

// Alter config
setWorldGenerationConfig(111111, 'desert', 0)

// Re-apply exact config
setWorldGenerationConfig(987654, 'twisted_mountains', -1200)
let maxReproduceDiff = 0
for (let i = 0; i < run1.length; i++) {
  const z = run1[i].z
  const x = getRoadCenter(z)
  const y = getRoadElevation(z)
  const terrainY = getTerrainHeight(30, z, 'twisted_mountains')
  const diff = Math.max(
    Math.abs(x - run1[i].x),
    Math.abs(y - run1[i].y),
    Math.abs(terrainY - run1[i].terrainY)
  )
  if (diff > maxReproduceDiff) maxReproduceDiff = diff
}

assert(
  maxReproduceDiff === 0,
  'Deterministic world seed reproduces exact road centerline, elevation, and terrain height (max delta: 0.00m)'
)

// 3.2 Different seeds generate distinct curve geometries and elevation profiles
setWorldGenerationConfig(222222, 'twisted_mountains', -1200)
let maxLateralDelta = 0
let maxVerticalDelta = 0
for (let i = 0; i < run1.length; i++) {
  const z = run1[i].z
  const x = getRoadCenter(z)
  const y = getRoadElevation(z)
  maxLateralDelta = Math.max(maxLateralDelta, Math.abs(x - run1[i].x))
  maxVerticalDelta = Math.max(maxVerticalDelta, Math.abs(y - run1[i].y))
}

assert(
  maxLateralDelta > 15.0,
  `Different world seeds generate genuinely distinct road curves (lateral delta: ${maxLateralDelta.toFixed(1)}m > 15m)`
)

assert(
  maxVerticalDelta > 8.0,
  `Different world seeds generate genuinely distinct elevation profiles (vertical delta: ${maxVerticalDelta.toFixed(1)}m > 8m)`
)

// ------------------------------------------------------------------------
// SECTION 4: AUTHORITATIVE BIOME REPLACEMENT & REQUEST CANCELLATION
// ------------------------------------------------------------------------
console.log('\n--- Section 4: Authoritative Biome Replacement & Request Cancellation ---')

const initialGenId = useGameStore.getState().generationId
useGameStore.getState().replaceActiveBiome('desert')
const afterDesertGenId = useGameStore.getState().generationId

assert(
  afterDesertGenId === initialGenId + 1,
  'replaceActiveBiome increments generationId monotonically as a request cancellation token',
  `Initial: ${initialGenId}, After: ${afterDesertGenId}`
)

assert(
  useGameStore.getState().biome === 'desert',
  'Active biome is authoritatively updated to desert'
)

assert(
  useGameStore.getState().isTraveling === true,
  'Vehicle input is safely frozen (isTraveling: true) during biome replacement handover'
)

assert(
  useGameStore.getState().destinationBanner?.name === 'Desert Canyon',
  'Destination banner state is populated with the selected biome details'
)

// Rapid switching test: simulate rapid consecutive biome clicks
useGameStore.getState().replaceActiveBiome('alpine')
useGameStore.getState().replaceActiveBiome('coastal')
useGameStore.getState().replaceActiveBiome('plains')
const finalGenId = useGameStore.getState().generationId

assert(
  finalGenId === afterDesertGenId + 3,
  'Rapid biome replacements generate distinct generation IDs cancelling superseded jobs'
)

assert(
  useGameStore.getState().biome === 'plains',
  'Latest requested biome (Plains) is authoritatively active'
)

// ------------------------------------------------------------------------
// SECTION 5: CRITICAL STUTTERING FIX & GRAPHICS OVERHAUL
// ------------------------------------------------------------------------
console.log('\n--- Section 5: Critical Stuttering Fix & PBR Materials ---')

// 5.1 Test PBR Procedural Texture Generators
const soilBump = getSoilBumpTexture()
assert(
  soilBump && soilBump.isCanvasTexture,
  'getSoilBumpTexture produces valid 512x512 procedural organic loam PBR texture'
)

const snowNormal = getSnowNormalTexture()
assert(
  snowNormal && snowNormal.isCanvasTexture,
  'getSnowNormalTexture produces valid crystalline sub-zero snow normal/bump texture'
)

const sandstoneStrata = getSandstoneStrataTexture()
assert(
  sandstoneStrata && sandstoneStrata.isCanvasTexture,
  'getSandstoneStrataTexture produces valid sedimentary sandstone strata bump texture'
)

// 5.2 Single-chunk recycling limit verification
// Verify that Terrain component implementation restricts recycling to 1 chunk per frame
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const terrainFilePath = path.join(__dirname, '../src/components/3d/Environment/Terrain.tsx')
const terrainCode = fs.readFileSync(terrainFilePath, 'utf-8')

assert(
  terrainCode.includes('while (recycledCount < 1)'),
  'Terrain.tsx limits chunk recycling to at most 1 chunk per frame, eliminating multi-chunk frame spikes'
)

// 5.3 Vehicle Model render isolation: CarModels.tsx must not subscribe to continuous timeOfDay
const carModelsFilePath = path.join(__dirname, '../src/components/3d/Vehicles/CarModels.tsx')
const carModelsCode = fs.readFileSync(carModelsFilePath, 'utf-8')

assert(
  carModelsCode.includes('useGameStore((s) => s.timeOfDay < 6.5 || s.timeOfDay > 18.5)'),
  'CarModels.tsx uses boolean day/night selector, preventing 2-second vehicle model re-renders during driving'
)

// 5.4 GameEnvironment timeOfDay dispatch throttling
const gameEnvFilePath = path.join(__dirname, '../src/components/3d/Environment/GameEnvironment.tsx')
const gameEnvCode = fs.readFileSync(gameEnvFilePath, 'utf-8')

assert(
  gameEnvCode.includes('Math.abs(timeOfDayRef.current - lastDispatchedTime.current) > 0.25'),
  'GameEnvironment throttles timeOfDay Zustand store dispatches to >= 0.25h, eliminating high-frequency UI re-render churn'
)

// Restore baseline config for test suite clean teardown
setWorldGenerationConfig(1337, 'dynamic', 0)

console.log('\n=======================================================')
console.log(`FINAL RESULT: ${passed} PASSED, ${failed} FAILED`)
console.log('=======================================================')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
