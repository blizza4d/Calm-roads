import { memo } from 'react'
import { motion } from 'framer-motion'
import { useGameStore, useTelemetryStore } from '../../store/useGameStore'
import { BIOMES } from '../../utils/roadMath'

// ------------------------------------------------------------------------
// Rolling Mechanical Slot Machine Digit Drum Reel
// ------------------------------------------------------------------------
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

const RollingDigit = memo(function RollingDigit({ char }: { char: string }) {
  if (char === '.' || char === ' ' || isNaN(Number(char))) {
    return (
      <span className="inline-flex items-center justify-center w-[0.38em] text-[#FDFBF7]/60 font-['Courier_Prime',monospace]">
        {char}
      </span>
    )
  }

  const num = parseInt(char, 10)

  return (
    <span className="inline-block h-[1.25em] w-[0.62em] overflow-hidden relative leading-none align-middle font-['Courier_Prime',monospace] select-none">
      <motion.div
        className="flex flex-col items-center"
        initial={false}
        animate={{ y: `-${num * 10}%` }}
        transition={{
          type: 'spring',
          stiffness: 320,
          damping: 30,
          mass: 0.8,
        }}
      >
        {DIGITS.map((d) => (
          <span
            key={d}
            className="h-[1.25em] flex items-center justify-center text-[#FDFBF7]"
          >
            {d}
          </span>
        ))}
      </motion.div>
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
    <div className="flex items-center tracking-wider text-xs font-bold font-['Courier_Prime',monospace] text-[#FDFBF7]">
      {str.split('').map((char, index) => (
        <RollingDigit key={index} char={char} />
      ))}
      <span className="ml-1 text-[9px] text-[#FDFBF7]/60 uppercase font-mono">
        {isMph ? 'mi' : 'km'}
      </span>
    </div>
  )
})

// ------------------------------------------------------------------------
// Rolling Speedometer Digits (Smooth Monospace Readout)
// ------------------------------------------------------------------------
const RollingSpeed = memo(function RollingSpeed({ speed }: { speed: number }) {
  const str = Math.max(0, Math.round(speed)).toString()

  return (
    <div className="flex items-center text-4xl sm:text-5xl font-black font-['Courier_Prime',monospace] text-[#FDFBF7] tracking-tight leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
      {str.split('').map((char, index) => (
        <RollingDigit key={index} char={char} />
      ))}
    </div>
  )
})

// ------------------------------------------------------------------------
// Premium Glassmorphic Linear/Raycast Dashboard HUD
// ------------------------------------------------------------------------
export default function HUD() {
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
  const isBurnout = useGameStore((s) => s.isBurnout)

  const displayedSpeed = speedUnit === 'mph' ? speed * 0.621371 : speed
  const unitLabel = speedUnit === 'mph' ? 'MPH' : 'KM/H'
  const isRedline = rpm > 7200
  const rpmPercent = Math.min(100, Math.max(0, (rpm / 8500) * 100))

  const biomeName = BIOMES[currentResolvedBiome]?.name || 'Scenic Route'

  return (
    <div className="fixed bottom-6 right-6 pointer-events-auto select-none z-20 flex flex-col items-end gap-2">
      {/* High-Contrast Linear-Inspired Glass Dashboard Container */}
      <div
        className="backdrop-blur-[12px] bg-[#2A2A2A]/60 border border-white/[0.12] rounded-xl p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)] flex items-stretch gap-4 transition-all duration-200 hover:border-white/20 hover:bg-[#2A2A2A]/70"
        style={{
          boxShadow: '0 16px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}
      >
        {/* ========================================================= */}
        {/* SECTION 1: GEAR, TRANSMISSION & ACTIVE BIOME BADGE        */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-center pr-3.5 border-r border-white/[0.08] min-w-[62px]">
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-mono tracking-widest text-[#FDFBF7]/50 font-semibold uppercase">
              {isHoverMode ? 'THRUST' : 'GEAR'}
            </span>
            <span className="text-3xl sm:text-4xl font-black font-['Courier_Prime',monospace] leading-none my-0.5 text-[#FDFBF7] drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
              {isHoverMode ? 'H' : gear}
            </span>
            <span className="text-[8px] font-mono text-[#FDFBF7]/50 uppercase tracking-wider font-medium">
              {transmissionMode.toUpperCase()}
            </span>
          </div>

          {/* Active Biome Sage Green Badge & Burnout Pill */}
          <div className="flex flex-col items-center gap-1 mt-2 w-full">
            {isBurnout && (
              <span className="text-[8px] font-mono font-black px-2 py-0.5 rounded bg-[#B83B2F] text-[#FDFBF7] border border-[#B83B2F]/60 animate-pulse tracking-wider shadow-[0_0_8px_rgba(184,59,47,0.6)]">
                BURNOUT
              </span>
            )}
            <div
              className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-[#6B705C] text-[#FDFBF7] shadow-sm tracking-wider uppercase truncate max-w-[80px] text-center"
              title={biomeName}
            >
              {biomeName.split(' ')[0]}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: SPEEDOMETER & TACHOMETER (RPM METER)           */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-center px-1 min-w-[124px]">
          <div className="flex flex-col items-center">
            <RollingSpeed speed={displayedSpeed} />
            <button
              onClick={toggleSpeedUnit}
              className="group flex items-center gap-1 text-[8px] font-mono font-bold tracking-widest text-[#FDFBF7]/60 hover:text-[#FDFBF7] transition-colors uppercase mt-1 cursor-pointer py-0.5 px-1.5 rounded hover:bg-white/[0.06]"
              title="Click to toggle KM/H or MPH"
            >
              <span>{unitLabel}</span>
              <span className="opacity-40 text-[7px] group-hover:opacity-80">⇄</span>
            </button>
          </div>

          {/* Precision LED Segmented Tachometer */}
          <div className="w-full mt-2">
            <div className="flex justify-between text-[7px] font-mono font-bold text-[#FDFBF7]/40 mb-1 tracking-wider">
              <span>0</span>
              <span className={isRedline ? 'text-[#B83B2F] font-black animate-pulse' : 'text-[#FDFBF7]/60'}>
                {isRedline ? 'REDLINE' : 'RPM ×1000'}
              </span>
              <span className={isRedline ? 'text-[#B83B2F] font-black' : ''}>8.5</span>
            </div>
            {/* Tachometer Track Bar */}
            <div className="w-full h-1.5 bg-black/40 rounded-sm overflow-hidden p-[1px] flex items-center border border-white/[0.08]">
              <div
                className={`h-full transition-all duration-75 rounded-sm ${
                  isRedline
                    ? 'bg-[#B83B2F] shadow-[0_0_8px_#B83B2F]'
                    : rpmPercent > 72
                    ? 'bg-[#E3A857]'
                    : 'bg-[#FDFBF7]'
                }`}
                style={{ width: `${rpmPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 3: ROLLING MECHANICAL ODOMETER & PEDAL METERS     */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between items-end pl-3.5 border-l border-white/[0.08] min-w-[100px]">
          {/* Physical Rolling Mechanical Odometer */}
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-[#FDFBF7]/50 font-mono font-semibold uppercase tracking-widest mb-0.5">
              ODOMETER
            </span>
            <div className="bg-black/35 px-2 py-1 rounded border border-white/[0.06] shadow-inner">
              <RollingOdometer distance={distance} unit={speedUnit} />
            </div>
          </div>

          {/* Pedal Input Telemetry Meters (Throttle & Brake) */}
          <div className="flex items-end gap-2 h-7 mt-2">
            {/* Brake Input Meter */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[6px] font-mono text-[#FDFBF7]/40 font-bold">BRK</span>
              <div
                className="w-1.5 h-6 bg-black/40 rounded-sm overflow-hidden flex flex-col justify-end p-[0.5px] border border-white/[0.08]"
                title={`Brake: ${Math.round(brake * 100)}%`}
              >
                <div
                  className="w-full bg-[#B83B2F] transition-all duration-75 rounded-xs shadow-[0_0_4px_#B83B2F]"
                  style={{ height: `${brake * 100}%` }}
                />
              </div>
            </div>

            {/* Throttle Input Meter */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[6px] font-mono text-[#FDFBF7]/40 font-bold">THR</span>
              <div
                className="w-1.5 h-6 bg-black/40 rounded-sm overflow-hidden flex flex-col justify-end p-[0.5px] border border-white/[0.08]"
                title={`Throttle: ${Math.round(throttle * 100)}%`}
              >
                <div
                  className="w-full bg-[#FDFBF7] transition-all duration-75 rounded-xs shadow-[0_0_4px_rgba(253,251,247,0.7)]"
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
