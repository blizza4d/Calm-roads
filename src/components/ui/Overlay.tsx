import { useState, useEffect } from 'react'
import HUD from './HUD'
import PerformanceProfiler from './PerformanceProfiler'
import {
  CloudSun,
  Camera,
  Maximize,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  HelpCircle,
  X,
  Palette,
  Sparkles,
  Eye,
  EyeOff,
  Sun,
  Moon,
  CloudRain,
  Snowflake,
  Wind,
  Flame,
  Mountain,
  Compass,
  Radio,
  Activity,
  Settings,
  Menu,
  Sliders,
  Trophy,
  Map,
  CheckCircle2,
  Lock,
  Zap,
} from 'lucide-react'
import {
  useGameStore,
  WeatherType,
  VehicleModelType,
  CameraPerspectiveType,
  PaintFinishType,
  GraphicsQualityType,
} from '../../store/useGameStore'
import { useLoadingStore } from '../../store/useLoadingStore'
import { audioSystem, LOFI_PLAYLIST } from '../../utils/audioSystem'
import { BIOMES, SCENIC_ROUTES } from '../../utils/roadMath'
import { WORLD_LANDMARKS } from '../../utils/landmarks'
import { DRIVING_CHALLENGES } from '../../utils/challenges'

// ----------------------------------------------------------------
// 1. Optional On-Screen Touch Controls (Hidden by default)
// ----------------------------------------------------------------
function TouchPedals() {
  const setVirtualThrottle = useGameStore((s) => s.setVirtualThrottle)
  const setVirtualBrake = useGameStore((s) => s.setVirtualBrake)
  const setVirtualBurnout = useGameStore((s) => s.setVirtualBurnout)
  const setVirtualSteerLeft = useGameStore((s) => s.setVirtualSteerLeft)
  const setVirtualSteerRight = useGameStore((s) => s.setVirtualSteerRight)
  const autoDrive = useGameStore((s) => s.autoDrive)

  if (autoDrive) return null

  return (
    <div className="fixed bottom-24 inset-x-0 flex justify-between px-6 pointer-events-none select-none z-30">
      {/* Steering Buttons (Left Side) */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          onPointerDown={() => setVirtualSteerLeft(true)}
          onPointerUp={() => setVirtualSteerLeft(false)}
          onPointerLeave={() => setVirtualSteerLeft(false)}
          className="w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 text-white font-bold text-xl flex items-center justify-center active:bg-white/30 transition-all shadow-xl"
        >
          ←
        </button>
        <button
          onPointerDown={() => setVirtualSteerRight(true)}
          onPointerUp={() => setVirtualSteerRight(false)}
          onPointerLeave={() => setVirtualSteerRight(false)}
          className="w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 text-white font-bold text-xl flex items-center justify-center active:bg-white/30 transition-all shadow-xl"
        >
          →
        </button>
      </div>

      {/* Pedals: Burnout, Brake & Throttle (Right Side) */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          onPointerDown={() => setVirtualBurnout(true)}
          onPointerUp={() => setVirtualBurnout(false)}
          onPointerLeave={() => setVirtualBurnout(false)}
          className="px-3 h-14 rounded-2xl bg-amber-950/60 backdrop-blur-md border border-amber-500/40 text-amber-200 font-mono font-bold text-xs flex flex-col items-center justify-center active:bg-amber-800/70 transition-all shadow-xl"
        >
          <span>BURNOUT</span>
          <span className="text-[8px] opacity-70">[B]</span>
        </button>
        <button
          onPointerDown={() => setVirtualBrake(true)}
          onPointerUp={() => setVirtualBrake(false)}
          onPointerLeave={() => setVirtualBrake(false)}
          className="px-4 h-14 rounded-2xl bg-red-950/50 backdrop-blur-md border border-red-500/40 text-red-200 font-mono font-bold text-xs flex flex-col items-center justify-center active:bg-red-800/60 transition-all shadow-xl"
        >
          <span>BRAKE</span>
          <span className="text-[8px] opacity-70">[S / ↓]</span>
        </button>
        <button
          onPointerDown={() => setVirtualThrottle(true)}
          onPointerUp={() => setVirtualThrottle(false)}
          onPointerLeave={() => setVirtualThrottle(false)}
          className="px-5 h-14 rounded-2xl bg-emerald-950/50 backdrop-blur-md border border-emerald-500/40 text-emerald-200 font-mono font-bold text-xs flex flex-col items-center justify-center active:bg-emerald-800/60 transition-all shadow-xl"
        >
          <span>GAS</span>
          <span className="text-[8px] opacity-70">[W / ↑]</span>
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 2. High-Precision Motorsport Telemetry Cluster (Bottom Right)
// ----------------------------------------------------------------
function SpeedometerHUD() {
  return <HUD />
}

// ----------------------------------------------------------------
// 2.5 Region Discovery Banner (Toast on entering new biome/region)
// ----------------------------------------------------------------
function RegionDiscoveryBanner() {
  const currentResolvedBiome = useGameStore((s) => s.currentResolvedBiome)
  const activeLandmarkNotification = useGameStore((s) => s.activeLandmarkNotification)
  const challengeNotification = useGameStore((s) => s.challengeNotification)
  const scenicRouteNotification = useGameStore((s) => s.scenicRouteNotification)
  const [visible, setVisible] = useState(false)
  const [activeBiome, setActiveBiome] = useState(currentResolvedBiome)

  useEffect(() => {
    setActiveBiome(currentResolvedBiome)
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
    }, 4500)
    return () => clearTimeout(timer)
  }, [currentResolvedBiome])

  const info = BIOMES[activeBiome] || BIOMES.twisted_mountains

  return (
    <div className="fixed top-20 inset-x-0 flex flex-col items-center gap-2 pointer-events-none select-none z-40">
      {/* 1. Landmark Discovery Toast */}
      {activeLandmarkNotification && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 backdrop-blur-xl bg-gradient-to-r from-amber-950/90 via-black/95 to-amber-950/90 border border-[#FF9D1E] px-6 py-3 rounded-2xl shadow-[0_0_35px_rgba(255,157,30,0.55)] flex items-center gap-3.5 max-w-lg text-white">
          <div className="w-9 h-9 rounded-xl bg-[#FF9D1E]/20 border border-[#FF9D1E] flex items-center justify-center text-[#FF9D1E]">
            <Compass size={20} className="animate-spin-slow" />
          </div>
          <div>
            <div className="text-[9px] font-mono text-[#FF9D1E] tracking-widest font-black uppercase">
              ★ SCENIC LANDMARK DISCOVERED ★
            </div>
            <div className="text-sm font-black text-white tracking-wide">{activeLandmarkNotification.name}</div>
            <div className="text-[10px] text-white/60 font-mono">{activeLandmarkNotification.subtitle}</div>
          </div>
        </div>
      )}

      {/* 2. Scenic Route Entered Toast */}
      {scenicRouteNotification && !activeLandmarkNotification && !challengeNotification && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 backdrop-blur-xl bg-gradient-to-r from-sky-950/90 via-black/95 to-sky-950/90 border border-sky-400 px-6 py-3 rounded-2xl shadow-[0_0_35px_rgba(56,189,248,0.55)] flex items-center gap-3.5 max-w-lg text-white">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-400">
            <Compass size={20} className="animate-spin-slow" />
          </div>
          <div>
            <div className="text-[9px] font-mono text-sky-400 tracking-widest font-black uppercase">
              ★ SCENIC BYWAY ENTERED ★
            </div>
            <div className="text-sm font-black text-white tracking-wide">{scenicRouteNotification.name}</div>
            <div className="text-[10px] text-white/60 font-mono">{scenicRouteNotification.subtitle}</div>
          </div>
        </div>
      )}

      {/* 3. Challenge Completed Toast */}
      {challengeNotification && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 backdrop-blur-xl bg-gradient-to-r from-emerald-950/90 via-black/95 to-emerald-950/90 border border-emerald-400 px-6 py-3 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.55)] flex items-center gap-3.5 max-w-lg text-white">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
            <Trophy size={20} />
          </div>
          <div>
            <div className="text-[9px] font-mono text-emerald-400 tracking-widest font-black uppercase">
              CHALLENGE ACCOMPLISHED!
            </div>
            <div className="text-sm font-black text-white tracking-wide">{challengeNotification}</div>
          </div>
        </div>
      )}

      {/* 4. Standard Biome Entry Toast */}
      {visible && !activeLandmarkNotification && !challengeNotification && !scenicRouteNotification && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-500 backdrop-blur-md bg-black/60 border border-white/10 px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 text-white">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <div>
            <span className="text-[9px] font-mono text-white/50 tracking-widest font-bold uppercase block">
              ENTERING REGION
            </span>
            <span className="text-xs font-black tracking-wide text-white">{info.name}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// 3. Photo Mode Studio View (Focal length, aperture, capture)
// ----------------------------------------------------------------
function PhotoModeView() {
  const togglePhotoMode = useGameStore((s) => s.togglePhotoMode)
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay)
  const weather = useGameStore((s) => s.weather)
  const setWeather = useGameStore((s) => s.setWeather)
  const handleCapture = () => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `calm-roads-3.0-${Date.now()}.png`
      a.click()
    }
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto flex flex-col justify-between p-6 select-none">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div className="backdrop-blur-md bg-black/60 border border-white/20 px-4 py-2 rounded-2xl text-white flex items-center gap-2">
          <Camera size={16} className="text-[#FF9D1E]" />
          <span className="text-xs font-bold tracking-wider font-mono">PHOTO STUDIO 3.0</span>
        </div>
        <button
          onClick={togglePhotoMode}
          className="backdrop-blur-md bg-black/60 hover:bg-white/20 border border-white/20 text-white w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer"
          title="Exit Photo Mode [P / Esc]"
        >
          <X size={16} />
        </button>
      </div>

      {/* Composition Grid Overlay (Rule of Thirds) */}
      <div className="pointer-events-none absolute inset-x-8 inset-y-24 grid grid-cols-3 grid-rows-3 border border-white/10 opacity-30">
        <div className="border-r border-b border-white/10" />
        <div className="border-r border-b border-white/10" />
        <div className="border-b border-white/10" />
        <div className="border-r border-b border-white/10" />
        <div className="border-r border-b border-white/10" />
        <div className="border-b border-white/10" />
        <div className="border-r border-white/10" />
        <div className="border-r border-white/10" />
        <div />
      </div>

      {/* Bottom Photo Controls Bar */}
      <div className="backdrop-blur-xl bg-neutral-900/90 border border-white/20 rounded-3xl p-4 max-w-2xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4 text-white shadow-2xl">
        {/* Time of Day Slider */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Sun size={15} className="text-amber-400" />
          <input
            type="range"
            min={0}
            max={24}
            step={0.2}
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
            className="w-32 accent-amber-500 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
            title="Time of Day"
          />
        </div>

        {/* Weather Selector */}
        <div className="flex items-center gap-1.5">
          {(['clear', 'rain', 'snow', 'mist'] as WeatherType[]).map((w) => (
            <button
              key={w}
              onClick={() => setWeather(w)}
              className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                weather === w ? 'bg-amber-500 text-black font-black' : 'bg-white/10 hover:bg-white/20 text-white/70'
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Capture Snapshot Button */}
        <button
          onClick={handleCapture}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all cursor-pointer active:scale-95"
        >
          <Camera size={15} />
          <span>CAPTURE PHOTO</span>
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 4. Real-time Dev Diagnostics HUD
// ----------------------------------------------------------------
function DiagnosticsHUD() {
  const d = useGameStore((s) => s.diagnostics)
  const seed = useGameStore((s) => s.worldSeed)

  return (
    <div className="fixed top-20 left-6 z-40 backdrop-blur-md bg-black/75 border border-white/20 p-4 rounded-2xl text-[10px] font-mono text-white/80 space-y-1 pointer-events-auto shadow-2xl select-text max-w-xs">
      <div className="text-amber-400 font-bold border-b border-white/10 pb-1 mb-1.5 flex justify-between">
        <span>ENGINE TELEMETRY 3.0</span>
        <span className="text-white/50">{seed}</span>
      </div>
      <div>FPS: {d.fps}</div>
      <div>Active Chunks: {d.activeChunks}</div>
      <div>Speed: {d.speedKmh} km/h</div>
      <div>Macro Region: {d.macroTerrainType}</div>
      <div>Road Elevation: {d.roadElevation}m</div>
      <div>Terrain Elevation: {d.terrainElevation}m</div>
      <div>Corridor Clearance: {d.corridorClearance}m</div>
      <div>Road Banking: {d.roadBankingDeg}°</div>
      <div>Road Grade: {d.roadGrade}%</div>
    </div>
  )
}

// ----------------------------------------------------------------
// 5. Consolidated Master Menu Modal (All Tabs)
// ----------------------------------------------------------------
interface MasterMenuModalProps {
  activePanel: string
  setActivePanel: (p: any) => void
  showTouchControls: boolean
  setShowTouchControls: (v: boolean | ((prev: boolean) => boolean)) => void
}

function MasterMenuModal({
  activePanel,
  setActivePanel,
  showTouchControls,
  setShowTouchControls,
}: MasterMenuModalProps) {
  // Store selectors
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay)
  const autoTimeCycle = useGameStore((s) => s.autoTimeCycle)
  const toggleAutoTimeCycle = useGameStore((s) => s.toggleAutoTimeCycle)
  const weather = useGameStore((s) => s.weather)
  const setWeather = useGameStore((s) => s.setWeather)
  const biome = useGameStore((s) => s.biome)
  const setBiome = useGameStore((s) => s.setBiome)
  const worldSeed = useGameStore((s) => s.worldSeed)
  const setWorldSeed = useGameStore((s) => s.setWorldSeed)

  // Vehicle Customization
  const vehicleModel = useGameStore((s) => s.vehicleModel)
  const setVehicleModel = useGameStore((s) => s.setVehicleModel)
  const paintColor = useGameStore((s) => s.paintColor)
  const setPaintColor = useGameStore((s) => s.setPaintColor)
  const paintFinish = useGameStore((s) => s.paintFinish)
  const setPaintFinish = useGameStore((s) => s.setPaintFinish)
  const caliperColor = useGameStore((s) => s.caliperColor)
  const setCaliperColor = useGameStore((s) => s.setCaliperColor)
  const rimColor = useGameStore((s) => s.rimColor)
  const setRimColor = useGameStore((s) => s.setRimColor)
  const spoilerType = useGameStore((s) => s.spoilerType)
  const setSpoilerType = useGameStore((s) => s.setSpoilerType)
  const isHoverMode = useGameStore((s) => s.isHoverMode)
  const toggleHoverMode = useGameStore((s) => s.toggleHoverMode)

  // Audio
  const isMusicPlaying = useGameStore((s) => s.isMusicPlaying)
  const toggleMusic = useGameStore((s) => s.toggleMusic)
  const currentTrackIndex = useGameStore((s) => s.currentTrackIndex)
  const nextTrack = useGameStore((s) => s.nextTrack)
  const prevTrack = useGameStore((s) => s.prevTrack)
  const musicVolume = useGameStore((s) => s.musicVolume)
  const setMusicVolume = useGameStore((s) => s.setMusicVolume)
  const sfxVolume = useGameStore((s) => s.sfxVolume)
  const setSfxVolume = useGameStore((s) => s.setSfxVolume)

  // Discoveries & Challenges
  const discoveries = useGameStore((s) => s.discoveries)
  const completedChallenges = useGameStore((s) => s.completedChallenges)
  const drivingStats = useGameStore((s) => s.drivingStats)
  const discoveredScenicRoutes = useGameStore((s) => s.discoveredScenicRoutes)
  const activeScenicRoute = useGameStore((s) => s.activeScenicRoute)

  // Settings
  const speedUnit = useGameStore((s) => s.speedUnit)
  const toggleSpeedUnit = useGameStore((s) => s.toggleSpeedUnit)
  const graphicsQuality = useGameStore((s) => s.graphicsQuality)
  const setGraphicsQuality = useGameStore((s) => s.setGraphicsQuality)
  const isFullscreen = useGameStore((s) => s.isFullscreen)
  const toggleFullscreen = useGameStore((s) => s.toggleFullscreen)
  const headlights = useGameStore((s) => s.headlights)
  const toggleHeadlights = useGameStore((s) => s.toggleHeadlights)
  const headlightBeam = useGameStore((s) => s.headlightBeam)
  const toggleHeadlightBeam = useGameStore((s) => s.toggleHeadlightBeam)
  const timeSpeed = useGameStore((s) => s.timeSpeed)
  const setTimeSpeed = useGameStore((s) => s.setTimeSpeed)
  const skipToSunrise = useGameStore((s) => s.skipToSunrise)
  const skipToMidday = useGameStore((s) => s.skipToMidday)
  const skipToSunset = useGameStore((s) => s.skipToSunset)
  const skipToMidnight = useGameStore((s) => s.skipToMidnight)
  const cleanHud = useGameStore((s) => s.cleanHud)
  const toggleCleanHud = useGameStore((s) => s.toggleCleanHud)
  const transmissionMode = useGameStore((s) => s.transmissionMode)
  const toggleTransmissionMode = useGameStore((s) => s.toggleTransmissionMode)
  const showDiagnostics = useGameStore((s) => s.showDiagnostics)
  const toggleDiagnostics = useGameStore((s) => s.toggleDiagnostics)

  const [seedInput, setSeedInput] = useState(worldSeed)

  const formatTime = (t: number) => {
    const hours = Math.floor(t)
    const minutes = Math.floor((t - hours) * 60)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 === 0 ? 12 : hours % 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const vehicles: { id: VehicleModelType; name: string; tag: string; desc: string; topSpeed: string; drive: string }[] = [
    {
      id: 'bmw_m3',
      name: "BMW M3 GTR '05",
      tag: 'Flagship GT V8',
      desc: 'High-revving P60B40 racing V8 with Hewland straight-cut transmission whine, widebody aerodynamics, and BBS wheels.',
      topSpeed: '275 km/h',
      drive: 'RWD Sequential',
    },
    {
      id: 'supercar',
      name: 'Veloce GT Supercar',
      tag: '5.2L Exotic V10',
      desc: 'Naturally aspirated 90° V10 supercar with screaming high harmonics, dual-clutch transmission, and active track aero.',
      topSpeed: '282 km/h',
      drive: 'RWD 7-Speed DCT',
    },
    {
      id: 'modern_supercar',
      name: 'Modern Exotic V12 Hypercar',
      tag: '6.5L Screaming V12',
      desc: '9,500 RPM 60° V12 engine with F1-style howl, dual-intake acoustic resonance, and lightning-fast DCT shift snaps.',
      topSpeed: '320 km/h',
      drive: 'AWD 7-Speed DCT',
    },
    {
      id: 'hovercraft',
      name: 'AeroGlide Repulsorcraft',
      tag: 'Sci-Fi Levitation',
      desc: 'Glides frictionless above the road with dual-phase magnetic levitation coils and twin micro-ion turbines.',
      topSpeed: '310 km/h',
      drive: 'Dual Flux Ion',
    },
    {
      id: 'camper',
      name: 'Classic Camper Van',
      tag: '3.0L Heavy Diesel',
      desc: 'Torquey inline-6 turbo diesel with compression knock, split windshield, and pneumatic air brake relief hiss.',
      topSpeed: '145 km/h',
      drive: 'RWD 5-Speed Manual',
    },
    {
      id: 'hatchback',
      name: 'Rallye Turbo Group B',
      tag: '2.1L 5-Cyl Turbo',
      desc: 'Uneven 5-cylinder warble, sequential dog-box bang, explosive turbo spool, and compressor surge wastegate flutter (stututu).',
      topSpeed: '225 km/h',
      drive: 'AWD Dog-Box',
    },
    {
      id: 'vintage_hatch',
      name: 'Vintage Raspy Hot Hatch',
      tag: '1.8L Turbo Boxer',
      desc: 'Iconic unequal-length header boxer burble, throaty intake rasp, dog-box gate snick-clack, and aggressive pop-and-bang overrun.',
      topSpeed: '215 km/h',
      drive: 'FWD 5-Speed Manual',
    },
  ]

  const colorPresets = [
    { name: 'Silver Slate', hex: '#cbd5e1' },
    { name: 'Cobalt Blue', hex: '#1d4ed8' },
    { name: 'Racing Crimson', hex: '#dc2626' },
    { name: 'Sage Green', hex: '#6b705c' },
    { name: 'Alpine White', hex: '#f8fafc' },
    { name: 'Midnight Onyx', hex: '#0f172a' },
    { name: 'Sunburst Gold', hex: '#f59e0b' },
    { name: 'Cyber Purple', hex: '#9333ea' },
  ]

  const caliperPresets = [
    { name: 'Brembo Gold', hex: '#d97706' },
    { name: 'Racing Red', hex: '#dc2626' },
    { name: 'Acid Green', hex: '#10b981' },
    { name: 'Electric Blue', hex: '#3b82f6' },
    { name: 'Slate Silver', hex: '#94a3b8' },
  ]

  const rimPresets = [
    { name: 'Satin Silver', hex: '#cbd5e1' },
    { name: 'Gloss Onyx', hex: '#0f172a' },
    { name: 'Racing Bronze', hex: '#92400e' },
    { name: 'Gunmetal Grey', hex: '#475569' },
  ]

  const seedPresets = [
    { id: 'ALPINE_PASS', label: 'Alpine Switchbacks' },
    { id: 'COASTAL_HIGHWAY', label: 'Pacific Ocean Headlands' },
    { id: 'DESERT_CANYON', label: 'Sandstone Mesas' },
    { id: 'AUTUMN_VALLEY', label: 'Golden Covered Bridges' },
    { id: 'CALM_ROADS_3', label: 'Grand Tour 2026' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-auto">
      <div className="backdrop-blur-xl bg-neutral-900/95 border border-white/20 max-w-3xl w-full p-6 rounded-3xl shadow-2xl relative text-white max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF9D1E] shadow-[0_0_8px_#FF9D1E] animate-pulse" />
            <div>
              <h2 className="text-sm font-black tracking-widest text-white leading-none uppercase">
                CALM ROADS 3.0 • MASTER CONSOLE
              </h2>
              <span className="text-[10px] text-white/50 font-mono">
                {discoveries.length} / {WORLD_LANDMARKS.length} Landmarks • {completedChallenges.length} /{' '}
                {DRIVING_CHALLENGES.length} Challenges • Seed: {worldSeed}
              </span>
            </div>
          </div>
          <button
            onClick={() => setActivePanel('none')}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex flex-wrap gap-1.5 py-3 border-b border-white/10 text-xs font-bold">
          {[
            { id: 'environment', label: 'Atmosphere', icon: <CloudSun size={14} /> },
            { id: 'garage', label: 'Garage 3.0', icon: <Palette size={14} /> },
            { id: 'discoveries', label: 'Journal', icon: <Compass size={14} /> },
            { id: 'challenges', label: 'Challenges', icon: <Trophy size={14} /> },
            { id: 'map', label: 'World Map', icon: <Map size={14} /> },
            { id: 'audio', label: 'Radio', icon: <Radio size={14} /> },
            { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
            { id: 'controls', label: 'Manual', icon: <HelpCircle size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activePanel === tab.id
                  ? 'bg-[#FF9D1E] text-black shadow-[0_0_12px_rgba(255,157,30,0.4)]'
                  : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          {/* TAB 1: ATMOSPHERE & WEATHER */}
          {activePanel === 'environment' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-xs uppercase tracking-wider font-bold text-white/80 flex items-center gap-2">
                    {timeOfDay >= 6 && timeOfDay <= 18 ? (
                      <Sun size={15} className="text-amber-400" />
                    ) : (
                      <Moon size={15} className="text-blue-300" />
                    )}
                    Time of Day: <span className="text-amber-400 font-mono font-bold">{formatTime(timeOfDay)}</span>
                  </span>
                  <button
                    onClick={toggleAutoTimeCycle}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-mono font-bold cursor-pointer transition-colors ${
                      autoTimeCycle ? 'bg-amber-500 text-black font-black' : 'bg-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    Auto-Cycle: {autoTimeCycle ? 'ON' : 'OFF'}
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={0.1}
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
                />

                {/* Quick Celestial Time Presets */}
                <div className="grid grid-cols-4 gap-1.5 mt-3">
                  {[
                    { label: 'Sunrise', time: '06:18', action: skipToSunrise, icon: '🌅' },
                    { label: 'Midday', time: '12:00', action: skipToMidday, icon: '☀️' },
                    { label: 'Sunset', time: '18:36', action: skipToSunset, icon: '🌇' },
                    { label: 'Midnight', time: '00:00', action: skipToMidnight, icon: '🌙' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={preset.action}
                      className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-mono flex flex-col items-center gap-0.5 cursor-pointer transition-all"
                    >
                      <span className="text-xs">{preset.icon}</span>
                      <span className="font-bold text-white/90">{preset.label}</span>
                      <span className="text-[9px] text-white/40">{preset.time}</span>
                    </button>
                  ))}
                </div>

                {/* Time Speed Multiplier */}
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-white/60">Time Speed</span>
                  <div className="flex gap-1">
                    {[1, 2, 5, 10].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setTimeSpeed(spd)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                          timeSpeed === spd
                            ? 'bg-amber-500 text-black font-black'
                            : 'bg-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-white/70 block mb-2">
                  Weather Simulation
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: 'clear', name: 'Clear Sky', icon: <Sun size={15} /> },
                    { id: 'rain', name: 'Gentle Rain', icon: <CloudRain size={15} /> },
                    { id: 'snow', name: 'Alpine Snow', icon: <Snowflake size={15} /> },
                    { id: 'mist', name: 'Mountain Mist', icon: <Wind size={15} /> },
                  ].map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setWeather(w.id as any)}
                      className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        weather === w.id
                          ? 'bg-[#FF9D1E] text-black shadow-md border border-amber-300 font-black'
                          : 'bg-white/5 hover:bg-white/10 text-white/70'
                      }`}
                    >
                      {w.icon}
                      <span className="text-xs font-bold">{w.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GARAGE 3.0 & CUSTOMIZATION */}
          {activePanel === 'garage' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-white/70 block mb-2">
                  Choose Machine
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVehicleModel(v.id)}
                      className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                        vehicleModel === v.id
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-white">{v.name}</span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-amber-300 font-bold">
                          {v.topSpeed} • {v.drive}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-tight">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paint & Finish Customization */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider font-bold text-white/80">
                    Automotive Paint Color
                  </span>
                  <div className="flex items-center gap-1">
                    {(['metallic', 'gloss', 'matte', 'pearl'] as PaintFinishType[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setPaintFinish(f)}
                        className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase font-bold cursor-pointer transition-all ${
                          paintFinish === f ? 'bg-[#FF9D1E] text-black' : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setPaintColor(c.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                        paintColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'scale-110 border-white shadow-lg'
                          : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>

                {/* Caliper Color & Rim Finish */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-white/70 block mb-1.5">
                      Brake Calipers
                    </span>
                    <div className="flex gap-2">
                      {caliperPresets.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => setCaliperColor(c.hex)}
                          className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                            caliperColor.toLowerCase() === c.hex.toLowerCase()
                              ? 'scale-110 border-white'
                              : 'border-transparent opacity-70'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-white/70 block mb-1.5">
                      Wheel Rims
                    </span>
                    <div className="flex gap-2">
                      {rimPresets.map((r) => (
                        <button
                          key={r.hex}
                          onClick={() => setRimColor(r.hex)}
                          className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                            rimColor.toLowerCase() === r.hex.toLowerCase()
                              ? 'scale-110 border-white'
                              : 'border-transparent opacity-70'
                          }`}
                          style={{ backgroundColor: r.hex }}
                          title={r.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Spoiler Wing Configuration */}
                <div className="pt-2 border-t border-white/10">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-white/70 block mb-1.5">
                    Rear Aero / Wing
                  </span>
                  <div className="flex gap-1.5">
                    {[
                      { id: 'stock', label: 'Stock Wing' },
                      { id: 'gt_wing', label: 'Carbon GT Wing' },
                      { id: 'ducktail', label: 'Ducktail Lip' },
                      { id: 'none', label: 'Wingless' },
                    ].map((sp) => (
                      <button
                        key={sp.id}
                        onClick={() => setSpoilerType(sp.id as any)}
                        className={`text-xs px-3 py-1 rounded-xl font-bold cursor-pointer transition-all ${
                          spoilerType === sp.id
                            ? 'bg-[#FF9D1E] text-black font-black'
                            : 'bg-white/5 hover:bg-white/10 text-white/70'
                        }`}
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCENIC DISCOVERIES JOURNAL */}
          {activePanel === 'discoveries' && (
            <div className="space-y-4">
              {/* Overall Explorer Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[10px] text-white/50 uppercase tracking-widest font-mono block">Odometer</span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    {drivingStats.totalDistanceKm.toFixed(1)} <span className="text-xs text-white/60">km</span>
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[10px] text-white/50 uppercase tracking-widest font-mono block">Top Velocity</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    {drivingStats.topSpeedKmh.toFixed(0)} <span className="text-xs text-white/60">km/h</span>
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[10px] text-white/50 uppercase tracking-widest font-mono block">Drift Traveled</span>
                  <span className="text-base font-black text-blue-400 font-mono">
                    {drivingStats.totalDriftDistanceM.toFixed(0)} <span className="text-xs text-white/60">m</span>
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[10px] text-white/50 uppercase tracking-widest font-mono block">Clean Asphalt</span>
                  <span className="text-base font-black text-purple-400 font-mono">
                    {drivingStats.cleanAsphaltDistanceM.toFixed(0)} <span className="text-xs text-white/60">m</span>
                  </span>
                </div>
              </div>

              {/* SECTION A: SCENIC ROUTES EXPEDITION */}
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300">
                  <div className="flex items-center gap-2">
                    <Map size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Scenic Routes Mapped: {discoveredScenicRoutes.length} / {SCENIC_ROUTES.length}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold">
                    {Math.round((discoveredScenicRoutes.length / SCENIC_ROUTES.length) * 100)}% MAPPED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {SCENIC_ROUTES.map((sr) => {
                    const isFound = discoveredScenicRoutes.includes(sr.id)
                    const isCurrent = activeScenicRoute?.id === sr.id
                    return (
                      <div
                        key={sr.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isCurrent
                            ? 'bg-blue-950/40 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-white'
                            : isFound
                            ? 'bg-neutral-800/80 border-blue-500/40 text-white'
                            : 'bg-white/5 border-white/5 opacity-55 text-white/60'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            {isFound ? (
                              <CheckCircle2 size={16} className={isCurrent ? 'text-amber-400 animate-pulse' : 'text-blue-400'} />
                            ) : (
                              <Lock size={15} className="text-white/40" />
                            )}
                            <div>
                              <span className="text-xs font-bold text-white block">
                                {isFound ? sr.name : 'Undiscovered Route'}
                              </span>
                              {isFound && (
                                <span className="text-[10px] text-blue-300/80 block">{sr.subtitle}</span>
                              )}
                            </div>
                          </div>
                          {isCurrent ? (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500 text-black font-black uppercase">
                              Active
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-blue-300 capitalize">
                              {sr.biome.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/60 leading-tight mt-1">
                          {isFound
                            ? `Route Length: ${sr.endDist - sr.startDist}m • Biome: ${sr.biome.replace('_', ' ')} (Dist: ${sr.startDist}m - ${sr.endDist}m)`
                            : `Chart the highway between ${sr.startDist}m and ${sr.endDist}m to survey this route.`}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* SECTION B: SCENIC LANDMARKS */}
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  <div className="flex items-center gap-2">
                    <Compass size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      World Landmarks Discovered: {discoveries.length} / {WORLD_LANDMARKS.length}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold">
                    {Math.round((discoveries.length / WORLD_LANDMARKS.length) * 100)}% DISCOVERED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {WORLD_LANDMARKS.map((lm) => {
                    const isFound = discoveries.includes(lm.id)
                    return (
                      <div
                        key={lm.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isFound
                            ? 'bg-neutral-800/80 border-amber-500/50 text-white'
                            : 'bg-white/5 border-white/5 opacity-55 text-white/60'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            {isFound ? (
                              <CheckCircle2 size={16} className="text-emerald-400" />
                            ) : (
                              <Lock size={15} className="text-white/40" />
                            )}
                            <span className="text-xs font-bold text-white">{isFound ? lm.name : 'Unknown Landmark'}</span>
                          </div>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-amber-300">
                            {isFound ? `Z: ${lm.targetZ}m` : lm.biome.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60 leading-tight">
                          {isFound ? lm.description : `Drive through ${lm.biome.replace('_', ' ')} to discover this landmark.`}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DRIVING CHALLENGES & PROGRESSION */}
          {activePanel === 'challenges' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Trophy size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Accomplishments: {completedChallenges.length} / {DRIVING_CHALLENGES.length}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold">
                  {Math.round((completedChallenges.length / DRIVING_CHALLENGES.length) * 100)}% COMPLETED
                </span>
              </div>

              <div className="space-y-2">
                {DRIVING_CHALLENGES.map((ch) => {
                  const isDone = completedChallenges.includes(ch.id)
                  let progress = 0
                  if (ch.id === 'alpine_velocity') progress = Math.min(100, (drivingStats.topSpeedKmh / ch.targetValue) * 100)
                  else if (ch.id === 'grand_tourer') progress = Math.min(100, (drivingStats.totalDistanceKm / ch.targetValue) * 100)
                  else if (ch.id === 'master_of_slip') progress = Math.min(100, (drivingStats.totalDriftDistanceM / ch.targetValue) * 100)
                  else if (ch.id === 'asphalt_purist') progress = Math.min(100, (drivingStats.cleanAsphaltDistanceM / 2000) * 100)
                  else if (ch.id === 'scenic_explorer') progress = Math.min(100, (discoveries.length / ch.targetValue) * 100)
                  else if (ch.id === 'redline_virtuoso') progress = Math.min(100, (drivingStats.redlineShiftsCount / ch.targetValue) * 100)
                  if (isDone) progress = 100

                  return (
                    <div
                      key={ch.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isDone
                          ? 'bg-emerald-950/30 border-emerald-500/50 text-white'
                          : 'bg-white/5 border-white/10 text-white/80'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          {isDone ? (
                            <CheckCircle2 size={16} className="text-emerald-400" />
                          ) : (
                            <Trophy size={15} className="text-white/40" />
                          )}
                          <span className="text-xs font-bold text-white">{ch.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-300 font-bold">
                          Reward: {ch.reward}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 mb-2">{ch.description}</p>
                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isDone ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 5: WORLD MAP & SEED TRAVEL */}
          {activePanel === 'map' && (
            <div className="space-y-4">
              {/* World Seed Input */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <span className="text-xs uppercase tracking-wider font-bold text-white/80 block">
                  Deterministic Procedural Seed
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/20 text-white font-mono text-xs focus:border-amber-400 outline-none"
                    placeholder="ENTER WORLD SEED"
                  />
                  <button
                    onClick={() => setWorldSeed(seedInput || 'CALM_ROADS_3')}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 text-black font-black text-xs cursor-pointer hover:bg-amber-400 transition-colors"
                  >
                    APPLY SEED
                  </button>
                  <button
                    onClick={() => {
                      const rand = `SEED_${Math.floor(Math.random() * 90000 + 10000)}`
                      setSeedInput(rand)
                      setWorldSeed(rand)
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer font-bold transition-colors"
                  >
                    RANDOM
                  </button>
                </div>

                {/* Seed Presets */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {seedPresets.map((sp) => (
                    <button
                      key={sp.id}
                      onClick={() => {
                        setSeedInput(sp.id)
                        setWorldSeed(sp.id)
                      }}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-mono cursor-pointer transition-colors"
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Biome Travel Cards */}
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-white/70 block mb-2">
                  Travel to Biome
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { id: 'dynamic', name: 'Continuous Grand Tour', icon: <Sparkles size={14} /> },
                    { id: 'twisted_mountains', name: 'Twisted Mountains', icon: <Snowflake size={14} /> },
                    { id: 'alpine', name: 'Alpine Highlands', icon: <Mountain size={14} /> },
                    { id: 'desert', name: 'Desert Canyon', icon: <Sun size={14} /> },
                    { id: 'coastal', name: 'Coastal Beach', icon: <Compass size={14} /> },
                    { id: 'autumn', name: 'Autumn Valley', icon: <Flame size={14} /> },
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBiome(b.id as any)}
                      className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-bold cursor-pointer transition-all ${
                        biome === b.id
                          ? 'bg-[#FF9D1E] text-black font-black shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-white/70'
                      }`}
                    >
                      {b.icon}
                      <span>{b.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: RADIO & AUDIO */}
          {activePanel === 'audio' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Radio size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {LOFI_PLAYLIST[currentTrackIndex]?.title || 'Lo-Fi Chill'}
                    </div>
                    <div className="text-[11px] text-white/50">
                      {LOFI_PLAYLIST[currentTrackIndex]?.artist}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={prevTrack} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer">
                    <SkipBack size={15} />
                  </button>
                  <button
                    onClick={toggleMusic}
                    className={`px-4 h-9 rounded-xl flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                      isMusicPlaying ? 'bg-amber-500 text-black font-black' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {isMusicPlaying ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isMusicPlaying ? 'PAUSE' : 'PLAY'}</span>
                  </button>
                  <button onClick={nextTrack} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer">
                    <SkipForward size={15} />
                  </button>
                </div>
              </div>

              {/* Volume Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex justify-between text-xs font-bold text-white/80 mb-2">
                    <span>Music Volume</span>
                    <span className="font-mono text-amber-400">{(musicVolume * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex justify-between text-xs font-bold text-white/80 mb-2">
                    <span>Engine & Exhaust SFX</span>
                    <span className="font-mono text-amber-400">{(sfxVolume * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={sfxVolume}
                    onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SETTINGS & TOOLS */}
          {activePanel === 'settings' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={toggleTransmissionMode}
                  className="p-3.5 rounded-2xl border bg-white/5 hover:bg-white/10 border-white/10 flex items-center gap-3 text-left cursor-pointer"
                >
                  <Activity size={18} className="text-amber-400" />
                  <div>
                    <div className="text-xs font-bold">Transmission Mode</div>
                    <div className="text-[10px] text-white/50 uppercase">{transmissionMode} [M]</div>
                  </div>
                </button>

                <button
                  onClick={toggleSpeedUnit}
                  className="p-3.5 rounded-2xl border bg-white/5 hover:bg-white/10 border-white/10 flex items-center gap-3 text-left cursor-pointer"
                >
                  <Sliders size={18} className="text-amber-400" />
                  <div>
                    <div className="text-xs font-bold">Speed Units</div>
                    <div className="text-[10px] text-white/50 uppercase">{speedUnit.toUpperCase()}</div>
                  </div>
                </button>

                <button
                  onClick={toggleHoverMode}
                  className="p-3.5 rounded-2xl border bg-white/5 hover:bg-white/10 border-white/10 flex items-center gap-3 text-left cursor-pointer"
                >
                  <Sparkles size={18} className="text-indigo-400" />
                  <div>
                    <div className="text-xs font-bold">Antigravity Mode</div>
                    <div className="text-[10px] text-white/50">{isHoverMode ? 'Active [H]' : 'Standard [H]'}</div>
                  </div>
                </button>

                <button
                  onClick={toggleHeadlights}
                  className="p-3.5 rounded-2xl border bg-white/5 hover:bg-white/10 border-white/10 flex items-center gap-3 text-left cursor-pointer"
                >
                  <Sun size={18} className="text-amber-300" />
                  <div>
                    <div className="text-xs font-bold">Headlights</div>
                    <div className="text-[10px] text-white/50">{headlights ? 'ON [L]' : 'OFF [L]'}</div>
                  </div>
                </button>

                <button
                  onClick={toggleHeadlightBeam}
                  disabled={!headlights}
                  className={`p-3.5 rounded-2xl border bg-white/5 hover:bg-white/10 border-white/10 flex items-center gap-3 text-left cursor-pointer transition-opacity ${
                    !headlights ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <Zap size={18} className={headlightBeam === 'high' ? 'text-amber-400' : 'text-blue-300'} />
                  <div>
                    <div className="text-xs font-bold">Beam Mode</div>
                    <div className="text-[10px] text-white/50">
                      {headlightBeam === 'high' ? 'HIGH BEAM [J]' : 'LOW BEAM [J]'}
                    </div>
                  </div>
                </button>

                <button
                  onClick={toggleCleanHud}
                  className="p-3.5 rounded-2xl border bg-white/5 hover:bg-white/10 border-white/10 flex items-center gap-3 text-left cursor-pointer"
                >
                  <EyeOff size={18} className="text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold">Clean Minimal HUD</div>
                    <div className="text-[10px] text-white/50">{cleanHud ? 'Active [U]' : 'Standard [U]'}</div>
                  </div>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-3.5 rounded-2xl border bg-white/5 hover:bg-white/10 border-white/10 flex items-center gap-3 text-left cursor-pointer"
                >
                  <Maximize size={18} className="text-blue-400" />
                  <div>
                    <div className="text-xs font-bold">Fullscreen</div>
                    <div className="text-[10px] text-white/50">{isFullscreen ? 'Windowed [F]' : 'Fullscreen [F]'}</div>
                  </div>
                </button>

                <button
                  onClick={toggleDiagnostics}
                  className="p-3.5 rounded-2xl border bg-white/5 hover:bg-white/10 border-white/10 flex items-center gap-3 text-left cursor-pointer"
                >
                  <Activity size={18} className="text-pink-400" />
                  <div>
                    <div className="text-xs font-bold">Dev Diagnostics</div>
                    <div className="text-[10px] text-white/50">{showDiagnostics ? 'Visible [F2]' : 'Hidden [F2]'}</div>
                  </div>
                </button>

                <button
                  onClick={() => setShowTouchControls((prev) => !prev)}
                  className="p-3.5 rounded-2xl border bg-white/5 hover:bg-white/10 border-white/10 flex items-center gap-3 text-left cursor-pointer"
                >
                  <Sparkles size={18} className="text-cyan-400" />
                  <div>
                    <div className="text-xs font-bold">Touch Pedals</div>
                    <div className="text-[10px] text-white/50">{showTouchControls ? 'Active' : 'Hidden'}</div>
                  </div>
                </button>
              </div>

              {/* Graphics Quality Preset */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs uppercase tracking-wider font-bold text-white/80 block mb-2">
                  Graphics Engine Quality
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'ultra'] as GraphicsQualityType[]).map((q) => (
                    <button
                      key={q}
                      onClick={() => setGraphicsQuality(q)}
                      className={`p-2.5 rounded-xl text-center text-xs font-bold uppercase transition-all cursor-pointer ${
                        graphicsQuality === q
                          ? 'bg-[#FF9D1E] text-black font-black shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-white/60'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: DRIVER MANUAL & KEYBINDINGS */}
          {activePanel === 'controls' && (
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider font-bold text-white/70 block mb-2">
                Flight & Ground Controls
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { k: 'W / ↑', d: 'Accelerate Throttle' },
                  { k: 'S / ↓', d: 'Brake / Hold to Reverse' },
                  { k: 'A / D (← / →)', d: 'Steer Left / Right' },
                  { k: 'Space', d: 'Emergency Handbrake / Drift' },
                  { k: 'B / Space + W', d: 'Burnout Mode (Redline Tire Smoke)' },
                  { k: 'Shift L / R', d: 'Manual Gear Upshift / Downshift' },
                  { k: 'M', d: 'Toggle Auto / Manual Transmission' },
                  { k: 'N', d: 'Toggle Neutral Gear (Free-Rev)' },
                  { k: 'C', d: 'Cycle Cameras (Chase, Close, Cockpit, Bumper, Drone, Cinematic)' },
                  { k: 'L', d: 'Toggle Headlight On / Off' },
                  { k: 'J', d: 'Toggle Headlight High / Low Beam' },
                  { k: 'U', d: 'Clean Minimal HUD' },
                  { k: 'P', d: 'Photo Studio 3.0' },
                  { k: 'Z', d: 'Zen Mode' },
                  { k: 'R', d: 'Reset Vehicle to Road Center' },
                  { k: 'G', d: 'Sound Horn' },
                  { k: 'K', d: 'Play / Pause Lo-Fi Radio' },
                  { k: 'F', d: 'Toggle Fullscreen' },
                  { k: 'F3 / F4', d: 'Toggle Engine Telemetry / GPU Profiler' },
                ].map((row, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-amber-300 font-bold">{row.k}</span>
                    <span className="text-white/70 text-[11px]">{row.d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 6. Master UI Overlay Component
// ----------------------------------------------------------------
export default function Overlay() {
  const [showTouchControls, setShowTouchControls] = useState(false)
  const [showProfiler, setShowProfiler] = useState(false)

  const isLoadingReady = useLoadingStore((s) => s.isReady)
  const isBackgroundLoading = useLoadingStore((s) => s.isBackgroundLoading)
  const distantTask = useLoadingStore((s) => s.tasks.distant_world)
  const audioTask = useLoadingStore((s) => s.tasks.audio)

  const cameraPerspective = useGameStore((s) => s.cameraPerspective)
  const cycleCameraPerspective = useGameStore((s) => s.cycleCameraPerspective)
  const activePanel = useGameStore((s) => s.activePanel)
  const setActivePanel = useGameStore((s) => s.setActivePanel)
  const photoMode = useGameStore((s) => s.photoMode)
  const togglePhotoMode = useGameStore((s) => s.togglePhotoMode)
  const zenMode = useGameStore((s) => s.zenMode)
  const toggleZenMode = useGameStore((s) => s.toggleZenMode)
  const toggleFullscreen = useGameStore((s) => s.toggleFullscreen)
  const cycleWeather = useGameStore((s) => s.cycleWeather)
  const cycleVehicleModel = useGameStore((s) => s.cycleVehicleModel)
  const toggleHoverMode = useGameStore((s) => s.toggleHoverMode)
  const toggleMusic = useGameStore((s) => s.toggleMusic)
  const toggleTransmissionMode = useGameStore((s) => s.toggleTransmissionMode)
  const toggleHeadlights = useGameStore((s) => s.toggleHeadlights)
  const toggleHeadlightBeam = useGameStore((s) => s.toggleHeadlightBeam)
  const toggleCleanHud = useGameStore((s) => s.toggleCleanHud)
  const showDiagnostics = useGameStore((s) => s.showDiagnostics)
  const toggleDiagnostics = useGameStore((s) => s.toggleDiagnostics)

  const camLabels: Record<CameraPerspectiveType, string> = {
    chase: 'Chase',
    close_chase: 'Close Chase',
    dashboard: 'Cockpit',
    drone: 'Drone',
    bumper: 'Bumper',
    cinematic: 'Cinematic',
  }

  // Global Keyboard Shortcuts (strictly gated until staged world readiness passes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!useLoadingStore.getState().isReady) return
      if (e.repeat) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'c' || e.key === 'C') cycleCameraPerspective()
      if (e.key === 'h' || e.key === 'H') toggleHoverMode()
      if (e.key === 'g' || e.key === 'G') audioSystem.playHorn()
      if (e.key === 'v' || e.key === 'V') cycleVehicleModel()
      if (e.key === 't' || e.key === 'T') cycleWeather()
      if (e.key === 'p' || e.key === 'P') togglePhotoMode()
      if (e.key === 'z' || e.key === 'Z') toggleZenMode()
      if (e.key === 'm' || e.key === 'M') toggleTransmissionMode()
      if (e.key === 'l' || e.key === 'L') toggleHeadlights()
      if (e.key === 'j' || e.key === 'J') toggleHeadlightBeam()
      if (e.key === 'u' || e.key === 'U') toggleCleanHud()
      if (e.key === 'k' || e.key === 'K') toggleMusic()
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      if (e.key === 'Tab') {
        e.preventDefault()
        setActivePanel(activePanel === 'none' ? 'environment' : 'none')
      }
      if (e.key === 'Escape') setActivePanel('none')
      if (e.key === 'F3') {
        e.preventDefault()
        toggleDiagnostics()
      }
      if (e.key === 'F4') {
        e.preventDefault()
        setShowProfiler((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    cycleCameraPerspective,
    toggleHoverMode,
    cycleVehicleModel,
    cycleWeather,
    togglePhotoMode,
    toggleZenMode,
    toggleTransmissionMode,
    toggleHeadlights,
    toggleHeadlightBeam,
    toggleCleanHud,
    toggleMusic,
    toggleFullscreen,
    toggleDiagnostics,
    setActivePanel,
  ])

  if (!isLoadingReady) {
    return null
  }

  if (photoMode) {
    return <PhotoModeView />
  }

  if (zenMode) {
    return (
      <div
        onClick={toggleZenMode}
        className="w-full h-full pointer-events-auto cursor-pointer flex items-end justify-center pb-8 select-none"
      >
        <div className="backdrop-blur-md bg-black/40 border border-white/10 text-white px-5 py-2 rounded-full text-xs font-mono font-bold opacity-30 hover:opacity-100 transition-opacity flex items-center gap-2">
          <Eye size={14} /> Tap [Z] or Click anywhere to exit Zen Mode
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-4 md:p-6 flex flex-col justify-between pointer-events-none select-none font-sans">
      <RegionDiscoveryBanner />

      {/* Subtle Non-Blocking Background Enhancement Status Indicator */}
      {isBackgroundLoading && (
        <div className="fixed top-20 right-6 z-30 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white/70 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF9D1E] animate-ping" />
          <span>
            {distantTask.status === 'in_progress'
              ? `ENHANCING HORIZON • ${distantTask.detail}`
              : `PREPARING AUDIO • ${audioTask.detail}`}
          </span>
        </div>
      )}

      {/* Top Navbar */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <div className="backdrop-blur-md bg-[#0d1016]/80 border border-[#262c38] px-4 py-2 rounded-2xl flex items-center gap-2.5 shadow-2xl text-white">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF9D1E] shadow-[0_0_8px_#FF9D1E] animate-pulse" />
          <div>
            <h1 className="text-sm font-black tracking-widest text-[#FDFBF7] leading-none">
              CALM ROADS 3.0
            </h1>
            <span className="text-[9px] tracking-wider text-[#FF9D1E] font-mono font-bold">
              OPEN-WORLD SIMULATOR
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={cycleCameraPerspective}
            className="backdrop-blur-md bg-[#0d1016]/80 hover:bg-[#161b24] text-white/85 hover:text-white border border-[#262c38] px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold cursor-pointer transition-all shadow-lg"
            title="Cycle Camera View [C]"
          >
            <Camera size={15} className="text-[#8EA48C]" />
            <span className="font-mono">{camLabels[cameraPerspective] || 'Chase'}</span>
            <span className="text-[9px] text-white/40 font-mono">[C]</span>
          </button>

          <button
            onClick={() => setActivePanel(activePanel === 'none' ? 'environment' : 'none')}
            className={`backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold cursor-pointer transition-all border shadow-lg ${
              activePanel !== 'none'
                ? 'bg-[#FF9D1E] text-black border-amber-300 shadow-[0_0_16px_rgba(255,157,30,0.45)]'
                : 'bg-[#0d1016]/80 hover:bg-[#161b24] text-white border-[#262c38] hover:border-[#FF9D1E]/50'
            }`}
            title="Open Game Menu [Esc]"
          >
            {activePanel !== 'none' ? <X size={15} /> : <Menu size={15} className="text-[#FF9D1E]" />}
            <span className="tracking-wider">MENU</span>
          </button>
        </div>
      </div>

      {showTouchControls && <TouchPedals />}
      {showDiagnostics && <DiagnosticsHUD />}
      {showProfiler && <PerformanceProfiler onClose={() => setShowProfiler(false)} />}

      <SpeedometerHUD />

      {activePanel !== 'none' && (
        <MasterMenuModal
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          showTouchControls={showTouchControls}
          setShowTouchControls={setShowTouchControls}
        />
      )}
    </div>
  )
}
