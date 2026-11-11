import { create } from 'zustand'
import {
  setWorldGenerationConfig,
  type BiomeType,
  type MacroTerrainType,
  type MacroTerrainWeights,
} from '../utils/roadMath.ts'
import { getDestinationById, type DestinationId } from '../utils/destinations.ts'

export type WeatherType = 'clear' | 'rain' | 'snow' | 'mist'
export type VehicleModelType = 'bmw_m3' | 'supercar' | 'hovercraft' | 'camper' | 'hatchback' | 'modern_supercar' | 'vintage_hatch'
export type CameraPerspectiveType = 'chase' | 'dashboard' | 'drone' | 'bumper'
export type BiomeSelection = 'dynamic' | BiomeType

export const SUPPORTED_STARTING_BIOMES: BiomeType[] = [
  'plains',
  'rolling_hills',
  'twisted_mountains',
  'desert',
  'coastal',
  'forest',
  'autumn',
  'alpine',
  'tundra',
  'enchanted_forest',
]

export const START_Z_COORDINATES = [0, -400, -800, -1200, -1600, -2000, -2400, -2800]

export interface WorldConfiguration {
  sessionId: string
  generationId: number
  biomeId: BiomeSelection
  worldSeed: number
  startZ: number
  spawnPoint: { x: number; y: number; z: number; yaw: number }
  roadProfileId: string
  weatherPreset: WeatherType
}

export interface DestinationBannerState {
  name: string
  subtitle: string
  roadType: string
  visible: boolean
}

let _bannerTimer: ReturnType<typeof setTimeout> | null = null
let _travelTimer: ReturnType<typeof setTimeout> | null = null

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

  // 2b. Macro Terrain System, World Lifecycle & Seeded Travel
  sessionId: string
  generationId: number
  startZ: number
  isWorldReady: boolean
  setIsWorldReady: (r: boolean) => void
  worldSeed: number
  setWorldSeed: (s: number) => void
  randomizeWorldSeed: () => number
  travelCounter: number
  isTraveling: boolean
  destinationBanner: DestinationBannerState | null
  setDestinationBanner: (b: DestinationBannerState | null) => void
  initNewGameSession: (customSeed?: number, customBiome?: BiomeSelection, customStartZ?: number) => void
  replaceActiveBiome: (destId: DestinationId, customSeed?: number, customStartZ?: number) => void
  travelToBiome: (destId: DestinationId, customSeed?: number, customStartZ?: number) => void
  macroTerrain: MacroTerrainType
  setMacroTerrain: (m: MacroTerrainType) => void
  macroWeights: MacroTerrainWeights
  setMacroWeights: (w: MacroTerrainWeights) => void

  // 3. Time of Day & Weather
  timeOfDay: number // 0.0 to 24.0 (hours)
  setTimeOfDay: (t: number) => void
  autoTimeCycle: boolean
  toggleAutoTimeCycle: () => void
  weather: WeatherType
  setWeather: (w: WeatherType) => void
  cycleWeather: () => void

  // 4. Vehicle Selection & Customization
  vehicleModel: VehicleModelType
  setVehicleModel: (v: VehicleModelType) => void
  cycleVehicleModel: () => void
  paintColor: string
  setPaintColor: (c: string) => void
  metallic: number
  setMetallic: (m: number) => void
  roughness: number
  setRoughness: (r: number) => void

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
  setVirtualBurnout: (b: boolean) => void

  // 7. Audio System
  isMusicPlaying: boolean
  toggleMusic: () => void
  musicVolume: number
  setMusicVolume: (v: number) => void
  sfxVolume: number
  setSfxVolume: (v: number) => void
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
  activePanel: 'none' | 'garage' | 'environment' | 'audio' | 'controls' | 'settings' | 'travel'
  setActivePanel: (p: 'none' | 'garage' | 'environment' | 'audio' | 'controls' | 'settings' | 'travel') => void
  speedUnit: 'kmh' | 'mph'
  toggleSpeedUnit: () => void
  graphicsQuality: 'low' | 'medium' | 'high'
  setGraphicsQuality: (q: 'low' | 'medium' | 'high') => void
  isFullscreen: boolean
  toggleFullscreen: () => void

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
const CAMERAS: CameraPerspectiveType[] = ['chase', 'dashboard', 'drone', 'bumper']

// Generate initial randomized session configuration
const _initialSeed = Math.floor(Math.random() * 900000) + 100000
const _initialBiome = SUPPORTED_STARTING_BIOMES[Math.floor(Math.random() * SUPPORTED_STARTING_BIOMES.length)]
const _initialStartZ = START_Z_COORDINATES[Math.floor(Math.random() * START_Z_COORDINATES.length)]
setWorldGenerationConfig(_initialSeed, _initialBiome, _initialStartZ)
const _initialDest = getDestinationById(_initialBiome)

export const useGameStore = create<GameState>((set, get) => ({
  // Antigravity & Physics
  isHoverMode: false,
  toggleHoverMode: () => set((s) => ({ isHoverMode: !s.isHoverMode })),
  setHoverMode: (isHoverMode) => set({ isHoverMode }),

  // Biomes, Seeded Travel & Session Lifecycle
  sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  generationId: 1,
  startZ: _initialStartZ,
  isWorldReady: true,
  setIsWorldReady: (isWorldReady) => set({ isWorldReady }),

  biome: _initialBiome,
  setBiome: (biome) => {
    set({ biome })
    setWorldGenerationConfig(get().worldSeed, biome, get().startZ)
  },
  currentResolvedBiome: _initialBiome,
  setCurrentResolvedBiome: (currentResolvedBiome) => set({ currentResolvedBiome }),

  worldSeed: _initialSeed,
  setWorldSeed: (worldSeed) => {
    set({ worldSeed })
    setWorldGenerationConfig(worldSeed, get().biome, get().startZ)
  },
  randomizeWorldSeed: () => {
    const newSeed = Math.floor(Math.random() * 900000) + 100000
    set({ worldSeed: newSeed })
    setWorldGenerationConfig(newSeed, get().biome, get().startZ)
    return newSeed
  },
  travelCounter: 0,
  isTraveling: false,
  destinationBanner: {
    name: _initialDest.name,
    subtitle: _initialDest.subtitle,
    roadType: _initialDest.roadPersonality,
    visible: true,
  },
  setDestinationBanner: (destinationBanner) => set({ destinationBanner }),

  // Initialize a fresh new game session with a random balanced biome and unique seed
  initNewGameSession: (customSeed?: number, customBiome?: BiomeSelection, customStartZ?: number) => {
    const s = get()
    const chosenBiome = customBiome !== undefined
      ? customBiome
      : SUPPORTED_STARTING_BIOMES[Math.floor(Math.random() * SUPPORTED_STARTING_BIOMES.length)]
    const chosenSeed = customSeed !== undefined
      ? customSeed
      : Math.floor(Math.random() * 900000) + 100000
    const chosenStartZ = customStartZ !== undefined
      ? customStartZ
      : START_Z_COORDINATES[Math.floor(Math.random() * START_Z_COORDINATES.length)]

    const newGenId = (s.generationId || 0) + 1
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    setWorldGenerationConfig(chosenSeed, chosenBiome, chosenStartZ)
    const destInfo = getDestinationById(chosenBiome)

    if (_bannerTimer) clearTimeout(_bannerTimer)
    if (_travelTimer) clearTimeout(_travelTimer)

    set({
      sessionId: newSessionId,
      generationId: newGenId,
      biome: chosenBiome,
      worldSeed: chosenSeed,
      startZ: chosenStartZ,
      travelCounter: s.travelCounter + 1,
      isTraveling: true,
      isWorldReady: false,
      activePanel: 'none',
      destinationBanner: {
        name: destInfo.name,
        subtitle: destInfo.subtitle,
        roadType: destInfo.roadPersonality,
        visible: true,
      },
    })

    _travelTimer = setTimeout(() => {
      if (get().generationId === newGenId) {
        set({ isTraveling: false, isWorldReady: true })
      }
    }, 120)

    _bannerTimer = setTimeout(() => {
      if (get().generationId === newGenId) {
        set((curr) => ({
          destinationBanner: curr.destinationBanner ? { ...curr.destinationBanner, visible: false } : null,
        }))
      }
    }, 4500)
  },

  // Authoritatively replace active biome with a new biome, generating a unique road layout and clearing obsolete jobs
  replaceActiveBiome: (destId: DestinationId, customSeed?: number, customStartZ?: number) => {
    const s = get()
    let chosenId = destId
    if (chosenId === 'random') {
      chosenId = SUPPORTED_STARTING_BIOMES[Math.floor(Math.random() * SUPPORTED_STARTING_BIOMES.length)]
    }

    // When traveling to another biome, generate a fresh new seed by default so road and terrain layout are completely new
    const targetSeed = customSeed !== undefined
      ? customSeed
      : (chosenId === s.biome && destId !== 'random'
          ? s.worldSeed
          : Math.floor(Math.random() * 900000) + 100000)

    const effectiveBiome: BiomeSelection = chosenId === 'dynamic' ? 'dynamic' : (chosenId as BiomeType)
    const targetStartZ = customStartZ !== undefined ? customStartZ : 0
    const nextGenId = (s.generationId || 0) + 1

    // 1. Authoritatively reconfigure procedural world generation noise and parameters
    setWorldGenerationConfig(targetSeed, effectiveBiome, targetStartZ)

    const destInfo = getDestinationById(chosenId)

    // 2. Clear lingering timers
    if (_bannerTimer) clearTimeout(_bannerTimer)
    if (_travelTimer) clearTimeout(_travelTimer)

    // 3. Freeze inputs and trigger destination banner
    set({
      biome: effectiveBiome,
      worldSeed: targetSeed,
      startZ: targetStartZ,
      generationId: nextGenId,
      travelCounter: s.travelCounter + 1,
      isTraveling: true,
      isWorldReady: false,
      activePanel: 'none',
      destinationBanner: {
        name: destInfo.name,
        subtitle: destInfo.subtitle,
        roadType: destInfo.roadPersonality,
        visible: true,
      },
    })

    // 4. Safe handover after geometry & shaders bind (guarantees cancellation of obsolete async requests)
    _travelTimer = setTimeout(() => {
      if (get().generationId === nextGenId) {
        set({ isTraveling: false, isWorldReady: true })
      }
    }, 120)

    _bannerTimer = setTimeout(() => {
      if (get().generationId === nextGenId) {
        set((curr) => ({
          destinationBanner: curr.destinationBanner ? { ...curr.destinationBanner, visible: false } : null,
        }))
      }
    }, 4500)
  },

  travelToBiome: (destId: DestinationId, customSeed?: number, customStartZ?: number) => {
    get().replaceActiveBiome(destId, customSeed, customStartZ)
  },

  // Macro Terrain System
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

  // Time & Weather
  timeOfDay: 17.5, // Default to stunning Golden Hour
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  autoTimeCycle: true,
  toggleAutoTimeCycle: () => set((s) => ({ autoTimeCycle: !s.autoTimeCycle })),
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
  paintColor: '#cbd5e1', // Iconic German Silver
  setPaintColor: (paintColor) => set({ paintColor }),
  metallic: 0.9,
  setMetallic: (metallic) => set({ metallic }),
  roughness: 0.2,
  setRoughness: (roughness) => set({ roughness }),

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
  activePanel: 'none',
  setActivePanel: (activePanel) => set((s) => ({ activePanel: s.activePanel === activePanel ? 'none' : activePanel })),
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
  rpm: number
  maxRpm?: number
  redlineRpm?: number
  gear: string
  distance: number
  throttle: number
  brake: number
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
  setTelemetry: (data: Partial<TelemetryState>) => void
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  speed: 0,
  rpm: 850,
  maxRpm: 8500,
  redlineRpm: 7200,
  gear: '1',
  distance: 0,
  throttle: 0,
  brake: 0,
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
  setTelemetry: (data) => set((s) => ({ ...s, ...data })),
}))
