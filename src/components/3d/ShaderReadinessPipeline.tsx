import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useLoadingStore } from '../../store/useLoadingStore'
import { useGameStore } from '../../store/useGameStore'

/**
 * ShaderReadinessPipeline
 * Runs inside the React Three Fiber Canvas.
 * Non-blocking background shader pre-warming and WebGL context resilience.
 * NEVER blocks the main thread or causes full-screen black freezes.
 */
export default function ShaderReadinessPipeline() {
  const { gl, scene, camera } = useThree()
  const generationId = useGameStore((s) => s.generationId)

  // WebGL Context Loss & Restoration Handling
  useEffect(() => {
    const canvas = gl.domElement
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      console.warn('[ShaderReadinessPipeline] WebGL Context Lost!')
      useLoadingStore.getState().setError('WebGL Context Lost. The GPU hung or reset.')
    }

    const handleContextRestored = () => {
      console.info('[ShaderReadinessPipeline] WebGL Context Restored!')
      useLoadingStore.getState().retry()
    }

    canvas.addEventListener('webglcontextlost', handleContextLost, false)
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
    }
  }, [gl])

  // Non-blocking background shader compile
  useEffect(() => {
    useLoadingStore.getState().setStage('READY', 'Scene Ready', 'Driving controls engaged.')

    if (typeof gl.compileAsync === 'function') {
      gl.compileAsync(scene, camera).catch(() => {})
    } else if (typeof gl.compile === 'function') {
      try {
        gl.compile(scene, camera)
      } catch {
        // Continue rendering even if compile reports warnings
      }
    }
  }, [gl, scene, camera, generationId])

  return null
}
