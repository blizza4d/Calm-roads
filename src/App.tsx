import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { KeyboardControls } from '@react-three/drei'
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
]

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
              toneMappingExposure: 1.15,
              outputColorSpace: THREE.SRGBColorSpace,
            }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping
              gl.toneMappingExposure = 1.15
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
