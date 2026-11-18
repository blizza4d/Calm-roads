import * as THREE from 'three'

let cachedAsphaltTexture: THREE.CanvasTexture | null = null
let cachedBumpTexture: THREE.CanvasTexture | null = null
let cachedRoughnessTexture: THREE.CanvasTexture | null = null
let cachedTerrainBumpTexture: THREE.CanvasTexture | null = null
let cachedWoodBumpTexture: THREE.CanvasTexture | null = null

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

  // 5. Subtle paving-machine longitudinal seam & occasional sealed tar crack
  ctx.strokeStyle = 'rgba(16, 18, 22, 0.34)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(size * 0.5, 0)
  ctx.lineTo(size * 0.5, size)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(18, 20, 24, 0.22)'
  ctx.lineWidth = 1.6
  for (let c = 0; c < 4; c++) {
    let cx = (0.14 + c * 0.24) * size
    let cy = ((c * 257) % size)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    for (let s = 0; s < 6; s++) {
      cx += (Math.sin(c * 13 + s * 2.1) * 18)
      cy += 22
      ctx.lineTo(cx, cy)
    }
    ctx.stroke()
  }

  // Subtle shoulder edge gravel-dust feathering
  const leftEdge = ctx.createLinearGradient(0, 0, size * 0.045, 0)
  leftEdge.addColorStop(0, 'rgba(72, 68, 62, 0.28)')
  leftEdge.addColorStop(1, 'rgba(72, 68, 62, 0)')
  ctx.fillStyle = leftEdge
  ctx.fillRect(0, 0, size * 0.045, size)

  const rightEdge = ctx.createLinearGradient(size, 0, size * 0.955, 0)
  rightEdge.addColorStop(0, 'rgba(72, 68, 62, 0.28)')
  rightEdge.addColorStop(1, 'rgba(72, 68, 62, 0)')
  ctx.fillStyle = rightEdge
  ctx.fillRect(size * 0.955, 0, size * 0.045, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)
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
  texture.repeat.set(1, 1)
  texture.anisotropy = 16
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedBumpTexture = texture
  return texture
}

/**
 * Procedural PBR roughness map for realistic asphalt glancing sheen:
 * Tire-polished wheel tracks are slightly smoother (~0.62) than aggregate center/edges (~0.88),
 * giving authentic specular streaks under low-angle sunlight, headlights, and rain.
 */
export function getAsphaltRoughnessTexture(): THREE.CanvasTexture {
  if (cachedRoughnessTexture) return cachedRoughnessTexture

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedRoughnessTexture = fallback
    return fallback
  }

  // Base porous aggregate roughness (~218 / 255 = 0.85)
  ctx.fillStyle = 'rgb(218, 218, 218)'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 34
    const v = Math.max(150, Math.min(248, 218 + grain))
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
    data[i + 3] = 255
  }
  ctx.putImageData(imgData, 0, 0)

  // Smoother polished wheel tracks (lower roughness = brighter glancing specular)
  const trackCenters = [0.23 * size, 0.39 * size, 0.61 * size, 0.77 * size]
  trackCenters.forEach((cx) => {
    const w = 30
    const grad = ctx.createLinearGradient(cx - w, 0, cx + w, 0)
    grad.addColorStop(0, 'rgba(135, 135, 135, 0)')
    grad.addColorStop(0.5, 'rgba(135, 135, 135, 0.58)')
    grad.addColorStop(1, 'rgba(135, 135, 135, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(cx - w, 0, w * 2, size)
  })

  // Glossy tar seam down centerline
  ctx.fillStyle = 'rgba(110, 110, 110, 0.5)'
  ctx.fillRect(size * 0.5 - 2, 0, 4, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 16
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedRoughnessTexture = texture
  return texture
}

/**
 * Procedural micro-relief bump map for terrain (rock facets, soil granules, grass sod texture).
 */
export function getTerrainBumpTexture(): THREE.CanvasTexture {
  if (cachedTerrainBumpTexture) return cachedTerrainBumpTexture

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedTerrainBumpTexture = fallback
    return fallback
  }

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      // Multi-frequency organic noise for natural earth micro-relief
      const n1 = (Math.random() - 0.5) * 55
      const n2 = Math.sin(x * 0.12) * Math.cos(y * 0.12) * 25
      const n3 = Math.sin(x * 0.03 + y * 0.03) * 18
      const val = Math.max(0, Math.min(255, 128 + n1 + n2 + n3))
      data[idx] = val
      data[idx + 1] = val
      data[idx + 2] = val
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(36, 6)
  texture.anisotropy = 8
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedTerrainBumpTexture = texture
  return texture
}

/**
 * Procedural weathered woodgrain bump map for utility poles and timber structures.
 */
export function getWoodBumpTexture(): THREE.CanvasTexture {
  if (cachedWoodBumpTexture) return cachedWoodBumpTexture

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedWoodBumpTexture = fallback
    return fallback
  }

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      // Elongated vertical woodgrain striations
      const grain = Math.sin(x * 0.35 + Math.sin(y * 0.05) * 2.5) * 35
      const micro = (Math.random() - 0.5) * 45
      const val = Math.max(0, Math.min(255, 128 + grain + micro))
      data[idx] = val
      data[idx + 1] = val
      data[idx + 2] = val
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 8)
  texture.anisotropy = 8
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedWoodBumpTexture = texture
  return texture
}
