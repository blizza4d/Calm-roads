import { memo, useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import {
  getRoadSplineSample,
  ROAD_WIDTH,
  getSurfaceHeight,
  BiomeType,
} from '../../../utils/roadMath'
import { GraphicsQualityType } from '../../../store/useGameStore'

const CHUNK_LEN = 200

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Low-poly microdetail geometries
const pebbleGeo = new THREE.DodecahedronGeometry(0.24, 0).translate(0, 0.12, 0)
const branchGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.6, 5).rotateZ(Math.PI / 2).translate(0, 0.06, 0)
const flowerGeo = new THREE.ConeGeometry(0.25, 0.45, 5).translate(0, 0.22, 0)

// Shared Materials
const pebbleMat = new THREE.MeshStandardMaterial({
  color: '#64748b',
  roughness: 0.92,
  metalness: 0.05,
})

const branchMat = new THREE.MeshStandardMaterial({
  color: '#452a1a',
  roughness: 0.94,
  metalness: 0.02,
})

const flowerMat = new THREE.MeshStandardMaterial({
  color: '#f43f5e', // Vibrant mountain wildflower
  roughness: 0.75,
  metalness: 0.02,
})

const _dummy = new THREE.Object3D()
const _zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0)

export const MicrodetailScenery = memo(function MicrodetailScenery({
  chunkZ,
  biomeId,
  graphicsQuality,
}: {
  chunkZ: number
  biomeId: BiomeType
  graphicsQuality: GraphicsQualityType
}) {
  const pebbleRef = useRef<THREE.InstancedMesh>(null)
  const branchRef = useRef<THREE.InstancedMesh>(null)
  const flowerRef = useRef<THREE.InstancedMesh>(null)

  const count = useMemo(() => {
    if (graphicsQuality === 'low') return 0
    if (graphicsQuality === 'medium') return 12
    if (graphicsQuality === 'high') return 24
    return 36
  }, [graphicsQuality])

  // Deterministically generate microdetail items along the road verges
  const items = useMemo(() => {
    if (count === 0) return []
    const rng = mulberry32(Math.abs(Math.round(chunkZ)) * 1337 + 42)
    const list: Array<{
      type: 'pebble' | 'branch' | 'flower'
      x: number
      y: number
      z: number
      rotY: number
      scale: number
    }> = []

    for (let i = 0; i < count; i++) {
      const zOffset = rng() * CHUNK_LEN
      const wz = chunkZ - zOffset
      const sample = getRoadSplineSample(wz)
      const side = rng() > 0.5 ? 1 : -1
      // Placed on road verges: between 6.5m (just off shoulder) and 18.0m (natural terrain edge)
      const distFromCenter = ROAD_WIDTH * 0.5 + 1.2 + rng() * 10.5
      const posX = sample.x + sample.rx * distFromCenter * side
      const posZ = -zOffset + sample.rz * distFromCenter * side
      const groundY = getSurfaceHeight(posX, wz, biomeId)

      const typeR = rng()
      const type: 'pebble' | 'branch' | 'flower' =
        typeR < 0.45 ? 'pebble' : typeR < 0.75 ? 'branch' : 'flower'

      list.push({
        type,
        x: posX,
        y: groundY,
        z: posZ,
        rotY: rng() * Math.PI * 2,
        scale: 0.75 + rng() * 0.55,
      })
    }
    return list
  }, [chunkZ, biomeId, count])

  useLayoutEffect(() => {
    if (count === 0) return

    let pIdx = 0
    let bIdx = 0
    let fIdx = 0

    items.forEach((item) => {
      _dummy.position.set(item.x, item.y, item.z)
      _dummy.rotation.set(0, item.rotY, 0)
      _dummy.scale.set(item.scale, item.scale, item.scale)
      _dummy.updateMatrix()

      if (item.type === 'pebble' && pebbleRef.current && pIdx < 24) {
        pebbleRef.current.setMatrixAt(pIdx++, _dummy.matrix)
      } else if (item.type === 'branch' && branchRef.current && bIdx < 16) {
        branchRef.current.setMatrixAt(bIdx++, _dummy.matrix)
      } else if (item.type === 'flower' && flowerRef.current && fIdx < 16) {
        flowerRef.current.setMatrixAt(fIdx++, _dummy.matrix)
      }
    })

    if (pebbleRef.current) {
      for (let i = pIdx; i < 24; i++) pebbleRef.current.setMatrixAt(i, _zeroMatrix)
      pebbleRef.current.instanceMatrix.needsUpdate = true
    }
    if (branchRef.current) {
      for (let i = bIdx; i < 16; i++) branchRef.current.setMatrixAt(i, _zeroMatrix)
      branchRef.current.instanceMatrix.needsUpdate = true
    }
    if (flowerRef.current) {
      for (let i = fIdx; i < 16; i++) flowerRef.current.setMatrixAt(i, _zeroMatrix)
      flowerRef.current.instanceMatrix.needsUpdate = true
    }
  }, [items, count])

  if (count === 0) return null

  return (
    <group position={[0, 0, 0]}>
      <instancedMesh
        ref={pebbleRef}
        args={[pebbleGeo, pebbleMat, 24]}
        castShadow={false}
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={branchRef}
        args={[branchGeo, branchMat, 16]}
        castShadow={false}
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={flowerRef}
        args={[flowerGeo, flowerMat, 16]}
        castShadow={false}
        receiveShadow
        frustumCulled={false}
      />
    </group>
  )
})
