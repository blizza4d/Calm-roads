import { setWorldGenerationConfig, getRoadSplineSample, ROAD_WIDTH } from '../src/utils/roadMath.ts';

setWorldGenerationConfig(1337, 'desert', 0);

const CHUNK_LEN = 200;
const segments = 50;
const halfW = ROAD_WIDTH / 2;

console.log('--- Inspecting roadGeo cross sections in chunk at chunkZ = 0 ---');
const verts = [];
for (let i = 0; i <= segments; i++) {
  const localZ = CHUNK_LEN / 2 - (i / segments) * CHUNK_LEN; // 100 down to -100
  const worldZ = 0 + localZ;
  const s = getRoadSplineSample(worldZ);

  const left = { x: s.x - s.rx * halfW, y: s.y + 0.085 - s.ry * halfW, z: localZ - s.rz * halfW, worldZ: worldZ - s.rz * halfW };
  const center = { x: s.x + s.nx * 0.025, y: s.y + 0.085 + s.ny * 0.025, z: localZ + s.nz * 0.025, worldZ: worldZ + s.nz * 0.025 };
  const right = { x: s.x + s.rx * halfW, y: s.y + 0.085 + s.ry * halfW, z: localZ + s.rz * halfW, worldZ: worldZ + s.rz * halfW };

  verts.push({ left, center, right, s, worldZ });
}

// Check adjacent cross-section distances and triangle distortion
for (let i = 0; i < segments; i++) {
  const c1 = verts[i];
  const c2 = verts[i + 1];

  // Quad 1: c1.left, c1.center, c2.left, c2.center
  // Quad 2: c1.center, c1.right, c2.center, c2.right
  const leftStep = Math.hypot(c2.left.x - c1.left.x, c2.left.z - c1.left.z);
  const centerStep = Math.hypot(c2.center.x - c1.center.x, c2.center.z - c1.center.z);
  const rightStep = Math.hypot(c2.right.x - c1.right.x, c2.right.z - c1.right.z);

  // Width of c1
  const width1 = Math.hypot(c1.right.x - c1.left.x, c1.right.z - c1.left.z);
  // Width of c2
  const width2 = Math.hypot(c2.right.x - c2.left.x, c2.right.z - c2.left.z);

  // Cross section angle with forward vector
  const crossX = c1.right.x - c1.left.x;
  const crossZ = c1.right.z - c1.left.z;
  const fwdX = c2.center.x - c1.center.x;
  const fwdZ = c2.center.z - c1.center.z;
  const dot = (crossX * fwdX + crossZ * fwdZ) / (Math.hypot(crossX, crossZ) * Math.hypot(fwdX, fwdZ));

  if (Math.abs(dot) > 0.3 || leftStep < 1.0 || rightStep < 1.0 || leftStep > 10.0 || rightStep > 10.0 || i % 5 === 0) {
    console.log(
      `row ${i.toString().padStart(2)} (wZ=${c1.worldZ.toFixed(0)}): ` +
      `w1=${width1.toFixed(2)}m, stepL=${leftStep.toFixed(2)}m, stepC=${centerStep.toFixed(2)}m, stepR=${rightStep.toFixed(2)}m, dot=${dot.toFixed(3)}`
    );
  }
}
