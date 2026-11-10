import {
  setWorldGenerationConfig,
  getRoadCenter,
  getRoadElevation,
  getTerrainHeight,
  getClosestRoadPoint,
  ROAD_WIDTH,
  ROAD_CLEARANCE_BASE
} from '../src/utils/roadMath.ts';

setWorldGenerationConfig(1337, 'desert', 0);

const TERRAIN_W = 1200;
const GRID_X = 64;
const GRID_Z = 32;
const CHUNK_LEN = 200;

function getClampedTerrainHeight(x, z, biome) {
  const roadY = getRoadElevation(z);
  const rawY = getTerrainHeight(x, z, biome);
  let y = Math.max(0.0, Math.min(roadY + 105.0, rawY));

  const cl = getClosestRoadPoint(x, z);
  if (cl.dist <= ROAD_WIDTH / 2 + 3.2) {
    const corridorFloor = cl.roadY - ROAD_CLEARANCE_BASE;
    y = Math.min(y, corridorFloor);
  }
  return y;
}

console.log('Searching for terrain vertices or triangle edges piercing road WITH CLAMP...');
let pierceCount = 0;
for (let chunkZ = 200; chunkZ >= -400; chunkZ -= 200) {
  for (let iz = 0; iz <= GRID_Z; iz++) {
    const localZ = (iz / GRID_Z - 0.5) * CHUNK_LEN;
    const worldZ = chunkZ + localZ;
    const rc = getRoadCenter(worldZ);
    const roadY = getRoadElevation(worldZ);

    for (let ix = 0; ix < GRID_X; ix++) {
      const x1 = (ix / GRID_X - 0.5) * TERRAIN_W;
      const x2 = ((ix + 1) / GRID_X - 0.5) * TERRAIN_W;

      if ((x1 - rc) * (x2 - rc) <= 0 || Math.abs(x1 - rc) < 15 || Math.abs(x2 - rc) < 15) {
        const y1 = getClampedTerrainHeight(x1, worldZ, 'desert');
        const y2 = getClampedTerrainHeight(x2, worldZ, 'desert');

        for (let t = 0; t <= 1; t += 0.1) {
          const x = x1 + (x2 - x1) * t;
          const y = y1 + (y2 - y1) * t;
          const distToRoad = Math.abs(x - rc);
          if (distToRoad <= ROAD_WIDTH / 2) {
            if (y > roadY + 0.05) {
              pierceCount++;
              console.log(
                `PIERCE! chunkZ=${chunkZ}, wZ=${worldZ.toFixed(1)}, ` +
                `x=${x.toFixed(1)} (distToRc=${distToRoad.toFixed(1)}m), ` +
                `y=${y.toFixed(2)} vs roadY=${roadY.toFixed(2)} (diff=+${(y - roadY).toFixed(2)}m)`
              );
            }
          }
        }
      }
    }
  }
}
console.log('Search complete. Total pierces:', pierceCount);
