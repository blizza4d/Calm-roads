import * as THREE from 'three'
import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '../../store/useGameStore'

export interface PerformanceStats {
  fps: number
  minFps: number
  frameTimeMs: number
  frameSpikeMs: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  shaderPrograms: number
  jsHeapMb: number
}

// Global lightweight statistics registry (Direct DOM consumption, 0 React re-renders)
export const performanceStats: PerformanceStats = {
  fps: 60,
  minFps: 60,
  frameTimeMs: 16.6,
  frameSpikeMs: 16.6,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  shaderPrograms: 0,
  jsHeapMb: 0,
}

let subscribers: Array<(stats: PerformanceStats) => void> = []

export function subscribePerformanceStats(fn: (stats: PerformanceStats) => void) {
  subscribers.push(fn)
  return () => {
    subscribers = subscribers.filter((s) => s !== fn)
  }
}

/**
 * PerformanceBridge
 * Embedded inside the React Three Fiber Canvas.
 * Directly samples renderer.info and performance.now() without any object allocations.
 */
export default function PerformanceBridge() {
  const { gl, scene, camera } = useThree()
  const frameCountRef = useRef(0)

  useEffect(() => {
    (window as any).__CALM_DEBUG = { gl, scene, camera, performanceStats, THREE, useGameStore }
  }, [gl, scene, camera])
  const lastTimeRef = useRef(performance.now())
  const lastFrameTimeRef = useRef(performance.now())
  const minFpsRef = useRef(999)
  const maxSpikeRef = useRef(0)
  const recentDtsRef = useRef<number[]>([])
  const peakCallsRef = useRef(0)
  const peakTrianglesRef = useRef(0)

  useFrame(() => {
    const now = performance.now()
    const dt = now - lastFrameTimeRef.current
    lastFrameTimeRef.current = now

    frameCountRef.current++
    if (dt > maxSpikeRef.current) {
      maxSpikeRef.current = dt
    }

    if (gl.info.render.calls > peakCallsRef.current) {
      peakCallsRef.current = gl.info.render.calls
      peakTrianglesRef.current = gl.info.render.triangles
    }

    const dts = recentDtsRef.current
    dts.push(dt)
    if (dts.length > 60) dts.shift()

    // Sample and publish every 350ms to keep main-thread overhead under 0.05ms
    const elapsed = now - lastTimeRef.current
    if (elapsed >= 350) {
      const curFps = Math.round((frameCountRef.current * 1000) / elapsed)
      if (curFps < minFpsRef.current) {
        minFpsRef.current = curFps
      }

      // Compute average frame time from recent samples
      let sumDt = 0
      for (let i = 0; i < dts.length; i++) sumDt += dts[i]
      const avgDt = dts.length > 0 ? sumDt / dts.length : 16.6

      const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
      const heapMb = memory ? memory.usedJSHeapSize / (1024 * 1024) : 0

      performanceStats.fps = curFps
      performanceStats.minFps = Math.min(minFpsRef.current, curFps)
      performanceStats.frameTimeMs = +avgDt.toFixed(1)
      performanceStats.frameSpikeMs = +maxSpikeRef.current.toFixed(1)
      performanceStats.drawCalls = peakCallsRef.current || gl.info.render.calls
      performanceStats.triangles = peakTrianglesRef.current || gl.info.render.triangles
      peakCallsRef.current = 0
      peakTrianglesRef.current = 0
      performanceStats.geometries = gl.info.memory.geometries
      performanceStats.textures = gl.info.memory.textures
      performanceStats.shaderPrograms = gl.info.programs?.length ?? 0
      performanceStats.jsHeapMb = +heapMb.toFixed(1)

      // Slowly recover min FPS tracker so momentary hiccups don't permanently pin min FPS to low values
      if (frameCountRef.current % 180 === 0) {
        minFpsRef.current = curFps
        maxSpikeRef.current = dt
      }

      for (let i = 0; i < subscribers.length; i++) {
        subscribers[i](performanceStats)
      }

      frameCountRef.current = 0
      lastTimeRef.current = now
    }
  })

  return null
}
