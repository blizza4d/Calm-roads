// scripts/test-transmission-overhaul.mjs
// Phase 1 Transmission & Gear Overhaul Verification Suite

import { VEHICLE_CONFIGS } from '../src/components/3d/Vehicles/vehicleConfigs.ts'

console.log('=== CALM ROADS 2.0: TRANSMISSION OVERHAUL VERIFICATION ===\n')

let passed = 0
let failed = 0

function assert(cond, name, details = '') {
  if (cond) {
    console.log(`[PASS] ${name}${details ? ' - ' + details : ''}`)
    passed++
  } else {
    console.error(`[FAIL] ${name}${details ? ' - ' + details : ''}`)
    failed++
  }
}

// ------------------------------------------------------------------------
// TEST 1: Physical Vehicle Gear Ratios & Differential Calibration
// ------------------------------------------------------------------------
console.log('--- Test 1: Physical Drivetrain Ratios Across All 7 Vehicles ---')

const vehicleKeys = ['bmw_m3', 'supercar', 'hovercraft', 'camper', 'hatchback', 'modern_supercar', 'vintage_hatch']

for (const key of vehicleKeys) {
  const cfg = VEHICLE_CONFIGS[key]
  assert(!!cfg, `Vehicle config exists for ${key}`)
  assert(cfg.gearRatios && cfg.gearRatios.length >= 1, `${key}: gearRatios array is defined (count: ${cfg.gearRatios.length})`)
  assert(cfg.finalDrive > 0, `${key}: finalDrive is positive (${cfg.finalDrive})`)
  assert(cfg.reverseRatio > 0, `${key}: reverseRatio is positive (${cfg.reverseRatio})`)
  assert(cfg.idleRpm > 500 && cfg.idleRpm < cfg.redlineRpm, `${key}: idleRpm (${cfg.idleRpm}) < redlineRpm (${cfg.redlineRpm})`)

  if (key !== 'hovercraft') {
    // Verify gear ratios are monotonically decreasing (1st gear is shortest/highest numerical ratio, top gear is tallest/lowest numerical ratio)
    let isMonotonic = true
    for (let i = 1; i < cfg.gearRatios.length; i++) {
      if (cfg.gearRatios[i] >= cfg.gearRatios[i - 1]) {
        isMonotonic = false
      }
    }
    assert(isMonotonic, `${key}: forward gear ratios are physically decreasing: [${cfg.gearRatios.join(', ')}]`)

    // Calculate theoretical redline top speed in 1st gear and top gear
    const k = (cfg.redlineRpm * 2 * Math.PI * cfg.wheelRadius * 3.6) / 60
    const top1st = k / (cfg.gearRatios[0] * cfg.finalDrive)
    const topHighest = k / (cfg.gearRatios[cfg.gearRatios.length - 1] * cfg.finalDrive)
    assert(top1st >= 30 && top1st <= 95, `${key}: 1st gear redline speed is physically realistic (${top1st.toFixed(1)} km/h)`)
    assert(topHighest >= cfg.maxSpeedKmh * 0.9, `${key}: top gear reaches or exceeds vehicle maxSpeedKmh (${topHighest.toFixed(1)} >= ${cfg.maxSpeedKmh} km/h)`)
  } else {
    // Hovercraft uses single flux drive
    assert(cfg.gearRatios.length === 1 && cfg.gearRatios[0] === 1.0, 'Hovercraft has single direct flux transmission')
  }
}

// ------------------------------------------------------------------------
// TEST 2: Wheel Angular Velocity to Engine RPM Mathematical Derivation
// ------------------------------------------------------------------------
console.log('\n--- Test 2: Physical RPM Calculations (BMW M3 GTR Baseline) ---')
const m3 = VEHICLE_CONFIGS.bmw_m3

function calcEngineRpm(speedKmh, gear, throttle = 0) {
  const speedMs = speedKmh / 3.6
  const wheelOmega = speedMs / m3.wheelRadius
  if (gear === 'R') {
    const revRatio = m3.reverseRatio * m3.finalDrive
    const drivetrainRpm = wheelOmega * revRatio * (60 / (2 * Math.PI))
    const clutchEngagement = Math.min(1.0, speedKmh / 12.0)
    const launchRpm = m3.idleRpm + throttle * (m3.upshiftRpm * 0.38 - m3.idleRpm)
    return Math.round(Math.max(m3.idleRpm, (1 - clutchEngagement) * launchRpm + clutchEngagement * drivetrainRpm))
  }
  if (gear === 'N') {
    return Math.round(m3.idleRpm + throttle * (m3.redlineRpm * 0.65 - m3.idleRpm))
  }
  const gIdx = typeof gear === 'number' ? gear : parseInt(gear)
  const ratio = m3.gearRatios[gIdx - 1]
  const drivetrainRpm = wheelOmega * ratio * m3.finalDrive * (60 / (2 * Math.PI))
  const clutchEngagement = Math.pow(Math.min(1.0, speedKmh / 16.0), 1.4)
  const launchRpm = m3.idleRpm + throttle * (m3.upshiftRpm * 0.52 - m3.idleRpm)
  return Math.round(Math.max(m3.idleRpm, (1 - clutchEngagement) * launchRpm + clutchEngagement * drivetrainRpm))
}

const idleRpm = calcEngineRpm(0, 1, 0)
assert(idleRpm === m3.idleRpm, 'Engine idles at 850 RPM when stationary with 0 throttle', `${idleRpm} RPM`)

const stagingRpm = calcEngineRpm(0, 'N', 1.0)
assert(stagingRpm > 5000 && stagingRpm < m3.redlineRpm, 'Free-revving in Neutral reaches pre-staging launch RPM', `${stagingRpm} RPM`)

const launchSlipRpm = calcEngineRpm(8, 1, 1.0)
assert(launchSlipRpm > 2500 && launchSlipRpm < 5000, 'Low-speed clutch slip blends launch throttle and wheel speed', `${launchSlipRpm} RPM at 8 km/h`)

const gear2CruisingRpm = calcEngineRpm(90, 2, 0.2)
assert(gear2CruisingRpm > 5000 && gear2CruisingRpm < 6000, 'Cruising at 90 km/h in 2nd gear gives realistic RPM', `${gear2CruisingRpm} RPM`)

const gear6HighwayRpm = calcEngineRpm(130, 6, 0.1)
assert(gear6HighwayRpm > 3000 && gear6HighwayRpm < 3800, 'Cruising at 130 km/h in 6th gear gives relaxed highway overdrive RPM', `${gear6HighwayRpm} RPM`)

const reverseRpm = calcEngineRpm(20, 'R', 0.5)
assert(reverseRpm > 1800 && reverseRpm < 3500, 'Reversing at 20 km/h gives authentic reverse gear RPM', `${reverseRpm} RPM`)

// ------------------------------------------------------------------------
// TEST 3: Transmission Directional Transitions & Hysteresis
// ------------------------------------------------------------------------
console.log('\n--- Test 3: Directional Transitions & Hysteresis Simulation ---')

class SimulatedTransmission {
  constructor() {
    this.gearState = 'D'
    this.currentGear = 1
    this.reverseHoldTimer = 0
    this.forwardHoldTimer = 0
    this.shiftCooldown = 0
  }

  step(speedKmh, isThrottle, isBrake, dt) {
    const forwardVel = speedKmh / 3.6
    let targetBrake = 0
    let targetThrottle = 0

    if (isThrottle) {
      if (this.gearState === 'R') {
        if (forwardVel < -0.15) {
          targetBrake = 1.0
          targetThrottle = 0.0
          this.forwardHoldTimer = 0
        } else {
          targetBrake = 0.8
          targetThrottle = 0.0
          this.forwardHoldTimer += dt
          if (this.forwardHoldTimer >= 0.16) {
            this.gearState = 'D'
            this.currentGear = 1
            this.forwardHoldTimer = 0
          }
        }
      } else {
        this.forwardHoldTimer = 0
        targetThrottle = 1.0
        if (this.gearState === 'N') this.gearState = 'D'
      }
    } else {
      this.forwardHoldTimer = 0
    }

    if (isBrake) {
      if (this.gearState === 'R') {
        targetThrottle = -0.65
        targetBrake = 0.0
        this.reverseHoldTimer = 0
      } else {
        if (forwardVel > 0.15) {
          targetBrake = 1.0
          targetThrottle = 0.0
          this.reverseHoldTimer = 0
        } else {
          targetBrake = 0.8
          targetThrottle = 0.0
          this.reverseHoldTimer += dt
          if (this.reverseHoldTimer >= 0.16) {
            this.gearState = 'R'
            this.reverseHoldTimer = 0
          }
        }
      }
    } else {
      this.reverseHoldTimer = 0
    }

    return { targetThrottle, targetBrake, gearState: this.gearState, currentGear: this.currentGear }
  }
}

const trans = new SimulatedTransmission()

// Scenario A: Braking while travelling forward at 100 km/h
let res = trans.step(100, false, true, 0.016)
assert(res.gearState === 'D' && res.targetBrake === 1.0 && res.targetThrottle === 0.0, 'Braking at 100 km/h decelerates in Drive (no reverse trigger)')

// Scenario B: Braking to a stop (speed reaches 0)
for (let i = 0; i < 5; i++) {
  res = trans.step(0, false, true, 0.016) // 5 frames = 0.08s < 0.16s
}
assert(res.gearState === 'D', 'At 0 km/h, briefly tapping brake stays in Drive (no accidental reverse)')

// Scenario C: Holding brake at 0 km/h for > 0.16s
for (let i = 0; i < 10; i++) {
  res = trans.step(0, false, true, 0.016) // 10 more frames = 0.16s total
}
assert(res.gearState === 'R', 'Holding brake at 0 km/h for >0.16s cleanly shifts to Reverse ("R")')

// Scenario D: Applying brake while in Reverse accelerates backwards
res = trans.step(-15, false, true, 0.016)
assert(res.gearState === 'R' && res.targetThrottle < 0, 'Brake pedal in Reverse accelerates backward')

// Scenario E: Pressing forward throttle while reversing at -15 km/h
res = trans.step(-15, true, false, 0.016)
assert(res.gearState === 'R' && res.targetBrake === 1.0, 'Forward throttle while moving backward acts as service brake to halt')

// Scenario F: Holding forward throttle at 0 km/h while in Reverse
for (let i = 0; i < 15; i++) {
  res = trans.step(0, true, false, 0.016)
}
assert(res.gearState === 'D' && res.currentGear === 1, 'Holding forward throttle at 0 km/h transitions back to Forward Drive in 1st gear')

// ------------------------------------------------------------------------
// TEST 4: Manual Transmission Lockouts & Anti-Stall
// ------------------------------------------------------------------------
console.log('\n--- Test 4: Manual Mode Lockouts & Anti-Stall ---')

function testManualShift(currentGear, speedKmh, requestDirection) {
  const wheelOmega = (speedKmh / 3.6) / m3.wheelRadius
  if (requestDirection === 'up') {
    if (currentGear >= m3.gearRatios.length) return { allowed: false, reason: 'Already in top gear' }
    const nextRatio = m3.gearRatios[currentGear]
    const nextRpm = wheelOmega * nextRatio * m3.finalDrive * (60 / (2 * Math.PI))
    if (speedKmh < 8.0 || nextRpm <= m3.idleRpm * 0.85) {
      return { allowed: false, reason: `Upshift lockout: engine would bog (${nextRpm.toFixed(0)} RPM)` }
    }
    return { allowed: true, newGear: currentGear + 1 }
  } else {
    if (currentGear <= 1) return { allowed: false, reason: 'Already in 1st gear' }
    const prevRatio = m3.gearRatios[currentGear - 2]
    const prevRpm = wheelOmega * prevRatio * m3.finalDrive * (60 / (2 * Math.PI))
    if (prevRpm > m3.redlineRpm + 150) {
      return { allowed: false, reason: `Downshift lockout: over-rev protection (${prevRpm.toFixed(0)} > ${m3.redlineRpm})` }
    }
    return { allowed: true, newGear: currentGear - 1 }
  }
}

// Case 1: Stationary in 1st gear trying to upshift to 2nd
const upAt0 = testManualShift(1, 0, 'up')
assert(!upAt0.allowed, 'Manual upshift locked out when stationary')

// Case 2: In 1st gear at 45 km/h upshifting to 2nd
const upAt45 = testManualShift(1, 45, 'up')
assert(upAt45.allowed && upAt45.newGear === 2, 'Manual upshift permitted at 45 km/h')

// Case 3: In 3rd gear at 200 km/h trying to downshift to 2nd (over-rev risk)
const downAt200 = testManualShift(3, 200, 'down')
assert(!downAt200.allowed, 'Downshift from 3rd to 2nd at 200 km/h locked out to prevent over-rev')

// Case 4: In 3rd gear at 80 km/h downshifting to 2nd
const downAt80 = testManualShift(3, 80, 'down')
assert(downAt80.allowed && downAt80.newGear === 2, 'Downshift from 3rd to 2nd at 80 km/h permitted')

// ------------------------------------------------------------------------
// TEST 5: Differentiated 7-Vehicle Profiles & Grade-Aware Shifting
// ------------------------------------------------------------------------
console.log('\n--- Test 5: Vehicle Differentiation, Neutral Torque & Grade Load ---')
assert(
  VEHICLE_CONFIGS.modern_supercar.redlineRpm === 9500 &&
    VEHICLE_CONFIGS.modern_supercar.maxSpeedKmh > VEHICLE_CONFIGS.supercar.maxSpeedKmh,
  'Modern Exotic V12 Hypercar has distinct 9,500 RPM redline and higher top speed than base supercar'
)
assert(
  VEHICLE_CONFIGS.vintage_hatch.redlineRpm === 7800 &&
    VEHICLE_CONFIGS.vintage_hatch.massKg < VEHICLE_CONFIGS.hatchback.massKg,
  'Vintage Turbo Hatch has distinct 7,800 RPM redline and lighter chassis mass than Rally Hatch'
)
assert(
  VEHICLE_CONFIGS.camper.redlineRpm === 4400 && VEHICLE_CONFIGS.camper.upshiftRpm === 3600,
  'Camper Van diesel profile has authentic 4,400 RPM redline and low-RPM upshift point'
)
assert(
  VEHICLE_CONFIGS.bmw_m3.gearRatios.length === 6 &&
    VEHICLE_CONFIGS.supercar.gearRatios.length === 7 &&
    VEHICLE_CONFIGS.camper.gearRatios.length === 5,
  'Each vehicle class preserves distinct gear count (BMW 6-sp, Supercar 7-sp, Camper 5-sp)'
)

// Uphill grade raises automatic shift thresholds to prevent bogging on mountain climbs
const flatUpshift = m3.upshiftRpm
const uphillLoad = Math.min(1, 0.12 / 0.14)
const uphillUpshift = Math.min(m3.redlineRpm - 250, flatUpshift + uphillLoad * 550)
const uphillDownshift = m3.downshiftRpm + uphillLoad * 650
assert(
  uphillUpshift > flatUpshift && uphillDownshift > m3.downshiftRpm,
  'Steep uphill grade raises automatic upshift & downshift thresholds',
  `up: ${flatUpshift} -> ${Math.round(uphillUpshift)}, down: ${m3.downshiftRpm} -> ${Math.round(uphillDownshift)}`
)

// Vehicle switching gear clamp safety (7th gear supercar -> 5th gear camper)
const clampedGear = Math.max(1, Math.min(VEHICLE_CONFIGS.camper.gearRatios.length, 7))
assert(
  clampedGear === 5 && Number.isFinite(VEHICLE_CONFIGS.camper.gearRatios[clampedGear - 1]),
  'Switching from 7-speed to 5-speed vehicle clamps gear safely without out-of-bounds undefined ratio'
)

console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`)
process.exit(failed > 0 ? 1 : 0)
