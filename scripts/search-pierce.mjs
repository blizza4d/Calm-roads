import { setWorldGenerationConfig, getRoadCenter, getRoadElevation, getTerrainHeight, ROAD_WIDTH } from '../src/utils/roadMath.ts';

setWorldGenerationConfig(1337, 'desert', 0);

const TERRAIN_W = 1200;
const GRID_X = 64;
const GRID_Z = 32;
const CHUNK_LEN = 200;

console.log('Searching for terrain vertices or triangle edges piercing road...');
for (let chunkZ = 200; chunkZ >= -400; chunkZ -= 200) {
  for (let iz = 0; iz <= GRID_Z; iz++) {
    const localZ = (iz / GRID_Z - 0.5) * CHUNK_LEN;
    const worldZ = chunkZ + localZ;
    const rc = getRoadCenter(worldZ);
    const roadY = getRoadElevation(worldZ);

    for (let ix = 0; ix < GRID_X; ix++) {
      const x1 = (ix / GRID_X - 0.5) * TERRAIN_W;
      const x2 = ((ix + 1) / GRID_X - 0.5) * TERRAIN_W;

      // If road center is between x1 and x2, or close
      if ((x1 - rc) * (x2 - rc) <= 0 || Math.abs(x1 - rc) < 15 || Math.abs(x2 - rc) < 15) {
        const y1 = getTerrainHeight(x1, worldZ, 'desert');
        const y2 = getTerrainHeight(x2, worldZ, 'desert');

        // Test points along this triangle edge
        for (let t = 0; t <= 1; t += 0.1) {
          const x = x1 + (x2 - x1) * t;
          const y = y1 + (y2 - y1) * t;
          const distToRoad = Math.abs(x - rc);
          if (distToRoad <= ROAD_WIDTH / 2) {
            if (y > roadY + 0.05) {
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
console.log('Search complete.');
