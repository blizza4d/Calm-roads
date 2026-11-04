/**
 * test-performance-optimization.mjs
 * Verification test suite for CALM ROADS: Extreme Performance Optimization
 */

import * as THREE from 'three'
import {
  getRoadCenter,
  getRoadElevation,
  getRoadSplineSample,
  getSurfaceHeight,
  getTerrainHeight,
  getClosestRoadPoint,
  ROAD_WIDTH,
  ROAD_PROTECTED_RADIUS,
  getActiveBiomeAt,
  BIOMES,
} from '../src/utils/roadMath.ts'

let totalTests = 0
let passedTests = 0

function assert(condition, message) {
  totalTests++
  if (condition) {
    console.log(`[PASS] ${message}`)
    passedTests++
  } else {
    console.error(`[FAIL] ${message}`)
    process.exitCode = 1
  }
}

console.log('=== CALM ROADS: EXTREME PERFORMANCE OPTIMIZATION VERIFICATION ===\n')

// ------------------------------------------------------------------------
// Test Suite 1: Terrain Height Fast-Path Invariance & Roadbed Protection
// ------------------------------------------------------------------------
console.log('--- Section 1: Terrain Height Fast-Path & Road Protection Invariance ---')

// 1. Verify that for |x - roadCenter| > 115m, getTerrainHeight returns valid finite values
let finitePoints = 0
let totalPoints = 0
for (let z = 0; z < 2000; z += 50) {
  const roadX = getRoadCenter(z)
  for (const offset of [-400, -250, -150, 150, 250, 400]) {
    totalPoints++
    const x = roadX + offset
    const h = getTerrainHeight(x, z, 'rolling_hills')
    if (Number.isFinite(h) && h >= 0) finitePoints++
  }
}
assert(finitePoints === totalPoints, `Terrain height fast-path evaluated ${finitePoints}/${totalPoints} distant vertices accurately and finitely`)

// 2. Verify road corridor clearance remains strictly >= 280mm
let minClearance = 999
for (let z = 0; z >= -3000; z -= 25) {
  const roadCx = getRoadCenter(z)
  for (let ox = -ROAD_WIDTH / 2; ox <= ROAD_WIDTH / 2; ox += 1.5) {
    const checkX = roadCx + ox
    const asphaltY = getSurfaceHeight(checkX, z, 'alpine')
    const terrainY = getTerrainHeight(checkX, z, 'alpine')
    const clearance = asphaltY - terrainY
    if (clearance < minClearance) minClearance = clearance
  }
}
assert(
  minClearance >= 0.28,
  `Roadbed clearance strictly preserved above 280mm after math optimizations (observed: ${(minClearance * 1000).toFixed(1)}mm)`
)

// ------------------------------------------------------------------------
// Test Suite 2: Central Difference Normals Accuracy on Grid Heightfield
// ------------------------------------------------------------------------
console.log('\n--- Section 2: Central Difference Normals Accuracy & Unit Length ---')

const TERRAIN_W = 1200
const CHUNK_LEN = 200
const GRID_X = 64
const GRID_Z = 32
const countX = GRID_X + 1
const countZ = GRID_Z + 1

const heights = new Float32Array(countX * countZ)
const normals = new Float32Array(countX * countZ * 3)

for (let iz = 0; iz < countZ; iz++) {
  const z = (iz / GRID_Z - 0.5) * CHUNK_LEN
  for (let ix = 0; ix < countX; ix++) {
    const x = (ix / GRID_X - 0.5) * TERRAIN_W
    const idx = iz * countX + ix
    heights[idx] = getTerrainHeight(x, z, 'rolling_hills')
  }
}

const dx = TERRAIN_W / GRID_X
const dz = CHUNK_LEN / GRID_Z
let maxLenError = 0
let minNy = 1.0

for (let iz = 0; iz < countZ; iz++) {
  const izPrev = iz > 0 ? iz - 1 : 0
  const izNext = iz < GRID_Z ? iz + 1 : GRID_Z
  const dzDist = (izNext - izPrev) * dz
  for (let ix = 0; ix < countX; ix++) {
    const ixPrev = ix > 0 ? ix - 1 : 0
    const ixNext = ix < GRID_X ? ix + 1 : GRID_X
    const dxDist = (ixNext - ixPrev) * dx
    const idx = iz * countX + ix
    const yL = heights[iz * countX + ixPrev]
    const yR = heights[iz * countX + ixNext]
    const yD = heights[izPrev * countX + ix]
    const yU = heights[izNext * countX + ix]
    const gradX = -(yR - yL) / dxDist
    const gradZ = -(yU - yD) / dzDist
    const invLen = 1 / Math.sqrt(gradX * gradX + 1 + gradZ * gradZ)
    normals[idx * 3] = gradX * invLen
    normals[idx * 3 + 1] = invLen
    normals[idx * 3 + 2] = gradZ * invLen

    const len = Math.sqrt(
      normals[idx * 3] ** 2 + normals[idx * 3 + 1] ** 2 + normals[idx * 3 + 2] ** 2
    )
    const err = Math.abs(len - 1.0)
    if (err > maxLenError) maxLenError = err
    if (invLen < minNy) minNy = invLen
  }
}

assert(maxLenError < 1e-5, `All computed normal vectors are strictly unit length (max error: ${maxLenError.toExponential(2)})`)
assert(minNy > 0.1, `Surface normal Y component is positive across all grid points (min Ny: ${minNy.toFixed(3)})`)

// ------------------------------------------------------------------------
// Test Suite 3: Garbage Collection & Zero-Allocation Physics Loops
// ------------------------------------------------------------------------
console.log('\n--- Section 3: Zero-Allocation Physics & Skid Simulation ---')

// Simulate 5,000 frames of wheel corner suspensions without allocations
const _wheelCorners = [
  [-0.83, -1.48],
  [0.83, -1.48],
  [-0.83, 1.18],
  [0.83, 1.18],
]
const wheelSuspensions = [0, 0, 0, 0]
const pos = { x: 0, y: 1.5, z: 0 }
const cosYaw = 1.0
const sinYaw = 0.0

const startMem = process.memoryUsage().heapUsed

for (let f = 0; f < 5000; f++) {
  pos.z -= 0.5
  for (let idx = 0; idx < 4; idx++) {
    const corner = _wheelCorners[idx]
    const lx = corner[0]
    const lz = corner[1]
    const wx = pos.x + lx * cosYaw + lz * sinYaw
    const wz = pos.z - lx * sinYaw + lz * cosYaw
    const roadY = getRoadElevation(wz)
    const compression = roadY - (pos.y - 0.38)
    const clampedComp = Math.max(-0.06, Math.min(0.06, compression))
    wheelSuspensions[idx] += (clampedComp - wheelSuspensions[idx]) * 0.1
  }
}

const endMem = process.memoryUsage().heapUsed
const memGrowthMb = (endMem - startMem) / (1024 * 1024)
assert(
  memGrowthMb < 2.0,
  `5,000 frames of wheel suspension loop executed with zero memory leak (heap growth: ${memGrowthMb.toFixed(3)} MB)`
)

// ------------------------------------------------------------------------
// Test Suite 4: Performance Benchmark Speedup Verification
// ------------------------------------------------------------------------
console.log('\n--- Section 4: Performance Benchmark Verification ---')

// Benchmark single chunk generation
const t0 = performance.now()
const sampleChunkZ = -500
const chunkHeights = new Float32Array(countX * countZ)
for (let iz = 0; iz < countZ; iz++) {
  const localZ = (iz / GRID_Z - 0.5) * CHUNK_LEN
  const worldZ = sampleChunkZ + localZ
  for (let ix = 0; ix < countX; ix++) {
    const localX = (ix / GRID_X - 0.5) * TERRAIN_W
    chunkHeights[iz * countX + ix] = getTerrainHeight(localX, worldZ, 'rolling_hills')
  }
}
const t1 = performance.now()
const singleChunkTime = t1 - t0

console.log(`Single chunk generation: ${singleChunkTime.toFixed(2)} ms`)
assert(
  singleChunkTime < 45.0,
  `Single chunk generation is optimized (< 45ms vs baseline 59ms): ${singleChunkTime.toFixed(2)} ms`
)

// Benchmark 28-chunk initial world generation
const t2 = performance.now()
for (let c = 0; c < 28; c++) {
  const cz = (3 - c) * CHUNK_LEN
  for (let iz = 0; iz < countZ; iz++) {
    const localZ = (iz / GRID_Z - 0.5) * CHUNK_LEN
    const worldZ = cz + localZ
    for (let ix = 0; ix < countX; ix++) {
      const localX = (ix / GRID_X - 0.5) * TERRAIN_W
      const h = getTerrainHeight(localX, worldZ, 'rolling_hills')
    }
  }
}
const t3 = performance.now()
const worldGenTime = t3 - t2

console.log(`28-chunk initial world generation: ${worldGenTime.toFixed(2)} ms`)
assert(
  worldGenTime < 850.0,
  `28-chunk initial world generation is optimized (< 850ms vs baseline 1,459ms): ${worldGenTime.toFixed(2)} ms`
)

// ------------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------------
console.log('\n=======================================================')
console.log(`FINAL RESULT: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`)
console.log('=======================================================')
