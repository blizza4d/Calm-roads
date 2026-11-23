import * as THREE from 'three'
import { BiomeType, BIOMES } from './roadMath'
import { WeatherType } from '../store/useGameStore'

export interface EnvironmentalLightingState {
  timeOfDay: number // 0 to 24
  sunElevation: number // -1.0 (midnight) to +1.0 (noon)
  sunAzimuth: number // radians around Y
  sunDirection: [number, number, number]
  sunPosition: [number, number, number]
  sunColor: THREE.Color
  sunIntensity: number
  shadowCameraPosition: [number, number, number]
  shadowIntensity: number

  moonDirection: [number, number, number]
  moonPosition: [number, number, number]
  moonColor: THREE.Color
  moonIntensity: number

  isNight: boolean
  isSunrise: boolean
  isSunset: boolean
  isGoldenHour: boolean
  nightFactor: number // 0 (day) to 1 (full dark night)
  dawnFactor: number // 0 to 1 during dawn/sunrise
  duskFactor: number // 0 to 1 during dusk/sunset

  skyZenithColor: THREE.Color
  skyHorizonColor: THREE.Color
  ambientColor: THREE.Color
  ambientIntensity: number
  hemiSkyColor: THREE.Color
  hemiGroundColor: THREE.Color
  hemiIntensity: number

  fogColor: THREE.Color
  fogDensity: number

  cloudSunColor: THREE.Color
  cloudShadowColor: THREE.Color
  cloudOpacity: number

  reflectionPreset: 'forest' | 'sunset' | 'dawn' | 'night' | 'park'
  dashboardGlowIntensity: number
  headlightsRecommended: boolean
  roadWetness: number
  puddleCoverage: number
  windSpeed: number
  windDirection: [number, number]
  windGustFactor: number
  heightFogBase: number
  heightFogFalloff: number
  lightningFlash: number
}

// Scratch reusable Color and Vector3 instances to prevent per-frame garbage collections
const _c1 = new THREE.Color()
const _c2 = new THREE.Color()

/**
 * Smooth Hermite interpolation between edges
 */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Centrally evaluates the comprehensive environmental lighting for any time of day,
 * weather state, and biome. All transitions use continuous analytic curves ensuring
 * zero visual popping, zero color stepping, and authentic atmospheric optics.
 */
export function calculateEnvironmentalLighting(
  timeOfDay: number,
  weather: WeatherType = 'clear',
  biomeId: BiomeType = 'forest'
): EnvironmentalLightingState {
  const t = ((timeOfDay % 24) + 24) % 24 // Normalized [0, 24)
  const biome = BIOMES[biomeId] || BIOMES.forest

  // 1. Celestial Astronomy Math
  // Solar cycle: 6:00 = Sunrise, 12:00 = Solar Noon, 18:00 = Sunset, 24:00/0:00 = Midnight
  const solarAngle = ((t - 6.0) / 24.0) * Math.PI * 2.0
  const sunElevation = Math.sin(solarAngle) // -1.0 at midnight, 0 at 6am/6pm, +1.0 at noon
  const sunEastWest = Math.cos(solarAngle) // +1.0 at 6am (East), 0 at noon, -1.0 at 6pm (West)

  // Solar position on 380,000m celestial sphere for atmospheric scattering shaders
  const skyDist = 380000
  const sunDirX = sunEastWest
  const sunDirY = Math.max(-0.4, sunElevation)
  const sunDirZ = -0.32
  const sunDirLen = Math.sqrt(sunDirX * sunDirX + sunDirY * sunDirY + sunDirZ * sunDirZ)
  const normSunDir: [number, number, number] = [sunDirX / sunDirLen, sunDirY / sunDirLen, sunDirZ / sunDirLen]
  const sunPosition: [number, number, number] = [
    normSunDir[0] * skyDist,
    normSunDir[1] * skyDist,
    normSunDir[2] * skyDist,
  ]

  // Lunar position (celestial counterpart tilted 180 degrees opposite sun with slight inclination)
  const lunarAngle = solarAngle + Math.PI
  const moonDirX = Math.cos(lunarAngle)
  const moonDirY = Math.max(-0.35, Math.sin(lunarAngle))
  const moonDirZ = 0.28
  const moonDirLen = Math.sqrt(moonDirX * moonDirX + moonDirY * moonDirY + moonDirZ * moonDirZ)
  const normMoonDir: [number, number, number] = [moonDirX / moonDirLen, moonDirY / moonDirLen, moonDirZ / moonDirLen]
  const moonPosition: [number, number, number] = [
    normMoonDir[0] * 1200,
    Math.max(120, normMoonDir[1] * 1200),
    normMoonDir[2] * 1200,
  ]

  // 2. Day / Night / Dawn / Dusk Factors
  // Night factor: 0.0 (full day) to 1.0 (full night)
  const isNight = t < 5.2 || t > 19.8
  const isSunrise = t >= 5.0 && t < 7.8
  const isSunset = t >= 17.2 && t < 20.0
  const isGoldenHour = (t >= 6.2 && t < 7.5) || (t >= 16.8 && t < 18.8)

  // Smooth continuous transition factors
  let nightFactor = 0.0
  if (t < 4.8 || t > 21.0) {
    nightFactor = 1.0
  } else if (t >= 4.8 && t < 6.5) {
    nightFactor = 1.0 - smoothstep(4.8, 6.5, t)
  } else if (t >= 19.2 && t <= 21.0) {
    nightFactor = smoothstep(19.2, 21.0, t)
  }

  const dawnFactor = t >= 4.8 && t <= 7.8 ? 1.0 - Math.abs(t - 6.3) / 1.5 : 0.0
  const duskFactor = t >= 17.2 && t <= 20.2 ? 1.0 - Math.abs(t - 18.7) / 1.5 : 0.0

  // 3. Solar & Lunar Illumination
  const sunColor = new THREE.Color()
  let sunIntensity = 0.0

  if (t >= 5.2 && t <= 19.8) {
    // Daytime solar illumination
    if (t < 6.8) {
      // Early sunrise: warm coral rose to peach
      const progress = smoothstep(5.2, 6.8, t)
      sunColor.set('#ff7a59').lerp(_c1.set('#fde68a'), progress)
      sunIntensity = THREE.MathUtils.lerp(0.4, 2.2, progress)
    } else if (t < 8.5) {
      // Morning golden warmth transition to clear daylight
      const progress = smoothstep(6.8, 8.5, t)
      sunColor.set('#fde68a').lerp(_c1.set('#fffef5'), progress)
      sunIntensity = THREE.MathUtils.lerp(1.4, 2.1, progress)
    } else if (t < 16.5) {
      // Midday: crisp, pure neutral daylight (prevents overexposure blowout)
      sunColor.set('#fffef8')
      sunIntensity = 2.1
    } else if (t < 18.5) {
      // Golden Hour: rich honey amber
      const progress = smoothstep(16.5, 18.5, t)
      sunColor.set('#fffef8').lerp(_c1.set('#fbbf24'), progress)
      sunIntensity = THREE.MathUtils.lerp(2.1, 1.75, progress)
    } else {
      // Sunset & Civil Dusk: vivid fiery crimson-orange to deep magenta
      const progress = smoothstep(18.5, 19.8, t)
      sunColor.set('#fbbf24').lerp(_c1.set('#ea580c'), progress)
      sunIntensity = THREE.MathUtils.lerp(1.75, 0.35, progress)
    }
  } else {
    // Night: sun has set below horizon
    sunColor.set('#ea580c')
    sunIntensity = 0.0
  }

  // Moonlight illumination: cool luminous silver-blue
  const moonColor = new THREE.Color('#93c5fd')
  const moonIntensity = THREE.MathUtils.lerp(0.0, 0.52, nightFactor)

  // 4. Directional Light & Shadow Setup
  // If daytime, directional light represents sun; if night, it represents moonlight
  const lightDir = isNight ? normMoonDir : normSunDir
  const activeLightColor = isNight ? moonColor : sunColor
  let activeLightIntensity = isNight ? moonIntensity : sunIntensity

  const shadowDist = 65
  const shadowCamPos: [number, number, number] = [
    lightDir[0] * shadowDist,
    Math.max(22, lightDir[1] * shadowDist),
    lightDir[2] * shadowDist,
  ]
  const shadowIntensity = isNight ? 0.35 : 1.0

  // 5. Sky Colors (Zenith & Horizon)
  const skyZenith = new THREE.Color()
  const skyHorizon = new THREE.Color()

  if (t < 4.5 || t > 21.5) {
    // Deep midnight: celestial deep navy-black
    skyZenith.set('#040714')
    skyHorizon.set('#0b1329')
  } else if (t >= 4.5 && t < 6.0) {
    // Pre-dawn / Nautical twilight: dark indigo to violet glow on eastern horizon
    const f = smoothstep(4.5, 6.0, t)
    skyZenith.set('#040714').lerp(_c1.set('#0f1b3e'), f)
    skyHorizon.set('#0b1329').lerp(_c2.set('#3b1d4a'), f)
  } else if (t >= 6.0 && t < 7.2) {
    // Dawn / Sunrise: violet-blue zenith, vibrant coral/magenta/gold horizon
    const f = smoothstep(6.0, 7.2, t)
    skyZenith.set('#0f1b3e').lerp(_c1.set('#1e40af'), f)
    skyHorizon.set('#3b1d4a').lerp(_c2.set('#f97316'), f)
  } else if (t >= 7.2 && t < 9.0) {
    // Morning: transition from sunrise horizon to crisp sky
    const f = smoothstep(7.2, 9.0, t)
    const biomeSky = new THREE.Color(biome.skyHemiSky || '#38bdf8')
    skyZenith.set('#1e40af').lerp(biomeSky, f)
    skyHorizon.set('#f97316').lerp(_c2.set('#bae6fd'), f)
  } else if (t >= 9.0 && t < 16.5) {
    // Full Midday: clear atmospheric Rayleigh blue
    const biomeSky = new THREE.Color(biome.skyHemiSky || '#38bdf8')
    skyZenith.set(biomeSky)
    skyHorizon.set('#bae6fd')
  } else if (t >= 16.5 && t < 18.5) {
    // Golden Hour: azure zenith, warm amber horizon
    const f = smoothstep(16.5, 18.5, t)
    const biomeSky = new THREE.Color(biome.skyHemiSky || '#38bdf8')
    skyZenith.set(biomeSky).lerp(_c1.set('#2563eb'), f)
    skyHorizon.set('#bae6fd').lerp(_c2.set('#fde047'), f)
  } else if (t >= 18.5 && t < 20.0) {
    // Sunset: deep indigo zenith, blazing fiery crimson/orange/pink horizon
    const f = smoothstep(18.5, 20.0, t)
    skyZenith.set('#2563eb').lerp(_c1.set('#1e1b4b'), f)
    skyHorizon.set('#fde047').lerp(_c2.set('#ea580c'), f)
  } else {
    // Dusk / Nightfall: deep indigo transition to midnight navy
    const f = smoothstep(20.0, 21.5, t)
    skyZenith.set('#1e1b4b').lerp(_c1.set('#040714'), f)
    skyHorizon.set('#ea580c').lerp(_c2.set('#0b1329'), f)
  }

  // 6. Ambient & Hemisphere Ground/Sky Fill
  const ambientColor = new THREE.Color()
  let ambientIntensity = 0.42
  const hemiSky = new THREE.Color()
  const hemiGround = new THREE.Color()
  let hemiIntensity = 0.65

  if (isNight) {
    ambientColor.set('#1e293b') // Cool night fill
    ambientIntensity = 0.32
    hemiSky.set('#38bdf8').multiplyScalar(0.25)
    hemiGround.set('#0f172a')
    hemiIntensity = 0.38
  } else if (isGoldenHour || isSunrise || isSunset) {
    ambientColor.set('#fed7aa') // Warm sunset fill
    ambientIntensity = 0.48
    hemiSky.set(skyZenith).lerp(_c1.set('#fbbf24'), 0.35)
    hemiGround.set(biome.skyHemiGround || '#475569').lerp(_c2.set('#78350f'), 0.4)
    hemiIntensity = 0.72
  } else {
    ambientColor.set('#fffbeb') // Neutral midday daylight fill
    ambientIntensity = 0.44
    hemiSky.set(skyZenith)
    hemiGround.set(biome.skyHemiGround || '#64748b')
    hemiIntensity = 0.68
  }

  // 7. Atmospheric Fog: Calibrated for expansive horizon vistas without milky washouts
  const fogColor = new THREE.Color()
  let fogDensity = 0.00032

  if (isNight) {
    fogColor.set(skyHorizon).lerp(_c1.set('#050a14'), 0.70)
    fogDensity = 0.00042
  } else if (isSunset || isSunrise) {
    fogColor.set(skyHorizon).lerp(ambientColor, 0.20)
    fogDensity = 0.00036
  } else {
    fogColor.set(skyHorizon).lerp(skyZenith, 0.15)
    fogDensity = 0.00032
  }

  // 8. Procedural Cloud Tints
  const cloudSunColor = new THREE.Color()
  const cloudShadowColor = new THREE.Color()
  let cloudOpacity = 0.82

  if (isNight) {
    cloudSunColor.set('#94a3b8').multiplyScalar(0.35) // Lit by moonlight
    cloudShadowColor.set('#0f172a').multiplyScalar(0.4)
    cloudOpacity = 0.55
  } else if (isSunset || isSunrise) {
    cloudSunColor.set('#fb923c').multiplyScalar(1.25) // Glowing gold/orange edges
    cloudShadowColor.set('#4a1d96').multiplyScalar(0.7) // Purple dusk shadows
    cloudOpacity = 0.88
  } else {
    cloudSunColor.set('#ffffff')
    cloudShadowColor.set('#94a3b8')
    cloudOpacity = 0.75
  }

  // 9. Weather Modulations
  let roadWetness = 0.0
  if (weather === 'rain') {
    activeLightColor.lerp(_c1.set('#64748b'), 0.5)
    activeLightIntensity *= 0.55
    ambientColor.set('#334155')
    ambientIntensity *= 0.75
    skyZenith.set('#1e293b')
    skyHorizon.set('#334155')
    fogColor.set('#334155')
    fogDensity = 0.0016
    cloudSunColor.set('#475569')
    cloudShadowColor.set('#1e293b')
    cloudOpacity = 0.95
    roadWetness = 1.0
  } else if (weather === 'mist') {
    activeLightIntensity *= 0.65
    fogColor.set('#64748b')
    fogDensity = 0.0022
    cloudOpacity = 0.92
    roadWetness = 0.35
  } else if (weather === 'snow') {
    hemiGround.set('#f8fafc') // Bright snow albedo bounce
    fogColor.lerp(_c1.set('#cbd5e1'), 0.35)
    fogDensity = 0.00095
    roadWetness = 0.2
  } else if (biomeId === 'twisted_mountains' || biomeId === 'tundra') {
    hemiGround.set('#e2e8f0') // Light snow albedo ground bounce
  }

  // 10. Vehicle Night & Cockpit Indicators
  const dashboardGlowIntensity = isNight ? 1.0 : t < 6.8 || t > 18.2 ? 0.65 : 0.0
  const headlightsRecommended = isNight || t < 6.5 || t > 18.5 || weather === 'rain' || weather === 'mist'

  // 11. Environmental Wind & Atmospheric Elevation Fog
  let windSpeed = 3.8
  if (biomeId === 'coastal') windSpeed = 6.2
  else if (biomeId === 'twisted_mountains') windSpeed = 5.4
  else if (biomeId === 'desert') windSpeed = 4.6
  if (weather === 'rain') windSpeed += 3.5

  const windDirAngle = 0.62 // Radians (~35 degrees)
  const windDirection: [number, number] = [Math.cos(windDirAngle), Math.sin(windDirAngle)]
  const windGustFactor = weather === 'rain' ? 0.65 : 0.25

  let heightFogBase = 6.0
  let heightFogFalloff = 0.026
  if (weather === 'mist') {
    heightFogBase = 12.0
    heightFogFalloff = 0.016
  } else if (biomeId === 'twisted_mountains' || biomeId === 'alpine') {
    heightFogBase = 10.0
    heightFogFalloff = 0.034
  } else if (biomeId === 'desert') {
    heightFogBase = 4.0
    heightFogFalloff = 0.018 // Warm desert haze across elevations
  }

  const puddleCoverage = weather === 'rain' ? 0.65 : weather === 'mist' ? 0.15 : weather === 'snow' ? 0.20 : 0.0
  const lightningFlash = 0.0

  // 12. Reflection Environment Map Preset
  let reflectionPreset: 'forest' | 'sunset' | 'dawn' | 'night' | 'park' = 'forest'
  if (isNight) {
    reflectionPreset = 'night'
  } else if (isSunset || isGoldenHour) {
    reflectionPreset = 'sunset'
  } else if (isSunrise) {
    reflectionPreset = 'dawn'
  } else if (biomeId === 'autumn') {
    reflectionPreset = 'park'
  }

  return {
    timeOfDay: t,
    sunElevation,
    sunAzimuth: solarAngle,
    sunDirection: normSunDir,
    sunPosition,
    sunColor: activeLightColor,
    sunIntensity: activeLightIntensity,
    shadowCameraPosition: shadowCamPos,
    shadowIntensity,

    moonDirection: normMoonDir,
    moonPosition,
    moonColor,
    moonIntensity,

    isNight,
    isSunrise,
    isSunset,
    isGoldenHour,
    nightFactor,
    dawnFactor,
    duskFactor,

    skyZenithColor: skyZenith,
    skyHorizonColor: skyHorizon,
    ambientColor,
    ambientIntensity,
    hemiSkyColor: hemiSky,
    hemiGroundColor: hemiGround,
    hemiIntensity,

    fogColor,
    fogDensity,

    cloudSunColor,
    cloudShadowColor,
    cloudOpacity,

    reflectionPreset,
    dashboardGlowIntensity,
    headlightsRecommended,
    roadWetness,
    puddleCoverage,
    windSpeed,
    windDirection,
    windGustFactor,
    heightFogBase,
    heightFogFalloff,
    lightningFlash,
  }
}
