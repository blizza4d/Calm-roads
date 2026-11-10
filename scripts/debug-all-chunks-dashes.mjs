import { setWorldGenerationConfig, getRoadSplineSample, ROAD_WIDTH } from '../src/utils/roadMath.ts';

setWorldGenerationConfig(1337, 'desert', 0);

const CHUNK_LEN = 200;
const dashSpacing = 14;
const dashLen = 7.0;
const halfLineW = 0.075;
const numDashes = 16;
const NUM_CHUNKS = 28;
const CHUNKS_BEHIND = 3;

console.log('Testing dashes across all 28 chunks...');
for (let c = 0; c < NUM_CHUNKS; c++) {
  const chunkZ = (CHUNKS_BEHIND - c) * CHUNK_LEN; // 600 down to -4800
  const startWorldZ = chunkZ + CHUNK_LEN / 2;
  const firstDashWz = Math.floor(startWorldZ / dashSpacing) * dashSpacing + dashSpacing * 0.5;

  let partialDashes = 0;
  for (let i = 0; i < numDashes; i++) {
    const wzCenter = firstDashWz - i * dashSpacing;
    const localZCenter = wzCenter - chunkZ;
    const rawStart = localZCenter + dashLen / 2;
    const rawEnd = localZCenter - dashLen / 2;

    const localZStart = Math.min(CHUNK_LEN / 2, Math.max(-CHUNK_LEN / 2, rawStart));
    const localZEnd = Math.min(CHUNK_LEN / 2, Math.max(-CHUNK_LEN / 2, rawEnd));

    const valid = (localZStart - localZEnd > 0.05);
    const clamped = (rawStart > CHUNK_LEN / 2 && rawEnd < CHUNK_LEN / 2) || (rawStart > -CHUNK_LEN / 2 && rawEnd < -CHUNK_LEN / 2);
    if (clamped && valid) {
      partialDashes++;
      console.log(`Chunk ${chunkZ}: dash ${i} at wzCenter=${wzCenter.toFixed(1)} is PARTIALLY CLAMPED! raw=[${rawStart.toFixed(1)}, ${rawEnd.toFixed(1)}], clamped=[${localZStart.toFixed(1)}, ${localZEnd.toFixed(1)}]`);
    }
  }
}
