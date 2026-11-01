import { create } from 'zustand'

export type LoadingStage =
  | 'INITIALIZING'
  | 'LOADING_ESSENTIAL_ASSETS'
  | 'BUILDING_INITIAL_WORLD'
  | 'PREPARING_MATERIALS'
  | 'COMPILING_SHADERS'
  | 'WARMING_UP_RENDERER'
  | 'VERIFYING_FIRST_SCENE'
  | 'READY'
  | 'ERROR'

export interface LoadingState {
  stage: LoadingStage
  progress: number // 0 to 100
  statusMessage: string
  subMessage: string
  errorMessage: string | null
  isReady: boolean
  retryCount: number

  setStage: (stage: LoadingStage, statusMessage?: string, subMessage?: string, progress?: number) => void
  setError: (errorMessage: string) => void
  retry: () => void
}

const STAGE_PROGRESS_MAP: Record<LoadingStage, number> = {
  INITIALIZING: 5,
  LOADING_ESSENTIAL_ASSETS: 25,
  BUILDING_INITIAL_WORLD: 45,
  PREPARING_MATERIALS: 60,
  COMPILING_SHADERS: 75,
  WARMING_UP_RENDERER: 88,
  VERIFYING_FIRST_SCENE: 96,
  READY: 100,
  ERROR: 0,
}

const STAGE_DEFAULT_MESSAGES: Record<LoadingStage, { title: string; sub: string }> = {
  INITIALIZING: {
    title: 'Initializing Engine & Physics State',
    sub: 'Bootstrapping simulation and audio subsystem...',
  },
  LOADING_ESSENTIAL_ASSETS: {
    title: 'Loading Essential Monocoque & Textures',
    sub: 'Fetching 3D geometries, materials, and audio samples...',
  },
  BUILDING_INITIAL_WORLD: {
    title: 'Generating Initial Road & Terrain Chunks',
    sub: 'Constructing procedural spline tracks and elevation heightmaps...',
  },
  PREPARING_MATERIALS: {
    title: 'Preparing PBR Shader Materials',
    sub: 'Configuring ACES Filmic tonemapping, environment probes & foliage alphas...',
  },
  COMPILING_SHADERS: {
    title: 'Compiling WebGL Shader Programs',
    sub: 'Executing asynchronous parallel GPU compilation for scene & shadows...',
  },
  WARMING_UP_RENDERER: {
    title: 'Warming Up WebGL Pipeline State',
    sub: 'Executing off-screen warmup passes to eliminate runtime hitching...',
  },
  VERIFYING_FIRST_SCENE: {
    title: 'Verifying Scene Readiness',
    sub: 'Checking WebGL context status and matrix hierarchy...',
  },
  READY: {
    title: 'Scene Ready',
    sub: 'Engaging driving controls...',
  },
  ERROR: {
    title: 'Initialization Failure',
    sub: 'An unexpected GPU or asset error occurred.',
  },
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  stage: 'INITIALIZING',
  progress: 5,
  statusMessage: STAGE_DEFAULT_MESSAGES.INITIALIZING.title,
  subMessage: STAGE_DEFAULT_MESSAGES.INITIALIZING.sub,
  errorMessage: null,
  isReady: false,
  retryCount: 0,

  setStage: (stage, statusMessage, subMessage, customProgress) => {
    const defaultMsg = STAGE_DEFAULT_MESSAGES[stage]
    set({
      stage,
      progress: customProgress !== undefined ? customProgress : STAGE_PROGRESS_MAP[stage],
      statusMessage: statusMessage || defaultMsg.title,
      subMessage: subMessage || defaultMsg.sub,
      isReady: stage === 'READY',
      errorMessage: stage === 'ERROR' ? get().errorMessage : null,
    })
  },

  setError: (errorMessage) => {
    set({
      stage: 'ERROR',
      progress: 0,
      statusMessage: STAGE_DEFAULT_MESSAGES.ERROR.title,
      subMessage: 'Please click Retry to re-initialize the rendering context.',
      errorMessage,
      isReady: false,
    })
  },

  retry: () => {
    set((s) => ({
      stage: 'INITIALIZING',
      progress: 5,
      statusMessage: STAGE_DEFAULT_MESSAGES.INITIALIZING.title,
      subMessage: STAGE_DEFAULT_MESSAGES.INITIALIZING.sub,
      errorMessage: null,
      isReady: false,
      retryCount: s.retryCount + 1,
    }))
  },
}))
