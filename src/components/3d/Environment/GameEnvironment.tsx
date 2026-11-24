import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, SSAO } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useGameStore, useTelemetryStore } from '../../../store/useGameStore'
import { BIOMES, getRoadCenter } from '../../../utils/roadMath'
import { calculateEnvironmentalLighting } from '../../../utils/environmentalLighting'
import { updateAtmosphericUniforms } from '../../../utils/atmosphericShader'
import { VolumetricClouds } from './VolumetricClouds'

// ------------------------------------------------------------------------
// Cosmic Night Sky Shaders: 3,600+ Twinkling Stars & Galactic Milky Way
// ------------------------------------------------------------------------
const starVertexShader = `
  uniform float uTime;
  uniform float uOpacity;
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aTwinkleSpeed;
  attribute float aTwinklePhase;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vColor = aColor;
    float twinkle = 0.65 + 0.35 * sin(uTime * aTwinkleSpeed + aTwinklePhase);
    vTwinkle = twinkle;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (1.0 + 0.25 * sin(uTime * aTwinkleSpeed + aTwinklePhase)) * (1400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const starFragmentShader = `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // Smooth Gaussian circular star disc with glowing core
    float core = smoothstep(0.5, 0.0, dist);
    float alpha = core * uOpacity * vTwinkle;
    gl_FragColor = vec4(vColor * vTwinkle, alpha);
  }
`

const milkyWayVertexShader = `
  uniform float uOpacity;
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;

  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (1200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const milkyWayFragmentShader = `
  uniform float uOpacity;
  varying vec3 vColor;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    float glow = smoothstep(0.5, 0.05, dist);
    gl_FragColor = vec4(vColor, glow * uOpacity);
  }
`

// ------------------------------------------------------------------------
// GPU-Accelerated Precipitation Shader (Zero CPU Updates / Zero Buffer Uploads)
// ------------------------------------------------------------------------
const precipVertexShader = `
  uniform float uTime;
  uniform vec3 uCamPos;
  uniform float uFallSpeed;
  uniform float uDriftSpeed;
  uniform float uHeightRange;
  uniform float uAreaRadius;
  uniform float uPointSize;
  attribute float aPhase;
  varying float vAlpha;

  void main() {
    // GPU modulo height wrap centered vertically around camera
    float yOffset = mod(position.y - uTime * uFallSpeed, uHeightRange);
    float localY = uHeightRange * 0.5 - yOffset;
    float localX = position.x + sin(uTime * 1.6 + aPhase) * uDriftSpeed;
    float localZ = position.z + cos(uTime * 1.2 + aPhase) * (uDriftSpeed * 0.5);

    vec4 mvPosition = modelViewMatrix * vec4(localX + uCamPos.x, localY + uCamPos.y, localZ + uCamPos.z, 1.0);
    float pSize = uPointSize * (70.0 / max(2.5, -mvPosition.z));
    gl_PointSize = clamp(pSize, 1.0, 34.0);
    gl_Position = projectionMatrix * mvPosition;

    // Fade particles that approach the ground or upper bounds
    vAlpha = smoothstep(0.0, 3.5, yOffset) * smoothstep(uHeightRange, uHeightRange - 3.5, yOffset);
  }
`

const precipFragmentShader = `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uBaseOpacity;
  varying float vAlpha;

  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(uColor, tex.a * vAlpha * uBaseOpacity);
  }
`

const SSAO_COLOR = new THREE.Color('#0b101b')

// Cosmic Sky Component: Centered on player camera, renders Stars, Milky Way, Glowing 3D Moon & Solar Corona
function CosmicCelestialSky({
  nightFactor,
  sunDiscPosition,
  moonPosition,
  isNight,
  isGoldenHour,
  weather,
}: {
  nightFactor: number
  sunDiscPosition: [number, number, number]
  moonPosition: [number, number, number]
  isNight: boolean
  isGoldenHour: boolean
  weather: string
}) {
  const { camera } = useThree()
  const skyGroupRef = useRef<THREE.Group>(null)
  const starMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const milkyWayMaterialRef = useRef<THREE.ShaderMaterial>(null)

  // 1. Generate Multi-Spectral Starfield (3,600 stars on upper celestial dome)
  const starGeo = useMemo(() => {
    const starCount = 3600
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)
    const twinkleSpeeds = new Float32Array(starCount)
    const twinklePhases = new Float32Array(starCount)

    const domeRadius = 1800

    // Stellar spectral classes
    const colorClasses = [
      new THREE.Color('#93c5fd'), // Hot blue-white (Class O/B, ~25%)
      new THREE.Color('#f8fafc'), // Pure white (Class A/F, ~45%)
      new THREE.Color('#fef08a'), // Warm golden (Class G, ~20%)
      new THREE.Color('#fb923c'), // Orange-red giant (Class K/M, ~10%)
    ]

    for (let i = 0; i < starCount; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(0.04 + 0.96 * v)

      const x = domeRadius * Math.sin(phi) * Math.cos(theta)
      const y = domeRadius * Math.cos(phi)
      const z = domeRadius * Math.sin(phi) * Math.sin(theta)

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      const magRand = Math.random()
      let size = 2.4 + Math.random() * 2.2
      if (magRand > 0.95) {
        size = 5.5 + Math.random() * 2.5
      } else if (magRand > 0.75) {
        size = 3.6 + Math.random() * 1.5
      }
      sizes[i] = size

      let starColor = colorClasses[1]
      if (magRand < 0.25) starColor = colorClasses[0]
      else if (magRand > 0.90) starColor = colorClasses[3]
      else if (magRand > 0.70) starColor = colorClasses[2]

      colors[i * 3] = starColor.r
      colors[i * 3 + 1] = starColor.g
      colors[i * 3 + 2] = starColor.b

      twinkleSpeeds[i] = 1.4 + Math.random() * 3.2
      twinklePhases[i] = Math.random() * Math.PI * 2
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1))
    geo.setAttribute('aTwinklePhase', new THREE.BufferAttribute(twinklePhases, 1))
    return geo
  }, [])

  // 2. Generate Milky Way Galactic Band
  const milkyWayGeo = useMemo(() => {
    const count = 1800
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    const r = 1750
    const inclination = 0.92

    const palette = [
      new THREE.Color('#6d28d9'),
      new THREE.Color('#3b82f6'),
      new THREE.Color('#0ea5e9'),
      new THREE.Color('#fcd34d'),
      new THREE.Color('#cbd5e1'),
    ]

    for (let i = 0; i < count; i++) {
      const angle = (0.10 + (i / count) * 0.80) * Math.PI
      const disp = (Math.random() + Math.random() - 1.0) * 145
      const radialVar = (Math.random() - 0.5) * 70

      const rawX = (r + radialVar) * Math.cos(angle)
      const rawY = (r + radialVar) * Math.sin(angle) * Math.sin(inclination) + disp * 0.45
      const rawZ = (r + radialVar) * Math.sin(angle) * Math.cos(inclination) + disp * 0.55

      positions[i * 3] = rawX
      positions[i * 3 + 1] = Math.max(240, rawY)
      positions[i * 3 + 2] = rawZ

      const isCore = Math.abs(angle - Math.PI * 0.5) < 0.45
      const col = isCore && Math.random() > 0.45 ? palette[3] : palette[Math.floor(Math.random() * palette.length)]

      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b

      sizes[i] = 7.0 + Math.random() * 14.0
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [])

  // Animate twinkling and track camera position
  useFrame((state) => {
    if (skyGroupRef.current) {
      skyGroupRef.current.position.set(camera.position.x, 0, camera.position.z)
    }

    const time = state.clock.getElapsedTime()
    if (starMaterialRef.current) {
      starMaterialRef.current.uniforms.uTime.value = time
      starMaterialRef.current.uniforms.uOpacity.value = nightFactor
    }
    if (milkyWayMaterialRef.current) {
      milkyWayMaterialRef.current.uniforms.uOpacity.value = nightFactor * 0.22
    }
  })

  useEffect(() => {
    return () => {
      starGeo.dispose()
      milkyWayGeo.dispose()
    }
  }, [starGeo, milkyWayGeo])

  return (
    <group ref={skyGroupRef}>
      {/* 1. Scintillating Starfield */}
      <points geometry={starGeo}>
        <shaderMaterial
          ref={starMaterialRef}
          vertexShader={starVertexShader}
          fragmentShader={starFragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uOpacity: { value: nightFactor },
          }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 2. Milky Way Galactic Band */}
      <points geometry={milkyWayGeo}>
        <shaderMaterial
          ref={milkyWayMaterialRef}
          vertexShader={milkyWayVertexShader}
          fragmentShader={milkyWayFragmentShader}
          uniforms={{
            uOpacity: { value: nightFactor * 0.62 },
          }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 3. Glowing 3D Moon & Lunar Atmospheric Halo */}
      {isNight && (
        <group position={moonPosition}>
          <mesh>
            <sphereGeometry args={[28, 24, 24]} />
            <meshBasicMaterial color="#f8fafc" fog={false} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[28, 62, 32]} />
            <meshBasicMaterial color="#93c5fd" transparent opacity={0.26} side={THREE.DoubleSide} fog={false} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* 4. Daytime & Golden Hour Solar Disc & Atmospheric Sun Halo */}
      {!isNight && weather !== 'rain' && (
        <group position={sunDiscPosition}>
          <mesh>
            <sphereGeometry args={[isGoldenHour ? 44 : 34, 20, 20]} />
            <meshBasicMaterial
              color={isGoldenHour ? '#fde68a' : '#fffef5'}
              fog={false}
              toneMapped={false}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[isGoldenHour ? 96 : 68, 20, 20]} />
            <meshBasicMaterial
              color={isGoldenHour ? '#fb923c' : '#fef3c7'}
              transparent
              opacity={isGoldenHour ? 0.26 : 0.14}
              fog={false}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}

// ------------------------------------------------------------------------
// Panoramic Distant Mountain Horizon & Atmospheric Ground Skirt
// ------------------------------------------------------------------------
function PanoramicMountainHorizon({
  fogColor,
  rockColor,
  isNight,
}: {
  fogColor: THREE.Color
  rockColor: string
  isNight: boolean
}) {
  const { camera } = useThree()
  const ringGroupRef = useRef<THREE.Group>(null)

  const mountainGeo = useMemo(() => {
    const segments = 256
    const radius = 3850
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    const fogCol = fogColor.clone()
    const baseRock = new THREE.Color(rockColor)
    const summitCol = isNight
      ? new THREE.Color('#0f172a').lerp(fogCol, 0.65)
      : baseRock.clone().multiplyScalar(0.72).lerp(fogCol, 0.68)
    const snowCol = isNight ? new THREE.Color('#1e293b') : new THREE.Color('#f8fafc').lerp(fogCol, 0.55)
    const baseY = -800

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      const cosT = Math.cos(theta)
      const sinT = Math.sin(theta)

      const x = radius * sinT
      const z = radius * cosT

      const peakH =
        170 +
        Math.sin(theta * 3.0) * 70 +
        Math.cos(theta * 7.0 + 0.8) * 42 +
        Math.sin(theta * 13.0) * 25 +
        Math.cos(theta * 29.0) * 14 +
        Math.sin(theta * 53.0) * 6

      positions.push(x, baseY, z)
      colors.push(fogCol.r, fogCol.g, fogCol.b)

      positions.push(x, peakH, z)
      const col = peakH > 220 ? snowCol : summitCol
      colors.push(col.r, col.g, col.b)
    }

    for (let i = 0; i < segments; i++) {
      const b1 = i * 2
      const t1 = b1 + 1
      const b2 = (i + 1) * 2
      const t2 = b2 + 1

      indices.push(b1, t1, b2)
      indices.push(t1, t2, b2)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [fogColor, rockColor, isNight])

  useFrame(() => {
    if (ringGroupRef.current) {
      ringGroupRef.current.position.set(camera.position.x, camera.position.y * 0.85, camera.position.z)
    }
  })

  useEffect(() => {
    return () => {
      mountainGeo.dispose()
    }
  }, [mountainGeo])

  return (
    <group ref={ringGroupRef}>
      <mesh geometry={mountainGeo} renderOrder={-1}>
        <meshBasicMaterial vertexColors side={THREE.FrontSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ------------------------------------------------------------------------
// Realistic Coastal Beach Ocean Surface
// ------------------------------------------------------------------------
function CoastalOcean({ isNight, currentBiome }: { isNight: boolean; currentBiome: string }) {
  const { camera } = useThree()
  const oceanRef = useRef<THREE.Mesh>(null)

  const isCoastal = currentBiome === 'coastal'

  const oceanGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2600, 3800, 48, 48)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  const waveAccumRef = useRef(0)

  useFrame((state, delta) => {
    if (oceanRef.current && isCoastal) {
      const roadCx = getRoadCenter(camera.position.z)
      oceanRef.current.position.set(roadCx - 1380, 0.0, camera.position.z)

      waveAccumRef.current += delta
      if (waveAccumRef.current < 0.033) return
      waveAccumRef.current = 0

      const time = state.clock.getElapsedTime() * 1.15
      const pos = oceanGeo.attributes.position
      const count = pos.count

      for (let i = 0; i < count; i++) {
        const x = pos.getX(i)
        const z = pos.getZ(i)
        const wave =
          Math.sin(x * 0.015 + time * 1.4) * 0.28 +
          Math.cos(z * 0.022 + time * 0.95) * 0.22 +
          Math.sin((x + z) * 0.035 + time * 2.1) * 0.12
        pos.setY(i, wave)
      }
      pos.needsUpdate = true
    }
  })

  if (!isCoastal) return null

  return (
    <mesh ref={oceanRef} geometry={oceanGeo} position={[-1380, 0, 0]} receiveShadow>
      <meshStandardMaterial
        color={isNight ? '#071b34' : '#0b6b88'}
        roughness={0.18}
        metalness={0.16}
        envMapIntensity={isNight ? 0.65 : 1.35}
        transparent
        opacity={0.90}
        depthWrite={false}
      />
    </mesh>
  )
}

// ------------------------------------------------------------------------
// Procedural Circular Alpha Map Textures for Rain & Snow
// ------------------------------------------------------------------------
function createSnowflakeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30)
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.88)')
    grad.addColorStop(0.7, 'rgba(240, 248, 255, 0.35)')
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(32, 32, 30, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createRainTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const grad = ctx.createLinearGradient(16, 0, 16, 64)
    grad.addColorStop(0, 'rgba(180, 220, 255, 0.0)')
    grad.addColorStop(0.4, 'rgba(200, 230, 255, 0.75)')
    grad.addColorStop(1.0, 'rgba(220, 245, 255, 0.95)')

    ctx.fillStyle = grad
    ctx.fillRect(13, 0, 6, 64)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// ------------------------------------------------------------------------
// Main Master GameEnvironment Component
// ------------------------------------------------------------------------
export default function GameEnvironment() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay)
  const autoTimeCycle = useGameStore((s) => s.autoTimeCycle)
  const timeSpeed = useGameStore((s) => s.timeSpeed)
  const weather = useGameStore((s) => s.weather)
  const currentResolvedBiome = useGameStore((s) => s.currentResolvedBiome)
  const graphicsQuality = useGameStore((s) => s.graphicsQuality)
  const { scene, camera } = useThree()

  // Hardware Object References
  const dirLightRef = useRef<THREE.DirectionalLight>(null)
  const lightTargetRef = useRef<THREE.Object3D>(null)
  const ambientLightRef = useRef<THREE.AmbientLight>(null)
  const hemiLightRef = useRef<THREE.HemisphereLight>(null)

  const timeOfDayRef = useRef(timeOfDay)
  const lastDispatchedTime = useRef(timeOfDay)
  const dispatchThrottleTimer = useRef(0)

  // Initial Environmental Lighting State
  const initialLighting = useMemo(() => {
    return calculateEnvironmentalLighting(timeOfDay, weather, currentResolvedBiome)
  }, [timeOfDay, weather, currentResolvedBiome])

  const biomeConfig = BIOMES[currentResolvedBiome] || BIOMES.forest

  // Frame Loop: Smooth Time-of-Day Progression & Direct Light/Fog Updates (Zero React Re-Renders)
  useFrame((state, delta) => {
    // Detect external time changes (e.g. user selected preset, dragged slider, or called skipTo)
    if (Math.abs(timeOfDay - lastDispatchedTime.current) > 0.05) {
      timeOfDayRef.current = timeOfDay
      lastDispatchedTime.current = timeOfDay
    }

    if (autoTimeCycle) {
      timeOfDayRef.current = (timeOfDayRef.current + delta * (24.0 / 720.0) * timeSpeed) % 24.0

      // Throttle Zustand dispatch to 2Hz so UI stays updated without React tree churning
      dispatchThrottleTimer.current += delta
      if (dispatchThrottleTimer.current >= 0.5) {
        dispatchThrottleTimer.current = 0
        if (Math.abs(timeOfDayRef.current - lastDispatchedTime.current) > 0.05) {
          lastDispatchedTime.current = timeOfDayRef.current
          setTimeOfDay(timeOfDayRef.current)
        }
      }
    } else {
      timeOfDayRef.current = timeOfDay
      lastDispatchedTime.current = timeOfDay
    }

    const currentLighting = calculateEnvironmentalLighting(
      timeOfDayRef.current,
      weather,
      currentResolvedBiome
    )

    // Direct hardware updates to Three.js lighting & fog
    if (dirLightRef.current && lightTargetRef.current) {
      const cx = camera.position.x
      const cy = camera.position.y
      const cz = camera.position.z

      // Texel grid snapping prevents shadow shimmering on hill edges
      const shadowMapSize = graphicsQuality === 'low' ? 1024 : 2048
      const texelSize = 110.0 / shadowMapSize
      const snappedTargetX = Math.floor(cx / texelSize) * texelSize
      const snappedTargetZ = Math.floor(cz / texelSize) * texelSize

      lightTargetRef.current.position.set(snappedTargetX, cy, snappedTargetZ - 10)
      dirLightRef.current.target = lightTargetRef.current
      dirLightRef.current.target.updateMatrixWorld()

      dirLightRef.current.position.set(
        snappedTargetX + currentLighting.shadowCameraPosition[0],
        cy + currentLighting.shadowCameraPosition[1],
        snappedTargetZ + currentLighting.shadowCameraPosition[2]
      )
      dirLightRef.current.color.copy(currentLighting.sunColor)
      dirLightRef.current.intensity = currentLighting.sunIntensity
    }

    // Dynamic Distant Thunderstorm Lightning Simulation during rain
    let lightningFlash = 0.0
    if (weather === 'rain') {
      const tClock = state.clock.getElapsedTime()
      const cycle = tClock % 26.0
      if (cycle > 0.0 && cycle < 0.32) {
        lightningFlash = Math.sin((cycle / 0.32) * Math.PI) * 0.95
      } else if (cycle > 0.44 && cycle < 0.68) {
        lightningFlash = Math.sin(((cycle - 0.44) / 0.24) * Math.PI) * 0.72
      }
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.color.copy(currentLighting.ambientColor)
      let ambIntensity = currentLighting.ambientIntensity
      if (lightningFlash > 0.01) {
        ambIntensity += lightningFlash * 1.8
      }
      ambientLightRef.current.intensity = ambIntensity
    }

    if (hemiLightRef.current) {
      hemiLightRef.current.color.copy(currentLighting.hemiSkyColor)
      hemiLightRef.current.groundColor.copy(currentLighting.hemiGroundColor)
      let hemiInt = currentLighting.hemiIntensity
      if (lightningFlash > 0.01) {
        hemiInt += lightningFlash * 1.5
      }
      hemiLightRef.current.intensity = hemiInt
    }

    // Direct scene background & fog updates
    scene.background = currentLighting.skyHorizonColor
    if (scene.fog) {
      let fogCol = currentLighting.fogColor
      if (lightningFlash > 0.05) {
        fogCol = fogCol.clone().lerp(new THREE.Color('#cbd5e1'), lightningFlash * 0.65)
      }
      scene.fog.color.copy(fogCol)
      ;(scene.fog as THREE.FogExp2).density = currentLighting.fogDensity
    }

    // Update global atmospheric elevation fog and solar Mie scattering uniforms
    updateAtmosphericUniforms(
      currentLighting.sunDirection,
      currentLighting.sunColor,
      currentLighting.skyHorizonColor,
      currentLighting.isNight ? 0.15 : 0.48,
      lightningFlash
    )
  })

  // Sync reflection preset into telemetry store for vehicle reflections
  useEffect(() => {
    useTelemetryStore.getState().setTelemetry({ reflectionPreset: initialLighting.reflectionPreset })
  }, [initialLighting.reflectionPreset])

  // Initial Scene Fog initialization
  useEffect(() => {
    scene.fog = new THREE.FogExp2(initialLighting.fogColor, initialLighting.fogDensity)
    scene.background = initialLighting.skyHorizonColor
  }, [scene, initialLighting])

  // Textures for Precipitation
  const snowflakeTex = useMemo(() => createSnowflakeTexture(), [])
  const rainTex = useMemo(() => createRainTexture(), [])

  useEffect(() => {
    return () => {
      snowflakeTex.dispose()
      rainTex.dispose()
    }
  }, [snowflakeTex, rainTex])

  // GPU Precipitation Geometry (Allocated once, 0 CPU buffer updates)
  const isRain = weather === 'rain'
  const isSnow = weather === 'snow'
  const isPrecip = isRain || isSnow
  const precipCount = isSnow ? 2600 : 2000

  const precipGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(precipCount * 3)
    const phases = new Float32Array(precipCount)
    for (let i = 0; i < precipCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80
      phases[i] = Math.random() * Math.PI * 2
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    return geo
  }, [precipCount])

  useEffect(() => {
    return () => {
      precipGeo.dispose()
    }
  }, [precipGeo])

  const precipMatRef = useRef<THREE.ShaderMaterial>(null)
  useFrame((state) => {
    if (isPrecip && precipMatRef.current) {
      precipMatRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
      precipMatRef.current.uniforms.uCamPos.value.set(camera.position.x, camera.position.y, camera.position.z)
    }
  })

  const skyFollowRef = useRef<THREE.Group>(null)
  useFrame(() => {
    if (skyFollowRef.current) {
      skyFollowRef.current.position.set(camera.position.x, 0, camera.position.z)
    }
  })

  return (
    <>
      <primitive object={lightTargetRef.current || new THREE.Object3D()} ref={lightTargetRef} />

      {/* Dynamic Background Atmosphere Color */}
      <color attach="background" args={[initialLighting.skyHorizonColor]} />

      {/* Camera-Tracking SkyDome (prevents distance clipping & void) */}
      <group ref={skyFollowRef}>
        <Sky
          distance={3800}
          sunPosition={initialLighting.sunPosition}
          turbidity={initialLighting.isNight ? 0.1 : initialLighting.isSunset || initialLighting.isSunrise ? 3.4 : 2.0}
          rayleigh={initialLighting.isNight ? 0.1 : initialLighting.isSunset || initialLighting.isSunrise ? 3.2 : 2.2}
          mieCoefficient={0.01}
          mieDirectionalG={0.88}
        />
      </group>

      {/* Cosmic Celestial Night Sky: Stars, Milky Way, 3D Moon & Sun Disc */}
      <CosmicCelestialSky
        nightFactor={initialLighting.nightFactor}
        sunDiscPosition={initialLighting.sunPosition}
        moonPosition={initialLighting.moonPosition}
        isNight={initialLighting.isNight}
        isGoldenHour={initialLighting.isGoldenHour}
        weather={weather}
      />

      {/* Volumetric-Style Procedural Layered Clouds with Sunset Scattering */}
      <VolumetricClouds
        sunColor={initialLighting.cloudSunColor}
        shadowColor={initialLighting.cloudShadowColor}
        opacity={initialLighting.cloudOpacity}
        isNight={initialLighting.isNight}
        isSunset={initialLighting.isSunset}
        weather={weather}
      />

      {/* Expansive Animated Coastal Beach Ocean Surface (Only rendered in Coastal Biome!) */}
      <CoastalOcean isNight={initialLighting.isNight} currentBiome={currentResolvedBiome} />

      {/* Panoramic Distant Mountain Horizon & Atmospheric Ground Skirt */}
      <PanoramicMountainHorizon
        fogColor={initialLighting.fogColor}
        rockColor={biomeConfig.rockColor}
        isNight={initialLighting.isNight}
      />

      {/* High-Dynamic-Range Global Illumination for Car Paint & Metallic Surfaces (Instant Local Procedural Probe — 0 Network Lag) */}
      <Environment
        background={false}
        environmentIntensity={graphicsQuality === 'low' ? 0.35 : initialLighting.isNight ? 0.30 : 0.65}
      >
        <mesh scale={100}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial side={THREE.BackSide} color={initialLighting.hemiSkyColor} />
        </mesh>
        <directionalLight position={initialLighting.sunPosition} color={initialLighting.sunColor} intensity={2.0} />
        <ambientLight color={initialLighting.ambientColor} intensity={0.5} />
      </Environment>

      {/* Directional Sun/Moon Light with Texel-Snapped Player-Centered Shadow Frustum */}
      <directionalLight
        ref={dirLightRef}
        castShadow
        position={initialLighting.shadowCameraPosition}
        intensity={initialLighting.sunIntensity}
        color={initialLighting.sunColor}
        shadow-mapSize={graphicsQuality === 'low' ? [1024, 1024] : graphicsQuality === 'ultra' ? [4096, 4096] : [2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={220}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={65}
        shadow-camera-bottom={-50}
        shadow-bias={-0.00015}
        shadow-normalBias={0.035}
        shadow-radius={graphicsQuality === 'ultra' ? 3.0 : 2.5}
      >
        <orthographicCamera attach="shadow-camera" args={[-55, 55, 65, -50, 0.5, 220]} />
      </directionalLight>

      {/* Soft Ambient Fill Light (prevents vehicle panels & night roads from becoming black voids) */}
      <ambientLight
        ref={ambientLightRef}
        color={initialLighting.ambientColor}
        intensity={initialLighting.ambientIntensity}
      />

      {/* Atmospheric Fill Ambient / Hemisphere Lighting with Softened Ground Bounce */}
      <hemisphereLight
        ref={hemiLightRef}
        color={initialLighting.hemiSkyColor}
        groundColor={initialLighting.hemiGroundColor}
        intensity={initialLighting.hemiIntensity}
      />

      {/* GPU-Accelerated Precipitation Particles (Rain streaks or snow) */}
      {isPrecip && (
        <points geometry={precipGeo}>
          <shaderMaterial
            ref={precipMatRef}
            vertexShader={precipVertexShader}
            fragmentShader={precipFragmentShader}
            uniforms={{
              uTime: { value: 0 },
              uCamPos: { value: new THREE.Vector3() },
              uMap: { value: isSnow ? snowflakeTex : rainTex },
              uColor: { value: isSnow ? new THREE.Color('#ffffff') : new THREE.Color('#93c5fd') },
              uFallSpeed: { value: isSnow ? 5.8 : 36.0 },
              uDriftSpeed: { value: isSnow ? 2.4 : 0.4 },
              uHeightRange: { value: 40.0 },
              uAreaRadius: { value: 40.0 },
              uPointSize: { value: isSnow ? 12.0 : 16.0 },
              uBaseOpacity: { value: isSnow ? 0.85 : 0.75 },
            }}
            transparent
            depthWrite={false}
            blending={THREE.NormalBlending}
          />
        </points>
      )}

      {/* Post-Processing Pipeline based on Graphics Quality Settings */}
      {graphicsQuality === 'ultra' ? (
        <EffectComposer multisampling={2}>
          <SSAO
            resolutionScale={0.5}
            radius={0.30}
            intensity={18}
            luminanceInfluence={0.5}
            color={SSAO_COLOR}
            worldDistanceThreshold={75}
            worldDistanceFalloff={8}
            worldProximityThreshold={0.5}
            worldProximityFalloff={0.1}
          />
          <Bloom
            luminanceThreshold={1.30}
            luminanceSmoothing={0.20}
            intensity={0.26}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.42} darkness={0.22} />
        </EffectComposer>
      ) : graphicsQuality !== 'low' ? (
        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={1.30}
            luminanceSmoothing={0.20}
            intensity={graphicsQuality === 'medium' ? 0.16 : 0.20}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.42} darkness={0.22} />
        </EffectComposer>
      ) : null}
    </>
  )
}
