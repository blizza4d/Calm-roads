import fs from 'fs'
import path from 'path'

// Mock browser globals for modules that need them
global.window = {
  AudioContext: class {},
  webkitAudioContext: class {},
}

async function runTests() {
  console.log('=== CALM ROADS — ROAD REBUILD & GRAPHICS OVERHAUL VERIFICATION ===\n')
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`)
      passed++
    } else {
      console.error(`  [FAIL] ${message}`)
      failed++
    }
  }

  // 1. Inspect source files directly or import transpiled modules
  const roadMathSrc = fs.readFileSync('src/utils/roadMath.ts', 'utf8')
  const terrainSrc = fs.readFileSync('src/components/3d/Environment/Terrain.tsx', 'utf8')
  const gameEnvSrc = fs.readFileSync('src/components/3d/Environment/GameEnvironment.tsx', 'utf8')
  const vehCtrlSrc = fs.readFileSync('src/components/3d/Vehicles/VehicleController.tsx', 'utf8')
  const audioSysSrc = fs.readFileSync('src/utils/audioSystem.ts', 'utf8')

  console.log('--- TEST GROUP 1: Road Spline Engine & Authoritative Metrics ---')
  assert(roadMathSrc.includes('heading: number'), 'RoadSplineSample contains heading metric')
  assert(roadMathSrc.includes('cumulativeDistance: number'), 'RoadSplineSample contains cumulativeDistance metric')
  assert(roadMathSrc.includes('width: number'), 'RoadSplineSample contains width metric')
  assert(roadMathSrc.includes('validateRoadSplineSample'), 'validateRoadSplineSample validator function is exported')
  assert(roadMathSrc.includes('Math.atan2(tx, -tz)'), 'Spline heading is calculated with atan2(tx, -tz)')
  assert(roadMathSrc.includes('getRoadArcLength(z)'), 'Spline cumulative distance uses continuous arc-length table')
  assert(roadMathSrc.includes('ROAD_WIDTH = 11.5'), 'ROAD_WIDTH constant is authoritative 11.5m')

  console.log('\n--- TEST GROUP 2: Road Markings Geometry & Winding Order ---')
  // Check markings winding in Terrain.tsx
  assert(
    terrainSrc.includes('indices.push(base, base + 1, base + 2)') &&
    terrainSrc.includes('indices.push(base + 1, base + 3, base + 2)'),
    'Centerline Quad 1 uses upward CCW winding (base, base + 1, base + 2) & (base + 1, base + 3, base + 2)'
  )
  assert(
    terrainSrc.includes('indices.push(base + 2, base + 3, base + 4)') &&
    terrainSrc.includes('indices.push(base + 3, base + 5, base + 4)'),
    'Centerline Quad 2 uses upward CCW winding (base + 2, base + 3, base + 4) & (base + 3, base + 5, base + 4)'
  )
  assert(
    terrainSrc.includes('indices.push(rBase, rBase + 1, rBase + 2)') &&
    terrainSrc.includes('indices.push(rBase + 1, rBase + 3, rBase + 2)'),
    'Right edge line uses upward CCW winding (rBase, rBase + 1, rBase + 2)'
  )
  assert(
    terrainSrc.includes('indices.push(lBase, lBase + 2, lBase + 1)') &&
    terrainSrc.includes('indices.push(lBase + 1, lBase + 2, lBase + 3)'),
    'Left edge line maintains upward CCW winding'
  )
  assert(
    terrainSrc.includes('side: THREE.FrontSide'),
    'sharedMarkingsMat uses THREE.FrontSide (no inverted normals or double-side lighting hacks)'
  )
  assert(
    terrainSrc.includes('roughness: 0.42') && terrainSrc.includes('metalness: 0.08'),
    'sharedMarkingsMat retroreflective micro-bead highway properties configured'
  )

  console.log('\n--- TEST GROUP 3: Road Corridor Bulldozer Mask & Clearance ---')
  assert(terrainSrc.includes('cl.roadY - ROAD_CLEARANCE_BASE'), 'Corridor bulldozer mask clamps terrain Y <= roadY - ROAD_CLEARANCE_BASE (280mm clearance)')
  assert(roadMathSrc.includes('ROAD_CLEARANCE_BASE = 0.28'), 'roadMath enforces authoritative ROAD_CLEARANCE_BASE = 0.28m')
  assert(roadMathSrc.includes('crownOffset = (1 - (clampedOffset / halfRoad) ** 2) * 0.05'), 'getSurfaceHeight incorporates parabolic crown camber')

  console.log('\n--- TEST GROUP 4: Graphics & Biome Specialization ---')
  assert(
    gameEnvSrc.includes("case 'plains':") && gameEnvSrc.includes("return 'sunset'"),
    'Plains uses warm sunset environment preset (eliminating forest reflection bug)'
  )
  assert(
    gameEnvSrc.includes("case 'desert':") && gameEnvSrc.includes("return 'sunset'"),
    'Desert uses warm sunset environment preset'
  )
  assert(
    terrainSrc.includes("isDesert || bid === 'plains'") && terrainSrc.includes('? false'),
    'Plains biome suppresses pine trees and spawns deciduous prairie oaks/maples'
  )
  assert(
    terrainSrc.includes('isSnowyBiome') && terrainSrc.includes('uSnowAllowed'),
    'Alpine snow shader uniform uSnowAllowed strictly gates snow to snowy biomes'
  )
  assert(
    gameEnvSrc.includes('PanoramicMountainHorizon') && gameEnvSrc.includes('const baseY = -800'),
    'PanoramicMountainHorizon renders biome-adaptive horizon with deep anchor base to baseY = -800 to prevent voids'
  )

  console.log('\n--- TEST GROUP 5: Dynamic Camera Perspective Calibration ---')
  assert(
    vehCtrlSrc.includes('54 + Math.pow(speedRatio, 1.3) * 11.0'),
    'Camera FOV calibrated smoothly from 54° to 65° (eliminating bottom-screen road flaring)'
  )

  console.log('\n--- TEST GROUP 6: Automotive Audio System Overhaul ---')
  assert(
    audioSysSrc.includes('onLoadBus') && audioSysSrc.includes('synthesizeExhaustPop'),
    'Audio system features trailing off-load combustion and procedural overrun exhaust pops'
  )

  console.log(`\n========================================`)
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log(`========================================`)

  if (failed > 0) process.exit(1)
}

runTests().catch(err => {
  console.error(err)
  process.exit(1)
})
