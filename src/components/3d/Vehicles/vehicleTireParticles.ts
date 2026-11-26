import * as THREE from 'three'

export const TIRE_POINTS_COUNT = 96

export function createSmokyRadialTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 31)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)')
    grad.addColorStop(0.25, 'rgba(235, 235, 235, 0.45)')
    grad.addColorStop(0.55, 'rgba(210, 210, 210, 0.18)')
    grad.addColorStop(0.85, 'rgba(190, 190, 190, 0.04)')
    grad.addColorStop(1.0, 'rgba(180, 180, 180, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, 64)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export const _smokyTexture = typeof document !== 'undefined' ? createSmokyRadialTexture() : new THREE.Texture()

export const _smokyPointsMaterial = new THREE.PointsMaterial({
  size: 0.9,
  map: _smokyTexture,
  transparent: true,
  opacity: 0.65,
  depthWrite: false,
  vertexColors: true,
  blending: THREE.NormalBlending,
  sizeAttenuation: true,
})

export interface TireParticle {
  pos: THREE.Vector3
  vel: THREE.Vector3
  life: number
  maxLife: number
  size: number
  color: THREE.Color
  active: boolean
}

export function createTirePointsGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(TIRE_POINTS_COUNT * 3)
  const colors = new Float32Array(TIRE_POINTS_COUNT * 3)
  for (let i = 0; i < TIRE_POINTS_COUNT; i++) {
    positions[i * 3 + 1] = -9999
    colors[i * 3] = 1
    colors[i * 3 + 1] = 1
    colors[i * 3 + 2] = 1
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

export function createTireParticlePool(): TireParticle[] {
  return Array.from({ length: TIRE_POINTS_COUNT }, () => ({
    pos: new THREE.Vector3(0, -9999, 0),
    vel: new THREE.Vector3(),
    life: 0,
    maxLife: 0.8,
    size: 0.85,
    color: new THREE.Color('#ffffff'),
    active: false,
  }))
}
