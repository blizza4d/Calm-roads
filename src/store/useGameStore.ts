import { create } from 'zustand'
import type { BiomeType, MacroTerrainType, MacroTerrainWeights } from '../utils/roadMath.ts'

export type WeatherType = 'clear' | 'rain' | 'snow' | 'mist'
export type VehicleModelType = 'bmw_m3' | 'supercar' | 'hovercraft' | 'camper' | 'hatchback' | 'modern_supercar' | 'vintage_hatch'
export type CameraPerspectiveType = 'chase' | 'close_chase' | 'dashboard' | 'drone' | 'bumper' | 'cinematic'
export type BiomeSelection = 'dynamic' | BiomeType
export type PaintFinishType = 'gloss' | 'metallic' | 'matte' | 'pearl'
export type SpoilerType = 'stock' | 'gt_wing' | 'ducktail' | 'none'
export type GraphicsQualityType = 'low' | 'medium' | 'high' | 'ultra'

export interface DrivingStats {
  totalDistanceKm: number
  topSpeedKmh: number
  totalDrivingTimeSec: number
  totalDriftDistanceM: number
  cleanAsphaltDistanceM: number
  redlineShiftsCount: number
}

// LocalStorage Persistence Helpers
function loadStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const val = localStorage.getItem(`calmroads_${key}`)
    return val ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

function saveStoredJson<T>(key: string, data: T) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`calmroads_${key}`, JSON.stringify(data))
  } catch {}
}

export interface LandmarkNotificationData {
  id: string
  name: string
  subtitle: string
  biome: string
}

interface GameState {
  // 1. Antigravity & Physics Mode
  isHoverMode: boolean
  toggleHoverMode: () => void
  setHoverMode: (h: boolean) => void

  // 2. Environment & Biomes
  biome: BiomeSelection
  setBiome: (b: BiomeSelection) => void
  currentResolvedBiome: BiomeType
  setCurrentResolvedBiome: (b: BiomeType) => void

  // 2b. Macro Terrain System & Deterministic World Seed
  macroTerrain: MacroTerrainType
  setMacroTerrain: (m: MacroTerrainType) => void
  macroWeights: MacroTerrainWeights
  setMacroWeights: (w: MacroTerrainWeights) => void
  worldSeed: string
  setWorldSeed: (s: string) => void

  // 3. Time of Day & Weather
  timeOfDay: number // 0.0 to 24.0 (hours)
  setTimeOfDay: (t: number) => void
  autoTimeCycle: boolean
  toggleAutoTimeCycle: () => void
  timeSpeed: number
  setTimeSpeed: (s: number) => void
  skipToTime: (t: number) => void
  skipToSunrise: () => void
  skipToMidday: () => void
  skipToSunset: () => void
  skipToMidnight: () => void
  weather: WeatherType
  setWeather: (w: WeatherType) => void
  cycleWeather: () => void

  // 4. Vehicle Selection & Customization
  vehicleModel: VehicleModelType
  setVehicleModel: (v: VehicleModelType) => void
  cycleVehicleModel: () => void
  paintColor: string
  setPaintColor: (c: string) => void
  paintFinish: PaintFinishType
  setPaintFinish: (f: PaintFinishType) => void
  metallic: number
  setMetallic: (m: number) => void
  roughness: number
  setRoughness: (r: number) => void
  caliperColor: string
  setCaliperColor: (c: string) => void
  rimColor: string
  setRimColor: (c: string) => void
  spoilerType: SpoilerType
  setSpoilerType: (s: SpoilerType) => void

  // 5. Camera Perspectives
  cameraPerspective: CameraPerspectiveType
  setCameraPerspective: (c: CameraPerspectiveType) => void
  cycleCameraPerspective: () => void

  // 6. Driving Telemetry
  speed: number // km/h
  setSpeed: (s: number) => void
  rpm: number
  setRpm: (r: number) => void
  gear: string
  setGear: (g: string) => void
  setTelemetry: (data: { speed?: number; rpm?: number; gear?: string; throttle?: number; brake?: number }) => void
  transmissionMode: 'auto' | 'manual'
  setTransmissionMode: (m: 'auto' | 'manual') => void
  toggleTransmissionMode: () => void
  distance: number // km
  addDistance: (d: number) => void
  throttle: number
  setThrottle: (t: number) => void
  brake: number
  setBrake: (b: number) => void
  steering: number
  setSteering: (s: number) => void
  autoDrive: boolean
  toggleAutoDrive: () => void
  headlights: boolean
  toggleHeadlights: () => void
  setHeadlights: (headlights: boolean) => void
  headlightBeam: 'low' | 'high'
  toggleHeadlightBeam: () => void
  setHeadlightBeam: (b: 'low' | 'high') => void

  // On-screen / Touch Controls
  virtualThrottle: boolean
  setVirtualThrottle: (v: boolean) => void
  virtualBrake: boolean
  setVirtualBrake: (v: boolean) => void
  virtualSteerLeft: boolean
  setVirtualSteerLeft: (v: boolean) => void
  virtualSteerRight: boolean
  setVirtualSteerRight: (v: boolean) => void
  isBurnout: boolean
  setIsBurnout: (b: boolean) => void
  virtualBurnout: boolean
  setVirtualBurnout: (v: boolean) => void

  // 7. Audio System
  isMusicPlaying: boolean
  toggleMusic: () => void
  musicVolume: number
  setMusicVolume: (v: number) => void
  sfxVolume: number
  setSfxVolume: (v: number) => void
  masterVolume: number
  setMasterVolume: (v: number) => void
  engineVolume: number
  setEngineVolume: (v: number) => void
  ambienceVolume: number
  setAmbienceVolume: (v: number) => void
  currentTrackIndex: number
  nextTrack: () => void
  prevTrack: () => void

  // 8. Specialized UI Modes
  photoMode: boolean
  setPhotoMode: (p: boolean) => void
  togglePhotoMode: () => void
  zenMode: boolean
  setZenMode: (z: boolean) => void
  toggleZenMode: () => void
  cleanHud: boolean
  toggleCleanHud: () => void
  activePanel:
    | 'none'
    | 'garage'
    | 'environment'
    | 'audio'
    | 'controls'
    | 'settings'
    | 'discoveries'
    | 'challenges'
    | 'map'
  setActivePanel: (
    p:
      | 'none'
      | 'garage'
      | 'environment'
      | 'audio'
      | 'controls'
      | 'settings'
      | 'discoveries'
      | 'challenges'
      | 'map'
  ) => void
  speedUnit: 'kmh' | 'mph'
  toggleSpeedUnit: () => void
  graphicsQuality: GraphicsQualityType
  setGraphicsQuality: (q: GraphicsQualityType) => void
  isFullscreen: boolean
  toggleFullscreen: () => void

  // 8b. Discoveries & Challenges Progression
  discoveries: string[]
  addDiscovery: (id: string) => void
  activeLandmarkNotification: LandmarkNotificationData | null
  setActiveLandmarkNotification: (n: LandmarkNotificationData | null) => void
  completedChallenges: string[]
  addCompletedChallenge: (id: string) => void
  challengeNotification: string | null
  setChallengeNotification: (msg: string | null) => void
  drivingStats: DrivingStats
  updateDrivingStats: (s: Partial<DrivingStats>) => void

  // 9. Diagnostics & Engine Telemetry
  showDiagnostics: boolean
  setShowDiagnostics: (s: boolean) => void
  toggleDiagnostics: () => void
  diagnostics: {
    fps: number
    activeChunks: number
    frontierBuffer: number
    drawDistance: number
    speedKmh: number
    chunksAhead: number
    prepTimeMs: number
    roadElevation?: number
    terrainElevation?: number
    corridorClearance?: number
    roadBankingDeg?: number
    roadGrade?: number
    macroTerrainType?: string
    macroNoise?: number
    plainsWeight?: number
    rollingHillsWeight?: number
    twistedClimbWeight?: number
    macroAmplitude?: number
    roadCurvature?: number
    bulldozerClearance?: number
    roadProtectedRadius?: number
  }
  setDiagnostics: (
    d: Partial<{
      fps: number
      activeChunks: number
      frontierBuffer: number
      drawDistance: number
      speedKmh: number
      chunksAhead: number
      prepTimeMs: number
      roadElevation: number
      terrainElevation: number
      corridorClearance: number
      roadBankingDeg: number
      roadGrade: number
      macroTerrainType: string
      macroNoise: number
      plainsWeight: number
      rollingHillsWeight: number
      twistedClimbWeight: number
      macroAmplitude: number
      roadCurvature: number
      bulldozerClearance: number
      roadProtectedRadius: number
    }>
  ) => void
}

const WEATHERS: WeatherType[] = ['clear', 'rain', 'snow', 'mist']
const VEHICLES: VehicleModelType[] = [
  'bmw_m3',
  'supercar',
  'modern_supercar',
  'hovercraft',
  'camper',
  'hatchback',
  'vintage_hatch',
]
const CAMERAS: CameraPerspectiveType[] = [
  'chase',
  'close_chase',
  'dashboard',
  'drone',
  'bumper',
  'cinematic',
]

export const useGameStore = create<GameState>((set, get) => ({
  // Antigravity & Physics
  isHoverMode: false,
  toggleHoverMode: () => set((s) => ({ isHoverMode: !s.isHoverMode })),
  setHoverMode: (isHoverMode) => set({ isHoverMode }),

  // Biomes
  biome: 'dynamic',
  setBiome: (biome) => set({ biome }),
  currentResolvedBiome: 'forest',
  setCurrentResolvedBiome: (currentResolvedBiome) => set({ currentResolvedBiome }),

  // Macro Terrain System & Deterministic World Seed
  macroTerrain: 'plains',
  setMacroTerrain: (macroTerrain) => set({ macroTerrain }),
  macroWeights: {
    plains: 1.0,
    rolling_hills: 0.0,
    twisted_climb: 0.0,
    coastal: 0.0,
    desert_canyon: 0.0,
    forest_valleys: 0.0,
    rollingHills: 0.0,
    twistedClimb: 0.0,
  },
  setMacroWeights: (macroWeights) => set({ macroWeights }),
  worldSeed: loadStoredJson<string>('world_seed', 'CALM_ROADS_3'),
  setWorldSeed: (worldSeed) => {
    saveStoredJson('world_seed', worldSeed)
    set({ worldSeed })
  },

  // Time & Weather
  timeOfDay: loadStoredJson<number>('time_of_day', 15.8),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  autoTimeCycle: true,
  toggleAutoTimeCycle: () => set((s) => ({ autoTimeCycle: !s.autoTimeCycle })),
  timeSpeed: 1.0,
  setTimeSpeed: (timeSpeed) => set({ timeSpeed }),
  skipToTime: (hours) => set({ timeOfDay: ((hours % 24) + 24) % 24 }),
  skipToSunrise: () => set({ timeOfDay: 6.3 }),
  skipToMidday: () => set({ timeOfDay: 12.0 }),
  skipToSunset: () => set({ timeOfDay: 18.6 }),
  skipToMidnight: () => set({ timeOfDay: 0.0 }),
  weather: 'clear',
  setWeather: (weather) => set({ weather }),
  cycleWeather: () => {
    const list = WEATHERS
    const nextIdx = (list.indexOf(get().weather) + 1) % list.length
    set({ weather: list[nextIdx] })
  },

  // Vehicle Customization
  vehicleModel: 'bmw_m3',
  setVehicleModel: (vehicleModel) => set({ vehicleModel }),
  cycleVehicleModel: () => {
    const list = VEHICLES
    const nextIdx = (list.indexOf(get().vehicleModel) + 1) % list.length
    set({ vehicleModel: list[nextIdx] })
  },
  paintColor: loadStoredJson<string>('paint_color', '#cbd5e1'), // Iconic German Silver
  setPaintColor: (paintColor) => {
    saveStoredJson('paint_color', paintColor)
    set({ paintColor })
  },
  paintFinish: loadStoredJson<PaintFinishType>('paint_finish', 'metallic'),
  setPaintFinish: (paintFinish) => {
    saveStoredJson('paint_finish', paintFinish)
    set({ paintFinish })
  },
  metallic: 0.9,
  setMetallic: (metallic) => set({ metallic }),
  roughness: 0.2,
  setRoughness: (roughness) => set({ roughness }),
  caliperColor: loadStoredJson<string>('caliper_color', '#d97706'), // Brembo Gold
  setCaliperColor: (caliperColor) => {
    saveStoredJson('caliper_color', caliperColor)
    set({ caliperColor })
  },
  rimColor: loadStoredJson<string>('rim_color', '#cbd5e1'), // Satin Silver
  setRimColor: (rimColor) => {
    saveStoredJson('rim_color', rimColor)
    set({ rimColor })
  },
  spoilerType: loadStoredJson<SpoilerType>('spoiler_type', 'stock'),
  setSpoilerType: (spoilerType) => {
    saveStoredJson('spoiler_type', spoilerType)
    set({ spoilerType })
  },

  // Camera
  cameraPerspective: 'chase',
  setCameraPerspective: (cameraPerspective) => set({ cameraPerspective }),
  cycleCameraPerspective: () => {
    const list = CAMERAS
    const nextIdx = (list.indexOf(get().cameraPerspective) + 1) % list.length
    set({ cameraPerspective: list[nextIdx] })
  },

  // Telemetry
  speed: 0,
  setSpeed: (speed) => set({ speed }),
  rpm: 850,
  setRpm: (rpm) => set({ rpm }),
  gear: '1',
  setGear: (gear) => set({ gear }),
  setTelemetry: (data) => set((s) => ({ ...s, ...data })),
  transmissionMode: 'auto',
  setTransmissionMode: (transmissionMode) => set({ transmissionMode }),
  toggleTransmissionMode: () =>
    set((s) => ({ transmissionMode: s.transmissionMode === 'auto' ? 'manual' : 'auto' })),
  distance: 0,
  addDistance: (delta) => set((s) => ({ distance: s.distance + delta })),
  throttle: 0,
  setThrottle: (throttle) => set({ throttle }),
  brake: 0,
  setBrake: (brake) => set({ brake }),
  steering: 0,
  setSteering: (steering) => set({ steering }),
  autoDrive: false,
  toggleAutoDrive: () => set((s) => ({ autoDrive: !s.autoDrive })),
  headlights: true,
  toggleHeadlights: () => set((s) => ({ headlights: !s.headlights })),
  setHeadlights: (headlights) => set({ headlights }),
  headlightBeam: 'low',
  toggleHeadlightBeam: () => set((s) => ({ headlightBeam: s.headlightBeam === 'low' ? 'high' : 'low' })),
  setHeadlightBeam: (headlightBeam) => set({ headlightBeam }),

  // On-screen / Touch Controls
  virtualThrottle: false,
  setVirtualThrottle: (virtualThrottle) => set({ virtualThrottle }),
  virtualBrake: false,
  setVirtualBrake: (virtualBrake) => set({ virtualBrake }),
  virtualSteerLeft: false,
  setVirtualSteerLeft: (virtualSteerLeft) => set({ virtualSteerLeft }),
  virtualSteerRight: false,
  setVirtualSteerRight: (virtualSteerRight) => set({ virtualSteerRight }),
  isBurnout: false,
  setIsBurnout: (isBurnout) => set({ isBurnout }),
  virtualBurnout: false,
  setVirtualBurnout: (virtualBurnout) => set({ virtualBurnout }),

  // Audio
  isMusicPlaying: false,
  toggleMusic: () => set((s) => ({ isMusicPlaying: !s.isMusicPlaying })),
  musicVolume: 0.65,
  setMusicVolume: (musicVolume) => set({ musicVolume }),
  sfxVolume: 0.5,
  setSfxVolume: (sfxVolume) => set({ sfxVolume }),
  masterVolume: 1.0,
  setMasterVolume: (masterVolume) => set({ masterVolume }),
  engineVolume: 0.85,
  setEngineVolume: (engineVolume) => set({ engineVolume }),
  ambienceVolume: 0.70,
  setAmbienceVolume: (ambienceVolume) => set({ ambienceVolume }),
  currentTrackIndex: 0,
  nextTrack: () => set((s) => ({ currentTrackIndex: (s.currentTrackIndex + 1) % 5 })),
  prevTrack: () => set((s) => ({ currentTrackIndex: (s.currentTrackIndex - 1 + 5) % 5 })),

  // UI Modes
  photoMode: false,
  setPhotoMode: (photoMode) => set({ photoMode }),
  togglePhotoMode: () => set((s) => ({ photoMode: !s.photoMode, zenMode: false })),
  zenMode: false,
  setZenMode: (zenMode) => set({ zenMode }),
  toggleZenMode: () => set((s) => ({ zenMode: !s.zenMode })),
  cleanHud: false,
  toggleCleanHud: () => set((s) => ({ cleanHud: !s.cleanHud })),
  activePanel: 'none',
  setActivePanel: (activePanel) =>
    set((s) => ({ activePanel: s.activePanel === activePanel ? 'none' : activePanel })),
  speedUnit: 'kmh',
  toggleSpeedUnit: () => set((s) => ({ speedUnit: s.speedUnit === 'kmh' ? 'mph' : 'kmh' })),
  graphicsQuality: 'high',
  setGraphicsQuality: (graphicsQuality) => set({ graphicsQuality }),
  isFullscreen: false,
  toggleFullscreen: () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      set({ isFullscreen: true })
    } else {
      document.exitFullscreen().catch(() => {})
      set({ isFullscreen: false })
    }
  },

  // Discoveries & Challenges Progression
  discoveries: loadStoredJson<string[]>('discoveries', []),
  addDiscovery: (id: string) => {
    const list = get().discoveries
    if (!list.includes(id)) {
      const updated = [...list, id]
      saveStoredJson('discoveries', updated)
      set({ discoveries: updated })
    }
  },
  activeLandmarkNotification: null,
  setActiveLandmarkNotification: (activeLandmarkNotification) =>
    set({ activeLandmarkNotification }),
  completedChallenges: loadStoredJson<string[]>('completed_challenges', []),
  addCompletedChallenge: (id: string) => {
    const list = get().completedChallenges
    if (!list.includes(id)) {
      const updated = [...list, id]
      saveStoredJson('completed_challenges', updated)
      set({ completedChallenges: updated })
    }
  },
  challengeNotification: null,
  setChallengeNotification: (challengeNotification) =>
    set({ challengeNotification }),
  drivingStats: loadStoredJson<DrivingStats>('driving_stats', {
    totalDistanceKm: 0,
    topSpeedKmh: 0,
    totalDrivingTimeSec: 0,
    totalDriftDistanceM: 0,
    cleanAsphaltDistanceM: 0,
    redlineShiftsCount: 0,
  }),
  updateDrivingStats: (delta) => {
    const current = get().drivingStats
    const updated: DrivingStats = {
      totalDistanceKm: Number((current.totalDistanceKm + (delta.totalDistanceKm || 0)).toFixed(3)),
      topSpeedKmh: Math.max(current.topSpeedKmh, delta.topSpeedKmh || 0),
      totalDrivingTimeSec: Math.round(current.totalDrivingTimeSec + (delta.totalDrivingTimeSec || 0)),
      totalDriftDistanceM: Math.round(current.totalDriftDistanceM + (delta.totalDriftDistanceM || 0)),
      cleanAsphaltDistanceM: Math.round(current.cleanAsphaltDistanceM + (delta.cleanAsphaltDistanceM || 0)),
      redlineShiftsCount: current.redlineShiftsCount + (delta.redlineShiftsCount || 0),
    }
    saveStoredJson('driving_stats', updated)
    set({ drivingStats: updated })
  },

  // Diagnostics & Engine Telemetry
  showDiagnostics: false,
  setShowDiagnostics: (showDiagnostics) => set({ showDiagnostics }),
  toggleDiagnostics: () => set((s) => ({ showDiagnostics: !s.showDiagnostics })),
  diagnostics: {
    fps: 60,
    activeChunks: 28,
    frontierBuffer: 4800,
    drawDistance: 5600,
    speedKmh: 0,
    chunksAhead: 24,
    prepTimeMs: 1.2,
    roadElevation: 0,
    terrainElevation: 0,
    corridorClearance: 0.28,
    roadBankingDeg: 0,
    macroTerrainType: 'PLAINS',
    macroNoise: 0.1,
    plainsWeight: 1.0,
    rollingHillsWeight: 0.0,
    twistedClimbWeight: 0.0,
    macroAmplitude: 3.2,
    roadCurvature: 0.12,
    bulldozerClearance: 0.28,
    roadProtectedRadius: 12.0,
  },
  setDiagnostics: (d) => set((s) => ({ diagnostics: { ...s.diagnostics, ...d } })),
}))

/**
 * High-Frequency Transient Telemetry Store.
 * Decoupled from useGameStore to guarantee 0 FPS Canvas re-renders.
 * Only the 2D DOM HUD instruments subscribe to this store.
 */
export interface TelemetryState {
  speed: number
  peakSpeed: number
  rpm: number
  redlineRpm: number
  upshiftRpm: number
  gear: string
  gearState: 'D' | 'R' | 'N' | 'HOV'
  isShifting: boolean
  transmissionMode?: 'auto' | 'manual'
  distance: number
  throttle: number
  brake: number
  isHandbrake: boolean
  isBurnout?: boolean
  wheelSlip?: number
  pitch?: number
  roll?: number
  suspension?: [number, number, number, number]
  roadClearance?: number
  onRoad?: boolean
  distFromRoad?: number
  isGrounded?: boolean
  verticalVel?: number
  reflectionPreset?: string
  // Calm Roads 3.0 Telemetry
  gForceLateral?: number
  gForceLongitudinal?: number
  slipAngle?: number
  tireGripPercent?: number
  isDrifting?: boolean
  driftDistance?: number
  setTelemetry: (data: Partial<TelemetryState>) => void
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  speed: 0,
  peakSpeed: 0,
  rpm: 850,
  redlineRpm: 8500,
  upshiftRpm: 7400,
  gear: '1',
  gearState: 'D',
  isShifting: false,
  transmissionMode: 'auto',
  distance: 0,
  throttle: 0,
  brake: 0,
  isHandbrake: false,
  isBurnout: false,
  wheelSlip: 0,
  pitch: 0,
  roll: 0,
  suspension: [0, 0, 0, 0],
  roadClearance: 116,
  onRoad: true,
  distFromRoad: 0,
  isGrounded: true,
  verticalVel: 0,
  reflectionPreset: 'forest',
  gForceLateral: 0,
  gForceLongitudinal: 0,
  slipAngle: 0,
  tireGripPercent: 100,
  isDrifting: false,
  driftDistance: 0,
  setTelemetry: (data) => set((s) => ({ ...s, ...data })),
}))

if (typeof window !== 'undefined') {
  ;(window as any).__GAME_STORE__ = useGameStore
  ;(window as any).__TELEMETRY_STORE__ = useTelemetryStore
}
