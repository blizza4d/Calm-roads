import * as THREE from 'three'

let cachedAsphaltTexture: THREE.CanvasTexture | null = null
let cachedBumpTexture: THREE.CanvasTexture | null = null
let cachedAsphaltRoughnessTexture: THREE.CanvasTexture | null = null
let cachedTerrainBumpTexture: THREE.CanvasTexture | null = null
let cachedWoodBumpTexture: THREE.CanvasTexture | null = null
let cachedSandNormalTexture: THREE.CanvasTexture | null = null
let cachedRockStrataTexture: THREE.CanvasTexture | null = null
let cachedGrassSodTexture: THREE.CanvasTexture | null = null
let cachedGalvanizedMetalTexture: THREE.CanvasTexture | null = null
let cachedTreeBarkTexture: THREE.CanvasTexture | null = null
let cachedSoilBumpTexture: THREE.CanvasTexture | null = null
let cachedSnowNormalTexture: THREE.CanvasTexture | null = null
let cachedSandstoneStrataTexture: THREE.CanvasTexture | null = null

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

/**
 * Procedural PBR roughness map for realistic asphalt road surfaces.
 * Differentiates aggregate micro-roughness, bitumen binder sheen,
 * and highway wheel-track polishing.
 */
export function getAsphaltRoughnessTexture(): THREE.CanvasTexture {
  if (cachedAsphaltRoughnessTexture) return cachedAsphaltRoughnessTexture

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedAsphaltRoughnessTexture = fallback
    return fallback
  }

  // Base roughness: high roughness (~0.82) for coarse asphalt aggregate
  ctx.fillStyle = '#d2d2d2'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const n1 = (Math.random() - 0.5) * 40
      const n2 = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 15
      const val = Math.max(120, Math.min(245, 205 + n1 + n2))
      data[idx] = val
      data[idx + 1] = val
      data[idx + 2] = val
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)

  // Polished wheel tracks: slightly smoother due to tire rubber compaction
  const trackCenters = [0.23 * size, 0.39 * size, 0.61 * size, 0.77 * size]
  trackCenters.forEach((cx) => {
    const trackWidth = 28
    const grad = ctx.createLinearGradient(cx - trackWidth, 0, cx + trackWidth, 0)
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)')
    grad.addColorStop(0.5, 'rgba(35, 35, 35, 0.35)') // lowers roughness in tire grooves
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(cx - trackWidth, 0, trackWidth * 2, size)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)
  texture.anisotropy = 16
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedAsphaltRoughnessTexture = texture
  return texture
}

/**
 * Procedural PBR normal/bump map for desert sand dunes and coastal beaches.
 * Features gentle, undulating wind ripples overlaid with fine sand granules.
 */
export function getSandNormalTexture(): THREE.CanvasTexture {
  if (cachedSandNormalTexture) return cachedSandNormalTexture

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedSandNormalTexture = fallback
    return fallback
  }

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      // Wind-blown sand ripples with organic serpentine drift
      const ripple = Math.sin(x * 0.08 + Math.sin(y * 0.025) * 3.0) * 32
      const microGranule = (Math.random() - 0.5) * 28
      const val = Math.max(0, Math.min(255, 128 + ripple + microGranule))
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
  texture.repeat.set(16, 16)
  texture.anisotropy = 8
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedSandNormalTexture = texture
  return texture
}

/**
 * Procedural PBR geological strata bump map for rocky alpine crags, cliffs, and boulders.
 * Simulates stratified sedimentary beds, tectonic fracture planes, and chisel facets.
 */
export function getRockStrataTexture(): THREE.CanvasTexture {
  if (cachedRockStrataTexture) return cachedRockStrataTexture

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedRockStrataTexture = fallback
    return fallback
  }

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      // Sub-horizontal geological sedimentary layers & fracture cleavage
      const layer = Math.sin(y * 0.12 + Math.sin(x * 0.03) * 2.0) * 38
      const crossJoint = Math.cos(x * 0.06 + y * 0.02) * 18
      const chisel = (Math.random() - 0.5) * 35
      const val = Math.max(0, Math.min(255, 128 + layer + crossJoint + chisel))
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
  texture.repeat.set(24, 8)
  texture.anisotropy = 8
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedRockStrataTexture = texture
  return texture
}

/**
 * Procedural PBR grass sod bump map for rich meadow turf, soil crumbs, and forest floor.
 */
export function getGrassSodTexture(): THREE.CanvasTexture {
  if (cachedGrassSodTexture) return cachedGrassSodTexture

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedGrassSodTexture = fallback
    return fallback
  }

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      // Micro-blade sod relief + soil clumps
      const blade = Math.sin(x * 0.25) * Math.sin(y * 0.25) * 22
      const clump = Math.sin(x * 0.05 + y * 0.05) * 16
      const micro = (Math.random() - 0.5) * 45
      const val = Math.max(0, Math.min(255, 128 + blade + clump + micro))
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
  texture.repeat.set(32, 8)
  texture.anisotropy = 8
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedGrassSodTexture = texture
  return texture
}

/**
 * Procedural bump map for highway galvanized metal guardrails.
 * Features zinc spangle crystalline patterns and longitudinal roll-forming brush marks.
 */
export function getGalvanizedMetalTexture(): THREE.CanvasTexture {
  if (cachedGalvanizedMetalTexture) return cachedGalvanizedMetalTexture

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedGalvanizedMetalTexture = fallback
    return fallback
  }

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      // Longitudinal steel roll streaks
      const rollStreak = Math.sin(x * 0.8) * 8
      // Hot-dip galvanized zinc crystalline spangles
      const spangle = Math.sin(x * 0.15 + y * 0.15) * Math.cos(x * 0.1 - y * 0.1) * 18
      const micro = (Math.random() - 0.5) * 25
      const val = Math.max(0, Math.min(255, 128 + rollStreak + spangle + micro))
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
  texture.repeat.set(4, 24)
  texture.anisotropy = 8
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedGalvanizedMetalTexture = texture
  return texture
}

/**
 * Procedural bump map for realistic tree trunk bark (furrowed bark grooves and crevices).
 */
export function getTreeBarkTexture(): THREE.CanvasTexture {
  if (cachedTreeBarkTexture) return cachedTreeBarkTexture

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedTreeBarkTexture = fallback
    return fallback
  }

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      // Vertical organic bark furrows and fissures
      const furrow = Math.sin(x * 0.45 + Math.sin(y * 0.08) * 3.5) * 38
      const micro = (Math.random() - 0.5) * 30
      const val = Math.max(0, Math.min(255, 128 + furrow + micro))
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
  texture.repeat.set(2, 6)
  texture.anisotropy = 8
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedTreeBarkTexture = texture
  return texture
}

/**
 * Procedural bump map for rich organic soil and loam ground surfaces.
 * Features organic soil crumb aggregate, fine rootlets, and micro-pebbles.
 */
export function getSoilBumpTexture(): THREE.CanvasTexture {
  if (cachedSoilBumpTexture) return cachedSoilBumpTexture
  if (typeof document === 'undefined') {
    const fallback = new THREE.CanvasTexture({} as HTMLCanvasElement)
    cachedSoilBumpTexture = fallback
    return fallback
  }

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedSoilBumpTexture = fallback
    return fallback
  }

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      // Granular soil crumb structure
      const n1 = (Math.random() - 0.5) * 45
      const n2 = Math.sin(x * 0.12) * Math.cos(y * 0.12) * 20
      const n3 = Math.sin(x * 0.04 + y * 0.04) * 15
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
  texture.repeat.set(16, 16)
  texture.anisotropy = 8
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedSoilBumpTexture = texture
  return texture
}

/**
 * Procedural normal / bump map for crystalline sub-zero snow and permafrost surfaces.
 * Features sparkling ice crystals, firn compaction, and subtle wind drift ripples.
 */
export function getSnowNormalTexture(): THREE.CanvasTexture {
  if (cachedSnowNormalTexture) return cachedSnowNormalTexture
  if (typeof document === 'undefined') {
    const fallback = new THREE.CanvasTexture({} as HTMLCanvasElement)
    cachedSnowNormalTexture = fallback
    return fallback
  }

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedSnowNormalTexture = fallback
    return fallback
  }

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      // Gentle wind sastrugi ripples
      const ripple = Math.sin(x * 0.06 + y * 0.02) * 18
      // Sparkling micro-crystals
      const crystal = (Math.random() - 0.5) * 35
      const val = Math.max(0, Math.min(255, 128 + ripple + crystal))
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
  texture.repeat.set(24, 24)
  texture.anisotropy = 8
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedSnowNormalTexture = texture
  return texture
}

/**
 * Procedural strata bump map for layered sandstone cliffs and desert canyon walls.
 * Features prominent horizontal sedimentary strata bedding planes and erosion channels.
 */
export function getSandstoneStrataTexture(): THREE.CanvasTexture {
  if (cachedSandstoneStrataTexture) return cachedSandstoneStrataTexture
  if (typeof document === 'undefined') {
    const fallback = new THREE.CanvasTexture({} as HTMLCanvasElement)
    cachedSandstoneStrataTexture = fallback
    return fallback
  }

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    cachedSandstoneStrataTexture = fallback
    return fallback
  }

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      // Sedimentary horizontal bedding strata
      const strata = Math.sin(y * 0.22 + Math.sin(x * 0.03) * 4.0) * 42
      const microBed = Math.sin(y * 0.8) * 12
      const grain = (Math.random() - 0.5) * 22
      const val = Math.max(0, Math.min(255, 128 + strata + microBed + grain))
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
  texture.repeat.set(6, 12)
  texture.anisotropy = 8
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  cachedSandstoneStrataTexture = texture
  return texture
}
