import { memo, useEffect, useRef } from 'react'
import { useGameStore, useTelemetryStore } from '../../store/useGameStore'
import { BIOMES } from '../../utils/roadMath'

// ------------------------------------------------------------------------
// NEED FOR SPEED: MOST WANTED (2005) MECHANICAL ROLLING ODOMETER
// 7 Independent Cylindrical Drums with Continuous Mechanical Carry Physics
// ------------------------------------------------------------------------
const DRUM_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

interface RollingOdometerProps {
  unit: 'kmh' | 'mph'
}

/**
 * Mechanical Rolling Odometer:
 * - 5 Whole Digit Drums (Crisp Paper White on Charcoal)
 * - Stationary Amber Decimal Separator Dot
 * - 2 Decimal Fractional Drums (NFS Warm Amber on Burnt Carbon)
 * - Continuous Gear-Train Carry Physics (Drum 6 rolls, carrying Drum 5 when 9 -> 10, etc.)
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

        // Drum 6 (hundredths fraction): continuous rotation
        const pos6 = val % 10
        // Carry engagement zone: as Drum 6 goes from 9.0 to 10.0
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
    <div className="flex flex-col items-end gap-1 select-none">
      {/* Header with NFS ODO Label & Metric Badge */}
      <div className="flex items-center justify-between w-full px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF9D1E] shadow-[0_0_8px_#FF9D1E]" />
          <span className="text-[8px] font-racing font-bold tracking-widest text-[#FF9D1E] uppercase">
            ODO
          </span>
        </div>
        <span className="text-[8px] font-racing font-bold tracking-widest text-[#8EA48C] uppercase">
          {isMph ? 'MILES' : 'KM'}
        </span>
      </div>

      {/* Recessed Mechanical Instrument Bezel */}
      <div className="flex items-center gap-[1.5px] p-[3px] bg-[#080a0d] border border-[#1f242e] rounded-[3px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.95),0_2px_4px_rgba(0,0,0,0.7)]">
        {/* 5 Whole Number Drums (White on Charcoal) */}
        {[0, 1, 2, 3, 4].map((idx) => (
          <div
            key={`int-${idx}`}
            className="relative inline-block w-[15px] h-[22px] overflow-hidden select-none rounded-[2px] border bg-[#0e1117] border-[#222733] shadow-[inset_0_2px_4px_rgba(0,0,0,0.95)]"
            style={{ perspective: '120px' }}
          >
            {/* 3D Convex Drum Curvature Shadow Overlays */}
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/95 via-transparent to-black/95" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/[0.08] z-10" />

            {/* Vertical Rolling Digit Strip */}
            <div
              ref={(el) => { drumRefs.current[idx] = el }}
              className="flex flex-col items-center will-change-transform"
              style={{ transform: 'translate3d(0, 0px, 0)' }}
            >
              {DRUM_DIGITS.map((d, dIdx) => (
                <span
                  key={dIdx}
                  className="h-[22px] w-full flex items-center justify-center font-racing font-black text-[12px] leading-none text-[#FDFBF7]"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* Stationary Beveled Decimal Separator Dot Window */}
        <div className="relative flex items-center justify-center w-[7px] h-[22px] bg-[#0a0c10] border border-[#222733] rounded-[1px] select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF9D1E] shadow-[0_0_6px_#FF9D1E]" />
        </div>

        {/* 2 Decimal Fractional Drums in NFS Amber */}
        {[5, 6].map((idx) => (
          <div
            key={`frac-${idx}`}
            className="relative inline-block w-[15px] h-[22px] overflow-hidden select-none rounded-[2px] border bg-[#181108] border-[#FF9D1E]/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.95)]"
            style={{ perspective: '120px' }}
          >
            {/* 3D Convex Drum Curvature Shadow Overlays */}
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/95 via-transparent to-black/95" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/[0.08] z-10" />

            {/* Vertical Rolling Digit Strip */}
            <div
              ref={(el) => { drumRefs.current[idx] = el }}
              className="flex flex-col items-center will-change-transform"
              style={{ transform: 'translate3d(0, 0px, 0)' }}
            >
              {DRUM_DIGITS.map((d, dIdx) => (
                <span
                  key={dIdx}
                  className="h-[22px] w-full flex items-center justify-center font-racing font-black text-[12px] leading-none text-[#FF9D1E]"
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
// 32-SEGMENT PRECISION RACING TACHOMETER (ZERO REACT RE-RENDERS)
// Direct DOM-manipulated LED segments, vehicle redline detection, dynamic shift alerts
// ------------------------------------------------------------------------
const TOTAL_RPM_SEGMENTS = 32

const RacingTachometer = memo(function RacingTachometer() {
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([])
  const rpmTextRef = useRef<HTMLSpanElement>(null)
  const redlineWarnRef = useRef<HTMLSpanElement>(null)
  const maxRpmLabelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let lastRpm = -1
    let lastActiveCount = -1
    let lastRedlineState = false
    let lastMaxRpm = 8500

    const unsub = useTelemetryStore.subscribe((state) => {
      const curRpm = Math.max(0, state.rpm || 0)
      const maxRpm = state.maxRpm || 8500
      const redlineRpm = state.redlineRpm || Math.round(maxRpm * 0.90)

      if (maxRpm !== lastMaxRpm && maxRpmLabelRef.current) {
        lastMaxRpm = maxRpm
        maxRpmLabelRef.current.textContent = `${(maxRpm / 1000).toFixed(1)}k`
      }

      // Check RPM delta threshold before updating DOM to minimize layout costs
      if (Math.abs(curRpm - lastRpm) >= 20 || curRpm === 0) {
        lastRpm = curRpm

        const normalized = Math.min(1.0, Math.max(0, curRpm / maxRpm))
        const activeCount = Math.round(normalized * TOTAL_RPM_SEGMENTS)
        const isRedline = curRpm >= redlineRpm

        // Update 32 Segment LEDs
        if (activeCount !== lastActiveCount) {
          lastActiveCount = activeCount
          for (let i = 0; i < TOTAL_RPM_SEGMENTS; i++) {
            const el = segmentRefs.current[i]
            if (!el) continue

            const isActive = i < activeCount
            if (!isActive) {
              el.className = 'h-full flex-1 rounded-[1px] transform -skew-x-12 transition-all duration-75 bg-[#171a22]/80 border border-white/[0.03]'
              el.style.boxShadow = 'none'
            } else {
              // Color scale across 32 segments:
              // 0-19 (~62%): Sage Green / Crisp White
              // 20-25 (~81%): Warm Amber #FF9D1E
              // 26-31 (82-100%): Brick Red #C63D2F
              if (i >= 26) {
                el.className = 'h-full flex-1 rounded-[1px] transform -skew-x-12 transition-all duration-75 bg-[#C63D2F] border border-[#ff6b5c]'
                el.style.boxShadow = '0 0 8px #C63D2F'
              } else if (i >= 20) {
                el.className = 'h-full flex-1 rounded-[1px] transform -skew-x-12 transition-all duration-75 bg-[#FF9D1E] border border-[#ffc266]'
                el.style.boxShadow = '0 0 6px #FF9D1E'
              } else {
                el.className = 'h-full flex-1 rounded-[1px] transform -skew-x-12 transition-all duration-75 bg-[#8EA48C] border border-[#b2c9b0]'
                el.style.boxShadow = '0 0 4px #8EA48C'
              }
            }
          }
        }

        // Update RPM Numeric Readout
        if (rpmTextRef.current) {
          rpmTextRef.current.textContent = `${Math.round(curRpm).toLocaleString()} RPM`
        }

        // Update Redline / Shift Warning State
        if (isRedline !== lastRedlineState) {
          lastRedlineState = isRedline
          if (redlineWarnRef.current) {
            if (isRedline) {
              redlineWarnRef.current.textContent = '⚡ SHIFT ⚡'
              redlineWarnRef.current.className = 'text-[#C63D2F] font-racing font-bold tracking-widest text-[9.5px] animate-pulse drop-shadow-[0_0_8px_#C63D2F]'
            } else {
              redlineWarnRef.current.textContent = ''
              redlineWarnRef.current.className = ''
            }
          }
        }
      }
    })

    return () => unsub()
  }, [])

  return (
    <div className="w-full flex flex-col gap-1 select-none">
      {/* 32-Segment Precision Angled LED Arc Bar */}
      <div className="flex items-center gap-[2px] w-full h-3.5 bg-[#090b0f] p-1 rounded-sm border border-[#222836] shadow-[inset_0_2px_5px_rgba(0,0,0,0.9)]">
        {Array.from({ length: TOTAL_RPM_SEGMENTS }).map((_, i) => (
          <div
            key={i}
            ref={(el) => { segmentRefs.current[i] = el }}
            className="h-full flex-1 rounded-[1px] transform -skew-x-12 transition-all duration-75 bg-[#171a22]/80 border border-white/[0.03]"
          />
        ))}
      </div>

      {/* Tachometer Header Readout */}
      <div className="flex justify-between items-center text-[9px] font-racing tracking-wider px-0.5">
        <span className="text-[#FDFBF7]/40 font-bold">0</span>
        <div className="flex items-center gap-2">
          <span ref={redlineWarnRef} />
          <span ref={rpmTextRef} className="text-[#FDFBF7] font-bold">
            0 RPM
          </span>
        </div>
        <span ref={maxRpmLabelRef} className="text-[#FDFBF7]/50 font-bold">
          8.5k
        </span>
      </div>
    </div>
  )
})

// ------------------------------------------------------------------------
// NEXT-GENERATION RACING SPEEDOMETER & TELEMETRY CLUSTER
// Completely Decoupled Direct DOM Mutations (Zero React Re-Renders)
// ------------------------------------------------------------------------
export default function HUD() {
  // Direct DOM references for zero-rerender updates
  const speedDisplayRef = useRef<HTMLSpanElement>(null)
  const gearDisplayRef = useRef<HTMLSpanElement>(null)
  const gearBoxRef = useRef<HTMLDivElement>(null)
  const brakeBarRef = useRef<HTMLDivElement>(null)
  const throttleBarRef = useRef<HTMLDivElement>(null)
  const burnoutBadgeRef = useRef<HTMLDivElement>(null)

  // Stable Game Store Subscriptions
  const transmissionMode = useGameStore((s) => s.transmissionMode)
  const speedUnit = useGameStore((s) => s.speedUnit)
  const toggleSpeedUnit = useGameStore((s) => s.toggleSpeedUnit)
  const isHoverMode = useGameStore((s) => s.isHoverMode)
  const currentResolvedBiome = useGameStore((s) => s.currentResolvedBiome)

  // High-Frequency Direct Telemetry Subscription (100% Bypasses React Virtual DOM)
  useEffect(() => {
    let lastDispSpeed = -1
    let lastGear = ''
    let lastBurnout = false

    const unsub = useTelemetryStore.subscribe((state) => {
      // 1. Direct Speedometer Readout & Velocity Color Progression
      const unit = useGameStore.getState().speedUnit
      const dispSpeed = unit === 'mph' ? Math.round(state.speed * 0.621371) : Math.round(state.speed)

      if (dispSpeed !== lastDispSpeed && speedDisplayRef.current) {
        lastDispSpeed = dispSpeed
        speedDisplayRef.current.textContent = dispSpeed.toString()

        // Velocity color progression:
        // High/Hyper speed: Brick Red #C63D2F with red racing glow
        // Fast highway cruising: Warm Amber #FF9D1E with amber glow
        // Normal cruising: Crisp Paper Cream #FDFBF7 with subtle halo
        const isHyper = dispSpeed > (unit === 'mph' ? 120 : 190)
        const isFast = dispSpeed > (unit === 'mph' ? 75 : 120)

        if (isHyper) {
          speedDisplayRef.current.className = 'text-5xl sm:text-6xl font-black italic tracking-tighter font-racing leading-none text-[#C63D2F] racing-glow-red'
        } else if (isFast) {
          speedDisplayRef.current.className = 'text-5xl sm:text-6xl font-black italic tracking-tighter font-racing leading-none text-[#FF9D1E] racing-glow-amber'
        } else {
          speedDisplayRef.current.className = 'text-5xl sm:text-6xl font-black italic tracking-tighter font-racing leading-none text-[#FDFBF7] racing-glow-white'
        }
      }

      // 2. Direct Gear Box Mutation with Shift Punch Flash
      const curGear = isHoverMode ? 'H' : state.gear || '1'
      if (curGear !== lastGear) {
        lastGear = curGear
        if (gearDisplayRef.current) {
          gearDisplayRef.current.textContent = curGear
        }
        if (gearBoxRef.current) {
          gearBoxRef.current.classList.add('bg-[#C63D2F]', 'border-white', 'shadow-[0_0_18px_#C63D2F]')
          gearBoxRef.current.classList.remove('bg-[#0c0e14]', 'border-[#2a3040]')
          setTimeout(() => {
            if (gearBoxRef.current) {
              gearBoxRef.current.classList.remove('bg-[#C63D2F]', 'border-white', 'shadow-[0_0_18px_#C63D2F]')
              gearBoxRef.current.classList.add('bg-[#0c0e14]', 'border-[#2a3040]')
            }
          }, 150)
        }
      }

      // 3. Direct Throttle & Brake Pedals Peak-Meter Heights
      if (brakeBarRef.current) {
        brakeBarRef.current.style.height = `${Math.round(state.brake * 100)}%`
      }
      if (throttleBarRef.current) {
        throttleBarRef.current.style.height = `${Math.round(state.throttle * 100)}%`
      }

      // 4. Burnout Warning Alert Badge
      const isBurning = !!state.isBurnout
      if (isBurning !== lastBurnout && burnoutBadgeRef.current) {
        lastBurnout = isBurning
        burnoutBadgeRef.current.style.display = isBurning ? 'block' : 'none'
      }
    })

    return () => unsub()
  }, [isHoverMode])

  const biomeConfig = BIOMES[currentResolvedBiome] || BIOMES.forest
  const unitLabel = speedUnit === 'mph' ? 'MPH' : 'KM/H'

  return (
    <div className="fixed bottom-6 right-6 pointer-events-auto select-none z-20 flex flex-col items-end gap-2">
      {/* ========================================================= */}
      {/* NEXT-GEN RACING INSTRUMENT DASHBOARD CLUSTER              */}
      {/* Dark Charcoal brushed finish with NFS aerodynamic slant   */}
      {/* ========================================================= */}
      <div
        className="relative racing-cluster-panel rounded-lg p-3.5 flex items-stretch gap-4 transform -skew-x-6 transition-all duration-200 hover:border-[#8EA48C]/60"
        style={{
          boxShadow: '0 24px 60px rgba(0,0,0,0.92), inset 0 1px 1px rgba(255,255,255,0.20), inset 0 -1px 2px rgba(0,0,0,0.85)',
        }}
      >
        {/* Top Metallic Bevel Specular Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FDFBF7]/40 to-transparent pointer-events-none" />

        {/* ========================================================= */}
        {/* SECTION 1: SLANTED GEAR BOX & BIOME STATUS                */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-center pr-3 border-r border-[#262c3a] min-w-[76px]">
          <span className="text-[8.5px] font-racing tracking-widest text-[#FDFBF7]/60 font-bold uppercase">
            {isHoverMode ? 'REPULSOR' : 'GEAR'}
          </span>

          {/* Slanted Angular Metallic Gear Chamber */}
          <div
            ref={gearBoxRef}
            className={`my-1 w-12 h-14 rounded-md flex items-center justify-center border transition-all duration-150 transform -skew-x-6 ${
              isHoverMode
                ? 'bg-[#8EA48C]/20 border-[#8EA48C] text-[#8EA48C]'
                : 'bg-[#0c0e14] border-[#2a3040] text-[#FDFBF7] shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)]'
            }`}
          >
            <span
              ref={gearDisplayRef}
              className={`text-4xl font-black font-racing leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${
                isHoverMode ? 'text-[#8EA48C]' : 'text-[#FDFBF7]'
              }`}
            >
              {isHoverMode ? 'H' : '1'}
            </span>
          </div>

          {/* Automatic / Manual Transmission Mode Badge */}
          <span className="text-[8px] font-racing text-[#8EA48C] font-bold tracking-wider uppercase bg-[#8EA48C]/15 px-1.5 py-0.5 rounded-[2px] border border-[#8EA48C]/30 shadow-xs">
            {transmissionMode.toUpperCase()}
          </span>

          {/* Biome Badge & Burnout Alert Notification */}
          <div className="flex flex-col items-center gap-1 mt-2 w-full">
            <div
              ref={burnoutBadgeRef}
              style={{ display: 'none' }}
              className="text-[7.5px] font-racing font-bold px-1.5 py-0.5 rounded-[2px] bg-[#C63D2F] text-white border border-red-400 animate-pulse tracking-wider shadow-[0_0_8px_#C63D2F]"
            >
              BURNOUT
            </div>
            <div
              className="text-[8.5px] font-racing font-bold px-1.5 py-0.5 rounded-[2px] bg-[#8EA48C]/20 text-[#8EA48C] border border-[#8EA48C]/40 tracking-wider uppercase truncate max-w-[85px] text-center"
              title={biomeConfig.name}
            >
              {biomeConfig.name.split(' ')[0]}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: DIGITAL SPEEDOMETER & 32-LED TACHOMETER       */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-center px-2 min-w-[150px]">
          {/* Main Large Tabular Digital Speed Readout */}
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span
                ref={speedDisplayRef}
                className="text-5xl sm:text-6xl font-black italic tracking-tighter font-racing leading-none text-[#FDFBF7] racing-glow-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
              >
                0
              </span>
            </div>

            {/* Interactive KM/H or MPH Toggle Button */}
            <button
              onClick={toggleSpeedUnit}
              className="group flex items-center gap-1.5 text-[8.5px] font-racing font-bold tracking-widest text-[#FDFBF7]/70 hover:text-[#8EA48C] transition-colors uppercase mt-1 cursor-pointer py-0.5 px-2.5 rounded-[2px] bg-[#10131a] border border-[#262c3a] hover:border-[#8EA48C]"
              title="Click to toggle KM/H or MPH"
            >
              <span>{unitLabel}</span>
              <span className="text-[7.5px] text-[#8EA48C] opacity-80 group-hover:opacity-100 font-mono">⇄</span>
            </button>
          </div>

          {/* 32-Segment Precision Racing Tachometer */}
          <div className="w-full mt-2.5">
            <RacingTachometer />
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 3: NFS MECHANICAL ODOMETER & PEDAL METERS         */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-end pl-3 border-l border-[#262c3a] min-w-[130px]">
          {/* NFS Most Wanted 7-Drum Mechanical Odometer */}
          <div className="flex flex-col items-end">
            <RollingOdometer unit={speedUnit} />
          </div>

          {/* Throttle & Brake Dual Peak-Meter Bars */}
          <div className="flex items-end gap-2.5 h-8 mt-2">
            {/* Brake Input Meter (BRK) in Brick Red #C63D2F */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[7px] font-racing text-[#C63D2F] font-bold">BRK</span>
              <div
                className="w-2.5 h-7 bg-[#0b0e14] rounded-[1px] overflow-hidden flex flex-col justify-end p-[1px] border border-[#252a38]"
                title="Brake Telemetry"
              >
                <div
                  ref={brakeBarRef}
                  className="w-full bg-[#C63D2F] transition-all duration-75 rounded-[1px] shadow-[0_0_6px_#C63D2F]"
                  style={{ height: '0%' }}
                />
              </div>
            </div>

            {/* Throttle Input Meter (THR) in Sage Green #8EA48C */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[7px] font-racing text-[#8EA48C] font-bold">THR</span>
              <div
                className="w-2.5 h-7 bg-[#0b0e14] rounded-[1px] overflow-hidden flex flex-col justify-end p-[1px] border border-[#252a38]"
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
