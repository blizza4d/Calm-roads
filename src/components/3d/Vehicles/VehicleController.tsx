import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore, VehicleModelType } from '../../../store/useGameStore'
import { ActiveCarModel } from './CarModels'
import {
  getRoadCenter,
  getRoadElevation,
  isRoadSurface,
  getActiveBiomeAt,
  getTerrainHeight,
  getTerrainSlopeForVehicle,
} from '../../../utils/roadMath'
import { audioSystem } from '../../../utils/audioSystem'

export interface VehicleConfig {
  name: string
  massKg: number
  wheelRadius: number
  maxSpeedMs: number
  maxSpeedKmh: number
  peakAccel: number
  brakeDecel: number
  dragCoeff: number // Aerodynamic drag factor
  downforceCoeff: number // Aerodynamic downforce
  turnRate: number
  tireGrip: number
  roadDamping: number
  offroadDamping: number
  gearRatios: number[] // Speed km/h per gear
}

export const VEHICLE_CONFIGS: Record<VehicleModelType, VehicleConfig> = {
  bmw_m3: {
    name: "BMW M3 GTR '05",
    massKg: 1350,
    wheelRadius: 0.36,
    maxSpeedMs: 76.4, // ~275 km/h
    maxSpeedKmh: 275,
    peakAccel: 6.8, // Progressive GT power curve
    brakeDecel: 28,
    dragCoeff: 0.32,
    downforceCoeff: 0.45,
    turnRate: 1.38,
    tireGrip: 1.15,
    roadDamping: 0.994,
    offroadDamping: 0.985,
    gearRatios: [48, 92, 145, 195, 238, 275],
  },
  hovercraft: {
    name: 'Antigravity Hovercraft',
    massKg: 980,
    wheelRadius: 0.32,
    maxSpeedMs: 86.1, // ~310 km/h
    maxSpeedKmh: 310,
    peakAccel: 7.6,
    brakeDecel: 22,
    dragCoeff: 0.22,
    downforceCoeff: 0.65,
    turnRate: 1.62,
    tireGrip: 0.85, // Low-friction inertia drift
    roadDamping: 0.997,
    offroadDamping: 0.996,
    gearRatios: [60, 130, 205, 265, 310],
  },
  camper: {
    name: 'Cozy Camper Van',
    massKg: 1950,
    wheelRadius: 0.38,
    maxSpeedMs: 40.3, // ~145 km/h
    maxSpeedKmh: 145,
    peakAccel: 3.2, // Heavy vintage inertia
    brakeDecel: 19,
    dragCoeff: 0.44,
    downforceCoeff: 0.1,
    turnRate: 1.08,
    tireGrip: 0.95,
    roadDamping: 0.991,
    offroadDamping: 0.982,
    gearRatios: [32, 65, 105, 145],
  },
  hatchback: {
    name: 'Rally Spec Hatchback',
    massKg: 1120,
    wheelRadius: 0.34,
    maxSpeedMs: 62.5, // ~225 km/h
    maxSpeedKmh: 225,
    peakAccel: 5.6,
    brakeDecel: 26,
    dragCoeff: 0.36,
    downforceCoeff: 0.35,
    turnRate: 1.42,
    tireGrip: 1.1,
    roadDamping: 0.992,
    offroadDamping: 0.984,
    gearRatios: [40, 80, 125, 172, 225],
  },
}

export default function VehicleController() {
  const carGroupRef = useRef<THREE.Group>(null)
  const chassisMeshRef = useRef<THREE.Group>(null)
  const [, getKeys] = useKeyboardControls()

  const {
    vehicleModel,
    paintColor,
    metallic,
    roughness,
    biome,
    isHoverMode,
    cameraPerspective,
    headlights,
    photoMode,
    setSpeed,
    setRpm,
    setGear,
    addDistance,
    setThrottle,
    setBrake,
    setSteering,
    setCurrentResolvedBiome,
  } = useGameStore()

  // State Variables - initialized on the road at Z=0
  const initialSpawnY = getRoadElevation(0) + 0.44
  const initialSpawnX = getRoadCenter(0)
  const pos = useRef(new THREE.Vector3(initialSpawnX, initialSpawnY, 0))
  const forwardVel = useRef(0) // meters per second
  const lateralVel = useRef(0) // drift velocity (m/s)
  const yawAngle = useRef(0) // radians
  const steeringVisual = useRef(0)
  const wheelSpin = useRef(0)
  const bodyRoll = useRef(0)
  const bodyPitch = useRef(0)
  const currentThrottle = useRef(0)
  const hoverAltitude = useRef(0.44)
  const wheelSuspensions = useRef<[number, number, number, number]>([0, 0, 0, 0])
  const prevThrottleVal = useRef(0)

  // Fixed timestep physics accumulator (120 Hz fixed substepping)
  const physicsAccumulator = useRef(0)
  const FIXED_DT = 1 / 120

  const config = VEHICLE_CONFIGS[vehicleModel] || VEHICLE_CONFIGS.bmw_m3

  useFrame((state, delta) => {
    if (!carGroupRef.current || photoMode) return

    const frameDelta = Math.min(delta, 0.08)
    const keys = getKeys()
    const store = useGameStore.getState()

    // 1. Resolve active biome at current Z position
    const activeBiomeConfig = getActiveBiomeAt(pos.current.z, biome)
    setCurrentResolvedBiome(activeBiomeConfig.id)

    // 2. User Controls & Input Processing
    let targetThrottle = 0
    let targetBrake = 0
    let steerInput = 0

    if (store.autoDrive) {
      // Relaxing cruising along the highway centerline
      const targetCruise = 26 // m/s (~94 km/h)
      if (forwardVel.current < targetCruise) targetThrottle = 0.55
      else targetThrottle = 0.06

      const roadX = getRoadCenter(pos.current.z)
      const lookAheadRoadX = getRoadCenter(pos.current.z - 24)
      const errorX = pos.current.x - roadX
      const curveAhead = lookAheadRoadX - roadX

      const autoSteer = errorX * 0.14 - curveAhead * 0.08
      steerInput = Math.max(-0.65, Math.min(0.65, autoSteer))
    } else {
      if (keys.forward || store.virtualThrottle) targetThrottle = 1
      if (keys.backward || store.virtualBrake) {
        if (forwardVel.current > 1.2) targetBrake = 1
        else targetThrottle = -0.45
      }
      if (keys.brake) targetBrake = 1
      if (keys.left || store.virtualSteerLeft) steerInput += 1
      if (keys.right || store.virtualSteerRight) steerInput -= 1
    }

    currentThrottle.current = THREE.MathUtils.lerp(
      currentThrottle.current,
      targetThrottle,
      frameDelta * 3.8
    )
    const curThrottleAbs = Math.abs(currentThrottle.current)
    setThrottle(curThrottleAbs)
    setBrake(targetBrake)
    setSteering(steerInput)

    // ------------------------------------------------------------------------
    // 3. Fixed-Timestep Physics Simulation Substepping (120 Hz)
    // ------------------------------------------------------------------------
    physicsAccumulator.current += frameDelta
    const maxSubSteps = 4
    let steps = 0

    const onRoad = isRoadSurface(pos.current.x, pos.current.z)
    const effectiveDamping = isHoverMode
      ? 0.997
      : onRoad
      ? config.roadDamping
      : config.offroadDamping

    while (physicsAccumulator.current >= FIXED_DT && steps < maxSubSteps) {
      const dt = FIXED_DT
      physicsAccumulator.current -= dt
      steps++

      const forwardX = -Math.sin(yawAngle.current)
      const forwardZ = -Math.cos(yawAngle.current)
      const rightX = Math.cos(yawAngle.current)
      const rightZ = -Math.sin(yawAngle.current)

      // Calculate terrain slope
      const { pitch: terrainPitch } = getTerrainSlopeForVehicle(
        pos.current.x,
        pos.current.z,
        forwardX,
        forwardZ,
        rightX,
        rightZ,
        activeBiomeConfig.id
      )

      // Slope gravity: uphill resistance, downhill natural momentum
      const slopeGravity = -4.5 * Math.sin(terrainPitch)

      // Aerodynamic Drag: F_drag proportional to v^2
      const speedNorm = Math.abs(forwardVel.current) / config.maxSpeedMs
      const aeroDrag = 0.5 * config.dragCoeff * 1.225 * Math.pow(forwardVel.current, 2) * 0.0018

      // Progressive power curve: strong low-end torque tapering off smoothly as speed reaches max
      const powerFactor = Math.max(0.12, Math.pow(Math.max(0, 1 - speedNorm), 0.65))
      const accel = config.peakAccel * powerFactor * (isHoverMode || onRoad ? 1.0 : 0.82)

      if (currentThrottle.current > 0) {
        forwardVel.current += (currentThrottle.current * accel + slopeGravity - aeroDrag) * dt
        if (forwardVel.current > config.maxSpeedMs) forwardVel.current = config.maxSpeedMs
      } else if (currentThrottle.current < 0) {
        forwardVel.current += (currentThrottle.current * (config.peakAccel * 0.45) + slopeGravity) * dt
        if (forwardVel.current < -12) forwardVel.current = -12
      } else {
        forwardVel.current += (slopeGravity - Math.sign(forwardVel.current) * aeroDrag) * dt
      }

      // Progressive Braking
      if (targetBrake > 0) {
        const decel = config.brakeDecel * (isHoverMode ? 0.65 : 1.0)
        if (forwardVel.current > 0) {
          forwardVel.current = Math.max(0, forwardVel.current - targetBrake * decel * dt)
        } else if (forwardVel.current < 0) {
          forwardVel.current = Math.min(0, forwardVel.current + targetBrake * decel * dt)
        }
      }

      // Natural Rolling Resistance & Coasting Drag
      if (targetThrottle === 0 && targetBrake === 0) {
        forwardVel.current *= Math.pow(effectiveDamping, dt * 60)
        if (Math.abs(forwardVel.current) < 0.03) forwardVel.current = 0
      }

      // Speed-dependent Steering: high speeds progressively dampen steering angle
      const currentSpeedKmh = Math.abs(forwardVel.current) * 3.6
      const speedSteerFactor = Math.max(0.28, 1 - (currentSpeedKmh / 280) * 0.62)

      if (Math.abs(forwardVel.current) > 0.06) {
        const turnDir = forwardVel.current >= 0 ? 1 : -1
        yawAngle.current += steerInput * config.turnRate * speedSteerFactor * turnDir * dt
      }

      // Lateral Grip & Antigravity Inertia Drift
      if (isHoverMode) {
        const targetLateral = -steerInput * (currentSpeedKmh / 140) * 8.2
        lateralVel.current = THREE.MathUtils.lerp(lateralVel.current, targetLateral, dt * 3.6)
      } else {
        // High-speed cornering lateral slip
        const maxCornerGrip = config.tireGrip * 9.81 * (1 + speedNorm * 0.35) // Downforce increases grip with v^2
        const centripetalAccel = Math.pow(forwardVel.current, 2) * Math.abs(steerInput * 0.04)
        if (centripetalAccel > maxCornerGrip) {
          // Break into controlled drift
          lateralVel.current += -Math.sign(steerInput) * (centripetalAccel - maxCornerGrip) * 0.15 * dt
        }
        lateralVel.current *= Math.pow(0.86, dt * 60)
      }

      // Advance 3D World Position
      pos.current.x += (forwardX * forwardVel.current + rightX * lateralVel.current) * dt
      pos.current.z += (forwardZ * forwardVel.current + rightZ * lateralVel.current) * dt
    }

    // ------------------------------------------------------------------------
    // 4. Ground Alignment, Suspension & Dynamic Chassis Roll
    // ------------------------------------------------------------------------
    const currentSpeedKmh = Math.abs(forwardVel.current) * 3.6
    steeringVisual.current = THREE.MathUtils.lerp(steeringVisual.current, steerInput * 0.38, frameDelta * 10)
    wheelSpin.current += (forwardVel.current / config.wheelRadius) * frameDelta

    const forwardX = -Math.sin(yawAngle.current)
    const forwardZ = -Math.cos(yawAngle.current)
    const rightX = Math.cos(yawAngle.current)
    const rightZ = -Math.sin(yawAngle.current)

    const { pitch: terrainPitch, roll: terrainRoll, height: groundY } = getTerrainSlopeForVehicle(
      pos.current.x,
      pos.current.z,
      forwardX,
      forwardZ,
      rightX,
      rightZ,
      activeBiomeConfig.id
    )

    const targetRideHeight = isHoverMode ? 1.25 : 0.44
    const hoverFloatPulse = isHoverMode ? Math.sin(state.clock.getElapsedTime() * 2.2) * 0.03 : 0
    hoverAltitude.current = THREE.MathUtils.lerp(
      hoverAltitude.current,
      targetRideHeight + hoverFloatPulse,
      frameDelta * (isHoverMode ? 4.5 : 12)
    )
    pos.current.y = THREE.MathUtils.lerp(
      pos.current.y,
      groundY + hoverAltitude.current,
      frameDelta * (isHoverMode ? 9 : 20)
    )

    // Accumulated trip distance (km)
    addDistance((Math.abs(forwardVel.current) * frameDelta) / 1000)

    // Update root vehicle transform
    carGroupRef.current.position.set(pos.current.x, pos.current.y, pos.current.z)
    carGroupRef.current.rotation.y = yawAngle.current

    // Independent 4-Wheel Contact Suspension Tracking (FL, FR, RL, RR)
    const halfTrack = 0.88
    const halfBase = 1.35
    const cosYaw = Math.cos(yawAngle.current)
    const sinYaw = Math.sin(yawAngle.current)

    const wheelCorners = [
      [-halfTrack, -halfBase],
      [halfTrack, -halfBase],
      [-halfTrack, halfBase],
      [halfTrack, halfBase],
    ]

    wheelCorners.forEach(([lx, lz], idx) => {
      const wx = pos.current.x + lx * cosYaw + lz * sinYaw
      const wz = pos.current.z - lx * sinYaw + lz * cosYaw
      const wy = getTerrainHeight(wx, wz, activeBiomeConfig.id)
      const compression = wy - (pos.current.y - targetRideHeight)
      const clampedComp = Math.max(-0.18, Math.min(0.2, compression))
      wheelSuspensions.current[idx] = THREE.MathUtils.lerp(
        wheelSuspensions.current[idx],
        clampedComp,
        frameDelta * 18
      )
    })

    // Dynamic Pitch & Body Roll (Inertia + Suspension + Centrifugal Roll)
    const accelInertia = (currentThrottle.current - targetBrake) * 0.035
    const frontSusp = (wheelSuspensions.current[0] + wheelSuspensions.current[1]) * 0.5
    const rearSusp = (wheelSuspensions.current[2] + wheelSuspensions.current[3]) * 0.5
    const leftSusp = (wheelSuspensions.current[0] + wheelSuspensions.current[2]) * 0.5
    const rightSusp = (wheelSuspensions.current[1] + wheelSuspensions.current[3]) * 0.5

    const suspPitch = (frontSusp - rearSusp) * 0.35
    const suspRoll = (rightSusp - leftSusp) * 0.35

    bodyPitch.current = THREE.MathUtils.lerp(
      bodyPitch.current,
      terrainPitch + accelInertia + suspPitch,
      frameDelta * 8.5
    )

    const steerInertia = (isHoverMode ? steerInput * 0.22 : -steerInput * 0.09) * (currentSpeedKmh / 160)
    bodyRoll.current = THREE.MathUtils.lerp(
      bodyRoll.current,
      terrainRoll + steerInertia + suspRoll,
      frameDelta * 8.5
    )

    if (chassisMeshRef.current) {
      chassisMeshRef.current.rotation.x = bodyPitch.current
      chassisMeshRef.current.rotation.z = bodyRoll.current
    }

    // ------------------------------------------------------------------------
    // 5. Gearbox, RPM & Telemetry Simulation
    // ------------------------------------------------------------------------
    setSpeed(Math.round(currentSpeedKmh))

    let calculatedGear = '1'
    let calculatedRpm = 800

    if (forwardVel.current < -0.2) {
      calculatedGear = 'R'
      calculatedRpm = 1200 + Math.min(4500, Math.abs(currentSpeedKmh) * 160)
    } else if (currentSpeedKmh < 1.0) {
      calculatedGear = 'N'
      calculatedRpm = 800 + curThrottleAbs * 1400
    } else {
      const gearRatios = config.gearRatios
      for (let g = 0; g < gearRatios.length; g++) {
        if (currentSpeedKmh <= gearRatios[g] || g === gearRatios.length - 1) {
          calculatedGear = (g + 1).toString()
          const prevSpeed = g === 0 ? 0 : gearRatios[g - 1]
          const progress = (currentSpeedKmh - prevSpeed) / (gearRatios[g] - prevSpeed)
          calculatedRpm = 2200 + progress * 5400
          break
        }
      }
    }
    setGear(calculatedGear)
    setRpm(Math.min(8000, Math.max(800, calculatedRpm)))

    // Overrun exhaust pop detection & lateral slip factor
    const throttleDelta = curThrottleAbs - prevThrottleVal.current
    const isDecel = throttleDelta < -0.22 && calculatedRpm > 3500
    prevThrottleVal.current = curThrottleAbs

    const lateralSlip = Math.abs(lateralVel.current) / Math.max(2.5, Math.abs(forwardVel.current))

    // ------------------------------------------------------------------------
    // 6. Real-Time Layered Audio Ecosystem
    // ------------------------------------------------------------------------
    audioSystem.updateVehicleAudio({
      speedKmh: currentSpeedKmh,
      rpm: calculatedRpm,
      throttle: curThrottleAbs,
      isOffRoad: !onRoad,
      isHoverMode,
      vehicleModel,
      isDecelerating: isDecel,
      lateralSlip,
    })

    // ------------------------------------------------------------------------
    // 7. Dynamic Racing Camera with Speed-Dependent FOV & Vibration
    // ------------------------------------------------------------------------
    const carPos = pos.current
    const carQuat = carGroupRef.current.quaternion

    // Dynamic FOV: expands smoothly at high speed (from 60° up to 74°) for sensation of speed
    const persCam = state.camera as THREE.PerspectiveCamera
    if (persCam.isPerspectiveCamera) {
      const targetFov = 60 + Math.min(14, (currentSpeedKmh / config.maxSpeedKmh) * 14)
      if (Math.abs(persCam.fov - targetFov) > 0.05) {
        persCam.fov = THREE.MathUtils.lerp(persCam.fov, targetFov, frameDelta * 3.5)
        persCam.updateProjectionMatrix()
      }
    }

    if (cameraPerspective === 'chase') {
      const lookAhead = Math.min(16, forwardVel.current * 0.24)
      const idealOffset = new THREE.Vector3(0, 2.5, 6.6).applyQuaternion(carQuat).add(carPos)
      const idealLookAt = new THREE.Vector3(0, 0.9, -lookAhead).applyQuaternion(carQuat).add(carPos)

      // Subtle high-speed micro-vibration
      if (currentSpeedKmh > 75) {
        const vibe = (currentSpeedKmh / config.maxSpeedKmh) * (Math.random() - 0.5) * 0.016
        idealOffset.x += vibe
        idealOffset.y += vibe
      }

      state.camera.position.lerp(idealOffset, frameDelta * 7.5)
      state.camera.lookAt(idealLookAt)
    } else if (cameraPerspective === 'dashboard') {
      const idealOffset = new THREE.Vector3(0, 0.88, -0.15).applyQuaternion(carQuat).add(carPos)
      const idealLookAt = new THREE.Vector3(0, 0.88, -30).applyQuaternion(carQuat).add(carPos)

      state.camera.position.lerp(idealOffset, frameDelta * 14)
      state.camera.lookAt(idealLookAt)
    } else if (cameraPerspective === 'bumper') {
      const idealOffset = new THREE.Vector3(0, 0.35, -2.25).applyQuaternion(carQuat).add(carPos)
      const idealLookAt = new THREE.Vector3(0, 0.35, -35).applyQuaternion(carQuat).add(carPos)

      state.camera.position.lerp(idealOffset, frameDelta * 16)
      state.camera.lookAt(idealLookAt)
    } else if (cameraPerspective === 'drone') {
      const time = state.clock.getElapsedTime() * 0.22
      const lateralShift = Math.sin(time) * 5.0
      const idealOffset = new THREE.Vector3(lateralShift, 6.5, 13.5).applyQuaternion(carQuat).add(carPos)
      const idealLookAt = new THREE.Vector3(0, 0.8, -4).applyQuaternion(carQuat).add(carPos)

      state.camera.position.lerp(idealOffset, frameDelta * 3.5)
      state.camera.lookAt(idealLookAt)
    }
  })

  return (
    <group ref={carGroupRef}>
      <group ref={chassisMeshRef}>
        <ActiveCarModel
          type={vehicleModel}
          paintColor={paintColor}
          metallic={metallic}
          roughness={roughness}
          steeringAngle={steeringVisual.current}
          wheelRotation={wheelSpin.current}
          isBraking={useGameStore.getState().brake > 0}
          headlightsOn={headlights}
          isHoverMode={isHoverMode}
          wheelSuspensions={wheelSuspensions.current}
        />
      </group>
    </group>
  )
}
