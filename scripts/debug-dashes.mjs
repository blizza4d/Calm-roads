import { setWorldGenerationConfig, getRoadSplineSample, ROAD_WIDTH } from '../src/utils/roadMath.ts';

setWorldGenerationConfig(1337, 'desert', 0);

const chunkZ = 0;
const CHUNK_LEN = 200;
const dashSpacing = 14;
const dashLen = 7.0;
const halfLineW = 0.075;
const numDashes = 16;

const startWorldZ = chunkZ + CHUNK_LEN / 2; // 100
const firstDashWz = Math.floor(startWorldZ / dashSpacing) * dashSpacing + dashSpacing * 0.5;

console.log('firstDashWz:', firstDashWz);

for (let i = 0; i < numDashes; i++) {
  const wzCenter = firstDashWz - i * dashSpacing;
  const localZCenter = wzCenter - chunkZ;
  const rawStart = localZCenter + dashLen / 2;
  const rawEnd = localZCenter - dashLen / 2;

  const localZStart = Math.min(CHUNK_LEN / 2, Math.max(-CHUNK_LEN / 2, rawStart));
  const localZEnd = Math.min(CHUNK_LEN / 2, Math.max(-CHUNK_LEN / 2, rawEnd));

  const valid = (localZStart - localZEnd > 0.05);

  if (valid) {
    const wzStart = chunkZ + localZStart;
    const wzEnd = chunkZ + localZEnd;
    const sStart = getRoadSplineSample(wzStart);
    const sEnd = getRoadSplineSample(wzEnd);

    const v0 = { x: sStart.x - sStart.rx * halfLineW, y: sStart.y + 0.085, z: localZStart - sStart.rz * halfLineW };
    const v1 = { x: sStart.x + sStart.rx * halfLineW, y: sStart.y + 0.085, z: localZStart + sStart.rz * halfLineW };
    const v2 = { x: sEnd.x - sEnd.rx * halfLineW, y: sEnd.y + 0.085, z: localZEnd - sEnd.rz * halfLineW };
    const v3 = { x: sEnd.x + sEnd.rx * halfLineW, y: sEnd.y + 0.085, z: localZEnd + sEnd.rz * halfLineW };

    console.log(
      `dash ${i.toString().padStart(2)}: wzCenter=${wzCenter.toFixed(1)}, ` +
      `localZ=[${localZStart.toFixed(1)}, ${localZEnd.toFixed(1)}], ` +
      `v0.z=${v0.z.toFixed(2)}, v2.z=${v2.z.toFixed(2)}, len=${Math.hypot(v0.x - v2.x, v0.z - v2.z).toFixed(2)}m`
    );
  } else {
    console.log(`dash ${i.toString().padStart(2)}: DEGENERATE (wzCenter=${wzCenter.toFixed(1)}, raw=[${rawStart.toFixed(1)}, ${rawEnd.toFixed(1)}])`);
  }
}
