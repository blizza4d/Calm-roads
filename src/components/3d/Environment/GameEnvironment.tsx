import { useMemo, useRef, useEffect, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useGameStore } from '../../../store/useGameStore'
import { BIOMES } from '../../../utils/roadMath'

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
// 1. DistantMountainHorizon: 360-degree panoramic alpine mountain silhouette ring
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
    const segments = 128
    const radius = 3000
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    const fogCol = new THREE.Color(fogColor)
    const baseRock = new THREE.Color(rockColor)
    // Mountain summit color: natural rock tinted with atmospheric fog
    const summitCol = isNight
      ? new THREE.Color('#0f172a').lerp(fogCol, 0.4)
      : baseRock.clone().multiplyScalar(0.72).lerp(fogCol, 0.45)
    const snowCol = isNight ? new THREE.Color('#1e293b') : new THREE.Color('#f8fafc').lerp(fogCol, 0.35)

    // Deep anchor base (y = -500m) to completely eliminate floating gaps
    const baseY = -500

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      const cosT = Math.cos(theta)
      const sinT = Math.sin(theta)

      const x = radius * sinT
      const z = radius * cosT

      // Multi-octave natural mountain peak silhouettes with variable heights
      const peakH =
        220 +
        Math.sin(theta * 3.0) * 85 +
        Math.cos(theta * 7.0 + 1.2) * 55 +
        Math.sin(theta * 13.0) * 32 +
        Math.cos(theta * 23.0) * 18

      // Bottom vertex (deep horizon base)
      positions.push(x, baseY, z)
      colors.push(fogCol.r, fogCol.g, fogCol.b)

      // Top vertex (mountain summit)
      positions.push(x, peakH, z)
      const col = peakH > 290 ? snowCol : summitCol
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
      ringGroupRef.current.position.set(camera.position.x, camera.position.y * 0.35, camera.position.z)
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
      <mesh geometry={mountainGeo}>
        <meshBasicMaterial vertexColors side={THREE.FrontSide} depthWrite={true} />
      </mesh>
    </group>
  )
}

// ------------------------------------------------------------------------
// Procedural Cloud Layer: 32 merged cumulus cloud clusters in upper troposphere (1 draw call)
// ------------------------------------------------------------------------
function ProceduralCloudLayer({
  celestialPhase,
}: {
  celestialPhase: string
}) {
  const { camera } = useThree()
  const cloudGroupRef = useRef<THREE.Group>(null)

  // Construct single merged BufferGeometry for all cloud clusters
  const cloudsGeo = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = []
    const baseGeo = new THREE.DodecahedronGeometry(1, 1)

    // Deterministic pseudo-random seed generator
    let seed = 77
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    const clusterCount = 32
    for (let c = 0; c < clusterCount; c++) {
      const angle = (c / clusterCount) * Math.PI * 2 + rnd() * 0.18
      const dist = 520 + rnd() * 880
      const cx = Math.cos(angle) * dist
      const cz = Math.sin(angle) * dist
      const cy = 340 + rnd() * 110

      // Each cluster consists of 5 to 7 flattened intersecting puffs
      const puffs = 5 + Math.floor(rnd() * 3)
      for (let p = 0; p < puffs; p++) {
        const puffGeo = baseGeo.clone()
        const px = cx + (rnd() - 0.5) * 160
        const py = cy + (rnd() - 0.5) * 32
        const pz = cz + (rnd() - 0.5) * 160
        const sx = 65 + rnd() * 75
        const sy = 24 + rnd() * 32
        const sz = 65 + rnd() * 75

        puffGeo.scale(sx, sy, sz)
        puffGeo.translate(px, py, pz)
        geometries.push(puffGeo)
      }
    }

    baseGeo.dispose()
    const merged = mergeGeometries(geometries)
    geometries.forEach((g) => g.dispose())
    return merged
  }, [])

  useEffect(() => {
    return () => {
      if (cloudsGeo) cloudsGeo.dispose()
    }
  }, [cloudsGeo])

  // Atmospheric color & opacity based on celestial phase
  const cloudColor = useMemo(() => {
    if (celestialPhase === 'night') return '#1e293b'
    if (celestialPhase === 'sunset') return '#fed7aa'
    if (celestialPhase === 'sunrise') return '#fecdd3'
    return '#f8fafc'
  }, [celestialPhase])

  const cloudOpacity = useMemo(() => {
    if (celestialPhase === 'night') return 0.42
    if (celestialPhase === 'sunset') return 0.92
    return 0.88
  }, [celestialPhase])

  // Gentle atmospheric rotation & camera-tracking
  useFrame((state) => {
    if (cloudGroupRef.current) {
      cloudGroupRef.current.position.set(camera.position.x, 0, camera.position.z)
      cloudGroupRef.current.rotation.y = state.clock.getElapsedTime() * 0.0028
    }
  })

  if (!cloudsGeo) return null

  return (
    <group ref={cloudGroupRef}>
      <mesh geometry={cloudsGeo}>
        <meshLambertMaterial
          color={cloudColor}
          transparent
          opacity={cloudOpacity}
          depthWrite={false}
          flatShading
        />
      </mesh>
    </group>
  )
}

export default function GameEnvironment() {
  const { timeOfDay, setTimeOfDay, autoTimeCycle, weather, currentResolvedBiome, graphicsQuality } = useGameStore()
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

    const sunDistance = 100
    const sunY = sunHeight * sunDistance
    const sunX = sunEastWest * sunDistance
    const sunZ = -25

    const isNight = sunHeight < -0.06
    const isSunsetOrSunrise = Math.abs(sunHeight) < 0.24

    // Directional Light position:
    // Follows the sun during day; during night, shines as moonlight
    const lightX = isNight ? -sunX * 0.75 : sunX
    const lightY = isNight ? Math.max(28, -sunY * 0.85) : Math.max(8, sunY)
    const lightZ = isNight ? -sunZ : sunZ

    let lightColor = '#fffdf8'
    let lightIntensity = 2.6
    let skyTurbidity = 2.0
    let skyRayleigh = 1.1

    if (isNight) {
      lightColor = '#93c5fd' // Cool silver-blue moonlight
      lightIntensity = 0.65
      skyTurbidity = 0.05
      skyRayleigh = 0.05
    } else if (isSunsetOrSunrise) {
      lightColor = '#fed7aa' // Warm golden amber sunlight
      lightIntensity = 2.4
      skyTurbidity = 2.8
      skyRayleigh = 1.6
    }

    if (weather === 'rain') {
      lightIntensity *= 0.52
      lightColor = '#94a3b8'
    } else if (weather === 'mist') {
      lightIntensity *= 0.65
    }

    // Moon position placed opposite the sun on the celestial dome
    const moonDist = 1200
    const moonAngle = angle + Math.PI
    const moonX = Math.cos(moonAngle) * moonDist
    const moonY = Math.max(180, Math.sin(moonAngle) * moonDist * 0.8)
    const moonZ = -Math.sin(moonAngle) * 350

    return {
      skySunPos: [sunX, sunY, sunZ] as [number, number, number],
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

  // Dynamic Sky Background Color (Guarantees zero black void across day/night and weather cycles)
  const skyColor = useMemo(() => {
    if (weather === 'snow') return '#cbd5e1'
    if (weather === 'rain') return '#1e293b'
    if (weather === 'mist') return '#64748b'
    if (celestialData.isNight) return '#030712'
    if (timeOfDay >= 17 && timeOfDay <= 19.5) return '#c2410c' // Sunset amber
    if (timeOfDay >= 5.0 && timeOfDay <= 7.5) return '#e11d48' // Sunrise crimson
    return '#38bdf8' // Crisp daylight cyan-blue
  }, [weather, celestialData.isNight, timeOfDay])

  // Sync background color directly to scene to prevent canvas black void
  useEffect(() => {
    scene.background = new THREE.Color(skyColor)
  }, [scene, skyColor])

  // Atmospheric Fog
  const fogColor = useMemo(() => {
    if (weather === 'snow') return '#e2e8f0'
    if (weather === 'rain') return '#334155'
    if (weather === 'mist') return '#94a3b8'
    if (celestialData.isNight) return '#050811'
    if (timeOfDay >= 17 && timeOfDay <= 19.5) return '#c27845' // Natural sunset mist
    return biomeConfig.fogColor
  }, [weather, celestialData.isNight, timeOfDay, biomeConfig])

  const fogDensity = useMemo(() => {
    if (weather === 'mist') return 0.0022
    if (weather === 'rain') return 0.0012
    if (weather === 'snow') return 0.0009
    return biomeConfig.fogDensity
  }, [weather, biomeConfig])

  // Discrete celestial phase key: only regenerate PMREM environment map when phase shifts
  const celestialPhase = useMemo(() => {
    if (celestialData.isNight) return 'night'
    if (timeOfDay >= 16.5 && timeOfDay <= 19.5) return 'sunset'
    if (timeOfDay >= 5.0 && timeOfDay <= 7.5) return 'sunrise'
    return 'day'
  }, [celestialData.isNight, timeOfDay])

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
      lightTargetRef.current.position.set(cx, cy, cz - 18)
      dirLightRef.current.target = lightTargetRef.current
      dirLightRef.current.target.updateMatrixWorld()
    }
  })

  // Precipitation Particles (Rain streaks or gentle drifting snow)
  const particleCount = 2000
  const isRain = weather === 'rain'
  const isSnow = weather === 'snow'
  const isPrecip = isRain || isSnow

  const precipGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 85
      pos[i * 3 + 1] = Math.random() * 36
      pos[i * 3 + 2] = (Math.random() - 0.5) * 85
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return geo
  }, [])

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
      precipPointsRef.current.position.set(camPos.x, 0, camPos.z)

      const fallSpeed = isSnow ? 7.2 : 36.0
      const driftSpeed = isSnow ? 2.2 : 0.0

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] -= fallSpeed * delta
        if (isSnow) {
          positions[i * 3] += Math.sin(positions[i * 3 + 1] * 0.45) * driftSpeed * delta
        }
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 36
        }
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

      {/* Atmospheric Fog */}
      <fogExp2 attach="fog" args={[fogColor, fogDensity]} />

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

      {/* Procedural Tropospheric Cloud Canopy (32 merged clusters, 1 draw call) */}
      <ProceduralCloudLayer celestialPhase={celestialPhase} />

      {/* Cosmic Celestial Night Sky: 3,600 Twinkling Stars, Milky Way & 3D Moon */}
      <CosmicCelestialSky
        sunHeight={celestialData.sunHeight}
        moonPosition={celestialData.moonPos}
        isNight={celestialData.isNight}
      />

      {/* Panoramic Distant Mountain Horizon & Atmospheric Ground Skirt */}
      <PanoramicMountainHorizon
        fogColor={fogColor}
        rockColor={biomeConfig.rockColor}
        isNight={celestialData.isNight}
      />

      {/* High-Dynamic-Range Global Illumination for Car Paint & Metallic Surfaces */}
      <Suspense fallback={null}>
        <Environment
          preset={
            celestialPhase === 'night'
              ? 'night'
              : celestialPhase === 'sunset'
              ? 'sunset'
              : celestialPhase === 'sunrise'
              ? 'dawn'
              : 'forest'
          }
          background={false}
          environmentIntensity={graphicsQuality === 'low' ? 0.9 : 1.25}
        />
      </Suspense>

      {/* Directional Sun/Moon Light with Soft Shadows & Zero Surface Acne */}
      <directionalLight
        ref={dirLightRef}
        castShadow
        position={celestialData.lightPos}
        intensity={celestialData.lightIntensity}
        color={celestialData.lightColor}
        shadow-mapSize={graphicsQuality === 'low' ? [1024, 1024] : [2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={280}
        shadow-bias={-0.00012}
        shadow-normalBias={0.038}
        shadow-radius={3.5}
      >
        <orthographicCamera attach="shadow-camera" args={[-70, 70, 70, -70, 0.5, 280]} />
      </directionalLight>

      {/* Atmospheric Fill Ambient / Hemisphere Lighting */}
      <hemisphereLight
        color={celestialData.isNight ? '#93c5fd' : biomeConfig.skyHemiSky}
        groundColor={celestialData.isNight ? '#1e293b' : biomeConfig.skyHemiGround}
        intensity={celestialData.isNight ? 0.48 : 0.98}
      />

      {/* Rain or Snow Particles */}
      {isPrecip && (
        <points ref={precipPointsRef} geometry={precipGeo}>
          <pointsMaterial
            color={isSnow ? '#ffffff' : '#93c5fd'}
            size={isSnow ? 0.38 : 0.16}
            transparent
            opacity={isSnow ? 0.9 : 0.72}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* Cinematic Post-Processing Pass */}
      <EffectComposer multisampling={graphicsQuality === 'low' ? 0 : graphicsQuality === 'medium' ? 2 : 4}>
        <Bloom luminanceThreshold={0.92} intensity={graphicsQuality === 'low' ? 0.35 : 0.48} mipmapBlur />
        <Vignette eskil={false} offset={0.42} darkness={0.22} />
      </EffectComposer>
    </>
  )
}
