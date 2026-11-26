import * as THREE from 'three'
import { applyAtmosphericMaterialExtension } from '../../../../utils/atmosphericShader'
import {
  getAsphaltTexture,
  getAsphaltBumpTexture,
  getAsphaltRoughnessTexture,
  getTerrainBumpTexture,
  getWoodBumpTexture,
} from '../../../../utils/asphaltTexture'
import { getGrassAlphaTexture } from './foliageTextures'
import type { BiomeConfig } from '../../../../utils/roadMath'

// ----------------------------------------------------------------------------
// Shared Static Materials: Pre-allocated once to eliminate redundant WebGL material state changes
// ----------------------------------------------------------------------------
export const sharedGuardrailMat = new THREE.MeshStandardMaterial({
  color: '#cbd5e1',
  metalness: 0.78,
  roughness: 0.34,
  side: THREE.DoubleSide,
})

export const sharedGuardrailPostMat = new THREE.MeshStandardMaterial({
  color: '#64748b',
  metalness: 0.72,
  roughness: 0.45,
})

export const sharedMarkingsMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.40,
  metalness: 0.12,
  envMapIntensity: 0.85,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
  depthTest: true,
  depthWrite: false,
  side: THREE.DoubleSide,
})

export const sharedDelineatorPostMat = new THREE.MeshStandardMaterial({
  color: '#f8fafc',
  roughness: 0.45,
})

export const sharedDelineatorReflectorMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  emissive: new THREE.Color('#f59e0b'),
  emissiveIntensity: 1.8,
  roughness: 0.12,
  toneMapped: false,
})

export const sharedSaguaroMat = new THREE.MeshStandardMaterial({
  color: '#1e4e27',
  roughness: 0.86,
  metalness: 0.05,
})

export const sharedPoleMat = new THREE.MeshStandardMaterial({
  color: '#382518',
  bumpMap: getWoodBumpTexture(),
  bumpScale: 0.024,
  roughness: 0.92,
})

export const sharedCabinMat = new THREE.MeshStandardMaterial({
  color: '#452a1a', // Rich dark timber log cabin
  roughness: 0.86,
  metalness: 0.05,
})

export const sharedCabinWindowMat = new THREE.MeshStandardMaterial({
  color: '#fef08a',
  emissive: new THREE.Color('#f59e0b'),
  emissiveIntensity: 3.5,
  roughness: 0.12,
  toneMapped: false,
})

// Persistent reusable Object3D & Color to eliminate GC memory churn during instanced scenery updates
export const _dummy = new THREE.Object3D()
export const _zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0)
export const _tmpColor = new THREE.Color()
export const AUTUMN_CANOPY_PALETTE = [
  new THREE.Color('#c2410c'), // Burnt maple orange
  new THREE.Color('#b91c1c'), // Deep crimson red
  new THREE.Color('#d97706'), // Golden amber
  new THREE.Color('#eab308'), // Sunlit ochre yellow
  new THREE.Color('#9a3412'), // Russet mahogany
]

// ------------------------------------------------------------------------
// Module-level Shared Triplanar Shader, Wind Uniforms & Biome Materials Cache
// ------------------------------------------------------------------------
export const sharedFoliageUniforms = {
  uTime: { value: 0 },
}

export function onTerrainMaterialCompile(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
     varying vec3 vCustomWorldPos;
     varying vec3 vCustomWorldNorm;`
  )
  shader.vertexShader = shader.vertexShader.replace(
    '#include <worldpos_vertex>',
    `#include <worldpos_vertex>
     vCustomWorldPos = worldPosition.xyz;
     vCustomWorldNorm = normalize(mat3(modelMatrix) * normal);`
  )
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>
     varying vec3 vCustomWorldPos;
     varying vec3 vCustomWorldNorm;`
  )
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <roughnessmap_fragment>',
    `#include <roughnessmap_fragment>
     vec3 triWeight = abs(vCustomWorldNorm);
     triWeight = normalize(max(triWeight, 0.001));
     float bSum = triWeight.x + triWeight.y + triWeight.z;
     triWeight /= bSum;

     // 1. Slope-dependent exposed rock crags with sedimentary striated layering
     float slope = vCustomWorldNorm.y;
     if (slope < 0.72) {
       float rockBlend = smoothstep(0.72, 0.40, slope);
       float striation = sin(vCustomWorldPos.y * 1.8 + vCustomWorldPos.x * 0.08) * 0.05;
       vec3 rockTint = vec3(0.24, 0.28, 0.34) + striation;
       diffuseColor.rgb = mix(diffuseColor.rgb, rockTint, rockBlend * 0.85);
       roughnessFactor = mix(roughnessFactor, 0.94, rockBlend * 0.85);
     }

     // 2. Low-elevation valley moisture and rich fertile forest floor
     if (vCustomWorldPos.y < 14.0) {
       float valleyMoist = smoothstep(14.0, 4.0, vCustomWorldPos.y);
       vec3 soilTint = vec3(0.18, 0.16, 0.12);
       diffuseColor.rgb = mix(diffuseColor.rgb, soilTint, valleyMoist * 0.35);
     }

     // 3. Continuous per-pixel altitude-based alpine snow blending on mountain peaks
     float snowLine = 48.0;
     float snowCeiling = 82.0;
     float altT = clamp((vCustomWorldPos.y - snowLine) / (snowCeiling - snowLine), 0.0, 1.0);
     float snowCoverage = smoothstep(0.0, 1.0, altT);
     float slopeHold = clamp(vCustomWorldNorm.y * 1.25, 0.0, 1.0);
     float finalSnow = snowCoverage * (0.35 + 0.65 * slopeHold);
     vec3 alpineSnow = vec3(0.80, 0.85, 0.90);
     diffuseColor.rgb = mix(diffuseColor.rgb, alpineSnow, finalSnow * 0.82);
     roughnessFactor = mix(roughnessFactor, 0.58, finalSnow * 0.82);`
  )
  applyAtmosphericMaterialExtension(shader)
}

export function onFoliageMaterialCompile(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.uniforms.uTime = sharedFoliageUniforms.uTime

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
     uniform float uTime;`
  )
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
     float folY = max(0.0, position.y);
     float wPhase = uTime * 2.2 + position.x * 0.35 + position.z * 0.28;
     float sway = sin(wPhase) * cos(wPhase * 0.65) * (folY * 0.038);
     transformed.x += sway * 0.85;
     transformed.z += sway * 0.52;`
  )
  applyAtmosphericMaterialExtension(shader)
}

export function onRoadMaterialCompile(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
     varying vec3 vRoadWorldPos;`
  )
  shader.vertexShader = shader.vertexShader.replace(
    '#include <worldpos_vertex>',
    `#include <worldpos_vertex>
     vRoadWorldPos = worldPosition.xyz;`
  )
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>
     varying vec3 vRoadWorldPos;`
  )
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <roughnessmap_fragment>',
    `#include <roughnessmap_fragment>
     float asphaltNoise = sin(vRoadWorldPos.x * 4.0) * sin(vRoadWorldPos.z * 4.0) * 0.04;
     diffuseColor.rgb += asphaltNoise;`
  )
  applyAtmosphericMaterialExtension(shader)
}

export interface BiomeMaterials {
  terrainMat: THREE.MeshStandardMaterial
  roadMat: THREE.MeshStandardMaterial
  shoulderMat: THREE.MeshStandardMaterial
  pineTrunkMat: THREE.MeshStandardMaterial
  pineCanopyMat: THREE.MeshStandardMaterial
  broadleafTrunkMat: THREE.MeshStandardMaterial
  broadleafCanopyMat: THREE.MeshStandardMaterial
  shrubMat: THREE.MeshStandardMaterial
  rockMat: THREE.MeshStandardMaterial
  grassMat: THREE.MeshStandardMaterial
}

const _biomeMaterialsCache = new Map<string, BiomeMaterials>()

export function getBiomeMaterials(biomeConfig: BiomeConfig, isRaining: boolean): BiomeMaterials {
  const key = `${biomeConfig.id}_${isRaining ? 'wet' : 'dry'}`
  const existing = _biomeMaterialsCache.get(key)
  if (existing) return existing

  const asphaltTex = getAsphaltTexture()
  const asphaltBumpTex = getAsphaltBumpTexture()
  const asphaltRoughTex = getAsphaltRoughnessTexture()
  const terrainBumpTex = getTerrainBumpTexture()
  const grassAlphaTex = getGrassAlphaTexture()

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    bumpMap: terrainBumpTex,
    bumpScale: 0.036,
    roughness: biomeConfig.roughness,
    metalness: 0.04,
  })
  terrainMat.onBeforeCompile = onTerrainMaterialCompile

  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    bumpMap: asphaltBumpTex,
    bumpScale: 0.026,
    roughnessMap: asphaltRoughTex,
    color: '#ffffff',
    roughness: isRaining ? 0.22 : biomeConfig.id === 'tundra' ? 0.88 : 0.84,
    metalness: isRaining ? 0.42 : 0.08,
    envMapIntensity: isRaining ? 1.55 : 0.72,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  roadMat.onBeforeCompile = onRoadMaterialCompile

  const shoulderMat = new THREE.MeshStandardMaterial({
    color: biomeConfig.shoulderColor,
    bumpMap: terrainBumpTex,
    bumpScale: 0.024,
    roughness: 0.92,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  })

  const pineTrunkMat = new THREE.MeshStandardMaterial({
    color: biomeConfig.treeTrunkColor,
    roughness: 0.88,
  })

  const pineCanopyMat = new THREE.MeshStandardMaterial({
    color: biomeConfig.id === 'tundra' ? '#e2e8f0' : biomeConfig.treeFoliageColor,
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.FrontSide,
  })

  const broadleafTrunkMat = new THREE.MeshStandardMaterial({
    color: biomeConfig.treeTrunkColor,
    roughness: 0.88,
  })

  const broadleafCanopyMat = new THREE.MeshStandardMaterial({
    color: biomeConfig.id === 'autumn' ? '#ffffff' : biomeConfig.treeFoliageColor,
    roughness: 0.82,
    metalness: 0.05,
    side: THREE.FrontSide,
  })

  const shrubMat = new THREE.MeshStandardMaterial({
    color: biomeConfig.id === 'desert' ? '#854d0e' : biomeConfig.treeFoliageColor,
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.FrontSide,
  })

  const rockMat = new THREE.MeshStandardMaterial({
    color: biomeConfig.rockColor,
    roughness: 0.92,
    metalness: 0.04,
  })

  const grassMat = new THREE.MeshStandardMaterial({
    color: biomeConfig.id === 'autumn' ? '#854d0e' : biomeConfig.treeFoliageColor,
    roughness: 0.85,
    alphaMap: grassAlphaTex,
    transparent: true,
    alphaTest: 0.5,
    depthWrite: true,
    side: THREE.DoubleSide,
  })

  pineCanopyMat.onBeforeCompile = onFoliageMaterialCompile
  broadleafCanopyMat.onBeforeCompile = onFoliageMaterialCompile
  shrubMat.onBeforeCompile = onFoliageMaterialCompile
  grassMat.onBeforeCompile = onFoliageMaterialCompile

  const mats: BiomeMaterials = {
    terrainMat,
    roadMat,
    shoulderMat,
    pineTrunkMat,
    pineCanopyMat,
    broadleafTrunkMat,
    broadleafCanopyMat,
    shrubMat,
    rockMat,
    grassMat,
  }
  _biomeMaterialsCache.set(key, mats)
  return mats
}
