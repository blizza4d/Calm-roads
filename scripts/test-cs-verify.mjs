import { setWorldGenerationConfig, getRoadSplineSample, ROAD_WIDTH } from '../src/utils/roadMath.ts';

function getRoadCrossSection(worldZ, localZ) {
  const s = getRoadSplineSample(worldZ);
  const halfW = ROAD_WIDTH / 2; // 5.75
  const shoulderW = 2.2;
  const edgeLineOffset = halfW - 0.45; // 5.30
  const edgeLineHalfW = 0.06;
  const centerLineHalfW = 0.075;

  const crownH = 0.025;
  const asphaltBaseY = 0.085;
  const lineLift = 0.010;

  // World coordinates
  const cx = s.x;
  const cy = s.y + asphaltBaseY;
  const cz = worldZ;

  // Helper for point
  const pt = (w, liftY, liftN) => {
    const wx = cx + s.rx * w + s.nx * liftN;
    const wy = cy + s.ry * w + s.ny * liftN + liftY;
    const wz = cz + s.rz * w + s.nz * liftN;
    const lx = wx;
    const ly = wy;
    const lz = wz - (worldZ - localZ); // wz - chunkZ
    return { wx, wy, wz, lx, ly, lz };
  };

  return {
    roadLeft: pt(-halfW, 0, 0),
    roadCenter: pt(0, 0, crownH),
    roadRight: pt(halfW, 0, 0),

    shoulderOuterLeft: pt(-halfW - shoulderW, -0.070, 0),
    shoulderInnerLeft: pt(-halfW, 0, 0),
    shoulderInnerRight: pt(halfW, 0, 0),
    shoulderOuterRight: pt(halfW + shoulderW, -0.070, 0),

    edgeLeftInner: pt(-edgeLineOffset + edgeLineHalfW, 0, lineLift),
    edgeLeftOuter: pt(-edgeLineOffset - edgeLineHalfW, 0, lineLift),
    edgeRightInner: pt(edgeLineOffset - edgeLineHalfW, 0, lineLift),
    edgeRightOuter: pt(edgeLineOffset + edgeLineHalfW, 0, lineLift),

    centerDashLeft: pt(-centerLineHalfW, 0, crownH + lineLift),
    centerDashRight: pt(centerLineHalfW, 0, crownH + lineLift),

    spline: s,
  };
}

setWorldGenerationConfig(1337, 'desert', 0);
console.log('Testing cross section consistency...');

const cs = getRoadCrossSection(0, 0);
const roadW = Math.hypot(cs.roadRight.wx - cs.roadLeft.wx, cs.roadRight.wy - cs.roadLeft.wy, cs.roadRight.wz - cs.roadLeft.wz);
console.log('Road Width:', roadW.toFixed(4), 'm');

const leftSeam = Math.hypot(cs.shoulderInnerLeft.wx - cs.roadLeft.wx, cs.shoulderInnerLeft.wy - cs.roadLeft.wy, cs.shoulderInnerLeft.wz - cs.roadLeft.wz);
const rightSeam = Math.hypot(cs.shoulderInnerRight.wx - cs.roadRight.wx, cs.shoulderInnerRight.wy - cs.roadRight.wy, cs.shoulderInnerRight.wz - cs.roadRight.wz);
console.log('Road-Shoulder Left Seam Delta:', leftSeam.toFixed(6), 'm');
console.log('Road-Shoulder Right Seam Delta:', rightSeam.toFixed(6), 'm');

// Test Chunk Boundary match between chunk 0 (localZ = -100) and chunk -200 (localZ = +100):
const chunk0End = getRoadCrossSection(-100, -100); // worldZ = 0 + (-100) = -100
const chunkMinus200Start = getRoadCrossSection(-100, 100); // worldZ = -200 + 100 = -100

const boundaryDeltaLeft = Math.hypot(chunk0End.roadLeft.wx - chunkMinus200Start.roadLeft.wx, chunk0End.roadLeft.wy - chunkMinus200Start.roadLeft.wy, chunk0End.roadLeft.wz - chunkMinus200Start.roadLeft.wz);
const boundaryDeltaRight = Math.hypot(chunk0End.roadRight.wx - chunkMinus200Start.roadRight.wx, chunk0End.roadRight.wy - chunkMinus200Start.roadRight.wy, chunk0End.roadRight.wz - chunkMinus200Start.roadRight.wz);
console.log('Chunk Boundary Left Delta:', boundaryDeltaLeft.toFixed(6), 'm');
console.log('Chunk Boundary Right Delta:', boundaryDeltaRight.toFixed(6), 'm');
