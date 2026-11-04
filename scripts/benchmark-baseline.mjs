// scripts/benchmark-baseline.mjs
// Automated Performance Baseline Measurement for Calm Roads
import { performance } from 'perf_hooks'
import {
  getRoadCenter,
  getRoadElevation,
  getRoadSplineSample,
  getTerrainHeight,
  getSurfaceHeight,
  getClosestRoadPoint,
  getMacroTerrainWeights,
  getInterpolatedMacroProfile,
  getDominantMacroType,
  ROAD_WIDTH,
} from '../src/utils/roadMath.ts'

console.log('=== CALM ROADS PERFORMANCE BASELINE BENCHMARK ===\n')

// 1. Benchmark getClosestRoadPoint (called per terrain vertex)
const ITER_CLOSEST = 2000
const t0 = performance.now()
for (let i = 0; i < ITER_CLOSEST; i++) {
  const x = (i % 65 - 32) * 15
  const z = -((i / 65) | 0) * 200 - (i % 33) * 6
  getClosestRoadPoint(x, z)
}
const tClosest = performance.now() - t0
const avgClosestUs = (tClosest / ITER_CLOSEST) * 1000

console.log(`[1] getClosestRoadPoint:`)
console.log(`    Total time: ${tClosest.toFixed(2)} ms for ${ITER_CLOSEST} queries`)
console.log(`    Average latency: ${avgClosestUs.toFixed(2)} µs/query`)

// 2. Benchmark getTerrainHeight across a full chunk grid (65 x 33 = 2,145 vertices)
const CHUNK_LEN = 200
const TERRAIN_W = 1200
const GRID_X = 64
const GRID_Z = 32
const VERTS_PER_CHUNK = (GRID_X + 1) * (GRID_Z + 1) // 2145 vertices

const tChunk0 = performance.now()
const chunkZ = -1000
for (let iz = 0; iz <= GRID_Z; iz++) {
  const localZ = (iz / GRID_Z - 0.5) * CHUNK_LEN
  const worldZ = chunkZ + localZ
  for (let ix = 0; ix <= GRID_X; ix++) {
    const localX = (ix / GRID_X - 0.5) * TERRAIN_W
    getTerrainHeight(localX, worldZ, 'twisted_mountains')
  }
}
const tChunkMs = performance.now() - tChunk0

console.log(`\n[2] Single Chunk Terrain Height Generation (2,145 vertices):`)
console.log(`    Generation time: ${tChunkMs.toFixed(2)} ms / chunk`)
console.log(`    Per-vertex cost: ${(tChunkMs / VERTS_PER_CHUNK * 1000).toFixed(2)} µs/vertex`)

// 3. Initial 28-Chunk World Generation Cost
const NUM_CHUNKS = 28
const tWorld0 = performance.now()
for (let c = 0; c < NUM_CHUNKS; c++) {
  const cZ = (3 - c) * CHUNK_LEN
  for (let iz = 0; iz <= GRID_Z; iz++) {
    const localZ = (iz / GRID_Z - 0.5) * CHUNK_LEN
    const worldZ = cZ + localZ
    for (let ix = 0; ix <= GRID_X; ix++) {
      const localX = (ix / GRID_X - 0.5) * TERRAIN_W
      getTerrainHeight(localX, worldZ, 'forest')
    }
  }
}
const tWorldMs = performance.now() - tWorld0
console.log(`\n[3] 28-Chunk Initial World Terrain Generation (60,060 vertices total):`)
console.log(`    Total world build time: ${tWorldMs.toFixed(2)} ms`)
console.log(`    Average per-chunk: ${(tWorldMs / NUM_CHUNKS).toFixed(2)} ms`)

// 4. Benchmark 3D Road Spline Engine
const ITER_SPLINE = 10000
const tSpline0 = performance.now()
for (let i = 0; i < ITER_SPLINE; i++) {
  getRoadSplineSample(-i * 1.5)
}
const tSplineMs = performance.now() - tSpline0
console.log(`\n[4] 3D Road Spline Sampling:`)
console.log(`    Total time: ${tSplineMs.toFixed(2)} ms for ${ITER_SPLINE} samples`)
console.log(`    Average latency: ${(tSplineMs / ITER_SPLINE * 1000).toFixed(2)} µs/sample`)

// 5. Physics Substep Surface Query Cost (120 Hz vehicle simulation: 4 corners + center = 5 queries per substep)
const ITER_PHYS = 1200 // 10 seconds of 120Hz physics = 1200 steps * 5 = 6000 queries
const tPhys0 = performance.now()
for (let i = 0; i < ITER_PHYS; i++) {
  const z = -i * 0.5
  getSurfaceHeight(0, z, 'forest')
  getSurfaceHeight(-1, z - 1.4, 'forest')
  getSurfaceHeight(1, z - 1.4, 'forest')
  getSurfaceHeight(-1, z + 1.2, 'forest')
  getSurfaceHeight(1, z + 1.2, 'forest')
}
const tPhysMs = performance.now() - tPhys0
console.log(`\n[5] Physics Contact Surface Height (6,000 queries = 10s of 120Hz driving):`)
console.log(`    Total simulation surface query time: ${tPhysMs.toFixed(2)} ms`)
console.log(`    Time per frame (at 120Hz, 5 queries): ${(tPhysMs / ITER_PHYS).toFixed(3)} ms`)

// 6. Memory Heap Measurement
if (global.gc) {
  global.gc()
}
const mem = process.memoryUsage()
console.log(`\n[6] Process Memory Baseline:`)
console.log(`    Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`)
console.log(`    Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`)
console.log(`    RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`)

console.log('\n=================================================')
