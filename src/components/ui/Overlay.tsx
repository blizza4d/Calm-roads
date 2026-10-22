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
  Compass,
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
  VolumeX,
  Radio,
  Gamepad2,
} from 'lucide-react'
import {
  useGameStore,
  WeatherType,
  VehicleModelType,
  CameraPerspectiveType,
  BiomeSelection,
} from '../../store/useGameStore'
import { audioSystem } from '../../utils/audioSystem'
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
  const speed = useGameStore((s) => s.speed)
  const rpm = useGameStore((s) => s.rpm)
  const gear = useGameStore((s) => s.gear)
  const distance = useGameStore((s) => s.distance)
  const throttle = useGameStore((s) => s.throttle)
  const brake = useGameStore((s) => s.brake)
  const speedUnit = useGameStore((s) => s.speedUnit)
  const toggleSpeedUnit = useGameStore((s) => s.toggleSpeedUnit)
  const isHoverMode = useGameStore((s) => s.isHoverMode)
  const currentResolvedBiome = useGameStore((s) => s.currentResolvedBiome)

  const displayedSpeed = speedUnit === 'mph' ? Math.round(speed * 0.621371) : Math.round(speed)
  const unitLabel = speedUnit === 'mph' ? 'MPH' : 'KM/H'
  const displayedDistance =
    speedUnit === 'mph' ? (distance * 0.621371).toFixed(2) + ' MI' : distance.toFixed(2) + ' KM'

  const rpmPercent = Math.min(100, (rpm / 8500) * 100)
  const isRedline = rpm >= 7200
  const biomeName = BIOMES[currentResolvedBiome]?.name || 'Lush Forest'

  return (
    <div className="flex items-end justify-between w-full pointer-events-none gap-4">
      {/* Route & Trip Card (Bottom Left) */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        <div className="backdrop-blur-md bg-black/40 border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl text-white">
          <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center">
            <Compass size={17} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-white/50 font-bold font-mono">
              BIOME
            </div>
            <div className="text-xs font-bold text-white tracking-wide">{biomeName}</div>
          </div>
          <div className="border-l border-white/10 pl-3 ml-1">
            <div className="text-[9px] uppercase tracking-widest text-white/50 font-bold font-mono">
              ODOMETER
            </div>
            <div className="text-xs font-mono font-bold text-emerald-300">{displayedDistance}</div>
          </div>
        </div>

        {isHoverMode && (
          <div className="backdrop-blur-md bg-indigo-950/60 border border-indigo-400/30 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-mono text-indigo-200 shadow-lg animate-pulse w-fit">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span className="font-bold tracking-wider">ANTIGRAVITY ACTIVE</span>
          </div>
        )}
      </div>

      {/* Center of Road: 100% Clear & Unobstructed */}
      <div className="flex-1" />

      {/* Motorsport Cockpit Telemetry Cluster (Bottom Right) */}
      <div className="backdrop-blur-md bg-black/45 border border-white/15 p-4 rounded-3xl pointer-events-auto flex items-center gap-5 shadow-2xl text-white">
        {/* Gear & Telemetry Input Bars */}
        <div className="flex flex-col items-center justify-between h-20 py-0.5">
          <div className="flex flex-col items-center">
            <span className="text-[8px] uppercase tracking-widest text-white/50 font-bold font-mono">
              GEAR
            </span>
            <span
              className={`text-2xl font-black font-mono leading-none ${
                gear === 'R'
                  ? 'text-red-400'
                  : gear === 'N'
                  ? 'text-white/40'
                  : 'text-emerald-400'
              }`}
            >
              {gear}
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
// 3. Environment & Atmosphere Modal
// ----------------------------------------------------------------
function EnvironmentModal({ onClose }: { onClose: () => void }) {
  const {
    timeOfDay,
    setTimeOfDay,
    autoTimeCycle,
    toggleAutoTimeCycle,
    weather,
    setWeather,
    biome,
    setBiome,
  } = useGameStore()

  const biomes: { id: BiomeSelection; name: string; icon: React.ReactNode }[] = [
    { id: 'dynamic', name: 'Dynamic (Cycle)', icon: <Sparkles size={15} /> },
    { id: 'forest', name: 'Lush Forest', icon: <Trees size={15} /> },
    { id: 'autumn', name: 'Autumn Mountains', icon: <Flame size={15} /> },
    { id: 'tundra', name: 'Snowy Tundra', icon: <Snowflake size={15} /> },
    { id: 'desert', name: 'Desert Dunes', icon: <Mountain size={15} /> },
  ]

  const weathers: { id: WeatherType; name: string; icon: React.ReactNode }[] = [
    { id: 'clear', name: 'Clear Sky', icon: <Sun size={15} /> },
    { id: 'rain', name: 'Soft Rain', icon: <CloudRain size={15} /> },
    { id: 'snow', name: 'Gentle Snow', icon: <Snowflake size={15} /> },
    { id: 'mist', name: 'Morning Mist', icon: <Wind size={15} /> },
  ]

  const formatTime = (t: number) => {
    const hours = Math.floor(t)
    const minutes = Math.floor((t - hours) * 60)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 === 0 ? 12 : hours % 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-auto">
      <div className="backdrop-blur-xl bg-neutral-900/90 border border-white/20 max-w-xl w-full p-6 md:p-8 rounded-3xl shadow-2xl relative text-white">
        <div className="flex justify-between items-center mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-mono font-bold">
              Atmosphere & World Horizon
            </div>
            <h2 className="text-xl md:text-2xl font-black mt-0.5">
              Environment Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Time of Day Slider */}
        <div className="mb-5 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs uppercase tracking-wider font-bold text-white/80 flex items-center gap-2">
              {timeOfDay >= 6 && timeOfDay <= 18 ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-blue-300" />}
              Time of Day: <span className="text-emerald-400 font-mono font-bold">{formatTime(timeOfDay)}</span>
            </span>
            <button
              onClick={toggleAutoTimeCycle}
              className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase cursor-pointer transition-colors ${
                autoTimeCycle ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              Auto: {autoTimeCycle ? 'ON' : 'OFF'}
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={23.95}
            step={0.1}
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-white/40 mt-1 font-bold">
            <span>Midnight (0:00)</span>
            <span>Sunrise (6:00)</span>
            <span>Noon (12:00)</span>
            <span>Sunset (18:00)</span>
          </div>
        </div>

        {/* 2. Weather Preset Selector */}
        <div className="mb-5">
          <span className="text-xs uppercase tracking-wider font-bold text-white/70 block mb-2.5">
            Weather State
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {weathers.map((w) => {
              const isSelected = weather === w.id
              return (
                <button
                  key={w.id}
                  onClick={() => setWeather(w.id)}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-lg'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
                  }`}
                >
                  {w.icon}
                  <span>{w.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Biome Selector */}
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-white/70 block mb-2.5">
            World Biome
          </span>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {biomes.map((b) => {
              const isSelected = biome === b.id
              return (
                <button
                  key={b.id}
                  onClick={() => setBiome(b.id)}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-lg'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
                  }`}
                >
                  {b.icon}
                  <span>{b.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 4. Vehicle Customizer & Garage Modal
// ----------------------------------------------------------------
function GarageModal({ onClose }: { onClose: () => void }) {
  const {
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
  } = useGameStore()

  const vehicles: { id: VehicleModelType; name: string; tag: string; desc: string }[] = [
    {
      id: 'bmw_m3',
      name: "BMW M3 GTR '05",
      tag: 'Flagship V8 GT',
      desc: 'High-revving P60B40 V8 with straight-cut transmission whine, widebody GT kit, and carbon wing.',
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
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-auto">
      <div className="backdrop-blur-xl bg-neutral-900/90 border border-white/20 max-w-2xl w-full p-6 md:p-8 rounded-3xl shadow-2xl relative text-white">
        <div className="flex justify-between items-center mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-mono font-bold">
              Engineering & Performance Tuning
            </div>
            <h2 className="text-xl md:text-2xl font-black mt-0.5">
              Vehicle Garage
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Vehicle Selection Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
          {vehicles.map((v) => {
            const isSelected = vehicleModel === v.id
            return (
              <div
                key={v.id}
                onClick={() => setVehicleModel(v.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-xl scale-[1.02]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
                }`}
              >
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-bold block opacity-60 font-mono">
                    {v.tag}
                  </span>
                  <h3 className="font-bold text-xs mt-1 text-white">{v.name}</h3>
                </div>
                <p className="text-[10px] mt-2 opacity-80 leading-snug line-clamp-2">{v.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Hover Mode Antigravity Toggle Bar */}
        <div className="mb-5 p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-white flex items-center gap-2">
              <Sparkles size={15} className="text-indigo-400" /> Antigravity Repulsor Mode
            </span>
            <p className="text-[11px] text-white/60 mt-0.5">
              Deploys upward magnetic levitation to glide seamlessly above curves with zero rolling friction.
            </p>
          </div>
          <button
            onClick={toggleHoverMode}
            className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
              isHoverMode
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {isHoverMode ? 'ACTIVE' : 'OFF'}
          </button>
        </div>

        {/* Paint & Material Customization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-white/70 block mb-2">
              Livery Paint Color
            </span>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setPaintColor(c.hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    paintColor === c.hex ? 'scale-110 border-white shadow-lg ring-2 ring-emerald-400' : 'border-white/40'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs font-bold text-white/70 mb-1">
                <span>Metallic Flake</span>
                <span className="font-mono text-emerald-400">{Math.round(metallic * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={metallic}
                onChange={(e) => setMetallic(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-white/70 mb-1">
                <span>Clearcoat Roughness</span>
                <span className="font-mono text-emerald-400">{Math.round(roughness * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.95}
                step={0.05}
                value={roughness}
                onChange={(e) => setRoughness(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 5. Photo Mode Overlay
// ----------------------------------------------------------------
function PhotoModeView() {
  const setPhotoMode = useGameStore((s) => s.setPhotoMode)

  const captureScreenshot = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const image = canvas.toDataURL('image/png')
    const link = document.createElement('link') as unknown as HTMLAnchorElement
    link.download = `CalmRoads_Photo_${Date.now()}.png`
    link.href = image
    link.click()
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto flex flex-col justify-between p-6 bg-black/20">
      {/* Top Banner */}
      <div className="flex justify-between items-center w-full">
        <div className="backdrop-blur-md bg-black/60 border border-white/20 text-white px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-mono font-bold">
          <Camera size={15} className="text-red-400" />
          <span>PHOTO MODE (Physics Paused & Orbit Camera Enabled)</span>
        </div>

        <button
          onClick={() => setPhotoMode(false)}
          className="backdrop-blur-md bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <X size={15} /> Exit
        </button>
      </div>

      {/* Framing Reticle */}
      <div className="self-center border border-white/30 w-36 h-36 rounded-3xl pointer-events-none opacity-40"></div>

      {/* Shutter Capture Button */}
      <div className="self-center flex items-center gap-4">
        <button
          onClick={captureScreenshot}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer shadow-2xl hover:scale-105 transition-all"
        >
          <Camera size={16} /> Capture Wallpaper
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 6. Controls Manual Modal
// ----------------------------------------------------------------
function ControlsModal({ onClose }: { onClose: () => void }) {
  const keys = [
    { key: 'W / ↑', action: 'Progressive Throttle / Acceleration' },
    { key: 'S / ↓', action: 'Brake / Reverse' },
    { key: 'A / ←', action: 'Steer Left' },
    { key: 'D / →', action: 'Steer Right' },
    { key: 'SPACE', action: 'Handbrake / High-Speed Drift' },
    { key: 'H', action: 'Toggle Antigravity / Hover Mode' },
    { key: 'C', action: 'Cycle Camera (Chase, Cockpit, Drone, Bumper)' },
    { key: 'V', action: 'Switch Vehicle Model' },
    { key: 'T', action: 'Cycle Weather Presets' },
    { key: 'P', action: 'Photo Mode (Free Orbit Cam)' },
    { key: 'Z', action: 'Zen Mode (Toggle Minimal HUD)' },
    { key: 'M', action: 'Toggle Lo-Fi Ambient Radio' },
    { key: 'F', action: 'Toggle Fullscreen Mode' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-auto">
      <div className="backdrop-blur-xl bg-neutral-900/90 border border-white/20 max-w-md w-full p-6 md:p-8 rounded-3xl shadow-2xl relative text-white">
        <div className="flex justify-between items-center mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-mono font-bold">
              Driver Manual
            </div>
            <h2 className="text-xl md:text-2xl font-black mt-0.5">
              Controls & Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
          {keys.map((k) => (
            <div key={k.key} className="flex justify-between items-center py-2 px-3 rounded-xl bg-white/5 border border-white/5">
              <span className="px-2.5 py-0.5 bg-white/10 rounded-lg text-xs font-mono font-bold text-emerald-400">
                {k.key}
              </span>
              <span className="text-xs text-white/80 font-medium text-right">{k.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 7. Master UI Overlay Component
// ----------------------------------------------------------------
export default function Overlay() {
  const [showTouchControls, setShowTouchControls] = useState(false)

  const {
    isHoverMode,
    toggleHoverMode,
    cameraPerspective,
    cycleCameraPerspective,
    autoDrive,
    toggleAutoDrive,
    isMusicPlaying,
    toggleMusic,
    currentTrackIndex,
    nextTrack,
    prevTrack,
    musicVolume,
    setMusicVolume,
    activePanel,
    setActivePanel,
    photoMode,
    togglePhotoMode,
    zenMode,
    toggleZenMode,
    isFullscreen,
    toggleFullscreen,
    cycleWeather,
    cycleVehicleModel,
    vehicleModel,
  } = useGameStore()

  // Sync music state with audioSystem
  useEffect(() => {
    if (isMusicPlaying) {
      audioSystem.startMusic(currentTrackIndex)
    } else {
      audioSystem.stopMusic()
    }
  }, [isMusicPlaying, currentTrackIndex])

  useEffect(() => {
    audioSystem.setMusicVolume(musicVolume)
  }, [musicVolume])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'c' || e.key === 'C') cycleCameraPerspective()
      if (e.key === 'h' || e.key === 'H') toggleHoverMode()
      if (e.key === 'v' || e.key === 'V') cycleVehicleModel()
      if (e.key === 't' || e.key === 'T') cycleWeather()
      if (e.key === 'p' || e.key === 'P') togglePhotoMode()
      if (e.key === 'z' || e.key === 'Z') toggleZenMode()
      if (e.key === 'm' || e.key === 'M') toggleMusic()
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
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
  ])

  // Camera display names
  const camLabels: Record<CameraPerspectiveType, string> = {
    chase: 'Chase',
    dashboard: 'Cockpit',
    drone: 'Drone',
    bumper: 'Bumper',
  }

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
      {/* ----------------- TOP NAVBAR ----------------- */}
      <div className="flex flex-wrap items-center justify-between w-full pointer-events-auto gap-2">
        {/* Brand Badge */}
        <div className="backdrop-blur-md bg-black/40 border border-white/15 px-4 py-2 rounded-2xl flex items-center gap-2.5 shadow-xl text-white">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <h1 className="text-sm font-black tracking-widest text-white leading-none">
              CALM ROADS
            </h1>
            <span className="text-[9px] tracking-wider text-white/50 font-mono font-bold">
              HIGH SPEED RACING
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Antigravity / Hover Mode Switch */}
          <button
            onClick={toggleHoverMode}
            className={`px-3.5 py-2 rounded-2xl text-xs font-mono font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-md ${
              isHoverMode
                ? 'bg-indigo-600/90 text-white border border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                : 'bg-black/40 hover:bg-black/60 text-white/80 border border-white/15'
            }`}
            title="Toggle Antigravity Hover Mode [H]"
          >
            <Sparkles size={14} className={isHoverMode ? 'text-cyan-300' : 'text-white/60'} />
            <span>HOVER {isHoverMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Environment Modal Button */}
          <button
            onClick={() => setActivePanel(activePanel === 'environment' ? 'none' : 'environment')}
            className={`backdrop-blur-md px-3 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-all ${
              activePanel === 'environment'
                ? 'bg-emerald-600 text-white border border-emerald-400 shadow-md'
                : 'bg-black/40 hover:bg-black/60 text-white/80 border border-white/15'
            }`}
          >
            <CloudSun size={15} className="text-emerald-400" />
            <span>Atmosphere</span>
          </button>

          {/* Vehicle Customizer Button */}
          <button
            onClick={() => setActivePanel(activePanel === 'garage' ? 'none' : 'garage')}
            className={`backdrop-blur-md px-3 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-all ${
              activePanel === 'garage'
                ? 'bg-emerald-600 text-white border border-emerald-400 shadow-md'
                : 'bg-black/40 hover:bg-black/60 text-white/80 border border-white/15'
            }`}
          >
            <Palette size={15} className="text-emerald-400" />
            <span className="capitalize">{vehicleModel === 'bmw_m3' ? 'BMW M3' : vehicleModel}</span>
          </button>

          {/* Camera Perspective Toggle */}
          <button
            onClick={cycleCameraPerspective}
            className="backdrop-blur-md bg-black/40 hover:bg-black/60 text-white/80 border border-white/15 px-3 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-all"
            title="Cycle Camera Perspective [C]"
          >
            <Camera size={15} className="text-emerald-400" />
            <span>{camLabels[cameraPerspective]}</span>
          </button>

          {/* Lo-Fi Ambient Radio Player Widget */}
          <div className="backdrop-blur-md bg-black/40 border border-white/15 px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-xl text-white">
            <Radio size={13} className="text-emerald-400" />
            <button
              onClick={prevTrack}
              className="text-white/40 hover:text-white transition-colors cursor-pointer"
              title="Previous Track"
            >
              <SkipBack size={12} />
            </button>

            <button
              onClick={toggleMusic}
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                isMusicPlaying
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Toggle Music [M]"
            >
              {isMusicPlaying ? <Pause size={11} /> : <Play size={11} className="ml-0.5" />}
            </button>

            <button
              onClick={nextTrack}
              className="text-white/40 hover:text-white transition-colors cursor-pointer"
              title="Next Track"
            >
              <SkipForward size={12} />
            </button>

            {/* Volume Slider */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-white/10">
              {musicVolume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} className="text-white/50" />}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="w-12 accent-emerald-500 cursor-pointer h-1"
                title="Music Volume"
              />
            </div>
          </div>

          {/* Auto-Drive Cruise Toggle */}
          <button
            onClick={toggleAutoDrive}
            className={`backdrop-blur-md px-3 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer ${
              autoDrive
                ? 'bg-emerald-600 text-white border border-emerald-400 shadow-md'
                : 'bg-black/40 hover:bg-black/60 text-white/80 border border-white/15'
            }`}
            title="Toggle Auto-Drive Cruise"
          >
            CRUISE {autoDrive ? 'ON' : 'OFF'}
          </button>

          {/* Touch Controls Toggle */}
          <button
            onClick={() => setShowTouchControls(!showTouchControls)}
            className={`backdrop-blur-md w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer transition-all border ${
              showTouchControls
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-black/40 hover:bg-black/60 text-white/70 border-white/15'
            }`}
            title="Toggle On-Screen Touch Controls"
          >
            <Gamepad2 size={15} />
          </button>

          {/* Zen Mode Button */}
          <button
            onClick={toggleZenMode}
            className="backdrop-blur-md bg-black/40 hover:bg-black/60 text-white/70 hover:text-white border border-white/15 w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer transition-all"
            title="Zen Mode (Hide HUD) [Z]"
          >
            <EyeOff size={15} />
          </button>

          {/* Driver Manual Button */}
          <button
            onClick={() => setActivePanel(activePanel === 'controls' ? 'none' : 'controls')}
            className="backdrop-blur-md bg-black/40 hover:bg-black/60 text-white/70 hover:text-white border border-white/15 w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer transition-all"
            title="Controls Guide"
          >
            <HelpCircle size={15} />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="backdrop-blur-md bg-black/40 hover:bg-black/60 text-white/70 hover:text-white border border-white/15 w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer transition-all"
            title="Toggle Fullscreen [F]"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      {/* ----------------- OPTIONAL TOUCH PEDALS ----------------- */}
      {showTouchControls && <TouchPedals />}

      {/* ----------------- BOTTOM HUD / SPEEDOMETER ----------------- */}
      <SpeedometerHUD />

      {/* ----------------- ACTIVE MODALS & PANELS ----------------- */}
      {activePanel === 'environment' && <EnvironmentModal onClose={() => setActivePanel('none')} />}
      {activePanel === 'garage' && <GarageModal onClose={() => setActivePanel('none')} />}
      {activePanel === 'controls' && <ControlsModal onClose={() => setActivePanel('none')} />}
    </div>
  )
}
