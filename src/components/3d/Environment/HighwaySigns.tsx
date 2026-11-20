import { memo, useMemo } from 'react'
import * as THREE from 'three'
import {
  getRoadSplineSample,
  ROAD_WIDTH,
  getSurfaceHeight,
} from '../../../utils/roadMath'

// Procedural Retroreflective Canvas Textures for Highway Signs
let cachedChevronLeftTex: THREE.CanvasTexture | null = null
let cachedChevronRightTex: THREE.CanvasTexture | null = null
let cachedSpeedLimitTex: THREE.CanvasTexture | null = null

function getChevronTexture(direction: 'left' | 'right'): THREE.CanvasTexture {
  if (direction === 'left' && cachedChevronLeftTex) return cachedChevronLeftTex
  if (direction === 'right' && cachedChevronRightTex) return cachedChevronRightTex

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 160
  const ctx = canvas.getContext('2d')
  if (ctx) {
    // High-visibility safety yellow background
    ctx.fillStyle = '#ffcc00'
    ctx.fillRect(0, 0, 128, 160)

    // Inner retroreflective border
    ctx.strokeStyle = '#111111'
    ctx.lineWidth = 6
    ctx.strokeRect(6, 6, 116, 148)

    // Directional chevron arrow
    ctx.fillStyle = '#111111'
    ctx.beginPath()
    if (direction === 'right') {
      ctx.moveTo(32, 28)
      ctx.lineTo(84, 80)
      ctx.lineTo(32, 132)
      ctx.lineTo(54, 132)
      ctx.lineTo(106, 80)
      ctx.lineTo(54, 28)
    } else {
      ctx.moveTo(96, 28)
      ctx.lineTo(44, 80)
      ctx.lineTo(96, 132)
      ctx.lineTo(74, 132)
      ctx.lineTo(22, 80)
      ctx.lineTo(74, 28)
    }
    ctx.closePath()
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  if (direction === 'left') cachedChevronLeftTex = tex
  else cachedChevronRightTex = tex
  return tex
}

function getSpeedLimitTexture(speed: number = 100): THREE.CanvasTexture {
  if (cachedSpeedLimitTex) return cachedSpeedLimitTex

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    // White circular retroreflective backing
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(64, 64, 60, 0, Math.PI * 2)
    ctx.fill()

    // Red outer warning ring
    ctx.strokeStyle = '#dc2626'
    ctx.lineWidth = 14
    ctx.beginPath()
    ctx.arc(64, 64, 53, 0, Math.PI * 2)
    ctx.stroke()

    // Speed number
    ctx.fillStyle = '#111111'
    ctx.font = 'bold 50px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(speed), 64, 66)
  }

  cachedSpeedLimitTex = new THREE.CanvasTexture(canvas)
  return cachedSpeedLimitTex
}

// Reusable Sign Geometries & Shared Materials
const postGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.2, 8).translate(0, 1.1, 0)
const chevronBoardGeo = new THREE.BoxGeometry(0.75, 0.95, 0.04).translate(0, 1.8, 0)
const speedBoardGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.04, 18).rotateX(Math.PI / 2).translate(0, 1.85, 0)

const galvanizedPostMat = new THREE.MeshStandardMaterial({
  color: '#64748b',
  metalness: 0.85,
  roughness: 0.35,
})

const chevronLeftMat = new THREE.MeshStandardMaterial({
  map: typeof document !== 'undefined' ? getChevronTexture('left') : null,
  roughness: 0.25,
  metalness: 0.1,
})

const chevronRightMat = new THREE.MeshStandardMaterial({
  map: typeof document !== 'undefined' ? getChevronTexture('right') : null,
  roughness: 0.25,
  metalness: 0.1,
})

const speedLimitMat = new THREE.MeshStandardMaterial({
  map: typeof document !== 'undefined' ? getSpeedLimitTexture(100) : null,
  roughness: 0.25,
  metalness: 0.1,
})

interface SignInstance {
  pos: [number, number, number]
  rotY: number
  type: 'chevron_left' | 'chevron_right' | 'speed_limit'
}

/**
 * Procedural Highway Signage System:
 * Spawns retroreflective chevron curve markers on sharp switchbacks & speed limit posts on straights.
 */
export const HighwaySigns = memo(function HighwaySigns({ chunkZ }: { chunkZ: number }) {
  const CHUNK_LEN = 200

  const signs = useMemo(() => {
    const list: SignInstance[] = []
    const step = 20 // Evaluate every 20m along chunk

    for (let zOffset = -CHUNK_LEN / 2 + 10; zOffset <= CHUNK_LEN / 2 - 10; zOffset += step) {
      const worldZ = chunkZ + zOffset
      const sample = getRoadSplineSample(worldZ)
      const curvature = sample.curvature

      // Sharp curve detection: spawn outer curve chevron
      if (Math.abs(curvature) > 0.007) {
        // Curve direction: curvature > 0 turns right, curvature < 0 turns left
        const isTurningRight = curvature > 0
        // Place chevron on outer shoulder
        const side = isTurningRight ? -1 : 1
        const shoulderOffset = ROAD_WIDTH / 2 + 1.85

        const signX = sample.x + sample.rx * shoulderOffset * side
        const signZ = zOffset + sample.rz * shoulderOffset * side
        const groundY = getSurfaceHeight(signX, worldZ)

        // Face oncoming traffic along tangent
        const rotY = Math.atan2(sample.tx, -sample.tz) + (isTurningRight ? -0.15 : 0.15)

        list.push({
          pos: [signX, groundY, signZ],
          rotY,
          type: isTurningRight ? 'chevron_right' : 'chevron_left',
        })
      } else if (Math.abs(zOffset) < 12 && Math.abs(worldZ % 800) < 60) {
        // Place speed limit sign along straights on right shoulder
        const shoulderOffset = ROAD_WIDTH / 2 + 1.85
        const signX = sample.x + sample.rx * shoulderOffset
        const signZ = zOffset + sample.rz * shoulderOffset
        const groundY = getSurfaceHeight(signX, worldZ)
        const rotY = Math.atan2(sample.tx, -sample.tz)

        list.push({
          pos: [signX, groundY, signZ],
          rotY,
          type: 'speed_limit',
        })
      }
    }

    return list
  }, [chunkZ])

  if (signs.length === 0) return null

  return (
    <group>
      {signs.map((s, idx) => (
        <group key={idx} position={s.pos} rotation={[0, s.rotY, 0]}>
          <mesh geometry={postGeo} material={galvanizedPostMat} />
          {s.type === 'chevron_left' && <mesh geometry={chevronBoardGeo} material={chevronLeftMat} />}
          {s.type === 'chevron_right' && <mesh geometry={chevronBoardGeo} material={chevronRightMat} />}
          {s.type === 'speed_limit' && <mesh geometry={speedBoardGeo} material={speedLimitMat} />}
        </group>
      ))}
    </group>
  )
})
