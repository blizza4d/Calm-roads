import { setWorldGenerationConfig, getRoadCenter, getRoadElevation, getTerrainHeight, ROAD_WIDTH } from '../src/utils/roadMath.ts';

setWorldGenerationConfig(1337, 'desert', 0);

const TERRAIN_W = 1200;
const GRID_X = 64;
const dx = TERRAIN_W / GRID_X; // 18.75m

console.log('dx =', dx);

// Check chunk at chunkZ = 0, along z = 0:
const rc = getRoadCenter(0); // ~29.87
const roadY = getRoadElevation(0); // ~36.26

console.log(`Road Center at z=0: x=${rc.toFixed(2)}, roadY=${roadY.toFixed(2)}`);

// Find the terrain grid vertices straddling rc:
for (let ix = 0; ix <= GRID_X; ix++) {
  const localX = (ix / GRID_X - 0.5) * TERRAIN_W;
  const distFromCenter = localX - rc;
  if (Math.abs(distFromCenter) < 40) {
    const y = getTerrainHeight(localX, 0, 'desert');
    console.log(`Grid vertex ix=${ix}: x=${localX.toFixed(2)} (dist=${distFromCenter.toFixed(2)}m), y=${y.toFixed(2)} (deltaY=${(y - roadY).toFixed(2)}m)`);
  }
}
