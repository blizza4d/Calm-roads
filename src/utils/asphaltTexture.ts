import * as THREE from 'three'

let cachedAsphaltTexture: THREE.CanvasTexture | null = null
let cachedBumpTexture: THREE.CanvasTexture | null = null

/**
 * High-fidelity procedural PBR asphalt texture generator.
 * Creates a calibrated 1024x1024 multi-frequency asphalt aggregate texture
 * featuring mineral aggregate speckles, quartz micro-flecks, bitumen binders,
 * and realistic highway wheel-track wear grooves.
 */
export function getAsphaltTexture(): THREE.CanvasTexture {
  if (cachedAsphaltTexture) return cachedAsphaltTexture

  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedAsphaltTexture = fallback
    return fallback
  }

  // 1. Calibrated realistic tarmac base tone (rich neutral charcoal grey)
  ctx.fillStyle = '#2f343c'
  ctx.fillRect(0, 0, size, size)

  // 2. High-resolution multi-frequency mineral aggregate
  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4

      // Multi-scale pseudo noise
      const n1 = (Math.random() - 0.5) * 36
      const n2 = (Math.random() - 0.5) * 18
      const n3 = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 8

      // Occasional quartz / light aggregate flecks (~3% chance)
      let fleck = 0
      const rand = Math.random()
      if (rand < 0.025) {
        fleck = 28 + Math.random() * 32
      } else if (rand > 0.985) {
        fleck = -24 // Bitumen pore
      }

      const totalMod = n1 + n2 + n3 + fleck
      const r = Math.max(34, Math.min(105, 52 + totalMod))
      const g = Math.max(38, Math.min(108, 56 + totalMod * 0.98))
      const b = Math.max(42, Math.min(115, 62 + totalMod * 0.95))

      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)

  // 3. Subtle dark tire rubber tracks (highway traffic wear in both lanes)
  // Two travel lanes: left lane (centers at 0.23 and 0.39), right lane (centers at 0.61 and 0.77)
  const trackCenters = [0.23 * size, 0.39 * size, 0.61 * size, 0.77 * size]
  trackCenters.forEach((cx) => {
    const trackWidth = 54
    const grad = ctx.createLinearGradient(cx - trackWidth, 0, cx + trackWidth, 0)
    grad.addColorStop(0, 'rgba(18, 20, 24, 0)')
    grad.addColorStop(0.25, 'rgba(18, 20, 24, 0.18)')
    grad.addColorStop(0.5, 'rgba(18, 20, 24, 0.28)')
    grad.addColorStop(0.75, 'rgba(18, 20, 24, 0.18)')
    grad.addColorStop(1, 'rgba(18, 20, 24, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(cx - trackWidth, 0, trackWidth * 2, size)
  })

  // 4. Subtle highway oil / exhaust film in lane centers
  const laneCenters = [0.31 * size, 0.69 * size]
  laneCenters.forEach((cx) => {
    const filmWidth = 36
    const grad = ctx.createLinearGradient(cx - filmWidth, 0, cx + filmWidth, 0)
    grad.addColorStop(0, 'rgba(15, 16, 20, 0)')
    grad.addColorStop(0.5, 'rgba(15, 16, 20, 0.14)')
    grad.addColorStop(1, 'rgba(15, 16, 20, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(cx - filmWidth, 0, filmWidth * 2, size)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 16)
  texture.anisotropy = 16
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedAsphaltTexture = texture
  return texture
}

/**
 * Procedural micro-bump map for realistic asphalt grain and aggregate relief.
 */
export function getAsphaltBumpTexture(): THREE.CanvasTexture {
  if (cachedBumpTexture) return cachedBumpTexture

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedBumpTexture = fallback
    return fallback
  }

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 80
    const val = Math.max(0, Math.min(255, 128 + noise))
    data[i] = val
    data[i + 1] = val
    data[i + 2] = val
  }
  ctx.putImageData(imgData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 16)
  texture.anisotropy = 16
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedBumpTexture = texture
  return texture
}
