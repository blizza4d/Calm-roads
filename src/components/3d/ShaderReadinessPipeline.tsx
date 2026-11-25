import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { useLoadingStore } from '../../store/useLoadingStore'
import { useGameStore } from '../../store/useGameStore'
import { worldReadinessRegistry, ESSENTIAL_SPAWN_CHUNK_ZS } from '../../utils/loadingRegistry'
import { preloadSelectedVehicleAssets, getRequiredGlbUrlsForVehicle } from './Vehicles/CarModels'
import { VEHICLE_CONFIGS } from './Vehicles/VehicleController'
import { warmEssentialTextures } from '../../utils/asphaltTexture'
import { getRoadCenter, getRoadElevation, getSurfaceHeight, getActiveBiomeAt } from '../../utils/roadMath'
import { audioSystem } from '../../utils/audioSystem'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * ShaderReadinessPipeline (Staged World Initialization Orchestrator)
 * Runs inside the React Three Fiber Canvas and orchestrates deterministic staged loading:
 * 1. Renderer & WebGL pipeline verification
 * 2. Selective vehicle asset acquisition, mounting & ErrorBoundary checks
 * 3. Non-blocking procedural surface textures & staged spawn terrain/road chunks
 * 4. Environment, lighting, weather, camera alignment & optional background audio
 * 5. Asynchronous GPU shader compilation & warmup frame execution
 * 6. Strict final world readiness validation before releasing the loading screen
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
      useLoadingStore.getState().setError('WebGL Context Lost. The GPU driver reset.', 'renderer', false)
    }

    const handleContextRestored = () => {
      console.info('[ShaderReadinessPipeline] WebGL Context Restored, re-initializing world...')
      useLoadingStore.getState().retry()
    }

    canvas.addEventListener('webglcontextlost', handleContextLost, false)
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
    }
  }, [gl])

  // Authoritative Staged World Initialization State Machine
  useEffect(() => {
    if (isExecutingRef.current) return
    isExecutingRef.current = true

    const runId = worldReadinessRegistry.beginRun()
    let isMounted = true
    const isCancelled = () =>
      !isMounted ||
      worldReadinessRegistry.runId !== runId ||
      useLoadingStore.getState().stage === 'ERROR'

    async function executePipeline() {
      const store = useLoadingStore.getState()
      const { setStage, updateTask, setError, recordFirstFrame, markReady } = store

      try {
        // =========================================================================
        // STAGE 1 & 2: APPLICATION & RENDERER INITIALIZATION
        // =========================================================================
        setStage(
          'PREPARING_RENDERER',
          'Preparing WebGL Renderer',
          'Verifying hardware WebGL2 context, shadow buffers & ACES tone mapping...'
        )
        updateTask('renderer', { status: 'in_progress', progress: 25, detail: 'Inspecting GPU capabilities...' })

        const glCtx = gl.getContext()
        if (!glCtx || glCtx.isContextLost()) {
          setError('WebGL2 rendering context could not be acquired or was lost.', 'renderer', false)
          return
        }

        worldReadinessRegistry.gl = gl
        worldReadinessRegistry.scene = scene
        worldReadinessRegistry.camera = camera
        worldReadinessRegistry.rendererReady = true

        await nextFrame()
        if (isCancelled()) return

        updateTask('renderer', {
          status: 'complete',
          progress: 100,
          detail: 'WebGL2 ACES Pipeline Active',
        })

        // =========================================================================
        // STAGE 3: SELECTED VEHICLE INITIALIZATION
        // =========================================================================
        const gameState = useGameStore.getState()
        const selectedVehicle = gameState.vehicleModel
        const vehicleCfg = VEHICLE_CONFIGS[selectedVehicle] || VEHICLE_CONFIGS.bmw_m3

        setStage(
          'LOADING_VEHICLE',
          `Preparing ${vehicleCfg.name}`,
          'Downloading vehicle monocoque, wheels, PBR materials, and drivetrain...'
        )
        updateTask('vehicle', {
          status: 'in_progress',
          progress: 5,
          detail: `${vehicleCfg.name} • Initializing`,
        })

        // Trigger download ONLY for the selected vehicle (never blocks on unselected vehicles)
        const requiredVehicleUrls = getRequiredGlbUrlsForVehicle(selectedVehicle)
        useProgress.setState({ errors: [], active: false, progress: 0 })
        if (!worldReadinessRegistry.vehicleAllowFallback) {
          preloadSelectedVehicleAssets(selectedVehicle)
        }

        const vehicleWaitStart = performance.now()
        const VEHICLE_TIMEOUT_MS = 45000
        let slowNoticeApplied = false

        while (!isCancelled()) {
          if (worldReadinessRegistry.vehicleError && !worldReadinessRegistry.vehicleAllowFallback) {
            setError(worldReadinessRegistry.vehicleError, 'vehicle', true)
            return
          }

          const hasLoadedAsset =
            worldReadinessRegistry.vehicleAssetLoaded &&
            (worldReadinessRegistry.vehicleLoadedType === selectedVehicle ||
              worldReadinessRegistry.vehicleAllowFallback)

          if (hasLoadedAsset && worldReadinessRegistry.vehicleTransformReady) {
            break
          }

          const dreiProg = useProgress.getState()
          if (dreiProg.errors && dreiProg.errors.length > 0 && !worldReadinessRegistry.vehicleAllowFallback) {
            setError(`Failed to load vehicle resource: ${dreiProg.errors[0]}`, 'vehicle', true)
            return
          }

          const elapsed = performance.now() - vehicleWaitStart
          if (elapsed > VEHICLE_TIMEOUT_MS) {
            setError(
              `Timed out loading ${vehicleCfg.name} 3D assets after ${Math.round(elapsed / 1000)}s.`,
              'vehicle',
              true
            )
            return
          }

          if (elapsed > 5000 && !slowNoticeApplied) {
            slowNoticeApplied = true
            setStage(
              'LOADING_VEHICLE',
              `Preparing ${vehicleCfg.name}`,
              'Slow network detected — downloading high-detail vehicle geometry...'
            )
          }

          // Honest measurable byte-stream progress clamped below 95% until React commits meshes
          const byteStats = worldReadinessRegistry.getVehicleDownloadStats(requiredVehicleUrls)
          const rawDlPct = byteStats.totalBytes > 0 ? byteStats.pct : dreiProg.total > 0 ? dreiProg.progress : 0
          const dlPct =
            rawDlPct > 0
              ? Math.max(5, Math.min(94, Math.round(rawDlPct * 0.94)))
              : Math.min(20, Math.round(5 + (elapsed / 2500) * 10))

          const mbDetail =
            byteStats.totalBytes > 0
              ? `${vehicleCfg.name} • ${(byteStats.loadedBytes / 1048576).toFixed(1)} MB (${byteStats.pct}%)`
              : `${vehicleCfg.name} • Loading geometry`

          updateTask('vehicle', {
            status: 'in_progress',
            progress: dlPct,
            detail: mbDetail,
          })

          await nextFrame()
        }

        if (isCancelled()) return

        // Validate vehicle mesh geometry actually mounted in scene graph
        let vehicleMeshCount = 0
        if (worldReadinessRegistry.vehicleGroup) {
          worldReadinessRegistry.vehicleGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              vehicleMeshCount++
            }
          })
        }
        if (vehicleMeshCount === 0) {
          setError(`${vehicleCfg.name} mounted with 0 renderable meshes.`, 'vehicle', true)
          return
        }

        updateTask('vehicle', {
          status: 'complete',
          progress: 100,
          detail: `${vehicleCfg.name} Ready (${vehicleMeshCount} meshes)`,
        })

        // =========================================================================
        // STAGE 4: WORLD, TEXTURES, TERRAIN & ROAD GENERATION
        // =========================================================================
        setStage(
          'BUILDING_INITIAL_WORLD',
          'Generating World & Highway Corridor',
          'Synthesizing surface textures, spawn terrain chunks, road splines, and collision...'
        )
        updateTask('terrain', { status: 'in_progress', progress: 5, detail: 'Preparing terrain textures...' })
        updateTask('road', { status: 'in_progress', progress: 5, detail: 'Preparing asphalt maps...' })

        // Pre-warm procedural CanvasTextures cleanly across frames (0 freeze)
        await warmEssentialTextures((label, pct) => {
          if (isCancelled()) return
          const scaled = Math.round(pct * 0.3)
          updateTask('terrain', { status: 'in_progress', progress: scaled, detail: label })
          updateTask('road', { status: 'in_progress', progress: scaled, detail: label })
        })
        if (isCancelled()) return
        worldReadinessRegistry.texturesReady = true

        // Wait until all 5 essential spawn chunks (+200m to -600m) are built 1-per-frame and geometry-validated
        const worldWaitStart = performance.now()
        const WORLD_TIMEOUT_MS = 18000
        const targetSpawnChunks = ESSENTIAL_SPAWN_CHUNK_ZS.length

        while (!isCancelled()) {
          if (worldReadinessRegistry.terrainError) {
            setError(worldReadinessRegistry.terrainError, 'terrain', false)
            return
          }

          const readyChunks = worldReadinessRegistry.getEssentialChunksReadyCount()
          const chunkPct = 30 + Math.round((readyChunks / targetSpawnChunks) * 70)

          updateTask('terrain', {
            status: 'in_progress',
            progress: chunkPct,
            detail: `Spawn chunks ${readyChunks} / ${targetSpawnChunks}`,
          })
          updateTask('road', {
            status: 'in_progress',
            progress: chunkPct,
            detail: `Highway segments ${readyChunks} / ${targetSpawnChunks}`,
          })

          if (readyChunks >= targetSpawnChunks) {
            break
          }

          if (performance.now() - worldWaitStart > WORLD_TIMEOUT_MS) {
            setError('Timed out building initial road and terrain chunks.', 'terrain', false)
            return
          }

          await nextFrame()
        }

        if (isCancelled()) return

        updateTask('terrain', {
          status: 'complete',
          progress: 100,
          detail: `${targetSpawnChunks} / ${targetSpawnChunks} spawn chunks validated`,
        })
        updateTask('road', {
          status: 'complete',
          progress: 100,
          detail: '1,000m corridor & collision ready',
        })

        // =========================================================================
        // STAGE 5: ENVIRONMENT, LIGHTING, AUDIO & GPU SHADER COMPILATION
        // =========================================================================
        setStage(
          'PREPARING_ENVIRONMENT',
          'Preparing Atmosphere & Reflections',
          'Binding sky dome, shadows, weather system, and camera perspective...'
        )
        updateTask('environment', { status: 'in_progress', progress: 30, detail: 'Aligning lighting & sky...' })

        // Ensure environment & camera mounted cleanly
        const envWaitStart = performance.now()
        while (!isCancelled()) {
          if (worldReadinessRegistry.environmentReady && worldReadinessRegistry.cameraReady) {
            break
          }
          if (performance.now() - envWaitStart > 8000) {
            setError('Timed out waiting for sky, atmosphere, and camera initialization.', 'environment', false)
            return
          }
          await nextFrame()
        }
        if (isCancelled()) return

        // Launch non-blocking audio initialization now that critical GLBs/world are finished
        updateTask('audio', { status: 'in_progress', progress: 25, detail: 'Decoding engine audio profiles...' })
        audioSystem
          .init()
          .then(() => {
            useLoadingStore.getState().updateTask('audio', {
              status: 'complete',
              progress: 100,
              detail: 'Spatial engine audio ready',
            })
          })
          .catch(() => {
            useLoadingStore.getState().updateTask('audio', {
              status: 'complete',
              progress: 100,
              detail: 'Audio awaiting user interaction',
            })
          })

        updateTask('environment', {
          status: 'complete',
          progress: 100,
          detail: 'Sky, IBL & weather ready',
        })

        // Collect scene material counts without forcing .needsUpdate = true
        let materialCount = 0
        const seenMaterials = new Set<THREE.Material>()
        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => seenMaterials.add(m))
            } else if (mesh.material) {
              seenMaterials.add(mesh.material)
            }
          }
        })
        materialCount = seenMaterials.size

        setStage(
          'COMPILING_SHADERS',
          'Compiling GPU Shader Programs',
          `Compiling ${materialCount} PBR materials, atmospheric fog, and shadow passes...`
        )
        updateTask('shaders', {
          status: 'in_progress',
          progress: 25,
          detail: `Compiling ${materialCount} materials...`,
        })

        const tCompileStart = performance.now()
        if (typeof gl.compileAsync === 'function') {
          await gl.compileAsync(scene, camera)
        } else if (typeof gl.compile === 'function') {
          gl.compile(scene, camera)
        }
        if (isCancelled()) return

        worldReadinessRegistry.shadersCompiled = true
        const compileDurationMs = Math.max(1, Math.round(performance.now() - tCompileStart))

        updateTask('shaders', {
          status: 'in_progress',
          progress: 80,
          detail: `Warming up frame (${compileDurationMs}ms)...`,
        })

        // Render genuine warmup frames behind the loading screen with real vehicle & world mounted
        gl.render(scene, camera)
        await nextFrame()
        if (isCancelled()) return
        worldReadinessRegistry.firstFrameRendered = true
        recordFirstFrame()
        gl.render(scene, camera)

        const glErrAfterWarmup = glCtx.getError()
        if (glCtx.isContextLost()) {
          setError('WebGL context lost during GPU shader warmup.', 'shaders', false)
          return
        }
        if (glErrAfterWarmup !== 0) {
          console.warn(`[ShaderReadinessPipeline] Non-fatal WebGL code after warmup: ${glErrAfterWarmup}`)
        }

        updateTask('shaders', {
          status: 'complete',
          progress: 100,
          detail: `${materialCount} materials (${compileDurationMs}ms)`,
        })

        // =========================================================================
        // STAGE 6: FINAL READINESS VALIDATION
        // =========================================================================
        setStage(
          'VERIFYING_WORLD',
          'Validating World Readiness',
          'Confirming spawn safety, terrain grounding, collision, and first frame...'
        )
        updateTask('validation', { status: 'in_progress', progress: 40, detail: 'Running final checks...' })

        // 1. Validate Vehicle exists & is positioned above ground
        const vGroup = worldReadinessRegistry.vehicleGroup
        if (!vGroup || !worldReadinessRegistry.vehicleTransformReady) {
          setError('Vehicle controller failed spawn transform verification.', 'validation', false)
          return
        }
        const vx = vGroup.position.x
        const vy = vGroup.position.y
        const vz = vGroup.position.z
        const activeBiome = getActiveBiomeAt(vz, gameState.biome).id
        const groundY = getSurfaceHeight(vx, vz, activeBiome)
        const roadY = getRoadElevation(vz)
        const roadCenter = getRoadCenter(vz)

        if (!Number.isFinite(vx) || !Number.isFinite(vy) || !Number.isFinite(vz) || !Number.isFinite(roadY) || !Number.isFinite(roadCenter)) {
          setError('Non-finite spawn coordinates detected during world validation.', 'validation', false)
          return
        }
        if (vy < groundY - 0.5) {
          setError(`Vehicle spawned below terrain surface (${vy.toFixed(2)} < ${groundY.toFixed(2)}).`, 'validation', false)
          return
        }

        // 2. Validate essential spawn terrain + road chunks
        const verifiedChunkCount = worldReadinessRegistry.getEssentialChunksReadyCount()
        if (verifiedChunkCount < targetSpawnChunks) {
          setError(
            `Essential spawn chunks incomplete (${verifiedChunkCount}/${targetSpawnChunks}).`,
            'validation',
            false
          )
          return
        }

        // 3. Validate camera & first rendered frame
        if (
          !Number.isFinite(camera.position.x) ||
          !Number.isFinite(camera.position.y) ||
          !Number.isFinite(camera.position.z) ||
          !worldReadinessRegistry.firstFrameRendered
        ) {
          setError('Camera or first rendered frame check failed.', 'validation', false)
          return
        }

        updateTask('validation', {
          status: 'complete',
          progress: 100,
          detail: 'All world systems verified',
        })

        // Track optional distant horizon streaming that proceeds smoothly after READY
        const quality = useGameStore.getState().graphicsQuality
        const targetHorizon = quality === 'low' ? 12 : quality === 'medium' ? 16 : 20
        updateTask('distant_world', {
          status: 'in_progress',
          progress: 0,
          detail: `${targetSpawnChunks} / ${targetHorizon} chunks streaming`,
        })

        await nextFrame()
        if (isCancelled()) return

        markReady()
        const m = useLoadingStore.getState().metrics
        console.info(
          `[ShaderReadinessPipeline] World READY in ${m.playableReadyMs}ms (UI: ${m.loadingScreenMountedMs}ms, FirstFrame: ${m.firstFrameMs}ms, Shaders: ${compileDurationMs}ms).`
        )
      } catch (err: unknown) {
        if (!isMounted || worldReadinessRegistry.runId !== runId) return
        console.error('[ShaderReadinessPipeline] Fatal initialization error:', err)
        const errMsg = err instanceof Error ? err.message : String(err)
        setError(`Initialization error: ${errMsg}`, 'validation', false)
      } finally {
        if (worldReadinessRegistry.runId === runId) {
          isExecutingRef.current = false
        }
      }
    }

    executePipeline()

    return () => {
      isMounted = false
      isExecutingRef.current = false
    }
  }, [gl, scene, camera, retryCount])

  return null
}
