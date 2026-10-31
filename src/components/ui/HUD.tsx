import { memo, useState, useEffect, useRef } from 'react'
import { useGameStore, useTelemetryStore } from '../../store/useGameStore'
import { BIOMES } from '../../utils/roadMath'

// ------------------------------------------------------------------------
// Rolling Mechanical Slot-Machine Digit Drum (NFS-Inspired Instrumentation)
// ------------------------------------------------------------------------
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

const MechanicalOdometerDigit = memo(function MechanicalOdometerDigit({ char }: { char: string }) {
  if (char === '.' || char === ' ' || isNaN(Number(char))) {
    return (
      <span className="inline-flex items-center justify-center w-[0.38em] text-[#90969E] font-['Courier_Prime',monospace] font-bold">
        {char}
      </span>
    )
  }

  const num = parseInt(char, 10)

  return (
    <span className="inline-block h-[1.35em] w-[0.62em] overflow-hidden relative leading-none align-middle font-['Courier_Prime',monospace] select-none bg-[#121417] border-x border-[#414650]/40 shadow-inner">
      <div
        className="flex flex-col items-center transition-transform duration-200 ease-[cubic-bezier(0.2,0.9,0.3,1.2)]"
        style={{
          transform: `translateY(-${num * 10}%)`,
        }}
      >
        {DIGITS.map((d) => (
          <span
            key={d}
            className="h-[1.35em] flex items-center justify-center text-[#F5F5F5] font-bold text-[11px]"
          >
            {d}
          </span>
        ))}
      </div>
    </span>
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
    <div className="flex items-center tracking-wider text-[11px] font-bold font-['Courier_Prime',monospace] text-[#F5F5F5]">
      <div className="flex items-center border border-[#414650] rounded-sm p-[1.5px] bg-[#121417]/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
        {str.split('').map((char, index) => (
          <MechanicalOdometerDigit key={index} char={char} />
        ))}
      </div>
      <span className="ml-1 text-[9px] text-[#FF9D32] uppercase font-mono font-bold tracking-widest">
        {isMph ? 'MI' : 'KM'}
      </span>
    </div>
  )
})

// ------------------------------------------------------------------------
// Need for Speed: Most Wanted (2005) Inspired 24-Segment LED Tachometer
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
      <div className="flex items-center gap-[2.5px] w-full h-3 bg-[#121417]/90 p-1 rounded-sm border border-[#414650]/80 shadow-inner">
        {Array.from({ length: TOTAL_RPM_SEGMENTS }).map((_, i) => {
          const isActive = i < activeSegments
          // NFS Most Wanted color banding:
          // 0-14 (0 to ~5300 RPM): Active Teal #00D6A3 / White #F5F5F5
          // 15-19 (5300 to ~7000 RPM): Performance Amber #FF9D32
          // 20-23 (7000+ RPM): Brick Red #B83B2F
          const isWarning = i >= 15 && i < 20
          const isCritical = i >= 20

          let colorClass = 'bg-[#414650]/30'
          if (isActive) {
            if (isCritical) {
              colorClass = 'bg-[#B83B2F] shadow-[0_0_6px_#B83B2F]'
            } else if (isWarning) {
              colorClass = 'bg-[#FF9D32] shadow-[0_0_6px_#FF9D32]'
            } else {
              colorClass = 'bg-[#00D6A3] shadow-[0_0_4px_#00D6A3]'
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
      <div className="flex justify-between items-center text-[8px] font-mono font-bold tracking-wider px-0.5">
        <span className="text-[#90969E]">0</span>
        <span className={isRedline ? 'text-[#B83B2F] font-black animate-pulse' : 'text-[#FF9D32]'}>
          {isRedline ? '• SHIFT •' : `${Math.round(rpm).toLocaleString()} RPM`}
        </span>
        <span className={isRedline ? 'text-[#B83B2F] font-black' : 'text-[#90969E]'}>8.5k</span>
      </div>
    </div>
  )
})

// ------------------------------------------------------------------------
// Need for Speed Most Wanted-Inspired Racing HUD Dashboard
// ------------------------------------------------------------------------
export default function HUD() {
  // Telemetry Subscriptions (Isolated to HUD DOM, zero 3D tree re-renders)
  const speed = useTelemetryStore((s) => s.speed)
  const rpm = useTelemetryStore((s) => s.rpm)
  const gear = useTelemetryStore((s) => s.gear)
  const distance = useTelemetryStore((s) => s.distance)
  const throttle = useTelemetryStore((s) => s.throttle)
  const brake = useTelemetryStore((s) => s.brake)
  const isBurnout = useTelemetryStore((s) => s.isBurnout)

  // Game Settings & State
  const transmissionMode = useGameStore((s) => s.transmissionMode)
  const speedUnit = useGameStore((s) => s.speedUnit)
  const toggleSpeedUnit = useGameStore((s) => s.toggleSpeedUnit)
  const isHoverMode = useGameStore((s) => s.isHoverMode)
  const currentResolvedBiome = useGameStore((s) => s.currentResolvedBiome)

  // Dynamic Shift Flash feedback
  const [shiftFlash, setShiftFlash] = useState(false)
  const prevGearRef = useRef(gear)

  useEffect(() => {
    if (prevGearRef.current !== gear) {
      setShiftFlash(true)
      const timer = setTimeout(() => setShiftFlash(false), 160)
      prevGearRef.current = gear
      return () => clearTimeout(timer)
    }
  }, [gear])

  const displayedSpeed = speedUnit === 'mph' ? Math.round(speed * 0.621371) : Math.round(speed)
  const unitLabel = speedUnit === 'mph' ? 'MPH' : 'KM/H'
  const biomeConfig = BIOMES[currentResolvedBiome] || BIOMES.forest
  const isHighSpeed = displayedSpeed > (speedUnit === 'mph' ? 120 : 190)

  return (
    <div className="fixed bottom-6 right-6 pointer-events-auto select-none z-20 flex flex-col items-end gap-2">
      {/* ========================================================= */}
      {/* NEED FOR SPEED: MOST WANTED RACING INSTRUMENT CLUSTER    */}
      {/* Slanted, Aggressive Motorsport Dashboard with NFS Colors  */}
      {/* ========================================================= */}
      <div
        className="relative backdrop-blur-[16px] bg-[#17191D]/90 border border-[#414650] rounded-lg p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-stretch gap-4 transform -skew-x-6 transition-all duration-200 hover:border-[#FF9D32]/50 hover:bg-[#17191D]/95"
        style={{
          boxShadow: '0 20px 50px rgba(0,0,0,0.85), inset 0 1px 1px rgba(255,255,255,0.15)',
        }}
      >
        {/* Subtle Top Carbon Bevel Accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF9D32]/80 to-transparent" />

        {/* ========================================================= */}
        {/* SECTION 1: SLANTED GEAR BOX & TRANSMISSION MODE           */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-center pr-3 border-r border-[#414650]/80 min-w-[70px]">
          <span className="text-[8px] font-mono tracking-widest text-[#90969E] font-bold uppercase">
            {isHoverMode ? 'REPULSOR' : 'GEAR'}
          </span>

          {/* Angular Slanted Gear Frame with Shift Flash */}
          <div
            className={`my-1 w-12 h-14 rounded-md flex items-center justify-center border transition-all duration-150 transform -skew-x-6 ${
              shiftFlash
                ? 'bg-[#FF9D32] border-white text-[#17191D] shadow-[0_0_16px_#FF9D32]'
                : isHoverMode
                ? 'bg-[#00D6A3]/15 border-[#00D6A3] text-[#00D6A3]'
                : 'bg-[#24272D] border-[#414650] text-[#F5F5F5] shadow-inner'
            }`}
          >
            <span
              className={`text-4xl font-black font-['Courier_Prime',monospace] leading-none drop-shadow-md ${
                shiftFlash ? 'text-[#17191D]' : isHoverMode ? 'text-[#00D6A3]' : 'text-[#F5F5F5]'
              }`}
            >
              {isHoverMode ? 'H' : gear}
            </span>
          </div>

          <span className="text-[8px] font-mono text-[#FF9D32] font-black tracking-wider uppercase bg-[#FF9D32]/10 px-1.5 py-0.5 rounded-xs border border-[#FF9D32]/30">
            {transmissionMode.toUpperCase()}
          </span>

          {/* Active Biome Pill & Burnout Badge */}
          <div className="flex flex-col items-center gap-1 mt-2 w-full">
            {isBurnout && (
              <span className="text-[7.5px] font-mono font-black px-1.5 py-0.5 rounded-xs bg-[#B83B2F] text-white border border-red-400 animate-pulse tracking-wider shadow-[0_0_8px_#B83B2F]">
                BURNOUT
              </span>
            )}
            <div
              className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-xs bg-[#24272D] text-[#00D6A3] border border-[#00D6A3]/40 tracking-wider uppercase truncate max-w-[85px] text-center"
              title={biomeConfig.name}
            >
              {biomeConfig.name.split(' ')[0]}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: BOLD ITALIC SPEEDOMETER & 24-LED TACHOMETER    */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-center px-2 min-w-[145px]">
          {/* Main Large Slanted Speed Digits */}
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-5xl sm:text-6xl font-black italic tracking-tighter font-mono leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] ${
                  isHighSpeed
                    ? 'text-[#FF9D32] drop-shadow-[0_0_12px_rgba(255,157,50,0.6)]'
                    : 'text-[#F5F5F5]'
                }`}
              >
                {displayedSpeed}
              </span>
            </div>

            {/* Speed Unit Switcher Button */}
            <button
              onClick={toggleSpeedUnit}
              className="group flex items-center gap-1 text-[8.5px] font-mono font-black tracking-widest text-[#90969E] hover:text-[#00D6A3] transition-colors uppercase mt-1 cursor-pointer py-0.5 px-2 rounded-xs bg-[#24272D] border border-[#414650]/60 hover:border-[#00D6A3]"
              title="Click to toggle KM/H or MPH"
            >
              <span>{unitLabel}</span>
              <span className="text-[7px] text-[#FF9D32] opacity-75 group-hover:opacity-100">⇄</span>
            </button>
          </div>

          {/* Segmented Tachometer Gauge */}
          <div className="w-full mt-2.5">
            <TachometerGauge rpm={rpm} />
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 3: MECHANICAL ODOMETER & PEDAL TELEMETRY METERS   */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-end pl-3 border-l border-[#414650]/80 min-w-[105px]">
          {/* Rolling Mechanical Digital Odometer */}
          <div className="flex flex-col items-end">
            <span className="text-[7.5px] text-[#90969E] font-mono font-bold uppercase tracking-widest mb-1">
              TRIP ODOMETER
            </span>
            <RollingOdometer distance={distance} unit={speedUnit} />
          </div>

          {/* Throttle & Brake Peak-Meter Bars */}
          <div className="flex items-end gap-2.5 h-8 mt-2">
            {/* Brake Input Meter */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[7px] font-mono text-[#B83B2F] font-bold">BRK</span>
              <div
                className="w-2 h-7 bg-[#121417] rounded-[1px] overflow-hidden flex flex-col justify-end p-[1px] border border-[#414650]"
                title={`Brake: ${Math.round(brake * 100)}%`}
              >
                <div
                  className="w-full bg-[#B83B2F] transition-all duration-75 rounded-[1px] shadow-[0_0_6px_#B83B2F]"
                  style={{ height: `${brake * 100}%` }}
                />
              </div>
            </div>

            {/* Throttle Input Meter */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[7px] font-mono text-[#00D6A3] font-bold">THR</span>
              <div
                className="w-2 h-7 bg-[#121417] rounded-[1px] overflow-hidden flex flex-col justify-end p-[1px] border border-[#414650]"
                title={`Throttle: ${Math.round(throttle * 100)}%`}
              >
                <div
                  className="w-full bg-[#00D6A3] transition-all duration-75 rounded-[1px] shadow-[0_0_6px_#00D6A3]"
                  style={{ height: `${throttle * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
