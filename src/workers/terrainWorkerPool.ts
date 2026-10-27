import type { BiomeType } from '../utils/roadMath'
import type { TerrainWorkerRequest, TerrainWorkerResponse } from './terrainWorker'

let terrainWorker: Worker | null = null
const pendingCallbacks = new Map<number, (res: TerrainWorkerResponse) => void>()
let reqId = 0

function getTerrainWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null
  if (!terrainWorker) {
    try {
      terrainWorker = new Worker(new URL('./terrainWorker.ts', import.meta.url), {
        type: 'module',
      })
      terrainWorker.onmessage = (e: MessageEvent<TerrainWorkerResponse>) => {
        const { id } = e.data
        const cb = pendingCallbacks.get(id)
        if (cb) {
          pendingCallbacks.delete(id)
          cb(e.data)
        }
      }
      terrainWorker.onerror = (err) => {
        console.warn('Terrain Web Worker runtime error:', err)
      }
    } catch (err) {
      console.warn('Terrain Web Worker initialization failed, using main-thread fallback:', err)
      terrainWorker = null
    }
  }
  return terrainWorker
}

export function requestTerrainChunk(
  chunkZ: number,
  biomeId: BiomeType,
  gridX: number,
  gridZ: number,
  chunkLen: number,
  terrainW: number,
  callback: (res: TerrainWorkerResponse) => void
): boolean {
  const worker = getTerrainWorker()
  if (!worker) return false
  const id = ++reqId
  pendingCallbacks.set(id, callback)
  const req: TerrainWorkerRequest = {
    id,
    chunkZ,
    biomeId,
    gridX,
    gridZ,
    chunkLen,
    terrainW,
  }
  worker.postMessage(req)
  return true
}
