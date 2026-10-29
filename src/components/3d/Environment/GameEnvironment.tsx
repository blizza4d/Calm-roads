import { useMemo, useRef, useEffect, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useGameStore } from '../../../store/useGameStore'
import { BIOMES, getRoadCenter } from '../../../utils/roadMath'

// ------------------------------------------------------------------------
// Cosmic Night Sky Shaders: 3,500+ Twinkling Stars & Galactic Milky Way
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

    // Smooth Gaussian circular star disc with glowing center core
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

// Cosmic Sky Component: Centered on player camera, renders Stars, Milky Way and Glowing 3D Moon
function CosmicCelestialSky({
  sunHeight,
  moonPosition,
  isNight,
}: {
  sunHeight: number
  moonPosition: [number, number, number]
  isNight: boolean
}) {
  const { camera } = useThree()
  const skyGroupRef = useRef<THREE.Group>(null)
  const starMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const milkyWayMaterialRef = useRef<THREE.ShaderMaterial>(null)

  // Star Opacity transitions smoothly based on sun elevation
  // SunHeight: 1.0 (Noon, opacity 0.0) -> -0.1 (Twilight, 0.4) -> -0.2 (Night, 1.0)
  const nightFactor = useMemo(() => {
    if (sunHeight > 0.12) return 0.0
    if (sunHeight < -0.18) return 1.0
    return 1.0 - (sunHeight + 0.18) / 0.30
  }, [sunHeight])

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
      // Celestial coordinates (upper hemisphere only)
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(0.04 + 0.96 * v) // Elevated above horizon

      const x = domeRadius * Math.sin(phi) * Math.cos(theta)
      const y = domeRadius * Math.cos(phi)
      const z = domeRadius * Math.sin(phi) * Math.sin(theta)

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      // Stellar magnitude distribution: mostly faint stars, occasional brilliant navigation stars
      const magRand = Math.random()
      let size = 2.4 + Math.random() * 2.2
      if (magRand > 0.95) {
        size = 5.5 + Math.random() * 2.5 // Bright prominent stars
      } else if (magRand > 0.75) {
        size = 3.6 + Math.random() * 1.5
      }
      sizes[i] = size

      // Spectral color assignment
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

  // 2. Generate Milky Way Galactic Band (2,400 wispy interstellar dust & stellar core particles)
  const milkyWayGeo = useMemo(() => {
    const count = 2400
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    const r = 1750
    const inclination = 0.88 // ~50 degrees galactic plane tilt

    const palette = [
      new THREE.Color('#7c3aed'), // Deep cosmic violet
      new THREE.Color('#3b82f6'), // Ethereal blue
      new THREE.Color('#06b6d4'), // Cosmic cyan
      new THREE.Color('#fbbf24'), // Warm galactic core
      new THREE.Color('#cbd5e1'), // Faint stellar dust
    ]

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      // Gaussian lateral dispersion from galactic plane
      const disp = (Math.random() + Math.random() - 1.0) * 160
      const radialVar = (Math.random() - 0.5) * 80

      const rawX = (r + radialVar) * Math.cos(angle)
      const rawY = (r + radialVar) * Math.sin(angle) * Math.sin(inclination) + disp
      const rawZ = (r + radialVar) * Math.sin(angle) * Math.cos(inclination) + disp * 0.5

      // Only upper hemisphere
      const y = Math.max(80, rawY)

      positions[i * 3] = rawX
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = rawZ

      // Galactic core concentration near angle = 0 and angle = PI
      const isCore = Math.abs(Math.cos(angle)) > 0.65
      const col = isCore ? palette[3] : palette[Math.floor(Math.random() * palette.length)]

      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b

      sizes[i] = 12.0 + Math.random() * 24.0 // Soft large nebular puffs
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
      milkyWayMaterialRef.current.uniforms.uOpacity.value = nightFactor * 0.62
    }
  })

  // Cleanup geometries on unmount
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
          {/* Main Moon Sphere */}
          <mesh>
            <sphereGeometry args={[28, 24, 24]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
          {/* Outer Lunar Corona / Halo Ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[28, 56, 32]} />
            <meshBasicMaterial color="#93c5fd" transparent opacity={0.24} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  )
}

// ------------------------------------------------------------------------
// Panoramic Distant Mountain Horizon & Atmospheric Ground Skirt
// 1. DistantMountainHorizon: 360-degree panoramic alpine mountain silhouette ring with smooth aerial perspective
// 2. AtmosphericHorizonGround: Soft atmospheric ground skirt preventing Drei Sky black void
// ------------------------------------------------------------------------
function PanoramicMountainHorizon({
  fogColor,
  rockColor,
  isNight,
}: {
  fogColor: string
  rockColor: string
  isNight: boolean
}) {
  const { camera } = useThree()
  const ringGroupRef = useRef<THREE.Group>(null)

  const mountainGeo = useMemo(() => {
    const segments = 256
    const radius = 3850 // Positioned at far horizon perimeter, safely beyond active 4.8km terrain buffer
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    const fogCol = new THREE.Color(fogColor)
    const baseRock = new THREE.Color(rockColor)
    // Mountain summit color: natural rock gently tinted with atmospheric aerial haze
    const summitCol = isNight
      ? new THREE.Color('#0f172a').lerp(fogCol, 0.65)
      : baseRock.clone().multiplyScalar(0.72).lerp(fogCol, 0.68)
    const snowCol = isNight ? new THREE.Color('#1e293b') : new THREE.Color('#f8fafc').lerp(fogCol, 0.55)

    // Deep anchor base (y = -800m) to completely eliminate floating gaps
    const baseY = -800

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      const cosT = Math.cos(theta)
      const sinT = Math.sin(theta)

      const x = radius * sinT
      const z = radius * cosT

      // Multi-octave natural mountain peak silhouettes with rich stratified ridges
      const peakH =
        170 +
        Math.sin(theta * 3.0) * 70 +
        Math.cos(theta * 7.0 + 0.8) * 42 +
        Math.sin(theta * 13.0) * 25 +
        Math.cos(theta * 29.0) * 14 +
        Math.sin(theta * 53.0) * 6

      // Bottom vertex (deep horizon base)
      positions.push(x, baseY, z)
      colors.push(fogCol.r, fogCol.g, fogCol.b)

      // Top vertex (mountain summit)
      positions.push(x, peakH, z)
      const col = peakH > 220 ? snowCol : summitCol
      colors.push(col.r, col.g, col.b)
    }

    // Inward-facing winding: (b1, t1, b2) and (t1, t2, b2)
    // Ensures all vertex normals point consistently INWARDS towards the camera
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

  // Track camera in X, Z and damped Y so mountains stay anchored to visual horizon
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
      {/* 360-Degree Panoramic Mountain Horizon Silhouettes */}
      <mesh geometry={mountainGeo} renderOrder={-1}>
        <meshBasicMaterial vertexColors side={THREE.FrontSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ------------------------------------------------------------------------
// Realistic Coastal Beach Ocean Surface: Dynamic animated sea surface with wave swells & specular highlights
// ------------------------------------------------------------------------
function CoastalOcean({ isNight, currentBiome }: { isNight: boolean; currentBiome: string }) {
  const { camera } = useThree()
  const oceanRef = useRef<THREE.Mesh>(null)

  const isCoastal = currentBiome === 'coastal'

  const oceanGeo = useMemo(() => {
    // Spans 2,600m in X and 3,800m in Z with subdivisions for natural undulating swells
    const geo = new THREE.PlaneGeometry(2600, 3800, 48, 48)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  useFrame((state) => {
    if (oceanRef.current && isCoastal) {
      const roadCx = getRoadCenter(camera.position.z)
      // Anchored at sea level Y = 0.0, strictly on the seaward side:
      // Center of ocean plane is placed at roadCx - 1380m so nearest edge is 80m from road,
      // completely on the ocean side of the beach dunes!
      oceanRef.current.position.set(roadCx - 1380, 0.0, camera.position.z)

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
        color={isNight ? '#061325' : '#0d5c75'}
        roughness={0.22}
        metalness={0.12}
        envMapIntensity={isNight ? 0.6 : 1.2}
        transparent
        opacity={0.88}
        depthWrite={false}
      />
    </mesh>
  )
}

// ------------------------------------------------------------------------
// Procedural Precipitation Textures (Soft Circular Alpha Maps)
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

export default function GameEnvironment() {
  // Discrete Zustand selectors to prevent 60fps React re-renders from telemetry updates
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay)
  const autoTimeCycle = useGameStore((s) => s.autoTimeCycle)
  const weather = useGameStore((s) => s.weather)
  const currentResolvedBiome = useGameStore((s) => s.currentResolvedBiome)
  const graphicsQuality = useGameStore((s) => s.graphicsQuality)
  const { scene, camera } = useThree()

  // Directional Light & Shadow target
  const dirLightRef = useRef<THREE.DirectionalLight>(null)
  const lightTargetRef = useRef<THREE.Object3D>(null)
  const timeOfDayRef = useRef(timeOfDay)
  const lastDispatchedTime = useRef(timeOfDay)

  // Auto-advance time of day smoothly for directional lighting, throttling Zustand dispatches to avoid 60fps React rerenders
  useFrame((_, delta) => {
    if (autoTimeCycle) {
      timeOfDayRef.current = (timeOfDayRef.current + delta * (24 / 720)) % 24
      if (Math.abs(timeOfDayRef.current - lastDispatchedTime.current) > 0.08) {
        lastDispatchedTime.current = timeOfDayRef.current
        setTimeOfDay(timeOfDayRef.current)
      }
    } else {
      timeOfDayRef.current = timeOfDay
      lastDispatchedTime.current = timeOfDay
    }
  })

  // Calculate sun & sky position from 24-hour time
  // 6:00 = Sunrise, 12:00 = Noon, 18:00 = Sunset, 24:00 = Midnight
  const celestialData = useMemo(() => {
    const angle = ((timeOfDay - 6) / 24) * Math.PI * 2
    const sunHeight = Math.sin(angle) // -1 (midnight) to +1 (noon)
    const sunEastWest = Math.cos(angle)

    // Preetham atmospheric scattering model requires celestial coordinates (~400,000m scale)
    // to correctly evaluate sunfade, Rayleigh scattering, and ozone absorption
    const skySunDist = 400000
    const skySunX = sunEastWest * skySunDist
    const skySunY = sunHeight * skySunDist
    const skySunZ = -150000

    const isNight = sunHeight < -0.06
    const isSunsetOrSunrise = Math.abs(sunHeight) < 0.24

    // Directional Light position for tight shadow frustum (follows player)
    const lightDist = 65
    const lightX = isNight ? -sunEastWest * 45 : sunEastWest * lightDist
    const lightY = isNight ? Math.max(26, -sunHeight * 55) : Math.max(16, sunHeight * lightDist)
    const lightZ = isNight ? 20 : -20

    let lightColor = '#fffdf8'
    let lightIntensity = 3.2
    let skyTurbidity = 2.0
    let skyRayleigh = 2.2

    if (isNight) {
      lightColor = '#93c5fd' // Cool silver-blue moonlight
      lightIntensity = 0.75
      skyTurbidity = 0.1
      skyRayleigh = 0.1
    } else if (isSunsetOrSunrise) {
      lightColor = '#fed7aa' // Warm golden amber sunlight
      lightIntensity = 2.9
      skyTurbidity = 3.4
      skyRayleigh = 3.2
    }

    if (weather === 'rain') {
      lightIntensity *= 0.52
      lightColor = '#94a3b8'
      skyTurbidity = 4.2
      skyRayleigh = 1.2
    } else if (weather === 'mist') {
      lightIntensity *= 0.65
      skyTurbidity = 5.0
    }

    // Moon position placed opposite the sun on the celestial dome
    const moonDist = 1200
    const moonAngle = angle + Math.PI
    const moonX = Math.cos(moonAngle) * moonDist
    const moonY = Math.max(180, Math.sin(moonAngle) * moonDist * 0.8)
    const moonZ = -Math.sin(moonAngle) * 350

    return {
      skySunPos: [skySunX, skySunY, skySunZ] as [number, number, number],
      lightPos: [lightX, lightY, lightZ] as [number, number, number],
      moonPos: [moonX, moonY, moonZ] as [number, number, number],
      sunHeight,
      lightColor,
      lightIntensity,
      isNight,
      skyTurbidity,
      skyRayleigh,
    }
  }, [timeOfDay, weather])

  // Biome and Weather lighting modifications
  const biomeConfig = BIOMES[currentResolvedBiome] || BIOMES.forest

  // Dynamic Sky & Atmosphere Background Color with smooth 24h chromatic interpolation
  const skyColor = useMemo(() => {
    const isNight = celestialData.isNight
    if (weather === 'snow' || (weather === 'clear' && (currentResolvedBiome === 'twisted_mountains' || currentResolvedBiome === 'tundra'))) {
      return isNight ? '#141824' : '#cbd5e1'
    }
    if (weather === 'rain') return isNight ? '#0b0f19' : '#1e293b'
    if (weather === 'mist') return isNight ? '#0f172a' : '#64748b'

    const t = timeOfDay // 0 to 24
    if (t < 5.0 || t > 21.5) {
      // Celestial night
      return '#030712'
    } else if (t >= 5.0 && t < 7.0) {
      // Dawn rose-gold transition
      const f = (t - 5.0) / 2.0
      return '#' + new THREE.Color('#030712').lerp(new THREE.Color('#e87958'), f).getHexString()
    } else if (t >= 7.0 && t < 9.5) {
      // Morning transition to crisp daylight
      const f = (t - 7.0) / 2.5
      return '#' + new THREE.Color('#e87958').lerp(new THREE.Color(biomeConfig.skyHemiSky || '#38bdf8'), f).getHexString()
    } else if (t >= 9.5 && t < 16.5) {
      // Pure daylight tuned to biome palette
      return biomeConfig.skyHemiSky || '#38bdf8'
    } else if (t >= 16.5 && t < 19.5) {
      // Golden Hour to Warm Sunset
      const f = (t - 16.5) / 3.0
      return '#' + new THREE.Color(biomeConfig.skyHemiSky || '#38bdf8').lerp(new THREE.Color('#e0833a'), f).getHexString()
    } else {
      // Dusk to Night
      const f = (t - 19.5) / 2.0
      return '#' + new THREE.Color('#e0833a').lerp(new THREE.Color('#030712'), f).getHexString()
    }
  }, [weather, timeOfDay, celestialData.isNight, currentResolvedBiome, biomeConfig.skyHemiSky])

  // Calibrated atmospheric aerial perspective exponential fog density
  const fogDensity = useMemo(() => {
    if (weather === 'snow') return 0.0028
    if (weather === 'mist') return 0.0035
    if (weather === 'rain') return 0.0016
    if (biomeConfig.fogDensity) {
      return celestialData.isNight ? biomeConfig.fogDensity * 0.75 : biomeConfig.fogDensity
    }
    if (celestialData.isNight) return 0.00085
    return 0.00045
  }, [weather, biomeConfig.fogDensity, celestialData.isNight])

  // Sync background color directly to scene to prevent canvas black void
  useEffect(() => {
    scene.background = new THREE.Color(skyColor)
  }, [scene, skyColor])

  // Player-following directional light with smooth target tracking
  useFrame(() => {
    if (dirLightRef.current && lightTargetRef.current) {
      const cx = camera.position.x
      const cy = camera.position.y
      const cz = camera.position.z

      dirLightRef.current.position.set(
        cx + celestialData.lightPos[0],
        cy + celestialData.lightPos[1],
        cz + celestialData.lightPos[2]
      )
      lightTargetRef.current.position.set(cx, cy, cz - 10)
      dirLightRef.current.target = lightTargetRef.current
      dirLightRef.current.target.updateMatrixWorld()
    }
  })

  // Procedurally generated circular alpha map textures for particles
  const snowflakeTex = useMemo(() => createSnowflakeTexture(), [])
  const rainTex = useMemo(() => createRainTexture(), [])

  useEffect(() => {
    return () => {
      snowflakeTex.dispose()
      rainTex.dispose()
    }
  }, [snowflakeTex, rainTex])

  // Precipitation Particles (Rain streaks or gentle drifting snow)
  const isRain = weather === 'rain'
  const isSnow =
    weather === 'snow' ||
    (weather === 'clear' && (currentResolvedBiome === 'twisted_mountains' || currentResolvedBiome === 'tundra'))
  const isPrecip = isRain || isSnow
  const particleCount = isSnow ? 2800 : 2000

  const precipGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80
      pos[i * 3 + 1] = (Math.random() - 0.25) * 40 // -10 to +30 relative to camera
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return geo
  }, [particleCount])

  useEffect(() => {
    return () => {
      precipGeo.dispose()
    }
  }, [precipGeo])

  const precipPointsRef = useRef<THREE.Points>(null)
  useFrame((_, delta) => {
    if (isPrecip && precipPointsRef.current) {
      const positions = precipPointsRef.current.geometry.attributes.position.array as Float32Array
      const camPos = camera.position
      // Center particle emitter precisely on camera position (X, Y, Z) so it follows hills and elevation
      precipPointsRef.current.position.set(camPos.x, camPos.y, camPos.z)

      const fallSpeed = isSnow ? 6.5 : 36.0
      const driftSpeed = isSnow ? 2.4 : 0.0

      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3
        positions[idx + 1] -= fallSpeed * delta

        if (isSnow) {
          // Dynamic organic drift & swirling around camera frustum
          positions[idx] += Math.sin((positions[idx + 1] + i) * 0.35) * driftSpeed * delta
          positions[idx + 2] += Math.cos((positions[idx + 1] + i) * 0.28) * (driftSpeed * 0.6) * delta
        }

        // Loop vertically relative to camera: when particle falls below -10m relative to camera, wrap to +30m
        if (positions[idx + 1] < -10) {
          positions[idx + 1] += 40
          positions[idx] = (Math.random() - 0.5) * 80
          positions[idx + 2] = (Math.random() - 0.5) * 80
        }

        // Horizontal boundary wrap within ±40m of camera
        if (positions[idx] < -40) positions[idx] += 80
        else if (positions[idx] > 40) positions[idx] -= 80
        if (positions[idx + 2] < -40) positions[idx + 2] += 80
        else if (positions[idx + 2] > 40) positions[idx + 2] -= 80
      }
      precipPointsRef.current.geometry.attributes.position.needsUpdate = true
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

      {/* Dynamic Background Atmosphere Color (Restores Sky from Black Void) */}
      <color attach="background" args={[skyColor]} />

      {/* Calibrated atmospheric aerial perspective fog: preserves rich horizon depth up to 4km without flat walls */}
      <fogExp2 attach="fog" args={[skyColor, fogDensity]} />

      {/* Camera-Tracking SkyDome (prevents distance clipping & void) */}
      <group ref={skyFollowRef}>
        <Sky
          distance={3800}
          sunPosition={celestialData.skySunPos}
          turbidity={celestialData.skyTurbidity}
          rayleigh={celestialData.skyRayleigh}
          mieCoefficient={0.01}
          mieDirectionalG={0.88}
        />
      </group>

      {/* Cosmic Celestial Night Sky: 3,600 Twinkling Stars, Milky Way & 3D Moon */}
      <CosmicCelestialSky
        sunHeight={celestialData.sunHeight}
        moonPosition={celestialData.moonPos}
        isNight={celestialData.isNight}
      />

      {/* Expansive Animated Coastal Beach Ocean Surface (Only rendered in Coastal Biome!) */}
      <CoastalOcean isNight={celestialData.isNight} currentBiome={currentResolvedBiome} />

      {/* Panoramic Distant Mountain Horizon & Atmospheric Ground Skirt */}
      <PanoramicMountainHorizon
        fogColor={skyColor}
        rockColor={biomeConfig.rockColor}
        isNight={celestialData.isNight}
      />

      {/* High-Dynamic-Range Global Illumination for Car Paint & Metallic Surfaces */}
      <Suspense fallback={null}>
        <Environment
          preset="forest"
          background={false}
          environmentIntensity={graphicsQuality === 'low' ? 0.75 : celestialData.isNight ? 0.55 : 1.20}
        />
      </Suspense>

      {/* Directional Sun/Moon Light with Tight Player-Centered Shadow Frustum & Zero Surface Acne */}
      <directionalLight
        ref={dirLightRef}
        castShadow
        position={celestialData.lightPos}
        intensity={celestialData.lightIntensity}
        color={celestialData.lightColor}
        shadow-mapSize={graphicsQuality === 'low' ? [1024, 1024] : [2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={65}
        shadow-camera-bottom={-50}
        shadow-bias={-0.00015}
        shadow-normalBias={0.035}
        shadow-radius={2.5}
      >
        <orthographicCamera attach="shadow-camera" args={[-55, 55, 65, -50, 0.5, 200]} />
      </directionalLight>

      {/* Soft Ambient Fill Light (eliminates harsh pitch-black crevices in terrain shadows) */}
      <ambientLight
        color={celestialData.isNight ? '#38bdf8' : '#fed7aa'}
        intensity={celestialData.isNight ? 0.45 : 0.68}
      />

      {/* Atmospheric Fill Ambient / Hemisphere Lighting with Softened Ground Bounce */}
      <hemisphereLight
        color={celestialData.isNight ? '#93c5fd' : biomeConfig.skyHemiSky}
        groundColor={celestialData.isNight ? '#334155' : (biomeConfig.skyHemiGround || '#64748b')}
        intensity={celestialData.isNight ? 0.65 : 1.25}
      />

      {/* Rain or Snow Particles with Soft Circular Alpha Map */}
      {isPrecip && (
        <points ref={precipPointsRef} geometry={precipGeo}>
          <pointsMaterial
            map={isSnow ? snowflakeTex : rainTex}
            color={isSnow ? '#ffffff' : '#93c5fd'}
            size={isSnow ? 0.45 : 0.22}
            transparent={true}
            opacity={isSnow ? 0.92 : 0.75}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* Cinematic Post-Processing Pass (Bypassed on low-end hardware for peak 60fps) */}
      {graphicsQuality !== 'low' && (
        <EffectComposer multisampling={graphicsQuality === 'medium' ? 1 : 2}>
          <Bloom luminanceThreshold={0.92} intensity={graphicsQuality === 'medium' ? 0.32 : 0.45} mipmapBlur />
          <Vignette eskil={false} offset={0.42} darkness={0.22} />
        </EffectComposer>
      )}
    </>
  )
}
