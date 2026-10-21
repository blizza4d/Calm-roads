import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../../../store/useGameStore'
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

  // State Variables - initialized directly on the road surface at Z=0
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

  // Performance parameters per vehicle model
  const specs = {
    bmw_m3: {
      maxSpeed: 62, // m/s (~223 km/h)
      accel: 9.8,
      brakeDecel: 34,
      turnRate: 1.55,
      roadDamping: 0.992,
      offroadDamping: 0.984,
    },
    hovercraft: {
      maxSpeed: 70, // m/s (~252 km/h)
      accel: 11.5,
      brakeDecel: 24,
      turnRate: 1.85,
      roadDamping: 0.997,
      offroadDamping: 0.996, // Glides smoothly over any terrain
    },
    camper: {
      maxSpeed: 38, // m/s (~136 km/h)
      accel: 5.2,
      brakeDecel: 22,
      turnRate: 1.15,
      roadDamping: 0.989,
      offroadDamping: 0.98,
    },
    hatchback: {
      maxSpeed: 50, // m/s (~180 km/h)
      accel: 7.6,
      brakeDecel: 30,
      turnRate: 1.5,
      roadDamping: 0.991,
      offroadDamping: 0.982,
    },
  }[vehicleModel]

  useFrame((state, delta) => {
    if (!carGroupRef.current || photoMode) return

    const dt = Math.min(delta, 0.05)
    const keys = getKeys()
    const store = useGameStore.getState()

    // 1. Resolve active biome at current Z position
    const activeBiomeConfig = getActiveBiomeAt(pos.current.z, biome)
    setCurrentResolvedBiome(activeBiomeConfig.id)

    // 2. Surface condition
    const onRoad = isRoadSurface(pos.current.x, pos.current.z)
    const effectiveDamping = isHoverMode
      ? 0.996
      : onRoad
      ? specs.roadDamping
      : specs.offroadDamping

    // 3. User Controls (combining keyboard and on-screen virtual pedals)
    let targetThrottle = 0
    let targetBrake = 0
    let steerInput = 0

    if (store.autoDrive) {
      // Relaxing cruising along the highway centerline
      const targetCruise = 24 // m/s (~86 km/h)
      if (forwardVel.current < targetCruise) targetThrottle = 0.58
      else targetThrottle = 0.06

      const roadX = getRoadCenter(pos.current.z)
      const lookAheadRoadX = getRoadCenter(pos.current.z - 24)
      const errorX = pos.current.x - roadX
      const curveAhead = lookAheadRoadX - roadX

      // Corrected PID auto-steering:
      // If errorX > 0 (car is right of center), turn left (+).
      // If curveAhead > 0 (road curves right), turn right (-).
      const autoSteer = errorX * 0.14 - curveAhead * 0.08
      steerInput = Math.max(-0.65, Math.min(0.65, autoSteer))
    } else {
      if (keys.forward || store.virtualThrottle) targetThrottle = 1
      if (keys.backward || store.virtualBrake) {
        if (forwardVel.current > 1.2) targetBrake = 1
        else targetThrottle = -0.5
      }
      if (keys.brake) targetBrake = 1
      if (keys.left || store.virtualSteerLeft) steerInput += 1
      if (keys.right || store.virtualSteerRight) steerInput -= 1
    }

    currentThrottle.current = THREE.MathUtils.lerp(currentThrottle.current, targetThrottle, dt * 5.0)
    setThrottle(Math.abs(currentThrottle.current))
    setBrake(targetBrake)
    setSteering(steerInput)

    // 4. Forward Acceleration, Braking & Slope Gravity
    const forwardX = -Math.sin(yawAngle.current)
    const forwardZ = -Math.cos(yawAngle.current)
    const rightX = Math.cos(yawAngle.current)
    const rightZ = -Math.sin(yawAngle.current)

    // Calculate heading-aware terrain slope
    const { pitch: terrainPitch, roll: terrainRoll, height: groundY } = getTerrainSlopeForVehicle(
      pos.current.x,
      pos.current.z,
      forwardX,
      forwardZ,
      rightX,
      rightZ,
      activeBiomeConfig.id
    )

    // Slope gravity: uphill slows vehicle down, downhill naturally adds roll momentum
    const slopeGravity = -4.8 * Math.sin(terrainPitch)
    const accel = specs.accel * (isHoverMode || onRoad ? 1.0 : 0.84)

    if (currentThrottle.current > 0) {
      forwardVel.current += (currentThrottle.current * accel + slopeGravity) * dt
      const maxSpd = isHoverMode || onRoad ? specs.maxSpeed : specs.maxSpeed * 0.8
      if (forwardVel.current > maxSpd) forwardVel.current = maxSpd
    } else if (currentThrottle.current < 0) {
      forwardVel.current += (currentThrottle.current * (accel * 0.5) + slopeGravity) * dt
      if (forwardVel.current < -10) forwardVel.current = -10
    } else {
      forwardVel.current += slopeGravity * dt
    }

    if (targetBrake > 0) {
      const decel = specs.brakeDecel * (isHoverMode ? 0.65 : 1.0)
      if (forwardVel.current > 0) {
        forwardVel.current = Math.max(0, forwardVel.current - targetBrake * decel * dt)
      } else if (forwardVel.current < 0) {
        forwardVel.current = Math.min(0, forwardVel.current + targetBrake * decel * dt)
      }
    }

    // Natural Drag & Friction
    if (targetThrottle === 0 && targetBrake === 0) {
      forwardVel.current *= Math.pow(effectiveDamping, dt * 60)
      if (Math.abs(forwardVel.current) < 0.04) forwardVel.current = 0
    }

    // 5. Steering & Antigravity Drift
    const currentSpeedKmh = Math.abs(forwardVel.current) * 3.6
    const speedSteerFactor = Math.max(0.3, 1 - (currentSpeedKmh / 280) * 0.6)

    if (Math.abs(forwardVel.current) > 0.08) {
      const turnDir = forwardVel.current >= 0 ? 1 : -1
      yawAngle.current += steerInput * specs.turnRate * speedSteerFactor * turnDir * dt
    }

    // Lateral drift for Hover Mode vs Car Tire Grip
    if (isHoverMode) {
      // Repulsor inertia drift
      const targetLateral = -steerInput * (currentSpeedKmh / 130) * 7.5
      lateralVel.current = THREE.MathUtils.lerp(lateralVel.current, targetLateral, dt * 3.8)
    } else {
      lateralVel.current *= Math.pow(0.84, dt * 60)
    }

    // Steering visual rack & Wheel spin
    steeringVisual.current = THREE.MathUtils.lerp(steeringVisual.current, steerInput * 0.38, dt * 10)
    wheelSpin.current += (forwardVel.current / 0.36) * dt

    // 6. 3D World Movement (Forward + Drift)
    pos.current.x += (forwardX * forwardVel.current + rightX * lateralVel.current) * dt
    pos.current.z += (forwardZ * forwardVel.current + rightZ * lateralVel.current) * dt

    // 7. Dynamic Elevation & Independent 4-Wheel Raycast Suspension
    const targetRideHeight = isHoverMode ? 1.25 : 0.44
    const hoverFloatPulse = isHoverMode ? Math.sin(state.clock.getElapsedTime() * 2.2) * 0.03 : 0
    hoverAltitude.current = THREE.MathUtils.lerp(
      hoverAltitude.current,
      targetRideHeight + hoverFloatPulse,
      dt * (isHoverMode ? 4.5 : 12)
    )
    pos.current.y = THREE.MathUtils.lerp(
      pos.current.y,
      groundY + hoverAltitude.current,
      dt * (isHoverMode ? 9 : 18)
    )

    // Accumulated distance (km)
    addDistance((Math.abs(forwardVel.current) * dt) / 1000)

    // Update root vehicle transform
    carGroupRef.current.position.set(pos.current.x, pos.current.y, pos.current.z)
    carGroupRef.current.rotation.y = yawAngle.current

    // Independent 4-Wheel Contact Suspension (FL, FR, RL, RR)
    const halfTrack = 0.88
    const halfBase = 1.35
    const cosYaw = Math.cos(yawAngle.current)
    const sinYaw = Math.sin(yawAngle.current)

    const wheelCorners = [
      [-halfTrack, -halfBase], // FL
      [halfTrack, -halfBase],  // FR
      [-halfTrack, halfBase],  // RL
      [halfTrack, halfBase],   // RR
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
        dt * 18
      )
    })

    // 8. Dynamic Pitch & Body Roll (Inertia + Suspension + Thruster Banking)
    const accelInertia = (currentThrottle.current - targetBrake) * 0.035
    const frontSusp = (wheelSuspensions.current[0] + wheelSuspensions.current[1]) * 0.5
    const rearSusp = (wheelSuspensions.current[2] + wheelSuspensions.current[3]) * 0.5
    const leftSusp = (wheelSuspensions.current[0] + wheelSuspensions.current[2]) * 0.5
    const rightSusp = (wheelSuspensions.current[1] + wheelSuspensions.current[3]) * 0.5

    // Front compression tilts the nose UP, rear compression tilts the nose DOWN
    const suspPitch = (frontSusp - rearSusp) * 0.35
    const suspRoll = (rightSusp - leftSusp) * 0.35

    bodyPitch.current = THREE.MathUtils.lerp(
      bodyPitch.current,
      terrainPitch + accelInertia + suspPitch,
      dt * 8.5
    )

    // Sci-fi hovercraft banks INTO the turn; car rolls outward against centrifugal force
    const steerInertia = (isHoverMode ? steerInput * 0.2 : -steerInput * 0.08) * (currentSpeedKmh / 150)
    bodyRoll.current = THREE.MathUtils.lerp(
      bodyRoll.current,
      terrainRoll + steerInertia + suspRoll,
      dt * 8.5
    )

    if (chassisMeshRef.current) {
      chassisMeshRef.current.rotation.x = bodyPitch.current
      chassisMeshRef.current.rotation.z = bodyRoll.current
    }

    // 9. Telemetry Updates
    setSpeed(currentSpeedKmh)

    let calculatedGear = '1'
    let calculatedRpm = 850
    if (forwardVel.current < -0.1) {
      calculatedGear = 'R'
      calculatedRpm = 1000 + Math.abs(currentSpeedKmh) * 140
    } else if (currentSpeedKmh < 0.5) {
      calculatedGear = 'N'
      calculatedRpm = 850 + (targetThrottle > 0 ? 2400 : 0)
    } else {
      const gearRatios = [35, 70, 115, 160, 210, 280]
      for (let g = 0; g < gearRatios.length; g++) {
        if (currentSpeedKmh <= gearRatios[g] || g === gearRatios.length - 1) {
          calculatedGear = (g + 1).toString()
          const prevSpeed = g === 0 ? 0 : gearRatios[g - 1]
          const progress = (currentSpeedKmh - prevSpeed) / (gearRatios[g] - prevSpeed)
          calculatedRpm = 2000 + progress * 5200
          break
        }
      }
    }
    setGear(calculatedGear)
    setRpm(Math.min(8000, Math.max(800, calculatedRpm)))

    // 10. Update Audio Ecosystem in Real-Time
    audioSystem.updateVehicleAudio({
      speedKmh: currentSpeedKmh,
      rpm: calculatedRpm,
      throttle: Math.abs(currentThrottle.current),
      isOffRoad: !onRoad,
      isHoverMode,
    })

    // 11. Multi-Camera System with Smooth Lerping
    const carPos = pos.current
    const carQuat = carGroupRef.current.quaternion

    if (cameraPerspective === 'chase') {
      const lookAhead = Math.min(14, forwardVel.current * 0.22)
      const idealOffset = new THREE.Vector3(0, 2.5, 6.6).applyQuaternion(carQuat).add(carPos)
      const idealLookAt = new THREE.Vector3(0, 0.9, -lookAhead).applyQuaternion(carQuat).add(carPos)

      state.camera.position.lerp(idealOffset, dt * 7.5)
      state.camera.lookAt(idealLookAt)
    } else if (cameraPerspective === 'dashboard') {
      const idealOffset = new THREE.Vector3(0, 0.85, -0.1).applyQuaternion(carQuat).add(carPos)
      const idealLookAt = new THREE.Vector3(0, 0.85, -30).applyQuaternion(carQuat).add(carPos)

      state.camera.position.lerp(idealOffset, dt * 14)
      state.camera.lookAt(idealLookAt)
    } else if (cameraPerspective === 'bumper') {
      const idealOffset = new THREE.Vector3(0, 0.35, -2.2).applyQuaternion(carQuat).add(carPos)
      const idealLookAt = new THREE.Vector3(0, 0.35, -35).applyQuaternion(carQuat).add(carPos)

      state.camera.position.lerp(idealOffset, dt * 16)
      state.camera.lookAt(idealLookAt)
    } else if (cameraPerspective === 'drone') {
      const time = state.clock.getElapsedTime() * 0.22
      const lateralShift = Math.sin(time) * 5.0
      const idealOffset = new THREE.Vector3(lateralShift, 6.5, 13.5).applyQuaternion(carQuat).add(carPos)
      const idealLookAt = new THREE.Vector3(0, 0.8, -4).applyQuaternion(carQuat).add(carPos)

      state.camera.position.lerp(idealOffset, dt * 3.5)
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
