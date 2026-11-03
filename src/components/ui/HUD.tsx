import { memo, useState, useEffect, useRef } from 'react'
import { useGameStore, useTelemetryStore } from '../../store/useGameStore'
import { BIOMES } from '../../utils/roadMath'

// ------------------------------------------------------------------------
// NFS MOST WANTED (2005) MECHANICAL ROLLING ODOMETER
// Individual Vertical Reels, Smooth Mechanical Carry, 3D Drum Curvature
// ------------------------------------------------------------------------
const DRUM_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

interface RollingOdometerProps {
  unit: 'kmh' | 'mph'
}

/**
 * Need for Speed: Most Wanted (2005) Mechanical Rolling Odometer
 * Features:
 * - 5 Whole Digit Drums (White on Charcoal) + 2 Fractional Drums (NFS Amber)
 * - Stationary Beveled Decimal Separator
 * - True Mechanical Gear-Train Continuous Carry Physics
 * - Zero React Re-Renders (Direct DOM Subscriptions via rAF)
 */
const RollingOdometer = memo(function RollingOdometer({ unit }: RollingOdometerProps) {
  const drumRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    let animId: number
    let prevDist = -1

    const updateDrums = () => {
      const dist = useTelemetryStore.getState().distance
      if (dist !== prevDist) {
        prevDist = dist
        const isMph = unit === 'mph'
        // Centi-distance (1 unit = 0.01 km = 10m)
        const val = Math.max(0, (isMph ? dist * 0.621371 : dist) * 100)

        // Drum 6 (hundredths fraction): rolls continuously as distance increases
        const pos6 = val % 10
        // Mechanical carry engagement zone: as Drum 6 goes from 9.0 to 10.0
        const carry6 = Math.max(0, Math.min(1, (pos6 - 9.0) / 1.0))

        // Drum 5 (tenths fraction)
        const d5 = Math.floor(val / 10) % 10
        const pos5 = (d5 + carry6) % 10
        const carry5 = d5 === 9 ? carry6 : 0

        // Drum 4 (ones)
        const d4 = Math.floor(val / 100) % 10
        const pos4 = (d4 + carry5) % 10
        const carry4 = d4 === 9 ? carry5 : 0

        // Drum 3 (tens)
        const d3 = Math.floor(val / 1000) % 10
        const pos3 = (d3 + carry4) % 10
        const carry3 = d3 === 9 ? carry4 : 0

        // Drum 2 (hundreds)
        const d2 = Math.floor(val / 10000) % 10
        const pos2 = (d2 + carry3) % 10
        const carry2 = d2 === 9 ? carry3 : 0

        // Drum 1 (thousands)
        const d1 = Math.floor(val / 100000) % 10
        const pos1 = (d1 + carry2) % 10
        const carry1 = d1 === 9 ? carry2 : 0

        // Drum 0 (ten-thousands)
        const d0 = Math.floor(val / 1000000) % 10
        const pos0 = (d0 + carry1) % 10

        const positions = [pos0, pos1, pos2, pos3, pos4, pos5, pos6]
        for (let i = 0; i < 7; i++) {
          const el = drumRefs.current[i]
          if (el) {
            el.style.transform = `translate3d(0, -${(positions[i] * 22).toFixed(2)}px, 0)`
          }
        }
      }
      animId = requestAnimationFrame(updateDrums)
    }

    animId = requestAnimationFrame(updateDrums)
    return () => cancelAnimationFrame(animId)
  }, [unit])

  const isMph = unit === 'mph'

  return (
    <div className="flex flex-col items-end gap-1">
      {/* Header with NFS Most Wanted ODO Label & Status Accent */}
      <div className="flex items-center justify-between w-full px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF9D1E] shadow-[0_0_8px_#FF9D1E]" />
          <span className="text-[8px] font-special-elite text-[#FF9D1E] font-bold tracking-widest uppercase">
            ODO
          </span>
        </div>
        <span className="text-[8px] font-special-elite text-[#8EA48C] font-bold tracking-widest uppercase">
          {isMph ? 'MILES' : 'KM'}
        </span>
      </div>

      {/* Recessed Mechanical Instrument Bezel */}
      <div className="flex items-center gap-[1.5px] p-[2.5px] bg-[#07080a] border border-[#2b2f38] rounded-[3px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.95),0_2px_4px_rgba(0,0,0,0.6)]">
        {/* 5 Whole Number Drums (White on Charcoal) */}
        {[0, 1, 2, 3, 4].map((idx) => (
          <div
            key={`int-${idx}`}
            className="relative inline-block w-[15px] h-[22px] overflow-hidden select-none rounded-[2px] border bg-[#0c0e12] border-[#222630] shadow-[inset_0_2px_4px_rgba(0,0,0,0.95)]"
            style={{ perspective: '120px' }}
          >
            {/* 3D Convex Drum Curvature Shadow Overlays */}
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/95 via-transparent to-black/95" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/[0.07] z-10" />

            {/* Vertical Rolling Digit Strip */}
            <div
              ref={(el) => (drumRefs.current[idx] = el)}
              className="flex flex-col items-center will-change-transform"
              style={{ transform: 'translate3d(0, 0px, 0)' }}
            >
              {DRUM_DIGITS.map((d, dIdx) => (
                <span
                  key={dIdx}
                  className="h-[22px] w-full flex items-center justify-center font-courier font-black text-[12px] leading-none text-[#FDFBF7]"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* Stationary Beveled Decimal Separator Dot Window */}
        <div className="relative flex items-center justify-center w-[7px] h-[22px] bg-[#0a0c0e] border border-[#222630] rounded-[1px] select-none">
          <span className="w-1 h-1 rounded-full bg-[#FF9D1E] shadow-[0_0_6px_#FF9D1E]" />
        </div>

        {/* 2 Decimal Fractional Drums in NFS Amber */}
        {[5, 6].map((idx) => (
          <div
            key={`frac-${idx}`}
            className="relative inline-block w-[15px] h-[22px] overflow-hidden select-none rounded-[2px] border bg-[#161007] border-[#FF9D1E]/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.95)]"
            style={{ perspective: '120px' }}
          >
            {/* 3D Convex Drum Curvature Shadow Overlays */}
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/95 via-transparent to-black/95" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/[0.07] z-10" />

            {/* Vertical Rolling Digit Strip */}
            <div
              ref={(el) => (drumRefs.current[idx] = el)}
              className="flex flex-col items-center will-change-transform"
              style={{ transform: 'translate3d(0, 0px, 0)' }}
            >
              {DRUM_DIGITS.map((d, dIdx) => (
                <span
                  key={dIdx}
                  className="h-[22px] w-full flex items-center justify-center font-courier font-black text-[12px] leading-none text-[#FF9D1E]"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

// ------------------------------------------------------------------------
// 24-Segment LED Tachometer with Brick Red Redline & Rev Limiter
// ------------------------------------------------------------------------
const TOTAL_RPM_SEGMENTS = 24
const TachometerGauge = memo(function TachometerGauge({ rpm }: { rpm: number }) {
  const maxRpm = 8500
  const normalizedRpm = Math.min(1.0, Math.max(0, rpm / maxRpm))
  const activeSegments = Math.round(normalizedRpm * TOTAL_RPM_SEGMENTS)
  const isRedline = rpm > 7200

  return (
    <div className="w-full flex flex-col gap-1">
      {/* Precision Segmented LED Bar */}
      <div className="flex items-center gap-[2.5px] w-full h-3 bg-[#1e1e1e]/90 p-1 rounded-sm border border-[#FDFBF7]/15 shadow-inner">
        {Array.from({ length: TOTAL_RPM_SEGMENTS }).map((_, i) => {
          const isActive = i < activeSegments
          // 0-14 (Normal Range): Sage Green #8EA48C / Paper Cream #FDFBF7
          // 15-19 (Mid/Warning Range): Warm Amber #FF9D32
          // 20-23 (Redline Alert): Brick Red #C63D2F
          const isWarning = i >= 15 && i < 20
          const isCritical = i >= 20

          let colorClass = 'bg-[#FDFBF7]/10'
          if (isActive) {
            if (isCritical) {
              colorClass = 'bg-[#C63D2F] shadow-[0_0_6px_#C63D2F]'
            } else if (isWarning) {
              colorClass = 'bg-[#FF9D32] shadow-[0_0_5px_#FF9D32]'
            } else {
              colorClass = 'bg-[#8EA48C] shadow-[0_0_4px_#8EA48C]'
            }
          }

          return (
            <div
              key={i}
              className={`h-full flex-1 rounded-[1px] transform -skew-x-12 transition-colors duration-75 ${colorClass}`}
            />
          )
        })}
      </div>

      {/* Tachometer Header Readout */}
      <div className="flex justify-between items-center text-[9px] font-special-elite tracking-wider px-0.5">
        <span className="text-[#FDFBF7]/50">0</span>
        <span className={isRedline ? 'text-[#C63D2F] font-bold animate-pulse' : 'text-[#FDFBF7]'}>
          {isRedline ? '• SHIFT •' : `${Math.round(rpm).toLocaleString()} RPM`}
        </span>
        <span className={isRedline ? 'text-[#C63D2F] font-bold' : 'text-[#FDFBF7]/50'}>8.5k</span>
      </div>
    </div>
  )
})

// ------------------------------------------------------------------------
// Branded Analog-Engineer Driving HUD Dashboard
// Decoupled Telemetry: Zero React Three Fiber Canvas Re-renders
// ------------------------------------------------------------------------
export default function HUD() {
  // DOM References for Direct Zero-React Telemetry Mutation
  const speedDisplayRef = useRef<HTMLSpanElement>(null)
  const gearDisplayRef = useRef<HTMLSpanElement>(null)
  const brakeBarRef = useRef<HTMLDivElement>(null)
  const throttleBarRef = useRef<HTMLDivElement>(null)

  // State for components requiring layout animation (Tachometer & Burnout)
  const [rpm, setRpm] = useState(0)
  const [isBurnout, setIsBurnout] = useState(false)
  const [shiftFlash, setShiftFlash] = useState(false)

  // Game Settings & State
  const transmissionMode = useGameStore((s) => s.transmissionMode)
  const speedUnit = useGameStore((s) => s.speedUnit)
  const toggleSpeedUnit = useGameStore((s) => s.toggleSpeedUnit)
  const isHoverMode = useGameStore((s) => s.isHoverMode)
  const currentResolvedBiome = useGameStore((s) => s.currentResolvedBiome)

  // High-Frequency Direct Telemetry Subscription (Bypasses React reconciliation)
  useEffect(() => {
    let lastDispSpeed = -1
    let lastGear = ''
    let lastRpm = -1
    let lastBurnout = false

    const unsub = useTelemetryStore.subscribe((state) => {
      // 1. Direct Speedometer DOM mutation
      const unit = useGameStore.getState().speedUnit
      const dispSpeed = unit === 'mph' ? Math.round(state.speed * 0.621371) : Math.round(state.speed)
      if (dispSpeed !== lastDispSpeed && speedDisplayRef.current) {
        lastDispSpeed = dispSpeed
        speedDisplayRef.current.textContent = dispSpeed.toString()
        const isHigh = dispSpeed > (unit === 'mph' ? 120 : 190)
        if (isHigh) {
          speedDisplayRef.current.classList.add('text-[#C63D2F]')
          speedDisplayRef.current.classList.remove('text-[#FDFBF7]')
        } else {
          speedDisplayRef.current.classList.add('text-[#FDFBF7]')
          speedDisplayRef.current.classList.remove('text-[#C63D2F]')
        }
      }

      // 2. Direct Gear DOM mutation & Shift Flash
      if (state.gear !== lastGear && gearDisplayRef.current) {
        lastGear = state.gear
        gearDisplayRef.current.textContent = isHoverMode ? 'H' : state.gear
        setShiftFlash(true)
        setTimeout(() => setShiftFlash(false), 160)
      }

      // 3. Direct Throttle & Brake DOM Bar height updates
      if (brakeBarRef.current) {
        brakeBarRef.current.style.height = `${Math.round(state.brake * 100)}%`
      }
      if (throttleBarRef.current) {
        throttleBarRef.current.style.height = `${Math.round(state.throttle * 100)}%`
      }

      // 4. Burnout badge state
      const burnoutActive = !!state.isBurnout
      if (burnoutActive !== lastBurnout) {
        lastBurnout = burnoutActive
        setIsBurnout(burnoutActive)
      }

      // 5. Throttled Tachometer update (every 40 RPM change)
      if (Math.abs(state.rpm - lastRpm) > 40) {
        lastRpm = state.rpm
        setRpm(state.rpm)
      }
    })

    return () => unsub()
  }, [isHoverMode])

  const biomeConfig = BIOMES[currentResolvedBiome] || BIOMES.forest
  const unitLabel = speedUnit === 'mph' ? 'MPH' : 'KM/H'

  return (
    <div className="fixed bottom-6 right-6 pointer-events-auto select-none z-20 flex flex-col items-end gap-2">
      {/* ========================================================= */}
      {/* BRANDED ANALOG-ENGINEER DASHBOARD CLUSTER                 */}
      {/* Soft Charcoal (#2A2A2A) with blur(10px) & Paper Cream     */}
      {/* ========================================================= */}
      <div
        className="relative backdrop-blur-[10px] bg-[rgba(42,42,42,0.70)] border border-[#FDFBF7]/15 rounded-lg p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(253,251,247,0.15)] flex items-stretch gap-4 transform -skew-x-6 transition-all duration-200 hover:border-[#8EA48C]/50"
        style={{
          boxShadow: '0 20px 50px rgba(0,0,0,0.85), inset 0 1px 1px rgba(253,251,247,0.15)',
        }}
      >
        {/* Top Paper Cream Subtle Bevel Accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FDFBF7]/40 to-transparent" />

        {/* ========================================================= */}
        {/* SECTION 1: SLANTED GEAR BOX & BIOME BADGE                 */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-center pr-3 border-r border-[#FDFBF7]/15 min-w-[72px]">
          <span className="text-[8.5px] font-special-elite tracking-widest text-[#FDFBF7]/60 font-bold uppercase">
            {isHoverMode ? 'REPULSOR' : 'GEAR'}
          </span>

          {/* Angular Slanted Gear Frame with Shift Flash */}
          <div
            className={`my-1 w-12 h-14 rounded-md flex items-center justify-center border transition-all duration-150 transform -skew-x-6 ${
              shiftFlash
                ? 'bg-[#C63D2F] border-white text-[#FDFBF7] shadow-[0_0_16px_#C63D2F]'
                : isHoverMode
                ? 'bg-[#8EA48C]/20 border-[#8EA48C] text-[#8EA48C]'
                : 'bg-[#1e1e1e] border-[#FDFBF7]/20 text-[#FDFBF7] shadow-inner'
            }`}
          >
            <span
              ref={gearDisplayRef}
              className={`text-4xl font-black font-courier leading-none drop-shadow-md ${
                shiftFlash ? 'text-[#FDFBF7]' : isHoverMode ? 'text-[#8EA48C]' : 'text-[#FDFBF7]'
              }`}
            >
              {isHoverMode ? 'H' : '1'}
            </span>
          </div>

          <span className="text-[8px] font-special-elite text-[#8EA48C] font-bold tracking-wider uppercase bg-[#8EA48C]/15 px-1.5 py-0.5 rounded-xs border border-[#8EA48C]/30">
            {transmissionMode.toUpperCase()}
          </span>

          {/* Sage Green Biome Badge & Burnout Alert */}
          <div className="flex flex-col items-center gap-1 mt-2 w-full">
            {isBurnout && (
              <span className="text-[7.5px] font-special-elite font-bold px-1.5 py-0.5 rounded-xs bg-[#C63D2F] text-white border border-red-400 animate-pulse tracking-wider shadow-[0_0_8px_#C63D2F]">
                BURNOUT
              </span>
            )}
            <div
              className="text-[8.5px] font-special-elite font-bold px-1.5 py-0.5 rounded-xs bg-[#8EA48C]/20 text-[#8EA48C] border border-[#8EA48C]/40 tracking-wider uppercase truncate max-w-[85px] text-center"
              title={biomeConfig.name}
            >
              {biomeConfig.name.split(' ')[0]}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: COURIER PRIME SPEEDOMETER & 24-LED TACHOMETER */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-center px-2 min-w-[145px]">
          {/* Main Large Speed Readout in Courier Prime */}
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span
                ref={speedDisplayRef}
                className="text-5xl sm:text-6xl font-black italic tracking-tighter font-courier leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] text-[#FDFBF7]"
              >
                0
              </span>
            </div>

            {/* Speed Unit Toggle Button */}
            <button
              onClick={toggleSpeedUnit}
              className="group flex items-center gap-1 text-[8.5px] font-special-elite font-bold tracking-widest text-[#FDFBF7]/60 hover:text-[#8EA48C] transition-colors uppercase mt-1 cursor-pointer py-0.5 px-2 rounded-xs bg-[#1e1e1e] border border-[#FDFBF7]/20 hover:border-[#8EA48C]"
              title="Click to toggle KM/H or MPH"
            >
              <span>{unitLabel}</span>
              <span className="text-[7px] text-[#8EA48C] opacity-75 group-hover:opacity-100">⇄</span>
            </button>
          </div>

          {/* Segmented Tachometer Gauge */}
          <div className="w-full mt-2.5">
            <TachometerGauge rpm={rpm} />
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 3: NFS MOST WANTED MECHANICAL ODOMETER & PEDALS   */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-end pl-3 border-l border-[#FDFBF7]/15 min-w-[125px]">
          {/* NFS Most Wanted Rolling Mechanical Odometer */}
          <div className="flex flex-col items-end">
            <RollingOdometer unit={speedUnit} />
          </div>

          {/* Throttle & Brake Peak-Meter Bars */}
          <div className="flex items-end gap-2.5 h-8 mt-2">
            {/* Brake Input Meter in Brick Red #C63D2F */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[7px] font-special-elite text-[#C63D2F] font-bold">BRK</span>
              <div
                className="w-2 h-7 bg-[#1e1e1e] rounded-[1px] overflow-hidden flex flex-col justify-end p-[1px] border border-[#FDFBF7]/20"
                title="Brake Telemetry"
              >
                <div
                  ref={brakeBarRef}
                  className="w-full bg-[#C63D2F] transition-all duration-75 rounded-[1px] shadow-[0_0_6px_#C63D2F]"
                  style={{ height: '0%' }}
                />
              </div>
            </div>

            {/* Throttle Input Meter in Sage Green #8EA48C */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[7px] font-special-elite text-[#8EA48C] font-bold">THR</span>
              <div
                className="w-2 h-7 bg-[#1e1e1e] rounded-[1px] overflow-hidden flex flex-col justify-end p-[1px] border border-[#FDFBF7]/20"
                title="Throttle Telemetry"
              >
                <div
                  ref={throttleBarRef}
                  className="w-full bg-[#8EA48C] transition-all duration-75 rounded-[1px] shadow-[0_0_6px_#8EA48C]"
                  style={{ height: '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
