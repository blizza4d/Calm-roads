import * as THREE from 'three';
import {
  setWorldGenerationConfig,
  getRoadCrossSection,
  getRoadArcLength,
  getZFromArcLength,
  ROAD_WIDTH
} from '../src/utils/roadMath.ts';

setWorldGenerationConfig(1337, 'desert', 0);

const DASH_LEN = 7.0;
const DASH_GAP = 7.0;
const DASH_CYCLE = DASH_LEN + DASH_GAP;
const maxDashes = 18;
const edgeSegments = 50;

function createMarkingsGeo() {
  const geo = new THREE.BufferGeometry();
  const dashVerts = maxDashes * 6;
  const edgeVerts = (edgeSegments + 1) * 4; // 51 * 2 for left, 51 * 2 for right
  const totalVerts = dashVerts + edgeVerts;

  const posArr = new Float32Array(totalVerts * 3);
  const normArr = new Float32Array(totalVerts * 3);
  const colArr = new Float32Array(totalVerts * 3);
  const indices = [];

  // Centerline indices & colors (amber)
  for (let d = 0; d < maxDashes; d++) {
    const base = d * 6;
    for (let j = 0; j < 6; j++) {
      normArr[(base + j) * 3 + 1] = 1.0;
      colArr[(base + j) * 3] = 0.92;
      colArr[(base + j) * 3 + 1] = 0.64;
      colArr[(base + j) * 3 + 2] = 0.08;
    }
    // Quad 1: row0 to row1
    indices.push(base, base + 2, base + 1);
    indices.push(base + 1, base + 2, base + 3);
    // Quad 2: row1 to row2
    indices.push(base + 2, base + 4, base + 3);
    indices.push(base + 3, base + 4, base + 5);
  }

  // Edge lines indices & colors (white)
  const edgeBaseVert = dashVerts;
  const rightEdgeBaseVert = edgeBaseVert + (edgeSegments + 1) * 2;
  for (let i = 0; i <= edgeSegments; i++) {
    for (let j = 0; j < 4; j++) {
      const idx = edgeBaseVert + i * 2 + (j >= 2 ? (edgeSegments + 1) * 2 - 2 + (j - 2) : j);
      normArr[idx * 3 + 1] = 1.0;
      colArr[idx * 3] = 0.85;
      colArr[idx * 3 + 1] = 0.86;
      colArr[idx * 3 + 2] = 0.88;
    }
    if (i < edgeSegments) {
      // Left line quad
      const lBase = edgeBaseVert + i * 2;
      indices.push(lBase, lBase + 2, lBase + 1);
      indices.push(lBase + 1, lBase + 2, lBase + 3);
      // Right line quad
      const rBase = rightEdgeBaseVert + i * 2;
      indices.push(rBase, rBase + 2, rBase + 1);
      indices.push(rBase + 1, rBase + 2, rBase + 3);
    }
  }

  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  geo.setIndex(indices);
  return geo;
}

function updateMarkings(geo, chunkZ) {
  const CHUNK_LEN = 200;
  const pos = geo.attributes.position.array;

  // 1. Centerline Dashes
  const wzStart = chunkZ + CHUNK_LEN / 2;
  const wzEnd = chunkZ - CHUNK_LEN / 2;
  const sStart = getRoadArcLength(wzStart);
  const sEnd = getRoadArcLength(wzEnd);

  const kMin = Math.floor(sStart / DASH_CYCLE);
  const kMax = Math.ceil(sEnd / DASH_CYCLE);

  let activeDashes = 0;
  let lastValidPoint = null;

  for (let k = kMin; k <= kMax; k++) {
    const cycleStart = k * DASH_CYCLE;
    const d1 = Math.max(sStart, cycleStart);
    const d2 = Math.min(sEnd, cycleStart + DASH_LEN);

    if (d2 - d1 > 0.05 && activeDashes < maxDashes) {
      const dMid = (d1 + d2) * 0.5;
      const z1 = getZFromArcLength(d1);
      const zMid = getZFromArcLength(dMid);
      const z2 = getZFromArcLength(d2);

      const cs1 = getRoadCrossSection(z1, chunkZ);
      const csM = getRoadCrossSection(zMid, chunkZ);
      const cs2 = getRoadCrossSection(z2, chunkZ);

      const vBase = activeDashes * 6 * 3;
      // Row 0
      pos[vBase + 0] = cs1.centerDashLeft.lx;
      pos[vBase + 1] = cs1.centerDashLeft.ly;
      pos[vBase + 2] = cs1.centerDashLeft.lz;
      pos[vBase + 3] = cs1.centerDashRight.lx;
      pos[vBase + 4] = cs1.centerDashRight.ly;
      pos[vBase + 5] = cs1.centerDashRight.lz;

      // Row 1
      pos[vBase + 6] = csM.centerDashLeft.lx;
      pos[vBase + 7] = csM.centerDashLeft.ly;
      pos[vBase + 8] = csM.centerDashLeft.lz;
      pos[vBase + 9] = csM.centerDashRight.lx;
      pos[vBase + 10] = csM.centerDashRight.ly;
      pos[vBase + 11] = csM.centerDashRight.lz;

      // Row 2
      pos[vBase + 12] = cs2.centerDashLeft.lx;
      pos[vBase + 13] = cs2.centerDashLeft.ly;
      pos[vBase + 14] = cs2.centerDashLeft.lz;
      pos[vBase + 15] = cs2.centerDashRight.lx;
      pos[vBase + 16] = cs2.centerDashRight.ly;
      pos[vBase + 17] = cs2.centerDashRight.lz;

      lastValidPoint = cs2.centerDashLeft;
      activeDashes++;
    }
  }

  // Fill remaining dash slots with flat 0-area point at lastValidPoint (tight bounds)
  const defaultPt = lastValidPoint || getRoadCrossSection(chunkZ, chunkZ).centerDashLeft;
  for (let d = activeDashes; d < maxDashes; d++) {
    const vBase = d * 6 * 3;
    for (let j = 0; j < 6; j++) {
      pos[vBase + j * 3 + 0] = defaultPt.lx;
      pos[vBase + j * 3 + 1] = defaultPt.ly;
      pos[vBase + j * 3 + 2] = defaultPt.lz;
    }
  }

  // 2. White Edge Lines
  const edgeBaseVert = maxDashes * 6;
  const rightEdgeBaseVert = edgeBaseVert + (edgeSegments + 1) * 2;

  for (let i = 0; i <= edgeSegments; i++) {
    const localZ = CHUNK_LEN / 2 - (i / edgeSegments) * CHUNK_LEN;
    const worldZ = chunkZ + localZ;
    const cs = getRoadCrossSection(worldZ, chunkZ);

    const lIdx = (edgeBaseVert + i * 2) * 3;
    pos[lIdx + 0] = cs.edgeLeftInner.lx;
    pos[lIdx + 1] = cs.edgeLeftInner.ly;
    pos[lIdx + 2] = cs.edgeLeftInner.lz;
    pos[lIdx + 3] = cs.edgeLeftOuter.lx;
    pos[lIdx + 4] = cs.edgeLeftOuter.ly;
    pos[lIdx + 5] = cs.edgeLeftOuter.lz;

    const rIdx = (rightEdgeBaseVert + i * 2) * 3;
    pos[rIdx + 0] = cs.edgeRightInner.lx;
    pos[rIdx + 1] = cs.edgeRightInner.ly;
    pos[rIdx + 2] = cs.edgeRightInner.lz;
    pos[rIdx + 3] = cs.edgeRightOuter.lx;
    pos[rIdx + 4] = cs.edgeRightOuter.ly;
    pos[rIdx + 5] = cs.edgeRightOuter.lz;
  }

  geo.attributes.position.needsUpdate = true;
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
}

console.log('Testing markingsGeo creation & update...');
const geo = createMarkingsGeo();
updateMarkings(geo, 0);

console.log('Bounding Box Y min:', geo.boundingBox.min.y, 'max:', geo.boundingBox.max.y);
console.log('Bounding Box Z min:', geo.boundingBox.min.z, 'max:', geo.boundingBox.max.z);
console.log('Bounding Box valid finite:', Number.isFinite(geo.boundingBox.min.y) && geo.boundingBox.min.y > 0);
