import { Canvas } from '@react-three/fiber'
import { Suspense, useState, useEffect } from 'react'
import { KeyboardControls, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import Experience from './components/3d/Experience'
import Overlay from './components/ui/Overlay'
import { useGameStore } from './store/useGameStore'

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'brake', keys: ['Space'] },
  { name: 'burnout', keys: ['KeyB', 'b', 'B'] },
]

function GameLoader() {
  const { progress, active } = useProgress()
  const [faded, setFaded] = useState(false)

  useEffect(() => {
    if (!active && progress >= 100) {
      const timer = setTimeout(() => setFaded(true), 500)
      return () => clearTimeout(timer)
    } else {
      setFaded(false)
    }
  }, [active, progress])

  if (faded) return null

  let milestone = 'Initializing Engine & World Physics...'
  if (progress > 25 && progress < 60) milestone = 'Generating Road & Mountain Passes...'
  else if (progress >= 60 && progress < 90) milestone = 'Loading Vehicle Monocoque & Materials...'
  else if (progress >= 90) milestone = 'Finalizing Shaders & Atmosphere...'

  const isComplete = !active && progress >= 100

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07090e] transition-opacity duration-700 pointer-events-none select-none ${
        isComplete ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center max-w-sm px-6 text-center">
        {/* Calm Roads Branding */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#14b8a6] animate-pulse shadow-[0_0_12px_#14b8a6]" />
          <h1 className="text-2xl font-black tracking-widest text-white uppercase font-mono">
            CALM ROADS
          </h1>
        </div>
        <p className="text-[11px] text-white/50 tracking-wider font-mono uppercase mb-8">
          Atmospheric Procedural Driving Experience
        </p>

        {/* Minimal Progress Bar */}
        <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden p-0.5 mb-3 border border-white/10">
          <div
            className="h-full bg-[#14b8a6] rounded-full transition-all duration-200 ease-out shadow-[0_0_8px_#14b8a6]"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>

        {/* Real Loading Milestones & Percentage */}
        <div className="flex justify-between w-64 text-[10px] font-mono text-white/60">
          <span>{milestone}</span>
          <span className="font-bold text-[#14b8a6]">{Math.round(progress)}%</span>
        </div>
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
