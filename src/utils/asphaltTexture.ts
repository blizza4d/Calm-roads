import * as THREE from 'three'

let cachedAsphaltTexture: THREE.CanvasTexture | null = null
let cachedBumpTexture: THREE.CanvasTexture | null = null

export function getAsphaltTexture(): THREE.CanvasTexture {
  if (cachedAsphaltTexture) return cachedAsphaltTexture

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedAsphaltTexture = fallback
    return fallback
  }

  // 1. Base dark asphalt tone
  ctx.fillStyle = '#1c1f24'
  ctx.fillRect(0, 0, 512, 512)

  // 2. Micro-aggregate gravel speckles
  const imgData = ctx.getImageData(0, 0, 512, 512)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 38
    data[i] = Math.max(16, Math.min(65, data[i] + noise))
    data[i + 1] = Math.max(18, Math.min(68, data[i + 1] + noise))
    data[i + 2] = Math.max(22, Math.min(74, data[i + 2] + noise))
  }
  ctx.putImageData(imgData, 0, 0)

  // 3. Subtle dark tire rubber tracks (wear grooves in the lanes)
  // Road has 2 lanes, so 4 tire tracks across width (normalized X: 0.18, 0.38, 0.62, 0.82)
  const trackCenters = [0.22 * 512, 0.36 * 512, 0.64 * 512, 0.78 * 512]
  trackCenters.forEach((cx) => {
    const grad = ctx.createLinearGradient(cx - 24, 0, cx + 24, 0)
    grad.addColorStop(0, 'rgba(12, 14, 18, 0)')
    grad.addColorStop(0.5, 'rgba(12, 14, 18, 0.28)')
    grad.addColorStop(1, 'rgba(12, 14, 18, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(cx - 24, 0, 48, 512)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 16)
  texture.anisotropy = 8
  texture.needsUpdate = true

  cachedAsphaltTexture = texture
  return texture
}

export function getAsphaltBumpTexture(): THREE.CanvasTexture {
  if (cachedBumpTexture) return cachedBumpTexture

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedBumpTexture = fallback
    return fallback
  }

  // Grayscale noise for micro-bump
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, 256, 256)

  const imgData = ctx.getImageData(0, 0, 256, 256)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const n = Math.floor(128 + (Math.random() - 0.5) * 60)
    data[i] = n
    data[i + 1] = n
    data[i + 2] = n
  }
  ctx.putImageData(imgData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 16)
  texture.anisotropy = 4
  texture.needsUpdate = true

  cachedBumpTexture = texture
  return texture
}
