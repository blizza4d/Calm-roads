import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, SSAO } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useGameStore, useTelemetryStore } from '../../../store/useGameStore'
import { BIOMES, getRoadCenter, BiomeType } from '../../../utils/roadMath'

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

const SSAO_COLOR = new THREE.Color('#0b101b')

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
// Mesh geometry topology is memoized by biomeId only.
// Vertex colors are updated in-place without disposing or re-allocating GPU buffers.
// ------------------------------------------------------------------------
function PanoramicMountainHorizon({
  fogColor,
  rockColor,
  isNight,
  biomeId = 'forest',
}: {
  fogColor: string
  rockColor: string
  isNight: boolean
  biomeId?: BiomeType
}) {
  const { camera } = useThree()
  const ringGroupRef = useRef<THREE.Group>(null)

  const mountainGeo = useMemo(() => {
    const segments = 256
    const radius = 3850 // Positioned at far horizon perimeter, safely beyond active 4.8km terrain buffer
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    const baseY = -800

    const isPlains = biomeId === 'plains'
    const isDesert = biomeId === 'desert'
    const isCoastal = biomeId === 'coastal'
    const isRollingHills = biomeId === 'rolling_hills'
    const isSnowyAlpine = biomeId === 'twisted_mountains' || biomeId === 'alpine' || biomeId === 'tundra'

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2
      const cosT = Math.cos(theta)
      const sinT = Math.sin(theta)

      const x = radius * sinT
      const z = radius * cosT

      let peakH = 140

      if (isPlains) {
        // Expansive low rolling prairie knolls and distant grassland rises (NO alpine peaks or snow)
        peakH =
          52 +
          Math.sin(theta * 2.0) * 24 +
          Math.cos(theta * 5.0 + 0.4) * 14 +
          Math.sin(theta * 9.0) * 8 +
          Math.cos(theta * 19.0) * 4
      } else if (isDesert) {
        // Flat-topped sandstone mesas and terraced canyon bluffs
        const rawMesa = Math.sin(theta * 4.0)
        const mesa = Math.tanh(rawMesa * 3.5) * 60 + Math.cos(theta * 8.0) * 22 + Math.sin(theta * 16.0) * 10
        peakH = 125 + mesa
      } else if (isCoastal) {
        // Gentle coastal headlands and ocean dunes
        peakH =
          68 +
          Math.sin(theta * 2.5) * 26 +
          Math.cos(theta * 6.0) * 14 +
          Math.sin(theta * 11.0) * 8
      } else if (isRollingHills) {
        // Soft rounded undulating hills
        peakH =
          90 +
          Math.sin(theta * 3.0) * 38 +
          Math.cos(theta * 7.0) * 18 +
          Math.sin(theta * 14.0) * 10
      } else if (isSnowyAlpine) {
        // Dramatic alpine peaks with snow caps
        peakH =
          185 +
          Math.sin(theta * 3.0) * 75 +
          Math.cos(theta * 7.0 + 0.8) * 45 +
          Math.sin(theta * 13.0) * 25 +
          Math.cos(theta * 29.0) * 14 +
          Math.sin(theta * 53.0) * 6
      } else {
        // Forest / Autumn / Enchanted: layered forested foothills
        peakH =
          135 +
          Math.sin(theta * 3.0) * 48 +
          Math.cos(theta * 6.5) * 28 +
          Math.sin(theta * 12.0) * 15
      }

      // Bottom vertex (deep horizon base)
      positions.push(x, baseY, z)
      colors.push(0, 0, 0)

      // Top vertex (mountain / hill summit)
      positions.push(x, peakH, z)
      colors.push(0, 0, 0)
    }

    // Inward-facing winding: ensures all vertex normals point consistently INWARDS towards camera
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
  }, [biomeId])

  // In-place vertex color updates without re-allocating or disposing GPU buffer
  useEffect(() => {
    const colorAttr = mountainGeo.attributes.color as THREE.BufferAttribute | undefined
    const posAttr = mountainGeo.attributes.position as THREE.BufferAttribute | undefined
    if (!colorAttr || !posAttr) return

    const colors = colorAttr.array as Float32Array
    const positions = posAttr.array as Float32Array

    const fogCol = new THREE.Color(fogColor)
    const baseRock = new THREE.Color(rockColor)
    const summitCol = isNight
      ? new THREE.Color('#0f172a').lerp(fogCol, 0.65)
      : baseRock.clone().multiplyScalar(0.72).lerp(fogCol, 0.68)
    const snowCol = isNight ? new THREE.Color('#1e293b') : new THREE.Color('#f8fafc').lerp(fogCol, 0.55)

    const isPlains = biomeId === 'plains'
    const isDesert = biomeId === 'desert'
    const isCoastal = biomeId === 'coastal'
    const isRollingHills = biomeId === 'rolling_hills'
    const isSnowyAlpine = biomeId === 'twisted_mountains' || biomeId === 'alpine' || biomeId === 'tundra'

    const prairieSummit = isNight
      ? new THREE.Color('#0d1810').lerp(fogCol, 0.65)
      : new THREE.Color('#4a6b2f').lerp(fogCol, 0.68)
    const desertSummit = isNight
      ? new THREE.Color('#1f1510').lerp(fogCol, 0.65)
      : new THREE.Color('#a15c15').lerp(fogCol, 0.68)
    const coastalSummit = isNight
      ? new THREE.Color('#0b1320').lerp(fogCol, 0.65)
      : new THREE.Color('#3b754a').lerp(fogCol, 0.70)
    const hillsSummit = isNight
      ? new THREE.Color('#0f1b13').lerp(fogCol, 0.65)
      : new THREE.Color('#386641').lerp(fogCol, 0.70)

    const segments = 256
    for (let i = 0; i <= segments; i++) {
      const bIdx = (i * 2) * 3
      const tIdx = (i * 2 + 1) * 3
      const peakH = positions[tIdx + 1]

      let col = summitCol
      if (isPlains) col = prairieSummit
      else if (isDesert) col = desertSummit
      else if (isCoastal) col = coastalSummit
      else if (isRollingHills) col = hillsSummit
      else if (isSnowyAlpine) col = peakH > 210 ? snowCol : summitCol

      // Base vertex color = fogCol
      colors[bIdx] = fogCol.r
      colors[bIdx + 1] = fogCol.g
      colors[bIdx + 2] = fogCol.b

      // Summit vertex color = col
      colors[tIdx] = col.r
      colors[tIdx + 1] = col.g
      colors[tIdx + 2] = col.b
    }

    colorAttr.needsUpdate = true
  }, [mountainGeo, fogColor, rockColor, isNight, biomeId])

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
// Procedural PMREM Offline Environment Probe
// Eliminates remote CDN network fetches, zero suspense, zero null-environment drops
// Generates an atmospheric equirectangular gradient dynamically mapped to scene.environment
// ------------------------------------------------------------------------
function ProceduralEnvironmentProbe({
  skyColor,
  fogColor,
  lightColor,
  lightPos,
  isNight,
  groundColor,
  graphicsQuality,
}: {
  skyColor: string
  fogColor: string
  lightColor: string
  lightPos: [number, number, number]
  isNight: boolean
  groundColor: string
  graphicsQuality: 'low' | 'medium' | 'high'
}) {
  const { gl, scene } = useThree()
  const pmremRef = useRef<THREE.PMREMGenerator | null>(null)
  const prevTargetRef = useRef<THREE.WebGLRenderTarget | null>(null)

  useEffect(() => {
    if (!pmremRef.current) {
      pmremRef.current = new THREE.PMREMGenerator(gl)
      pmremRef.current.compileEquirectangularShader()
    }
    const pmrem = pmremRef.current

    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const ctx = canvas.getContext('2d')

    if (ctx) {
      // 1. Sky-to-Horizon-to-Ground vertical gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 128)
      grad.addColorStop(0, skyColor)
      grad.addColorStop(0.48, fogColor)
      grad.addColorStop(0.52, fogColor)
      grad.addColorStop(1.0, isNight ? '#0a0d14' : groundColor)

      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 256, 128)

      // 2. Specular celestial body highlight (sun or moon)
      const lightVec = new THREE.Vector3(...lightPos).normalize()
      const u = (0.5 + Math.atan2(lightVec.x, -lightVec.z) / (Math.PI * 2) + 1.0) % 1.0
      const v = Math.max(0.05, Math.min(0.95, 0.5 - Math.asin(Math.max(-0.99, Math.min(0.99, lightVec.y))) / Math.PI))
      const sunPx = u * 256
      const sunPy = v * 128

      const sunRadius = isNight ? 12 : 24
      const sunGlow = ctx.createRadialGradient(sunPx, sunPy, 0, sunPx, sunPy, sunRadius)
      sunGlow.addColorStop(0, lightColor)
      sunGlow.addColorStop(0.35, isNight ? 'rgba(147, 197, 253, 0.7)' : 'rgba(255, 235, 180, 0.7)')
      sunGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0)')

      ctx.fillStyle = sunGlow
      ctx.beginPath()
      ctx.arc(sunPx, sunPy, sunRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.mapping = THREE.EquirectangularReflectionMapping
    tex.needsUpdate = true

    const envTarget = pmrem.fromEquirectangular(tex)
    scene.environment = envTarget.texture

    const intensity = graphicsQuality === 'low' ? 0.45 : isNight ? 0.32 : 0.70
    scene.environmentIntensity = intensity

    tex.dispose()

    if (prevTargetRef.current) {
      prevTargetRef.current.dispose()
    }
    prevTargetRef.current = envTarget
  }, [gl, scene, skyColor, fogColor, lightColor, lightPos[0], lightPos[1], lightPos[2], isNight, groundColor, graphicsQuality])

  useEffect(() => {
    return () => {
      if (prevTargetRef.current) {
        prevTargetRef.current.dispose()
        prevTargetRef.current = null
      }
      if (pmremRef.current) {
        pmremRef.current.dispose()
        pmremRef.current = null
      }
      scene.environment = null
    }
  }, [scene])

  return null
}

// ------------------------------------------------------------------------
// Realistic Coastal Beach Ocean Surface: Dynamic GPU-accelerated sea surface with wave swells & specular highlights
// ------------------------------------------------------------------------
const oceanUniforms = {
  uTime: { value: 0 },
}

function onOceanMaterialCompile(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.uniforms.uTime = oceanUniforms.uTime
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
     uniform float uTime;`
  )
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
     float wave = sin(transformed.x * 0.015 + uTime * 1.4) * 0.28 +
                  cos(transformed.z * 0.022 + uTime * 0.95) * 0.22 +
                  sin((transformed.x + transformed.z) * 0.035 + uTime * 2.1) * 0.12;
     transformed.y += wave;`
  )
}

function CoastalOcean({ isNight, currentBiome }: { isNight: boolean; currentBiome: string }) {
  const { camera } = useThree()
  const oceanRef = useRef<THREE.Mesh>(null)

  const isCoastal = currentBiome === 'coastal'

  const oceanGeo = useMemo(() => {
    // Spans 2,600m in X and 3,800m in Z with subdivisions for natural undulating swells
    const geo = new THREE.PlaneGeometry(2600, 3800, 64, 64)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  const oceanMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: isNight ? '#061325' : '#0d5c75',
      roughness: 0.18,
      metalness: 0.15,
      envMapIntensity: isNight ? 0.6 : 1.35,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    })
    mat.onBeforeCompile = onOceanMaterialCompile
    return mat
  }, [isNight])

  useFrame((state) => {
    if (oceanRef.current && isCoastal) {
      oceanUniforms.uTime.value = state.clock.getElapsedTime() * 1.15
      const roadCx = getRoadCenter(camera.position.z)
      // Anchored at sea level Y = 0.0, strictly on the seaward side:
      // Center of ocean plane is placed at roadCx - 1380m so nearest edge is 80m from road,
      // completely on the ocean side of the beach dunes!
      oceanRef.current.position.set(roadCx - 1380, 0.0, camera.position.z)
    }
  })

  if (!isCoastal) return null

  return (
    <mesh ref={oceanRef} geometry={oceanGeo} material={oceanMat} position={[-1380, 0, 0]} receiveShadow />
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

  // Auto-advance time of day smoothly for directional lighting, throttling Zustand dispatches to avoid unnecessary React rerenders
  useFrame((_, delta) => {
    if (autoTimeCycle) {
      timeOfDayRef.current = (timeOfDayRef.current + delta * (24 / 720)) % 24
      if (Math.abs(timeOfDayRef.current - lastDispatchedTime.current) > 0.25) {
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
    let lightIntensity = 2.1
    let skyTurbidity = 2.0
    let skyRayleigh = 2.2

    if (isNight) {
      lightColor = '#93c5fd' // Cool silver-blue moonlight
      lightIntensity = 0.35
      skyTurbidity = 0.1
      skyRayleigh = 0.1
    } else if (isSunsetOrSunrise) {
      lightColor = '#fed7aa' // Warm golden amber sunlight
      lightIntensity = 1.8
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

  // Dynamic Biome-Aware High-Dynamic-Range Environment Reflection Preset
  const envPreset = useMemo<'forest' | 'sunset' | 'dawn' | 'night' | 'park'>(() => {
    if (celestialData.isNight) return 'night'
    switch (currentResolvedBiome) {
      case 'twisted_mountains':
      case 'tundra':
      case 'alpine':
        return 'dawn' // Crisp cool alpine snow reflection
      case 'desert':
      case 'coastal':
      case 'plains':
        return 'sunset' // Warm golden open-horizon reflection (prevents forest reflection in Plains & Desert!)
      case 'autumn':
      case 'rolling_hills':
        return 'park' // Golden / rolling pasture foliage reflection
      case 'forest':
      case 'enchanted_forest':
      default:
        return 'forest'
    }
  }, [celestialData.isNight, currentResolvedBiome])

  useEffect(() => {
    useTelemetryStore.getState().setTelemetry({ reflectionPreset: envPreset })
  }, [envPreset])

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

  // Dynamic Horizon Fog: seamlessly blends terrain loading horizon with sky atmosphere and biome
  const activeFogColor = useMemo(() => {
    if (celestialData.isNight) return '#050a14'
    if (weather === 'rain') return '#334155'
    if (weather === 'mist') return '#64748b'
    if (weather === 'snow' || currentResolvedBiome === 'twisted_mountains' || currentResolvedBiome === 'tundra') return '#cbd5e1'
    return skyColor
  }, [celestialData.isNight, weather, currentResolvedBiome, skyColor])

  const activeFogDensity = useMemo(() => {
    if (weather === 'mist') return 0.0018
    if (weather === 'rain') return 0.0014
    if (weather === 'snow') return 0.0010
    // Clear weather: expansive draw distance with natural aerial perspective (no dark gray void cutoff)
    return biomeConfig.fogDensity ? Math.min(biomeConfig.fogDensity, 0.00065) : 0.00055
  }, [weather, biomeConfig.fogDensity])

  // Sync background color directly to scene to prevent canvas black void
  useEffect(() => {
    scene.background = new THREE.Color(skyColor)
  }, [scene, skyColor])

  // Player-following directional light with shadow texel snapping to prevent shadow crawling/shimmering
  useFrame(() => {
    if (dirLightRef.current && lightTargetRef.current) {
      const cx = camera.position.x
      const cy = camera.position.y
      const cz = camera.position.z

      // Shadow camera horizontal width is 110m (from -55 to +55).
      // Snapping to discrete shadow map texel increments eliminates sub-pixel swimming on geometry edges.
      const shadowMapRes = graphicsQuality === 'low' ? 1024 : 2048
      const texelSize = 110.0 / shadowMapRes
      const snapX = Math.round(cx / texelSize) * texelSize
      const snapY = Math.round(cy / texelSize) * texelSize
      const snapZ = Math.round(cz / texelSize) * texelSize

      dirLightRef.current.position.set(
        snapX + celestialData.lightPos[0],
        snapY + celestialData.lightPos[1],
        snapZ + celestialData.lightPos[2]
      )
      lightTargetRef.current.position.set(snapX, snapY, snapZ - 10)
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
    const deadZoneRadiusSq = 14.0 // R ~ 3.75m camera exclusion dead zone
    for (let i = 0; i < particleCount; i++) {
      let x = (Math.random() - 0.5) * 80
      let y = (Math.random() - 0.25) * 40 // -10 to +30 relative to camera
      let z = (Math.random() - 0.5) * 80
      // Guarantee particles never initialize inside the camera viewport dead zone
      if (x * x + y * y + z * z < deadZoneRadiusSq) {
        const offset = 4.0 + Math.random() * 2.0
        x += x >= 0 ? offset : -offset
        z += z >= 0 ? offset : -offset
      }
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
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

      const fallSpeed = isSnow ? 5.8 : 36.0
      const driftSpeed = isSnow ? 2.2 : 0.0
      const deadZoneRadiusSq = 12.25 // 3.5m radius exclusion dead zone

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

        // Camera Exclusion Dead Zone Check: keep particles from expanding into giant white squares right in front of camera
        const horizDistSq = positions[idx] * positions[idx] + positions[idx + 2] * positions[idx + 2]
        if (horizDistSq < deadZoneRadiusSq && Math.abs(positions[idx + 1]) < 3.0) {
          const angle = Math.atan2(positions[idx + 2], positions[idx])
          const safeDist = 3.8 + Math.random() * 2.0
          positions[idx] = Math.cos(angle) * safeDist
          positions[idx + 2] = Math.sin(angle) * safeDist
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

      {/* Horizon Blending Fog: seamlessly blends distant terrain into the sky dome */}
      <fogExp2 attach="fog" color={activeFogColor} density={activeFogDensity} />

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
        biomeId={currentResolvedBiome}
      />

      {/* Dynamic Procedural Offline Environment Probe (Zero CDN downloads, Zero Suspense, Zero Black Flashing) */}
      <ProceduralEnvironmentProbe
        skyColor={skyColor}
        fogColor={activeFogColor}
        lightColor={celestialData.lightColor}
        lightPos={celestialData.lightPos}
        isNight={celestialData.isNight}
        groundColor={biomeConfig.skyHemiGround || '#4a5568'}
        graphicsQuality={graphicsQuality}
      />

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

      {/* Soft Ambient Fill Light (guarantees vehicle body panels never become an unlit silhouette) */}
      <ambientLight
        color={celestialData.isNight ? '#38bdf8' : '#fed7aa'}
        intensity={celestialData.isNight ? 0.25 : 0.42}
      />

      {/* Atmospheric Fill Ambient / Hemisphere Lighting with Softened Ground Bounce */}
      <hemisphereLight
        color={celestialData.isNight ? '#bae6fd' : biomeConfig.skyHemiSky}
        groundColor={celestialData.isNight ? '#334155' : (biomeConfig.skyHemiGround || '#64748b')}
        intensity={celestialData.isNight ? 0.32 : 0.68}
      />

      {/* Rain or Snow Particles with Soft Circular Alpha Map */}
      {isPrecip && (
        <points ref={precipPointsRef} geometry={precipGeo}>
          <pointsMaterial
            map={isSnow ? snowflakeTex : rainTex}
            color={isSnow ? '#ffffff' : '#93c5fd'}
            size={isSnow ? 0.14 : 0.18}
            transparent={true}
            opacity={isSnow ? 0.78 : 0.72}
            depthWrite={false}
            blending={THREE.NormalBlending}
          />
        </points>
      )}

      {/* Cinematic Post-Processing Pass with Clamped Bloom & Contact-Shadow SSAO */}
      {graphicsQuality !== 'low' && (
        <EffectComposer
          enableNormalPass={true}
          multisampling={graphicsQuality === 'high' ? 2 : 0}
        >
          <SSAO
            resolutionScale={0.5}
            radius={0.18}
            intensity={1.25}
            luminanceInfluence={0.6}
            color={SSAO_COLOR}
            worldDistanceThreshold={28}
            worldDistanceFalloff={6}
            worldProximityThreshold={0.4}
            worldProximityFalloff={0.1}
          />
          <Bloom
            luminanceThreshold={1.05}
            luminanceSmoothing={0.15}
            intensity={graphicsQuality === 'medium' ? 0.22 : 0.32}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.42} darkness={0.22} />
        </EffectComposer>
      )}
    </>
  )
}
