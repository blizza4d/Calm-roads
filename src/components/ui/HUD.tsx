import { memo, useEffect, useRef } from 'react'
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
// SPEEDOMETER 2.0: HIGH-PERFORMANCE RACING COCKPIT DASHBOARD
// Zero-React Frame Overhead: All Telemetry Updates Mutate Raw DOM Elements
// ------------------------------------------------------------------------
const TOTAL_RPM_SEGMENTS = 28

export default function HUD() {
  // Direct DOM Element References
  const speedDisplayRef = useRef<HTMLSpanElement>(null)
  const gearDisplayRef = useRef<HTMLSpanElement>(null)
  const gearContainerRef = useRef<HTMLDivElement>(null)
  const transModeRef = useRef<HTMLSpanElement>(null)
  const rpmTextRef = useRef<HTMLSpanElement>(null)
  const tachSegmentsRef = useRef<(HTMLDivElement | null)[]>([])
  const brakeBarRef = useRef<HTMLDivElement>(null)
  const throttleBarRef = useRef<HTMLDivElement>(null)
  const burnoutBadgeRef = useRef<HTMLDivElement>(null)
  const surfaceBadgeRef = useRef<HTMLDivElement>(null)

  // React State solely for user settings that do not change every physics frame
  const speedUnit = useGameStore((s) => s.speedUnit)
  const toggleSpeedUnit = useGameStore((s) => s.toggleSpeedUnit)
  const toggleTransmissionMode = useGameStore((s) => s.toggleTransmissionMode)
  const vehicleModel = useGameStore((s) => s.vehicleModel)
  const isHoverMode = useGameStore((s) => s.isHoverMode)
  const currentResolvedBiome = useGameStore((s) => s.currentResolvedBiome)

  // High-Frequency Direct Telemetry Subscription (100% Zero React Re-Renders)
  useEffect(() => {
    let lastDispSpeed = -1
    let lastGear = ''
    let lastTransMode = ''
    let lastRpm = -1
    let lastBurnout = false
    let lastSurface = ''
    let shiftFlashTimeout: number | undefined

    const unsub = useTelemetryStore.subscribe((state) => {
      // 1. Digital Speedometer Display Update
      const unit = useGameStore.getState().speedUnit
      const dispSpeed = unit === 'mph' ? Math.round(state.speed * 0.621371) : Math.round(state.speed)
      if (dispSpeed !== lastDispSpeed && speedDisplayRef.current) {
        lastDispSpeed = dispSpeed
        speedDisplayRef.current.textContent = dispSpeed.toString()
        const isHighSpeed = dispSpeed > (unit === 'mph' ? 120 : 190)
        if (isHighSpeed) {
          speedDisplayRef.current.className =
            'text-5xl sm:text-6xl font-black italic tracking-tighter font-courier leading-none text-[#EF4444] drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]'
        } else {
          speedDisplayRef.current.className =
            'text-5xl sm:text-6xl font-black italic tracking-tighter font-courier leading-none text-[#FDFBF7] drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]'
        }
      }

      // 2. Authoritative Gear Display & Subtle Mechanical Shift Flash
      const activeGear = state.gear || '1'
      if (activeGear !== lastGear && gearDisplayRef.current) {
        lastGear = activeGear
        gearDisplayRef.current.textContent = activeGear

        // Luminous shift flash feedback
        if (gearContainerRef.current) {
          gearContainerRef.current.style.boxShadow = '0 0 22px rgba(255, 157, 30, 0.9), inset 0 0 12px rgba(255, 157, 30, 0.6)'
          gearContainerRef.current.style.borderColor = '#FF9D1E'
          if (shiftFlashTimeout) clearTimeout(shiftFlashTimeout)
          shiftFlashTimeout = window.setTimeout(() => {
            if (gearContainerRef.current) {
              gearContainerRef.current.style.boxShadow = ''
              gearContainerRef.current.style.borderColor = ''
            }
          }, 140)
        }
      }

      // 3. Transmission Mode Badge (AUTO / MANUAL)
      const currentMode = state.transmissionMode || 'auto'
      if (currentMode !== lastTransMode && transModeRef.current) {
        lastTransMode = currentMode
        transModeRef.current.textContent = currentMode.toUpperCase()
        if (currentMode === 'manual') {
          transModeRef.current.className =
            'text-[7.5px] font-special-elite font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-xs bg-[#FF9D1E]/20 text-[#FF9D1E] border border-[#FF9D1E]/50 shadow-[0_0_6px_rgba(255,157,30,0.4)]'
        } else {
          transModeRef.current.className =
            'text-[7.5px] font-special-elite font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-xs bg-[#8EA48C]/15 text-[#8EA48C] border border-[#8EA48C]/30'
        }
      }

      // 4. 28-Segment LED Tachometer & Digital RPM Counter (Direct DOM mutation)
      const currentRpm = state.rpm || 850
      if (Math.abs(currentRpm - lastRpm) >= 25) {
        lastRpm = currentRpm
        const maxRpm = 8800
        const normRpm = Math.max(0, Math.min(1.0, currentRpm / maxRpm))
        const activeCount = Math.round(normRpm * TOTAL_RPM_SEGMENTS)
        const isRedline = currentRpm > 7200

        // Update tachometer segments
        for (let i = 0; i < TOTAL_RPM_SEGMENTS; i++) {
          const seg = tachSegmentsRef.current[i]
          if (seg) {
            if (i < activeCount) {
              if (i >= 23) {
                // Redline zone (Segments 24-28): Racing Red
                seg.style.backgroundColor = '#EF4444'
                seg.style.boxShadow = '0 0 6px #EF4444'
                seg.style.opacity = '1'
              } else if (i >= 17) {
                // High load zone (Segments 18-23): Warm Amber
                seg.style.backgroundColor = '#FF9D1E'
                seg.style.boxShadow = '0 0 5px #FF9D1E'
                seg.style.opacity = '1'
              } else {
                // Powerband zone (Segments 1-17): Crisp Sage Green
                seg.style.backgroundColor = '#8EA48C'
                seg.style.boxShadow = '0 0 4px #8EA48C'
                seg.style.opacity = '1'
              }
            } else {
              seg.style.backgroundColor = 'rgba(253, 251, 247, 0.08)'
              seg.style.boxShadow = 'none'
              seg.style.opacity = '0.5'
            }
          }
        }

        // Update RPM textual header
        if (rpmTextRef.current) {
          if (isRedline) {
            rpmTextRef.current.textContent = '• SHIFT •'
            rpmTextRef.current.className = 'text-[#EF4444] font-bold tracking-widest animate-pulse'
          } else {
            rpmTextRef.current.textContent = `${Math.round(currentRpm).toLocaleString()} RPM`
            rpmTextRef.current.className = 'text-[#FDFBF7] font-semibold tracking-wider'
          }
        }
      }

      // 5. Throttle & Brake Pedals Bar
      if (brakeBarRef.current) {
        brakeBarRef.current.style.height = `${Math.round(state.brake * 100)}%`
      }
      if (throttleBarRef.current) {
        throttleBarRef.current.style.height = `${Math.round(state.throttle * 100)}%`
      }

      // 6. Burnout Alert Lamp
      const isBurnoutActive = !!state.isBurnout
      if (isBurnoutActive !== lastBurnout && burnoutBadgeRef.current) {
        lastBurnout = isBurnoutActive
        burnoutBadgeRef.current.style.display = isBurnoutActive ? 'block' : 'none'
      }

      // 7. Surface Traction Indicator
      const onRoad = state.onRoad !== false
      const surfaceName = onRoad ? 'ASPHALT' : 'OFF-ROAD'
      if (surfaceName !== lastSurface && surfaceBadgeRef.current) {
        lastSurface = surfaceName
        surfaceBadgeRef.current.textContent = surfaceName
        surfaceBadgeRef.current.className = onRoad
          ? 'text-[7.5px] font-special-elite font-bold px-1.5 py-0.5 rounded-xs bg-[#8EA48C]/20 text-[#8EA48C] border border-[#8EA48C]/40 tracking-wider uppercase'
          : 'text-[7.5px] font-special-elite font-bold px-1.5 py-0.5 rounded-xs bg-[#FF9D1E]/20 text-[#FF9D1E] border border-[#FF9D1E]/40 tracking-wider uppercase'
      }
    })

    return () => {
      unsub()
      if (shiftFlashTimeout) clearTimeout(shiftFlashTimeout)
    }
  }, [])

  const biomeConfig = BIOMES[currentResolvedBiome] || BIOMES.forest
  const unitLabel = speedUnit === 'mph' ? 'MPH' : 'KM/H'
  const vehicleNameFormatted =
    vehicleModel === 'bmw_m3'
      ? 'BMW M3 GTR'
      : vehicleModel === 'supercar'
      ? 'SUPERCAR'
      : vehicleModel === 'hovercraft'
      ? 'HOVERCRAFT'
      : vehicleModel === 'camper'
      ? 'CAMPER VAN'
      : vehicleModel === 'hatchback'
      ? 'RALLY HATCH'
      : vehicleModel === 'modern_supercar'
      ? 'V12 SUPERCAR'
      : 'VINTAGE TURBO'

  return (
    <div className="fixed bottom-6 right-6 pointer-events-auto select-none z-20 flex flex-col items-end gap-2">
      {/* ========================================================= */}
      {/* SPEEDOMETER 2.0 RACING COCKPIT INSTRUMENT CLUSTER         */}
      {/* Precision CNC Graphite Housing with Brushed Metal Inset   */}
      {/* ========================================================= */}
      <div
        className="relative backdrop-blur-md bg-[#0e1014]/85 border border-[#262c38] rounded-xl p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.92),inset_0_1px_1px_rgba(255,255,255,0.12)] flex items-stretch gap-4 transform -skew-x-6 transition-all duration-200 hover:border-[#8EA48C]/40"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 24, 32, 0.90) 0%, rgba(10, 12, 16, 0.92) 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.92), inset 0 1px 1px rgba(255,255,255,0.12)',
        }}
      >
        {/* Top Metallic Bevel Light Highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FDFBF7]/30 to-transparent" />

        {/* ========================================================= */}
        {/* SECTION 1: TRANSMISSION GEAR MATRIX & STATUS LAMPS        */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-center pr-3 border-r border-[#262c38] min-w-[76px]">
          {/* Header Title */}
          <span className="text-[8px] font-special-elite tracking-widest text-[#FDFBF7]/50 font-bold uppercase">
            {isHoverMode ? 'DRIVE' : 'GEAR'}
          </span>

          {/* Angular Slanted Gear Frame with Dynamic Neon Backlight */}
          <div
            ref={gearContainerRef}
            className="my-1 w-13 h-15 rounded-lg flex items-center justify-center border border-[#2b313e] bg-[#07080a] shadow-[inset_0_2px_8px_rgba(0,0,0,0.95)] transition-all duration-150 transform -skew-x-6"
          >
            <span
              ref={gearDisplayRef}
              className="text-4xl font-black font-courier leading-none text-[#FDFBF7] drop-shadow-[0_0_10px_rgba(253,251,247,0.4)]"
            >
              1
            </span>
          </div>

          {/* Clickable Transmission Mode Badge (AUTO / MANUAL) */}
          <button
            onClick={toggleTransmissionMode}
            className="cursor-pointer group flex items-center gap-1 mt-0.5"
            title="Click or press [M] to toggle Automatic / Manual transmission"
          >
            <span
              ref={transModeRef}
              className="text-[7.5px] font-special-elite font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-xs bg-[#8EA48C]/15 text-[#8EA48C] border border-[#8EA48C]/30 group-hover:border-[#8EA48C]"
            >
              AUTO
            </span>
            <span className="text-[6.5px] font-mono text-[#FDFBF7]/40 group-hover:text-[#FDFBF7]/80">[M]</span>
          </button>

          {/* Status Badges: Burnout & Surface */}
          <div className="flex flex-col items-center gap-1 mt-2 w-full">
            <div
              ref={burnoutBadgeRef}
              style={{ display: 'none' }}
              className="text-[7px] font-special-elite font-bold px-1.5 py-0.5 rounded-xs bg-[#EF4444] text-white border border-red-400 animate-pulse tracking-wider shadow-[0_0_8px_#EF4444]"
            >
              BURNOUT
            </div>
            <div
              ref={surfaceBadgeRef}
              className="text-[7.5px] font-special-elite font-bold px-1.5 py-0.5 rounded-xs bg-[#8EA48C]/20 text-[#8EA48C] border border-[#8EA48C]/40 tracking-wider uppercase truncate max-w-[85px] text-center"
            >
              ASPHALT
            </div>
            <div
              className="text-[7px] font-special-elite text-[#FDFBF7]/50 tracking-wider uppercase truncate max-w-[85px] text-center"
              title={biomeConfig.name}
            >
              {biomeConfig.name.split(' ')[0]}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: DIGITAL SPEEDOMETER & 28-SEGMENT TACHOMETER    */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-center px-2 min-w-[155px]">
          {/* Main Large Speed Readout in Monospace Courier Prime */}
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span
                ref={speedDisplayRef}
                className="text-5xl sm:text-6xl font-black italic tracking-tighter font-courier leading-none text-[#FDFBF7] drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
              >
                0
              </span>
            </div>

            {/* Speed Unit Toggle Button (KM/H <-> MPH) */}
            <button
              onClick={toggleSpeedUnit}
              className="group flex items-center gap-1 text-[8px] font-special-elite font-bold tracking-widest text-[#FDFBF7]/60 hover:text-[#8EA48C] transition-colors uppercase mt-1 cursor-pointer py-0.5 px-2 rounded-xs bg-[#12151b] border border-[#2b313e] hover:border-[#8EA48C]"
              title="Click to toggle KM/H or MPH"
            >
              <span>{unitLabel}</span>
              <span className="text-[7px] text-[#8EA48C] opacity-75 group-hover:opacity-100">⇄</span>
            </button>
          </div>

          {/* Sweeping 28-Segment LED Racing Tachometer */}
          <div className="w-full mt-2 flex flex-col gap-1">
            <div className="flex items-center gap-[2px] w-full h-3 bg-[#08090c] p-[2.5px] rounded-xs border border-[#2b313e] shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)]">
              {Array.from({ length: TOTAL_RPM_SEGMENTS }).map((_, i) => (
                <div
                  key={i}
                  ref={(el) => (tachSegmentsRef.current[i] = el)}
                  className="h-full flex-1 rounded-[0.5px] transform -skew-x-12 transition-colors duration-75 bg-[#FDFBF7]/10"
                />
              ))}
            </div>

            {/* Tachometer Header Readout */}
            <div className="flex justify-between items-center text-[8.5px] font-special-elite tracking-wider px-0.5">
              <span className="text-[#FDFBF7]/40">0</span>
              <span ref={rpmTextRef} className="text-[#FDFBF7] font-semibold tracking-wider">
                850 RPM
              </span>
              <span className="text-[#FDFBF7]/40">8.8k</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 3: NFS MOST WANTED ODOMETER & PEDAL TELEMETRY     */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-end pl-3 border-l border-[#262c38] min-w-[130px]">
          {/* NFS Most Wanted 2005 Rolling Mechanical Odometer */}
          <div className="flex flex-col items-end">
            <RollingOdometer unit={speedUnit} />
          </div>

          {/* Vehicle Name Tag & Throttle/Brake Peak Meters */}
          <div className="flex items-end justify-between w-full mt-2">
            {/* Active Vehicle & Biome Tag */}
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[7px] font-mono text-[#FDFBF7]/40 font-bold uppercase tracking-wider">
                VEHICLE
              </span>
              <span className="text-[8px] font-special-elite text-[#8EA48C] font-bold uppercase tracking-wider truncate max-w-[65px]" title={vehicleNameFormatted}>
                {vehicleNameFormatted}
              </span>
            </div>

            {/* Throttle & Brake Pedals Meter */}
            <div className="flex items-end gap-2.5 h-8">
              {/* Brake Input Meter */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[7px] font-special-elite text-[#EF4444] font-bold">BRK</span>
                <div
                  className="w-2 h-7 bg-[#08090c] rounded-[1px] overflow-hidden flex flex-col justify-end p-[1px] border border-[#2b313e]"
                  title="Brake Telemetry"
                >
                  <div
                    ref={brakeBarRef}
                    className="w-full bg-[#EF4444] transition-all duration-75 rounded-[1px] shadow-[0_0_6px_#EF4444]"
                    style={{ height: '0%' }}
                  />
                </div>
              </div>

              {/* Throttle Input Meter */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[7px] font-special-elite text-[#8EA48C] font-bold">THR</span>
                <div
                  className="w-2 h-7 bg-[#08090c] rounded-[1px] overflow-hidden flex flex-col justify-end p-[1px] border border-[#2b313e]"
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
    </div>
  )
}
