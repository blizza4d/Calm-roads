import { useEffect, useRef } from 'react'
import { subscribePerformanceStats, PerformanceStats } from '../3d/PerformanceBridge'
import { Activity, Cpu, Layers } from 'lucide-react'

export default function PerformanceProfiler({ onClose }: { onClose?: () => void }) {
  const fpsRef = useRef<HTMLSpanElement>(null)
  const minFpsRef = useRef<HTMLSpanElement>(null)
  const frameTimeRef = useRef<HTMLSpanElement>(null)
  const spikeRef = useRef<HTMLSpanElement>(null)
  const drawCallsRef = useRef<HTMLSpanElement>(null)
  const trianglesRef = useRef<HTMLSpanElement>(null)
  const geometriesRef = useRef<HTMLSpanElement>(null)
  const texturesRef = useRef<HTMLSpanElement>(null)
  const shadersRef = useRef<HTMLSpanElement>(null)
  const heapRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const unsub = subscribePerformanceStats((stats: PerformanceStats) => {
      if (fpsRef.current) {
        fpsRef.current.textContent = `${stats.fps}`
        fpsRef.current.className = `text-lg font-black font-mono ${
          stats.fps >= 55 ? 'text-emerald-400' : stats.fps >= 30 ? 'text-amber-400' : 'text-rose-400'
        }`
      }
      if (minFpsRef.current) minFpsRef.current.textContent = `${stats.minFps}`
      if (frameTimeRef.current) frameTimeRef.current.textContent = `${stats.frameTimeMs} ms`
      if (spikeRef.current) spikeRef.current.textContent = `${stats.frameSpikeMs} ms`
      if (drawCallsRef.current) drawCallsRef.current.textContent = `${stats.drawCalls}`
      if (trianglesRef.current) trianglesRef.current.textContent = `${(stats.triangles / 1000).toFixed(1)}k`
      if (geometriesRef.current) geometriesRef.current.textContent = `${stats.geometries}`
      if (texturesRef.current) texturesRef.current.textContent = `${stats.textures}`
      if (shadersRef.current) shadersRef.current.textContent = `${stats.shaderPrograms}`
      if (heapRef.current) heapRef.current.textContent = stats.jsHeapMb > 0 ? `${stats.jsHeapMb} MB` : 'N/A'
    })

    return () => unsub()
  }, [])

  return (
    <div className="fixed top-20 right-6 z-40 pointer-events-auto select-none font-mono text-[11px] leading-tight">
      <div className="bg-black/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-2xl text-white/90 w-80 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider text-xs text-white uppercase font-sans">
              ENGINE PROFILER
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              F4 HUD
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white/50 hover:text-white text-xs px-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Section 1: Frame Rates & Pacing */}
        <div className="bg-white/5 p-2.5 rounded-xl space-y-1.5">
          <div className="text-emerald-400 font-bold flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1.5">
              <Activity size={12} /> FRAME PACING
            </span>
            <span className="text-white/40 text-[9px]">REAL-TIME</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div>
              <div className="text-white/40 text-[9px]">AVERAGE FPS</div>
              <span ref={fpsRef} className="text-lg font-black text-emerald-400 font-mono">
                60
              </span>
            </div>
            <div>
              <div className="text-white/40 text-[9px]">MIN FPS (1% LOW)</div>
              <span ref={minFpsRef} className="text-lg font-black text-cyan-300 font-mono">
                60
              </span>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-white/70 pt-1 border-t border-white/5">
            <span>Frame Time:</span>
            <span ref={frameTimeRef} className="text-white font-bold">
              16.6 ms
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-white/70">
            <span>Frame Spike:</span>
            <span ref={spikeRef} className="text-amber-300 font-bold">
              16.6 ms
            </span>
          </div>
        </div>

        {/* Section 2: WebGL & GPU Rendering */}
        <div className="bg-white/5 p-2.5 rounded-xl space-y-1 text-[10px]">
          <div className="text-cyan-400 font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers size={12} /> GPU RENDERING
            </span>
            <span className="text-cyan-300 font-mono">WEBGL 2.0</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Draw Calls:</span>
            <span ref={drawCallsRef} className="text-emerald-300 font-bold">
              --
            </span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Triangles:</span>
            <span ref={trianglesRef} className="text-white font-bold">
              --
            </span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Active Geometries:</span>
            <span ref={geometriesRef} className="text-white font-bold">
              --
            </span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Active Textures:</span>
            <span ref={texturesRef} className="text-white font-bold">
              --
            </span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Shader Programs:</span>
            <span ref={shadersRef} className="text-purple-300 font-bold">
              --
            </span>
          </div>
        </div>

        {/* Section 3: Memory & Execution */}
        <div className="bg-white/5 p-2.5 rounded-xl space-y-1 text-[10px]">
          <div className="text-amber-400 font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cpu size={12} /> CPU & MEMORY
            </span>
            <span className="text-emerald-400 font-mono">ACTIVE</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>JS Heap Allocated:</span>
            <span ref={heapRef} className="text-white font-bold">
              --
            </span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Physics Loop:</span>
            <span className="text-emerald-300 font-bold">120 Hz Substepping</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Procedural Pipeline:</span>
            <span className="text-emerald-300 font-bold">Bounded 28 Chunks</span>
          </div>
        </div>
      </div>
    </div>
  )
}
