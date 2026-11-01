import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore, useTelemetryStore, VehicleModelType, CameraPerspectiveType } from '../../../store/useGameStore'
import { useLoadingStore } from '../../../store/useLoadingStore'
import { ActiveCarModel } from './CarModels'
import {
  getRoadCenter,
  getRoadElevation,
  getRoadTangent,
  getRoadBanking,
  getClosestRoadPoint,
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
const _wheelWorldPos = new THREE.Vector3()

const TIRE_POINTS_COUNT = 96

// Offscreen canvas-generated soft circular smoky radial gradient for tire smoke, snow spray & kick-up
function createSmokyRadialTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 31)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)')
    grad.addColorStop(0.25, 'rgba(235, 235, 235, 0.45)')
    grad.addColorStop(0.55, 'rgba(210, 210, 210, 0.18)')
    grad.addColorStop(0.85, 'rgba(190, 190, 190, 0.04)')
    grad.addColorStop(1.0, 'rgba(180, 180, 180, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, 64)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

const _smokyTexture = typeof document !== 'undefined' ? createSmokyRadialTexture() : new THREE.Texture()
const _smokyPointsMaterial = new THREE.PointsMaterial({
  size: 0.9,
  map: _smokyTexture,
  transparent: true,
  opacity: 0.65,
  depthWrite: false,
  vertexColors: true,
  blending: THREE.NormalBlending,
  sizeAttenuation: true,
})

interface ExhaustConfig {
  offsets: [number, number, number][]
  colorPrimary: string
  colorSecondary: string
  isIonPlasma?: boolean
  isDieselSoot?: boolean
}

const VEHICLE_EXHAUSTS: Record<VehicleModelType, ExhaustConfig> = {
  bmw_m3: {
    offsets: [[-0.34, -0.14, 2.18], [0.34, -0.14, 2.18]],
    colorPrimary: '#ff6b00',
    colorSecondary: '#ffb703',
  },
  supercar: {
    offsets: [[-0.18, 0.02, 2.05], [0.18, 0.02, 2.05]],
    colorPrimary: '#00b4d8', // High-energy blue core
    colorSecondary: '#ff9e00',
  },
  hovercraft: {
    offsets: [[-0.55, -0.06, 2.12], [0.55, -0.06, 2.12]],
    colorPrimary: '#00D6A3', // Teal ion plasma wash
    colorSecondary: '#38bdf8',
    isIonPlasma: true,
  },
  camper: {
    offsets: [[-0.62, -0.22, 2.25]],
    colorPrimary: '#2b2b2b', // Diesel soot puff
    colorSecondary: '#4a4a4a',
    isDieselSoot: true,
  },
  hatchback: {
    offsets: [[-0.42, -0.16, 1.98]],
    colorPrimary: '#ff7700',
    colorSecondary: '#ffd166',
  },
}

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

  // Custom THREE.Points Tire Kick-Up Particle System Ref, Geometry & Pool
  const tirePointsRef = useRef<THREE.Points>(null)
  const particleEmissionAccumulator = useRef(0)
  const tirePointsGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(TIRE_POINTS_COUNT * 3)
    const colors = new Float32Array(TIRE_POINTS_COUNT * 3)
    for (let i = 0; i < TIRE_POINTS_COUNT; i++) {
      positions[i * 3 + 1] = -9999
      colors[i * 3] = 1
      colors[i * 3 + 1] = 1
      colors[i * 3 + 2] = 1
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [])

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
    Array.from({ length: TIRE_POINTS_COUNT }, () => ({
      pos: new THREE.Vector3(0, -9999, 0),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0.8,
      size: 0.85,
      color: new THREE.Color('#ffffff'),
      active: false,
    }))
  )

  // Telemetry throttling and biome change tracking
  const prevResolvedBiome = useRef<string>('')
  const telemetryCounter = useRef(0)
  const lastOdoPos = useRef<THREE.Vector3 | null>(null)
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
        if (lastOdoPos.current) {
          lastOdoPos.current.set(pos.current.x, pos.current.y, curZ)
        }
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

    // Restrict driving inputs until essential scene shaders and warmup pipeline are 100% READY
    const isSceneReady = useLoadingStore.getState().isReady
    if (!isSceneReady) {
      targetThrottle = 0
      targetBrake = 1.0
      steerInput = 0
      forwardVel.current = 0
      lateralVel.current = 0
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
      // Agile at hairpin cornering speeds (30-70 km/h); rock-solid stability at highway/top speed (>180 km/h)
      const currentSpeedKmh = Math.abs(forwardVel.current) * 3.6
      const speedSteerFactor = Math.max(0.20, 1.0 / (1.0 + Math.pow(currentSpeedKmh / 78.0, 1.3)))
      const targetSteerAngle = steerInput * config.maxSteerAngle * speedSteerFactor
      currentSteerAngle.current = THREE.MathUtils.lerp(currentSteerAngle.current, targetSteerAngle, dt * 14)

      // Chassis Rotation: Kinematic Bicycle Model & Lateral Dynamic Traction
      if (isHoverMode || vehicleModel === 'hovercraft') {
        // Antigravity Thruster Vectoring & Air Cushion Drift
        const hoverSpeedFactor = Math.max(0.38, 1.0 - (currentSpeedKmh / 320) * 0.45)
        const hoverMotionFactor = Math.min(1.0, Math.abs(forwardVel.current) / 0.6)
        yawAngle.current += steerInput * config.turnRate * hoverSpeedFactor * Math.max(0.25, hoverMotionFactor) * dt

        const targetLateral = -steerInput * Math.min(16, (currentSpeedKmh / 110) * 6.5)
        lateralVel.current = THREE.MathUtils.lerp(lateralVel.current, targetLateral, dt * 3.2)
        lateralVel.current *= Math.pow(0.985, dt * 60)
      } else {
        // Ground Vehicles: Yaw rate is strictly derived from forward movement and steer angle!
        // When stationary (v == 0), yaw rate is MATHEMATICALLY ZERO (wheels turn without sliding car)
        const steerAngle = currentSteerAngle.current
        const absVel = Math.abs(forwardVel.current)

        if (absVel > 0.08) {
          // Kinematic bicycle yaw rate: omega = (v / L) * tan(delta)
          const kinematicYawRate = (forwardVel.current / config.wheelbase) * Math.tan(steerAngle)

          // Smooth launch blend to prevent any snap when transitioning from rest to motion
          const launchBlend = Math.min(1.0, (absVel - 0.08) / 0.95)

          // Surface Grip: Dry asphalt 1.0, wet asphalt 0.94, snow 0.82, off-road 0.72
          const baseFriction = activeBiomeConfig.friction ?? 1.0
          const isWet = activeBiomeConfig.weatherPreset === 'rain'
          const wetFactor = isWet ? 0.94 : 1.0
          const surfaceGrip =
            (onRoad
              ? baseFriction * wetFactor
              : 0.72) * (isBurnoutActive ? 0.30 : 1.0)
          const aeroDownforce = config.downforceCoeff * Math.min(1.4, Math.pow(absVel / config.maxSpeedMs, 2))
          const maxLatAccel = config.tireGrip * 9.81 * (1.0 + aeroDownforce) * surfaceGrip

          // Adhesion yaw rate limit before front tire scrub / drift
          const maxYawRate = maxLatAccel / (absVel + 0.001)

          let actualYawRate = kinematicYawRate * launchBlend
          if (Math.abs(actualYawRate) > maxYawRate) {
            // Tire adhesion limit exceeded: break into controlled progressive drift
            actualYawRate = Math.sign(actualYawRate) * maxYawRate
            const excessDemand = Math.abs(kinematicYawRate * forwardVel.current) - maxLatAccel
            lateralVel.current += -Math.sign(steerAngle) * excessDemand * 0.28 * dt
          }

          yawAngle.current += actualYawRate * dt
          // Tire lateral scrub damping
          lateralVel.current *= Math.pow(0.72, dt * 60)
        } else {
          // Vehicle is at rest: complete damping of any lateral slide, zero yaw angular velocity
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
        if (lastOdoPos.current) {
          lastOdoPos.current.copy(pos.current)
        }
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

    // Accumulated real traveled displacement (km) accounting for 3D curved paths & elevation
    if (!lastOdoPos.current) {
      lastOdoPos.current = pos.current.clone()
    } else {
      const stepDist = pos.current.distanceTo(lastOdoPos.current)
      // Filter out teleport / reset jumps (> 12m in a single frame)
      if (stepDist > 0.001 && stepDist < 12.0) {
        accumulatedDistance.current += stepDist / 1000.0
      }
      lastOdoPos.current.copy(pos.current)
    }

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

    const suspPitch = (frontSusp - rearSusp) * 0.22
    const suspRoll = (rightSusp - leftSusp) * 0.12 // Anti-roll bar damped dynamic compliance

    // Highway banking vs off-road slope decoupling
    const isSurfaceRoad = isRoadSurface(pos.current.x, pos.current.z)
    let baseRoll = 0
    let basePitch = 0

    if (isSurfaceRoad) {
      // Highway banking superelevation projected into vehicle's frame of reference
      const roadBank = getRoadBanking(pos.current.z)
      const roadTan = getRoadTangent(pos.current.z)
      // Dot product of vehicle lateral vector (rightX, rightZ) with road normal (nx, nz)
      const bankRollAlignment = rightX * roadTan.nx + rightZ * roadTan.nz
      baseRoll = roadBank * bankRollAlignment
      basePitch = terrainPitch
    } else {
      // Off-road terrain slope: clamp gently to prevent rolling over or tipping
      baseRoll = THREE.MathUtils.clamp(terrainRoll, -0.28, 0.28)
      basePitch = THREE.MathUtils.clamp(terrainPitch, -0.32, 0.32)
    }

    // Centrifugal body roll: sports suspension roll into/out of corner
    const steerInertia = isHoverMode
      ? steerInput * 0.15 * (currentSpeedKmh / 160)
      : -steerInput * 0.032 * Math.min(1.5, currentSpeedKmh / 120)

    const targetPitch = THREE.MathUtils.clamp(basePitch + accelInertia + suspPitch, -0.4, 0.4)
    const targetRoll = THREE.MathUtils.clamp(baseRoll + steerInertia + suspRoll, -0.32, 0.32)

    bodyPitch.current = THREE.MathUtils.lerp(
      bodyPitch.current,
      targetPitch,
      frameDelta * 9.0
    )

    bodyRoll.current = THREE.MathUtils.lerp(
      bodyRoll.current,
      targetRoll,
      frameDelta * 9.0
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
      const closestRoad = getClosestRoadPoint(pos.current.x, pos.current.z)
      const groundClearanceMm = Math.round((pos.current.y - groundY) * 1000)
      useTelemetryStore.getState().setTelemetry({
        speed: Math.round(currentSpeedKmh),
        rpm: finalRpm,
        gear: calculatedGear,
        throttle: curThrottleAbs,
        brake: targetBrake,
        distance: accumulatedDistance.current,
        pitch: +(bodyPitch.current * (180 / Math.PI)).toFixed(1),
        roll: +(bodyRoll.current * (180 / Math.PI)).toFixed(1),
        suspension: [
          Math.round(wheelSuspensions.current[0] * 1000),
          Math.round(wheelSuspensions.current[1] * 1000),
          Math.round(wheelSuspensions.current[2] * 1000),
          Math.round(wheelSuspensions.current[3] * 1000),
        ],
        roadClearance: groundClearanceMm,
        onRoad: isSurfaceRoad,
        distFromRoad: +closestRoad.dist.toFixed(2),
      })
      if (telemetryCounter.current % 30 === 0) {
        useGameStore.setState({
          distance: accumulatedDistance.current,
          diagnostics: {
            ...useGameStore.getState().diagnostics,
            roadElevation: +closestRoad.roadY.toFixed(1),
            terrainElevation: +groundY.toFixed(1),
            corridorClearance: +(closestRoad.roadY - groundY).toFixed(2),
            roadBankingDeg: +(closestRoad.banking * (180 / Math.PI)).toFixed(1),
          },
        })
      }
    }

    // ------------------------------------------------------------------------
    // 7. Custom THREE.Points Tire Kick-Up Particle System
    // Scaled strictly by vehicle speed and steering angle
    // ------------------------------------------------------------------------
    const carPos = pos.current
    const carQuat = carGroupRef.current.quaternion
    const drivenZ = config.drivetrain === 'fwd' ? -1.48 : 1.18

    const isSnowyRegion = activeBiomeConfig.id === 'twisted_mountains' || activeBiomeConfig.id === 'tundra'
    const isBurnoutSmoke = isBurnoutActive && onRoad

    // Particle emission rate scaled strictly by vehicle speed and steering angle
    const speedRatio = Math.min(1.2, absVel / 32.0)
    const steerRatio = Math.min(1.0, Math.abs(steeringVisual.current) * 2.8)
    const emissionRate = speedRatio * (0.35 + steerRatio * 2.5) + (isBurnoutSmoke ? 2.5 : 0)

    if (!isHoverMode && vehicleModel !== 'hovercraft' && (absVel > 1.2 || isBurnoutSmoke)) {
      particleEmissionAccumulator.current += emissionRate * frameDelta * 32.0

      while (particleEmissionAccumulator.current >= 1.0) {
        particleEmissionAccumulator.current -= 1.0

        // Find inactive or oldest particle
        let bestP = particlePool.current[0]
        let maxLifeNorm = -1
        for (let i = 0; i < TIRE_POINTS_COUNT; i++) {
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
          bestP.maxLife = 1.15
          bestP.size = 1.4
          bestP.color.set('#f8fafc')
          bestP.vel.set(
            (Math.random() - 0.5) * 1.6 + lateralVel.current * 0.25,
            Math.random() * 1.4 + 0.5,
            -forwardVel.current * 0.12 + (Math.random() - 0.5) * 0.8
          )
        } else if (Math.abs(lateralVel.current) > 1.15) {
          bestP.maxLife = 0.95
          bestP.size = 1.1
          bestP.color.set('#f1f5f9')
          bestP.vel.set(
            (Math.random() - 0.5) * 1.3 + lateralVel.current * 0.3,
            Math.random() * 1.0 + 0.35,
            -forwardVel.current * 0.14 + (Math.random() - 0.5) * 0.7
          )
        } else if (isSnowyRegion) {
          bestP.maxLife = 0.85
          bestP.size = 0.95
          bestP.color.set('#e2e8f0')
          bestP.vel.set(
            (Math.random() - 0.5) * 1.1,
            Math.random() * 1.2 + 0.45,
            -forwardVel.current * 0.18 + (Math.random() - 0.5) * 0.6
          )
        } else if (!onRoad) {
          bestP.maxLife = 0.9
          bestP.size = 1.1
          bestP.color.set(activeBiomeConfig.id === 'desert' ? '#d4a373' : '#8d7b68')
          bestP.vel.set(
            (Math.random() - 0.5) * 1.2,
            Math.random() * 0.9 + 0.3,
            -forwardVel.current * 0.16 + (Math.random() - 0.5) * 0.6
          )
        } else {
          bestP.maxLife = 0.7
          bestP.size = 0.8
          bestP.color.set('#cbd5e1')
          bestP.vel.set(
            (Math.random() - 0.5) * 0.8,
            Math.random() * 0.6 + 0.2,
            -forwardVel.current * 0.15 + (Math.random() - 0.5) * 0.5
          )
        }
      }
    }

    // 7.2 Custom Dynamic Per-Vehicle Exhaust Effects (Flames, Soot, Ion Plasma Wash)
    const exCfg = VEHICLE_EXHAUSTS[vehicleModel] || VEHICLE_EXHAUSTS.bmw_m3
    let spawnExhaust = false
    let exColor = exCfg.colorPrimary
    let exSize = 0.22
    let exLife = 0.18
    let exVelMult = 1.0

    if (exCfg.isIonPlasma) {
      // Hovercraft: continuous ion plasma wash whenever repulsors/throttle are active
      if (isHoverMode || vehicleModel === 'hovercraft') {
        spawnExhaust = targetThrottle > 0.05 || Math.abs(forwardVel.current) > 2.0
        exColor = Math.random() > 0.4 ? exCfg.colorPrimary : exCfg.colorSecondary
        exSize = 0.28
        exLife = 0.22
        exVelMult = 0.8
      }
    } else if (exCfg.isDieselSoot) {
      // Camper: heavy diesel soot puff upon aggressive throttle or hill climb
      if (targetThrottle > 0.55 || (isBurnoutActive && Math.random() > 0.4)) {
        spawnExhaust = Math.random() > 0.45
        exColor = Math.random() > 0.5 ? exCfg.colorPrimary : exCfg.colorSecondary
        exSize = 0.38
        exLife = 0.35
        exVelMult = 0.6
      }
    } else {
      // Combustion engines (bmw_m3, supercar, hatchback):
      // Overrun pops on lift-off, high-rpm gear shifts, and burnout
      const isCombustionPop =
        isDecel ||
        shiftCutTimer.current > 0.04 ||
        (isBurnoutActive && finalRpm > config.redlineRpm - 300 && Math.random() > 0.6)

      if (isCombustionPop && Math.random() > 0.25) {
        spawnExhaust = true
        exColor = Math.random() > 0.35 ? exCfg.colorPrimary : exCfg.colorSecondary
        exSize = vehicleModel === 'supercar' ? 0.26 : 0.20
        exLife = 0.16
        exVelMult = 1.3
      }
    }

    if (spawnExhaust) {
      const chosenOffset = exCfg.offsets[Math.floor(Math.random() * exCfg.offsets.length)]
      let bestP = particlePool.current[0]
      for (let i = 0; i < TIRE_POINTS_COUNT; i++) {
        if (!particlePool.current[i].active) {
          bestP = particlePool.current[i]
          break
        }
      }
      const exPos = _wheelWorldPos
        .set(chosenOffset[0], -config.rideHeight + chosenOffset[1] + 0.3, chosenOffset[2])
        .applyQuaternion(carQuat)
        .add(carPos)

      bestP.pos.copy(exPos)
      bestP.active = true
      bestP.life = 0
      bestP.maxLife = exLife
      bestP.size = exSize
      bestP.color.set(exColor)
      bestP.vel.set(
        (Math.random() - 0.5) * 0.35 - forwardX * (Math.abs(forwardVel.current) * 0.12 + 2.6 * exVelMult),
        Math.random() * 0.3 + 0.08,
        (Math.random() - 0.5) * 0.35 - forwardZ * (Math.abs(forwardVel.current) * 0.12 + 2.6 * exVelMult)
      )
    }

    // Update active particle points in THREE.Points BufferGeometry
    if (tirePointsRef.current) {
      const positions = tirePointsRef.current.geometry.attributes.position.array as Float32Array
      const colors = tirePointsRef.current.geometry.attributes.color.array as Float32Array

      for (let i = 0; i < TIRE_POINTS_COUNT; i++) {
        const p = particlePool.current[i]
        const idx = i * 3
        if (!p.active) {
          positions[idx + 1] = -9999
          continue
        }

        p.life += frameDelta
        if (p.life >= p.maxLife) {
          p.active = false
          positions[idx + 1] = -9999
          continue
        }

        p.pos.addScaledVector(p.vel, frameDelta)
        p.vel.y += 0.22 * frameDelta
        p.vel.x *= 0.95
        p.vel.z *= 0.95

        positions[idx] = p.pos.x
        positions[idx + 1] = p.pos.y
        positions[idx + 2] = p.pos.z

        const progress = p.life / p.maxLife
        const alpha = Math.max(0, 1.0 - progress) * 0.65

        colors[idx] = p.color.r * alpha
        colors[idx + 1] = p.color.g * alpha
        colors[idx + 2] = p.color.b * alpha
      }

      tirePointsRef.current.geometry.attributes.position.needsUpdate = true
      tirePointsRef.current.geometry.attributes.color.needsUpdate = true
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
    // Dynamic FOV: expands smoothly from 60° baseline up to 82° at high speeds
    const persCam = state.camera as THREE.PerspectiveCamera
    if (persCam.isPerspectiveCamera) {
      const speedRatio = Math.min(1.0, currentSpeedKmh / config.maxSpeedKmh)
      const targetFov = 60 + Math.pow(speedRatio, 1.4) * 22.0 // 60° to 82°
      if (Math.abs(persCam.fov - targetFov) > 0.05) {
        persCam.fov = THREE.MathUtils.lerp(persCam.fov, targetFov, frameDelta * 3.5)
        persCam.updateProjectionMatrix()
      }
    }

    let followSpeed = 7.5

    if (cameraPerspective === 'chase') {
      const lookAhead = Math.min(22, Math.max(0, forwardVel.current * 0.25))
      _tempCamOffset.set(0, 1.82, 4.85).applyQuaternion(carQuat).add(carPos)
      _tempCamLookAt.set(0, 0.86, -lookAhead - 2.8).applyQuaternion(carQuat).add(carPos)

      // Dynamic curve anticipation: look through the apex of upcoming road curves
      const upcomingZ = carPos.z - lookAhead - 16
      const curveDelta = getRoadCenter(upcomingZ) - getRoadCenter(carPos.z)
      _tempCamLookAt.x += THREE.MathUtils.clamp(curveDelta * 0.38, -4.8, 4.8)

      // Pitch response on acceleration squat and heavy braking dive
      const accelPitch = (targetThrottle * 0.10 - targetBrake * 0.14)
      _tempCamOffset.y -= accelPitch * 0.35
      _tempCamLookAt.y -= accelPitch * 0.85

      // Bump and suspension vertical feedback
      const bumpLift = (wheelSuspensions.current[0] + wheelSuspensions.current[1] - wheelSuspensions.current[2] - wheelSuspensions.current[3]) * 0.22
      _tempCamOffset.y += bumpLift
      _tempCamLookAt.y += bumpLift * 0.5

      // Deterministic engine RPM harmonic vibration
      const rpmHz = (finalRpm / 60) * (vehicleModel === 'supercar' ? 5 : 3)
      const vibeAmp = Math.min(1.0, finalRpm / config.redlineRpm) * (isBurnoutActive ? 0.018 : currentSpeedKmh > 75 ? 0.009 : 0.004)
      const engineVibe = Math.sin(state.clock.getElapsedTime() * rpmHz * Math.PI * 2) * vibeAmp
      _tempCamOffset.y += engineVibe * 0.45
      _tempCamOffset.x += engineVibe * 0.30

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
      <points
        ref={tirePointsRef}
        geometry={tirePointsGeo}
        material={_smokyPointsMaterial}
        frustumCulled={false}
      />
      <mesh geometry={_skidGeo} material={_skidMaterial} renderOrder={4} frustumCulled={false} />
    </>
  )
}
