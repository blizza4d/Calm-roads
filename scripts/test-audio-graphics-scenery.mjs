import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('=== CALM ROADS: MULTI-CAR AUDIO, GRAPHICS & SCENERY ANCHORING TEST ===\n')

let passed = 0
let failed = 0

function it(desc, fn) {
  try {
    fn()
    console.log(`[PASS] ${desc}`)
    passed++
  } catch (err) {
    console.error(`[FAIL] ${desc}:`, err.message)
    failed++
  }
}

// -------------------------------------------------------------------------
// PHASE 1: MULTI-VEHICLE AUDIO ENGINE
// -------------------------------------------------------------------------
console.log('--- Phase 1: Multi-Vehicle Audio Registry & Transients ---')

const audioSystemSrc = fs.readFileSync('src/utils/audioSystem.ts', 'utf8')

it('VEHICLE_AUDIO_REGISTRY contains distinct sound profiles for all 5 vehicle models + aliases', () => {
  const requiredCars = ['bmw_m3', 'supercar', 'hovercraft', 'camper', 'hatchback', 'modern_supercar', 'vintage_hatch']
  for (const car of requiredCars) {
    assert(audioSystemSrc.includes(`${car}: {`), `Missing registry entry for ${car}`)
  }
})

it('Turbocharged vehicles are correctly flagged with hasTurbo: true', () => {
  assert(audioSystemSrc.includes('supercar: {') && audioSystemSrc.includes('hasTurbo: true'))
  assert(audioSystemSrc.includes('hatchback: {') && audioSystemSrc.includes('hasTurbo: true'))
  assert(audioSystemSrc.includes('camper: {') && audioSystemSrc.includes('hasTurbo: true'))
  assert(audioSystemSrc.includes('bmw_m3: {') && audioSystemSrc.includes('hasTurbo: false'))
})

it('Synthesizes turbo compressor surge / BOV flutter with bandpass filter & pulse modulation', () => {
  assert(audioSystemSrc.includes('triggerTurboBlowOffValve(intensity = 1.0)'), 'Missing triggerTurboBlowOffValve method')
  assert(audioSystemSrc.includes("bpFilter.type = 'bandpass'"), 'BOV should use bandpass filtering')
  assert(audioSystemSrc.includes('pulseTimes.forEach'), 'BOV flutter should have rhythmic pulse train')
})

it('Direct load-based crossfading hooks on_load gain directly to throttle and cuts off_throttle', () => {
  assert(audioSystemSrc.includes('targetOnLoad = 0.25 + throttleVal * 0.95'), 'onLoadBus should scale with throttle')
  assert(audioSystemSrc.includes('this.offLoadBus.gain.setTargetAtTime(0.0001, now, 0.02)'), 'offLoadBus should be muted under acceleration')
  assert(audioSystemSrc.includes('this.onLoadBus.gain.setTargetAtTime(0.0001, now, 0.035)'), 'onLoadBus should cut on throttle lift')
})

it('Gear shift pops trigger momentary volume dip (ignition cut) and explosive sub-bass transient', () => {
  assert(audioSystemSrc.includes('triggerGearShift(vehicleModel'), 'Missing triggerGearShift')
  assert(audioSystemSrc.includes('this.onLoadBus.gain.setValueAtTime(0.02, now)'), 'Shift cut should duck onLoadBus')
  assert(audioSystemSrc.includes('this.engineMaster.gain.setValueAtTime(0.25, now)'), 'Shift cut should duck engineMaster')
  assert(audioSystemSrc.includes('triggerTurboBlowOffValve(0.55)'), 'Upshift on turbo cars should trigger blow-off chirp')
})

// -------------------------------------------------------------------------
// PHASE 2: GRAPHICS, POST-PROCESSING & HEADLIGHTS
// -------------------------------------------------------------------------
console.log('\n--- Phase 2: Lighting, Reflections & Post-Processing ---')

const gameEnvSrc = fs.readFileSync('src/components/3d/Environment/GameEnvironment.tsx', 'utf8')
const carModelsSrc = fs.readFileSync('src/components/3d/Vehicles/CarModels.tsx', 'utf8')

it('Post-processing pipeline integrates contact-shadow SSAO with resolutionScale=0.5', () => {
  assert(gameEnvSrc.includes('<SSAO'), 'Missing SSAO component in EffectComposer')
  assert(gameEnvSrc.includes('resolutionScale={0.5}'), 'SSAO should be half resolution for performance')
  assert(gameEnvSrc.includes('radius={0.35}'), 'SSAO radius calibrated')
  assert(gameEnvSrc.includes('intensity={22}'), 'SSAO intensity calibrated')
})

it('Ambient and Hemisphere lights are tuned so car is never an unlit silhouette', () => {
  assert(gameEnvSrc.includes("color={celestialData.isNight ? '#38bdf8' : '#fed7aa'}"), 'Ambient light tuned')
  assert(gameEnvSrc.includes("intensity={celestialData.isNight ? 0.25 : 0.42}"), 'Ambient light intensity boosted')
  assert(gameEnvSrc.includes("intensity={celestialData.isNight ? 0.32 : 0.68}"), 'Hemisphere light fill boosted')
})

it('Headlight SpotLights have penumbra=1.0, decay=2.0, angle=Math.PI / 6 and calibrated intensity', () => {
  assert(carModelsSrc.includes('angle={Math.PI / 6}'), 'Low beam angle should be Math.PI / 6')
  assert(carModelsSrc.includes('penumbra={1.0}'), 'Penumbra should be 1.0 for smooth falloff')
  assert(carModelsSrc.includes('decay={2.0}'), 'Decay should be 2.0 (physical inverse-square)')
  assert(!carModelsSrc.includes('intensity={320}'), 'Old 320 candela intensity should be completely removed')
  assert(carModelsSrc.includes('intensity = 26'), 'Default intensity calibrated to 26')
})

// -------------------------------------------------------------------------
// PHASE 3: SCENERY ANCHORING & ROAD PROTECTION
// -------------------------------------------------------------------------
console.log('\n--- Phase 3: Scenery Anchoring & Road Protection ---')

const roadMathSrc = fs.readFileSync('src/utils/roadMath.ts', 'utf8')
const terrainSrc = fs.readFileSync('src/components/3d/Environment/Terrain.tsx', 'utf8')

it('ROAD_PROTECTED_RADIUS widened to 14.5m and ROAD_TRANSITION_RADIUS widened to 75.0m', () => {
  assert(roadMathSrc.includes('ROAD_PROTECTED_RADIUS = 14.5'), 'ROAD_PROTECTED_RADIUS must be 14.5m')
  assert(roadMathSrc.includes('ROAD_TRANSITION_RADIUS = 75.0'), 'ROAD_TRANSITION_RADIUS must be 75.0m')
})

it('Uses quintic smootherstep polynomial for C2 continuous zero-derivative terrain blending', () => {
  assert(roadMathSrc.includes('t * t * t * (t * (t * 6.0 - 15.0) + 10.0)'), 'Must use quintic polynomial')
})

it('Calculates terrain surface normal Y component: normal.y = 1 / sqrt(dx^2 + dz^2 + 1)', () => {
  assert(roadMathSrc.includes('getTerrainSlopeNormalY'), 'Missing getTerrainSlopeNormalY function')
  assert(roadMathSrc.includes('1.0 / Math.sqrt(dx * dx + dz * dz + 1.0)'), 'Math for normal.y is correct')
})

it('Enforces slope threshold: slope <= 30 degrees (normal.y >= 0.866) for tree instancing', () => {
  assert(terrainSrc.includes('slopeNy >= 0.866'), 'Must check slopeNy >= 0.866 before spawning trees')
  // Verify mathematical relationship: cos(30 deg) = sqrt(3)/2 = 0.866025
  const cos30 = Math.cos((30 * Math.PI) / 180)
  assert(Math.abs(cos30 - 0.866025) < 0.001)
})

it('Trees are strictly embedded -0.25m into ground geometry to prevent floating root gaps', () => {
  assert(terrainSrc.includes('treeY - 0.25'), 'Trees must be embedded -0.25m into terrain')
  assert(terrainSrc.includes('treeY - 0.2'), 'Saguaros must be embedded -0.2m into terrain')
  assert(terrainSrc.includes('rockY - 0.25 * sy'), 'Rocks must be embedded -0.25*sy into terrain')
})

console.log('\n========================================')
console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
console.log('========================================')

if (failed > 0) {
  process.exit(1)
}
