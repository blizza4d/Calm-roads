import * as THREE from 'three'

// ------------------------------------------------------------------------
// Procedural Foliage Alpha Textures (High-Resolution Organic Silhouettes)
// Discards black background squares cleanly with alphaTest: 0.5
// ------------------------------------------------------------------------

let cachedPineAlphaTex: THREE.CanvasTexture | null = null
let cachedBroadleafAlphaTex: THREE.CanvasTexture | null = null
let cachedGrassAlphaTex: THREE.CanvasTexture | null = null

/**
 * Creates high-detail conifer / pine needle cluster alpha texture
 */
export function getPineNeedleAlphaTexture(): THREE.CanvasTexture {
  if (cachedPineAlphaTex) return cachedPineAlphaTex
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128)
    ctx.fillStyle = '#ffffff'
    
    // Draw central stem
    ctx.beginPath()
    ctx.moveTo(64, 124)
    ctx.lineTo(64, 8)
    ctx.lineWidth = 4
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()

    // Draw branching pine needle fans
    for (let y = 115; y > 15; y -= 5) {
      const spread = (128 - y) * 0.45
      ctx.beginPath()
      ctx.moveTo(64, y)
      ctx.lineTo(64 - spread - Math.random() * 8, y - 8 - Math.random() * 4)
      ctx.moveTo(64, y)
      ctx.lineTo(64 + spread + Math.random() * 8, y - 8 - Math.random() * 4)
      ctx.lineWidth = 2.5
      ctx.stroke()
    }
  }
  cachedPineAlphaTex = new THREE.CanvasTexture(canvas)
  cachedPineAlphaTex.wrapS = THREE.RepeatWrapping
  cachedPineAlphaTex.wrapT = THREE.RepeatWrapping
  cachedPineAlphaTex.repeat.set(2, 2)
  return cachedPineAlphaTex
}

/**
 * Creates organic deciduous broadleaf foliage alpha texture
 */
export function getBroadleafAlphaTexture(): THREE.CanvasTexture {
  if (cachedBroadleafAlphaTex) return cachedBroadleafAlphaTex
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128)
    ctx.fillStyle = '#ffffff'
    
    // Clustered overlapping leaf lobes with organic scalloped edges
    const centers = [
      [64, 64, 38],
      [42, 50, 26],
      [86, 52, 28],
      [50, 85, 24],
      [82, 82, 25],
      [64, 32, 22],
    ]

    centers.forEach(([cx, cy, r]) => {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    })

    // Sub-lobes to break regular circular geometry
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2
      const dist = 38 + Math.sin(i * 3.5) * 12
      const px = 64 + Math.cos(angle) * dist
      const py = 64 + Math.sin(angle) * dist
      ctx.beginPath()
      ctx.arc(px, py, 10 + Math.sin(i * 2) * 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  cachedBroadleafAlphaTex = new THREE.CanvasTexture(canvas)
  cachedBroadleafAlphaTex.wrapS = THREE.RepeatWrapping
  cachedBroadleafAlphaTex.wrapT = THREE.RepeatWrapping
  cachedBroadleafAlphaTex.repeat.set(3, 3)
  return cachedBroadleafAlphaTex
}

/**
 * Creates sharp wild grass blade alpha silhouette
 */
export function getGrassAlphaTexture(): THREE.CanvasTexture {
  if (cachedGrassAlphaTex) return cachedGrassAlphaTex
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128)
    ctx.fillStyle = '#ffffff'

    // Draw fan of tapered grass blades
    const blades = [
      [64, 128, 64, 10, 8],
      [64, 128, 42, 18, 6],
      [64, 128, 86, 16, 7],
      [64, 128, 26, 32, 5],
      [64, 128, 102, 30, 5],
      [64, 128, 14, 52, 4],
      [64, 128, 114, 50, 4],
    ]

    blades.forEach(([x1, y1, x2, y2, w]) => {
      ctx.beginPath()
      ctx.moveTo(x1 - w * 0.5, y1)
      ctx.quadraticCurveTo((x1 + x2) * 0.5, (y1 + y2) * 0.5, x2, y2)
      ctx.quadraticCurveTo((x1 + x2) * 0.5, (y1 + y2) * 0.5, x1 + w * 0.5, y1)
      ctx.closePath()
      ctx.fill()
    })
  }
  cachedGrassAlphaTex = new THREE.CanvasTexture(canvas)
  return cachedGrassAlphaTex
}

/**
 * Builds standard foliage MeshStandardMaterial with proper transparency & alphaTest: 0.5
 * to prevent black square bases and depth sorting visual bugs.
 */
export function createFoliageMaterial(options: {
  color: string | THREE.Color
  alphaMap?: THREE.Texture
  roughness?: number
  metalness?: number
}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: options.color,
    alphaMap: options.alphaMap,
    transparent: true,
    alphaTest: 0.5,
    depthWrite: true,
    roughness: options.roughness ?? 0.82,
    metalness: options.metalness ?? 0.04,
    side: THREE.DoubleSide,
  })
}
