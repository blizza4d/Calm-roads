import { useState, useEffect } from 'react'
import {
  CloudSun,
  Camera,
  Maximize,
  Minimize,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  HelpCircle,
  X,
  Palette,
  Volume2,
  Sparkles,
  Eye,
  EyeOff,
  Sun,
  Moon,
  CloudRain,
  Snowflake,
  Wind,
  Trees,
  Flame,
  Mountain,
  Radio,
  Gamepad2,
  Activity,
  Settings,
  Menu,
  Sliders,
} from 'lucide-react'
import {
  useGameStore,
  useTelemetryStore,
  WeatherType,
  VehicleModelType,
  CameraPerspectiveType,
  BiomeSelection,
} from '../../store/useGameStore'
import { audioSystem, LOFI_PLAYLIST } from '../../utils/audioSystem'
import { BIOMES } from '../../utils/roadMath'

// ----------------------------------------------------------------
// 1. Optional On-Screen Touch Controls (Hidden by default)
// ----------------------------------------------------------------
function TouchPedals() {
  const setVirtualThrottle = useGameStore((s) => s.setVirtualThrottle)
  const setVirtualBrake = useGameStore((s) => s.setVirtualBrake)
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

      {/* Pedals: Brake & Throttle (Right Side) */}
      <div className="flex gap-2 pointer-events-auto">
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
  const speed = useTelemetryStore((s) => s.speed)
  const rpm = useTelemetryStore((s) => s.rpm)
  const gear = useTelemetryStore((s) => s.gear)
  const distance = useTelemetryStore((s) => s.distance)
  const throttle = useTelemetryStore((s) => s.throttle)
  const brake = useTelemetryStore((s) => s.brake)
  const transmissionMode = useGameStore((s) => s.transmissionMode)
  const speedUnit = useGameStore((s) => s.speedUnit)
  const toggleSpeedUnit = useGameStore((s) => s.toggleSpeedUnit)
  const isHoverMode = useGameStore((s) => s.isHoverMode)
  const currentResolvedBiome = useGameStore((s) => s.currentResolvedBiome)

  const displayedSpeed = speedUnit === 'mph' ? Math.round(speed * 0.621371) : Math.round(speed)
  const unitLabel = speedUnit === 'mph' ? 'MPH' : 'KM/H'
  const displayedDistance = (distance * (speedUnit === 'mph' ? 0.621371 : 1.0)).toFixed(1)

  const rpmPercent = Math.min(100, Math.max(0, (rpm / 8500) * 100))
  const isRedline = rpm > 7200

  return (
    <div className="fixed bottom-6 right-6 pointer-events-auto select-none z-20 flex flex-col items-end gap-2">
      <div className="backdrop-blur-xl bg-black/60 border border-white/20 p-4 rounded-3xl shadow-2xl flex items-center gap-5 text-white transition-all hover:bg-black/70">
        {/* Gear Indicator & Biome Pill */}
        <div className="flex flex-col items-center justify-center border-r border-white/10 pr-4">
          <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-widest">
            {isHoverMode ? 'REPULSOR' : 'GEAR'}
          </span>
          <span className="text-4xl font-black font-mono leading-none my-0.5 text-white drop-shadow-md">
            {isHoverMode ? 'H' : gear}
          </span>
          <span className="text-[8px] font-mono text-white/50 uppercase">
            {transmissionMode.toUpperCase()}
          </span>

          {/* Biome Status Pill */}
          <div className="mt-2 text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            {BIOMES[currentResolvedBiome]?.name?.split(' ')[0] || 'Road'}
          </div>
        </div>

        {/* Telemetry Input Bars & Odometer */}
        <div className="flex flex-col justify-between h-20 py-0.5 border-r border-white/10 pr-4">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-white/40 font-mono font-bold uppercase tracking-wider">
              ODO
            </span>
            <span className="text-xs font-mono font-bold text-white/80">
              {displayedDistance} {unitLabel === 'MPH' ? 'mi' : 'km'}
            </span>
          </div>

          <div className="flex gap-1.5 items-end h-8">
            {/* Brake Input Meter */}
            <div className="w-1.5 h-full bg-white/10 rounded-full overflow-hidden flex flex-col justify-end" title="Brake">
              <div
                className="w-full bg-red-500 transition-all duration-75 rounded-full"
                style={{ height: `${brake * 100}%` }}
              />
            </div>
            {/* Throttle Input Meter */}
            <div className="w-1.5 h-full bg-white/10 rounded-full overflow-hidden flex flex-col justify-end" title="Throttle">
              <div
                className="w-full bg-emerald-400 transition-all duration-75 rounded-full"
                style={{ height: `${throttle * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Speedometer Digits & LED Tachometer Bar */}
        <div className="flex flex-col items-center justify-center min-w-[120px]">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black tracking-tight text-white font-mono leading-none drop-shadow-md">
              {displayedSpeed}
            </span>
          </div>

          <button
            onClick={toggleSpeedUnit}
            className="text-[9px] font-mono font-bold tracking-widest text-white/60 hover:text-white transition-colors uppercase mt-1 cursor-pointer"
          >
            {unitLabel} <span className="opacity-40">| SWITCH</span>
          </button>

          {/* Tachometer RPM Gauge */}
          <div className="w-full mt-2.5">
            <div className="flex justify-between text-[8px] font-mono text-white/40 mb-1 font-bold">
              <span>0</span>
              <span className={isRedline ? 'text-red-400 animate-pulse font-black' : ''}>
                {isRedline ? 'SHIFT' : 'RPM x1000'}
              </span>
              <span className={isRedline ? 'text-red-400 font-bold' : ''}>8.5</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5 flex items-center">
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  isRedline
                    ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                    : rpmPercent > 70
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${rpmPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 3. Consolidated Master Menu Modal
// ----------------------------------------------------------------
function MasterMenuModal({
  activePanel,
  setActivePanel,
  showTouchControls,
  setShowTouchControls,
}: {
  activePanel: 'none' | 'garage' | 'environment' | 'audio' | 'controls' | 'settings'
  setActivePanel: (p: 'none' | 'garage' | 'environment' | 'audio' | 'controls' | 'settings') => void
  showTouchControls: boolean
  setShowTouchControls: (v: boolean) => void
}) {
  const {
    // Atmosphere
    timeOfDay,
    setTimeOfDay,
    autoTimeCycle,
    toggleAutoTimeCycle,
    weather,
    setWeather,
    biome,
    setBiome,
    graphicsQuality,
    setGraphicsQuality,
    // Garage
    vehicleModel,
    setVehicleModel,
    paintColor,
    setPaintColor,
    metallic,
    setMetallic,
    roughness,
    setRoughness,
    isHoverMode,
    toggleHoverMode,
    // Radio & Audio
    isMusicPlaying,
    toggleMusic,
    currentTrackIndex,
    nextTrack,
    prevTrack,
    musicVolume,
    setMusicVolume,
    sfxVolume,
    setSfxVolume,
    // Tools
    autoDrive,
    toggleAutoDrive,
    speedUnit,
    toggleSpeedUnit,
    showDiagnostics,
    toggleDiagnostics,
    isFullscreen,
    toggleFullscreen,
    togglePhotoMode,
    toggleZenMode,
  } = useGameStore()

  const formatTime = (t: number) => {
    const hours = Math.floor(t)
    const minutes = Math.floor((t - hours) * 60)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 === 0 ? 12 : hours % 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const biomes: { id: BiomeSelection; name: string; icon: React.ReactNode }[] = [
    { id: 'dynamic', name: 'Dynamic (Cycle)', icon: <Sparkles size={14} /> },
    { id: 'forest', name: 'Lush Forest', icon: <Trees size={14} /> },
    { id: 'autumn', name: 'Autumn Mountains', icon: <Flame size={14} /> },
    { id: 'tundra', name: 'Snowy Tundra', icon: <Snowflake size={14} /> },
    { id: 'desert', name: 'Desert Dunes', icon: <Mountain size={14} /> },
  ]

  const weathers: { id: WeatherType; name: string; icon: React.ReactNode }[] = [
    { id: 'clear', name: 'Clear Sky', icon: <Sun size={14} /> },
    { id: 'rain', name: 'Soft Rain', icon: <CloudRain size={14} /> },
    { id: 'snow', name: 'Gentle Snow', icon: <Snowflake size={14} /> },
    { id: 'mist', name: 'Morning Mist', icon: <Wind size={14} /> },
  ]

  const vehicles: { id: VehicleModelType; name: string; tag: string; desc: string }[] = [
    {
      id: 'bmw_m3',
      name: "BMW M3 GTR '05",
      tag: 'Flagship GT V8',
      desc: 'High-revving P60B40 racing V8 with widebody aerodynamics, race BBS wheels, and functional steering.',
    },
    {
      id: 'supercar',
      name: 'Modern Supercar',
      tag: 'Italian V8',
      desc: 'Mid-rear twin-turbo Italian V8 supercar with aerodynamic active aero flaps, carbon-ceramic brakes, and track-tuned suspension.',
    },
    {
      id: 'hovercraft',
      name: 'Antigravity Hovercraft',
      tag: 'Sci-Fi Repulsor',
      desc: 'Glides frictionless above the road with quad repulsor coils and dual ion thrusters.',
    },
    {
      id: 'hatchback',
      name: 'Vintage Rally Hatchback',
      tag: '1988 Hot Hatch',
      desc: 'Raspy rally 4-cylinder engine with explosive turbo spool and quick throttle response.',
    },
    {
      id: 'camper',
      name: 'Classic Camper Van',
      tag: 'Air-Cooled Cruiser',
      desc: 'Air-cooled flat-4 boxer engine with split windshield, roof rack, and relaxed cruising suspension.',
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

  const keyBindings = [
    { key: 'W / ↑', action: 'Accelerate / Throttle' },
    { key: 'S / ↓', action: 'Brake / Reverse' },
    { key: 'A / D (← / →)', action: 'Steer Left / Right' },
    { key: 'Space', action: 'Handbrake / Drift' },
    { key: 'C', action: 'Cycle Camera View (Chase, Cockpit, Bumper, Drone)' },
    { key: 'H', action: 'Toggle Antigravity Hover Mode' },
    { key: 'B', action: 'Sound Horn' },
    { key: 'V', action: 'Switch Vehicle' },
    { key: 'T', action: 'Cycle Weather' },
    { key: 'P', action: 'Photo Mode (Studio View)' },
    { key: 'Z', action: 'Zen Mode (Pure Driving, HUD Hidden)' },
    { key: 'M', action: 'Toggle Lo-Fi Ambient Radio' },
    { key: 'F', action: 'Toggle Fullscreen' },
    { key: 'F3', action: 'Toggle Telemetry & Frame HUD' },
    { key: 'Esc', action: 'Close / Open Menu' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-auto">
      <div className="backdrop-blur-xl bg-neutral-900/95 border border-white/20 max-w-2xl w-full p-6 rounded-3xl shadow-2xl relative text-white max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <div>
              <h2 className="text-sm font-black tracking-widest text-white leading-none uppercase">
                CALM ROADS MENU
              </h2>
              <span className="text-[10px] text-white/50 font-mono">Customize atmosphere, vehicle, audio & preferences</span>
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
            { id: 'garage', label: 'Garage', icon: <Palette size={14} /> },
            { id: 'audio', label: 'Radio & Audio', icon: <Radio size={14} /> },
            { id: 'settings', label: 'Driving & Tools', icon: <Settings size={14} /> },
            { id: 'controls', label: 'Driver Manual', icon: <HelpCircle size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activePanel === tab.id
                  ? 'bg-emerald-600 text-white shadow-md border border-emerald-400/50'
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
              {/* Time of Day Slider */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-xs uppercase tracking-wider font-bold text-white/80 flex items-center gap-2">
                    {timeOfDay >= 6 && timeOfDay <= 18 ? (
                      <Sun size={15} className="text-amber-400" />
                    ) : (
                      <Moon size={15} className="text-blue-300" />
                    )}
                    Time of Day: <span className="text-emerald-400 font-mono font-bold">{formatTime(timeOfDay)}</span>
                  </span>
                  <button
                    onClick={toggleAutoTimeCycle}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-mono font-bold cursor-pointer transition-colors ${
                      autoTimeCycle ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/60 hover:text-white'
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
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
                />
              </div>

              {/* Weather Presets */}
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-white/70 block mb-2">
                  Weather Condition
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {weathers.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setWeather(w.id)}
                      className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        weather === w.id
                          ? 'bg-emerald-600 text-white shadow-md border border-emerald-400'
                          : 'bg-white/5 hover:bg-white/10 text-white/70'
                      }`}
                    >
                      {w.icon}
                      <span className="text-xs font-bold">{w.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Biome Selection */}
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-white/70 block mb-2">
                  Procedural Biome Transition
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {biomes.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBiome(b.id)}
                      className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold cursor-pointer transition-all ${
                        biome === b.id
                          ? 'bg-emerald-600 text-white shadow-md border border-emerald-400'
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

          {/* TAB 2: GARAGE & CUSTOMIZATION */}
          {activePanel === 'garage' && (
            <div className="space-y-4">
              {/* Vehicle Model Selector */}
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-white/70 block mb-2">
                  Select Vehicle
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVehicleModel(v.id)}
                      className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                        vehicleModel === v.id
                          ? 'bg-emerald-600/30 border-emerald-400 text-white shadow-md'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-white">{v.name}</span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-emerald-300 font-bold">
                          {v.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-tight">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paint Color Swatches */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs uppercase tracking-wider font-bold text-white/80 block mb-2.5">
                  Automotive Paint Finish
                </span>
                <div className="flex flex-wrap gap-2 mb-4">
                  {colorPresets.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setPaintColor(c.hex)}
                      className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                        paintColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'scale-110 border-white shadow-lg'
                          : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>

                {/* Metallic & Roughness Sliders */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-white/70 mb-1">
                      <span>Metallic Sheen</span>
                      <span className="font-mono text-emerald-400">{(metallic * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={metallic}
                      onChange={(e) => setMetallic(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold text-white/70 mb-1">
                      <span>Clearcoat Polish</span>
                      <span className="font-mono text-emerald-400">{((1 - roughness) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={0.9}
                      step={0.05}
                      value={roughness}
                      onChange={(e) => setRoughness(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RADIO & AUDIO */}
          {activePanel === 'audio' && (
            <div className="space-y-4">
              {/* Currently Playing Track Widget */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Radio size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {LOFI_PLAYLIST[currentTrackIndex]?.title || 'Lo-Fi Chill'}
                    </div>
                    <div className="text-[11px] text-white/50">
                      {LOFI_PLAYLIST[currentTrackIndex]?.artist} • {LOFI_PLAYLIST[currentTrackIndex]?.vibe}
                    </div>
                  </div>
                </div>

                {/* Player Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevTrack}
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Previous Track"
                  >
                    <SkipBack size={15} />
                  </button>
                  <button
                    onClick={toggleMusic}
                    className={`px-4 h-9 rounded-xl flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                      isMusicPlaying ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {isMusicPlaying ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isMusicPlaying ? 'PAUSE' : 'PLAY'}</span>
                  </button>
                  <button
                    onClick={nextTrack}
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Next Track"
                  >
                    <SkipForward size={15} />
                  </button>
                </div>
              </div>

              {/* Volume Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex justify-between text-xs font-bold text-white/80 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Volume2 size={14} className="text-emerald-400" /> Music Radio Volume
                    </span>
                    <span className="font-mono text-emerald-400">{(musicVolume * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex justify-between text-xs font-bold text-white/80 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Volume2 size={14} className="text-cyan-400" /> Engine & SFX Volume
                    </span>
                    <span className="font-mono text-cyan-400">{(sfxVolume * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={sfxVolume}
                    onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
                  />
                </div>
              </div>

              {/* Playlist Tracks */}
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-white/70 block mb-2">
                  Station Tracklist
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {LOFI_PLAYLIST.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        useGameStore.setState({ currentTrackIndex: t.id, isMusicPlaying: true })
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        currentTrackIndex === t.id
                          ? 'bg-emerald-600/30 border-emerald-400 text-white'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 text-white/70'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{t.title}</div>
                        <div className="text-[10px] text-white/50">{t.artist}</div>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                        {t.vibe}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DRIVING & PREFERENCES */}
          {activePanel === 'settings' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                {/* Antigravity Hover Mode */}
                <button
                  onClick={toggleHoverMode}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                    isHoverMode
                      ? 'bg-indigo-600/30 border-indigo-400 text-white'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  <Sparkles size={18} className={isHoverMode ? 'text-indigo-400' : 'text-white/60'} />
                  <div>
                    <div className="text-xs font-bold">Antigravity Hover</div>
                    <div className="text-[10px] text-white/40 font-mono">
                      {isHoverMode ? 'Active [H]' : 'Inactive [H]'}
                    </div>
                  </div>
                </button>

                {/* Auto-Drive Cruise */}
                <button
                  onClick={toggleAutoDrive}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                    autoDrive
                      ? 'bg-emerald-600/30 border-emerald-400 text-white'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  <Sliders size={18} className={autoDrive ? 'text-emerald-400' : 'text-white/60'} />
                  <div>
                    <div className="text-xs font-bold">Cruise Control</div>
                    <div className="text-[10px] text-white/40 font-mono">{autoDrive ? 'Cruising' : 'Manual'}</div>
                  </div>
                </button>

                {/* Speedometer Unit */}
                <button
                  onClick={toggleSpeedUnit}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-3 transition-all text-left cursor-pointer"
                >
                  <Activity size={18} className="text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold">Speed Unit</div>
                    <div className="text-[10px] text-emerald-400 font-mono font-bold uppercase">{speedUnit}</div>
                  </div>
                </button>

                {/* Touch Pedals */}
                <button
                  onClick={() => setShowTouchControls(!showTouchControls)}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                    showTouchControls
                      ? 'bg-emerald-600/30 border-emerald-400 text-white'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  <Gamepad2 size={18} className={showTouchControls ? 'text-emerald-400' : 'text-white/60'} />
                  <div>
                    <div className="text-xs font-bold">Touch Pedals</div>
                    <div className="text-[10px] text-white/40 font-mono">{showTouchControls ? 'Visible' : 'Hidden'}</div>
                  </div>
                </button>

                {/* Photo Mode */}
                <button
                  onClick={() => {
                    togglePhotoMode()
                    setActivePanel('none')
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-3 transition-all text-left cursor-pointer"
                >
                  <Camera size={18} className="text-amber-400" />
                  <div>
                    <div className="text-xs font-bold">Photo Mode</div>
                    <div className="text-[10px] text-white/40 font-mono">Framing Tool [P]</div>
                  </div>
                </button>

                {/* Zen Mode */}
                <button
                  onClick={() => {
                    toggleZenMode()
                    setActivePanel('none')
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-3 transition-all text-left cursor-pointer"
                >
                  <EyeOff size={18} className="text-indigo-400" />
                  <div>
                    <div className="text-xs font-bold">Zen Mode</div>
                    <div className="text-[10px] text-white/40 font-mono">Hide HUD [Z]</div>
                  </div>
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-3 transition-all text-left cursor-pointer"
                >
                  {isFullscreen ? <Minimize size={18} className="text-cyan-400" /> : <Maximize size={18} className="text-cyan-400" />}
                  <div>
                    <div className="text-xs font-bold">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</div>
                    <div className="text-[10px] text-white/40 font-mono">[F]</div>
                  </div>
                </button>

                {/* Diagnostics Telemetry HUD */}
                <button
                  onClick={toggleDiagnostics}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                    showDiagnostics
                      ? 'bg-emerald-600/30 border-emerald-400 text-white'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  <Activity size={18} className={showDiagnostics ? 'text-emerald-400' : 'text-white/60'} />
                  <div>
                    <div className="text-xs font-bold">Diagnostics HUD</div>
                    <div className="text-[10px] text-white/40 font-mono">[F3]</div>
                  </div>
                </button>
              </div>

              {/* Graphics Quality */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-white/80">
                    Graphics Quality Preset
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                    {graphicsQuality}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setGraphicsQuality(q)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold uppercase cursor-pointer transition-all ${
                        graphicsQuality === q
                          ? 'bg-emerald-600 text-white shadow-md'
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

          {/* TAB 5: DRIVER MANUAL & SHORTCUTS */}
          {activePanel === 'controls' && (
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {keyBindings.map((k) => (
                <div
                  key={k.key}
                  className="flex justify-between items-center py-2 px-3 rounded-xl bg-white/5 border border-white/5"
                >
                  <span className="px-2.5 py-0.5 bg-white/10 rounded-lg text-xs font-mono font-bold text-emerald-400">
                    {k.key}
                  </span>
                  <span className="text-xs text-white/80 font-medium text-right">{k.action}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 4. Real-Time Diagnostics & Telemetry HUD [F3]
// ----------------------------------------------------------------
function DiagnosticsHUD() {
  const speed = useTelemetryStore((s) => s.speed)
  const gear = useTelemetryStore((s) => s.gear)
  const rpm = useTelemetryStore((s) => s.rpm)
  const speedUnit = useGameStore((s) => s.speedUnit)
  const diagnostics = useGameStore((s) => s.diagnostics)
  const vehicleModel = useGameStore((s) => s.vehicleModel)
  const [fps, setFps] = useState(60)

  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let animationFrameId: number

    const tick = (now: number) => {
      frameCount++
      if (now - lastTime >= 350) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)))
        frameCount = 0
        lastTime = now
      }
      animationFrameId = requestAnimationFrame(tick)
    }

    animationFrameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  const displaySpeed = speedUnit === 'mph' ? Math.round(speed * 0.621371) : Math.round(speed)
  const unitLabel = speedUnit === 'mph' ? 'MPH' : 'KM/H'
  const fpsColor = fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="fixed top-20 left-6 z-40 pointer-events-none select-none font-mono text-[11px] leading-tight">
      <div className="bg-black/85 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-2xl text-white/90 w-80 space-y-2.5">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold tracking-wider text-xs text-white">ENGINE TELEMETRY</span>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">F3 HUD</span>
        </div>

        {/* Frame Performance */}
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-white/5 p-2 rounded-xl">
            <div className="text-white/50 text-[9px]">FRAME RATE</div>
            <div className={`text-base font-black ${fpsColor}`}>
              {fps} <span className="text-[10px] font-normal text-white/60">FPS</span>
            </div>
            <div className="text-[9px] text-white/40">{(1000 / Math.max(1, fps)).toFixed(1)} ms pacing</div>
          </div>
          <div className="bg-white/5 p-2 rounded-xl">
            <div className="text-white/50 text-[9px]">SPEED & GEAR</div>
            <div className="text-base font-black text-cyan-300">
              {displaySpeed} <span className="text-[10px] font-normal text-white/60">{unitLabel}</span>
            </div>
            <div className="text-[9px] text-white/40">Gear {gear} • {Math.round(rpm)} RPM</div>
          </div>
        </div>

        {/* Terrain Streaming & Buffer Metrics */}
        <div className="bg-white/5 p-2.5 rounded-xl space-y-1 text-[10px]">
          <div className="text-emerald-400 font-bold flex justify-between">
            <span>PREDICTIVE STREAMING</span>
            <span>NOMINAL</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Active Road Chunks:</span>
            <span className="text-white font-bold">{diagnostics.activeChunks} / 28 ({diagnostics.drawDistance}m pool)</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Forward Horizon Buffer:</span>
            <span className="text-emerald-300 font-bold">+{diagnostics.frontierBuffer}m ahead</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Catchup Engine:</span>
            <span className="text-white font-bold">Multi-Chunk While Loop</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Seam Smoothing:</span>
            <span className="text-emerald-300 font-bold">C1 Continuous Blend</span>
          </div>
        </div>

        {/* Audio Synthesis Architecture */}
        <div className="bg-white/5 p-2.5 rounded-xl space-y-1 text-[10px]">
          <div className="text-cyan-400 font-bold flex justify-between">
            <span>AUDIO ECOSYSTEM</span>
            <span className="uppercase">{vehicleModel === 'bmw_m3' || vehicleModel === 'supercar' ? 'Sample-Based V8' : vehicleModel}</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>RPM Crossfading:</span>
            <span className="text-emerald-300 font-bold">Idle / Low / Mid / High / Decel</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Authentic Recording:</span>
            <span className="text-emerald-300 font-bold">BMW M3 GT2 Live Track Audio</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 5. Specialized Photo Mode View
// ----------------------------------------------------------------
function PhotoModeView() {
  const togglePhotoMode = useGameStore((s) => s.togglePhotoMode)
  const [filter, setFilter] = useState<'normal' | 'warm' | 'cool' | 'dramatic'>('normal')

  return (
    <div className="w-full h-full pointer-events-none flex flex-col justify-between p-6 select-none font-sans">
      <div className="flex justify-between items-center pointer-events-auto">
        <div className="backdrop-blur-md bg-black/50 border border-white/20 text-white px-4 py-2 rounded-2xl flex items-center gap-2">
          <Camera size={16} className="text-emerald-400" />
          <span className="font-bold text-xs uppercase tracking-wider">Photo Studio Mode</span>
        </div>
        <button
          onClick={togglePhotoMode}
          className="backdrop-blur-md bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <X size={15} /> Exit [P]
        </button>
      </div>

      <div className="flex justify-center items-center pointer-events-auto">
        <div className="backdrop-blur-xl bg-black/60 border border-white/20 px-6 py-3 rounded-3xl flex items-center gap-3 text-white">
          {(['normal', 'warm', 'cool', 'dramatic'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase font-bold cursor-pointer transition-all ${
                filter === f
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-white/60'
              }`}
            >
              {f}
            </button>
          ))}
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

  const {
    cameraPerspective,
    cycleCameraPerspective,
    activePanel,
    setActivePanel,
    photoMode,
    togglePhotoMode,
    zenMode,
    toggleZenMode,
    toggleFullscreen,
    cycleWeather,
    cycleVehicleModel,
    toggleHoverMode,
    toggleMusic,
    showDiagnostics,
    toggleDiagnostics,
  } = useGameStore()

  // Camera display names
  const camLabels: Record<CameraPerspectiveType, string> = {
    chase: 'Chase',
    dashboard: 'Cockpit',
    drone: 'Drone',
    bumper: 'Bumper',
  }

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'c' || e.key === 'C') cycleCameraPerspective()
      if (e.key === 'h' || e.key === 'H') toggleHoverMode()
      if (e.key === 'b' || e.key === 'B') audioSystem.playHorn()
      if (e.key === 'v' || e.key === 'V') cycleVehicleModel()
      if (e.key === 't' || e.key === 'T') cycleWeather()
      if (e.key === 'p' || e.key === 'P') togglePhotoMode()
      if (e.key === 'z' || e.key === 'Z') toggleZenMode()
      if (e.key === 'm' || e.key === 'M') toggleMusic()
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      if (e.key === 'Escape') setActivePanel('none')
      if (e.key === 'F3') {
        e.preventDefault()
        toggleDiagnostics()
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
    toggleMusic,
    toggleFullscreen,
    toggleDiagnostics,
    setActivePanel,
  ])

  // If in Photo Mode, render the specialized photo framing view
  if (photoMode) {
    return <PhotoModeView />
  }

  // If in Zen Mode, hide all HUD elements and show only subtle exit hint
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
      {/* ----------------- TOP NAVBAR: DECLUTTERED & STREAMLINED ----------------- */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        {/* Brand Badge */}
        <div className="backdrop-blur-md bg-black/40 border border-white/15 px-4 py-2 rounded-2xl flex items-center gap-2.5 shadow-xl text-white">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <h1 className="text-sm font-black tracking-widest text-white leading-none">
              CALM ROADS
            </h1>
            <span className="text-[9px] tracking-wider text-white/50 font-mono font-bold">
              ENDLESS DRIVE
            </span>
          </div>
        </div>

        {/* Streamlined Right Controls: Camera Quick-Toggle & Master Menu */}
        <div className="flex items-center gap-2.5">
          {/* Camera Perspective Toggle */}
          <button
            onClick={cycleCameraPerspective}
            className="backdrop-blur-md bg-black/40 hover:bg-black/60 text-white/80 hover:text-white border border-white/15 px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold cursor-pointer transition-all shadow-lg"
            title="Cycle Camera View [C]"
          >
            <Camera size={15} className="text-emerald-400" />
            <span className="font-mono">{camLabels[cameraPerspective]}</span>
            <span className="text-[9px] text-white/40 font-mono">[C]</span>
          </button>

          {/* Master Menu Button */}
          <button
            onClick={() => setActivePanel(activePanel === 'none' ? 'environment' : 'none')}
            className={`backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold cursor-pointer transition-all border shadow-lg ${
              activePanel !== 'none'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-black/40 hover:bg-black/60 text-white border-white/15'
            }`}
            title="Open Game Menu [Esc]"
          >
            {activePanel !== 'none' ? <X size={15} /> : <Menu size={15} className="text-emerald-400" />}
            <span className="tracking-wider">MENU</span>
          </button>
        </div>
      </div>

      {/* ----------------- OPTIONAL TOUCH PEDALS ----------------- */}
      {showTouchControls && <TouchPedals />}

      {/* ----------------- REAL-TIME DEV TELEMETRY HUD ----------------- */}
      {showDiagnostics && <DiagnosticsHUD />}

      {/* ----------------- BOTTOM HUD / SPEEDOMETER ----------------- */}
      <SpeedometerHUD />

      {/* ----------------- CONSOLIDATED MASTER MENU MODAL ----------------- */}
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
