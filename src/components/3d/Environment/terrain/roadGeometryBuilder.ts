import * as THREE from 'three'
import {
  getRoadCenter,
  getRoadSplineSample,
  ROAD_WIDTH,
} from '../../../../utils/roadMath'
import { validateChunkGeometry } from './terrainGeometries'

const CHUNK_LEN = 200

// ----------------------------------------------------------------------------
// 1. Curved Asphalt Highway Ribbon Geometry (Pooled)
// ----------------------------------------------------------------------------
export function createRoadGeometry(): THREE.BufferGeometry {
  const segments = 50
  const geo = new THREE.BufferGeometry()
  const posArr = new Float32Array((segments + 1) * 3 * 3)
  const normArr = new Float32Array((segments + 1) * 3 * 3)
  const uvArr = new Float32Array((segments + 1) * 3 * 2)
  const indices: number[] = []

  for (let i = 0; i <= segments; i++) {
    const idx = i * 3
    uvArr[idx * 2] = 0
    uvArr[idx * 2 + 1] = i * 0.8
    uvArr[(idx + 1) * 2] = 0.5
    uvArr[(idx + 1) * 2 + 1] = i * 0.8
    uvArr[(idx + 2) * 2] = 1.0
    uvArr[(idx + 2) * 2 + 1] = i * 0.8

    if (i < segments) {
      const row1 = i * 3
      const row2 = (i + 1) * 3
      indices.push(row1, row1 + 1, row2)
      indices.push(row1 + 1, row2 + 1, row2)
      indices.push(row1 + 1, row1 + 2, row2 + 1)
      indices.push(row1 + 2, row2 + 2, row2 + 1)
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2))
  geo.setIndex(indices)
  return geo
}

export function updateRoadGeometry(roadGeo: THREE.BufferGeometry, chunkZ: number): void {
  const segments = 50
  const pos = roadGeo.attributes.position.array as Float32Array
  const norm = roadGeo.attributes.normal.array as Float32Array
  const uv = roadGeo.attributes.uv.array as Float32Array
  const halfW = ROAD_WIDTH / 2

  for (let i = 0; i <= segments; i++) {
    const localZ = CHUNK_LEN / 2 - (i / segments) * CHUNK_LEN
    const worldZ = chunkZ + localZ
    const spline = getRoadSplineSample(worldZ)
    const v = worldZ / 24.0

    const baseIdx = i * 9
    // Left edge
    pos[baseIdx] = spline.x - spline.rx * halfW
    pos[baseIdx + 1] = spline.y + 0.085 - spline.ry * halfW
    pos[baseIdx + 2] = localZ - spline.rz * halfW
    norm[baseIdx] = spline.nx - spline.rx * 0.06
    norm[baseIdx + 1] = spline.ny
    norm[baseIdx + 2] = spline.nz - spline.rz * 0.06

    // Center crown
    pos[baseIdx + 3] = spline.x + spline.nx * 0.025
    pos[baseIdx + 4] = spline.y + 0.085 + spline.ny * 0.025
    pos[baseIdx + 5] = localZ + spline.nz * 0.025
    norm[baseIdx + 3] = spline.nx
    norm[baseIdx + 4] = spline.ny
    norm[baseIdx + 5] = spline.nz

    // Right edge
    pos[baseIdx + 6] = spline.x + spline.rx * halfW
    pos[baseIdx + 7] = spline.y + 0.085 + spline.ry * halfW
    pos[baseIdx + 8] = localZ + spline.rz * halfW
    norm[baseIdx + 6] = spline.nx + spline.rx * 0.06
    norm[baseIdx + 7] = spline.ny
    norm[baseIdx + 8] = spline.nz + spline.rz * 0.06

    const uvIdx = i * 6
    uv[uvIdx] = 0
    uv[uvIdx + 1] = v
    uv[uvIdx + 2] = 0.5
    uv[uvIdx + 3] = v
    uv[uvIdx + 4] = 1.0
    uv[uvIdx + 5] = v
  }
  roadGeo.attributes.position.needsUpdate = true
  roadGeo.attributes.normal.needsUpdate = true
  roadGeo.attributes.uv.needsUpdate = true
  roadGeo.computeBoundingSphere()
  roadGeo.computeBoundingBox()
  validateChunkGeometry(roadGeo, 'roadGeo')
}

// ----------------------------------------------------------------------------
// 2. Roadside Gravel / Dirt Shoulder Strips (Pooled)
// ----------------------------------------------------------------------------
export function createShoulderGeometry(): THREE.BufferGeometry {
  const segments = 32
  const geo = new THREE.BufferGeometry()
  const posArr = new Float32Array((segments + 1) * 4 * 3)
  const normArr = new Float32Array((segments + 1) * 4 * 3)
  const indices: number[] = []

  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j < 4; j++) {
      const nIdx = (i * 4 + j) * 3
      normArr[nIdx] = 0
      normArr[nIdx + 1] = 1
      normArr[nIdx + 2] = 0
    }
    if (i < segments) {
      const base = i * 4
      indices.push(base, base + 4, base + 1)
      indices.push(base + 1, base + 4, base + 5)
      indices.push(base + 2, base + 3, base + 6)
      indices.push(base + 3, base + 7, base + 6)
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3))
  geo.setIndex(indices)
  return geo
}

export function updateShoulderGeometry(shoulderGeo: THREE.BufferGeometry, chunkZ: number): void {
  const segments = 32
  const pos = shoulderGeo.attributes.position.array as Float32Array
  const norm = shoulderGeo.attributes.normal.array as Float32Array
  const innerW = ROAD_WIDTH / 2
  const outerW = ROAD_WIDTH / 2 + 2.2

  for (let i = 0; i <= segments; i++) {
    const localZ = CHUNK_LEN / 2 - (i / segments) * CHUNK_LEN
    const worldZ = chunkZ + localZ
    const spline = getRoadSplineSample(worldZ)

    const baseIdx = i * 12
    // Outer left shoulder
    pos[baseIdx] = spline.x - spline.rx * outerW
    pos[baseIdx + 1] = spline.y + 0.015 - spline.ry * outerW
    pos[baseIdx + 2] = localZ - spline.rz * outerW

    // Inner left shoulder
    pos[baseIdx + 3] = spline.x - spline.rx * innerW
    pos[baseIdx + 4] = spline.y + 0.085 - spline.ry * innerW
    pos[baseIdx + 5] = localZ - spline.rz * innerW

    // Inner right shoulder
    pos[baseIdx + 6] = spline.x + spline.rx * innerW
    pos[baseIdx + 7] = spline.y + 0.085 + spline.ry * innerW
    pos[baseIdx + 8] = localZ + spline.rz * innerW

    // Outer right shoulder
    pos[baseIdx + 9] = spline.x + spline.rx * outerW
    pos[baseIdx + 10] = spline.y + 0.015 + spline.ry * outerW
    pos[baseIdx + 11] = localZ + spline.rz * outerW

    // Sloped shoulder normals tilting outward from roadbed
    norm[baseIdx] = spline.nx - spline.rx * 0.28
    norm[baseIdx + 1] = spline.ny * 0.96
    norm[baseIdx + 2] = spline.nz - spline.rz * 0.28

    norm[baseIdx + 3] = spline.nx - spline.rx * 0.12
    norm[baseIdx + 4] = spline.ny
    norm[baseIdx + 5] = spline.nz - spline.rz * 0.12

    norm[baseIdx + 6] = spline.nx + spline.rx * 0.12
    norm[baseIdx + 7] = spline.ny
    norm[baseIdx + 8] = spline.nz + spline.rz * 0.12

    norm[baseIdx + 9] = spline.nx + spline.rx * 0.28
    norm[baseIdx + 10] = spline.ny * 0.96
    norm[baseIdx + 11] = spline.nz + spline.rz * 0.28
  }
  shoulderGeo.attributes.position.needsUpdate = true
  shoulderGeo.attributes.normal.needsUpdate = true
  shoulderGeo.computeBoundingSphere()
  shoulderGeo.computeBoundingBox()
}

// ----------------------------------------------------------------------------
// 3. Highway Markings: Yellow Dashed Centerline + White Solid Outer Edge Lines (Pooled)
// ----------------------------------------------------------------------------
export function createMarkingsGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  const numDashes = 16
  const edgeSegments = 36
  const totalVerts = numDashes * 4 + (edgeSegments + 1) * 4
  const posArr = new Float32Array(totalVerts * 3)
  const normArr = new Float32Array(totalVerts * 3)
  const colArr = new Float32Array(totalVerts * 3)
  const indices: number[] = []

  let vIdx = 0
  // Centerline indices & colors (traffic amber)
  for (let i = 0; i < numDashes; i++) {
    for (let j = 0; j < 4; j++) {
      normArr[(vIdx + j) * 3 + 1] = 1.0
      colArr[(vIdx + j) * 3] = 0.92
      colArr[(vIdx + j) * 3 + 1] = 0.64
      colArr[(vIdx + j) * 3 + 2] = 0.08
    }
    indices.push(vIdx, vIdx + 1, vIdx + 2)
    indices.push(vIdx + 1, vIdx + 3, vIdx + 2)
    vIdx += 4
  }

  // Outer edge boundary lines indices & colors (weathered highway white)
  const edgeBaseVert = vIdx
  for (let i = 0; i <= edgeSegments; i++) {
    for (let j = 0; j < 4; j++) {
      normArr[(edgeBaseVert + i * 4 + j) * 3 + 1] = 1.0
      colArr[(edgeBaseVert + i * 4 + j) * 3] = 0.82
      colArr[(edgeBaseVert + i * 4 + j) * 3 + 1] = 0.84
      colArr[(edgeBaseVert + i * 4 + j) * 3 + 2] = 0.86
    }
    if (i < edgeSegments) {
      const base = edgeBaseVert + i * 4
      indices.push(base, base + 1, base + 4)
      indices.push(base + 1, base + 5, base + 4)
      indices.push(base + 2, base + 3, base + 6)
      indices.push(base + 3, base + 7, base + 6)
    }
  }

  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3))
  geo.setIndex(indices)
  return geo
}

export function updateMarkingsGeometry(markingsGeo: THREE.BufferGeometry, chunkZ: number): void {
  const pos = markingsGeo.attributes.position.array as Float32Array
  const dashSpacing = 14
  const dashLen = 7.0
  const halfLineW = 0.075
  const numDashes = 16

  let vOffset = 0

  // A. Yellow Dashed Centerline positions strictly locked to global world Z grid
  const startWorldZ = chunkZ + CHUNK_LEN / 2
  const firstDashWz = Math.floor(startWorldZ / dashSpacing) * dashSpacing + dashSpacing * 0.5

  for (let i = 0; i < numDashes; i++) {
    const wzCenter = firstDashWz - i * dashSpacing
    const localZCenter = wzCenter - chunkZ
    const rawStart = localZCenter + dashLen / 2
    const rawEnd = localZCenter - dashLen / 2

    const localZStart = Math.min(CHUNK_LEN / 2, Math.max(-CHUNK_LEN / 2, rawStart))
    const localZEnd = Math.min(CHUNK_LEN / 2, Math.max(-CHUNK_LEN / 2, rawEnd))

    if (localZStart - localZEnd > 0.05) {
      const wzStart = chunkZ + localZStart
      const wzEnd = chunkZ + localZEnd

      const sStart = getRoadSplineSample(wzStart)
      const sEnd = getRoadSplineSample(wzEnd)

      const lift = 0.014
      const crownLift = 0.025 + lift

      pos[vOffset] = sStart.x - sStart.rx * halfLineW + sStart.nx * crownLift
      pos[vOffset + 1] = sStart.y + 0.085 + sStart.ny * crownLift
      pos[vOffset + 2] = localZStart - sStart.rz * halfLineW + sStart.nz * crownLift

      pos[vOffset + 3] = sStart.x + sStart.rx * halfLineW + sStart.nx * crownLift
      pos[vOffset + 4] = sStart.y + 0.085 + sStart.ny * crownLift
      pos[vOffset + 5] = localZStart + sStart.rz * halfLineW + sStart.nz * crownLift

      pos[vOffset + 6] = sEnd.x - sEnd.rx * halfLineW + sEnd.nx * crownLift
      pos[vOffset + 7] = sEnd.y + 0.085 + sEnd.ny * crownLift
      pos[vOffset + 8] = localZEnd - sEnd.rz * halfLineW + sEnd.nz * crownLift

      pos[vOffset + 9] = sEnd.x + sEnd.rx * halfLineW + sEnd.nx * crownLift
      pos[vOffset + 10] = sEnd.y + 0.085 + sEnd.ny * crownLift
      pos[vOffset + 11] = localZEnd + sEnd.rz * halfLineW + sEnd.nz * crownLift
    } else {
      for (let j = 0; j < 4; j++) {
        pos[vOffset + j * 3] = 0
        pos[vOffset + j * 3 + 1] = -9999
        pos[vOffset + j * 3 + 2] = 0
      }
    }

    vOffset += 12
  }

  // B. Solid White Outer Edge Boundary positions
  const edgeOffset = ROAD_WIDTH / 2 - 0.45
  const edgeHalfW = 0.06
  const edgeSegments = 36

  for (let i = 0; i <= edgeSegments; i++) {
    const localZ = CHUNK_LEN / 2 - (i / edgeSegments) * CHUNK_LEN
    const worldZ = chunkZ + localZ
    const s = getRoadSplineSample(worldZ)
    const edgeLift = 0.010

    // Left edge line
    const lx = s.x - s.rx * edgeOffset
    const ly = s.y + 0.085 - s.ry * edgeOffset
    const lz = localZ - s.rz * edgeOffset

    pos[vOffset] = lx - s.rx * edgeHalfW + s.nx * edgeLift
    pos[vOffset + 1] = ly - s.ry * edgeHalfW + s.ny * edgeLift
    pos[vOffset + 2] = lz - s.rz * edgeHalfW + s.nz * edgeLift

    pos[vOffset + 3] = lx + s.rx * edgeHalfW + s.nx * edgeLift
    pos[vOffset + 4] = ly + s.ry * edgeHalfW + s.ny * edgeLift
    pos[vOffset + 5] = lz + s.rz * edgeHalfW + s.nz * edgeLift

    // Right edge line
    const rx = s.x + s.rx * edgeOffset
    const ry = s.y + 0.085 + s.ry * edgeOffset
    const rz = localZ + s.rz * edgeOffset

    pos[vOffset + 6] = rx - s.rx * edgeHalfW + s.nx * edgeLift
    pos[vOffset + 7] = ry - s.ry * edgeHalfW + s.ny * edgeLift
    pos[vOffset + 8] = rz - s.rz * edgeHalfW + s.nz * edgeLift

    pos[vOffset + 9] = rx + s.rx * edgeHalfW + s.nx * edgeLift
    pos[vOffset + 10] = ry + s.ry * edgeHalfW + s.ny * edgeLift
    pos[vOffset + 11] = rz + s.rz * edgeHalfW + s.nz * edgeLift

    vOffset += 12
  }

  markingsGeo.attributes.position.needsUpdate = true
  markingsGeo.computeBoundingSphere()
  markingsGeo.computeBoundingBox()
}

// ----------------------------------------------------------------------------
// 4. Realistic Steel Highway Guardrails on Curved Outer Segments (Pooled)
// ----------------------------------------------------------------------------
export function createGuardrailGeometry(): THREE.BufferGeometry {
  const maxSegments = 28
  const geo = new THREE.BufferGeometry()
  const posArr = new Float32Array(maxSegments * 4 * 3)
  const normArr = new Float32Array(maxSegments * 4 * 3)
  const indices: number[] = []

  for (let i = 0; i < maxSegments; i++) {
    const v = i * 4
    indices.push(v, v + 1, v + 2)
    indices.push(v + 1, v + 3, v + 2)
  }

  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3))
  geo.setIndex(indices)
  return geo
}

export function updateGuardrailGeometry(guardrailGeo: THREE.BufferGeometry, chunkZ: number): void {
  const segments = 28
  const pos = guardrailGeo.attributes.position.array as Float32Array
  const norm = guardrailGeo.attributes.normal.array as Float32Array
  const railOffset = ROAD_WIDTH / 2 + 1.2
  const railHeight = 0.65
  const railThickness = 0.22

  let quadCount = 0

  for (let i = 0; i < segments; i++) {
    const z1 = CHUNK_LEN / 2 - (i / segments) * CHUNK_LEN
    const z2 = CHUNK_LEN / 2 - ((i + 1) / segments) * CHUNK_LEN

    const wz1 = chunkZ + z1
    const wz2 = chunkZ + z2

    const cx1 = getRoadCenter(wz1)
    const cx2 = getRoadCenter(wz2)

    const isCurving = Math.abs(cx2 - cx1) > 0.4
    if (isCurving) {
      const s1 = getRoadSplineSample(wz1)
      const s2 = getRoadSplineSample(wz2)
      const side = cx2 > cx1 ? 1 : -1

      const p1x = s1.x + s1.rx * railOffset * side
      const p1y = s1.y + 0.085 + s1.ry * railOffset * side
      const p1z = z1 + s1.rz * railOffset * side

      const p2x = s2.x + s2.rx * railOffset * side
      const p2y = s2.y + 0.085 + s2.ry * railOffset * side
      const p2z = z2 + s2.rz * railOffset * side

      const pIdx = quadCount * 12
      pos[pIdx] = p1x + s1.nx * railHeight
      pos[pIdx + 1] = p1y + s1.ny * railHeight
      pos[pIdx + 2] = p1z + s1.nz * railHeight

      pos[pIdx + 3] = p1x + s1.nx * (railHeight - railThickness)
      pos[pIdx + 4] = p1y + s1.ny * (railHeight - railThickness)
      pos[pIdx + 5] = p1z + s1.nz * (railHeight - railThickness)

      pos[pIdx + 6] = p2x + s2.nx * railHeight
      pos[pIdx + 7] = p2y + s2.ny * railHeight
      pos[pIdx + 8] = p2z + s2.nz * railHeight

      pos[pIdx + 9] = p2x + s2.nx * (railHeight - railThickness)
      pos[pIdx + 10] = p2y + s2.ny * (railHeight - railThickness)
      pos[pIdx + 11] = p2z + s2.nz * (railHeight - railThickness)

      for (let j = 0; j < 4; j++) {
        norm[pIdx + j * 3] = s1.rx * side
        norm[pIdx + j * 3 + 1] = s1.ry * side
        norm[pIdx + j * 3 + 2] = s1.rz * side
      }
      quadCount++
    }
  }

  if (quadCount > 0) {
    guardrailGeo.attributes.position.needsUpdate = true
    guardrailGeo.attributes.normal.needsUpdate = true
    guardrailGeo.setDrawRange(0, quadCount * 6)
    guardrailGeo.computeBoundingSphere()
    guardrailGeo.computeBoundingBox()
  } else {
    guardrailGeo.setDrawRange(0, 0)
  }
}
