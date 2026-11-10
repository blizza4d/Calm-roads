import { getRoadCenter, getRoadElevation } from '../src/utils/roadMath.ts';

// Precomputed arc length cache table at 4-meter intervals
const ARC_STEP = 4.0;
const Z_MIN = -8000;
const Z_MAX = 2000;
const TABLE_SIZE = Math.floor((Z_MAX - Z_MIN) / ARC_STEP) + 1;
const arcTable = new Float64Array(TABLE_SIZE);

function initArcTable() {
  const t0 = performance.now();
  let cumDist = 0;
  arcTable[TABLE_SIZE - 1] = 0; // z = Z_MAX

  // Integrate from Z_MAX down to Z_MIN
  let prevX = getRoadCenter(Z_MAX);
  let prevY = getRoadElevation(Z_MAX);

  for (let i = TABLE_SIZE - 2; i >= 0; i--) {
    const z = Z_MIN + i * ARC_STEP;
    // Subdivide step with 2-point Gauss or Simpson:
    const midZ = z + ARC_STEP * 0.5;
    const midX = getRoadCenter(midZ);
    const midY = getRoadElevation(midZ);

    const nextZ = z + ARC_STEP;
    const nextX = getRoadCenter(nextZ);
    const nextY = getRoadElevation(nextZ);
    const curX = getRoadCenter(z);
    const curY = getRoadElevation(z);

    const ds = Math.hypot(nextX - curX, nextY - curY, ARC_STEP);
    cumDist += ds;
    arcTable[i] = cumDist;
  }
  const t1 = performance.now();
  console.log(`Arc table initialized in ${(t1 - t0).toFixed(2)}ms for ${TABLE_SIZE} entries. Total distance: ${(arcTable[0]).toFixed(1)}m`);
}

initArcTable();
