import { useState, useEffect, useLayoutEffect } from 'react'
import { useLoadingStore, LoadingTaskId, LoadingTaskStatus } from '../../store/useLoadingStore'
import { useGameStore } from '../../store/useGameStore'

const TAGLINES = [
  'Preparing your next escape.',
  'Open highways, endless horizons.',
  'Calibrating suspension & atmospheric optics.',
  'Tracing alpine passes & coastal bluffs.',
]

const LOADING_TIPS = [
  { key: 'M / SHIFT', text: 'Switch between Auto and 6-Speed Manual transmission at any time.' },
  { key: 'L / J', text: 'Toggle dual-beam headlights [L] and high-beam projectors [J] on mountain passes.' },
  { key: 'C', text: 'Cycle Chase, Close Chase, Cockpit, Drone, Bumper, and Cinematic Director cameras.' },
  { key: 'H', text: 'Engage Antigravity Repulsor Mode [H] to hover above bridges and canyon ridges.' },
  { key: 'P / TAB', text: 'Open Photo Studio [P] or customize weather, time of day, and paint in Master Console [Tab].' },
]

const CRITICAL_TASK_ORDER: LoadingTaskId[] = [
  'renderer',
  'vehicle',
  'terrain',
  'road',
  'environment',
  'shaders',
  'validation',
]

function StatusBadge({ status }: { status: LoadingTaskStatus }) {
  if (status === 'complete') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
        COMPLETE
      </span>
    )
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-[#FF9D1E]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9D1E] animate-ping" />
        ACTIVE
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-[#ef4444]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
        FAILED
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-white/35">
      <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
      WAITING
    </span>
  )
}

export default function LoadingScreen() {
  const stage = useLoadingStore((s) => s.stage)
  const progress = useLoadingStore((s) => s.progress)
  const statusMessage = useLoadingStore((s) => s.statusMessage)
  const subMessage = useLoadingStore((s) => s.subMessage)
  const errorMessage = useLoadingStore((s) => s.errorMessage)
  const canFallbackVehicle = useLoadingStore((s) => s.canFallbackVehicle)
  const isReady = useLoadingStore((s) => s.isReady)
  const tasks = useLoadingStore((s) => s.tasks)
  const retry = useLoadingStore((s) => s.retry)
  const recordLoadingScreenMounted = useLoadingStore((s) => s.recordLoadingScreenMounted)

  const vehicleModel = useGameStore((s) => s.vehicleModel)
  const biome = useGameStore((s) => s.biome)
  const graphicsQuality = useGameStore((s) => s.graphicsQuality)
  const worldSeed = useGameStore((s) => s.worldSeed)

  const [exiting, setExiting] = useState(false)
  const [unmounted, setUnmounted] = useState(false)
  const [taglineIdx, setTaglineIdx] = useState(0)
  const [tipIdx, setTipIdx] = useState(0)

  // Record exact millisecond the loading screen became visible to the user
  useLayoutEffect(() => {
    recordLoadingScreenMounted()
  }, [recordLoadingScreenMounted])

  // Rotate tagline and tip slowly while loading
  useEffect(() => {
    if (isReady) return
    const taglineTimer = setInterval(() => {
      setTaglineIdx((i) => (i + 1) % TAGLINES.length)
    }, 3600)
    const tipTimer = setInterval(() => {
      setTipIdx((i) => (i + 1) % LOADING_TIPS.length)
    }, 4500)
    return () => {
      clearInterval(taglineTimer)
      clearInterval(tipTimer)
    }
  }, [isReady])

  // Smooth cinematic transition once final scene validation passes
  useEffect(() => {
    if (isReady) {
      setUnmounted(false)
      // Brief 90ms hold so warmed compositor frame presents cleanly beneath the overlay
      const fadeTimer = setTimeout(() => setExiting(true), 90)
      const hideTimer = setTimeout(() => setUnmounted(true), 780)
      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(hideTimer)
      }
    } else {
      setExiting(false)
      setUnmounted(false)
    }
  }, [isReady])

  if (unmounted) return null

  const isError = stage === 'ERROR'
  const activeTip = LOADING_TIPS[tipIdx]

  const vehicleLabelMap: Record<string, string> = {
    bmw_m3: "BMW M3 GTR '05",
    supercar: 'Veloce GT Supercar',
    modern_supercar: 'V12 Hypercar',
    hovercraft: 'AeroGlide Repulsor',
    camper: 'Classic Camper Van',
    hatchback: 'Rallye Group B',
    vintage_hatch: 'Vintage Hot Hatch',
  }

  return (
    <div
      data-testid="cinematic-loading-screen"
      className={`fixed inset-0 z-50 flex flex-col justify-between bg-[#05070b] text-[#FDFBF7] select-none overflow-hidden transition-opacity duration-700 ease-out ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      {/* Subtle Layered Atmospheric Backdrop (Pure CSS, Zero Canvas Overhead) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 42%, rgba(255, 157, 30, 0.08) 0%, rgba(17, 25, 40, 0.55) 48%, rgba(5, 7, 11, 0.98) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.14) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Subtle Horizon Hairline Light Sweep */}
      <div className="pointer-events-none absolute inset-x-0 top-[42%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent overflow-hidden">
        <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-[#FF9D1E]/70 to-transparent cr-horizon-sweep" />
      </div>

      {/* Top Session Metadata Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#FF9D1E] shadow-[0_0_12px_#FF9D1E] animate-pulse" />
          <span className="text-[10px] font-mono tracking-[0.26em] text-white/55 uppercase">
            CALM ROADS • WORLD STREAM ENGINE
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-white/50">
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
            {vehicleLabelMap[vehicleModel] || vehicleModel}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 capitalize">
            {biome === 'dynamic' ? 'Dynamic Tour' : biome.replace(/_/g, ' ')}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 uppercase">
            {graphicsQuality} • {worldSeed}
          </span>
        </div>
      </header>

      {/* Centerpiece Cinematic Branding, Progress & Subsystem Pipeline */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 max-w-2xl mx-auto w-full">
        {/* Hero Brand Mark */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black tracking-[0.28em] text-[#FDFBF7] uppercase font-courier drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
            CALM ROADS
          </h1>
          <div className="mt-2.5 h-5 flex items-center justify-center">
            <p className="text-xs sm:text-sm tracking-[0.18em] text-[#FF9D1E]/85 font-special-elite transition-opacity duration-500">
              {TAGLINES[taglineIdx]}
            </p>
          </div>
        </div>

        {isError ? (
          /* Error & Recovery Card */
          <div className="w-full max-w-md rounded-2xl bg-[#160c0e]/90 border border-[#C63D2F]/60 p-6 shadow-2xl backdrop-blur-md text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C63D2F]/20 border border-[#C63D2F]/50 text-[#ff8a80] text-[10px] font-mono font-bold tracking-widest uppercase mb-3">
              STARTUP INTERRUPTED
            </div>
            <h2 className="text-base font-bold text-[#FDFBF7] font-courier uppercase tracking-wide mb-2">
              {statusMessage}
            </h2>
            <p className="text-xs text-white/75 font-mono leading-relaxed mb-5 break-words">
              {errorMessage || subMessage}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                onClick={() => retry(false)}
                className="px-5 py-2.5 text-xs font-bold font-mono tracking-wider text-white bg-[#C63D2F] hover:bg-[#dc4838] rounded-xl transition-all shadow-lg cursor-pointer active:scale-95"
              >
                RETRY INITIALIZATION
              </button>
              {canFallbackVehicle && (
                <button
                  onClick={() => retry(true)}
                  className="px-5 py-2.5 text-xs font-bold font-mono tracking-wider text-white/90 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  USE BACKUP CHASSIS
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Normal Staged Initialization Telemetry Panel */
          <div className="w-full space-y-5">
            {/* Active Stage & Weighted Percentage Header */}
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-[#FF9D1E]/10 border border-[#FF9D1E]/30 text-[10px] font-mono font-bold tracking-widest text-[#FF9D1E] uppercase mb-1.5">
                  STAGE: {stage.replace(/_/g, ' ')}
                </div>
                <h2 className="text-sm sm:text-base font-bold text-[#FDFBF7] font-courier tracking-wide truncate">
                  {statusMessage}
                </h2>
                <p className="text-[11px] text-white/55 font-mono truncate mt-0.5">{subMessage}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl sm:text-3xl font-black font-mono text-[#FF9D1E] tabular-nums">
                  {Math.round(progress)}
                  <span className="text-sm text-white/50">%</span>
                </span>
              </div>
            </div>

            {/* Beveled Racing Progress Track */}
            <div className="relative w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10 p-[2px] shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#d97706] via-[#FF9D1E] to-[#fbbf24] transition-all duration-200 ease-out shadow-[0_0_16px_rgba(255,157,30,0.65)]"
                style={{ width: `${Math.max(2, Math.round(progress))}%` }}
              />
            </div>

            {/* Honest Per-Task Readiness Matrix */}
            <div className="rounded-2xl bg-black/45 border border-white/10 backdrop-blur-md divide-y divide-white/5 overflow-hidden">
              {CRITICAL_TASK_ORDER.map((taskId) => {
                const t = tasks[taskId]
                const isActive = t.status === 'in_progress'
                return (
                  <div
                    key={taskId}
                    className={`flex items-center justify-between px-4 py-2 text-xs transition-colors ${
                      isActive ? 'bg-[#FF9D1E]/[0.06]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`font-medium tracking-wide ${
                          t.status === 'complete'
                            ? 'text-white/85'
                            : isActive
                              ? 'text-[#FDFBF7] font-semibold'
                              : t.status === 'failed'
                                ? 'text-red-400'
                                : 'text-white/40'
                        }`}
                      >
                        {t.label}
                      </span>
                      {t.detail && (
                        <span className="hidden sm:inline text-[10px] font-mono text-white/40 truncate">
                          — {t.detail}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {isActive && t.progress > 0 && t.progress < 100 && (
                        <span className="text-[10px] font-mono text-white/60 tabular-nums">
                          {t.progress}%
                        </span>
                      )}
                      {t.status === 'complete' && t.durationMs !== null && (
                        <span className="hidden md:inline text-[10px] font-mono text-white/30 tabular-nums">
                          {t.durationMs}ms
                        </span>
                      )}
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Driving Tip Footer */}
      <footer className="relative z-10 px-6 md:px-12 pb-6 pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 w-full sm:w-auto">
          <span className="px-2 py-0.5 rounded bg-[#FF9D1E]/15 border border-[#FF9D1E]/35 text-[10px] font-mono font-bold text-[#FF9D1E] shrink-0">
            {activeTip.key}
          </span>
          <span className="text-[11px] text-white/70 font-sans leading-snug">{activeTip.text}</span>
        </div>

        <span className="text-[10px] font-mono text-white/35 tracking-wider shrink-0">
          VERIFYING WORLD BEFORE ENTRY
        </span>
      </footer>
    </div>
  )
}
