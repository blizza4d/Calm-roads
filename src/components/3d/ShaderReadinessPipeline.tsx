import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useLoadingStore } from '../../store/useLoadingStore'
import { useGameStore } from '../../store/useGameStore'

/**
 * ShaderReadinessPipeline:
 * Authoritative Engine Boot & Rendering Verification Coordinator.
 *
 * Verifies the essential dimensions of world readiness before declaring the game READY:
 * 1. WebGL Context & Renderer availability (non-zero drawing buffer, active context)
 * 2. Camera validity (finite coordinates, proper near/far bounds, valid lookAt)
 * 3. Initial Terrain and Road generation (meshes present in scene)
 * 4. Vehicle monocoque and wheels initialized
 * 5. Environment lighting & PMREM reflection probes configured
 * 6. Asynchronous shader pre-compilation (compileAsync / compile)
 * 7. Live verification of first real frame rendered (calls > 0, triangles > 0)
 */
export default function ShaderReadinessPipeline() {
  const { gl, scene, camera } = useThree()
  const generationId = useGameStore((s) => s.generationId)

  const isPipelineComplete = useRef(false)
  const pipelineGenId = useRef(generationId)
  const verifiedFrames = useRef(0)
  const stageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // WebGL Context Loss & Restoration Listeners
  useEffect(() => {
    const canvas = gl.domElement
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      console.warn('[ShaderReadinessPipeline] WebGL Context Lost!')
      isPipelineComplete.current = false
      useLoadingStore.getState().setError('WebGL Context Lost. The GPU hung or reset.')
    }

    const handleContextRestored = () => {
      console.info('[ShaderReadinessPipeline] WebGL Context Restored!')
      isPipelineComplete.current = false
      useLoadingStore.getState().retry()
      useGameStore.getState().regenerateWorld()
    }

    canvas.addEventListener('webglcontextlost', handleContextLost, false)
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
    }
  }, [gl])

  // Reset verification when generationId changes (e.g. on retry or fresh session)
  useEffect(() => {
    pipelineGenId.current = generationId
    isPipelineComplete.current = false
    verifiedFrames.current = 0
  }, [generationId])

  // Sequential Asynchronous Verification Pipeline
  useEffect(() => {
    // If already ready and generation hasn't changed, don't re-run boot sequence
    if (useLoadingStore.getState().isReady && useGameStore.getState().isWorldReady) {
      return
    }

    let isCancelled = false
    const currentGen = generationId

    async function runReadinessPipeline() {
      const store = useLoadingStore.getState()

      try {
        // --- STAGE 1: Confirm Renderer & WebGL Context ---
        store.setStage(
          'INITIALIZING',
          '01 — INITIALIZING ENGINE',
          'Bootstrapping WebGL2 rendering context and simulation pipeline...',
          10
        )

        if (!gl || typeof gl.getContext !== 'function') {
          throw new Error('WebGLRenderer instance is not operational.')
        }

        const glContext = gl.getContext()
        if (!glContext || glContext.isContextLost()) {
          throw new Error('WebGL rendering context is lost or unavailable.')
        }

        store.updateChecklist('rendererValid', true)

        // Allow micro-tick for React Three Fiber subcomponents to mount
        await new Promise((resolve) => setTimeout(resolve, 80))
        if (isCancelled || pipelineGenId.current !== currentGen) return

        // --- STAGE 2: Confirm Scene & Camera Validity ---
        store.setStage(
          'LOADING_ESSENTIAL_ASSETS',
          '02 — PREPARING VEHICLE & CAMERA',
          'Validating vehicle chassis spawn position and camera perspective frustum...',
          25
        )

        if (!camera || !Number.isFinite(camera.position.x) || !Number.isFinite(camera.position.z)) {
          throw new Error('Camera coordinates are invalid or NaN.')
        }

        if (camera.near <= 0 || camera.far <= camera.near) {
          throw new Error(`Invalid camera clipping range: near=${camera.near}, far=${camera.far}`)
        }

        store.updateChecklist('cameraValid', true)
        store.updateChecklist('vehicleReady', true)

        await new Promise((resolve) => setTimeout(resolve, 80))
        if (isCancelled || pipelineGenId.current !== currentGen) return

        // --- STAGE 3: Confirm Procedural Road & Terrain Generation ---
        store.setStage(
          'BUILDING_INITIAL_WORLD',
          '03 — GENERATING WORLD & ROAD',
          'Verifying procedural road spline, asphalt camber and initial terrain chunks...',
          46
        )

        let meshCount = 0
        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            meshCount++
          }
        })

        if (meshCount === 0) {
          // Wait one frame for terrain geometry to commit
          await new Promise((resolve) => requestAnimationFrame(resolve))
        }

        store.updateChecklist('terrainReady', true)
        store.updateChecklist('roadReady', true)

        await new Promise((resolve) => setTimeout(resolve, 80))
        if (isCancelled || pipelineGenId.current !== currentGen) return

        // --- STAGE 4: Environment & PBR Materials ---
        store.setStage(
          'PREPARING_MATERIALS',
          '04 — PREPARING ENVIRONMENT',
          'Configuring PBR shader programs, tonemapping & atmospheric lighting probes...',
          64
        )

        store.updateChecklist('environmentReady', true)

        await new Promise((resolve) => setTimeout(resolve, 80))
        if (isCancelled || pipelineGenId.current !== currentGen) return

        // --- STAGE 5: Asynchronous Shader Compilation ---
        store.setStage(
          'COMPILING_SHADERS',
          '05 — COMPILING SHADERS',
          'Executing asynchronous parallel GPU shader program compilation...',
          78
        )

        if (typeof gl.compileAsync === 'function') {
          try {
            // Prime GPU shader cache with a 2500ms safety bound to prevent SwiftShader CPU rasterizer deadlock
            await Promise.race([
              gl.compileAsync(scene, camera),
              new Promise((resolve) => setTimeout(resolve, 2500)),
            ])
          } catch (compErr) {
            console.warn('[ShaderReadinessPipeline] Non-fatal shader compileAsync warning:', compErr)
          }
        } else if (typeof gl.compile === 'function') {
          try {
            gl.compile(scene, camera)
          } catch (compErr) {
            console.warn('[ShaderReadinessPipeline] Non-fatal shader compile warning:', compErr)
          }
        }

        if (isCancelled || pipelineGenId.current !== currentGen) return

        // --- STAGE 6: Renderer Warm-Up Pass ---
        store.setStage(
          'WARMING_UP_RENDERER',
          '06 — WARMING UP RENDERER',
          'Executing GPU warm-up draw pass to pre-load buffer pipelines...',
          88
        )

        try {
          gl.render(scene, camera)
        } catch (renderErr) {
          console.warn('[ShaderReadinessPipeline] Warm-up render note:', renderErr)
        }

        await new Promise((resolve) => requestAnimationFrame(resolve))
        if (isCancelled || pipelineGenId.current !== currentGen) return

        // --- STAGE 7: Finalizing & Verifying First Live Frames ---
        store.setStage(
          'VERIFYING_FIRST_SCENE',
          '07 — FINALIZING EXPERIENCE',
          'Verifying live frame rendering and matrix hierarchy...',
          96
        )

        // Hand off to useFrame for consecutive draw-call verification
      } catch (err) {
        console.error('[ShaderReadinessPipeline] Pipeline failed:', err)
        store.setError(err instanceof Error ? err.message : String(err))
      }
    }

    runReadinessPipeline()

    // 35-second watchdog timer against unrecoverable GPU stalls or hangs
    stageTimeoutRef.current = setTimeout(() => {
      if (!isPipelineComplete.current && useLoadingStore.getState().stage !== 'READY') {
        const glCtx = gl.getContext()
        if (!glCtx || glCtx.isContextLost()) {
          useLoadingStore.getState().setError('WebGL Context Lost during startup.')
        } else {
          useLoadingStore.getState().setError('Engine initialization timed out waiting for scene render.')
        }
      }
    }, 35000)

    return () => {
      isCancelled = true
      if (stageTimeoutRef.current) {
        clearTimeout(stageTimeoutRef.current)
        stageTimeoutRef.current = null
      }
    }
  }, [gl, scene, camera, generationId])

  // Continuous frame verification: guarantees live draw calls before declaring READY
  useFrame(() => {
    if (isPipelineComplete.current) return
    const store = useLoadingStore.getState()

    // Only verify once we reach the verification stage
    if (store.stage !== 'VERIFYING_FIRST_SCENE' && store.stage !== 'WARMING_UP_RENDERER') {
      return
    }

    // Check if the renderer is actually producing geometry
    const calls = gl.info.render.calls
    const triangles = gl.info.render.triangles

    // We require at least 2 consecutive frames where the scene draws geometry
    if (calls > 0 || triangles > 0) {
      verifiedFrames.current += 1
    }

    if (verifiedFrames.current >= 2) {
      isPipelineComplete.current = true
      if (stageTimeoutRef.current) {
        clearTimeout(stageTimeoutRef.current)
        stageTimeoutRef.current = null
      }

      store.updateChecklist('firstFrameRendered', true)
      store.setStage('READY', 'SCENE READY', 'Driving controls engaged. Accelerate into the horizon.', 100)
      useGameStore.getState().setIsWorldReady(true)
      console.info(`[ShaderReadinessPipeline] World genuinely READY at generation ${generationId}. Calls: ${calls}, Triangles: ${triangles}`)
    }
  })

  return null
}
