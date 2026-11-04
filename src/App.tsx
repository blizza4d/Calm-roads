import { Canvas } from '@react-three/fiber'
import { Suspense, useState, useEffect } from 'react'
import { KeyboardControls, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import Experience from './components/3d/Experience'
import Overlay from './components/ui/Overlay'
import { useGameStore } from './store/useGameStore'
import { useLoadingStore } from './store/useLoadingStore'

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'brake', keys: ['ArrowDown', 's', 'S'] },
  { name: 'handbrake', keys: ['Space'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'burnout', keys: ['KeyB', 'b', 'B'] },
]

function GameLoader() {
  const { progress: dreiProgress, active: dreiActive } = useProgress()
  const stage = useLoadingStore((s) => s.stage)
  const progress = useLoadingStore((s) => s.progress)
  const statusMessage = useLoadingStore((s) => s.statusMessage)
  const subMessage = useLoadingStore((s) => s.subMessage)
  const errorMessage = useLoadingStore((s) => s.errorMessage)
  const isReady = useLoadingStore((s) => s.isReady)
  const retry = useLoadingStore((s) => s.retry)
  const [faded, setFaded] = useState(false)

  // Track initial asset download progress into loading store
  useEffect(() => {
    if (dreiActive && stage === 'INITIALIZING') {
      useLoadingStore
        .getState()
        .setStage(
          'LOADING_ESSENTIAL_ASSETS',
          'Loading Essential Monocoque & Textures',
          'Fetching 3D geometries, materials, and audio samples...',
          Math.min(35, Math.round(dreiProgress * 0.35))
        )
    }
  }, [dreiActive, dreiProgress, stage])

  useEffect(() => {
    if (isReady) {
      const timer = setTimeout(() => setFaded(true), 600)
      return () => clearTimeout(timer)
    } else {
      setFaded(false)
    }
  }, [isReady])

  if (faded) return null

  const isError = stage === 'ERROR'

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07090e] transition-opacity duration-700 select-none ${
        isReady ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      <div className="flex flex-col items-center max-w-md px-6 text-center">
        {/* Calm Roads Branding */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF9D1E] animate-pulse shadow-[0_0_14px_#FF9D1E]" />
          <h1 className="text-2xl font-black tracking-widest text-[#FDFBF7] uppercase font-courier">
            CALM ROADS
          </h1>
        </div>
        <p className="text-[10px] text-[#FDFBF7]/50 tracking-widest font-special-elite uppercase mb-6">
          NFS Most Wanted-Inspired Driving Simulation
        </p>

        {/* Current State / Error Display */}
        {isError ? (
          <div className="flex flex-col items-center p-4 bg-red-950/40 border border-[#C63D2F] rounded-md max-w-sm">
            <span className="text-[12px] font-bold text-[#C63D2F] font-courier mb-1 uppercase tracking-wider">
              {statusMessage}
            </span>
            <p className="text-[10px] text-[#FDFBF7]/80 font-mono mb-3">{errorMessage || subMessage}</p>
            <button
              onClick={retry}
              className="px-4 py-1.5 text-xs font-bold font-courier text-[#FDFBF7] bg-[#C63D2F] hover:bg-[#a53225] rounded transition-colors shadow-md cursor-pointer"
            >
              RETRY INITIALIZATION
            </button>
          </div>
        ) : (
          <>
            {/* Stage Badge */}
            <div className="flex items-center gap-1.5 mb-3 px-2 py-0.5 rounded-xs bg-[#1e1e1e] border border-[#FF9D1E]/30 text-[9px] font-special-elite font-bold text-[#FF9D1E] tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9D1E] animate-ping" />
              <span>STAGE: {stage.replace(/_/g, ' ')}</span>
            </div>

            {/* Status Headings */}
            <h2 className="text-[13px] font-bold text-[#FDFBF7] font-courier tracking-wide mb-1">
              {statusMessage}
            </h2>
            <p className="text-[10px] text-[#FDFBF7]/60 font-special-elite tracking-wider mb-6 min-h-[2.5em] max-w-xs">
              {subMessage}
            </p>

            {/* Instrumental NFS-Style Beveled Progress Bar */}
            <div className="w-72 h-2.5 bg-[#14161a] rounded-[2px] overflow-hidden p-[2px] mb-2.5 border border-[#FDFBF7]/20 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#FF9D1E] to-[#FFA726] rounded-[1px] transition-all duration-300 ease-out shadow-[0_0_10px_#FF9D1E]"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>

            {/* Telemetry Status Bar */}
            <div className="flex justify-between w-72 text-[9px] font-courier text-[#FDFBF7]/50 tracking-wider">
              <span>INITIALIZING GPU PIPELINE</span>
              <span className="font-bold text-[#FF9D1E]">{Math.round(progress)}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const graphicsQuality = useGameStore((s) => s.graphicsQuality)
  const photoMode = useGameStore((s) => s.photoMode)

  return (
    <KeyboardControls map={keyboardMap}>
      {/* Root Fullscreen Container */}
      <div
        className="w-screen h-screen relative overflow-hidden bg-[#07090e]"
        style={{ width: '100vw', height: '100vh', position: 'fixed', inset: 0, overflow: 'hidden' }}
      >
        {/* Progressive Loading State (Z-50) */}
        <GameLoader />
        {/* WebGL 3D Canvas Layer (Z-0) */}
        <div
          className="absolute inset-0 z-0"
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <Canvas
            shadows
            dpr={graphicsQuality === 'low' ? 1 : graphicsQuality === 'medium' ? 1.4 : [1, 1.75]}
            camera={{ position: [0, 3, 8], fov: 55, near: 0.2, far: 4200 }}
            gl={{
              antialias: true,
              powerPreference: 'high-performance',
              preserveDrawingBuffer: photoMode,
              alpha: false,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.0,
              outputColorSpace: THREE.SRGBColorSpace,
            }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping
              gl.toneMappingExposure = 1.0
              gl.outputColorSpace = THREE.SRGBColorSpace
              gl.shadowMap.enabled = true
              gl.shadowMap.type = THREE.PCFSoftShadowMap
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <Suspense fallback={null}>
              <Experience />
            </Suspense>
          </Canvas>
        </div>

        {/* Interactive DOM UI Overlay Layer (Z-10) */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <Overlay />
        </div>
      </div>
    </KeyboardControls>
  )
}
