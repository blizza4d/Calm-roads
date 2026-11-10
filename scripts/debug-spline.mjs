import { setWorldGenerationConfig, getRoadSplineSample, getRoadCenter, getRoadElevation, ROAD_WIDTH } from '../src/utils/roadMath.ts';

setWorldGenerationConfig(1337, 'desert', 0);
console.log('--- Desert Canyon Spline at z = 20 to -20 ---');
for (let z = 20; z >= -20; z -= 5) {
  const s = getRoadSplineSample(z);
  console.log(
    `z=${z.toFixed(1).padStart(5)}: ` +
    `x=${s.x.toFixed(2).padStart(6)}, y=${s.y.toFixed(2).padStart(5)}, ` +
    `T=(${s.tx.toFixed(3)}, ${s.ty.toFixed(3)}, ${s.tz.toFixed(3)}), ` +
    `R=(${s.rx.toFixed(3)}, ${s.ry.toFixed(3)}, ${s.rz.toFixed(3)}), ` +
    `curv=${s.curvature.toFixed(4)}, bank=${(s.banking * 180 / Math.PI).toFixed(2)}deg`
  );
}

console.log('\n--- Checking Road Width and Longitudinal Skew in roadGeo ---');
const halfW = ROAD_WIDTH / 2;
for (let z = 10; z >= -10; z -= 2) {
  const s = getRoadSplineSample(z);
  const leftX = s.x - s.rx * halfW;
  const leftZ = z - s.rz * halfW;
  const rightX = s.x + s.rx * halfW;
  const rightZ = z + s.rz * halfW;

  const dx = rightX - leftX;
  const dz = rightZ - leftZ;
  const actualWidth3D = Math.hypot(dx, dz);
  const longitudinalZSpread = Math.abs(rightZ - leftZ);

  console.log(
    `z=${z.toFixed(1).padStart(5)}: ` +
    `left=(${leftX.toFixed(2)}, ${leftZ.toFixed(2)}), right=(${rightX.toFixed(2)}, ${rightZ.toFixed(2)}), ` +
    `dist=${actualWidth3D.toFixed(2)}m (expected ${ROAD_WIDTH}), deltaZ_crossSection=${longitudinalZSpread.toFixed(2)}m`
  );
}
