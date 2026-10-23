import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useGameStore } from '../../../store/useGameStore'
import { BIOMES } from '../../../utils/roadMath'

export default function GameEnvironment() {
  const { timeOfDay, setTimeOfDay, autoTimeCycle, weather, currentResolvedBiome, graphicsQuality } = useGameStore()
  const { gl, scene, camera } = useThree()

  // Directional Light & Shadow target
  const dirLightRef = useRef<THREE.DirectionalLight>(null)
  const lightTargetRef = useRef<THREE.Object3D>(null)

  // Auto-advance time of day smoothly (1 full 24-hr day every 12 minutes, or controlled by slider)
  useFrame((_, delta) => {
    if (autoTimeCycle) {
      const newTime = (timeOfDay + delta * (24 / 720)) % 24
      setTimeOfDay(newTime)
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
    const lightY = isNight ? Math.max(26, -sunY * 0.85) : Math.max(8, sunY)
    const lightZ = isNight ? -sunZ : sunZ

    let lightColor = '#fffdf8'
    let lightIntensity = 2.6
    let skyTurbidity = 2.0
    let skyRayleigh = 1.1

    if (isNight) {
      lightColor = '#93c5fd' // Cool blue-tinted moonlight
      lightIntensity = 0.55
      skyTurbidity = 0.1
      skyRayleigh = 0.08
    } else if (isSunsetOrSunrise) {
      lightColor = '#fed7aa' // Warm golden amber sunlight (natural, not neon orange)
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

    return {
      skySunPos: [sunX, sunY, sunZ] as [number, number, number],
      lightPos: [lightX, lightY, lightZ] as [number, number, number],
      lightColor,
      lightIntensity,
      isNight,
      skyTurbidity,
      skyRayleigh,
    }
  }, [timeOfDay, weather])

  // Biome and Weather lighting modifications
  const biomeConfig = BIOMES[currentResolvedBiome] || BIOMES.forest

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
    if (weather === 'mist') return 0.012
    if (weather === 'rain') return 0.0055
    if (weather === 'snow') return 0.0038
    return biomeConfig.fogDensity
  }, [weather, biomeConfig])

  // Procedural PBR Irradiance Environment Map Generation
  // Provides real-time IBL specular reflections for car clearcoat paint, glass, chrome and wet roads
  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl)
    pmremGenerator.compileEquirectangularShader()

    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Equirectangular sky gradient matching the celestial phase
    const grad = ctx.createLinearGradient(0, 0, 0, 128)
    if (celestialData.isNight) {
      grad.addColorStop(0.0, '#020617') // Zenith
      grad.addColorStop(0.48, '#0f172a') // Horizon
      grad.addColorStop(0.50, '#1e293b') // Moonlight horizon rim
      grad.addColorStop(0.52, '#0f172a') // Ground horizon
      grad.addColorStop(1.0, '#020617') // Ground nadir
    } else if (timeOfDay >= 16.5 && timeOfDay <= 19.5) {
      // Golden Hour Sunset
      grad.addColorStop(0.0, '#38bdf8') // Blue zenith
      grad.addColorStop(0.42, '#fde68a') // Warm sky
      grad.addColorStop(0.50, '#fb923c') // Golden-amber horizon
      grad.addColorStop(0.52, '#78350f') // Warm ground bounce
      grad.addColorStop(1.0, '#292524') // Ground nadir
    } else if (timeOfDay >= 5.0 && timeOfDay <= 7.5) {
      // Crisp Sunrise
      grad.addColorStop(0.0, '#60a5fa')
      grad.addColorStop(0.42, '#fbcfe8')
      grad.addColorStop(0.50, '#f43f5e')
      grad.addColorStop(0.53, '#4c1d95')
      grad.addColorStop(1.0, '#1e1b4b')
    } else {
      // Crisp Daylight
      grad.addColorStop(0.0, '#0284c7') // Sky blue zenith
      grad.addColorStop(0.45, '#bae6fd') // Near horizon
      grad.addColorStop(0.50, '#e0f2fe') // Bright horizon haze
      grad.addColorStop(0.53, '#94a3b8') // Ground horizon
      grad.addColorStop(1.0, '#334155') // Ground
    }

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 256, 128)

    // Sun disc specular reflection source
    if (!celestialData.isNight) {
      const sunNormY = (celestialData.skySunPos[1] / 100) * 0.5 + 0.5
      const sunPixelY = Math.max(10, Math.min(118, (1 - sunNormY) * 128))
      const sunGrad = ctx.createRadialGradient(128, sunPixelY, 0, 128, sunPixelY, 28)
      sunGrad.addColorStop(0, '#ffffff')
      sunGrad.addColorStop(0.3, 'rgba(255, 250, 230, 0.85)')
      sunGrad.addColorStop(1, 'rgba(255, 230, 180, 0)')
      ctx.fillStyle = sunGrad
      ctx.fillRect(100, sunPixelY - 28, 56, 56)
    }

    const texture = new THREE.CanvasTexture(canvas)
    const envMap = pmremGenerator.fromEquirectangular(texture).texture
    scene.environment = envMap

    return () => {
      texture.dispose()
      envMap.dispose()
      pmremGenerator.dispose()
    }
  }, [gl, scene, celestialData.isNight, timeOfDay, celestialData.skySunPos])

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

  return (
    <>
      <primitive object={lightTargetRef.current || new THREE.Object3D()} ref={lightTargetRef} />

      {/* Atmospheric Fog */}
      <fogExp2 attach="fog" args={[fogColor, fogDensity]} />

      {/* SkyDome with authentic twilight & night Rayleigh transitions */}
      <Sky
        sunPosition={celestialData.skySunPos}
        turbidity={celestialData.skyTurbidity}
        rayleigh={celestialData.skyRayleigh}
        mieCoefficient={0.01}
        mieDirectionalG={0.88}
      />

      {/* Stars at Night */}
      {celestialData.isNight && (
        <Stars radius={200} depth={70} count={4200} factor={4.5} saturation={0.6} fade speed={1.2} />
      )}

      {/* Directional Sun/Moon Light with Soft Shadows */}
      <directionalLight
        ref={dirLightRef}
        castShadow
        position={celestialData.lightPos}
        intensity={celestialData.lightIntensity}
        color={celestialData.lightColor}
        shadow-mapSize={graphicsQuality === 'low' ? [1024, 1024] : [2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={280}
        shadow-bias={-0.0003}
      >
        <orthographicCamera attach="shadow-camera" args={[-70, 70, 70, -70, 0.5, 280]} />
      </directionalLight>

      {/* Atmospheric Fill Ambient / Hemisphere Lighting */}
      <hemisphereLight
        color={biomeConfig.skyHemiSky}
        groundColor={biomeConfig.skyHemiGround}
        intensity={celestialData.isNight ? 0.42 : 0.98}
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
        <Bloom luminanceThreshold={0.92} intensity={graphicsQuality === 'low' ? 0.35 : 0.55} mipmapBlur />
        <ToneMapping />
        <Vignette eskil={false} offset={0.35} darkness={0.28} />
      </EffectComposer>
    </>
  )
}
