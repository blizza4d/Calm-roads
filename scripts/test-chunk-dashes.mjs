import { setWorldGenerationConfig, getRoadCenter, getRoadElevation } from '../src/utils/roadMath.ts';

// Let's test the dash generation across Chunk 0 and Chunk -200:
const ARC_STEP = 4.0;
const Z_MIN = -8000;
const Z_MAX = 2000;
const TABLE_SIZE = Math.floor((Z_MAX - Z_MIN) / ARC_STEP) + 1;
const arcTable = new Float64Array(TABLE_SIZE);

function initArcTable() {
  let cumDist = 0;
  arcTable[TABLE_SIZE - 1] = 0;
  for (let i = TABLE_SIZE - 2; i >= 0; i--) {
    const z = Z_MIN + i * ARC_STEP;
    const nextZ = z + ARC_STEP;
    const nextX = getRoadCenter(nextZ);
    const nextY = getRoadElevation(nextZ);
    const curX = getRoadCenter(z);
    const curY = getRoadElevation(z);
    const ds = Math.hypot(nextX - curX, nextY - curY, ARC_STEP);
    cumDist += ds;
    arcTable[i] = cumDist;
  }
}

function getRoadArcLength(z) {
  const normZ = Math.max(Z_MIN, Math.min(Z_MAX, z));
  const idx = (normZ - Z_MIN) / ARC_STEP;
  const i0 = Math.floor(idx);
  const frac = idx - i0;
  if (i0 >= TABLE_SIZE - 1) return arcTable[TABLE_SIZE - 1];
  return arcTable[i0] * (1 - frac) + arcTable[i0 + 1] * frac;
}

// Invert: get Z from arc length s
function getZFromArcLength(targetS) {
  // Binary search arcTable
  let low = 0;
  let high = TABLE_SIZE - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (arcTable[mid] < targetS) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  const i = Math.max(0, Math.min(TABLE_SIZE - 2, high));
  const s0 = arcTable[i];
  const s1 = arcTable[i + 1];
  const frac = (targetS - s0) / (s1 - s0);
  return (Z_MIN + i * ARC_STEP) + frac * ARC_STEP;
}

initArcTable();

const DASH_LEN = 7.0;
const DASH_GAP = 7.0;
const DASH_CYCLE = DASH_LEN + DASH_GAP;

function getChunkDashes(chunkZ) {
  const CHUNK_LEN = 200;
  const wzStart = chunkZ + CHUNK_LEN / 2;
  const wzEnd = chunkZ - CHUNK_LEN / 2;

  const sStart = getRoadArcLength(wzStart);
  const sEnd = getRoadArcLength(wzEnd);

  const kMin = Math.floor(sStart / DASH_CYCLE);
  const kMax = Math.ceil(sEnd / DASH_CYCLE);

  const dashes = [];
  for (let k = kMin; k <= kMax; k++) {
    const cycleStart = k * DASH_CYCLE;
    const d1 = Math.max(sStart, cycleStart);
    const d2 = Math.min(sEnd, cycleStart + DASH_LEN);

    if (d2 - d1 > 0.05) {
      const z1 = getZFromArcLength(d1);
      const z2 = getZFromArcLength(d2);
      dashes.push({ k, d1, d2, len: d2 - d1, z1, z2 });
    }
  }
  return { sStart, sEnd, dashes };
}

console.log('Testing Chunk 0:');
const c0 = getChunkDashes(0);
c0.dashes.forEach(d => console.log(`  k=${d.k}: d=[${d.d1.toFixed(1)}, ${d.d2.toFixed(1)}], len=${d.len.toFixed(2)}m, z=[${d.z1.toFixed(1)}, ${d.z2.toFixed(1)}]`));

console.log('Testing Chunk -200:');
const c1 = getChunkDashes(-200);
c1.dashes.forEach(d => console.log(`  k=${d.k}: d=[${d.d1.toFixed(1)}, ${d.d2.toFixed(1)}], len=${d.len.toFixed(2)}m, z=[${d.z1.toFixed(1)}, ${d.z2.toFixed(1)}]`));

// Check dash crossing boundary between Chunk 0 and Chunk -200
const lastD0 = c0.dashes[c0.dashes.length - 1];
const firstD1 = c1.dashes[0];
console.log('\n--- Chunk Boundary Continuity Check ---');
console.log('Chunk 0 end S:', c0.sEnd.toFixed(2), 'Chunk -200 start S:', c1.sStart.toFixed(2));
if (lastD0.k === firstD1.k) {
  console.log(`Dash k=${lastD0.k} straddles chunk boundary!`);
  console.log(`Chunk 0 part length: ${lastD0.len.toFixed(2)}m, Chunk -200 part length: ${firstD1.len.toFixed(2)}m`);
  console.log(`Total Combined Dash Length: ${(lastD0.len + firstD1.len).toFixed(2)}m (expected 7.00m)`);
  console.log(`Join position delta: ${(lastD0.z2 - firstD1.z1).toFixed(6)}m`);
}
