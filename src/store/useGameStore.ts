import { create } from 'zustand'
import { BiomeType } from '../utils/roadMath'

export type WeatherType = 'clear' | 'rain' | 'snow' | 'mist'
export type VehicleModelType = 'bmw_m3' | 'supercar' | 'hovercraft' | 'camper' | 'hatchback'
export type CameraPerspectiveType = 'chase' | 'dashboard' | 'drone' | 'bumper'
export type BiomeSelection = 'dynamic' | BiomeType

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
  activePanel: 'none' | 'garage' | 'environment' | 'audio' | 'controls' | 'settings'
  setActivePanel: (p: 'none' | 'garage' | 'environment' | 'audio' | 'controls' | 'settings') => void
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
    }>
  ) => void
}

const WEATHERS: WeatherType[] = ['clear', 'rain', 'snow', 'mist']
const VEHICLES: VehicleModelType[] = ['bmw_m3', 'supercar', 'hovercraft', 'camper', 'hatchback']
const CAMERAS: CameraPerspectiveType[] = ['chase', 'dashboard', 'drone', 'bumper']

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
  gear: string
  distance: number
  throttle: number
  brake: number
  isBurnout?: boolean
  wheelSlip?: number
  setTelemetry: (data: Partial<TelemetryState>) => void
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  speed: 0,
  rpm: 850,
  gear: '1',
  distance: 0,
  throttle: 0,
  brake: 0,
  isBurnout: false,
  wheelSlip: 0,
  setTelemetry: (data) => set((s) => ({ ...s, ...data })),
}))
