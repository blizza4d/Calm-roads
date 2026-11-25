import type * as THREE from 'three'
import type { VehicleModelType } from '../store/useGameStore'

export const ESSENTIAL_SPAWN_CHUNK_ZS = [200, 0, -200, -400, -600] as const

export interface ReadinessRegistry {
  runId: number
  startedAtMs: number
  rendererReady: boolean
  gl: THREE.WebGLRenderer | null
  scene: THREE.Scene | null
  camera: THREE.Camera | null

  // Vehicle initialization tracking
  vehicleGroup: THREE.Group | null
  vehicleLoadedType: VehicleModelType | null
  vehicleAssetLoaded: boolean
  vehicleAllowFallback: boolean
  vehicleTransformReady: boolean
  vehicleError: string | null
  vehicleByteProgress: Map<string, { loaded: number; total: number }>
  getVehicleDownloadStats: (urls: string[]) => { pct: number; loadedBytes: number; totalBytes: number }

  // Terrain & Road initialization tracking
  mountedChunks: Map<number, { terrainVerts: number; roadVerts: number }>
  terrainError: string | null
  texturesReady: boolean

  // Environment & Camera tracking
  environmentReady: boolean
  cameraReady: boolean
  shadersCompiled: boolean
  firstFrameRendered: boolean

  beginRun: () => number
  resetWorldReadiness: (keepAssetCache?: boolean) => void
  markChunkValidated: (chunkZ: number, terrainVerts: number, roadVerts: number) => void
  unmarkChunk: (chunkZ: number) => void
  getEssentialChunksReadyCount: () => number
}

export const worldReadinessRegistry: ReadinessRegistry = {
  runId: 0,
  startedAtMs: typeof performance !== 'undefined' ? performance.now() : 0,
  rendererReady: false,
  gl: null,
  scene: null,
  camera: null,

  vehicleGroup: null,
  vehicleLoadedType: null,
  vehicleAssetLoaded: false,
  vehicleAllowFallback: false,
  vehicleTransformReady: false,
  vehicleError: null,
  vehicleByteProgress: new Map(),

  getVehicleDownloadStats(urls: string[]) {
    if (urls.length === 0) return { pct: 100, loadedBytes: 0, totalBytes: 0 }
    let loadedBytes = 0
    let totalBytes = 0
    let trackedCount = 0
    for (const u of urls) {
      const entry = this.vehicleByteProgress.get(u)
      if (entry && entry.total > 0) {
        loadedBytes += Math.min(entry.loaded, entry.total)
        totalBytes += entry.total
        trackedCount++
      }
    }
    if (trackedCount === 0 || totalBytes <= 0) {
      return { pct: 0, loadedBytes: 0, totalBytes: 0 }
    }
    // Scale proportionally when only subset of URLs has Content-Length reported yet
    const pct = Math.min(99, Math.round((loadedBytes / totalBytes) * (trackedCount / urls.length) * 100))
    return { pct, loadedBytes, totalBytes }
  },

  mountedChunks: new Map(),
  terrainError: null,
  texturesReady: false,

  environmentReady: false,
  cameraReady: false,
  shadersCompiled: false,
  firstFrameRendered: false,

  beginRun() {
    this.runId += 1
    this.startedAtMs = typeof performance !== 'undefined' ? performance.now() : 0
    return this.runId
  },

  resetWorldReadiness(keepAssetCache = true) {
    this.vehicleTransformReady = false
    this.vehicleError = null
    this.terrainError = null
    this.environmentReady = false
    this.cameraReady = false
    this.shadersCompiled = false
    this.firstFrameRendered = false
    if (!keepAssetCache) {
      this.vehicleAssetLoaded = false
      this.vehicleLoadedType = null
      this.vehicleByteProgress.clear()
      this.texturesReady = false
    }
  },

  markChunkValidated(chunkZ: number, terrainVerts: number, roadVerts: number) {
    this.mountedChunks.set(chunkZ, { terrainVerts, roadVerts })
  },

  unmarkChunk(chunkZ: number) {
    this.mountedChunks.delete(chunkZ)
  },

  getEssentialChunksReadyCount() {
    let count = 0
    for (const cz of ESSENTIAL_SPAWN_CHUNK_ZS) {
      const info = this.mountedChunks.get(cz)
      if (info && info.terrainVerts > 0 && info.roadVerts > 0) {
        count++
      }
    }
    return count
  },
}

if (typeof window !== 'undefined') {
  ;(window as any).__WORLD_READINESS__ = worldReadinessRegistry
}
