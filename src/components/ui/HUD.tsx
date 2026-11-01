import { memo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useGameStore, useTelemetryStore } from '../../store/useGameStore'
import { BIOMES } from '../../utils/roadMath'

// ------------------------------------------------------------------------
// Rolling Mechanical Slot-Machine Digit Drum (framer-motion Y-Axis Translation)
// ------------------------------------------------------------------------
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

const MechanicalOdometerDigit = memo(function MechanicalOdometerDigit({ char }: { char: string }) {
  if (char === '.' || char === ' ' || isNaN(Number(char))) {
    return (
      <span className="inline-flex items-center justify-center w-[0.4em] text-[#FDFBF7]/60 font-courier font-bold">
        {char}
      </span>
    )
  }

  const num = parseInt(char, 10)

  return (
    <motion.div
      className="inline-block h-[1.38em] w-[0.68em] overflow-hidden relative leading-none align-middle font-courier select-none bg-[#1e1e1e] border-x border-[#FDFBF7]/15 shadow-inner rounded-[1px]"
    >
      <motion.div
        className="flex flex-col items-center"
        animate={{ y: `-${num * 10}%` }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        {DIGITS.map((d) => (
          <span
            key={d}
            className="h-[1.38em] flex items-center justify-center text-[#FDFBF7] font-bold text-[12px]"
          >
            {d}
          </span>
        ))}
      </motion.div>
    </motion.div>
  )
})

interface RollingOdometerProps {
  distance: number
  unit: 'kmh' | 'mph'
}

const RollingOdometer = memo(function RollingOdometer({ distance, unit }: RollingOdometerProps) {
  const isMph = unit === 'mph'
  const val = isMph ? distance * 0.621371 : distance
  const whole = Math.floor(val).toString().padStart(4, '0')
  const frac = Math.floor((val % 1) * 100).toString().padStart(2, '0')
  const str = `${whole}.${frac}`

  return (
    <div className="flex items-center tracking-wider text-[12px] font-bold font-courier text-[#FDFBF7]">
      <div className="flex items-center border border-[#FDFBF7]/20 rounded-xs p-[1.5px] bg-[#1a1a1a]/95 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
        {str.split('').map((char, index) => (
          <MechanicalOdometerDigit key={index} char={char} />
        ))}
      </div>
      <span className="ml-1.5 text-[9px] text-[#8EA48C] uppercase font-special-elite font-bold tracking-widest">
        {isMph ? 'MI' : 'KM'}
      </span>
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

  // State for components requiring layout animation (Odometer & Tachometer)
  const [distance, setDistance] = useState(0)
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
    let lastDistance = -1
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

      // 6. Throttled Odometer distance update (every ~10m increment)
      if (Math.abs(state.distance - lastDistance) > 0.009) {
        lastDistance = state.distance
        setDistance(state.distance)
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
        {/* SECTION 3: ROLLING MECHANICAL ODOMETER & PEDAL METERS     */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-end pl-3 border-l border-[#FDFBF7]/15 min-w-[105px]">
          {/* Rolling Mechanical Digital Slot-Machine Odometer */}
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-[#FDFBF7]/60 font-special-elite font-bold uppercase tracking-widest mb-1">
              ODOMETER
            </span>
            <RollingOdometer distance={distance} unit={speedUnit} />
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
