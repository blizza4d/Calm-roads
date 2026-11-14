import { useState, useEffect, useMemo } from 'react'
import { useLoadingStore } from '../../store/useLoadingStore'
import { useGameStore } from '../../store/useGameStore'
import { BiomeType } from '../../utils/roadMath'

const DRIVING_TIPS = [
  'Use smooth steering inputs at high speeds to preserve aerodynamic downforce and track stability.',
  'Let the vehicle carry momentum through wide sweeping corners by feathering the throttle.',
  'Press [C] to cycle between Chase, Cockpit Dashboard, Front Bumper, and Drone cameras.',
  'Press [B] or tap Burnout to engage the experimental Anti-Gravity Hovercraft flight mode.',
  'Open the Destinations menu [N] to travel between 7 distinct procedural biomes.',
  'Press [F3] anytime to toggle the real-time GPU diagnostics & telemetry overlay.',
  'Tap [Space] for handbrake drift entry into sharp hairpins.',
]

const STAGE_PIPS = [
  { id: 'INITIALIZING', label: '01 ENG' },
  { id: 'LOADING_ESSENTIAL_ASSETS', label: '02 VEH' },
  { id: 'BUILDING_INITIAL_WORLD', label: '03 WLD' },
  { id: 'PREPARING_MATERIALS', label: '04 ENV' },
  { id: 'COMPILING_SHADERS', label: '05 SHD' },
  { id: 'WARMING_UP_RENDERER', label: '06 WRM' },
  { id: 'VERIFYING_FIRST_SCENE', label: '07 FIN' },
  { id: 'READY', label: '08 RDY' },
]

const BIOME_NAMES: Record<BiomeType, string> = {
  plains: 'Plains Highway',
  desert: 'Desert Canyon',
  forest: 'Highland Forest',
  twisted_mountains: 'Twisted Mountains',
  alpine: 'Alpine Peaks',
  coastal: 'Pacific Coast',
  autumn: 'Autumn Ridge',
  rolling_hills: 'Rolling Hills',
  enchanted_forest: 'Enchanted Forest',
  tundra: 'Tundra Outpost',
}

const VEHICLE_NAMES: Record<string, string> = {
  bmw_m3: 'BMW M3 GTR',
  supercar: 'Apex GT Coupe',
  hovercraft: 'Aero AG-Hovercraft',
  camper: 'Adventure Camper',
  hatchback: 'Sport Turbo Hatch',
  modern_supercar: 'Venom Hypercar',
  vintage_hatch: 'Sprint Classic',
}

export default function LoadingScreen() {
  const stage = useLoadingStore((s) => s.stage)
  const progress = useLoadingStore((s) => s.progress)
  const statusMessage = useLoadingStore((s) => s.statusMessage)
  const subMessage = useLoadingStore((s) => s.subMessage)
  const errorMessage = useLoadingStore((s) => s.errorMessage)
  const isReady = useLoadingStore((s) => s.isReady)
  const retry = useLoadingStore((s) => s.retry)
  const startTime = useLoadingStore((s) => s.startTime)

  const biome = useGameStore((s) => s.currentResolvedBiome)
  const vehicleModel = useGameStore((s) => s.vehicleModel)
  const weather = useGameStore((s) => s.weather)
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const transmissionMode = useGameStore((s) => s.transmissionMode)
  const regenerateWorld = useGameStore((s) => s.regenerateWorld)

  // Rotating tips state
  const [tipIndex, setTipIndex] = useState(0)
  const [tipFade, setTipFade] = useState(true)

  // Elapsed timer state
  const [elapsed, setElapsed] = useState('0.0s')

  // Smooth fade-out upon READY
  const [isVisible, setIsVisible] = useState(true)
  const [opacityClass, setOpacityClass] = useState('opacity-100')

  // Cycle driving tips
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipFade(false)
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % DRIVING_TIPS.length)
        setTipFade(true)
      }, 300)
    }, 4500)
    return () => clearInterval(tipInterval)
  }, [])

  // Elapsed time tracker
  useEffect(() => {
    if (isReady && stage === 'READY') return
    const timer = setInterval(() => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const diffSec = ((now - startTime) / 1000).toFixed(1)
      setElapsed(`${diffSec}s`)
    }, 100)
    return () => clearInterval(timer)
  }, [isReady, stage, startTime])

  // Handle smooth transition when READY
  useEffect(() => {
    if (isReady && stage === 'READY') {
      const fadeTimeout = setTimeout(() => {
        setOpacityClass('opacity-0 pointer-events-none transition-opacity duration-600 ease-out')
      }, 350)

      const hideTimeout = setTimeout(() => {
        setIsVisible(false)
      }, 1000)

      return () => {
        clearTimeout(fadeTimeout)
        clearTimeout(hideTimeout)
      }
    } else {
      setIsVisible(true)
      setOpacityClass('opacity-100')
    }
  }, [isReady, stage])

  // Environmental telemetry readouts
  const formattedTime = useMemo(() => {
    const hours = Math.floor(timeOfDay)
    const minutes = Math.floor((timeOfDay - hours) * 60)
    const label = hours >= 5 && hours < 8 ? 'DAWN'
      : hours >= 8 && hours < 16 ? 'DAYLIGHT'
      : hours >= 16 && hours < 20 ? 'GOLDEN HOUR'
      : 'NIGHT'
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} [${label}]`
  }, [timeOfDay])

  const formattedBiome = BIOME_NAMES[biome] || 'Desert Canyon'
  const formattedVehicle = VEHICLE_NAMES[vehicleModel] || 'BMW M3 GTR'
  const formattedWeather = weather ? weather.toUpperCase() : 'CLEAR'

  const handleRetry = () => {
    retry()
    regenerateWorld()
  }

  const handleReload = () => {
    window.location.reload()
  }

  if (!isVisible) return null

  const isErrorStage = stage === 'ERROR'

  return (
    <div
      className={`fixed inset-0 z-40 bg-[#07090e] text-white flex flex-col justify-between p-5 sm:p-8 select-none overflow-hidden ${opacityClass}`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 30%, rgba(6, 182, 212, 0.07) 0%, rgba(16, 185, 129, 0.04) 40%, transparent 70%),
          linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 3.5rem 3.5rem, 3.5rem 3.5rem',
      }}
    >
      {/* Corner Instrumentation Marks */}
      <div className="absolute top-3 left-3 text-white/20 font-mono text-[9px] pointer-events-none">
        [ SYS.BOOT // CALM.01 ]
      </div>
      <div className="absolute top-3 right-3 text-white/20 font-mono text-[9px] pointer-events-none">
        [ TELEMETRY.SYNC ]
      </div>
      <div className="absolute bottom-3 left-3 text-white/20 font-mono text-[9px] pointer-events-none">
        [ 35.6895° N, 139.6917° E ]
      </div>
      <div className="absolute bottom-3 right-3 text-white/20 font-mono text-[9px] pointer-events-none">
        [ R3F.DIRECTX.FLIP ]
      </div>

      {/* ======================================================== */}
      {/* HEADER: BRANDING & ENGINE TELEMETRY                      */}
      {/* ======================================================== */}
      <header className="flex items-start justify-between relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black font-courier tracking-[0.25em] text-white uppercase drop-shadow-md">
              Calm Roads
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono font-bold tracking-widest text-emerald-400">
              PROD
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-mono tracking-[0.35em] text-emerald-400/90 uppercase mt-0.5 font-semibold">
            Endless Driving Experience
          </p>
        </div>

        {/* Engine Status Readout */}
        <div className="flex items-center gap-3 bg-[#0d121c]/80 border border-white/10 px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isErrorStage
                  ? 'bg-red-500 animate-ping'
                  : isReady
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]'
              }`}
            />
            <span className="text-[10px] font-mono tracking-wider text-slate-300 font-bold uppercase">
              {isErrorStage ? 'SYS: FAULT' : isReady ? 'SYS: ONLINE' : 'SYS: BOOT'}
            </span>
          </div>
          <div className="hidden sm:block w-[1px] h-3 bg-white/15" />
          <div className="hidden sm:block text-[9px] font-mono text-slate-400 tracking-wider">
            T+{elapsed}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* CENTERPIECE: AUTOMOTIVE CINEMATIC SILHOUETTE OR RECOVERY */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col items-center justify-center my-4 relative z-10">
        {isErrorStage ? (
          /* RECOVERY / ERROR PANEL */
          <div className="max-w-md w-full bg-[#130b0d]/90 border border-red-500/40 rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400 font-mono text-lg font-bold shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              !
            </div>
            <h2 id="recovery-heading" data-testid="recovery-title" className="text-sm sm:text-base font-courier font-bold text-red-400 tracking-widest uppercase mb-1">
              World Initialization Interrupted
            </h2>
            <p className="text-[11px] text-slate-300 font-mono mb-4 leading-relaxed">
              The driving environment could not be prepared.
            </p>

            <div className="w-full bg-[#090506] border border-red-950 rounded p-3 mb-6 text-left">
              <span className="text-[9px] font-mono font-bold tracking-wider text-red-400/80 uppercase block mb-1">
                Reason / Diagnostics:
              </span>
              <p className="text-[10px] text-red-200 font-mono break-words leading-normal">
                {errorMessage || 'WebGL context lost or initialization timed out.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                onClick={handleRetry}
                className="w-full sm:flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-mono font-bold text-[11px] tracking-wider rounded transition-all shadow-lg cursor-pointer"
              >
                RETRY INITIALIZATION
              </button>
              <button
                onClick={handleReload}
                className="w-full sm:flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono font-bold text-[11px] tracking-wider rounded transition-all cursor-pointer"
              >
                RELOAD EXPERIENCE
              </button>
            </div>
          </div>
        ) : (
          /* CINEMATIC AUTOMOTIVE VECTOR CENTERPIECE */
          <div className="w-full max-w-lg flex flex-col items-center justify-center relative">
            {/* Glowing Horizon Perspective Grid */}
            <div className="w-full h-36 relative overflow-hidden flex items-center justify-center">
              <svg
                viewBox="0 0 600 200"
                className="w-full h-full opacity-70"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  {/* Perspective Highway Convergence Gradient */}
                  <linearGradient id="roadGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                    <stop offset="60%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#07090e" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Headlight Beams Gradient */}
                  <linearGradient id="beamGradient" x1="50%" y1="100%" x2="50%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Car Monocoque Gradient */}
                  <linearGradient id="chassisGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="50%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                </defs>

                {/* Horizon Grid Lines */}
                <line x1="0" y1="110" x2="600" y2="110" stroke="#06b6d4" strokeWidth="0.8" strokeOpacity="0.4" />
                <line x1="50" y1="125" x2="550" y2="125" stroke="#10b981" strokeWidth="0.6" strokeOpacity="0.25" />
                <line x1="0" y1="150" x2="600" y2="150" stroke="#10b981" strokeWidth="0.6" strokeOpacity="0.15" />

                {/* Road Perspective Boundaries converging toward vanishing point (300, 110) */}
                <polygon points="300,110 160,200 440,200" fill="url(#roadGlow)" opacity="0.3" />
                <line x1="300" y1="110" x2="160" y2="200" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.7" />
                <line x1="300" y1="110" x2="440" y2="200" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.7" />

                {/* Highway Centerline with Animated Projection */}
                <line
                  x1="300"
                  y1="110"
                  x2="300"
                  y2="200"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  strokeOpacity="0.8"
                />

                {/* Dual Aerodynamic Headlight Beams */}
                <polygon points="275,128 200,80 230,80" fill="url(#beamGradient)" />
                <polygon points="325,128 370,80 400,80" fill="url(#beamGradient)" />

                {/* Precision GT Sports Coupe Silhouette */}
                {/* Wheels */}
                <ellipse cx="265" cy="142" rx="12" ry="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                <ellipse cx="335" cy="142" rx="12" ry="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />

                {/* Ground Underglow */}
                <ellipse cx="300" cy="142" rx="48" ry="4" fill="#06b6d4" opacity="0.4" filter="blur(2px)" />

                {/* Body Aerodynamics */}
                <path
                  d="M 252 136 C 255 125, 270 120, 285 119 L 315 119 C 330 120, 345 125, 348 136 L 352 140 C 352 142, 346 143, 340 143 L 260 143 C 254 143, 248 142, 248 140 Z"
                  fill="url(#chassisGrad)"
                  stroke="#64748b"
                  strokeWidth="1"
                />

                {/* Cabin Greenhouse & Rear Wing */}
                <path
                  d="M 272 121 L 280 114 L 320 114 L 328 121 Z"
                  fill="#090d16"
                  stroke="#38bdf8"
                  strokeWidth="0.8"
                />
                {/* GT Aerofoil Wing */}
                <line x1="250" y1="126" x2="350" y2="126" stroke="#e2e8f0" strokeWidth="1.8" />
                <line x1="262" y1="126" x2="265" y2="133" stroke="#64748b" strokeWidth="1.2" />
                <line x1="338" y1="126" x2="335" y2="133" stroke="#64748b" strokeWidth="1.2" />

                {/* Active LED Taillight Strip */}
                <line x1="258" y1="134" x2="342" y2="134" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.9" />
                <circle cx="260" cy="134" r="1.5" fill="#fca5a5" />
                <circle cx="340" cy="134" r="1.5" fill="#fca5a5" />
              </svg>
            </div>

            {/* Subtle Vehicle Label */}
            <div className="mt-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-[10px] font-mono tracking-widest text-slate-300 font-semibold uppercase">
                {formattedVehicle} // GT SPEC
              </span>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* LOWER SECTION: PROGRESS, TELEMETRY & DRIVING TIPS        */}
      {/* ======================================================== */}
      <footer className="w-full max-w-4xl mx-auto flex flex-col gap-4 relative z-10">
        {/* Environment Specification Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
          <div className="bg-[#0b0f17]/90 border border-white/10 rounded-lg px-2.5 py-1.5 flex flex-col">
            <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
              Destination
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-200 truncate mt-0.5">
              {formattedBiome}
            </span>
          </div>

          <div className="bg-[#0b0f17]/90 border border-white/10 rounded-lg px-2.5 py-1.5 flex flex-col">
            <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
              Vehicle
            </span>
            <span className="text-[10px] font-mono font-bold text-cyan-400 truncate mt-0.5">
              {formattedVehicle}
            </span>
          </div>

          <div className="bg-[#0b0f17]/90 border border-white/10 rounded-lg px-2.5 py-1.5 flex flex-col">
            <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
              Weather
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-200 truncate mt-0.5">
              {formattedWeather}
            </span>
          </div>

          <div className="bg-[#0b0f17]/90 border border-white/10 rounded-lg px-2.5 py-1.5 flex flex-col">
            <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
              Celestial Time
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-400 truncate mt-0.5">
              {formattedTime}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-[#0b0f17]/90 border border-white/10 rounded-lg px-2.5 py-1.5 flex flex-col">
            <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
              Transmission
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 truncate mt-0.5">
              {transmissionMode === 'manual' ? 'MANUAL 6-SPD' : 'SEQUENTIAL DUAL'}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* REFINED PROGRESS BAR & STAGE READOUT                    */}
        {/* ======================================================== */}
        <div className="w-full flex flex-col gap-2">
          {/* Milestone Step Pips (01 through 08) */}
          <div className="hidden sm:flex items-center justify-between px-1">
            {STAGE_PIPS.map((pip, idx) => {
              const pipProgressThreshold = (idx + 1) * 12.5
              const isPast = progress >= pipProgressThreshold
              const isCurrent =
                progress >= pipProgressThreshold - 12.5 && progress < pipProgressThreshold

              return (
                <div key={pip.id} className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isPast
                        ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                        : isCurrent
                        ? 'bg-cyan-400 animate-ping shadow-[0_0_6px_#22d3ee]'
                        : 'bg-white/20'
                    }`}
                  />
                  <span
                    className={`text-[9px] font-mono font-bold tracking-wider ${
                      isPast
                        ? 'text-emerald-400'
                        : isCurrent
                        ? 'text-cyan-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {pip.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Master Progress Bar */}
          <div className="w-full h-2 sm:h-2.5 rounded-full bg-white/5 border border-white/10 p-[2px] overflow-hidden shadow-inner relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-emerald-300 transition-all duration-300 ease-out relative shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            >
              {/* Dynamic Leading Edge Pulse Pip */}
              <div className="absolute right-0 top-0 bottom-0 w-2 rounded-full bg-white animate-pulse" />
            </div>
          </div>

          {/* Stage Status & Percentage Row */}
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 truncate">
              <span className="text-[11px] font-bold tracking-wider text-slate-100 uppercase">
                {statusMessage}
              </span>
              <span className="hidden sm:inline text-slate-600 font-light">•</span>
              <span className="text-[10px] text-slate-400 truncate">
                {subMessage}
              </span>
            </div>
            <div className="text-right ml-4 shrink-0 font-bold tracking-wider text-emerald-400 font-mono text-sm sm:text-base">
              {progress}%
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DRIVING TIPS CAROUSEL                                   */}
        {/* ======================================================== */}
        <div className="bg-[#0b0f17]/70 border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between gap-3 text-slate-400">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <span className="text-[9px] font-mono font-bold text-amber-400/90 tracking-widest shrink-0 uppercase">
              DRIVE TIP:
            </span>
            <p
              className={`text-[10px] font-mono text-slate-300 truncate transition-opacity duration-300 ${
                tipFade ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {DRIVING_TIPS[tipIndex]}
            </p>
          </div>
          <span className="text-[9px] font-mono text-slate-600 shrink-0">
            {tipIndex + 1}/{DRIVING_TIPS.length}
          </span>
        </div>

        {/* Bottom Sub-Footer */}
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1">
          <span>CALM ROADS — DRIVE WITHOUT LIMITS</span>
          <span>CALM ENGINE v2.4.0 • HIGH-PERFORMANCE R3F PIPELINE</span>
        </div>
      </footer>
    </div>
  )
}
