import {
  setWorldGenerationConfig,
  ROAD_WIDTH,
  ROAD_PROTECTED_RADIUS,
  ROAD_CLEARANCE_BASE
} from '../src/utils/roadMath.ts';

// Prototype new spline and cross-section logic:
function testCrossSectionMath() {
  console.log('Testing cross section logic...');
  const ROAD_W = 11.5;
  const halfW = ROAD_W / 2;
  const shoulderW = 2.2;

  // Let's test a sample with arbitrary tangent and banking
  const tx = -0.68;
  const ty = -0.02;
  const tz = -0.73;
  const ds = Math.hypot(tx, ty, tz);
  const uTx = tx / ds;
  const uTy = ty / ds;
  const uTz = tz / ds;

  const hLen = Math.hypot(uTx, uTz);
  const r0x = -uTz / hLen;
  const r0y = 0.0;
  const r0z = uTx / hLen;

  const n0x = -r0z * uTy;
  const n0y = r0z * uTx - r0x * uTz;
  const n0z = r0x * uTy;

  const banking = 0.05; // ~2.8 deg
  const cosB = Math.cos(banking);
  const sinB = Math.sin(banking);

  const rx = cosB * r0x + sinB * n0x;
  const ry = cosB * r0y + sinB * n0y;
  const rz = cosB * r0z + sinB * n0z;

  const nx = -sinB * r0x + cosB * n0x;
  const ny = -sinB * r0y + cosB * n0y;
  const nz = -sinB * r0z + cosB * n0z;

  // Horizontal right vector (unbanked) vs 3D right vector
  console.log('R0 length:', Math.hypot(r0x, r0y, r0z));
  console.log('R length:', Math.hypot(rx, ry, rz));
  console.log('N length:', Math.hypot(nx, ny, nz));
  console.log('R . T:', rx * uTx + ry * uTy + rz * uTz);
  console.log('N . T:', nx * uTx + ny * uTy + nz * uTz);
  console.log('R . N:', rx * nx + ry * ny + rz * nz);

  const cx = 30.0;
  const cy = 36.0;
  const cz = 0.0;

  const leftX = cx - rx * halfW;
  const leftY = cy - ry * halfW;
  const leftZ = cz - rz * halfW;

  const rightX = cx + rx * halfW;
  const rightY = cy + ry * halfW;
  const rightZ = cz + rz * halfW;

  const dist3D = Math.hypot(rightX - leftX, rightY - leftY, rightZ - leftZ);
  console.log('Calculated 3D road width:', dist3D.toFixed(4), 'expected:', ROAD_W);
}

testCrossSectionMath();
