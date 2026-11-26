import * as THREE from 'three'

// Robust Geometry Validation to guarantee zero non-finite coordinates or corrupted buffers
export function validateChunkGeometry(geo: THREE.BufferGeometry, name: string): boolean {
  const pos = geo.attributes.position
  if (!pos || pos.count === 0) return false
  const arr = pos.array as Float32Array
  for (let i = 0; i < arr.length; i += 3) {
    if (!Number.isFinite(arr[i]) || !Number.isFinite(arr[i + 1]) || !Number.isFinite(arr[i + 2])) {
      console.warn(`[Geometry Validation] Non-finite vertex in ${name} at index ${i / 3}`)
      return false
    }
  }
  return true
}

// Helper to merge multiple BufferGeometries into a single geometry with positions, normals, and UVs
export function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry()
  const posList: number[] = []
  const normList: number[] = []
  const uvList: number[] = []
  const indexList: number[] = []
  let vertexOffset = 0

  for (const g of geometries) {
    const pos = g.attributes.position
    const norm = g.attributes.normal
    const uv = g.attributes.uv
    const index = g.index

    for (let i = 0; i < pos.count; i++) {
      posList.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (norm) normList.push(norm.getX(i), norm.getY(i), norm.getZ(i))
      else normList.push(0, 1, 0)
      if (uv) uvList.push(uv.getX(i), uv.getY(i))
      else uvList.push(0, 0)
    }

    if (index) {
      for (let i = 0; i < index.count; i++) {
        indexList.push(index.getX(i) + vertexOffset)
      }
    } else {
      for (let i = 0; i < pos.count; i++) {
        indexList.push(i + vertexOffset)
      }
    }
    vertexOffset += pos.count
  }

  merged.setAttribute('position', new THREE.Float32BufferAttribute(posList, 3))
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normList, 3))
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvList, 2))
  merged.setIndex(indexList)
  return merged
}

// ------------------------------------------------------------------------
// Realistic Procedural Vegetation & Geological Geometries
// ------------------------------------------------------------------------

// 1. Alpine / Mountain Conifer: 5-tiered organic asymmetrical conical skirt canopy
export const pineCanopyGeo = (() => {
  const t1 = new THREE.ConeGeometry(2.5, 2.1, 10).translate(0, 2.0, 0)
  const t2 = new THREE.ConeGeometry(2.05, 1.9, 10).rotateY(0.4).translate(0, 3.2, 0)
  const t3 = new THREE.ConeGeometry(1.55, 1.7, 10).rotateY(-0.3).translate(0, 4.4, 0)
  const t4 = new THREE.ConeGeometry(1.05, 1.5, 9).rotateY(0.6).translate(0, 5.5, 0)
  const t5 = new THREE.ConeGeometry(0.55, 1.2, 8).rotateY(-0.5).translate(0, 6.4, 0)
  return mergeBufferGeometries([t1, t2, t3, t4, t5])
})()
export const pineTrunkGeo = new THREE.CylinderGeometry(0.16, 0.45, 5.2, 8).translate(0, 2.6, 0)

// 2. Deciduous Broadleaf / Mountain Maple: Organic 5-cluster asymmetrical canopy
export const broadleafCanopyGeo = (() => {
  const c1 = new THREE.DodecahedronGeometry(1.8, 1).translate(0, 4.0, 0)
  const c2 = new THREE.DodecahedronGeometry(1.35, 1).translate(-0.85, 3.6, 0.35)
  const c3 = new THREE.DodecahedronGeometry(1.4, 1).translate(0.8, 3.7, -0.3)
  const c4 = new THREE.DodecahedronGeometry(1.1, 1).translate(0.1, 3.2, 0.85)
  const c5 = new THREE.DodecahedronGeometry(1.15, 1).translate(-0.2, 3.5, -0.8)
  return mergeBufferGeometries([c1, c2, c3, c4, c5])
})()
export const broadleafTrunkGeo = new THREE.CylinderGeometry(0.2, 0.48, 4.2, 8).translate(0, 2.1, 0)

// 3. Desert Saguaro Cactus: Multi-armed branching columnar cactus with accordion pleats & dome caps
export const saguaroGeo = (() => {
  const main = new THREE.CylinderGeometry(0.34, 0.38, 5.0, 16, 10)
  const mainPos = main.attributes.position
  for (let i = 0; i < mainPos.count; i++) {
    const x = mainPos.getX(i)
    const z = mainPos.getZ(i)
    const r = Math.sqrt(x * x + z * z)
    if (r > 0.05) {
      const angle = Math.atan2(z, x)
      const flute = Math.sin(angle * 12) * 0.028
      const newR = r + flute
      mainPos.setX(i, Math.cos(angle) * newR)
      mainPos.setZ(i, Math.sin(angle) * newR)
    }
  }
  main.translate(0, 2.5, 0)
  main.computeVertexNormals()

  const mainCap = new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 5.0, 0)
  const armLHoriz = new THREE.CylinderGeometry(0.2, 0.22, 0.75, 10).rotateZ(Math.PI / 2).translate(-0.55, 2.4, 0)
  const armLElbow = new THREE.SphereGeometry(0.21, 10, 8).translate(-0.95, 2.4, 0)
  const armLVert = new THREE.CylinderGeometry(0.19, 0.21, 1.6, 10).translate(-0.95, 3.2, 0)
  const armLCap = new THREE.SphereGeometry(0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(-0.95, 4.0, 0)

  const armRHoriz = new THREE.CylinderGeometry(0.18, 0.2, 0.75, 10).rotateZ(-Math.PI / 2).translate(0.55, 3.0, 0)
  const armRElbow = new THREE.SphereGeometry(0.19, 10, 8).translate(0.95, 3.0, 0)
  const armRVert = new THREE.CylinderGeometry(0.17, 0.19, 1.35, 10).translate(0.95, 3.7, 0)
  const armRCap = new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0.95, 4.38, 0)

  const merged = mergeBufferGeometries([
    main, mainCap,
    armLHoriz, armLElbow, armLVert, armLCap,
    armRHoriz, armRElbow, armRVert, armRCap
  ])
  merged.computeVertexNormals()
  return merged
})()

// 4. Roadside Shrub / Bush: Multi-lobed low foliage clump
export const shrubGeo = (() => {
  const s1 = new THREE.DodecahedronGeometry(0.95, 1).scale(1.2, 0.7, 1.1).translate(0, 0.55, 0)
  const s2 = new THREE.DodecahedronGeometry(0.7, 1).scale(1.1, 0.65, 1.0).translate(-0.45, 0.42, 0.2)
  const s3 = new THREE.DodecahedronGeometry(0.75, 1).scale(1.0, 0.65, 1.1).translate(0.42, 0.45, -0.25)
  return mergeBufferGeometries([s1, s2, s3])
})()

// 5. Geological Weathered Boulders with sharp fracture cleavage planes
export const rockGeo = (() => {
  const geo = new THREE.DodecahedronGeometry(1.5, 1)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const strata = Math.sin(y * 2.8) * 0.12
    const cleavage = Math.sin(x * 1.9 + z * 1.6) * 0.15
    const facet = Math.sin(x * 3.8 + y * 1.8) * 0.07
    const yFlatten = y < -0.4 ? y * 0.5 - 0.2 : y * 0.75
    pos.setXYZ(i, x * (1.15 + strata) + cleavage * 0.18, yFlatten + strata * 0.35, z * (0.95 - strata) + facet * 0.12)
  }
  geo.computeVertexNormals()
  return geo
})()

// 6. Roadside Wild Grass / Meadow Foliage Clumps
export const grassTuftGeo = (() => {
  const p1 = new THREE.PlaneGeometry(0.85, 0.65).translate(0, 0.32, 0)
  const p2 = new THREE.PlaneGeometry(0.85, 0.65).rotateY(Math.PI / 3).translate(0, 0.32, 0)
  const p3 = new THREE.PlaneGeometry(0.85, 0.65).rotateY(-Math.PI / 3).translate(0, 0.32, 0)
  return mergeBufferGeometries([p1, p2, p3])
})()

// 7. Highway Utility Pole: Heavy creosote timber mast, crossarm, metal angle braces, ceramic insulators, transformer & apex spike
export const poleGeo = (() => {
  const mast = new THREE.CylinderGeometry(0.13, 0.19, 7.2, 10).translate(0, 3.6, 0)
  const crossarm = new THREE.BoxGeometry(2.3, 0.13, 0.13).translate(0, 6.4, 0)
  const braceL = new THREE.BoxGeometry(0.035, 0.95, 0.035).rotateZ(0.72).translate(-0.46, 6.0, 0.08)
  const braceR = new THREE.BoxGeometry(0.035, 0.95, 0.035).rotateZ(-0.72).translate(0.46, 6.0, 0.08)
  const insulL = new THREE.CylinderGeometry(0.045, 0.065, 0.22, 8).translate(-0.92, 6.56, 0)
  const insulC = new THREE.CylinderGeometry(0.045, 0.065, 0.22, 8).translate(0, 6.56, 0)
  const insulR = new THREE.CylinderGeometry(0.045, 0.065, 0.22, 8).translate(0.92, 6.56, 0)
  const spike = new THREE.ConeGeometry(0.03, 0.38, 6).translate(0, 7.38, 0)
  const trans = new THREE.CylinderGeometry(0.15, 0.15, 0.48, 8).translate(0.28, 5.75, 0)

  const merged = mergeBufferGeometries([
    mast, crossarm, braceL, braceR, insulL, insulC, insulR, spike, trans
  ])
  merged.computeVertexNormals()
  return merged
})()

// 8. Highway Reflector Delineator Posts (Guide Posts / Leitpfosten)
export const delineatorPostGeo = new THREE.CylinderGeometry(0.065, 0.075, 1.15, 12).translate(0, 0.575, 0)
export const delineatorReflectorGeo = new THREE.CylinderGeometry(0.076, 0.076, 0.16, 12).translate(0, 0.92, 0)

// 8b. Galvanized Steel Guardrail I-Beam Support Post
export const guardrailPostGeo = new THREE.BoxGeometry(0.11, 1.05, 0.11).translate(0, 0.30, 0)

// 9. Cozy Alpine Timber Cabin with Steep Snow-Covered Gable Roof & Stone Chimney
export const cabinGeo = (() => {
  const body = new THREE.BoxGeometry(5.2, 3.0, 5.8).translate(0, 1.5, 0)
  const roofL = new THREE.BoxGeometry(3.4, 0.22, 6.4).rotateZ(0.68).translate(-1.32, 3.65, 0)
  const roofR = new THREE.BoxGeometry(3.4, 0.22, 6.4).rotateZ(-0.68).translate(1.32, 3.65, 0)
  const snowRoofL = new THREE.BoxGeometry(3.5, 0.32, 6.5).rotateZ(0.68).translate(-1.32, 3.82, 0)
  const snowRoofR = new THREE.BoxGeometry(3.5, 0.32, 6.5).rotateZ(-0.68).translate(1.32, 3.82, 0)
  const chimney = new THREE.BoxGeometry(0.78, 4.6, 0.78).translate(1.5, 2.3, 1.5)
  const porchFloor = new THREE.BoxGeometry(4.8, 0.25, 1.8).translate(0, 0.125, -3.2)
  const porchRoof = new THREE.BoxGeometry(5.0, 0.18, 2.0).translate(0, 2.5, -3.2)
  const postL = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8).translate(-2.0, 1.25, -3.4)
  const postR = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8).translate(2.0, 1.25, -3.4)

  const merged = mergeBufferGeometries([
    body, roofL, roofR, snowRoofL, snowRoofR, chimney, porchFloor, porchRoof, postL, postR
  ])
  merged.computeVertexNormals()
  return merged
})()

export const cabinWindowGeo = (() => {
  const wFrontL = new THREE.PlaneGeometry(0.85, 0.85).translate(-1.2, 1.8, -2.91)
  const wFrontR = new THREE.PlaneGeometry(0.85, 0.85).translate(1.2, 1.8, -2.91)
  const wSideL = new THREE.PlaneGeometry(0.85, 0.85).rotateY(Math.PI / 2).translate(-2.61, 1.8, 0)
  const wSideR = new THREE.PlaneGeometry(0.85, 0.85).rotateY(-Math.PI / 2).translate(2.61, 1.8, 0)

  const merged = mergeBufferGeometries([wFrontL, wFrontR, wSideL, wSideR])
  merged.computeVertexNormals()
  return merged
})()

// Pre-assign chunk-spanning bounding spheres to all instanced geometries
export const CHUNK_SPHERE = new THREE.Sphere(new THREE.Vector3(0, 30, 0), 220)
pineTrunkGeo.boundingSphere = CHUNK_SPHERE
pineCanopyGeo.boundingSphere = CHUNK_SPHERE
broadleafTrunkGeo.boundingSphere = CHUNK_SPHERE
broadleafCanopyGeo.boundingSphere = CHUNK_SPHERE
saguaroGeo.boundingSphere = CHUNK_SPHERE
shrubGeo.boundingSphere = CHUNK_SPHERE
rockGeo.boundingSphere = CHUNK_SPHERE
grassTuftGeo.boundingSphere = CHUNK_SPHERE
poleGeo.boundingSphere = CHUNK_SPHERE
delineatorPostGeo.boundingSphere = CHUNK_SPHERE
delineatorReflectorGeo.boundingSphere = CHUNK_SPHERE
guardrailPostGeo.boundingSphere = CHUNK_SPHERE
cabinGeo.boundingSphere = CHUNK_SPHERE
cabinWindowGeo.boundingSphere = CHUNK_SPHERE
