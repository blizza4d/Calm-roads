// Numerical verification of Road Spline math, cross-section, and collision
import {
  getRoadSplineSample,
  getRoadCrossSection,
  getRoadArcLength,
  getSurfaceHeight,
  getClosestRoadPoint,
  ROAD_WIDTH,
  ROAD_CLEARANCE_BASE,
  validateRoadSplineSample,
} from './src/utils/roadMath.ts'

console.log('=== ROAD SPLINE NUMERICAL MATH VERIFICATION ===\n')

let passed = 0
let failed = 0

function assert(cond, msg) {
  if (cond) {
    console.log(`  [PASS] ${msg}`)
    passed++
  } else {
    console.error(`  [FAIL] ${msg}`)
    failed++
  }
}

// 1. Orthonormality & Frame Properties across 200 sample points
let orthoErrors = 0
let maxGrade = 0
let maxCurvature = 0
let prevArc = -1
let monoArcErrors = 0

for (let z = 100; z >= -10000; z -= 50) {
  const s = getRoadSplineSample(z)
  validateRoadSplineSample(s)

  const tLen = Math.hypot(s.tx, s.ty, s.tz)
  const rLen = Math.hypot(s.rx, s.ry, s.rz)
  const nLen = Math.hypot(s.nx, s.ny, s.nz)

  const dotTR = s.tx * s.rx + s.ty * s.ry + s.tz * s.rz
  const dotTN = s.tx * s.nx + s.ty * s.ny + s.tz * s.nz
  const dotRN = s.rx * s.nx + s.ry * s.ny + s.rz * s.nz

  if (Math.abs(tLen - 1.0) > 0.001 || Math.abs(rLen - 1.0) > 0.001 || Math.abs(nLen - 1.0) > 0.001) {
    orthoErrors++
  }
  if (Math.abs(dotTR) > 0.001 || Math.abs(dotTN) > 0.001 || Math.abs(dotRN) > 0.001) {
    orthoErrors++
  }

  // Right-handed frame check: R x T = N (Right x Tangent = Surface Normal Up)
  const cx = s.ry * s.tz - s.rz * s.ty
  const cy = s.rz * s.tx - s.rx * s.tz
  const cz = s.rx * s.ty - s.ry * s.tx
  if (Math.hypot(cx - s.nx, cy - s.ny, cz - s.nz) > 0.01) {
    orthoErrors++
  }

  maxGrade = Math.max(maxGrade, Math.abs(s.grade))
  maxCurvature = Math.max(maxCurvature, Math.abs(s.curvature))

  if (prevArc >= 0 && s.cumulativeDistance < prevArc) {
    monoArcErrors++
  }
  prevArc = s.cumulativeDistance
}

assert(orthoErrors === 0, `Orthonormal T, R, N frame strictly preserved across all test points (errors: ${orthoErrors})`)
assert(maxGrade <= 0.16, `Longitudinal grade stays within civil engineering spec: max grade = ${(maxGrade * 100).toFixed(2)}% <= 16%`)
assert(maxCurvature <= 0.025, `Horizontal curvature within minimum 40m radius spec: max curvature = ${maxCurvature.toFixed(4)} <= 0.025`)
assert(monoArcErrors === 0, `Cumulative road distance (arc-length) is strictly monotonically increasing`)

// 2. Cross-Section Dimensions & Boundary Seam Matching
let widthErrors = 0
let crownErrors = 0

for (let z = 50; z >= -4000; z -= 25) {
  const cs = getRoadCrossSection(z, z)
  const measuredWidth = Math.hypot(
    cs.roadRight.wx - cs.roadLeft.wx,
    cs.roadRight.wy - cs.roadLeft.wy,
    cs.roadRight.wz - cs.roadLeft.wz
  )
  if (Math.abs(measuredWidth - ROAD_WIDTH) > 0.001) {
    widthErrors++
  }

  // Parabolic crown check along road normal: center is elevated above outer edges
  const s = cs.spline
  const dLeftN = (cs.roadLeft.wx - s.x) * s.nx + (cs.roadLeft.wy - s.y) * s.ny + (cs.roadLeft.wz - s.z) * s.nz
  const dCenterN = (cs.roadCenter.wx - s.x) * s.nx + (cs.roadCenter.wy - s.y) * s.ny + (cs.roadCenter.wz - s.z) * s.nz
  if (dCenterN <= dLeftN + 0.020) {
    crownErrors++
  }
}

assert(widthErrors === 0, `3D road width is exactly ${ROAD_WIDTH}m across all test coordinates (errors: ${widthErrors})`)
assert(crownErrors === 0, `Parabolic crown camber elevates road centerline above road edges along normal N (errors: ${crownErrors})`)

// 3. Chunk Seam Delta Verification
const CHUNK_LEN = 120.0
let seamDeltas = []
for (let chunkIdx = 0; chunkIdx < 10; chunkIdx++) {
  const seamZ = -(chunkIdx + 1) * CHUNK_LEN + CHUNK_LEN / 2
  const csChunkA = getRoadCrossSection(seamZ, -(chunkIdx) * CHUNK_LEN)
  const csChunkB = getRoadCrossSection(seamZ, -(chunkIdx + 1) * CHUNK_LEN)

  const dLx = Math.abs(csChunkA.roadLeft.wx - csChunkB.roadLeft.wx)
  const dLy = Math.abs(csChunkA.roadLeft.wy - csChunkB.roadLeft.wy)
  const dLz = Math.abs(csChunkA.roadLeft.wz - csChunkB.roadLeft.wz)
  const dRx = Math.abs(csChunkA.roadRight.wx - csChunkB.roadRight.wx)
  const dRy = Math.abs(csChunkA.roadRight.wy - csChunkB.roadRight.wy)
  const dRz = Math.abs(csChunkA.roadRight.wz - csChunkB.roadRight.wz)

  seamDeltas.push(dLx + dLy + dLz + dRx + dRy + dRz)
}
const maxSeamDelta = Math.max(...seamDeltas)
assert(maxSeamDelta < 0.000001, `Chunk boundary seam deltas are exactly 0.000000m (measured max: ${maxSeamDelta.toFixed(6)}m)`)

// 4. Surface Height & Clearance Check
let surfaceMatches = true
for (let z = 0; z >= -500; z -= 20) {
  const s = getRoadSplineSample(z)
  // Center of road
  const hCenter = getSurfaceHeight(s.x, z, 'plains')
  const cs = getRoadCrossSection(z, z)
  const expectedCenterY = (cs.centerDashLeft.wy + cs.centerDashRight.wy) * 0.5
  if (Math.abs(hCenter - expectedCenterY) > 0.02) {
    surfaceMatches = false
    console.error(`Surface mismatch at z=${z}: got ${hCenter}, expected ${expectedCenterY}`)
  }
}
assert(surfaceMatches, 'getSurfaceHeight matches 3D road cross-section geometry')

console.log(`\n========================================`)
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`)
console.log(`========================================`)
if (failed > 0) process.exit(1)
