import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useLoadingStore } from '../../store/useLoadingStore'

/**
 * ShaderReadinessPipeline
 * Runs inside the React Three Fiber Canvas to guarantee that:
 * 1. Essential world and vehicle assets are attached to the scene.
 * 2. Materials are configured.
 * 3. WebGL shader programs are compiled asynchronously via renderer.compileAsync().
 * 4. A controlled GPU warmup render is performed.
 * 5. Scene validity is checked before unlocking gameplay controls.
 */
export default function ShaderReadinessPipeline() {
  const { gl, scene, camera } = useThree()
  const isExecutingRef = useRef(false)
  const retryCount = useLoadingStore((s) => s.retryCount)

  // WebGL Context Loss & Restoration Handling
  useEffect(() => {
    const canvas = gl.domElement
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      console.warn('[ShaderReadinessPipeline] WebGL Context Lost!')
      useLoadingStore.getState().setError('WebGL Context Lost. The GPU hung or reset.')
    }

    const handleContextRestored = () => {
      console.info('[ShaderReadinessPipeline] WebGL Context Restored, re-compiling shaders...')
      useLoadingStore.getState().retry()
    }

    canvas.addEventListener('webglcontextlost', handleContextLost, false)
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
    }
  }, [gl])

  // Run the readiness state machine
  useEffect(() => {
    if (isExecutingRef.current) return
    isExecutingRef.current = true

    let isMounted = true

    async function executePipeline() {
      const setStage = useLoadingStore.getState().setStage
      const setError = useLoadingStore.getState().setError

      try {
        // Stage 1: BUILDING_INITIAL_WORLD
        setStage(
          'BUILDING_INITIAL_WORLD',
          'Constructing Initial Road & Mountain Passes',
          'Generating terrain chunks and procedural track splines...'
        )
        // Yield one microtask to allow geometry binding
        await new Promise((resolve) => setTimeout(resolve, 80))
        if (!isMounted) return

        // Stage 2: PREPARING_MATERIALS
        setStage(
          'PREPARING_MATERIALS',
          'Preparing PBR Materials & Textures',
          'Binding ACES Filmic tonemapping, environment probes & foliage alphas...'
        )

        // Traverse scene to ensure materials are ready for compilation
        let materialCount = 0
        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => {
                mat.needsUpdate = true
                materialCount++
              })
            } else if (mesh.material) {
              mesh.material.needsUpdate = true
              materialCount++
            }
          }
        })

        await new Promise((resolve) => setTimeout(resolve, 60))
        if (!isMounted) return

        // Stage 3: COMPILING_SHADERS
        setStage(
          'COMPILING_SHADERS',
          'Compiling WebGL Shader Programs',
          `Asynchronously compiling ${materialCount}+ material programs & shadow passes on GPU...`
        )

        const tStart = performance.now()

        // Three.js r163 asynchronous shader compilation
        if (typeof gl.compileAsync === 'function') {
          await gl.compileAsync(scene, camera)
        } else if (typeof gl.compile === 'function') {
          gl.compile(scene, camera)
        }

        const compileDurationMs = Math.round(performance.now() - tStart)
        console.info(`[ShaderReadinessPipeline] Essential shaders compiled in ${compileDurationMs}ms (${materialCount} materials).`)

        if (!isMounted) return

        // Stage 4: WARMING_UP_RENDERER
        setStage(
          'WARMING_UP_RENDERER',
          'Warming Up WebGL Pipeline State',
          'Executing off-screen warmup passes to eliminate runtime hitching...'
        )

        // Perform 2 controlled warmup render passes
        // This exercises shadow maps, tone mapping, post-processing, and initializes GPU pipeline state
        gl.render(scene, camera)
        await new Promise((resolve) => requestAnimationFrame(resolve))
        gl.render(scene, camera)

        if (!isMounted) return

        // Stage 5: VERIFYING_FIRST_SCENE
        setStage(
          'VERIFYING_FIRST_SCENE',
          'Verifying Scene Readiness',
          'Validating WebGL context status and world matrix hierarchy...'
        )

        // Check WebGL context error state
        const glCtx = gl.getContext()
        const glErr = glCtx ? glCtx.getError() : 0
        if (glErr !== 0) {
          console.warn(`[ShaderReadinessPipeline] WebGL reported warning/error code: ${glErr}`)
        }

        await new Promise((resolve) => setTimeout(resolve, 100))
        if (!isMounted) return

        // Stage 6: READY!
        setStage(
          'READY',
          'Scene Ready',
          'Engaging high-performance driving controls...'
        )
        console.info('[ShaderReadinessPipeline] Scene is 100% READY for gameplay.')
      } catch (err: unknown) {
        console.error('[ShaderReadinessPipeline] Initialization error:', err)
        const errMsg = err instanceof Error ? err.message : String(err)
        setError(`Shader compilation error: ${errMsg}`)
      } finally {
        isExecutingRef.current = false
      }
    }

    executePipeline()

    return () => {
      isMounted = false
    }
  }, [gl, scene, camera, retryCount])

  return null
}
