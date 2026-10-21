import { useEffect } from 'react'
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
// 1. Digital Speedometer & Virtual Driving Controls
// ----------------------------------------------------------------
function VirtualPedals() {
  const setVirtualThrottle = useGameStore((s) => s.setVirtualThrottle)
  const setVirtualBrake = useGameStore((s) => s.setVirtualBrake)
  const setVirtualSteerLeft = useGameStore((s) => s.setVirtualSteerLeft)
  const setVirtualSteerRight = useGameStore((s) => s.setVirtualSteerRight)
  const autoDrive = useGameStore((s) => s.autoDrive)

  if (autoDrive) return null

  return (
    <div className="flex items-center gap-3 pointer-events-auto select-none">
      {/* Steering Buttons */}
      <div className="flex gap-1.5">
        <button
          onPointerDown={() => setVirtualSteerLeft(true)}
          onPointerUp={() => setVirtualSteerLeft(false)}
          onPointerLeave={() => setVirtualSteerLeft(false)}
          className="paper-pill w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base cursor-pointer active:scale-95 transition-transform"
          title="Steer Left [A / ←]"
        >
          ←
        </button>
        <button
          onPointerDown={() => setVirtualSteerRight(true)}
          onPointerUp={() => setVirtualSteerRight(false)}
          onPointerLeave={() => setVirtualSteerRight(false)}
          className="paper-pill w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base cursor-pointer active:scale-95 transition-transform"
          title="Steer Right [D / →]"
        >
          →
        </button>
      </div>

      {/* Pedals: Brake & Drive */}
      <div className="flex gap-1.5">
        <button
          onPointerDown={() => setVirtualBrake(true)}
          onPointerUp={() => setVirtualBrake(false)}
          onPointerLeave={() => setVirtualBrake(false)}
          className="paper-pill-accent px-3.5 py-2 rounded-2xl font-mono font-bold text-xs flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform shadow-md"
          title="Brake / Reverse [S / ↓]"
        >
          <span>BRAKE</span>
          <span className="text-[8px] opacity-70">[S / ↓]</span>
        </button>
        <button
          onPointerDown={() => setVirtualThrottle(true)}
          onPointerUp={() => setVirtualThrottle(false)}
          onPointerLeave={() => setVirtualThrottle(false)}
          className="paper-pill-active px-4 py-2 rounded-2xl font-mono font-bold text-xs flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform shadow-md"
          title="Accelerate [W / ↑]"
        >
          <span>DRIVE</span>
          <span className="text-[8px] opacity-70">[W / ↑]</span>
        </button>
      </div>

      {/* Horn Button */}
      <button
        onClick={() => audioSystem.playHorn()}
        className="paper-pill px-3 py-2.5 rounded-2xl text-[10px] font-mono font-bold uppercase cursor-pointer active:scale-95 transition-transform"
        title="Beep Horn [H]"
      >
        HORN
      </button>
    </div>
  )
}

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

  const rpmPercent = Math.min(100, (rpm / 8000) * 100)
  const isRedline = rpm >= 7000
  const biomeName = BIOMES[currentResolvedBiome]?.name || 'Lush Forest'

  return (
    <div className="flex items-end justify-between w-full pointer-events-none gap-4">
      {/* Route & Trip Card (Bottom Left) */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        <div className="paper-panel px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-lg">
          <div className="w-8 h-8 rounded-full bg-[#6B705C]/20 text-[#6B705C] flex items-center justify-center font-bold">
            <Compass size={17} />
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-[#2A2A2A]/50 font-bold font-mono">
              Active Biome
            </div>
            <div className="text-xs font-bold text-[#2A2A2A]">{biomeName}</div>
          </div>
        </div>

        <div className="paper-panel px-4 py-2 rounded-xl flex items-center gap-3 text-xs font-mono text-[#2A2A2A]/70 shadow-md">
          <div>
            <span className="text-[#2A2A2A]/40 mr-1.5">TRIP:</span>
            <span className="font-bold text-[#2A2A2A]">{displayedDistance}</span>
          </div>
          {isHoverMode && (
            <div className="flex items-center gap-1.5 text-[#B83B2F] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#B83B2F] animate-ping"></span>
              HOVER ACTIVE
            </div>
          )}
        </div>
      </div>

      {/* Center Interactive Pedals & Driving dock */}
      <div className="hidden md:flex flex-col items-center gap-2">
        <VirtualPedals />
      </div>

      {/* Speed & Gear Dial (Bottom Right) */}
      <div className="paper-panel p-4 rounded-3xl pointer-events-auto flex items-center gap-5 shadow-2xl">
        {/* Gear & Input Bars */}
        <div className="flex flex-col items-center justify-between h-20 py-0.5">
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-widest text-[#2A2A2A]/50 font-bold font-mono">
              GEAR
            </span>
            <span
              className={`text-2xl font-black font-mono leading-none ${
                gear === 'R' ? 'text-[#B83B2F]' : gear === 'N' ? 'text-[#2A2A2A]/40' : 'text-[#6B705C]'
              }`}
            >
              {gear}
            </span>
          </div>

          <div className="flex gap-1.5 items-end h-7">
            {/* Brake Meter */}
            <div className="w-1.5 h-full bg-[#2A2A2A]/10 rounded-full overflow-hidden flex flex-col justify-end">
              <div
                className="w-full bg-[#B83B2F] transition-all duration-75 rounded-full"
                style={{ height: `${brake * 100}%` }}
              ></div>
            </div>
            {/* Throttle Meter */}
            <div className="w-1.5 h-full bg-[#2A2A2A]/10 rounded-full overflow-hidden flex flex-col justify-end">
              <div
                className="w-full bg-[#6B705C] transition-all duration-75 rounded-full"
                style={{ height: `${throttle * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Speedometer Digits & RPM Bar */}
        <div className="flex flex-col items-center justify-center min-w-[110px]">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black tracking-tight text-[#2A2A2A] font-mono leading-none">
              {displayedSpeed}
            </span>
          </div>

          <button
            onClick={toggleSpeedUnit}
            className="text-[9px] font-mono font-bold tracking-widest text-[#2A2A2A]/60 hover:text-[#2A2A2A] transition-colors uppercase mt-1 cursor-pointer"
          >
            {unitLabel} <span className="opacity-40">| SWITCH</span>
          </button>

          {/* RPM Bar */}
          <div className="w-full mt-2.5">
            <div className="flex justify-between text-[8px] font-mono text-[#2A2A2A]/40 mb-1 font-bold">
              <span>0</span>
              <span>RPM x1000</span>
              <span className={isRedline ? 'text-[#B83B2F]' : ''}>8</span>
            </div>
            <div className="w-full h-1.5 bg-[#2A2A2A]/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  isRedline ? 'bg-[#B83B2F]' : 'bg-[#6B705C]'
                }`}
                style={{ width: `${rpmPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 2. Environment & Atmosphere Modal
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md pointer-events-auto">
      <div className="paper-panel max-w-xl w-full p-6 md:p-8 rounded-3xl shadow-2xl relative border border-white/80">
        <div className="flex justify-between items-center mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#6B705C] font-mono font-bold">
              Atmosphere & Horizon
            </div>
            <h2 className="text-xl md:text-2xl font-black text-[#2A2A2A] mt-0.5">
              Environment Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#2A2A2A]/5 hover:bg-[#2A2A2A]/10 flex items-center justify-center text-[#2A2A2A] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Time of Day Slider */}
        <div className="mb-5 p-4 rounded-2xl bg-[#2A2A2A]/5 border border-[#2A2A2A]/10">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs uppercase tracking-wider font-bold text-[#2A2A2A]/70 flex items-center gap-2">
              {timeOfDay >= 6 && timeOfDay <= 18 ? <Sun size={15} /> : <Moon size={15} />}
              Time of Day: <span className="text-[#2A2A2A] font-mono font-bold">{formatTime(timeOfDay)}</span>
            </span>
            <button
              onClick={toggleAutoTimeCycle}
              className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase cursor-pointer transition-colors ${
                autoTimeCycle ? 'bg-[#6B705C] text-[#F4F1EA]' : 'bg-[#2A2A2A]/10 text-[#2A2A2A]/70'
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
            className="w-full accent-[#6B705C] cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-[#2A2A2A]/40 mt-1 font-bold">
            <span>Midnight (0:00)</span>
            <span>Sunrise (6:00)</span>
            <span>Noon (12:00)</span>
            <span>Sunset (18:00)</span>
          </div>
        </div>

        {/* 2. Weather Preset Selector */}
        <div className="mb-5">
          <span className="text-xs uppercase tracking-wider font-bold text-[#2A2A2A]/70 block mb-2.5">
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
                    isSelected ? 'paper-pill-active' : 'bg-white/60 hover:bg-white text-[#2A2A2A]'
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
          <span className="text-xs uppercase tracking-wider font-bold text-[#2A2A2A]/70 block mb-2.5">
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
                    isSelected ? 'paper-pill-active' : 'bg-white/60 hover:bg-white text-[#2A2A2A]'
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
// 3. Vehicle Customizer & Garage Modal
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
      tag: 'Most Wanted Flagship',
      desc: 'The iconic Bavarian GT racer with widebody aero, dual vented hood, and high-mount wing.',
    },
    {
      id: 'hovercraft',
      name: 'Antigravity Hovercraft',
      tag: 'Futuristic Sci-Fi',
      desc: 'Glides 1.25m above any terrain using 4 corner repulsor coils and dual ion thrusters.',
    },
    {
      id: 'camper',
      name: 'Cozy Camper Van',
      tag: '1974 Vintage Cruiser',
      desc: 'Two-tone retro van with rooftop surfboard, white-wall tires, and soft suspension.',
    },
    {
      id: 'hatchback',
      name: 'Vintage Rally Hatchback',
      tag: '1988 Hot Hatch',
      desc: 'Agile hot hatch with dual circular rally fog lamps and sharp steering response.',
    },
  ]

  const colorPresets = [
    { name: 'Silver Slate', hex: '#cbd5e1' },
    { name: 'Cobalt Blue', hex: '#1d4ed8' },
    { name: 'Racing Crimson', hex: '#dc2626' },
    { name: 'Sage Green', hex: '#6b705c' },
    { name: 'Paper Cream', hex: '#f4f1ea' },
    { name: 'Midnight Onyx', hex: '#0f172a' },
    { name: 'Sunburst Gold', hex: '#f59e0b' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md pointer-events-auto">
      <div className="paper-panel max-w-2xl w-full p-6 md:p-8 rounded-3xl shadow-2xl relative border border-white/80">
        <div className="flex justify-between items-center mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#6B705C] font-mono font-bold">
              Engineering & Aesthetics
            </div>
            <h2 className="text-xl md:text-2xl font-black text-[#2A2A2A] mt-0.5">
              Vehicle Customization
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#2A2A2A]/5 hover:bg-[#2A2A2A]/10 flex items-center justify-center text-[#2A2A2A] transition-colors cursor-pointer"
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
                    ? 'paper-pill-active shadow-lg scale-[1.02]'
                    : 'bg-white/60 hover:bg-white text-[#2A2A2A]'
                }`}
              >
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-bold block opacity-60 font-mono">
                    {v.tag}
                  </span>
                  <h3 className="font-bold text-xs mt-1">{v.name}</h3>
                </div>
                <p className="text-[10px] mt-2 opacity-80 leading-snug line-clamp-2">{v.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Hover Mode Antigravity Toggle Bar */}
        <div className="mb-5 p-3.5 rounded-2xl bg-[#2A2A2A]/5 border border-[#2A2A2A]/10 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-[#2A2A2A] flex items-center gap-2">
              <Sparkles size={15} className="text-[#B83B2F]" /> Antigravity / Hover Mode
            </span>
            <p className="text-[11px] text-[#2A2A2A]/60 mt-0.5">
              Deploys upward repulsor coils to glide smoothly over hills with effortless drift.
            </p>
          </div>
          <button
            onClick={toggleHoverMode}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
              isHoverMode ? 'paper-pill-accent' : 'bg-white text-[#2A2A2A] border border-[#2A2A2A]/20'
            }`}
          >
            {isHoverMode ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Paint & Material Customization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#2A2A2A]/5 border border-[#2A2A2A]/10">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-[#2A2A2A]/70 block mb-2">
              Paint Color
            </span>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setPaintColor(c.hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    paintColor === c.hex ? 'scale-110 border-[#2A2A2A] shadow-md' : 'border-white/80'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs font-bold text-[#2A2A2A]/70 mb-1">
                <span>Metallic Sheen</span>
                <span className="font-mono">{Math.round(metallic * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={metallic}
                onChange={(e) => setMetallic(parseFloat(e.target.value))}
                className="w-full accent-[#6B705C] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-[#2A2A2A]/70 mb-1">
                <span>Roughness</span>
                <span className="font-mono">{Math.round(roughness * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.95}
                step={0.05}
                value={roughness}
                onChange={(e) => setRoughness(parseFloat(e.target.value))}
                className="w-full accent-[#6B705C] cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 4. Photo Mode Overlay
// ----------------------------------------------------------------
function PhotoModeView() {
  const setPhotoMode = useGameStore((s) => s.setPhotoMode)

  const captureScreenshot = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const image = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `CalmRoads_Photo_${Date.now()}.png`
    link.href = image
    link.click()
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto flex flex-col justify-between p-6">
      {/* Top Banner */}
      <div className="flex justify-between items-center w-full">
        <div className="paper-panel px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-mono font-bold">
          <Camera size={15} className="text-[#B83B2F]" />
          <span>PHOTO MODE (Physics Paused & Free Cam Enabled)</span>
        </div>

        <button
          onClick={() => setPhotoMode(false)}
          className="paper-pill px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <X size={15} /> Exit
        </button>
      </div>

      {/* Framing Reticle */}
      <div className="self-center border border-white/30 w-32 h-32 rounded-3xl pointer-events-none opacity-40"></div>

      {/* Shutter Capture Button */}
      <div className="self-center flex items-center gap-4">
        <button
          onClick={captureScreenshot}
          className="paper-pill-accent px-5 py-3 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer shadow-2xl hover:scale-105 transition-transform"
        >
          <Camera size={16} /> Capture & Download Wallpaper
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 5. Controls Manual Modal
// ----------------------------------------------------------------
function ControlsModal({ onClose }: { onClose: () => void }) {
  const keys = [
    { key: 'W / ↑', action: 'Smooth Acceleration' },
    { key: 'S / ↓', action: 'Brake / Reverse' },
    { key: 'A / ←', action: 'Steer Left' },
    { key: 'D / →', action: 'Steer Right' },
    { key: 'H', action: 'Toggle Antigravity / Hover Mode' },
    { key: 'SPACE', action: 'Handbrake / Drift' },
    { key: 'C', action: 'Cycle Camera Perspectives (Chase, Dash, Drone, Bumper)' },
    { key: 'V', action: 'Quick Switch Vehicle Model' },
    { key: 'T', action: 'Cycle Weather Presets' },
    { key: 'P', action: 'Open Photo Mode (Free Orbit Cam)' },
    { key: 'Z', action: 'Zen Mode (Toggle Minimal HUD)' },
    { key: 'M', action: 'Toggle Lo-Fi Ambient Radio' },
    { key: 'F', action: 'Toggle Fullscreen Mode' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md pointer-events-auto">
      <div className="paper-panel max-w-md w-full p-6 md:p-8 rounded-3xl shadow-2xl relative border border-white/80">
        <div className="flex justify-between items-center mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#6B705C] font-mono font-bold">
              Driver Manual
            </div>
            <h2 className="text-xl md:text-2xl font-black text-[#2A2A2A] mt-0.5">
              Controls & Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#2A2A2A]/5 hover:bg-[#2A2A2A]/10 flex items-center justify-center text-[#2A2A2A] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
          {keys.map((k) => (
            <div key={k.key} className="flex justify-between items-center py-2 px-3 rounded-xl bg-white/70">
              <span className="px-2 py-0.5 bg-[#2A2A2A]/10 rounded-lg text-xs font-mono font-bold text-[#2A2A2A]">
                {k.key}
              </span>
              <span className="text-xs text-[#2A2A2A]/80 font-medium text-right">{k.action}</span>
            </div>
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
        <div className="paper-pill px-5 py-2 rounded-full text-xs font-mono font-bold opacity-30 hover:opacity-100 transition-opacity flex items-center gap-2">
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
        <div className="paper-panel px-4 py-2 rounded-2xl flex items-center gap-2.5 shadow-md">
          <div className="w-2.5 h-2.5 rounded-full bg-[#6B705C] animate-pulse"></div>
          <div>
            <h1 className="text-sm font-black tracking-widest text-[#2A2A2A] leading-none">
              CALM ROADS
            </h1>
            <span className="text-[9px] tracking-wider text-[#2A2A2A]/50 font-mono font-bold">
              ZEN DRIVING
            </span>
          </div>
        </div>

        {/* Action Pills Menu */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Antigravity / Hover Mode Switch */}
          <button
            onClick={toggleHoverMode}
            className={`px-3.5 py-2 rounded-2xl text-xs font-mono font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              isHoverMode ? 'paper-pill-accent' : 'paper-pill'
            }`}
            title="Toggle Antigravity Hover Mode [H]"
          >
            <Sparkles size={14} />
            <span>HOVER {isHoverMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Environment Modal Button */}
          <button
            onClick={() => setActivePanel(activePanel === 'environment' ? 'none' : 'environment')}
            className={`paper-pill px-3 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              activePanel === 'environment' ? 'paper-pill-active' : ''
            }`}
          >
            <CloudSun size={15} className="text-[#6B705C]" />
            <span>Atmosphere</span>
          </button>

          {/* Vehicle Customizer Button */}
          <button
            onClick={() => setActivePanel(activePanel === 'garage' ? 'none' : 'garage')}
            className={`paper-pill px-3 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              activePanel === 'garage' ? 'paper-pill-active' : ''
            }`}
          >
            <Palette size={15} className="text-[#6B705C]" />
            <span className="capitalize">{vehicleModel === 'bmw_m3' ? 'BMW M3' : vehicleModel}</span>
          </button>

          {/* Camera Perspective Toggle */}
          <button
            onClick={cycleCameraPerspective}
            className="paper-pill px-3 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Cycle Camera Perspective [C]"
          >
            <Camera size={15} />
            <span>{camLabels[cameraPerspective]}</span>
          </button>

          {/* Lo-Fi Ambient Radio Player Widget */}
          <div className="paper-panel px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-sm">
            <Radio size={13} className="text-[#6B705C]" />
            <button
              onClick={prevTrack}
              className="text-[#2A2A2A]/40 hover:text-[#2A2A2A] transition-colors cursor-pointer"
              title="Previous Track"
            >
              <SkipBack size={12} />
            </button>

            <button
              onClick={toggleMusic}
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                isMusicPlaying
                  ? 'bg-[#6B705C] text-[#F4F1EA] shadow-sm'
                  : 'bg-[#2A2A2A]/10 text-[#2A2A2A]'
              }`}
              title="Toggle Music [M]"
            >
              {isMusicPlaying ? <Pause size={11} /> : <Play size={11} className="ml-0.5" />}
            </button>

            <button
              onClick={nextTrack}
              className="text-[#2A2A2A]/40 hover:text-[#2A2A2A] transition-colors cursor-pointer"
              title="Next Track"
            >
              <SkipForward size={12} />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-[#2A2A2A]/10">
              {musicVolume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} className="text-[#2A2A2A]/50" />}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="w-12 accent-[#6B705C] cursor-pointer h-1"
                title="Music Volume"
              />
            </div>
          </div>

          {/* Auto-Drive Cruise Toggle */}
          <button
            onClick={toggleAutoDrive}
            className={`paper-pill px-3 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer ${
              autoDrive ? 'paper-pill-active' : ''
            }`}
            title="Toggle Auto-Drive Cruise"
          >
            CRUISE {autoDrive ? 'ON' : 'OFF'}
          </button>

          {/* Photo Mode Button */}
          <button
            onClick={togglePhotoMode}
            className="paper-pill w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer text-[#2A2A2A]/70 hover:text-[#2A2A2A]"
            title="Photo Mode [P]"
          >
            <Camera size={15} />
          </button>

          {/* Zen Mode Button */}
          <button
            onClick={toggleZenMode}
            className="paper-pill w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer text-[#2A2A2A]/70 hover:text-[#2A2A2A]"
            title="Zen Mode (Hide HUD) [Z]"
          >
            <EyeOff size={15} />
          </button>

          {/* Driver Manual Button */}
          <button
            onClick={() => setActivePanel(activePanel === 'controls' ? 'none' : 'controls')}
            className="paper-pill w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer text-[#2A2A2A]/70 hover:text-[#2A2A2A]"
            title="Controls Guide"
          >
            <HelpCircle size={15} />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="paper-pill w-9 h-9 rounded-2xl flex items-center justify-center cursor-pointer text-[#2A2A2A]/70 hover:text-[#2A2A2A]"
            title="Toggle Fullscreen [F]"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      {/* ----------------- BOTTOM HUD / SPEEDOMETER ----------------- */}
      <SpeedometerHUD />

      {/* ----------------- ACTIVE MODALS & PANELS ----------------- */}
      {activePanel === 'environment' && <EnvironmentModal onClose={() => setActivePanel('none')} />}
      {activePanel === 'garage' && <GarageModal onClose={() => setActivePanel('none')} />}
      {activePanel === 'controls' && <ControlsModal onClose={() => setActivePanel('none')} />}
    </div>
  )
}
