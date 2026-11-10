import {
  getMacroNoise,
  getMacroTerrainWeights,
  getInterpolatedMacroProfile,
  getDominantMacroType,
  getRoadCenter,
  getRoadElevation,
  getSurfaceHeight,
  getTerrainHeight,
  getClosestRoadPoint,
  ROAD_WIDTH,
  ROAD_PROTECTED_RADIUS,
  ROAD_CLEARANCE_BASE,
  BIOMES,
} from './src/utils/roadMath.ts'

console.log('================================================================')
console.log('  CALM ROADS — MACRO-BIOMES & BULLDOZER MASK VERIFICATION SUITE ')
console.log('================================================================\n')

let failures = 0

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    failures++
  } else {
    console.log(`✅ PASSED: ${message}`)
  }
}

// ------------------------------------------------------------------------
// Test 1: Macro-Noise Normalization & Dynamic Range
// ------------------------------------------------------------------------
console.log('--- Test 1: Macro-Noise Normalization & Dynamic Range ---')
let minMacro = Infinity
let maxMacro = -Infinity
const macroCounts = { plains: 0, rolling_hills: 0, twisted_climb: 0, coastal: 0, desert_canyon: 0, forest_valleys: 0 }

for (let z = 0; z >= -15000; z -= 10) {
  const m = getMacroNoise(z)
  if (m < minMacro) minMacro = m
  if (m > maxMacro) maxMacro = m

  const dom = getDominantMacroType(z)
  macroCounts[dom] = (macroCounts[dom] || 0) + 1
}

console.log(`Macro noise range over 15km: [${minMacro.toFixed(3)}, ${maxMacro.toFixed(3)}]`)
console.log(`Distribution of dominant macro types:`, macroCounts)

assert(minMacro >= 0.0 && maxMacro <= 1.0, 'Macro noise is strictly normalized between 0.0 and 1.0')
assert(minMacro < 0.25, 'Macro noise dips low enough to trigger Plains')
assert(maxMacro > 0.75, 'Macro noise rises high enough to trigger Twisted Climb')
assert(macroCounts.plains > 0, 'Plains macro terrain is visited')
assert(macroCounts.rolling_hills > 0, 'Rolling Hills macro terrain is visited')
assert(macroCounts.twisted_climb > 0, 'Twisted Climb macro terrain is visited')

// ------------------------------------------------------------------------
// Test 2: Normalized Weights Sum Invariant
// ------------------------------------------------------------------------
console.log('\n--- Test 2: Normalized Weights Sum Invariant ---')
let maxWeightSumError = 0
for (let z = 0; z >= -10000; z -= 25) {
  const w = getMacroTerrainWeights(z)
  const sum = (w.plains || 0) + (w.rolling_hills || 0) + (w.twisted_climb || 0) + (w.coastal || 0) + (w.desert_canyon || 0) + (w.forest_valleys || 0)
  const err = Math.abs(sum - 1.0)
  if (err > maxWeightSumError) maxWeightSumError = err
}
console.log(`Max weight sum error: ${maxWeightSumError.toExponential(3)}`)
assert(maxWeightSumError < 1e-6, 'Normalized weights sum to exactly 1.0 everywhere')

// ------------------------------------------------------------------------
// Test 3: Road Curvature & Elevation Modulation by Macro-Biome
// ------------------------------------------------------------------------
console.log('\n--- Test 3: Road Curvature & Elevation Profiles ---')
const plainsProfile = getInterpolatedMacroProfile(-500)
console.log('Sample profile at z=-500:', plainsProfile)
assert(plainsProfile.terrainAmplitude > 0, 'Macro profile returns valid terrain amplitude')
assert(plainsProfile.roadCurvature >= 0.1 && plainsProfile.roadCurvature <= 1.0, 'Road curvature is within calibrated range [0.1, 1.0]')

// ------------------------------------------------------------------------
// Test 4: Strict Bulldozer Road Mask (Road Clearance & Zero Submersion)
// ------------------------------------------------------------------------
console.log('\n--- Test 4: Strict Bulldozer Road Mask (Road Clearance & Zero Submersion) ---')
const biomeKeys = Object.keys(BIOMES)
let submersions = 0
let minClearanceAcrossAll = Infinity
let totalPointsSampled = 0

for (const bId of biomeKeys) {
  let biomeMinClearance = Infinity
  for (let z = 0; z >= -6000; z -= 60) {
    const roadCx = getRoadCenter(z)
    // Test across asphalt width and shoulder (offsets from -ROAD_PROTECTED_RADIUS to +ROAD_PROTECTED_RADIUS)
    for (let offset = -ROAD_PROTECTED_RADIUS; offset <= ROAD_PROTECTED_RADIUS; offset += 1.5) {
      const x = roadCx + offset
      const terrainY = getTerrainHeight(x, z, bId)
      const surfaceY = getSurfaceHeight(x, z, bId)
      const closest = getClosestRoadPoint(x, z)
      
      // On asphalt (dist <= ROAD_WIDTH / 2)
      if (closest.dist <= ROAD_WIDTH / 2) {
        totalPointsSampled++
        const clearance = surfaceY - terrainY
        if (clearance < biomeMinClearance) biomeMinClearance = clearance
        if (clearance < minClearanceAcrossAll) minClearanceAcrossAll = clearance
        if (clearance < 0.20) {
          submersions++
          console.error(`Submersion detected! Biome: ${bId}, z: ${z}, offset: ${offset}, surface: ${surfaceY}, terrain: ${terrainY}, clearance: ${clearance}`)
        }
      }
    }
  }
  console.log(`  Biome [${bId.padEnd(18)}]: min asphalt clearance = ${biomeMinClearance.toFixed(3)}m (Required: >= 0.25m)`)
}

console.log(`\nTotal asphalt points sampled: ${totalPointsSampled}`)
console.log(`Minimum clearance across entire 6km drive: ${minClearanceAcrossAll.toFixed(3)}m`)
console.log(`Total submersions: ${submersions}`)

assert(submersions === 0, 'Zero road submersions detected across all biomes and macro terrains')
assert(minClearanceAcrossAll >= 0.28, `Asphalt is strictly elevated >= 0.28m above corridor floor (actual: ${minClearanceAcrossAll.toFixed(3)}m)`)

// ------------------------------------------------------------------------
// Test 5: Hermite Blend Smoothness (No Cliff Discontinuities at 12m Corridor Edge)
// ------------------------------------------------------------------------
console.log('\n--- Test 5: Hermite Blend Smoothness at 12m Corridor Edge ---')
import { getRoadTangent } from './src/utils/roadMath.ts'

let maxSlopeStep = 0
for (let z = -200; z >= -3000; z -= 200) {
  const roadCx = getRoadCenter(z)
  const { nx, nz } = getRoadTangent(z)

  // Step perpendicular to road across the 12.0m corridor boundary in 0.1m increments
  for (let d = 11.5; d <= 13.5; d += 0.1) {
    const x1 = roadCx + nx * d
    const z1 = z + nz * d
    const x2 = roadCx + nx * (d + 0.1)
    const z2 = z + nz * (d + 0.1)

    const y1 = getTerrainHeight(x1, z1, 'forest')
    const y2 = getTerrainHeight(x2, z2, 'forest')
    const step = Math.abs(y2 - y1)
    if (step > maxSlopeStep) maxSlopeStep = step
  }
}
console.log(`Max delta per 10cm step across boundary along normal: ${maxSlopeStep.toFixed(4)}m`)
assert(maxSlopeStep < 0.05, 'Boundary transition has zero cliff discontinuity (< 0.05m per 10cm)')

console.log('\n================================================================')
if (failures === 0) {
  console.log('🎉 ALL VERIFICATION TESTS PASSED PERFECTLY!')
} else {
  console.error(`💥 ${failures} TEST(S) FAILED!`)
  process.exit(1)
}
console.log('================================================================')
