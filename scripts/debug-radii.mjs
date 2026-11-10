import { setWorldGenerationConfig, getRoadCenter, getRoadSplineSample } from '../src/utils/roadMath.ts';

const biomes = ['desert', 'twisted_mountains', 'alpine', 'plains', 'rolling_hills', 'coastal'];

for (const b of biomes) {
  setWorldGenerationConfig(1337, b, 0);
  let minR = Infinity;
  let maxCurv = 0;
  let minR_z = 0;

  for (let z = 1000; z >= -1000; z -= 1.0) {
    const s = getRoadSplineSample(z);
    const absCurv = Math.abs(s.curvature);
    if (absCurv > maxCurv) {
      maxCurv = absCurv;
      minR = 1 / absCurv;
      minR_z = z;
    }
  }
  console.log(`Biome: ${b.padEnd(18)} | MaxCurv: ${maxCurv.toFixed(4)} | Min Radius: ${minR.toFixed(1)}m at z=${minR_z}`);
}
