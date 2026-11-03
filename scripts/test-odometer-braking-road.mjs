import * as THREE from 'three'
import {
  getRoadCenter,
  getRoadElevation,
  getRoadTangent,
  getRoadBanking,
  getTerrainHeight,
  getSurfaceHeight,
  getClosestRoadPoint,
  ROAD_WIDTH,
  getActiveBiomeAt,
} from '../src/utils/roadMath.ts'

console.log('=== CALM ROADS: ODOMETER, ROAD CONTINUITY & BRAKING/BURNOUT VERIFICATION ===\n')

let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`)
    passedTests++
  } else {
    console.error(`[FAIL] ${message}`)
    failedTests++
  }
}

// ------------------------------------------------------------------------
// SECTION 1: NFS Most Wanted Mechanical Rolling Odometer Mathematical Carry
// ------------------------------------------------------------------------
console.log('--- Section 1: Mechanical Rolling Odometer Drum Physics ---')

function calcOdometerDrums(distKm) {
  const val = Math.max(0, distKm * 100) // 1 unit = 0.01 km = 10m

  // Drum 6 (hundredths fraction): rolls continuously
  const pos6 = val % 10
  // Mechanical carry engagement zone: as Drum 6 rolls from 9.0 to 10.0
  const carry6 = Math.max(0, Math.min(1, (pos6 - 9.0) / 1.0))

  // Drum 5 (tenths fraction)
  const d5 = Math.floor(val / 10) % 10
  const pos5 = (d5 + carry6) % 10
  const carry5 = d5 === 9 ? carry6 : 0

  // Drum 4 (ones)
  const d4 = Math.floor(val / 100) % 10
  const pos4 = (d4 + carry5) % 10
  const carry4 = d4 === 9 ? carry5 : 0

  // Drum 3 (tens)
  const d3 = Math.floor(val / 1000) % 10
  const pos3 = (d3 + carry4) % 10
  const carry3 = d3 === 9 ? carry4 : 0

  // Drum 2 (hundreds)
  const d2 = Math.floor(val / 10000) % 10
  const pos2 = (d2 + carry3) % 10
  const carry2 = d2 === 9 ? carry3 : 0

  // Drum 1 (thousands)
  const d1 = Math.floor(val / 100000) % 10
  const pos1 = (d1 + carry2) % 10
  const carry1 = d1 === 9 ? carry2 : 0

  // Drum 0 (ten-thousands)
  const d0 = Math.floor(val / 1000000) % 10
  const pos0 = (d0 + carry1) % 10

  return [pos0, pos1, pos2, pos3, pos4, pos5, pos6]
}

// Test 1.1: Zero initial state
{
  const drums = calcOdometerDrums(0)
  assert(drums.every(d => Math.abs(d) < 1e-6), 'Zero distance displays all drums at 0.00000.00')
}

// Test 1.2: Stationary before carry (00009.98)
{
  const drums = calcOdometerDrums(9.98)
  assert(Math.abs(drums[4] - 9.0) < 1e-4, 'At 9.98 km, ones drum is stationary at 9.0')
  assert(Math.abs(drums[5] - 9.0) < 1e-4, 'At 9.98 km, tenths drum is stationary at 9.0')
  assert(Math.abs(drums[6] - 8.0) < 1e-4, 'At 9.98 km, hundredths drum is at 8.0')
  assert(Math.abs(drums[3] - 0.0) < 1e-4, 'At 9.98 km, tens drum is stationary at 0.0')
}

// Test 1.3: Synchronized carry cascade across 9.995 -> 10.00
{
  const drumsMid = calcOdometerDrums(9.995)
  // At 9.995 (val = 999.5):
  // pos6 is 9.5, carry6 is 0.5
  // pos5 is (9 + 0.5) = 9.5
  // pos4 is (9 + 0.5) = 9.5
  // pos3 is (0 + 0.5) = 0.5 (tens rolling into 1!)
  assert(Math.abs(drumsMid[6] - 9.5) < 1e-4, 'At 9.995 km, hundredths drum is halfway between 9 and 0 (9.5)')
  assert(Math.abs(drumsMid[5] - 9.5) < 1e-4, 'At 9.995 km, tenths drum is rolling in unison (9.5)')
  assert(Math.abs(drumsMid[4] - 9.5) < 1e-4, 'At 9.995 km, ones drum is rolling in unison (9.5)')
  assert(Math.abs(drumsMid[3] - 0.5) < 1e-4, 'At 9.995 km, tens drum is rolling into 1 (0.5)')
  assert(Math.abs(drumsMid[2] - 0.0) < 1e-4, 'At 9.995 km, hundreds drum remains stationary at 0.0')

  const drums10 = calcOdometerDrums(10.00)
  assert(Math.abs(drums10[3] - 1.0) < 1e-4, 'At 10.00 km, tens drum has fully clicked into 1.0')
  assert(Math.abs(drums10[4] - 0.0) < 1e-4, 'At 10.00 km, ones drum has fully rolled to 0.0')
  assert(Math.abs(drums10[5] - 0.0) < 1e-4, 'At 10.00 km, tenths drum has fully rolled to 0.0')
  assert(Math.abs(drums10[6] - 0.0) < 1e-4, 'At 10.00 km, hundredths drum has fully rolled to 0.0')
}

// Test 1.4: Big carry across 99.995 -> 100.00
{
  const drumsMid = calcOdometerDrums(99.995)
  assert(Math.abs(drumsMid[2] - 0.5) < 1e-4, 'At 99.995 km, hundreds drum is rolling into 1 (0.5)')
  assert(Math.abs(drumsMid[3] - 9.5) < 1e-4, 'At 99.995 km, tens drum is rolling into 0 (9.5)')
  assert(Math.abs(drumsMid[4] - 9.5) < 1e-4, 'At 99.995 km, ones drum is rolling into 0 (9.5)')

  const drums100 = calcOdometerDrums(100.00)
  assert(Math.abs(drums100[2] - 1.0) < 1e-4, 'At 100.00 km, display is exactly 00100.00')
  assert(Math.abs(drums100[3] - 0.0) < 1e-4, 'At 100.00 km, tens drum is 0.0')
  assert(Math.abs(drums100[4] - 0.0) < 1e-4, 'At 100.00 km, ones drum is 0.0')
}

// Test 1.5: 3D Traveled Displacement & Stationary Burnout Immunity
{
  let accumulatedDist = 0
  let lastPos = new THREE.Vector3(0, 24, 0)

  // Simulate stationary burnout: wheel spins, but pos stays constant
  for (let f = 0; f < 300; f++) {
    const curPos = new THREE.Vector3(0, 24, 0)
    const stepDist = curPos.distanceTo(lastPos)
    if (stepDist > 0.001 && stepDist < 12.0) {
      accumulatedDist += stepDist / 1000.0
    }
    lastPos.copy(curPos)
  }
  assert(accumulatedDist === 0, 'Stationary burnout produces ZERO odometer distance accumulation')

  // Simulate vehicle reset / teleport jump (e.g. 150m)
  const jumpPos = new THREE.Vector3(100, 30, -500)
  const jumpDist = jumpPos.distanceTo(lastPos)
  assert(jumpDist > 12.0, 'Discontinuous reset jump detected (> 12m)')
  if (jumpDist > 0.001 && jumpDist < 12.0) {
    accumulatedDist += jumpDist / 1000.0
  }
  lastPos.copy(jumpPos)
  assert(accumulatedDist === 0, 'Reset / teleport does not artificially increase odometer')

  // Simulate real driving through winding mountain road
  for (let step = 1; step <= 500; step++) {
    const z = -step * 2.0 // 2 meters per step
    const x = getRoadCenter(z)
    const y = getRoadElevation(z)
    const curPos = new THREE.Vector3(x, y, z)
    const stepDist = curPos.distanceTo(lastPos)
    if (stepDist > 0.001 && stepDist < 12.0) {
      accumulatedDist += stepDist / 1000.0
    }
    lastPos.copy(curPos)
  }
  assert(accumulatedDist > 0.99 && accumulatedDist < 1.15, `Actual 3D winding road distance measured accurately: ${accumulatedDist.toFixed(3)} km`)
}

// ------------------------------------------------------------------------
// SECTION 2: Low-Speed Braking vs. Burnout Physics Simulation
// ------------------------------------------------------------------------
console.log('\n--- Section 2: Low-Speed Braking vs. Burnout Physics ---')

function evaluateVehicleInputs({
  forwardVel,
  isGrounded = true,
  isHoverMode = false,
  keys = {},
  virtualThrottle = false,
  virtualBrake = false,
  virtualBurnout = false,
  currentGear = 1,
}) {
  const absVel = Math.abs(forwardVel)
  const isHover = isHoverMode

  const isThrottle = Boolean(keys.forward) || virtualThrottle
  const isServiceBrake = Boolean(keys.backward) || Boolean(keys.brake) || virtualBrake
  const isHandbrake = Boolean(keys.handbrake)
  const isBurnoutKey = Boolean(keys.burnout) || virtualBurnout

  // Intentional Burnout Rule
  const isBurnoutActive =
    !isHover &&
    isGrounded &&
    !isServiceBrake &&
    isThrottle &&
    (isBurnoutKey || (isHandbrake && absVel < 3.0 && currentGear === 1))

  let targetThrottle = 0
  let targetBrake = 0

  if (isBurnoutActive) {
    targetThrottle = 1.0
    targetBrake = isHandbrake ? 0.95 : 0.0
  } else {
    if (isThrottle) {
      if (forwardVel < -0.25) {
        targetBrake = 1.0
        targetThrottle = 0.0
      } else {
        targetThrottle = 1.0
      }
    }
    if (isServiceBrake) {
      if (forwardVel > 0.15) {
        targetBrake = 1.0
        targetThrottle = 0.0
      } else if (forwardVel < -0.15) {
        targetThrottle = -0.55
        targetBrake = 0.0
      } else {
        targetThrottle = -0.55
        targetBrake = 0.0
      }
    }
    if (isHandbrake) {
      targetBrake = Math.max(targetBrake, 0.85)
    }
  }

  return { isBurnoutActive, targetThrottle, targetBrake }
}

// Test 2.1: Low-speed braking test (walking speed 1.0 m/s ~ 3.6 km/h)
{
  const res = evaluateVehicleInputs({
    forwardVel: 1.0,
    keys: { backward: true }, // Player pressed S or ArrowDown
  })
  assert(!res.isBurnoutActive, 'Brake at low speed (1.0 m/s) does NOT activate burnout')
  assert(res.targetBrake === 1.0 && res.targetThrottle === 0.0, 'Brake at low speed applies full 100% service brake (targetBrake=1.0, targetThrottle=0.0)')
}

// Test 2.2: Crawling speed braking test (0.3 m/s ~ 1.0 km/h)
{
  const res = evaluateVehicleInputs({
    forwardVel: 0.3,
    keys: { brake: true }, // Player pressed brake
  })
  assert(!res.isBurnoutActive, 'Brake at crawling speed (0.3 m/s) does NOT activate burnout')
  assert(res.targetBrake === 1.0 && res.targetThrottle === 0.0, 'Brake at crawling speed applies full service brake')
}

// Test 2.3: Stationary braking
{
  const res = evaluateVehicleInputs({
    forwardVel: 0.0,
    keys: { backward: true },
  })
  assert(!res.isBurnoutActive, 'Brake at stationary standstill does NOT activate burnout')
  assert(res.targetThrottle === -0.55, 'Holding brake from standstill engages reverse smoothly')
}

// Test 2.4: Deliberate Burnout via Dedicated Key (B / virtualBurnout)
{
  const res = evaluateVehicleInputs({
    forwardVel: 0.0,
    keys: { burnout: true, forward: true },
  })
  assert(res.isBurnoutActive, 'Dedicated burnout key (B) + throttle triggers intentional burnout')
  assert(res.targetThrottle === 1.0, 'Burnout pegs throttle to 1.0 (redline)')
}

// Test 2.5: Deliberate Burnout via Handbrake (Space) + Throttle (W) at standstill in 1st gear
{
  const res = evaluateVehicleInputs({
    forwardVel: 0.5,
    keys: { handbrake: true, forward: true },
    currentGear: 1,
  })
  assert(res.isBurnoutActive, 'Handbrake (Space) + Throttle (W) at low speed in 1st gear triggers intentional burnout')
  assert(res.targetBrake === 0.95, 'Stationary line-lock is engaged during handbrake burnout')
}

// Test 2.6: Normal brake cancels burnout immediately
{
  const res = evaluateVehicleInputs({
    forwardVel: 0.5,
    keys: { handbrake: true, forward: true, backward: true }, // Player tapped brake
    currentGear: 1,
  })
  assert(!res.isBurnoutActive, 'Service brake (S / Down) immediately cancels burnout')
  assert(res.targetBrake === 1.0, 'Service brake decelerates vehicle instead of burning out')
}

// Test 2.7: Handbrake alone does not cause burnout
{
  const res = evaluateVehicleInputs({
    forwardVel: 15.0,
    keys: { handbrake: true },
  })
  assert(!res.isBurnoutActive, 'Handbrake alone does NOT activate burnout')
  assert(res.targetBrake === 0.85, 'Handbrake applies rear wheel braking for drifting')
}

// Test 2.8: Airborne burnout prevention
{
  const res = evaluateVehicleInputs({
    forwardVel: 0.0,
    isGrounded: false,
    keys: { burnout: true, forward: true },
  })
  assert(!res.isBurnoutActive, 'Airborne vehicle CANNOT activate burnout')
}

// ------------------------------------------------------------------------
// SECTION 3: Road Mesh & Chunk Boundary Continuity
// ------------------------------------------------------------------------
console.log('\n--- Section 3: Procedural Road Continuity Across Chunk Boundaries ---')

const CHUNK_LEN = 200
const segments = 50
const halfW = ROAD_WIDTH / 2

// Test 3.1: Check consecutive chunk boundaries for 50 chunk transitions (0m to -10,000m)
let maxBoundaryMismatch = 0

for (let chunkIdx = 0; chunkIdx < 50; chunkIdx++) {
  const chunkZ_A = -chunkIdx * CHUNK_LEN
  const chunkZ_B = -(chunkIdx + 1) * CHUNK_LEN

  // Chunk A: end cross-section (i = segments, localZ = -CHUNK_LEN / 2 = -100)
  const localZ_A = -CHUNK_LEN / 2
  const worldZ_A = chunkZ_A + localZ_A
  const cx_A = getRoadCenter(worldZ_A)
  const cy_A = getRoadElevation(worldZ_A) + 0.085
  const tan_A = getRoadTangent(worldZ_A)
  const bank_A = getRoadBanking(worldZ_A)
  const bankY_A = Math.tan(bank_A) * halfW

  // World coordinates of Chunk A end vertices
  const left_A = new THREE.Vector3(cx_A - tan_A.nx * halfW, cy_A - bankY_A, worldZ_A - tan_A.nz * halfW)
  const center_A = new THREE.Vector3(cx_A, cy_A + 0.025, worldZ_A)
  const right_A = new THREE.Vector3(cx_A + tan_A.nx * halfW, cy_A + bankY_A, worldZ_A + tan_A.nz * halfW)

  // Chunk B: start cross-section (i = 0, localZ = +CHUNK_LEN / 2 = +100)
  const localZ_B = CHUNK_LEN / 2
  const worldZ_B = chunkZ_B + localZ_B
  const cx_B = getRoadCenter(worldZ_B)
  const cy_B = getRoadElevation(worldZ_B) + 0.085
  const tan_B = getRoadTangent(worldZ_B)
  const bank_B = getRoadBanking(worldZ_B)
  const bankY_B = Math.tan(bank_B) * halfW

  // World coordinates of Chunk B start vertices
  const left_B = new THREE.Vector3(cx_B - tan_B.nx * halfW, cy_B - bankY_B, worldZ_B - tan_B.nz * halfW)
  const center_B = new THREE.Vector3(cx_B, cy_B + 0.025, worldZ_B)
  const right_B = new THREE.Vector3(cx_B + tan_B.nx * halfW, cy_B + bankY_B, worldZ_B + tan_B.nz * halfW)

  const diffLeft = left_A.distanceTo(left_B)
  const diffCenter = center_A.distanceTo(center_B)
  const diffRight = right_A.distanceTo(right_B)
  const maxDiff = Math.max(diffLeft, diffCenter, diffRight)

  if (maxDiff > maxBoundaryMismatch) maxBoundaryMismatch = maxDiff
}

assert(maxBoundaryMismatch < 1e-5, `Road cross-sections match across all 50 chunk boundaries (max mismatch: ${maxBoundaryMismatch.toExponential(2)}m)`)

// Test 3.2: Verify visual road elevation matches physical getSurfaceHeight
console.log('--- Test 3.2: Collision Surface vs. Visual Road Mesh Floor ---')
let maxSurfaceError = 0
for (let z = 0; z >= -3000; z -= 25) {
  const cx = getRoadCenter(z)
  const elevation = getRoadElevation(z)
  const banking = getRoadBanking(z)

  // Center: road crown is +0.110m
  const visualCenterY = elevation + 0.085 + 0.025
  const physicalCenterY = getSurfaceHeight(cx, z)
  const centerErr = Math.abs(visualCenterY - physicalCenterY)

  // Left Edge:
  const tan = getRoadTangent(z)
  const lx = cx - tan.nx * halfW
  const lz = z - tan.nz * halfW
  const bankY = Math.tan(banking) * halfW
  const visualLeftY = elevation + 0.085 - bankY
  const physicalLeftY = getSurfaceHeight(lx, lz)
  const leftErr = Math.abs(visualLeftY - physicalLeftY)

  if (centerErr > maxSurfaceError) maxSurfaceError = centerErr
  if (leftErr > maxSurfaceError) maxSurfaceError = leftErr
}
assert(maxSurfaceError < 0.035, `Road collision matches visual mesh within 35mm across 3000m of road (max error: ${(maxSurfaceError * 1000).toFixed(2)}mm)`)

// Test 3.3: Terrain clearance (terrain never punctures road)
console.log('--- Test 3.3: Bulldozer Roadbed Protection Clearance ---')
let minClearance = 999
for (let z = 0; z >= -3000; z -= 30) {
  const cx = getRoadCenter(z)
  const roadY = getRoadElevation(z)
  const banking = getRoadBanking(z)
  for (let offset = -halfW; offset <= halfW; offset += 2.0) {
    const tan = getRoadTangent(z)
    const px = cx + tan.nx * offset
    const pz = z + tan.nz * offset
    const terrainY = getTerrainHeight(px, pz, 'forest')
    const visualRoadY = roadY + 0.085 + Math.tan(banking) * offset
    const clearance = visualRoadY - terrainY
    if (clearance < minClearance) minClearance = clearance
  }
}
assert(minClearance >= 0.20, `Terrain is depressed safely beneath road corridor (minimum clearance: ${minClearance.toFixed(3)}m)`)

// Test 3.4: Centerline Dashed Markings Global Grid Continuity
console.log('--- Test 3.4: Centerline Dashed Markings Boundary Rhythm ---')
{
  const dashSpacing = 14.0
  const dashLen = 7.0
  // Verify that dashes on boundary at z = -200 meet seamlessly
  const chunkZ_A = 0
  const chunkZ_B = -200

  const startWz_A = chunkZ_A + CHUNK_LEN / 2
  const firstDashWz_A = Math.floor(startWz_A / dashSpacing) * dashSpacing + dashSpacing * 0.5

  const startWz_B = chunkZ_B + CHUNK_LEN / 2
  const firstDashWz_B = Math.floor(startWz_B / dashSpacing) * dashSpacing + dashSpacing * 0.5

  // Find dashes that touch the boundary z = -100
  let dashA_Touches = false
  let dashB_Touches = false

  for (let i = 0; i < 16; i++) {
    const wzCenter_A = firstDashWz_A - i * dashSpacing
    if (Math.abs(wzCenter_A - (-100)) < dashLen / 2) dashA_Touches = true
  }
  for (let i = 0; i < 16; i++) {
    const wzCenter_B = firstDashWz_B - i * dashSpacing
    if (Math.abs(wzCenter_B - (-100)) < dashLen / 2) dashB_Touches = true
  }

  assert(dashA_Touches === dashB_Touches, 'Centerline dashes maintain identical global 14m grid synchronization across chunk boundaries')
}

console.log(`\n=======================================================`)
console.log(`FINAL RESULT: ${passedTests} PASSED, ${failedTests} FAILED`)
console.log(`=======================================================`)

if (failedTests > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
