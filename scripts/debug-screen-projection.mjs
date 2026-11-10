import * as THREE from 'three';
import { setWorldGenerationConfig, getRoadSplineSample, getRoadCenter, getRoadElevation, getSpawnTransform, ROAD_WIDTH } from '../src/utils/roadMath.ts';

setWorldGenerationConfig(1337, 'desert', 0);
const spawn = getSpawnTransform(0);
console.log('Spawn:', spawn);

// Chase camera setup matching VehicleController:
// _tempCamOffset.set(0, 1.82, 4.85).applyQuaternion(carQuat).add(carPos)
// _tempCamLookAt.set(0, 0.86, -lookAhead - 2.8).applyQuaternion(carQuat).add(carPos)

const carPos = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
const carQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spawn.yaw);

const camPos = new THREE.Vector3(0, 1.82, 4.85).applyQuaternion(carQuat).add(carPos);
const camLookAt = new THREE.Vector3(0, 0.86, -2.8).applyQuaternion(carQuat).add(carPos);

console.log('Camera Pos:', camPos);
console.log('Camera LookAt:', camLookAt);

const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 4200);
camera.position.copy(camPos);
camera.lookAt(camLookAt);
camera.updateMatrixWorld();

// Function to project world point to normalized device coordinates (NDC [-1, 1])
function project(worldPos) {
  const p = worldPos.clone().project(camera);
  return { ndcX: p.x, ndcY: p.y, ndcZ: p.z, behind: p.z > 1 || p.z < -1 };
}

console.log('\n--- Centerline Dashes near vehicle projected to Camera Screen ---');
// Let's check Chunk 0 dashes:
const CHUNK_LEN = 200;
const dashSpacing = 14;
const dashLen = 7.0;
const halfLineW = 0.075;
const numDashes = 16;
const chunkZ = 0;

const startWorldZ = chunkZ + CHUNK_LEN / 2;
const firstDashWz = Math.floor(startWorldZ / dashSpacing) * dashSpacing + dashSpacing * 0.5;

for (let i = 0; i < numDashes; i++) {
  const wzCenter = firstDashWz - i * dashSpacing;
  const localZCenter = wzCenter - chunkZ;
  const rawStart = localZCenter + dashLen / 2;
  const rawEnd = localZCenter - dashLen / 2;

  const localZStart = Math.min(CHUNK_LEN / 2, Math.max(-CHUNK_LEN / 2, rawStart));
  const localZEnd = Math.min(CHUNK_LEN / 2, Math.max(-CHUNK_LEN / 2, rawEnd));

  if (localZStart - localZEnd > 0.05) {
    const wzStart = chunkZ + localZStart;
    const wzEnd = chunkZ + localZEnd;
    const sStart = getRoadSplineSample(wzStart);
    const sEnd = getRoadSplineSample(wzEnd);

    const pStart = new THREE.Vector3(sStart.x, sStart.y + 0.11, wzStart);
    const pEnd = new THREE.Vector3(sEnd.x, sEnd.y + 0.11, wzEnd);

    const projStart = project(pStart);
    const projEnd = project(pEnd);

    console.log(
      `dash ${i.toString().padStart(2)}: wz=[${wzStart.toFixed(1)}, ${wzEnd.toFixed(1)}], ` +
      `worldStart=(${pStart.x.toFixed(1)}, ${pStart.y.toFixed(1)}, ${pStart.z.toFixed(1)}), ` +
      `screenStart=(${projStart.ndcX.toFixed(2)}, ${projStart.ndcY.toFixed(2)}), ` +
      `screenEnd=(${projEnd.ndcX.toFixed(2)}, ${projEnd.ndcY.toFixed(2)})`
    );
  }
}
