import { Canvas } from '@react-three/fiber'
import { Suspense, useMemo } from 'react'
import { KeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import Experience from './components/3d/Experience'
import Overlay from './components/ui/Overlay'
import { DevelopmentDiagnostics } from './components/ui/DevelopmentDiagnostics'
import { useGameStore } from './store/useGameStore'
import { useLoadingStore } from './store/useLoadingStore'
import { getSpawnTransform } from './utils/roadMath'

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'brake', keys: ['ArrowDown', 's', 'S'] },
  { name: 'handbrake', keys: ['Space'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'burnout', keys: ['KeyB', 'b', 'B'] },
]

/**
 * GameErrorHandler:
 * Non-blocking error handler that only displays if an unrecoverable WebGL error occurs.
 * NEVER renders a fullscreen black overlay that blocks the 3D world.
 */
function GameErrorHandler() {
  const stage = useLoadingStore((s) => s.stage)
  const errorMessage = useLoadingStore((s) => s.errorMessage)
  const retry = useLoadingStore((s) => s.retry)

  if (stage !== 'ERROR') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 select-none p-4 pointer-events-auto">
      <div className="flex flex-col items-center p-6 bg-[#160b0c] border border-[#C63D2F] rounded-lg max-w-sm text-center shadow-2xl">
        <div className="w-3 h-3 rounded-full bg-[#C63D2F] animate-ping mb-2" />
        <h2 className="text-sm font-bold text-[#C63D2F] font-courier uppercase tracking-wider mb-2">
          Rendering Initialization Error
        </h2>
        <p className="text-[11px] text-[#FDFBF7]/90 font-mono mb-4 leading-relaxed">
          {errorMessage || 'A WebGL error interrupted the scene pipeline.'}
        </p>
        <button
          onClick={retry}
          className="px-5 py-2 text-xs font-bold font-courier text-[#FDFBF7] bg-[#C63D2F] hover:bg-[#a53225] rounded transition-colors shadow-md cursor-pointer"
        >
          RETRY INITIALIZATION
        </button>
      </div>
    </div>
  )
}

const GL_CONFIG: THREE.WebGLRendererParameters = {
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false,
  stencil: false,
  depth: true,
  preserveDrawingBuffer: false,
}

export default function App() {
  const graphicsQuality = useGameStore((s) => s.graphicsQuality)
  const startZ = useGameStore((s) => s.startZ)

  // Calculate spawn transform so camera initializes directly behind vehicle on frame 0
  const spawn = useMemo(() => getSpawnTransform(startZ, 0.36), [startZ])

  // Memoize initial camera configuration to eliminate R3F camera reconciliations
  const cameraConfig = useMemo(() => ({
    position: [spawn.x, spawn.y + 2.8, spawn.z + 6.8] as [number, number, number],
    fov: 55,
    near: 0.75,
    far: 3800,
  }), [spawn.x, spawn.y, spawn.z])

  return (
    <KeyboardControls map={keyboardMap}>
      {/* Root Fullscreen Container */}
      <div
        className="w-screen h-screen relative overflow-hidden bg-[#07090e]"
        style={{ width: '100vw', height: '100vh', position: 'fixed', inset: 0, overflow: 'hidden' }}
      >
        {/* Error Boundary Modal (Only visible on critical WebGL failure) */}
        <GameErrorHandler />

        {/* Real-time Development Diagnostics Overlay (F3 Toggle) */}
        <DevelopmentDiagnostics />

        {/* WebGL 3D Canvas Layer (Z-0) */}
        <div
          className="absolute inset-0 z-0"
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <Canvas
            shadows
            dpr={graphicsQuality === 'low' ? 1 : graphicsQuality === 'medium' ? 1.35 : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.75)}
            camera={cameraConfig}
            gl={GL_CONFIG}
            onCreated={({ gl, camera }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping
              gl.toneMappingExposure = 1.0
              gl.outputColorSpace = THREE.SRGBColorSpace
              gl.shadowMap.enabled = true
              gl.shadowMap.type = THREE.PCFSoftShadowMap
              camera.lookAt(spawn.x, spawn.y + 0.6, spawn.z - 15)
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <Suspense fallback={<group />}>
              <Experience />
            </Suspense>
          </Canvas>
        </div>

        {/* Subtle Cinematic Vignette Layer (Z-5) */}
        <div
          className="pointer-events-none absolute inset-0 z-5"
          style={{
            boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.28)',
            pointerEvents: 'none',
          }}
        />

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
