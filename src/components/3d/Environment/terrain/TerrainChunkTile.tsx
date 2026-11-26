import { useMemo, useRef, useEffect, useLayoutEffect, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { GraphicsQualityType } from '../../../../store/useGameStore'
import { worldReadinessRegistry } from '../../../../utils/loadingRegistry'
import type { BiomeConfig } from '../../../../utils/roadMath'
import { HighwaySigns } from '../HighwaySigns'
import { Landmarks3D } from '../Landmarks3D'
import { Bridges3D } from '../Bridges3D'
import { Tunnels3D } from '../Tunnels3D'
import { MicrodetailScenery } from '../MicrodetailScenery'

import {
  validateChunkGeometry,
  pineTrunkGeo,
  pineCanopyGeo,
  broadleafTrunkGeo,
  broadleafCanopyGeo,
  saguaroGeo,
  shrubGeo,
  rockGeo,
  grassTuftGeo,
  poleGeo,
  delineatorPostGeo,
  delineatorReflectorGeo,
  guardrailPostGeo,
  cabinGeo,
  cabinWindowGeo,
} from './terrainGeometries'

import {
  getBiomeMaterials,
  sharedMarkingsMat,
  sharedGuardrailMat,
  sharedGuardrailPostMat,
  sharedDelineatorPostMat,
  sharedDelineatorReflectorMat,
  sharedSaguaroMat,
  sharedPoleMat,
  sharedCabinMat,
  sharedCabinWindowMat,
  _dummy,
  _zeroMatrix,
  _tmpColor,
  AUTUMN_CANOPY_PALETTE,
} from './terrainMaterials'

import {
  createTerrainGeometry,
  updateTerrainGeometry,
} from './terrainGeometryBuilder'

import {
  createRoadGeometry,
  updateRoadGeometry,
  createShoulderGeometry,
  updateShoulderGeometry,
  createMarkingsGeometry,
  updateMarkingsGeometry,
  createGuardrailGeometry,
  updateGuardrailGeometry,
} from './roadGeometryBuilder'

import { generateSceneryDataForChunk } from './sceneryPlacement'

export interface ChunkProps {
  chunkZ: number
  biomeConfig: BiomeConfig
  isRaining: boolean
  graphicsQuality: GraphicsQualityType
}

export const TerrainChunkTile = memo(function TerrainChunkTile({
  chunkZ,
  biomeConfig,
  isRaining,
  graphicsQuality,
}: ChunkProps) {
  const mats = useMemo(() => getBiomeMaterials(biomeConfig, isRaining), [biomeConfig, isRaining])

  // 1. Terrain Ground Mesh Geometry (Pooled)
  const terrainGeo = useMemo(() => createTerrainGeometry(), [])

  useMemo(() => {
    updateTerrainGeometry(terrainGeo, chunkZ, biomeConfig)
  }, [chunkZ, biomeConfig, terrainGeo])

  // 2. Curved Asphalt Highway Ribbon Geometry (Pooled)
  const roadGeo = useMemo(() => createRoadGeometry(), [])

  useMemo(() => {
    updateRoadGeometry(roadGeo, chunkZ)
  }, [chunkZ, roadGeo])

  // 3. Roadside Gravel / Dirt Shoulder Strips (Pooled)
  const shoulderGeo = useMemo(() => createShoulderGeometry(), [])

  useMemo(() => {
    updateShoulderGeometry(shoulderGeo, chunkZ)
  }, [chunkZ, shoulderGeo])

  // 4. Highway Markings: Yellow Dashed Centerline + White Solid Outer Edge Lines (Pooled)
  const markingsGeo = useMemo(() => createMarkingsGeometry(), [])

  useMemo(() => {
    updateMarkingsGeometry(markingsGeo, chunkZ)
  }, [chunkZ, markingsGeo])

  // 5. Realistic Steel Highway Guardrails on Curved Outer Segments (Pooled)
  const guardrailGeo = useMemo(() => createGuardrailGeometry(), [])

  useMemo(() => {
    updateGuardrailGeometry(guardrailGeo, chunkZ)
  }, [chunkZ, guardrailGeo])

  // 6. Natural Clustered Roadside Scenery Data
  const sceneryData = useMemo(() => {
    return generateSceneryDataForChunk(chunkZ, biomeConfig)
  }, [chunkZ, biomeConfig.id])

  // Instanced Meshes for Vegetation & Scenery Props
  const pineTrunkRef = useRef<THREE.InstancedMesh>(null)
  const pineCanopyRef = useRef<THREE.InstancedMesh>(null)
  const broadleafTrunkRef = useRef<THREE.InstancedMesh>(null)
  const broadleafCanopyRef = useRef<THREE.InstancedMesh>(null)
  const saguaroRef = useRef<THREE.InstancedMesh>(null)
  const shrubRef = useRef<THREE.InstancedMesh>(null)
  const rockRef = useRef<THREE.InstancedMesh>(null)
  const grassRef = useRef<THREE.InstancedMesh>(null)
  const poleRef = useRef<THREE.InstancedMesh>(null)
  const delineatorPostRef = useRef<THREE.InstancedMesh>(null)
  const delineatorReflectorRef = useRef<THREE.InstancedMesh>(null)
  const guardrailPostRef = useRef<THREE.InstancedMesh>(null)
  const cabinRef = useRef<THREE.InstancedMesh>(null)
  const cabinWindowRef = useRef<THREE.InstancedMesh>(null)
  const sceneryGroupRef = useRef<THREE.Group>(null)
  const guardrailMeshRef = useRef<THREE.Mesh>(null)
  const markingsMeshRef = useRef<THREE.Mesh>(null)
  const shoulderMeshRef = useRef<THREE.Mesh>(null)
  const isNearShadowRef = useRef<boolean | null>(null)
  const isSceneryVisibleRef = useRef<boolean | null>(null)
  const isMarkingsVisibleRef = useRef<boolean | null>(null)
  const isShoulderVisibleRef = useRef<boolean | null>(null)
  const isGuardrailVisibleRef = useRef<boolean | null>(null)
  const lastCheckCamZRef = useRef<number>(-999999)

  useLayoutEffect(() => {
    const isAutumnBiome = biomeConfig.id === 'autumn'

    // 1. Pines (max 36)
    if (pineTrunkRef.current && pineCanopyRef.current) {
      sceneryData.pines.forEach((p, i) => {
        _dummy.position.set(p.pos[0], p.pos[1], p.pos[2])
        _dummy.scale.set(p.scale, p.scale, p.scale)
        _dummy.rotation.set(0, p.rotY, 0)
        _dummy.updateMatrix()
        pineTrunkRef.current?.setMatrixAt(i, _dummy.matrix)
        pineCanopyRef.current?.setMatrixAt(i, _dummy.matrix)

        const shade = 0.82 + ((i * 37 + Math.abs(Math.round(p.pos[0]))) % 32) * 0.011
        _tmpColor.setRGB(shade * 0.96, shade * 1.04, shade * 0.95)
        pineCanopyRef.current?.setColorAt(i, _tmpColor)
      })
      for (let i = sceneryData.pines.length; i < 36; i++) {
        pineTrunkRef.current.setMatrixAt(i, _zeroMatrix)
        pineCanopyRef.current.setMatrixAt(i, _zeroMatrix)
      }
      pineTrunkRef.current.instanceMatrix.needsUpdate = true
      pineCanopyRef.current.instanceMatrix.needsUpdate = true
      if (pineCanopyRef.current.instanceColor) pineCanopyRef.current.instanceColor.needsUpdate = true
    }

    // 2. Broadleafs (max 36)
    if (broadleafTrunkRef.current && broadleafCanopyRef.current) {
      sceneryData.broadleafs.forEach((b, i) => {
        _dummy.position.set(b.pos[0], b.pos[1], b.pos[2])
        _dummy.scale.set(b.scale, b.scale, b.scale)
        _dummy.rotation.set(0, b.rotY, 0)
        _dummy.updateMatrix()
        broadleafTrunkRef.current?.setMatrixAt(i, _dummy.matrix)
        broadleafCanopyRef.current?.setMatrixAt(i, _dummy.matrix)

        if (isAutumnBiome) {
          const pal = AUTUMN_CANOPY_PALETTE[(i + Math.abs(Math.round(b.pos[0] * 0.5))) % AUTUMN_CANOPY_PALETTE.length]
          const jitter = 0.90 + ((i * 19) % 20) * 0.01
          _tmpColor.copy(pal).multiplyScalar(jitter)
        } else {
          const shade = 0.80 + ((i * 29 + Math.abs(Math.round(b.pos[2]))) % 36) * 0.011
          _tmpColor.setRGB(shade * 0.98, shade * 1.06, shade * 0.92)
        }
        broadleafCanopyRef.current?.setColorAt(i, _tmpColor)
      })
      for (let i = sceneryData.broadleafs.length; i < 36; i++) {
        broadleafTrunkRef.current.setMatrixAt(i, _zeroMatrix)
        broadleafCanopyRef.current.setMatrixAt(i, _zeroMatrix)
      }
      broadleafTrunkRef.current.instanceMatrix.needsUpdate = true
      broadleafCanopyRef.current.instanceMatrix.needsUpdate = true
      if (broadleafCanopyRef.current.instanceColor) broadleafCanopyRef.current.instanceColor.needsUpdate = true
    }

    // 3. Saguaros (max 24)
    if (saguaroRef.current) {
      sceneryData.saguaros.forEach((s, i) => {
        _dummy.position.set(s.pos[0], s.pos[1], s.pos[2])
        _dummy.scale.set(s.scale, s.scale, s.scale)
        _dummy.rotation.set(0, s.rotY, 0)
        _dummy.updateMatrix()
        saguaroRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      for (let i = sceneryData.saguaros.length; i < 24; i++) {
        saguaroRef.current.setMatrixAt(i, _zeroMatrix)
      }
      saguaroRef.current.instanceMatrix.needsUpdate = true
    }

    // 4. Shrubs (max 24)
    if (shrubRef.current) {
      sceneryData.shrubs.forEach((s, i) => {
        _dummy.position.set(s.pos[0], s.pos[1], s.pos[2])
        _dummy.scale.set(s.scale, s.scale, s.scale)
        _dummy.rotation.set(0, s.rotY, 0)
        _dummy.updateMatrix()
        shrubRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      for (let i = sceneryData.shrubs.length; i < 24; i++) {
        shrubRef.current.setMatrixAt(i, _zeroMatrix)
      }
      shrubRef.current.instanceMatrix.needsUpdate = true
    }

    // 5. Rocks (max 24)
    if (rockRef.current) {
      sceneryData.rocks.forEach((r, i) => {
        _dummy.position.set(r.pos[0], r.pos[1], r.pos[2])
        _dummy.scale.set(r.scale[0], r.scale[1], r.scale[2])
        _dummy.rotation.set(r.rot[0], r.rot[1], r.rot[2])
        _dummy.updateMatrix()
        rockRef.current?.setMatrixAt(i, _dummy.matrix)
        const rockShade = 0.78 + ((i * 41 + Math.abs(Math.round(r.pos[0]))) % 40) * 0.01
        _tmpColor.setRGB(rockShade, rockShade * 0.99, rockShade * 0.97)
        rockRef.current?.setColorAt(i, _tmpColor)
      })
      for (let i = sceneryData.rocks.length; i < 24; i++) {
        rockRef.current.setMatrixAt(i, _zeroMatrix)
      }
      rockRef.current.instanceMatrix.needsUpdate = true
      if (rockRef.current.instanceColor) rockRef.current.instanceColor.needsUpdate = true
    }

    // 6. Grass Tufts (max 36)
    if (grassRef.current) {
      sceneryData.grassTufts.forEach((g, i) => {
        _dummy.position.set(g.pos[0], g.pos[1], g.pos[2])
        _dummy.scale.set(g.scale, g.scale, g.scale)
        _dummy.rotation.set(0, g.rotY, 0)
        _dummy.updateMatrix()
        grassRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      for (let i = sceneryData.grassTufts.length; i < 36; i++) {
        grassRef.current.setMatrixAt(i, _zeroMatrix)
      }
      grassRef.current.instanceMatrix.needsUpdate = true
    }

    // 7. Utility Poles (max 16)
    if (poleRef.current) {
      sceneryData.poles.forEach((p, i) => {
        _dummy.position.set(p.pos[0], p.pos[1], p.pos[2])
        _dummy.scale.set(1, 1, 1)
        _dummy.rotation.set(0, 0, 0)
        _dummy.updateMatrix()
        poleRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      for (let i = sceneryData.poles.length; i < 16; i++) {
        poleRef.current.setMatrixAt(i, _zeroMatrix)
      }
      poleRef.current.instanceMatrix.needsUpdate = true
    }

    // 8. Roadside Reflector Delineator Posts (max 32)
    if (delineatorPostRef.current && delineatorReflectorRef.current) {
      sceneryData.delineators.forEach((d, i) => {
        _dummy.position.set(d.pos[0], d.pos[1], d.pos[2])
        _dummy.scale.set(1, 1, 1)
        _dummy.rotation.set(0, d.rotY, 0)
        _dummy.updateMatrix()
        delineatorPostRef.current?.setMatrixAt(i, _dummy.matrix)
        delineatorReflectorRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      for (let i = sceneryData.delineators.length; i < 32; i++) {
        delineatorPostRef.current.setMatrixAt(i, _zeroMatrix)
        delineatorReflectorRef.current.setMatrixAt(i, _zeroMatrix)
      }
      delineatorPostRef.current.instanceMatrix.needsUpdate = true
      delineatorReflectorRef.current.instanceMatrix.needsUpdate = true
    }

    // 8b. Guardrail Steel Support Posts (max 28)
    if (guardrailPostRef.current) {
      sceneryData.guardrailPosts.forEach((gp, i) => {
        _dummy.position.set(gp.pos[0], gp.pos[1], gp.pos[2])
        _dummy.scale.set(1, 1, 1)
        _dummy.rotation.set(0, 0, 0)
        _dummy.updateMatrix()
        guardrailPostRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      for (let i = sceneryData.guardrailPosts.length; i < 28; i++) {
        guardrailPostRef.current.setMatrixAt(i, _zeroMatrix)
      }
      guardrailPostRef.current.instanceMatrix.needsUpdate = true
    }

    // 9. Cozy Alpine Cabins (max 4)
    if (cabinRef.current && cabinWindowRef.current) {
      sceneryData.cabins.forEach((c, i) => {
        _dummy.position.set(c.pos[0], c.pos[1], c.pos[2])
        _dummy.scale.set(1, 1, 1)
        _dummy.rotation.set(0, c.rotY, 0)
        _dummy.updateMatrix()
        cabinRef.current?.setMatrixAt(i, _dummy.matrix)
        cabinWindowRef.current?.setMatrixAt(i, _dummy.matrix)
      })
      for (let i = sceneryData.cabins.length; i < 4; i++) {
        cabinRef.current.setMatrixAt(i, _zeroMatrix)
        cabinWindowRef.current.setMatrixAt(i, _zeroMatrix)
      }
      cabinRef.current.instanceMatrix.needsUpdate = true
      cabinWindowRef.current.instanceMatrix.needsUpdate = true
    }

    // Instance counts and bounding volumes
    if (pineTrunkRef.current) pineTrunkRef.current.count = sceneryData.pines.length
    if (pineCanopyRef.current) pineCanopyRef.current.count = sceneryData.pines.length
    if (broadleafTrunkRef.current) broadleafTrunkRef.current.count = sceneryData.broadleafs.length
    if (broadleafCanopyRef.current) broadleafCanopyRef.current.count = sceneryData.broadleafs.length
    if (saguaroRef.current) saguaroRef.current.count = sceneryData.saguaros.length
    if (shrubRef.current) shrubRef.current.count = sceneryData.shrubs.length
    if (rockRef.current) rockRef.current.count = sceneryData.rocks.length
    if (grassRef.current) grassRef.current.count = sceneryData.grassTufts.length
    if (poleRef.current) poleRef.current.count = sceneryData.poles.length
    if (delineatorPostRef.current) delineatorPostRef.current.count = sceneryData.delineators.length
    if (delineatorReflectorRef.current) delineatorReflectorRef.current.count = sceneryData.delineators.length
    if (guardrailPostRef.current) guardrailPostRef.current.count = sceneryData.guardrailPosts.length
    if (cabinRef.current) cabinRef.current.count = sceneryData.cabins.length
    if (cabinWindowRef.current) cabinWindowRef.current.count = sceneryData.cabins.length

    const allInstancedMeshes = [
      pineTrunkRef.current,
      pineCanopyRef.current,
      broadleafTrunkRef.current,
      broadleafCanopyRef.current,
      saguaroRef.current,
      shrubRef.current,
      rockRef.current,
      grassRef.current,
      poleRef.current,
      delineatorPostRef.current,
      delineatorReflectorRef.current,
      guardrailPostRef.current,
      cabinRef.current,
      cabinWindowRef.current,
    ]
    allInstancedMeshes.forEach((mesh) => {
      if (mesh) {
        mesh.computeBoundingBox()
        mesh.computeBoundingSphere()
      }
    })
  }, [sceneryData, biomeConfig.id])

  const lodLevelRef = useRef<number>(-1)

  useEffect(() => {
    lodLevelRef.current = -1
  }, [sceneryData])

  useFrame(({ camera }) => {
    const camZ = camera.position.z
    if (Math.abs(camZ - lastCheckCamZRef.current) < 2.0) {
      return
    }
    lastCheckCamZRef.current = camZ

    const dist = Math.abs(chunkZ - camZ)

    const maxSceneryDist = graphicsQuality === 'low' ? 800 : graphicsQuality === 'medium' ? 1100 : 1400
    const shadowDist = graphicsQuality === 'low' ? 60 : graphicsQuality === 'medium' ? 90 : 120

    const isMarkingsVisible = dist <= 1200
    if (isMarkingsVisible !== isMarkingsVisibleRef.current) {
      isMarkingsVisibleRef.current = isMarkingsVisible
      if (markingsMeshRef.current) markingsMeshRef.current.visible = isMarkingsVisible
    }

    const isGuardrailVisible = dist <= 1200
    if (isGuardrailVisible !== isGuardrailVisibleRef.current) {
      isGuardrailVisibleRef.current = isGuardrailVisible
      if (guardrailMeshRef.current) guardrailMeshRef.current.visible = isGuardrailVisible
    }

    const isShoulderVisible = dist <= 2200
    if (isShoulderVisible !== isShoulderVisibleRef.current) {
      isShoulderVisibleRef.current = isShoulderVisible
      if (shoulderMeshRef.current) shoulderMeshRef.current.visible = isShoulderVisible
    }

    const isSceneryVisible = dist <= maxSceneryDist
    if (isSceneryVisible !== isSceneryVisibleRef.current) {
      isSceneryVisibleRef.current = isSceneryVisible
      if (sceneryGroupRef.current) {
        sceneryGroupRef.current.visible = isSceneryVisible
      }
    }

    const isNearShadow = dist <= shadowDist
    if (isNearShadow !== isNearShadowRef.current) {
      isNearShadowRef.current = isNearShadow
      if (guardrailMeshRef.current) guardrailMeshRef.current.castShadow = isNearShadow
      if (pineTrunkRef.current) pineTrunkRef.current.castShadow = isNearShadow
      if (pineCanopyRef.current) pineCanopyRef.current.castShadow = isNearShadow
      if (broadleafTrunkRef.current) broadleafTrunkRef.current.castShadow = isNearShadow
      if (broadleafCanopyRef.current) broadleafCanopyRef.current.castShadow = isNearShadow
      if (saguaroRef.current) saguaroRef.current.castShadow = isNearShadow
      if (rockRef.current) rockRef.current.castShadow = isNearShadow
      if (poleRef.current) poleRef.current.castShadow = isNearShadow
      if (delineatorPostRef.current) delineatorPostRef.current.castShadow = isNearShadow
      if (cabinRef.current) cabinRef.current.castShadow = isNearShadow
    }

    if (!isSceneryVisible) return

    let newLod = 0
    if (dist > maxSceneryDist * 0.7) newLod = 2
    else if (dist > maxSceneryDist * 0.35) newLod = 1

    if (newLod !== lodLevelRef.current) {
      lodLevelRef.current = newLod

      const microMult = newLod >= 1 ? 0 : 1
      const midMult = newLod >= 2 ? 0 : 1

      if (grassRef.current) grassRef.current.count = sceneryData.grassTufts.length * microMult
      if (delineatorPostRef.current) delineatorPostRef.current.count = sceneryData.delineators.length * microMult
      if (delineatorReflectorRef.current) delineatorReflectorRef.current.count = sceneryData.delineators.length * microMult
      if (shrubRef.current) shrubRef.current.count = sceneryData.shrubs.length * microMult

      if (rockRef.current) rockRef.current.count = sceneryData.rocks.length * midMult
      if (poleRef.current) poleRef.current.count = sceneryData.poles.length * midMult
      if (guardrailPostRef.current) guardrailPostRef.current.count = sceneryData.guardrailPosts.length * midMult

      if (pineTrunkRef.current) pineTrunkRef.current.count = sceneryData.pines.length
      if (pineCanopyRef.current) pineCanopyRef.current.count = sceneryData.pines.length
      if (broadleafTrunkRef.current) broadleafTrunkRef.current.count = sceneryData.broadleafs.length
      if (broadleafCanopyRef.current) broadleafCanopyRef.current.count = sceneryData.broadleafs.length
      if (saguaroRef.current) saguaroRef.current.count = sceneryData.saguaros.length
      if (cabinRef.current) cabinRef.current.count = sceneryData.cabins.length
      if (cabinWindowRef.current) cabinWindowRef.current.count = sceneryData.cabins.length
    }
  })

  useLayoutEffect(() => {
    const isTerrainValid = validateChunkGeometry(terrainGeo, `terrainGeo(${chunkZ})`)
    const isRoadValid = validateChunkGeometry(roadGeo, `roadGeo(${chunkZ})`)
    const isShoulderValid = validateChunkGeometry(shoulderGeo, `shoulderGeo(${chunkZ})`)
    const isMarkingsValid = validateChunkGeometry(markingsGeo, `markingsGeo(${chunkZ})`)

    if (isTerrainValid && isRoadValid && isShoulderValid && isMarkingsValid) {
      worldReadinessRegistry.markChunkValidated(
        chunkZ,
        terrainGeo.attributes.position.count,
        roadGeo.attributes.position.count
      )
    } else {
      worldReadinessRegistry.terrainError = `Invalid geometry detected at chunk Z=${chunkZ}`
    }

    return () => {
      worldReadinessRegistry.unmarkChunk(chunkZ)
    }
  }, [chunkZ, terrainGeo, roadGeo, shoulderGeo, markingsGeo])

  useEffect(() => {
    return () => {
      terrainGeo.dispose()
      roadGeo.dispose()
      shoulderGeo.dispose()
      markingsGeo.dispose()
      guardrailGeo.dispose()
    }
  }, [terrainGeo, roadGeo, shoulderGeo, markingsGeo, guardrailGeo])

  return (
    <group position={[0, 0, chunkZ]}>
      {/* 1. Terrain Surface Mesh */}
      <mesh geometry={terrainGeo} material={mats.terrainMat} receiveShadow frustumCulled={true} />

      {/* 2. Curved Asphalt Highway Ribbon */}
      <mesh geometry={roadGeo} material={mats.roadMat} receiveShadow renderOrder={2} frustumCulled={true} />

      {/* 3. Roadside Gravel Shoulder Strips */}
      <mesh ref={shoulderMeshRef} geometry={shoulderGeo} material={mats.shoulderMat} receiveShadow renderOrder={1} frustumCulled={true} />

      {/* 4. Highway Markings */}
      <mesh ref={markingsMeshRef} geometry={markingsGeo} material={sharedMarkingsMat} renderOrder={3} frustumCulled={true} />

      {/* 5. Steel W-Beam Guardrails */}
      <mesh ref={guardrailMeshRef} geometry={guardrailGeo} material={sharedGuardrailMat} castShadow={false} receiveShadow frustumCulled={true} />

      {/* 6. Biome-Specific Instanced Scenery Group */}
      <group ref={sceneryGroupRef}>
        <instancedMesh
          ref={pineTrunkRef}
          args={[pineTrunkGeo, undefined, 36]}
          material={mats.pineTrunkMat}
          count={sceneryData.pines.length}
          castShadow={false}
          receiveShadow
          frustumCulled={true}
        />
        <instancedMesh
          ref={pineCanopyRef}
          args={[pineCanopyGeo, undefined, 36]}
          material={mats.pineCanopyMat}
          count={sceneryData.pines.length}
          castShadow={false}
          receiveShadow
          frustumCulled={true}
        />
        <instancedMesh
          ref={broadleafTrunkRef}
          args={[broadleafTrunkGeo, undefined, 36]}
          material={mats.broadleafTrunkMat}
          count={sceneryData.broadleafs.length}
          castShadow={false}
          receiveShadow
          frustumCulled={true}
        />
        <instancedMesh
          ref={broadleafCanopyRef}
          args={[broadleafCanopyGeo, undefined, 36]}
          material={mats.broadleafCanopyMat}
          count={sceneryData.broadleafs.length}
          castShadow={false}
          receiveShadow
          frustumCulled={true}
        />
        <instancedMesh
          ref={saguaroRef}
          args={[saguaroGeo, undefined, 24]}
          material={sharedSaguaroMat}
          count={sceneryData.saguaros.length}
          castShadow={false}
          receiveShadow
          frustumCulled={true}
        />
        <instancedMesh
          ref={shrubRef}
          args={[shrubGeo, undefined, 24]}
          material={mats.shrubMat}
          count={sceneryData.shrubs.length}
          receiveShadow
          frustumCulled={true}
        />
        <instancedMesh
          ref={rockRef}
          args={[rockGeo, undefined, 24]}
          material={mats.rockMat}
          count={sceneryData.rocks.length}
          castShadow={false}
          receiveShadow
          frustumCulled={true}
        />
        <instancedMesh
          ref={grassRef}
          args={[grassTuftGeo, undefined, 36]}
          material={mats.grassMat}
          count={sceneryData.grassTufts.length}
          receiveShadow
          frustumCulled={true}
        />
        <instancedMesh
          ref={poleRef}
          args={[poleGeo, undefined, 16]}
          material={sharedPoleMat}
          count={sceneryData.poles.length}
          castShadow={false}
          frustumCulled={true}
        />
        <instancedMesh
          ref={delineatorPostRef}
          args={[delineatorPostGeo, undefined, 32]}
          material={sharedDelineatorPostMat}
          count={sceneryData.delineators.length}
          castShadow={false}
          receiveShadow
          frustumCulled={true}
        />
        <instancedMesh
          ref={delineatorReflectorRef}
          args={[delineatorReflectorGeo, undefined, 32]}
          material={sharedDelineatorReflectorMat}
          count={sceneryData.delineators.length}
          frustumCulled={true}
        />
        <instancedMesh
          ref={guardrailPostRef}
          args={[guardrailPostGeo, undefined, 28]}
          material={sharedGuardrailPostMat}
          count={sceneryData.guardrailPosts.length}
          castShadow={false}
          receiveShadow
          frustumCulled={true}
        />
        <instancedMesh
          ref={cabinRef}
          args={[cabinGeo, undefined, 4]}
          material={sharedCabinMat}
          count={sceneryData.cabins.length}
          castShadow={false}
          receiveShadow
          frustumCulled={true}
        />
        <instancedMesh
          ref={cabinWindowRef}
          args={[cabinWindowGeo, undefined, 4]}
          material={sharedCabinWindowMat}
          count={sceneryData.cabins.length}
          frustumCulled={true}
        />
      </group>

      {/* Procedural Highway Signage */}
      <HighwaySigns chunkZ={chunkZ} />

      {/* Signature Environmental Landmarks */}
      <Landmarks3D chunkZ={chunkZ} />

      {/* Highway Bridges, Viaducts & Overpasses */}
      <Bridges3D chunkZ={chunkZ} />

      {/* Mountain Tunnels & Overhead Sodium Lamps */}
      <Tunnels3D chunkZ={chunkZ} />

      {/* Environmental Microdetails */}
      <MicrodetailScenery chunkZ={chunkZ} biomeId={biomeConfig.id} graphicsQuality={graphicsQuality} />
    </group>
  )
}, (prev, next) => (
  prev.chunkZ === next.chunkZ &&
  prev.biomeConfig.id === next.biomeConfig.id &&
  prev.isRaining === next.isRaining &&
  prev.graphicsQuality === next.graphicsQuality
))
