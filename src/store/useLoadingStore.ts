import { create } from 'zustand'

export type LoadingStage =
  | 'UNINITIALIZED'
  | 'INITIALIZING'
  | 'LOADING_ESSENTIAL_ASSETS'
  | 'BUILDING_INITIAL_WORLD'
  | 'PREPARING_MATERIALS'
  | 'COMPILING_SHADERS'
  | 'WARMING_UP_RENDERER'
  | 'VERIFYING_FIRST_SCENE'
  | 'READY'
  | 'ERROR'
  | 'RECOVERING'

export interface WorldChecklist {
  rendererValid: boolean
  cameraValid: boolean
  terrainReady: boolean
  roadReady: boolean
  vehicleReady: boolean
  environmentReady: boolean
  firstFrameRendered: boolean
}

export interface LoadingState {
  stage: LoadingStage
  progress: number // 0 to 100
  statusMessage: string
  subMessage: string
  errorMessage: string | null
  isReady: boolean
  retryCount: number
  startTime: number
  checklist: WorldChecklist

  setStage: (stage: LoadingStage, statusMessage?: string, subMessage?: string, progress?: number) => void
  setProgress: (progress: number) => void
  updateChecklist: (key: keyof WorldChecklist, value: boolean) => void
  setError: (errorMessage: string) => void
  retry: () => void
  reset: () => void
}

export const STAGE_PROGRESS_MAP: Record<LoadingStage, number> = {
  UNINITIALIZED: 0,
  INITIALIZING: 8,
  LOADING_ESSENTIAL_ASSETS: 24,
  BUILDING_INITIAL_WORLD: 44,
  PREPARING_MATERIALS: 64,
  COMPILING_SHADERS: 78,
  WARMING_UP_RENDERER: 88,
  VERIFYING_FIRST_SCENE: 96,
  READY: 100,
  ERROR: 0,
  RECOVERING: 10,
}

export const STAGE_DEFAULT_MESSAGES: Record<LoadingStage, { title: string; sub: string }> = {
  UNINITIALIZED: {
    title: '00 — UNINITIALIZED',
    sub: 'Awaiting engine boot command...',
  },
  INITIALIZING: {
    title: '01 — INITIALIZING ENGINE',
    sub: 'Bootstrapping simulation loop, road mathematics & audio subsystem...',
  },
  LOADING_ESSENTIAL_ASSETS: {
    title: '02 — PREPARING VEHICLE',
    sub: 'Loading monocoque chassis, suspension parameters & wheel kinematics...',
  },
  BUILDING_INITIAL_WORLD: {
    title: '03 — GENERATING WORLD & ROAD',
    sub: 'Constructing procedural elevation heightmaps, spline curves & lane markings...',
  },
  PREPARING_MATERIALS: {
    title: '04 — PREPARING ENVIRONMENT',
    sub: 'Configuring PBR materials, atmospheric scattering & PMREM reflection probe...',
  },
  COMPILING_SHADERS: {
    title: '05 — COMPILING SHADERS',
    sub: 'Executing asynchronous parallel GPU shader program compilation...',
  },
  WARMING_UP_RENDERER: {
    title: '06 — WARMING UP RENDERER',
    sub: 'Executing off-screen pipeline warmup pass to eliminate runtime micro-stutters...',
  },
  VERIFYING_FIRST_SCENE: {
    title: '07 — FINALIZING EXPERIENCE',
    sub: 'Verifying scene matrix hierarchy, bounding spheres & first presented frame...',
  },
  READY: {
    title: 'SCENE READY',
    sub: 'Driving controls engaged. Accelerate into the horizon.',
  },
  ERROR: {
    title: 'WORLD INITIALIZATION INTERRUPTED',
    sub: 'The driving environment could not be prepared.',
  },
  RECOVERING: {
    title: 'RECOVERING PIPELINE STATE',
    sub: 'Re-initializing WebGL context and rebuilding scene graph...',
  },
}

const INITIAL_CHECKLIST: WorldChecklist = {
  rendererValid: false,
  cameraValid: false,
  terrainReady: false,
  roadReady: false,
  vehicleReady: false,
  environmentReady: false,
  firstFrameRendered: false,
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  stage: 'INITIALIZING',
  progress: 8,
  statusMessage: STAGE_DEFAULT_MESSAGES.INITIALIZING.title,
  subMessage: STAGE_DEFAULT_MESSAGES.INITIALIZING.sub,
  errorMessage: null,
  isReady: false,
  retryCount: 0,
  startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
  checklist: { ...INITIAL_CHECKLIST },

  setStage: (stage, statusMessage, subMessage, customProgress) => {
    const defaultMsg = STAGE_DEFAULT_MESSAGES[stage]
    const calculatedProgress = customProgress !== undefined
      ? Math.max(0, Math.min(100, customProgress))
      : STAGE_PROGRESS_MAP[stage]

    set((state) => ({
      stage,
      progress: Math.max(state.progress, calculatedProgress), // Monotonic non-decreasing progress
      statusMessage: statusMessage || defaultMsg.title,
      subMessage: subMessage || defaultMsg.sub,
      isReady: stage === 'READY',
      errorMessage: stage === 'ERROR' ? get().errorMessage : null,
    }))
  },

  setProgress: (progress) => {
    set((state) => ({
      progress: Math.max(state.progress, Math.min(100, progress)),
    }))
  },

  updateChecklist: (key, value) => {
    set((state) => ({
      checklist: {
        ...state.checklist,
        [key]: value,
      },
    }))
  },

  setError: (errorMessage) => {
    console.error('[useLoadingStore] Critical initialization error:', errorMessage)
    set({
      stage: 'ERROR',
      progress: 0,
      statusMessage: STAGE_DEFAULT_MESSAGES.ERROR.title,
      subMessage: 'Please click Retry Initialization to rebuild the rendering pipeline.',
      errorMessage,
      isReady: false,
    })
  },

  retry: () => {
    console.info('[useLoadingStore] Retrying initialization...')
    set((s) => ({
      stage: 'RECOVERING',
      progress: 10,
      statusMessage: STAGE_DEFAULT_MESSAGES.RECOVERING.title,
      subMessage: STAGE_DEFAULT_MESSAGES.RECOVERING.sub,
      errorMessage: null,
      isReady: false,
      retryCount: s.retryCount + 1,
      startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      checklist: { ...INITIAL_CHECKLIST },
    }))
  },

  reset: () => {
    set({
      stage: 'INITIALIZING',
      progress: 8,
      statusMessage: STAGE_DEFAULT_MESSAGES.INITIALIZING.title,
      subMessage: STAGE_DEFAULT_MESSAGES.INITIALIZING.sub,
      errorMessage: null,
      isReady: false,
      retryCount: 0,
      startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      checklist: { ...INITIAL_CHECKLIST },
    })
  },
}))
