import { create } from 'zustand'
import { useProgress } from '@react-three/drei'
import { worldReadinessRegistry } from '../utils/loadingRegistry'

export type LoadingStage =
  | 'INITIALIZING'
  | 'PREPARING_RENDERER'
  | 'LOADING_VEHICLE'
  | 'BUILDING_INITIAL_WORLD'
  | 'PREPARING_ENVIRONMENT'
  | 'COMPILING_SHADERS'
  | 'VERIFYING_WORLD'
  | 'READY'
  | 'ERROR'

export type LoadingTaskId =
  | 'renderer'
  | 'vehicle'
  | 'terrain'
  | 'road'
  | 'environment'
  | 'shaders'
  | 'validation'
  | 'audio'
  | 'distant_world'

export type LoadingTaskStatus = 'waiting' | 'in_progress' | 'complete' | 'failed'

export interface LoadingTask {
  id: LoadingTaskId
  label: string
  status: LoadingTaskStatus
  progress: number // 0..100 honest subsystem progress
  critical: boolean
  weight: number
  detail: string
  error: string | null
  startedAtMs: number | null
  durationMs: number | null
}

export interface LoadingMetrics {
  loadingScreenMountedMs: number | null
  firstFrameMs: number | null
  playableReadyMs: number | null
  stageDurationsMs: Partial<Record<LoadingStage, number>>
}

export interface LoadingState {
  stage: LoadingStage
  progress: number // 0 to 100 weighted from critical tasks
  statusMessage: string
  subMessage: string
  errorMessage: string | null
  failedTaskId: LoadingTaskId | null
  canFallbackVehicle: boolean
  isReady: boolean
  isBackgroundLoading: boolean
  retryCount: number
  tasks: Record<LoadingTaskId, LoadingTask>
  metrics: LoadingMetrics

  setStage: (stage: LoadingStage, statusMessage?: string, subMessage?: string) => void
  updateTask: (
    id: LoadingTaskId,
    patch: Partial<Pick<LoadingTask, 'status' | 'progress' | 'detail' | 'error'>>
  ) => void
  setError: (errorMessage: string, failedTaskId?: LoadingTaskId, canFallbackVehicle?: boolean) => void
  recordLoadingScreenMounted: () => void
  recordFirstFrame: () => void
  markReady: () => void
  retry: (useVehicleFallback?: boolean) => void
}

const STAGE_DEFAULT_MESSAGES: Record<LoadingStage, { title: string; sub: string }> = {
  INITIALIZING: {
    title: 'Initializing Application State',
    sub: 'Loading configuration, physics profiles, and world seed...',
  },
  PREPARING_RENDERER: {
    title: 'Preparing WebGL Renderer & Pipeline',
    sub: 'Validating hardware acceleration, shadow buffers, and tone mapping...',
  },
  LOADING_VEHICLE: {
    title: 'Preparing Selected Vehicle',
    sub: 'Loading monocoque chassis, wheels, PBR materials, and drivetrain...',
  },
  BUILDING_INITIAL_WORLD: {
    title: 'Generating Initial World & Road Corridor',
    sub: 'Constructing spawn terrain chunks, highway splines, markings, and collision...',
  },
  PREPARING_ENVIRONMENT: {
    title: 'Preparing Atmosphere & Lighting',
    sub: 'Configuring sky scattering, shadows, weather, reflections, and spatial audio...',
  },
  COMPILING_SHADERS: {
    title: 'Compiling GPU Shader Programs',
    sub: 'Executing asynchronous shader compilation and warmup render passes...',
  },
  VERIFYING_WORLD: {
    title: 'Verifying World Readiness',
    sub: 'Confirming vehicle grounding, terrain coverage, camera, and first frame...',
  },
  READY: {
    title: 'World Initialized',
    sub: 'Entering highway...',
  },
  ERROR: {
    title: 'Initialization Failed',
    sub: 'A required startup resource could not be prepared.',
  },
}

function createInitialTasks(): Record<LoadingTaskId, LoadingTask> {
  return {
    renderer: {
      id: 'renderer',
      label: 'Initializing renderer',
      status: 'in_progress',
      progress: 0,
      critical: true,
      weight: 10,
      detail: 'Checking WebGL2 capabilities...',
      error: null,
      startedAtMs: null,
      durationMs: null,
    },
    vehicle: {
      id: 'vehicle',
      label: 'Loading vehicle',
      status: 'waiting',
      progress: 0,
      critical: true,
      weight: 30,
      detail: 'Awaiting vehicle selection',
      error: null,
      startedAtMs: null,
      durationMs: null,
    },
    terrain: {
      id: 'terrain',
      label: 'Generating terrain',
      status: 'waiting',
      progress: 0,
      critical: true,
      weight: 20,
      detail: 'Queued spawn chunks',
      error: null,
      startedAtMs: null,
      durationMs: null,
    },
    road: {
      id: 'road',
      label: 'Building road',
      status: 'waiting',
      progress: 0,
      critical: true,
      weight: 15,
      detail: 'Queued asphalt splines & shoulders',
      error: null,
      startedAtMs: null,
      durationMs: null,
    },
    environment: {
      id: 'environment',
      label: 'Preparing environment',
      status: 'waiting',
      progress: 0,
      critical: true,
      weight: 10,
      detail: 'Sky, atmosphere & weather',
      error: null,
      startedAtMs: null,
      durationMs: null,
    },
    shaders: {
      id: 'shaders',
      label: 'Compiling shaders',
      status: 'waiting',
      progress: 0,
      critical: true,
      weight: 10,
      detail: 'Queued GPU program compilation',
      error: null,
      startedAtMs: null,
      durationMs: null,
    },
    validation: {
      id: 'validation',
      label: 'Validating world',
      status: 'waiting',
      progress: 0,
      critical: true,
      weight: 5,
      detail: 'Spawn & scene integrity checks',
      error: null,
      startedAtMs: null,
      durationMs: null,
    },
    audio: {
      id: 'audio',
      label: 'Engine & ambient audio',
      status: 'waiting',
      progress: 0,
      critical: false,
      weight: 0,
      detail: 'Background audio decoding',
      error: null,
      startedAtMs: null,
      durationMs: null,
    },
    distant_world: {
      id: 'distant_world',
      label: 'Distant horizon enhancement',
      status: 'waiting',
      progress: 0,
      critical: false,
      weight: 0,
      detail: 'Progressive background streaming',
      error: null,
      startedAtMs: null,
      durationMs: null,
    },
  }
}

function computeWeightedProgress(tasks: Record<LoadingTaskId, LoadingTask>): number {
  let totalWeight = 0
  let weightedSum = 0
  for (const key of Object.keys(tasks) as LoadingTaskId[]) {
    const t = tasks[key]
    if (!t.critical) continue
    totalWeight += t.weight
    const pct = t.status === 'complete' ? 100 : Math.max(0, Math.min(100, t.progress))
    weightedSum += t.weight * (pct / 100)
  }
  if (totalWeight <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((weightedSum / totalWeight) * 100)))
}

function computeIsBackgroundLoading(tasks: Record<LoadingTaskId, LoadingTask>): boolean {
  return tasks.audio.status === 'in_progress' || tasks.distant_world.status === 'in_progress'
}

const APP_BOOT_TIME_MS = typeof performance !== 'undefined' ? performance.now() : 0
let currentStageStartedMs = APP_BOOT_TIME_MS

export const useLoadingStore = create<LoadingState>((set, get) => ({
  stage: 'INITIALIZING',
  progress: 0,
  statusMessage: STAGE_DEFAULT_MESSAGES.INITIALIZING.title,
  subMessage: STAGE_DEFAULT_MESSAGES.INITIALIZING.sub,
  errorMessage: null,
  failedTaskId: null,
  canFallbackVehicle: false,
  isReady: false,
  isBackgroundLoading: false,
  retryCount: 0,
  tasks: createInitialTasks(),
  metrics: {
    loadingScreenMountedMs: null,
    firstFrameMs: null,
    playableReadyMs: null,
    stageDurationsMs: {},
  },

  setStage: (stage, statusMessage, subMessage) => {
    const prevStage = get().stage
    const now = performance.now()
    const stageDurationsMs = { ...get().metrics.stageDurationsMs }
    if (prevStage !== stage) {
      stageDurationsMs[prevStage] = Math.round(now - currentStageStartedMs)
      currentStageStartedMs = now
    }
    const defaultMsg = STAGE_DEFAULT_MESSAGES[stage]
    set((s) => ({
      stage,
      statusMessage: statusMessage || defaultMsg.title,
      subMessage: subMessage || defaultMsg.sub,
      isReady: stage === 'READY' ? true : stage === 'ERROR' ? false : s.isReady,
      errorMessage: stage === 'ERROR' ? s.errorMessage : null,
      metrics: {
        ...s.metrics,
        stageDurationsMs,
      },
    }))
  },

  updateTask: (id, patch) => {
    set((s) => {
      const prev = s.tasks[id]
      if (!prev) return s
      const now = performance.now()

      const nextStatus = patch.status ?? prev.status
      const nextProgress =
        patch.progress !== undefined
          ? Math.max(0, Math.min(100, Math.round(patch.progress)))
          : nextStatus === 'complete'
            ? 100
            : prev.progress
      const nextDetail = patch.detail !== undefined ? patch.detail : prev.detail
      const nextError = patch.error !== undefined ? patch.error : prev.error

      // Avoid no-op state churn when identical values are reported
      if (
        prev.status === nextStatus &&
        prev.progress === nextProgress &&
        prev.detail === nextDetail &&
        prev.error === nextError
      ) {
        return s
      }

      let startedAtMs = prev.startedAtMs
      if (nextStatus === 'in_progress' && startedAtMs === null) {
        startedAtMs = now
      }
      let durationMs = prev.durationMs
      if ((nextStatus === 'complete' || nextStatus === 'failed') && startedAtMs !== null && durationMs === null) {
        durationMs = Math.max(1, Math.round(now - startedAtMs))
      }

      const nextTasks: Record<LoadingTaskId, LoadingTask> = {
        ...s.tasks,
        [id]: {
          ...prev,
          status: nextStatus,
          progress: nextProgress,
          detail: nextDetail,
          error: nextError,
          startedAtMs,
          durationMs,
        },
      }

      const newWeighted = computeWeightedProgress(nextTasks)
      // Preserve strictly monotonic weighted progress while initializing
      const nextWeighted = s.stage === 'READY' ? 100 : Math.max(s.progress, newWeighted)

      return {
        tasks: nextTasks,
        progress: nextWeighted,
        isBackgroundLoading: computeIsBackgroundLoading(nextTasks),
      }
    })
  },

  setError: (errorMessage, failedTaskId, canFallbackVehicle = false) => {
    const now = performance.now()
    set((s) => {
      const nextTasks = { ...s.tasks }
      if (failedTaskId && nextTasks[failedTaskId]) {
        const t = nextTasks[failedTaskId]
        nextTasks[failedTaskId] = {
          ...t,
          status: 'failed',
          error: errorMessage,
          durationMs: t.startedAtMs !== null ? Math.round(now - t.startedAtMs) : null,
        }
      }
      return {
        stage: 'ERROR',
        statusMessage: STAGE_DEFAULT_MESSAGES.ERROR.title,
        subMessage: 'Check your connection or retry world initialization.',
        errorMessage,
        failedTaskId: failedTaskId ?? null,
        canFallbackVehicle,
        isReady: false,
        tasks: nextTasks,
      }
    })
  },

  recordLoadingScreenMounted: () => {
    set((s) => {
      if (s.metrics.loadingScreenMountedMs !== null) return s
      return {
        metrics: {
          ...s.metrics,
          loadingScreenMountedMs: Math.max(1, Math.round(performance.now() - APP_BOOT_TIME_MS)),
        },
      }
    })
  },

  recordFirstFrame: () => {
    set((s) => {
      if (s.metrics.firstFrameMs !== null) return s
      return {
        metrics: {
          ...s.metrics,
          firstFrameMs: Math.max(1, Math.round(performance.now() - APP_BOOT_TIME_MS)),
        },
      }
    })
  },

  markReady: () => {
    const now = performance.now()
    set((s) => {
      const stageDurationsMs = { ...s.metrics.stageDurationsMs }
      if (s.stage !== 'READY') {
        stageDurationsMs[s.stage] = Math.round(now - currentStageStartedMs)
        currentStageStartedMs = now
      }
      return {
        stage: 'READY',
        progress: 100,
        statusMessage: STAGE_DEFAULT_MESSAGES.READY.title,
        subMessage: STAGE_DEFAULT_MESSAGES.READY.sub,
        isReady: true,
        errorMessage: null,
        failedTaskId: null,
        canFallbackVehicle: false,
        metrics: {
          ...s.metrics,
          playableReadyMs: Math.max(1, Math.round(now - APP_BOOT_TIME_MS)),
          stageDurationsMs,
        },
      }
    })
  },

  retry: (useVehicleFallback = false) => {
    currentStageStartedMs = performance.now()
    worldReadinessRegistry.resetWorldReadiness(false)
    worldReadinessRegistry.vehicleAllowFallback = useVehicleFallback
    useProgress.setState({ errors: [], active: false, progress: 0, item: '', loaded: 0, total: 0 })
    set((s) => ({
      stage: 'INITIALIZING',
      progress: 0,
      statusMessage: STAGE_DEFAULT_MESSAGES.INITIALIZING.title,
      subMessage: STAGE_DEFAULT_MESSAGES.INITIALIZING.sub,
      errorMessage: null,
      failedTaskId: null,
      canFallbackVehicle: false,
      isReady: false,
      isBackgroundLoading: false,
      retryCount: s.retryCount + 1,
      tasks: createInitialTasks(),
      metrics: {
        ...s.metrics,
        firstFrameMs: null,
        playableReadyMs: null,
        stageDurationsMs: {},
      },
    }))
  },
}))

if (typeof window !== 'undefined') {
  ;(window as any).__LOADING_STORE__ = useLoadingStore
}
