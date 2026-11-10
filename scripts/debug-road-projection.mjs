import * as THREE from 'three';
import { setWorldGenerationConfig, getRoadSplineSample, getSpawnTransform, ROAD_WIDTH } from '../src/utils/roadMath.ts';

setWorldGenerationConfig(1337, 'desert', 0);
const spawn = getSpawnTransform(0);

const carPos = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
const carQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spawn.yaw);

const camPos = new THREE.Vector3(0, 1.82, 4.85).applyQuaternion(carQuat).add(carPos);
const camLookAt = new THREE.Vector3(0, 0.86, -2.8).applyQuaternion(carQuat).add(carPos);

const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 4200);
camera.position.copy(camPos);
camera.lookAt(camLookAt);
camera.updateMatrixWorld();

function project(worldPos) {
  const p = worldPos.clone().project(camera);
  return { ndcX: p.x, ndcY: p.y, ndcZ: p.z };
}

const halfW = ROAD_WIDTH / 2;
console.log('--- Projected road cross sections ahead of car ---');
for (let z = 0; z >= -60; z -= 4) {
  const s = getRoadSplineSample(z);
  const left = new THREE.Vector3(s.x - s.rx * halfW, s.y + 0.085 - s.ry * halfW, z - s.rz * halfW);
  const center = new THREE.Vector3(s.x, s.y + 0.085, z);
  const right = new THREE.Vector3(s.x + s.rx * halfW, s.y + 0.085 + s.ry * halfW, z + s.rz * halfW);

  const pL = project(left);
  const pC = project(center);
  const pR = project(right);

  const screenWidth = Math.hypot(pR.ndcX - pL.ndcX, pR.ndcY - pL.ndcY);

  // In camera view space (view matrix)
  const viewLeft = left.clone().applyMatrix4(camera.matrixWorldInverse);
  const viewRight = right.clone().applyMatrix4(camera.matrixWorldInverse);
  const viewCenter = center.clone().applyMatrix4(camera.matrixWorldInverse);

  console.log(
    `z=${z.toString().padStart(3)}: ` +
    `viewDist=${(-viewCenter.z).toFixed(1)}m, ` +
    `screenWidth=${screenWidth.toFixed(2)}, ` +
    `pL=(${pL.ndcX.toFixed(2)}, ${pL.ndcY.toFixed(2)}), ` +
    `pR=(${pR.ndcX.toFixed(2)}, ${pR.ndcY.toFixed(2)}), ` +
    `viewL.z=${viewLeft.z.toFixed(2)}, viewR.z=${viewRight.z.toFixed(2)}`
  );
}
