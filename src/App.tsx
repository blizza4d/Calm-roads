import { Component, ErrorInfo, ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import Experience from './components/3d/Experience'
import Overlay from './components/ui/Overlay'
import LoadingScreen from './components/ui/LoadingScreen'
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

interface CanvasErrorBoundaryProps {
  resetKey: number
  children: ReactNode
}

interface CanvasErrorBoundaryState {
  hasError: boolean
}

class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  constructor(props: CanvasErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true }
  }

  componentDidUpdate(prevProps: CanvasErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error('[CanvasErrorBoundary] Renderer initialization failed:', error)
    useLoadingStore
      .getState()
      .setError(
        `WebGL renderer failed to initialize: ${error?.message || 'Hardware graphics error'}`,
        'renderer',
        false
      )
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}

export default function App() {
  const graphicsQuality = useGameStore((s) => s.graphicsQuality)
  const photoMode = useGameStore((s) => s.photoMode)
  const retryCount = useLoadingStore((s) => s.retryCount)

  return (
    <KeyboardControls map={keyboardMap}>
      {/* Root Fullscreen Container */}
      <div
        className="w-screen h-screen relative overflow-hidden bg-[#07090e]"
        style={{ width: '100vw', height: '100vh', position: 'fixed', inset: 0, overflow: 'hidden' }}
      >
        {/* Cinematic Staged Loading Screen (Z-50, outside Canvas so it survives any Canvas suspension/failure) */}
        <LoadingScreen />

        {/* WebGL 3D Canvas Layer (Z-0) */}
        <div
          className="absolute inset-0 z-0"
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <CanvasErrorBoundary resetKey={retryCount}>
            <Canvas
              shadows
              dpr={graphicsQuality === 'low' ? 1 : graphicsQuality === 'medium' ? 1.4 : [1, 1.75]}
              camera={{ position: [0, 3, 8], fov: 55, near: 0.2, far: 4200 }}
              gl={{
                antialias: graphicsQuality !== 'low',
                powerPreference: 'high-performance',
                preserveDrawingBuffer: photoMode,
                alpha: false,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.0,
                outputColorSpace: THREE.SRGBColorSpace,
              }}
              onCreated={({ gl }) => {
                const glCtx = gl.getContext()
                if (!glCtx || glCtx.isContextLost()) {
                  useLoadingStore.getState().setError('WebGL context could not be initialized.', 'renderer', false)
                  return
                }
                gl.toneMapping = THREE.ACESFilmicToneMapping
                gl.toneMappingExposure = 1.0
                gl.outputColorSpace = THREE.SRGBColorSpace
                gl.shadowMap.enabled = graphicsQuality !== 'low'
                gl.shadowMap.type = THREE.PCFSoftShadowMap
              }}
              style={{ width: '100%', height: '100%' }}
            >
              <Experience />
            </Canvas>
          </CanvasErrorBoundary>
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
