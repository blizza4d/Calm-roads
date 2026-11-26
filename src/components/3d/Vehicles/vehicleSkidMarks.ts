import * as THREE from 'three'

export const MAX_SKID_QUADS = 160

export function createSkidMarkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 32, 0)
    grad.addColorStop(0, 'rgba(12, 12, 15, 0)')
    grad.addColorStop(0.2, 'rgba(12, 12, 15, 0.72)')
    grad.addColorStop(0.5, 'rgba(15, 15, 18, 0.88)')
    grad.addColorStop(0.8, 'rgba(12, 12, 15, 0.72)')
    grad.addColorStop(1, 'rgba(12, 12, 15, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 32, 64)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

export const _skidGeo = new THREE.BufferGeometry()
export const _skidPositions = new Float32Array(MAX_SKID_QUADS * 4 * 3)
const _skidUvs = new Float32Array(MAX_SKID_QUADS * 4 * 2)
const _skidIndices: number[] = []

for (let i = 0; i < MAX_SKID_QUADS; i++) {
  const base = i * 4
  _skidIndices.push(base, base + 1, base + 2)
  _skidIndices.push(base + 1, base + 3, base + 2)

  _skidUvs[base * 2] = 0
  _skidUvs[base * 2 + 1] = 0
  _skidUvs[(base + 1) * 2] = 1
  _skidUvs[(base + 1) * 2 + 1] = 0
  _skidUvs[(base + 2) * 2] = 0
  _skidUvs[(base + 2) * 2 + 1] = 1
  _skidUvs[(base + 3) * 2] = 1
  _skidUvs[(base + 3) * 2 + 1] = 1
}

_skidGeo.setAttribute('position', new THREE.BufferAttribute(_skidPositions, 3))
_skidGeo.setAttribute('uv', new THREE.BufferAttribute(_skidUvs, 2))
_skidGeo.setIndex(_skidIndices)
_skidGeo.setDrawRange(0, 0)

export const _skidTexture = typeof document !== 'undefined' ? createSkidMarkTexture() : new THREE.Texture()
export const _skidMaterial = new THREE.MeshBasicMaterial({
  map: _skidTexture,
  transparent: true,
  opacity: 0.72,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
})

export const _tempSkidL1 = new THREE.Vector3()
export const _tempSkidR1 = new THREE.Vector3()
export const _prevSkidL = new THREE.Vector3()
export const _prevSkidR = new THREE.Vector3()
