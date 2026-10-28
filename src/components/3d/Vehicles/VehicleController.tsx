import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore, useTelemetryStore, VehicleModelType, CameraPerspectiveType } from '../../../store/useGameStore'
import { ActiveCarModel } from './CarModels'
import {
  getRoadCenter,
  getRoadElevation,
  isRoadSurface,
  getActiveBiomeAt,
  getSurfaceHeight,
  getTerrainSlopeForVehicle,
} from '../../../utils/roadMath'
import { audioSystem } from '../../../utils/audioSystem'

export interface VehicleConfig {
  name: string
  massKg: number
  wheelRadius: number
  rideHeight: number
  wheelbase: number // Distance between front and rear axles (m)
  maxSteerAngle: number // Maximum front wheel steer lock (rad)
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
  gearRatios: number[] // Max speed km/h per forward gear
  idleRpm: number
  redlineRpm: number
  upshiftRpm: number
  downshiftRpm: number
  engineBraking: number
  drivetrain: 'rwd' | 'fwd' | 'awd'
}

export const VEHICLE_CONFIGS: Record<VehicleModelType, VehicleConfig> = {
  bmw_m3: {
    name: "BMW M3 GTR '05",
    massKg: 1350,
    wheelRadius: 0.34, // Exactly calibrated to 0.34m visual radius of tuner_wheel.glb
    rideHeight: 0.36,  // GT stance, 11.6cm front splitter clearance, perfect asphalt alignment
    wheelbase: 2.73,   // Authentic BMW M3 E46 2,731mm racing wheelbase
    maxSteerAngle: 0.40, // ~23° maximum lock
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
    idleRpm: 850,
    redlineRpm: 8500,
    upshiftRpm: 7200,
    downshiftRpm: 2400,
    engineBraking: 0.18,
    drivetrain: 'rwd',
  },
  supercar: {
    name: 'Modern Supercar',
    massKg: 1420,
    wheelRadius: 0.36,
    rideHeight: 0.38,
    wheelbase: 2.65,
    maxSteerAngle: 0.38,
    maxSpeedMs: 78.5, // ~282 km/h
    maxSpeedKmh: 282,
    peakAccel: 7.2, // Twin-turbo V8 power curve
    brakeDecel: 30,
    dragCoeff: 0.30,
    downforceCoeff: 0.50,
    turnRate: 1.45,
    tireGrip: 1.20,
    roadDamping: 0.995,
    offroadDamping: 0.985,
    gearRatios: [52, 98, 155, 208, 252, 282],
    idleRpm: 900,
    redlineRpm: 8800,
    upshiftRpm: 7500,
    downshiftRpm: 2500,
    engineBraking: 0.19,
    drivetrain: 'rwd',
  },
  hovercraft: {
    name: 'Antigravity Hovercraft',
    massKg: 980,
    wheelRadius: 0.32,
    rideHeight: 1.25,
    wheelbase: 2.80,
    maxSteerAngle: 0.35,
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
    gearRatios: [310],
    idleRpm: 1000,
    redlineRpm: 9000,
    upshiftRpm: 9999,
    downshiftRpm: 0,
    engineBraking: 0.05,
    drivetrain: 'awd',
  },
  camper: {
    name: 'Cozy Camper Van',
    massKg: 1950,
    wheelRadius: 0.38,
    rideHeight: 0.48,
    wheelbase: 2.60,
    maxSteerAngle: 0.44,
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
    gearRatios: [34, 68, 108, 145],
    idleRpm: 750,
    redlineRpm: 4800,
    upshiftRpm: 3900,
    downshiftRpm: 1700,
    engineBraking: 0.14,
    drivetrain: 'rwd',
  },
  hatchback: {
    name: 'Rally Spec Hatchback',
    massKg: 1120,
    wheelRadius: 0.34,
    rideHeight: 0.38,
    wheelbase: 2.30,
    maxSteerAngle: 0.42,
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
    gearRatios: [42, 84, 130, 178, 225],
    idleRpm: 950,
    redlineRpm: 7600,
    upshiftRpm: 6800,
    downshiftRpm: 2600,
    engineBraking: 0.20,
    drivetrain: 'fwd',
  },
}

const _tempCamOffset = new THREE.Vector3()
const _tempCamLookAt = new THREE.Vector3()
const _tempCamForward = new THREE.Vector3()
const _tempParticleColor = new THREE.Color()
const _wheelWorldPos = new THREE.Vector3()
const _particleDummy = new THREE.Object3D()
const _particleGeo = new THREE.PlaneGeometry(0.42, 0.42)

const PARTICLE_COUNT = 40

// Offscreen canvas-generated soft circular radial gradient for tire smoke / snow / dust particles
function createTireParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.88)')
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.42)')
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, 64)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

const _particleTexture = typeof document !== 'undefined' ? createTireParticleTexture() : new THREE.Texture()
const _particleMaterial = new THREE.MeshBasicMaterial({
  map: _particleTexture,
  transparent: true,
  opacity: 0.58,
  depthWrite: false,
  blending: THREE.NormalBlending,
})

const _wheelCorners: [number, number][] = [
  [-0.83, -1.48], // Front-Left (aligned with wheel arch)
  [0.83, -1.48],  // Front-Right (aligned with wheel arch)
  [-0.83, 1.18],  // Rear-Left (aligned with rear arch)
  [0.83, 1.18],   // Rear-Right (aligned with rear arch)
]

// ------------------------------------------------------------------------
// Dynamic Tire Skid Mark Mesh & Material Architecture
// ------------------------------------------------------------------------
const MAX_SKID_QUADS = 160
const _skidGeo = new THREE.BufferGeometry()
const _skidPositions = new Float32Array(MAX_SKID_QUADS * 4 * 3)
const _skidUvs = new Float32Array(MAX_SKID_QUADS * 4 * 2)
const _skidIndices: number[] = []

for (let i = 0; i < MAX_SKID_QUADS; i++) {
  const base = i * 4
  _skidIndices.push(base, base + 1, base + 2)
  _skidIndices.push(base + 1, base + 3, base + 2)

  _skidUvs[base * 2] = 0
  _skidUvs[base * 2 + 1] = 0
  _skidUvs[(base + 1) * 2] = 1
  _skidUvs[(base + 1) * 2 + 1] = 0
  _skidUvs[(base + 2) * 2] = 0
  _skidUvs[(base + 2) * 2 + 1] = 1
  _skidUvs[(base + 3) * 2] = 1
  _skidUvs[(base + 3) * 2 + 1] = 1
}

_skidGeo.setAttribute('position', new THREE.BufferAttribute(_skidPositions, 3))
_skidGeo.setAttribute('uv', new THREE.BufferAttribute(_skidUvs, 2))
_skidGeo.setIndex(_skidIndices)
_skidGeo.setDrawRange(0, 0)

function createSkidMarkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 32, 0)
    grad.addColorStop(0, 'rgba(12, 12, 15, 0)')
    grad.addColorStop(0.2, 'rgba(12, 12, 15, 0.72)')
    grad.addColorStop(0.5, 'rgba(15, 15, 18, 0.88)')
    grad.addColorStop(0.8, 'rgba(12, 12, 15, 0.72)')
    grad.addColorStop(1, 'rgba(12, 12, 15, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 32, 64)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

const _skidTexture = typeof document !== 'undefined' ? createSkidMarkTexture() : new THREE.Texture()
const _skidMaterial = new THREE.MeshBasicMaterial({
  map: _skidTexture,
  transparent: true,
  opacity: 0.72,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
})

const _tempSkidL1 = new THREE.Vector3()
const _tempSkidR1 = new THREE.Vector3()

export default function VehicleController() {
  const carGroupRef = useRef<THREE.Group>(null)
  const chassisMeshRef = useRef<THREE.Group>(null)
  const cameraLookAtRef = useRef(new THREE.Vector3(0, 0.9, -10))
  const isFirstCamFrameRef = useRef(true)
  const prevCamModeRef = useRef<CameraPerspectiveType>('chase')
  const [, getKeys] = useKeyboardControls()

  // Discrete Zustand selectors to prevent 60fps React Fiber re-renders of the 3D car tree
  const vehicleModel = useGameStore((s) => s.vehicleModel)
  const paintColor = useGameStore((s) => s.paintColor)
  const metallic = useGameStore((s) => s.metallic)
  const roughness = useGameStore((s) => s.roughness)
  const biome = useGameStore((s) => s.biome)
  const isHoverMode = useGameStore((s) => s.isHoverMode)
  const cameraPerspective = useGameStore((s) => s.cameraPerspective)
  const headlights = useGameStore((s) => s.headlights)
  const photoMode = useGameStore((s) => s.photoMode)

  const config = VEHICLE_CONFIGS[vehicleModel] || VEHICLE_CONFIGS.bmw_m3

  // State Variables - initialized on the road at Z=0 with calibrated ride height
  const initialSpawnY = getRoadElevation(0) + (isHoverMode ? 1.25 : config.rideHeight)
  const initialSpawnX = getRoadCenter(0)
  const pos = useRef(new THREE.Vector3(initialSpawnX, initialSpawnY, 0))
  const forwardVel = useRef(0) // meters per second
  const lateralVel = useRef(0) // drift velocity (m/s)
  const yawAngle = useRef(0) // radians
  const currentSteerAngle = useRef(0) // dynamic smoothed steering angle (radians)
  const steeringVisual = useRef(0)
  const wheelSpin = useRef(0)
  const bodyRoll = useRef(0)
  const bodyPitch = useRef(0)
  const currentThrottle = useRef(0)
  const hoverAltitude = useRef(isHoverMode ? 1.25 : config.rideHeight)
  const wheelSuspensions = useRef<[number, number, number, number]>([0, 0, 0, 0])
  const prevThrottleVal = useRef(0)

  // Dynamic Tire Skid Mark Tracking Refs
  const skidQuadCount = useRef(0)
  const skidRingIndex = useRef(0)
  const prevSkidL = useRef<THREE.Vector3 | null>(null)
  const prevSkidR = useRef<THREE.Vector3 | null>(null)
  const isBurnoutActiveRef = useRef(false)

  // Tire Particle System Ref & Pool (Snow flurries, tire smoke & off-road dust)
  const tireParticleMeshRef = useRef<THREE.InstancedMesh>(null)
  const particlePool = useRef<
    Array<{
      pos: THREE.Vector3
      vel: THREE.Vector3
      life: number
      maxLife: number
      size: number
      color: THREE.Color
      active: boolean
    }>
  >(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      pos: new THREE.Vector3(0, -999, 0),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0.8,
      size: 0.35,
      color: new THREE.Color('#ffffff'),
      active: false,
    }))
  )
  const particleSpawnCounter = useRef(0)

  // Telemetry throttling and biome change tracking
  const prevResolvedBiome = useRef<string>('')
  const telemetryCounter = useRef(0)
  const accumulatedDistance = useRef(useGameStore.getState().distance)

  // Fixed timestep physics accumulator (120 Hz fixed substepping)
  const physicsAccumulator = useRef(0)
  const FIXED_DT = 1 / 120

  // Transmission simulation state (Auto by default with Left Shift upshift / Right Shift downshift manual overrides)
  const currentGearIndex = useRef(1)
  const manualOverrideTimer = useRef(0)
  const shiftCutTimer = useRef(0)
  const smoothedRpm = useRef(config.idleRpm)

  // Vehicle Audio Engine Lifecycle: Initialize Web Audio API and cleanup on unmount
  useEffect(() => {
    audioSystem.init()
    return () => {
      audioSystem.cleanup()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (isHoverMode || vehicleModel === 'hovercraft') return

      const maxGears = config.gearRatios.length

      // Left Shift: Request Upshift
      if (e.code === 'ShiftLeft') {
        if (currentGearIndex.current < maxGears) {
          const nextGearMinSpeed =
            currentGearIndex.current === 1 ? 6 : config.gearRatios[currentGearIndex.current - 2] * 0.35
          if (Math.abs(forwardVel.current) * 3.6 >= nextGearMinSpeed) {
            currentGearIndex.current++
            manualOverrideTimer.current = 4.5
            shiftCutTimer.current = 0.12
            useGameStore.getState().setTransmissionMode('manual')
            audioSystem.triggerGearShift(vehicleModel, false)
          }
        }
      }
      // Right Shift: Request Downshift
      else if (e.code === 'ShiftRight') {
        if (currentGearIndex.current > 1) {
          const prevGearMaxSpeed = config.gearRatios[currentGearIndex.current - 2]
          const curSpeedKmh = Math.abs(forwardVel.current) * 3.6
          // Safety lockout: prevent mechanical over-rev
          if (curSpeedKmh <= prevGearMaxSpeed * 1.08) {
            currentGearIndex.current--
            manualOverrideTimer.current = 4.5
            shiftCutTimer.current = 0.10
            useGameStore.getState().setTransmissionMode('manual')
            audioSystem.triggerGearShift(vehicleModel, true)
          }
        }
      }
      // R Key: Instant Vehicle Reset / Respawn on Centerline
      else if (e.code === 'KeyR') {
        const curZ = pos.current.z
        pos.current.x = getRoadCenter(curZ)
        pos.current.y = getRoadElevation(curZ) + (isHoverMode ? 1.25 : config.rideHeight)
        forwardVel.current = 0
        lateralVel.current = 0
        yawAngle.current = 0
        currentSteerAngle.current = 0
        wheelSpin.current = 0
        steeringVisual.current = 0
        currentGearIndex.current = 1
        isFirstCamFrameRef.current = true
        skidQuadCount.current = 0
        skidRingIndex.current = 0
        prevSkidL.current = null
        prevSkidR.current = null
        _skidGeo.setDrawRange(0, 0)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isHoverMode, vehicleModel, config])

  useFrame((state, delta) => {
    if (!carGroupRef.current || photoMode) return

    const frameDelta = Math.min(delta, 0.08)
    const keys = getKeys()
    const store = useGameStore.getState()

    // 1. Resolve active biome at current Z position without thrashing store if unchanged
    const activeBiomeConfig = getActiveBiomeAt(pos.current.z, biome)
    if (prevResolvedBiome.current !== activeBiomeConfig.id) {
      prevResolvedBiome.current = activeBiomeConfig.id
      store.setCurrentResolvedBiome(activeBiomeConfig.id)
    }

    // 2. User Controls & Input Processing
    const absVel = Math.abs(forwardVel.current)
    const isHover = isHoverMode || vehicleModel === 'hovercraft'
    const burnoutKey = Boolean((keys as any).burnout) || store.virtualBurnout
    // Burnout pedal combo: holding Brake + Throttle simultaneously at low speeds (< 8 m/s = 28.8 km/h)
    const pedalBurnout =
      (Boolean(keys.brake) || store.virtualBrake) &&
      (Boolean(keys.forward) || store.virtualThrottle) &&
      absVel < 8.0
    const isBurnoutActive = !isHover && (burnoutKey || pedalBurnout)
    isBurnoutActiveRef.current = isBurnoutActive

    if (store.isBurnout !== isBurnoutActive) {
      store.setIsBurnout(isBurnoutActive)
    }

    let targetThrottle = 0
    let targetBrake = 0
    let steerInput = 0

    if (store.autoDrive) {
      // Relaxing cruising along the highway centerline with dynamic curve look-ahead
      const targetCruise = 26 // m/s (~94 km/h)
      if (forwardVel.current < targetCruise) targetThrottle = 0.55
      else targetThrottle = 0.06

      const roadX = getRoadCenter(pos.current.z)
      const lookAheadDist = Math.max(16, Math.min(32, Math.abs(forwardVel.current) * 0.95))
      const lookAheadRoadX = getRoadCenter(pos.current.z - lookAheadDist)
      const errorX = pos.current.x - roadX
      const curveAhead = lookAheadRoadX - roadX

      const autoSteer = THREE.MathUtils.clamp(errorX * 0.16 - curveAhead * 0.12, -0.75, 0.75)
      steerInput = autoSteer
    } else if (isBurnoutActive) {
      // BURNOUT MODE: Pegged throttle to redline!
      targetThrottle = 1.0
      // Line-lock: if brake is pressed or triggered via pedal combo, hold vehicle stationary; otherwise roll launch
      const isHoldingBrake = Boolean(keys.brake) || store.virtualBrake || (!burnoutKey && pedalBurnout)
      targetBrake = isHoldingBrake ? 0.95 : 0.0

      if (keys.left || store.virtualSteerLeft) steerInput += 1
      if (keys.right || store.virtualSteerRight) steerInput -= 1
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
      const shiftPowerMul = shiftCutTimer.current > 0 ? 0.18 : 1.0

      if (currentThrottle.current > 0) {
        const burnoutAccelMul = isBurnoutActive ? 0.35 : 1.0
        forwardVel.current += (currentThrottle.current * accel * shiftPowerMul * burnoutAccelMul + slopeGravity - aeroDrag) * dt
        if (forwardVel.current > config.maxSpeedMs) forwardVel.current = config.maxSpeedMs
      } else if (currentThrottle.current < 0) {
        forwardVel.current += (currentThrottle.current * (config.peakAccel * 0.45) + slopeGravity) * dt
        if (forwardVel.current < -12) forwardVel.current = -12
      } else {
        // Natural engine braking in lower gears
        const curGear = currentGearIndex.current
        const maxGear = config.gearRatios.length
        const gearBrakingRatio = Math.max(0, 1 - (curGear - 1) / maxGear)
        const engineBrake = !isHoverMode && forwardVel.current > 1.5 ? config.engineBraking * gearBrakingRatio * 3.8 : 0
        forwardVel.current += (slopeGravity - Math.sign(forwardVel.current) * aeroDrag - engineBrake) * dt
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

      // Burnout line lock holding stationary vehicle
      if (isBurnoutActive && targetBrake > 0.5) {
        forwardVel.current *= Math.pow(0.55, dt * 60)
      }

      // Natural Rolling Resistance, Braking Hold & Static Friction Clamping
      if (targetThrottle === 0) {
        if (targetBrake > 0) {
          if (Math.abs(forwardVel.current) < 0.35) {
            forwardVel.current = 0
            lateralVel.current = 0
          }
        } else if (Math.abs(forwardVel.current) < 0.08) {
          forwardVel.current = 0
          lateralVel.current = 0
        }
        forwardVel.current *= Math.pow(effectiveDamping, dt * 60)
      }

      // Dynamic Speed-Sensitive Steering Angle & Physical Rack Rate Limiting
      const currentSpeedKmh = Math.abs(forwardVel.current) * 3.6
      const speedSteerFactor = Math.max(0.18, 1.0 / (1.0 + Math.pow(currentSpeedKmh / 52.0, 0.95)))
      const targetSteerAngle = steerInput * config.maxSteerAngle * speedSteerFactor
      currentSteerAngle.current = THREE.MathUtils.lerp(currentSteerAngle.current, targetSteerAngle, dt * 14)

      // Chassis Rotation: Kinematic Bicycle Model & Lateral Dynamic Traction
      if (isHoverMode || vehicleModel === 'hovercraft') {
        // Antigravity Thruster Vectoring & Air Cushion Drift
        const hoverSpeedFactor = Math.max(0.38, 1.0 - (currentSpeedKmh / 320) * 0.45)
        yawAngle.current += steerInput * config.turnRate * hoverSpeedFactor * dt

        const targetLateral = -steerInput * Math.min(16, (currentSpeedKmh / 110) * 6.5)
        lateralVel.current = THREE.MathUtils.lerp(lateralVel.current, targetLateral, dt * 3.2)
        lateralVel.current *= Math.pow(0.985, dt * 60)
      } else {
        // Ground Vehicles: Yaw rate is strictly derived from forward movement and steer angle!
        // When stationary (v == 0), yaw rate is MATHEMATICALLY ZERO!
        const steerAngle = currentSteerAngle.current
        const absVel = Math.abs(forwardVel.current)

        if (absVel > 0.08) {
          // Kinematic bicycle yaw rate: omega = (v / L) * tan(delta)
          const kinematicYawRate = (forwardVel.current / config.wheelbase) * Math.tan(steerAngle)

          // Maximum lateral centripetal acceleration supported by tire friction & aerodynamic downforce
          const baseFriction = activeBiomeConfig.friction ?? 1.0
          const surfaceGrip =
            (onRoad
              ? baseFriction
              : activeBiomeConfig.id === 'tundra' || activeBiomeConfig.id === 'twisted_mountains'
              ? 0.65
              : 0.80) * (isBurnoutActive ? 0.30 : 1.0)
          const aeroDownforce = config.downforceCoeff * Math.min(1.4, Math.pow(absVel / config.maxSpeedMs, 2))
          const maxLatAccel = config.tireGrip * 9.81 * (1.0 + aeroDownforce) * surfaceGrip

          // Adhesion yaw rate limit before front tire scrub / drift
          const maxYawRate = maxLatAccel / (absVel + 0.001)

          let actualYawRate = kinematicYawRate
          if (Math.abs(kinematicYawRate) > maxYawRate) {
            // Tire adhesion limit exceeded: break into controlled progressive drift
            actualYawRate = Math.sign(kinematicYawRate) * maxYawRate
            const excessDemand = Math.abs(kinematicYawRate * forwardVel.current) - maxLatAccel
            lateralVel.current += -Math.sign(steerAngle) * excessDemand * 0.28 * dt
          }

          yawAngle.current += actualYawRate * dt
          // Tire lateral scrub damping
          lateralVel.current *= Math.pow(0.72, dt * 60)
        } else {
          // Vehicle is at rest: complete damping of any lateral slide
          lateralVel.current = 0
        }
      }

      // Advance 3D World Position
      pos.current.x += (forwardX * forwardVel.current + rightX * lateralVel.current) * dt
      pos.current.z += (forwardZ * forwardVel.current + rightZ * lateralVel.current) * dt

      // Out-of-bounds safety net: if vehicle is thrown far off terrain or falls into void
      const roadCx = getRoadCenter(pos.current.z)
      if (pos.current.y < -35 || Math.abs(pos.current.x - roadCx) > 130) {
        pos.current.x = roadCx
        pos.current.y = getRoadElevation(pos.current.z) + (isHoverMode ? 1.25 : config.rideHeight)
        forwardVel.current = 0
        lateralVel.current = 0
        yawAngle.current = 0
        currentSteerAngle.current = 0
        wheelSpin.current = 0
        isFirstCamFrameRef.current = true
      }
    }

    // ------------------------------------------------------------------------
    // 4. Ground Alignment, Suspension & Dynamic Chassis Roll
    // ------------------------------------------------------------------------
    const currentSpeedKmh = Math.abs(forwardVel.current) * 3.6
    steeringVisual.current = currentSteerAngle.current
    if (isBurnoutActive) {
      // Driven wheels spin at redline speed during burnout (~80-100 rad/s)
      const redlineWheelSpin = ((config.redlineRpm * 0.96) / 60) * Math.PI * 2 * 0.18
      wheelSpin.current += redlineWheelSpin * frameDelta
    } else {
      wheelSpin.current += (forwardVel.current / config.wheelRadius) * frameDelta
    }

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

    const targetRideHeight = isHoverMode ? 1.25 : config.rideHeight
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
    accumulatedDistance.current += (Math.abs(forwardVel.current) * frameDelta) / 1000

    // Update root vehicle transform
    carGroupRef.current.position.set(pos.current.x, pos.current.y, pos.current.z)
    carGroupRef.current.rotation.y = yawAngle.current

    // Independent 4-Wheel Contact Suspension Tracking (FL, FR, RL, RR) using static offsets
    const cosYaw = Math.cos(yawAngle.current)
    const sinYaw = Math.sin(yawAngle.current)

    if (isHoverMode) {
      wheelSuspensions.current = [0, 0, 0, 0]
    } else {
      _wheelCorners.forEach(([lx, lz], idx) => {
        const wx = pos.current.x + lx * cosYaw + lz * sinYaw
        const wz = pos.current.z - lx * sinYaw + lz * cosYaw
        const wy = getSurfaceHeight(wx, wz, activeBiomeConfig.id)
        const compression = wy - (pos.current.y - targetRideHeight)
        const clampedComp = Math.max(-0.06, Math.min(0.06, compression))
        wheelSuspensions.current[idx] = THREE.MathUtils.lerp(
          wheelSuspensions.current[idx],
          clampedComp,
          frameDelta * 18
        )
      })
    }

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
    // 5. Automatic Transmission with Manual Shift Overrides & RPM Simulation
    // ------------------------------------------------------------------------

    // Update shift timers
    if (manualOverrideTimer.current > 0) {
      manualOverrideTimer.current -= frameDelta
      if (manualOverrideTimer.current <= 0) {
        useGameStore.getState().setTransmissionMode('auto')
      }
    }
    if (shiftCutTimer.current > 0) {
      shiftCutTimer.current -= frameDelta
    }

    let calculatedGear = '1'
    let targetRpm = config.idleRpm
    const maxGears = config.gearRatios.length

    if (isHoverMode || vehicleModel === 'hovercraft') {
      calculatedGear = 'HOV'
      const speedNormHover = Math.min(1.0, currentSpeedKmh / config.maxSpeedKmh)
      targetRpm = config.idleRpm + speedNormHover * (config.redlineRpm - config.idleRpm)
    } else if (isBurnoutActive) {
      // Burnout: Locked in 1st gear bouncing on the rev limiter!
      calculatedGear = '1'
      const limiterBounce = Math.sin(state.clock.elapsedTime * 52) * 180
      targetRpm = config.redlineRpm - 200 + limiterBounce
      smoothedRpm.current = targetRpm
    } else if (forwardVel.current < -0.3) {
      calculatedGear = 'R'
      targetRpm = config.idleRpm + Math.min(3600, Math.abs(currentSpeedKmh) * 140)
    } else if (currentSpeedKmh < 1.2 && curThrottleAbs < 0.1) {
      calculatedGear = 'N'
      targetRpm = config.idleRpm
    } else {
      // Automatic Transmission: selects gear smoothly according to throttle load & RPM
      if (manualOverrideTimer.current <= 0) {
        const curGear = currentGearIndex.current
        const upshiftThresh = THREE.MathUtils.lerp(
          config.downshiftRpm + 900,
          config.upshiftRpm,
          curThrottleAbs
        )

        const gearTopSpeed = config.gearRatios[curGear - 1]
        const prevGearTopSpeed = curGear > 1 ? config.gearRatios[curGear - 2] : 0
        const progressInGear =
          (currentSpeedKmh - prevGearTopSpeed * 0.45) / Math.max(1, gearTopSpeed - prevGearTopSpeed * 0.45)
        const estRpm = config.idleRpm + progressInGear * (config.redlineRpm - config.idleRpm)

        // Automatic Upshift
        if (estRpm > upshiftThresh && curGear < maxGears && currentSpeedKmh > 12) {
          currentGearIndex.current++
          shiftCutTimer.current = 0.11
          audioSystem.triggerGearShift(vehicleModel, false)
        }
        // Automatic Downshift
        else if (estRpm < config.downshiftRpm && curGear > 1) {
          currentGearIndex.current--
          shiftCutTimer.current = 0.08
          audioSystem.triggerGearShift(vehicleModel, true)
        }
      } else {
        // Manual Override Mode: player controls gears via Left Shift / Right Shift
        const curGear = currentGearIndex.current
        const prevGearTopSpeed = curGear > 1 ? config.gearRatios[curGear - 2] : 0
        const gearTopSpeed = config.gearRatios[curGear - 1]
        const progressInGear =
          (currentSpeedKmh - prevGearTopSpeed * 0.45) / Math.max(1, gearTopSpeed - prevGearTopSpeed * 0.45)
        const estRpm = config.idleRpm + progressInGear * (config.redlineRpm - config.idleRpm)

        // Safety lockout: auto-downshift to prevent stall
        if (estRpm < config.idleRpm - 100 && curGear > 1) {
          currentGearIndex.current--
        }
        // Safety lockout: auto-upshift at absolute redline
        else if (estRpm > config.redlineRpm + 150 && curGear < maxGears) {
          currentGearIndex.current++
        }
      }

      const activeGear = currentGearIndex.current
      calculatedGear = activeGear.toString()

      const prevSpeed = activeGear > 1 ? config.gearRatios[activeGear - 2] : 0
      const gearTop = config.gearRatios[activeGear - 1]
      const speedNormInGear = Math.max(
        0,
        Math.min(1.05, (currentSpeedKmh - prevSpeed * 0.4) / Math.max(1, gearTop - prevSpeed * 0.4))
      )

      targetRpm = config.idleRpm + speedNormInGear * (config.redlineRpm - config.idleRpm)
      if (curThrottleAbs > 0.05) {
        targetRpm += curThrottleAbs * 380
      }
      if (shiftCutTimer.current > 0) {
        targetRpm -= 450 // Shift cut clutch dip
      }
    }

    smoothedRpm.current = THREE.MathUtils.lerp(smoothedRpm.current, targetRpm, frameDelta * 12)
    const finalRpm = Math.max(config.idleRpm, Math.min(config.redlineRpm, Math.round(smoothedRpm.current)))

    // Overrun exhaust pop detection & lateral slip factor
    const throttleDelta = curThrottleAbs - prevThrottleVal.current
    const isDecel = throttleDelta < -0.22 && finalRpm > 3500
    prevThrottleVal.current = curThrottleAbs

    const lateralSlip = Math.abs(lateralVel.current) / Math.max(2.5, Math.abs(forwardVel.current))

    // ------------------------------------------------------------------------
    // 6. Real-Time Layered Audio Ecosystem & Dynamic Telemetry
    // ------------------------------------------------------------------------
    // Dynamic 3D Spatial Audio Tracking (Engine & Exhaust follow car in camera space)
    state.camera.getWorldDirection(_tempCamForward)
    audioSystem.updateSpatialPosition(pos.current, state.camera.position, _tempCamForward)

    audioSystem.updateVehicleAudio({
      speedKmh: currentSpeedKmh,
      rpm: finalRpm,
      throttle: isBurnoutActive ? 1.0 : curThrottleAbs,
      isOffRoad: !onRoad,
      isHoverMode,
      vehicleModel,
      isDecelerating: isDecel,
      lateralSlip: isBurnoutActive ? 1.0 : lateralSlip,
      isBurnout: isBurnoutActive,
    })

    // Decoupled Telemetry Dispatch (throttled to 20-30Hz, zero 3D Fiber tree re-renders)
    telemetryCounter.current++
    if (telemetryCounter.current % 3 === 0) {
      useTelemetryStore.getState().setTelemetry({
        speed: Math.round(currentSpeedKmh),
        rpm: finalRpm,
        gear: calculatedGear,
        throttle: curThrottleAbs,
        brake: targetBrake,
        distance: accumulatedDistance.current,
      })
    }

    // ------------------------------------------------------------------------
    // 7. Dynamic Tire Particles (Snow Spray Flurries, Drift Smoke & Terrain Dust)
    // ------------------------------------------------------------------------
    const carPos = pos.current
    const carQuat = carGroupRef.current.quaternion

    particleSpawnCounter.current++
    const isSnowyRegion = activeBiomeConfig.id === 'twisted_mountains' || activeBiomeConfig.id === 'tundra'
    const isDrifting = Math.abs(lateralVel.current) > 1.15 || (targetBrake > 0.3 && absVel > 6.0)
    const isOffroadDust = !onRoad && absVel > 3.0
    const drivenZ = config.drivetrain === 'fwd' ? -1.48 : 1.18
    const isBurnoutSmoke = isBurnoutActive && onRoad

    if (
      !isHoverMode &&
      vehicleModel !== 'hovercraft' &&
      (absVel > 2.5 || isBurnoutSmoke) &&
      (isBurnoutSmoke || isSnowyRegion || isDrifting || isOffroadDust) &&
      (isBurnoutSmoke || particleSpawnCounter.current % 2 === 0)
    ) {
      // Find inactive or oldest particle
      let bestP = particlePool.current[0]
      let maxLifeNorm = -1
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particlePool.current[i]
        if (!p.active) {
          bestP = p
          break
        }
        const norm = p.life / p.maxLife
        if (norm > maxLifeNorm) {
          maxLifeNorm = norm
          bestP = p
        }
      }

      // Spawn at driven wheel contact patch in world coordinates
      const isRightWheel = Math.random() > 0.5
      const wheelLocalX = isRightWheel ? 0.78 : -0.78
      const wheelLocalY = -config.rideHeight + 0.08
      const wheelLocalZ = drivenZ

      _wheelWorldPos.set(wheelLocalX, wheelLocalY, wheelLocalZ).applyQuaternion(carQuat).add(carPos)
      bestP.pos.copy(_wheelWorldPos)
      bestP.active = true
      bestP.life = 0

      if (isBurnoutSmoke) {
        // High density billowing burnout smoke clouds
        bestP.maxLife = 1.15
        bestP.size = 0.65
        bestP.color.set('#f8fafc')
        bestP.vel.set(
          (Math.random() - 0.5) * 1.6 + lateralVel.current * 0.2,
          Math.random() * 1.4 + 0.6,
          -forwardVel.current * 0.1 + (Math.random() - 0.5) * 0.9
        )
      } else if (isDrifting) {
        // High density tire drift smoke
        bestP.maxLife = 0.85
        bestP.size = 0.42
        bestP.color.set('#f1f5f9')
        bestP.vel.set(
          (Math.random() - 0.5) * 1.2 + lateralVel.current * 0.25,
          Math.random() * 0.9 + 0.3,
          -forwardVel.current * 0.12 + (Math.random() - 0.5) * 0.8
        )
      } else if (isSnowyRegion) {
        // Crisp snow spray flurries behind wheels
        bestP.maxLife = 0.65
        bestP.size = 0.32
        bestP.color.set('#e2e8f0')
        bestP.vel.set(
          (Math.random() - 0.5) * 0.9,
          Math.random() * 1.1 + 0.4,
          -forwardVel.current * 0.16 + (Math.random() - 0.5) * 0.6
        )
      } else {
        // Off-road loose terrain dust
        bestP.maxLife = 0.75
        bestP.size = 0.45
        bestP.color.set(activeBiomeConfig.id === 'desert' ? '#d4a373' : '#8d7b68')
        bestP.vel.set(
          (Math.random() - 0.5) * 1.0,
          Math.random() * 0.7 + 0.2,
          -forwardVel.current * 0.14 + (Math.random() - 0.5) * 0.6
        )
      }
    }

    // Update active particle instances
    if (tireParticleMeshRef.current) {
      const pMesh = tireParticleMeshRef.current
      if (!pMesh.instanceColor) {
        pMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3)
      }

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particlePool.current[i]
        if (!p.active) {
          _particleDummy.position.set(0, -999, 0)
          _particleDummy.scale.set(0, 0, 0)
          _particleDummy.updateMatrix()
          pMesh.setMatrixAt(i, _particleDummy.matrix)
          continue
        }

        p.life += frameDelta
        if (p.life >= p.maxLife) {
          p.active = false
          _particleDummy.position.set(0, -999, 0)
          _particleDummy.scale.set(0, 0, 0)
          _particleDummy.updateMatrix()
          pMesh.setMatrixAt(i, _particleDummy.matrix)
          continue
        }

        p.pos.addScaledVector(p.vel, frameDelta)
        p.vel.y += 0.25 * frameDelta
        p.vel.x *= 0.94
        p.vel.z *= 0.94

        const progress = p.life / p.maxLife
        const currentScale = p.size * (1.0 + progress * 1.8)

        _particleDummy.position.copy(p.pos)
        _particleDummy.quaternion.copy(state.camera.quaternion)
        _particleDummy.scale.set(currentScale, currentScale, currentScale)
        _particleDummy.updateMatrix()
        pMesh.setMatrixAt(i, _particleDummy.matrix)

        _tempParticleColor.copy(p.color).multiplyScalar(Math.max(0, 1.0 - progress * 0.75))
        pMesh.setColorAt(i, _tempParticleColor)
      }

      pMesh.instanceMatrix.needsUpdate = true
      if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true
    }

    // ------------------------------------------------------------------------
    // 7.5 Dynamic Tire Skid Marks on Asphalt
    // ------------------------------------------------------------------------
    const shouldSkid =
      !isHoverMode &&
      vehicleModel !== 'hovercraft' &&
      onRoad &&
      (isBurnoutActive || Math.abs(lateralVel.current) > 1.2 || (targetBrake > 0.4 && absVel > 5.0))

    if (shouldSkid) {
      const curL = _tempSkidL1.set(-0.83, -config.rideHeight + 0.02, drivenZ).applyQuaternion(carQuat).add(carPos)
      const curR = _tempSkidR1.set(0.83, -config.rideHeight + 0.02, drivenZ).applyQuaternion(carQuat).add(carPos)

      curL.y = getSurfaceHeight(curL.x, curL.z, activeBiomeConfig.id) + 0.025
      curR.y = getSurfaceHeight(curR.x, curR.z, activeBiomeConfig.id) + 0.025

      if (!prevSkidL.current || !prevSkidR.current) {
        prevSkidL.current = curL.clone()
        prevSkidR.current = curR.clone()
      } else {
        const dist = prevSkidL.current.distanceTo(curL)
        const minStep = isBurnoutActive ? 0.16 : 0.42
        if (dist >= minStep) {
          const perpX = rightX * 0.12
          const perpZ = rightZ * 0.12
          const ringPair = skidRingIndex.current * 2

          // Left wheel quad
          const baseL = ringPair * 4 * 3
          // v0 (prev - perp)
          _skidPositions[baseL + 0] = prevSkidL.current.x - perpX
          _skidPositions[baseL + 1] = prevSkidL.current.y
          _skidPositions[baseL + 2] = prevSkidL.current.z - perpZ
          // v1 (prev + perp)
          _skidPositions[baseL + 3] = prevSkidL.current.x + perpX
          _skidPositions[baseL + 4] = prevSkidL.current.y
          _skidPositions[baseL + 5] = prevSkidL.current.z + perpZ
          // v2 (cur - perp)
          _skidPositions[baseL + 6] = curL.x - perpX
          _skidPositions[baseL + 7] = curL.y
          _skidPositions[baseL + 8] = curL.z - perpZ
          // v3 (cur + perp)
          _skidPositions[baseL + 9] = curL.x + perpX
          _skidPositions[baseL + 10] = curL.y
          _skidPositions[baseL + 11] = curL.z + perpZ

          // Right wheel quad
          const baseR = (ringPair + 1) * 4 * 3
          // v0 (prev - perp)
          _skidPositions[baseR + 0] = prevSkidR.current.x - perpX
          _skidPositions[baseR + 1] = prevSkidR.current.y
          _skidPositions[baseR + 2] = prevSkidR.current.z - perpZ
          // v1 (prev + perp)
          _skidPositions[baseR + 3] = prevSkidR.current.x + perpX
          _skidPositions[baseR + 4] = prevSkidR.current.y
          _skidPositions[baseR + 5] = prevSkidR.current.z + perpZ
          // v2 (cur - perp)
          _skidPositions[baseR + 6] = curR.x - perpX
          _skidPositions[baseR + 7] = curR.y
          _skidPositions[baseR + 8] = curR.z - perpZ
          // v3 (cur + perp)
          _skidPositions[baseR + 9] = curR.x + perpX
          _skidPositions[baseR + 10] = curR.y
          _skidPositions[baseR + 11] = curR.z + perpZ

          prevSkidL.current.copy(curL)
          prevSkidR.current.copy(curR)

          skidRingIndex.current = (skidRingIndex.current + 1) % (MAX_SKID_QUADS / 2)
          skidQuadCount.current = Math.min(MAX_SKID_QUADS, skidQuadCount.current + 2)
          _skidGeo.attributes.position.needsUpdate = true
          _skidGeo.setDrawRange(0, skidQuadCount.current * 6)
        }
      }
    } else {
      prevSkidL.current = null
      prevSkidR.current = null
    }

    // ------------------------------------------------------------------------
    // 8. Dynamic Racing Camera with Speed-Dependent FOV, Vibration & Dual Smoothing
    // ------------------------------------------------------------------------
    // Dynamic FOV: expands smoothly at high speed (from 60° up to 74°) for sensation of speed
    const persCam = state.camera as THREE.PerspectiveCamera
    if (persCam.isPerspectiveCamera) {
      const targetFov = 60 + Math.min(14, (currentSpeedKmh / config.maxSpeedKmh) * 14)
      if (Math.abs(persCam.fov - targetFov) > 0.05) {
        persCam.fov = THREE.MathUtils.lerp(persCam.fov, targetFov, frameDelta * 3.5)
        persCam.updateProjectionMatrix()
      }
    }

    let followSpeed = 7.5

    if (cameraPerspective === 'chase') {
      const lookAhead = Math.min(18, Math.max(0, forwardVel.current * 0.22))
      _tempCamOffset.set(0, 1.82, 4.85).applyQuaternion(carQuat).add(carPos)
      _tempCamLookAt.set(0, 0.86, -lookAhead - 2.8).applyQuaternion(carQuat).add(carPos)

      // Dynamic curve anticipation: look through the apex of upcoming road curves
      const upcomingZ = carPos.z - lookAhead - 14
      const curveDelta = getRoadCenter(upcomingZ) - getRoadCenter(carPos.z)
      _tempCamLookAt.x += THREE.MathUtils.clamp(curveDelta * 0.35, -4.5, 4.5)

      // Subtle high-speed micro-vibration
      if (currentSpeedKmh > 80) {
        const vibe = (currentSpeedKmh / config.maxSpeedKmh) * (Math.random() - 0.5) * 0.014
        _tempCamOffset.x += vibe
        _tempCamOffset.y += vibe
      }
      followSpeed = 7.5
    } else if (cameraPerspective === 'dashboard') {
      _tempCamOffset.set(0, 0.76, 0.12).applyQuaternion(carQuat).add(carPos)
      _tempCamLookAt.set(0, 0.72, -30).applyQuaternion(carQuat).add(carPos)
      followSpeed = 16
    } else if (cameraPerspective === 'bumper') {
      _tempCamOffset.set(0, 0.42, -2.4).applyQuaternion(carQuat).add(carPos)
      _tempCamLookAt.set(0, 0.40, -35).applyQuaternion(carQuat).add(carPos)
      followSpeed = 18
    } else if (cameraPerspective === 'drone') {
      const time = state.clock.getElapsedTime() * 0.22
      const lateralShift = Math.sin(time) * 4.5
      _tempCamOffset.set(lateralShift, 5.8, 11.5).applyQuaternion(carQuat).add(carPos)
      _tempCamLookAt.set(0, 0.8, -4).applyQuaternion(carQuat).add(carPos)
      followSpeed = 3.5
    }

    // Snap camera on initialization or perspective toggle to avoid 1-frame jump
    if (isFirstCamFrameRef.current || prevCamModeRef.current !== cameraPerspective) {
      state.camera.position.copy(_tempCamOffset)
      cameraLookAtRef.current.copy(_tempCamLookAt)
      isFirstCamFrameRef.current = false
      prevCamModeRef.current = cameraPerspective
    } else {
      state.camera.position.lerp(_tempCamOffset, frameDelta * followSpeed)
      cameraLookAtRef.current.lerp(_tempCamLookAt, frameDelta * (followSpeed * 1.25))
    }
    state.camera.lookAt(cameraLookAtRef.current)
  })

  return (
    <>
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
      <instancedMesh
        ref={tireParticleMeshRef}
        args={[_particleGeo, _particleMaterial, PARTICLE_COUNT]}
        frustumCulled={false}
      />
      <mesh geometry={_skidGeo} material={_skidMaterial} renderOrder={4} frustumCulled={false} />
    </>
  )
}
