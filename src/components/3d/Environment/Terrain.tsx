import { useState, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore, useTelemetryStore } from '../../../store/useGameStore'
import { useLoadingStore } from '../../../store/useLoadingStore'
import { ESSENTIAL_SPAWN_CHUNK_ZS } from '../../../utils/loadingRegistry'
import { getActiveBiomeAt } from '../../../utils/roadMath'
import { TerrainChunkTile } from './terrain/TerrainChunkTile'
import { sharedFoliageUniforms } from './terrain/terrainMaterials'
import { CHUNK_LEN } from './terrain/terrainGeometryBuilder'

// Predictive High-Speed World Horizon Streaming Engine:
// Staged Loading: mounts 5 essential spawn chunks (+200m to -600m) incrementally during Stage 4
// so the loading UI stays 100% responsive, then streams distant horizon chunks (up to 12-20)
// progressively in the background once gameplay begins.
const CHUNKS_BEHIND = 2

export default function Terrain() {
  const biome = useGameStore((state) => state.biome)
  const weather = useGameStore((state) => state.weather)
  const graphicsQuality = useGameStore((state) => state.graphicsQuality)
  const setDiagnostics = useGameStore((state) => state.setDiagnostics)
  const loadingStage = useLoadingStore((s) => s.stage)
  const isLoadingReady = useLoadingStore((s) => s.isReady)
  const retryCount = useLoadingStore((s) => s.retryCount)
  const { camera } = useThree()
  const diagCounter = useRef(0)
  const expandThrottle = useRef(0)
  const bgReportedDoneRef = useRef(false)

  const targetChunkCount = graphicsQuality === 'low' ? 12 : graphicsQuality === 'medium' ? 16 : 20

  // Start empty so Stage 1-3 execute with zero blocking terrain work;
  // Stage 4 mounts essential spawn chunks 1-per-frame cleanly.
  const [chunkSlots, setChunkSlots] = useState<number[]>([])

  const slotsRef = useRef<number[]>(chunkSlots)
  slotsRef.current = chunkSlots
  const lastCamZ = useRef<number>(camera.position.z)

  useEffect(() => {
    if (retryCount > 0) {
      bgReportedDoneRef.current = false
      slotsRef.current = []
      setChunkSlots([])
    }
  }, [retryCount])

  useFrame((state) => {
    sharedFoliageUniforms.uTime.value = state.clock.getElapsedTime()

    // Stage 4: Incrementally generate essential spawn chunks (1 per animation frame -> zero main-thread freeze)
    if (!isLoadingReady) {
      if (
        (loadingStage === 'BUILDING_INITIAL_WORLD' ||
          loadingStage === 'PREPARING_ENVIRONMENT' ||
          loadingStage === 'COMPILING_SHADERS') &&
        slotsRef.current.length < ESSENTIAL_SPAWN_CHUNK_ZS.length
      ) {
        const nextChunkZ = ESSENTIAL_SPAWN_CHUNK_ZS[slotsRef.current.length]
        const nextSlots = [...slotsRef.current, nextChunkZ]
        slotsRef.current = nextSlots
        setChunkSlots(nextSlots)
      }
      return
    }

    const camZ = camera.position.z

    // 1. Detect Vehicle Reset or Teleport (camZ jump > 150m)
    if (Math.abs(camZ - lastCamZ.current) > 150 && slotsRef.current.length > 0) {
      const centerChunkZ = Math.round(camZ / CHUNK_LEN) * CHUNK_LEN
      const recentered: number[] = []
      const currentCount = slotsRef.current.length
      for (let i = 0; i < currentCount; i++) {
        recentered.push(centerChunkZ + (CHUNKS_BEHIND - i) * CHUNK_LEN)
      }
      slotsRef.current = recentered
      setChunkSlots(recentered)
      lastCamZ.current = camZ
      return
    }
    lastCamZ.current = camZ

    // 1b. Optional Background Horizon Enhancement: Progressively stream distant chunks after READY
    if (slotsRef.current.length < targetChunkCount) {
      expandThrottle.current++
      if (expandThrottle.current >= 4) {
        expandThrottle.current = 0
        let minZ = slotsRef.current.length > 0 ? slotsRef.current[0] : 0
        for (let i = 1; i < slotsRef.current.length; i++) {
          if (slotsRef.current[i] < minZ) minZ = slotsRef.current[i]
        }
        const nextSlots = [...slotsRef.current, minZ - CHUNK_LEN]
        slotsRef.current = nextSlots
        setChunkSlots(nextSlots)

        const extraDone = nextSlots.length - ESSENTIAL_SPAWN_CHUNK_ZS.length
        const extraTotal = Math.max(1, targetChunkCount - ESSENTIAL_SPAWN_CHUNK_ZS.length)
        const pct = Math.min(99, Math.round((extraDone / extraTotal) * 100))
        useLoadingStore.getState().updateTask('distant_world', {
          status: nextSlots.length >= targetChunkCount ? 'complete' : 'in_progress',
          progress: nextSlots.length >= targetChunkCount ? 100 : pct,
          detail: `${nextSlots.length} / ${targetChunkCount} chunks streamed`,
        })
        return
      }
    } else if (!bgReportedDoneRef.current) {
      bgReportedDoneRef.current = true
      useLoadingStore.getState().updateTask('distant_world', {
        status: 'complete',
        progress: 100,
        detail: `${targetChunkCount} / ${targetChunkCount} chunks active`,
      })
    }

    if (slotsRef.current.length === 0) return

    // 2. High-Speed Predictive Forward Horizon Streaming (Max 1 chunk recycled per frame for silky 60fps)
    const totalSlots = slotsRef.current.length
    let rearmostIdx = 0
    let rearmostZ = slotsRef.current[0]
    let frontmostIdx = 0
    let frontmostZ = slotsRef.current[0]

    for (let i = 0; i < totalSlots; i++) {
      const z = slotsRef.current[i]
      if (z > rearmostZ) {
        rearmostZ = z
        rearmostIdx = i
      }
      if (z < frontmostZ) {
        frontmostZ = z
        frontmostIdx = i
      }
    }

    // Forward driving retire threshold: safely past chase camera and rear-view sightline
    const retireRearThreshold = camZ + (CHUNKS_BEHIND + 0.25) * CHUNK_LEN
    const retireFrontThreshold = camZ - (totalSlots - CHUNKS_BEHIND - 0.25) * CHUNK_LEN

    if (rearmostZ > retireRearThreshold) {
      const currentSlots = [...slotsRef.current]
      currentSlots[rearmostIdx] = frontmostZ - CHUNK_LEN
      slotsRef.current = currentSlots
      setChunkSlots(currentSlots)
    } else if (totalSlots >= targetChunkCount && frontmostZ < retireFrontThreshold) {
      const currentSlots = [...slotsRef.current]
      currentSlots[frontmostIdx] = rearmostZ + CHUNK_LEN
      slotsRef.current = currentSlots
      setChunkSlots(currentSlots)
    }

    // 3. Update Development Diagnostics (throttled every 12 frames)
    diagCounter.current++
    if (diagCounter.current % 12 === 0) {
      const currentBuffer = camZ - frontmostZ
      const chunksAhead = Math.round((camZ - frontmostZ) / CHUNK_LEN)
      const telemetrySpeed = useTelemetryStore.getState().speed || 0
      setDiagnostics({
        activeChunks: totalSlots,
        frontierBuffer: Math.round(currentBuffer),
        drawDistance: totalSlots * CHUNK_LEN,
        speedKmh: Math.round(telemetrySpeed),
        chunksAhead,
        prepTimeMs: 0.8,
      })
    }
  })

  return (
    <group>
      {chunkSlots.map((cz, slotIndex) => {
        const chunkBiome = getActiveBiomeAt(cz, biome)
        return (
          <TerrainChunkTile
            key={slotIndex}
            chunkZ={cz}
            biomeConfig={chunkBiome}
            isRaining={weather === 'rain'}
            graphicsQuality={graphicsQuality}
          />
        )
      })}
    </group>
  )
}
