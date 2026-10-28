/**
 * CALM ROADS — REALISTIC VEHICLE AUDIO ENGINE
 * 
 * Architecture:
 * - 100% sample-based multi-tier Web Audio API graph.
 * - Decoupled continuous loop nodes for Engine States:
 *   [Idle], [Low RPM], [Mid RPM], [High RPM], [Off-Throttle / Engine Braking].
 * - Telemetry-driven pitch mapping (playbackRate = currentRPM / baseSampleRPM) with safety clamps.
 * - Equal-power sinusoidal crossfading across RPM powerbands with 0.045s time constant.
 * - Dynamic Load vs. Coasting bus management (On-Load acceleration vs. Off-Throttle engine braking).
 * - High-RPM throttle lift-off exhaust overrun crackles & backfire pops.
 * - Sequential dog-box ignition-cut gear shift transients.
 * - Surface friction, tire squeal, aerodynamic wind rush, horn, and Lo-Fi ambient radio.
 * - Exposes clean init(), update(), updateEngineSound(), and cleanup() methods for React useEffect lifecycle.
 */

export interface TrackInfo {
  id: number
  title: string
  artist: string
  vibe: string
}

export const LOFI_PLAYLIST: TrackInfo[] = [
  { id: 0, title: 'Sunset Boulevard', artist: 'Calm Roads Lo-Fi', vibe: 'Warm Rhodes & Tape Flutter' },
  { id: 1, title: 'Rain on Windshield', artist: 'Misty Chill Collective', vibe: 'Subtle Patter & Soft 7ths' },
  { id: 2, title: 'Snowy Pine Cabin', artist: 'Nordic Echoes', vibe: 'Frost Chimes & Warm Hearth' },
  { id: 3, title: 'Midnight Highway', artist: 'Distant Horizon', vibe: 'Analog Synth & Vinyl Glow' },
  { id: 4, title: 'Desert Mirage', artist: 'Sahara Breeze', vibe: 'Warm Dunes & Ambient Guitars' },
]

export type EngineAudioState = 'idle' | 'low_rpm' | 'mid_rpm' | 'high_rpm' | 'off_throttle'

interface EngineLoopConfig {
  name: EngineAudioState
  urls: string[]
  baseRpm: number
  minPitch: number
  maxPitch: number
}

// Master sample asset URL table: Checks dedicated public/sounds paths first, with fallbacks to public/audio/cars/
const ENGINE_LOOP_CONFIGS: Record<EngineAudioState, EngineLoopConfig> = {
  idle: {
    name: 'idle',
    urls: ['/sounds/engine_idle.wav', '/audio/cars/bmw-m3-gtr/idle_loop.wav'],
    baseRpm: 900,
    minPitch: 0.75,
    maxPitch: 1.80,
  },
  low_rpm: {
    name: 'low_rpm',
    urls: ['/sounds/engine_low.wav', '/audio/cars/bmw-m3-gtr/low_rpm_acceleration.wav'],
    baseRpm: 2200,
    minPitch: 0.65,
    maxPitch: 1.75,
  },
  mid_rpm: {
    name: 'mid_rpm',
    urls: ['/sounds/engine_mid.wav', '/audio/cars/bmw-m3-gtr/mid_rpm_acceleration.wav'],
    baseRpm: 4600,
    minPitch: 0.65,
    maxPitch: 1.70,
  },
  high_rpm: {
    name: 'high_rpm',
    urls: ['/sounds/engine_high.wav', '/audio/cars/bmw-m3-gtr/high_rpm_loop.wav'],
    baseRpm: 7000,
    minPitch: 0.70,
    maxPitch: 1.65,
  },
  off_throttle: {
    name: 'off_throttle',
    urls: ['/sounds/engine_off_throttle.wav', '/audio/cars/bmw-m3-gtr/deceleration.wav', '/audio/cars/bmw-m3-gtr/engine_braking.wav'],
    baseRpm: 4000,
    minPitch: 0.60,
    maxPitch: 1.75,
  },
}

interface ActiveLoopChannel {
  source: AudioBufferSourceNode | null
  gain: GainNode | null
  buffer: AudioBuffer | null
  config: EngineLoopConfig
}

export class RealisticVehicleAudioEngine {
  private ctx: AudioContext | null = null
  private isUnlocked = false
  private isInitialized = false

  // Master Gain Busses
  private masterGain: GainNode | null = null
  private sfxMaster: GainNode | null = null
  private musicGain: GainNode | null = null

  // Engine Sub-Busses
  private engineMaster: GainNode | null = null
  private subBassEQ: BiquadFilterNode | null = null
  private growlEQ: BiquadFilterNode | null = null
  private onLoadBus: GainNode | null = null
  private offLoadBus: GainNode | null = null
  private onLoadFilter: BiquadFilterNode | null = null
  private spatialPanner: PannerNode | null = null

  // Loop Channels for the 5 Engine States
  private loops: Record<EngineAudioState, ActiveLoopChannel> = {
    idle: { source: null, gain: null, buffer: null, config: ENGINE_LOOP_CONFIGS.idle },
    low_rpm: { source: null, gain: null, buffer: null, config: ENGINE_LOOP_CONFIGS.low_rpm },
    mid_rpm: { source: null, gain: null, buffer: null, config: ENGINE_LOOP_CONFIGS.mid_rpm },
    high_rpm: { source: null, gain: null, buffer: null, config: ENGINE_LOOP_CONFIGS.high_rpm },
    off_throttle: { source: null, gain: null, buffer: null, config: ENGINE_LOOP_CONFIGS.off_throttle },
  }

  // Transient Audio Buffers (Overrun Pops, Sequential Shifts)
  private overrunBuffer: AudioBuffer | null = null
  private gearUpBuffer: AudioBuffer | null = null
  private gearDownBuffer: AudioBuffer | null = null
  private rallyBuffer: AudioBuffer | null = null
  private rallySource: AudioBufferSourceNode | null = null
  private rallyGain: GainNode | null = null
  private v8RecordedBuffer: AudioBuffer | null = null
  private v8RecordedSource: AudioBufferSourceNode | null = null
  private v8RecordedGain: GainNode | null = null

  // Telemetry Tracking
  private prevThrottle = 0
  private lastExhaustPopTime = 0
  private musicTimer: number | null = null
  private isMusicPlaying = false
  private currentTrack = 0
  private musicVolume = 0.65
  private sfxMasterVolume = 0.65

  // Environmental SFX Channels
  private frictionGain: GainNode | null = null
  private frictionFilter: BiquadFilterNode | null = null
  private tireSquealGain: GainNode | null = null
  private tireSquealFilter: BiquadFilterNode | null = null
  private windRushGain: GainNode | null = null
  private windRushFilter: BiquadFilterNode | null = null
  private hoverGain: GainNode | null = null
  private hoverOsc: OscillatorNode | null = null

  // Lo-Fi Synth Chord progressions
  private chordProgressions = [
    [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23], // G7
    ],
    [
      [293.66, 349.23, 440.00, 523.25], // Dm7
      [196.00, 246.94, 293.66, 349.23], // G7
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
    ],
    [
      [329.63, 392.00, 493.88, 587.33], // Em7
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [246.94, 293.66, 349.23, 440.00], // Bm7
    ],
    [
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [261.63, 329.63, 392.00, 523.25], // Cmaj7
      [164.81, 196.00, 246.94, 293.66], // Em7
    ],
    [
      [349.23, 440.00, 523.25, 659.25], // Fmaj7
      [329.63, 392.00, 493.88, 587.33], // Em7
      [293.66, 349.23, 440.00, 523.25], // Dm7
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
    ],
  ]

  // --------------------------------------------------------------------------
  // 1. AudioContext & Buffer Management
  // --------------------------------------------------------------------------

  public get unlocked(): boolean {
    return this.isUnlocked
  }

  /**
   * Initialize the Web Audio API context and assemble the audio routing graph.
   * Can be called with an existing context or will instantiate a new AudioContext.
   */
  public async init(externalCtx?: AudioContext): Promise<void> {
    if (this.isInitialized && this.ctx) return

    try {
      if (externalCtx) {
        this.ctx = externalCtx
      } else if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        this.ctx = new AudioCtx()
      }

      const ctx = this.ctx

      // Master Output Buses
      this.masterGain = ctx.createGain()
      this.masterGain.gain.setValueAtTime(1.0, ctx.currentTime)
      this.masterGain.connect(ctx.destination)

      this.sfxMaster = ctx.createGain()
      this.sfxMaster.gain.setValueAtTime(this.sfxMasterVolume, ctx.currentTime)
      this.sfxMaster.connect(this.masterGain)

      this.musicGain = ctx.createGain()
      this.musicGain.gain.setValueAtTime(this.musicVolume, ctx.currentTime)
      this.musicGain.connect(this.masterGain)

      // 3D Spatial Panner Node (HRTF model for Chase, Bumper & Drone camera tracking)
      try {
        const panner = ctx.createPanner()
        panner.panningModel = 'HRTF'
        panner.distanceModel = 'inverse'
        panner.refDistance = 4.0
        panner.maxDistance = 250.0
        panner.rolloffFactor = 1.0
        panner.coneInnerAngle = 360
        panner.connect(this.sfxMaster)
        this.spatialPanner = panner
      } catch {
        this.spatialPanner = null
      }

      // Engine Sub-Busses
      this.engineMaster = ctx.createGain()
      this.engineMaster.gain.setValueAtTime(1.0, ctx.currentTime)

      // Heavy Sub-Bass Reinforcement EQ (Subwoofer chest thump 45 - 110 Hz)
      this.subBassEQ = ctx.createBiquadFilter()
      this.subBassEQ.type = 'lowshelf'
      this.subBassEQ.frequency.setValueAtTime(90, ctx.currentTime)
      this.subBassEQ.gain.setValueAtTime(5.8, ctx.currentTime) // +5.8 dB heavy bass weight

      // Guttural Manifold Growl & Displacement Resonance EQ (180 - 320 Hz)
      this.growlEQ = ctx.createBiquadFilter()
      this.growlEQ.type = 'peaking'
      this.growlEQ.frequency.setValueAtTime(230, ctx.currentTime)
      this.growlEQ.Q.setValueAtTime(1.3, ctx.currentTime)
      this.growlEQ.gain.setValueAtTime(3.6, ctx.currentTime) // +3.6 dB heavy growl

      this.engineMaster.connect(this.subBassEQ)
      this.subBassEQ.connect(this.growlEQ)

      if (this.spatialPanner) {
        this.growlEQ.connect(this.spatialPanner)
      } else {
        this.growlEQ.connect(this.sfxMaster)
      }

      // Dynamic Manifold Combustion Roar Filter on On-Load Bus
      this.onLoadFilter = ctx.createBiquadFilter()
      this.onLoadFilter.type = 'lowpass'
      this.onLoadFilter.frequency.setValueAtTime(4500, ctx.currentTime)
      this.onLoadFilter.Q.setValueAtTime(0.7, ctx.currentTime)
      this.onLoadFilter.connect(this.engineMaster)

      // On-Load Acceleration Bus (Low, Mid, High RPM)
      this.onLoadBus = ctx.createGain()
      this.onLoadBus.gain.setValueAtTime(0.0001, ctx.currentTime)
      this.onLoadBus.connect(this.onLoadFilter)

      // Off-Throttle Deceleration Bus (Engine Braking / Compression Overrun)
      this.offLoadBus = ctx.createGain()
      this.offLoadBus.gain.setValueAtTime(0.0001, ctx.currentTime)
      this.offLoadBus.connect(this.engineMaster)

      // Initialize environmental noise generators (friction, wind, tire squeal)
      this.initEnvironmentalSFX(ctx)

      this.isInitialized = true
      this.isUnlocked = ctx.state === 'running'

      // Fetch and decode engine loop audio assets asynchronously
      await this.loadAudioAssets(ctx)

      // Instantiate continuous looping source nodes
      this.setupEngineLoopNodes(ctx)
    } catch (err) {
      console.warn('[VehicleAudioEngine] Initialization warning:', err)
    }
  }

  /**
   * Resumes the AudioContext upon user gesture (pointerdown/keydown)
   */
  public unlock(): void {
    if (!this.ctx) {
      this.init()
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isUnlocked = true
      }).catch(() => {})
    }
  }

  /**
   * Fetch and decode an audio buffer across primary and fallback URL paths
   */
  private async fetchAndDecode(ctx: AudioContext, urls: string[]): Promise<AudioBuffer | null> {
    for (const url of urls) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          return await ctx.decodeAudioData(arrayBuffer)
        }
      } catch {
        // Continue to fallback URL
      }
    }
    return null
  }

  /**
   * Load all 5 engine states and transient audio buffers
   */
  private async loadAudioAssets(ctx: AudioContext): Promise<void> {
    const states: EngineAudioState[] = ['idle', 'low_rpm', 'mid_rpm', 'high_rpm', 'off_throttle']

    const bufferPromises = states.map(async (state) => {
      const buffer = await this.fetchAndDecode(ctx, this.loops[state].config.urls)
      this.loops[state].buffer = buffer
      return { state, buffer }
    })

    const transientPromises = Promise.all([
      this.fetchAndDecode(ctx, ['/sounds/exhaust_pop.wav', '/audio/cars/bmw-m3-gtr/exhaust_overrun.wav']),
      this.fetchAndDecode(ctx, ['/sounds/gear_shift.wav', '/audio/cars/bmw-m3-gtr/gear_up.wav']),
      this.fetchAndDecode(ctx, ['/sounds/gear_downshift.wav', '/audio/cars/bmw-m3-gtr/gear_down.wav']),
      this.fetchAndDecode(ctx, ['/audio/raw/audi_quattro_rally.ogg']),
      this.fetchAndDecode(ctx, ['/audio/raw/v8_idle_and_revs.ogg', '/audio/raw/bmw_m3_gt2_2010.ogg']),
    ])

    await Promise.all([...bufferPromises, transientPromises])

    const [overrun, gearUp, gearDown, rally, v8Rec] = await transientPromises
    this.overrunBuffer = overrun
    this.gearUpBuffer = gearUp
    this.gearDownBuffer = gearDown
    this.rallyBuffer = rally
    this.v8RecordedBuffer = v8Rec
  }

  // --------------------------------------------------------------------------
  // 2. The Audio Graph: Looping Nodes & Sub-Buses
  // --------------------------------------------------------------------------

  /**
   * Creates the 5 looping AudioBufferSourceNodes and wires them to their GainNodes.
   */
  private setupEngineLoopNodes(ctx: AudioContext): void {
    if (!this.engineMaster || !this.onLoadBus || !this.offLoadBus) return

    const states: EngineAudioState[] = ['idle', 'low_rpm', 'mid_rpm', 'high_rpm', 'off_throttle']

    states.forEach((state) => {
      const channel = this.loops[state]
      if (!channel.buffer || channel.source) return

      // Create dedicated GainNode for RPM crossfading
      const gainNode = ctx.createGain()
      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime)

      // Route GainNode into appropriate bus:
      // - Idle connects directly to engine master bus (or ducks under load)
      // - Low, Mid, High connect into onLoadBus for instant throttle response
      // - Off-Throttle connects into offLoadBus for engine braking
      if (state === 'idle') {
        gainNode.connect(this.engineMaster!)
      } else if (state === 'off_throttle') {
        gainNode.connect(this.offLoadBus!)
      } else {
        gainNode.connect(this.onLoadBus!)
      }

      channel.gain = gainNode

      // Create dedicated AudioBufferSourceNode set to loop = true
      const source = ctx.createBufferSource()
      source.buffer = channel.buffer
      source.loop = true
      source.playbackRate.setValueAtTime(1.0, ctx.currentTime)
      source.connect(gainNode)

      try {
        source.start(0)
      } catch (err) {
        console.warn(`[VehicleAudioEngine] Loop start warning for ${state}:`, err)
      }

      channel.source = source
    })

    // Setup rally hatchback loop channel if loaded
    if (this.rallyBuffer && !this.rallySource && this.sfxMaster) {
      const rallyGain = ctx.createGain()
      rallyGain.gain.setValueAtTime(0.0001, ctx.currentTime)
      rallyGain.connect(this.sfxMaster)

      const rallySrc = ctx.createBufferSource()
      rallySrc.buffer = this.rallyBuffer
      rallySrc.loop = true
      rallySrc.connect(rallyGain)
      try {
        rallySrc.start(0)
      } catch {}

      this.rallySource = rallySrc
      this.rallyGain = rallyGain
    }

    // Setup authentic recorded V8 texture loop if loaded
    if (this.v8RecordedBuffer && !this.v8RecordedSource && this.engineMaster) {
      const v8Gain = ctx.createGain()
      v8Gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      v8Gain.connect(this.engineMaster)

      const v8Src = ctx.createBufferSource()
      v8Src.buffer = this.v8RecordedBuffer
      v8Src.loop = true
      v8Src.playbackRate.setValueAtTime(1.0, ctx.currentTime)
      v8Src.connect(v8Gain)
      try {
        v8Src.start(0)
      } catch {}

      this.v8RecordedSource = v8Src
      this.v8RecordedGain = v8Gain
    }
  }

  // --------------------------------------------------------------------------
  // 3 & 4. Telemetry Mapping (Pitch & Dynamic Crossfading)
  // --------------------------------------------------------------------------

  /**
   * Primary frame update function: maps vehicle RPM, throttle, and speed directly
   * to loop playbackRate, dynamic equal-power crossfading, and on-load vs coasting buses.
   *
   * @param rpm - Engine revolutions per minute (e.g., 850 - 8500)
   * @param throttle - Accelerator input (0.0 to 1.0 or boolean)
   * @param speed - Vehicle speed in km/h
   */
  public updateEngineSound(rpm: number, throttle: number | boolean, speed = 0): void {
    if (!this.ctx || !this.isInitialized) return
    const now = this.ctx.currentTime

    // Normalize inputs
    const curRpm = Math.max(700, Math.min(9500, rpm))
    const throttleVal = typeof throttle === 'boolean' ? (throttle ? 1.0 : 0.0) : Math.max(0, Math.min(1, throttle))
    const isPressed = throttleVal > 0.05
    const speedKmh = Math.max(0, speed)

    // Detect rapid throttle release for high-RPM exhaust overrun crackle
    const throttleDelta = this.prevThrottle - throttleVal
    if (throttleDelta > 0.35 && curRpm > 3800) {
      this.triggerExhaustPop(Math.min(1.0, 0.6 + (curRpm - 3800) / 4000))
    }
    this.prevThrottle = throttleVal

    // ------------------------------------------------------------------------
    // Pitch Mapping (playbackRate = currentRPM / baseSampleRPM)
    // ------------------------------------------------------------------------
    const states: EngineAudioState[] = ['idle', 'low_rpm', 'mid_rpm', 'high_rpm', 'off_throttle']

    states.forEach((state) => {
      const channel = this.loops[state]
      if (channel.source) {
        const rawPitch = curRpm / channel.config.baseRpm
        const clampedPitch = Math.min(channel.config.maxPitch, Math.max(channel.config.minPitch, rawPitch))
        channel.source.playbackRate.setTargetAtTime(clampedPitch, now, 0.045)
      }
    })

    // ------------------------------------------------------------------------
    // Dynamic Equal-Power Crossfading (True Sinusoidal Power Conservation)
    // ------------------------------------------------------------------------
    let gainIdle = 0
    let gainLow = 0
    let gainMid = 0
    let gainHigh = 0

    // Band 1: Idle (700 - 2200 RPM)
    if (curRpm <= 1000) {
      gainIdle = 1.0
      gainLow = 0.0
    } else if (curRpm < 2200) {
      const t = (curRpm - 1000) / (2200 - 1000)
      gainIdle = Math.cos(t * Math.PI * 0.5)
      gainLow = Math.sin(t * Math.PI * 0.5)
    }
    // Band 2: Low to Mid RPM (2200 - 4800 RPM)
    else if (curRpm < 4800) {
      const t = (curRpm - 2200) / (4800 - 2200)
      gainLow = Math.cos(t * Math.PI * 0.5)
      gainMid = Math.sin(t * Math.PI * 0.5)
    }
    // Band 3: Mid to High RPM (4800 - 7200 RPM)
    else if (curRpm < 7200) {
      const t = (curRpm - 4800) / (7200 - 4800)
      gainMid = Math.cos(t * Math.PI * 0.5)
      gainHigh = Math.sin(t * Math.PI * 0.5)
    }
    // Band 4: High Screaming RPM (7200 - 9000+ RPM)
    else {
      gainHigh = 1.0
    }

    // Dynamic Engine Load Multipliers (Visceral Manifold Combustion Roar)
    // Under full throttle, mid and high RPM harmonics are aggressively boosted
    const midLoadBoost = 1.0 + throttleVal * 0.35
    const highLoadBoost = 1.0 + throttleVal * 0.45

    const timeConstant = 0.045 // Smooth 45ms time constant eliminates zipper clicks
    this.loops.idle.gain?.gain.setTargetAtTime(gainIdle * (1 - throttleVal * 0.65), now, timeConstant)
    this.loops.low_rpm.gain?.gain.setTargetAtTime(gainLow, now, timeConstant)
    this.loops.mid_rpm.gain?.gain.setTargetAtTime(gainMid * midLoadBoost, now, timeConstant)
    this.loops.high_rpm.gain?.gain.setTargetAtTime(gainHigh * highLoadBoost, now, timeConstant)

    // Dynamic Load Filter: Open manifold breathing up to 18,000 Hz under heavy throttle
    if (this.onLoadFilter) {
      const targetFilterFreq = isPressed
        ? 4500 + throttleVal * 12500 + (curRpm / 8500) * 3000
        : 2800
      this.onLoadFilter.frequency.setTargetAtTime(Math.min(20000, targetFilterFreq), now, timeConstant)
    }

    // Dynamic Sub-Bass & Manifold Growl Swell under Throttle Load
    if (this.subBassEQ) {
      const targetBass = 5.8 + throttleVal * 3.8 // +5.8 dB up to +9.6 dB heavy sub-bass
      this.subBassEQ.gain.setTargetAtTime(targetBass, now, timeConstant)
    }
    if (this.growlEQ) {
      const targetGrowl = 3.6 + throttleVal * 3.6 // +3.6 dB up to +7.2 dB guttural throat
      this.growlEQ.gain.setTargetAtTime(targetGrowl, now, timeConstant)
    }

    // Blend authentic recorded V8 texture with multi-tier engine loops
    if (this.v8RecordedGain && this.v8RecordedSource) {
      const recPitch = Math.min(1.85, Math.max(0.68, curRpm / 3400))
      this.v8RecordedSource.playbackRate.setTargetAtTime(recPitch, now, 0.045)
      const targetRecGain = (0.22 + throttleVal * 0.42) * Math.min(1.0, curRpm / 1600)
      this.v8RecordedGain.gain.setTargetAtTime(targetRecGain, now, 0.045)
    }

    // ------------------------------------------------------------------------
    // 5. Load vs. Coasting (Throttle State)
    // ------------------------------------------------------------------------
    if (this.onLoadBus && this.offLoadBus) {
      if (isPressed) {
        // Accelerator is PRESSED: Fade On-Load master bus UP proportional to throttle
        const targetOnLoad = 0.42 + throttleVal * 0.68
        this.onLoadBus.gain.setTargetAtTime(targetOnLoad, now, timeConstant)
        // Off-throttle engine braking fades down
        this.offLoadBus.gain.setTargetAtTime(0.0001, now, timeConstant)
      } else {
        // Accelerator is RELEASED (coasting or braking at speed):
        // Duck the On-Load combustion loops down to a subtle background whirr
        this.onLoadBus.gain.setTargetAtTime(0.08, now, 0.06)

        // Rapidly crossfade into the off-throttle engine braking / overrun loop
        if (speedKmh > 5 && curRpm > 1400) {
          const offThrottleIntensity = Math.min(
            1.0,
            ((curRpm - 1400) / 2800) * Math.min(1.0, speedKmh / 22)
          )
          this.offLoadBus.gain.setTargetAtTime(offThrottleIntensity * 0.85, now, timeConstant)
          this.loops.off_throttle.gain?.gain.setTargetAtTime(1.0, now, timeConstant)
        } else {
          // At rest or gentle crawl, silence off-throttle loop to let clean idle breathe
          this.offLoadBus.gain.setTargetAtTime(0.0001, now, timeConstant)
        }
      }
    }
  }

  /**
   * React update alias matching the requested API interface:
   * update(rpm, throttle, speed)
   */
  public update(rpm: number, throttle: number | boolean, speed = 0): void {
    this.updateEngineSound(rpm, throttle, speed)
  }

  /**
   * 3D Spatial Audio Integration: positions the engine/exhaust sound emitter
   * relative to the camera listener in world space.
   */
  public updateSpatialPosition(
    carPos: { x: number; y: number; z: number },
    camPos: { x: number; y: number; z: number },
    camForward?: { x: number; y: number; z: number }
  ): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const listener = this.ctx.listener

    // 1. Position Web Audio listener at camera position
    if (listener.positionX) {
      listener.positionX.setTargetAtTime(camPos.x, now, 0.04)
      listener.positionY.setTargetAtTime(camPos.y, now, 0.04)
      listener.positionZ.setTargetAtTime(camPos.z, now, 0.04)
    } else {
      listener.setPosition(camPos.x, camPos.y, camPos.z)
    }

    // 2. Orient listener along camera sightline
    if (camForward) {
      if (listener.forwardX) {
        listener.forwardX.setTargetAtTime(camForward.x, now, 0.04)
        listener.forwardY.setTargetAtTime(camForward.y, now, 0.04)
        listener.forwardZ.setTargetAtTime(camForward.z, now, 0.04)
        listener.upX?.setTargetAtTime(0, now, 0.04)
        listener.upY?.setTargetAtTime(1, now, 0.04)
        listener.upZ?.setTargetAtTime(0, now, 0.04)
      } else {
        listener.setOrientation(camForward.x, camForward.y, camForward.z, 0, 1, 0)
      }
    }

    // 3. Position spatial sound emitter at car body / exhaust
    if (this.spatialPanner) {
      if (this.spatialPanner.positionX) {
        this.spatialPanner.positionX.setTargetAtTime(carPos.x, now, 0.04)
        this.spatialPanner.positionY.setTargetAtTime(carPos.y, now, 0.04)
        this.spatialPanner.positionZ.setTargetAtTime(carPos.z, now, 0.04)
      } else {
        this.spatialPanner.setPosition(carPos.x, carPos.y, carPos.z)
      }
    }
  }

  /**
   * Full environmental vehicle audio update method supporting hover mode,
   * tire lateral slip squeal, road friction, and aerodynamics.
   */
  public updateVehicleAudio(params: {
    speedKmh: number
    rpm: number
    throttle: number
    isOffRoad?: boolean
    isHoverMode?: boolean
    vehicleModel?: string
    isDecelerating?: boolean
    lateralSlip?: number
    isBurnout?: boolean
  }): void {
    if (!this.ctx || !this.isInitialized) return
    const now = this.ctx.currentTime

    const {
      speedKmh,
      rpm,
      throttle,
      isOffRoad = false,
      isHoverMode = false,
      vehicleModel = 'bmw_m3',
      lateralSlip = 0,
      isBurnout = false,
    } = params

    // 1. Hover mode: Mute combustion engines and spool repulsor hum
    if (isHoverMode) {
      this.engineMaster?.gain.setTargetAtTime(0.0001, now, 0.06)
      this.rallyGain?.gain.setTargetAtTime(0.0001, now, 0.06)

      if (this.hoverGain && this.hoverOsc) {
        const hoverTarget = 0.14 + Math.min(0.14, (speedKmh / 180) * 0.12)
        this.hoverGain.gain.setTargetAtTime(hoverTarget, now, 0.08)
        const hoverFreq = 160 + (speedKmh / 200) * 95 + throttle * 45
        this.hoverOsc.frequency.setTargetAtTime(hoverFreq, now, 0.05)
      }
      return
    }

    // 2. Combustion Mode Active
    this.hoverGain?.gain.setTargetAtTime(0.0001, now, 0.06)

    // Handle Vintage Rally Hatchback recording
    if (vehicleModel === 'hatchback' && this.rallyGain && this.rallySource) {
      this.engineMaster?.gain.setTargetAtTime(0.0001, now, 0.05)
      const rpmNorm = (rpm - 1000) / 6500
      this.rallySource.playbackRate.setTargetAtTime(0.85 + rpmNorm * 0.35, now, 0.045)
      const targetRallyVol = 0.18 + throttle * 0.62 + (speedKmh / 180) * 0.18
      this.rallyGain.gain.setTargetAtTime(targetRallyVol, now, 0.045)
    } else {
      // V8 Sports Car & Modern Supercar: Run primary sample-based audio engine
      this.rallyGain?.gain.setTargetAtTime(0.0001, now, 0.05)
      this.engineMaster?.gain.setTargetAtTime(1.0, now, 0.05)
      this.updateEngineSound(rpm, throttle, speedKmh)
    }

    // 3. Surface Friction Noise (asphalt vs off-road/grass)
    if (this.frictionGain && this.frictionFilter) {
      if (speedKmh < 3) {
        this.frictionGain.gain.setTargetAtTime(0.0001, now, 0.08)
      } else {
        const speedNorm = Math.min(1.0, speedKmh / 160)
        const targetFriction = isOffRoad ? speedNorm * 0.14 : speedNorm * 0.05
        this.frictionGain.gain.setTargetAtTime(targetFriction, now, 0.05)
        this.frictionFilter.frequency.setTargetAtTime(isOffRoad ? 500 : 1200, now, 0.08)
      }
    }

    // 4. Lateral Slip Tire Squeal & Burnout Screech
    if (this.tireSquealGain && this.tireSquealFilter) {
      if (!isBurnout && (speedKmh < 15 || lateralSlip < 0.08)) {
        this.tireSquealGain.gain.setTargetAtTime(0.0001, now, 0.05)
      } else {
        const slipIntensity = isBurnout ? 1.0 : Math.min(1.0, (lateralSlip - 0.08) * 2.8)
        const speedFactor = isBurnout ? 1.0 : Math.min(1.0, speedKmh / 50)
        const targetSquealGain = slipIntensity * speedFactor * (isBurnout ? 0.46 : 0.38)
        this.tireSquealGain.gain.setTargetAtTime(targetSquealGain, now, 0.03)

        const squealFreq = isBurnout
          ? 1750 + Math.random() * 250
          : 1000 + (speedKmh / 220) * 450 + slipIntensity * 320
        this.tireSquealFilter.frequency.setTargetAtTime(squealFreq, now, 0.04)
      }
    }

    // 5. Aerodynamic High-Speed Wind Rush
    if (this.windRushGain && this.windRushFilter) {
      const speedNorm = Math.min(1.2, speedKmh / 280)
      const targetWindGain = speedNorm * speedNorm * 0.28
      this.windRushGain.gain.setTargetAtTime(Math.max(0.0001, targetWindGain), now, 0.06)

      const windFreq = 300 + speedNorm * 1150
      this.windRushFilter.frequency.setTargetAtTime(windFreq, now, 0.06)
    }
  }

  // --------------------------------------------------------------------------
  // Transients & Sound Effects (Overrun Pops, Shift Cuts, Horn)
  // --------------------------------------------------------------------------

  /**
   * Explosive exhaust overrun crackle and backfire burst
   */
  public triggerExhaustPop(intensity = 1.0): void {
    if (!this.ctx || !this.sfxMaster) return
    const now = this.ctx.currentTime
    if (now - this.lastExhaustPopTime < 0.12) return
    this.lastExhaustPopTime = now

    if (this.overrunBuffer) {
      const popCount = intensity > 0.65 ? (Math.random() > 0.45 ? 2 : 1) : 1
      for (let p = 0; p < popCount; p++) {
        const popDelay = p * (0.038 + Math.random() * 0.042)
        const popTime = now + popDelay
        const source = this.ctx.createBufferSource()
        source.buffer = this.overrunBuffer
        source.playbackRate.value = 0.94 + Math.random() * 0.16
        const gain = this.ctx.createGain()
        gain.gain.setValueAtTime(0.72 * intensity * (p === 0 ? 1.0 : 0.65), popTime)
        source.connect(gain)
        gain.connect(this.sfxMaster)
        source.start(popTime)
      }
    }
  }

  /**
   * Sequential dog-box ignition cut ducking and mechanical shift one-shot
   */
  public triggerGearShift(vehicleModel = 'bmw_m3', isDownshift = false): void {
    if (!this.ctx || !this.sfxMaster) return
    const now = this.ctx.currentTime

    // 0.045s sequential ignition cut: duck on-load acceleration volume momentarily
    if (this.onLoadBus && vehicleModel !== 'camper') {
      this.onLoadBus.gain.setValueAtTime(0.06, now)
      this.onLoadBus.gain.setTargetAtTime(0.85, now + 0.045, 0.045)
    }

    // Play recorded mechanical dog-ring engagement transient
    const shiftBuffer = isDownshift ? (this.gearDownBuffer || this.gearUpBuffer) : this.gearUpBuffer
    if (shiftBuffer) {
      const source = this.ctx.createBufferSource()
      source.buffer = shiftBuffer
      source.playbackRate.value = 0.98 + Math.random() * 0.04
      const gain = this.ctx.createGain()
      gain.gain.setValueAtTime(0.72, now)
      source.connect(gain)
      gain.connect(this.sfxMaster)
      source.start(now)
    }

    this.triggerExhaustPop(isDownshift ? 0.85 : 0.55)
  }

  /**
   * Dual-tone vehicle horn
   */
  public playHorn(): void {
    this.unlock()
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const osc1 = this.ctx.createOscillator()
    const osc2 = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc1.type = 'sawtooth'
    osc1.frequency.setValueAtTime(440, now) // A4
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(554.37, now) // C#5

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.2, now + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(this.ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.4)
    osc2.stop(now + 0.4)
  }

  // --------------------------------------------------------------------------
  // Environmental Synthesis Setup
  // --------------------------------------------------------------------------

  private initEnvironmentalSFX(ctx: AudioContext): void {
    try {
      const bufferSize = ctx.sampleRate * 2
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }

      // A. Road surface friction
      const noiseSource = ctx.createBufferSource()
      noiseSource.buffer = noiseBuffer
      noiseSource.loop = true

      this.frictionFilter = ctx.createBiquadFilter()
      this.frictionFilter.type = 'bandpass'
      this.frictionFilter.frequency.value = 800
      this.frictionFilter.Q.value = 1.0

      this.frictionGain = ctx.createGain()
      this.frictionGain.gain.value = 0.0

      noiseSource.connect(this.frictionFilter)
      this.frictionFilter.connect(this.frictionGain)
      this.frictionGain.connect(this.sfxMaster!)
      noiseSource.start()

      // B. Lateral slip tire squeal
      const squealSource = ctx.createBufferSource()
      squealSource.buffer = noiseBuffer
      squealSource.loop = true

      this.tireSquealFilter = ctx.createBiquadFilter()
      this.tireSquealFilter.type = 'bandpass'
      this.tireSquealFilter.frequency.value = 1100
      this.tireSquealFilter.Q.value = 4.2

      this.tireSquealGain = ctx.createGain()
      this.tireSquealGain.gain.value = 0.0001

      squealSource.connect(this.tireSquealFilter)
      this.tireSquealFilter.connect(this.tireSquealGain)
      this.tireSquealGain.connect(this.sfxMaster!)
      squealSource.start()

      // C. High-speed wind rush
      const windSource = ctx.createBufferSource()
      windSource.buffer = noiseBuffer
      windSource.loop = true

      this.windRushFilter = ctx.createBiquadFilter()
      this.windRushFilter.type = 'lowpass'
      this.windRushFilter.frequency.value = 420

      this.windRushGain = ctx.createGain()
      this.windRushGain.gain.value = 0.0001

      windSource.connect(this.windRushFilter)
      this.windRushFilter.connect(this.windRushGain)
      this.windRushGain.connect(this.sfxMaster!)
      windSource.start()
    } catch {}

    // Antigravity repulsor hum
    this.hoverGain = ctx.createGain()
    this.hoverGain.gain.value = 0.0
    this.hoverOsc = ctx.createOscillator()
    this.hoverOsc.type = 'sine'
    this.hoverOsc.frequency.value = 180
    this.hoverOsc.connect(this.hoverGain)
    this.hoverGain.connect(this.sfxMaster!)
    this.hoverOsc.start()
  }

  // --------------------------------------------------------------------------
  // Lo-Fi Ambient Radio Player
  // --------------------------------------------------------------------------

  private playChord(chord: number[], durationSec: number): void {
    if (!this.ctx || !this.musicGain) return
    const now = this.ctx.currentTime

    chord.forEach((freq, i) => {
      if (!this.ctx || !this.musicGain) return
      const osc = this.ctx.createOscillator()
      const noteGain = this.ctx.createGain()

      osc.type = i === 0 ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(freq * (1 + (Math.random() - 0.5) * 0.004), now)

      const attack = 0.08 + i * 0.03
      noteGain.gain.setValueAtTime(0.0001, now)
      noteGain.gain.linearRampToValueAtTime(0.12 / (i + 1), now + attack)
      noteGain.gain.exponentialRampToValueAtTime(0.035 / (i + 1), now + durationSec * 0.7)
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.96)

      osc.connect(noteGain)
      noteGain.connect(this.musicGain)

      osc.start(now + i * 0.02)
      osc.stop(now + durationSec)
    })
  }

  public setMusicVolume(val: number): void {
    this.musicVolume = Math.max(0, Math.min(1, val))
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05)
    }
  }

  public setSfxVolume(val: number): void {
    this.sfxMasterVolume = Math.max(0, Math.min(1, val))
    if (this.sfxMaster && this.ctx) {
      this.sfxMaster.gain.setTargetAtTime(this.sfxMasterVolume, this.ctx.currentTime, 0.05)
    }
  }

  public startMusic(trackIdx = 0): void {
    this.unlock()
    this.stopMusic()
    this.isMusicPlaying = true
    this.currentTrack = trackIdx % this.chordProgressions.length

    const prog = this.chordProgressions[this.currentTrack]
    let chordIdx = 0
    const beatDuration = 3.8

    const loop = () => {
      if (!this.isMusicPlaying) return
      const chord = prog[chordIdx % prog.length]
      this.playChord(chord, beatDuration * 0.95)
      chordIdx++
      this.musicTimer = window.setTimeout(loop, beatDuration * 1000)
    }

    loop()
  }

  public stopMusic(): void {
    this.isMusicPlaying = false
    if (this.musicTimer) {
      clearTimeout(this.musicTimer)
      this.musicTimer = null
    }
  }

  public getTrack(index: number): TrackInfo {
    return LOFI_PLAYLIST[index % LOFI_PLAYLIST.length]
  }

  // --------------------------------------------------------------------------
  // React Lifecycle Cleanup
  // --------------------------------------------------------------------------

  /**
   * Stops loop nodes and closes the audio graph to prevent memory leaks in useEffect.
   */
  public cleanup(): void {
    const states: EngineAudioState[] = ['idle', 'low_rpm', 'mid_rpm', 'high_rpm', 'off_throttle']

    states.forEach((state) => {
      const channel = this.loops[state]
      if (channel.source) {
        try {
          channel.source.stop()
          channel.source.disconnect()
        } catch {}
        channel.source = null
      }
      if (channel.gain) {
        try {
          channel.gain.disconnect()
        } catch {}
        channel.gain = null
      }
    })

    if (this.rallySource) {
      try {
        this.rallySource.stop()
        this.rallySource.disconnect()
      } catch {}
      this.rallySource = null
    }

    if (this.v8RecordedSource) {
      try {
        this.v8RecordedSource.stop()
        this.v8RecordedSource.disconnect()
      } catch {}
      this.v8RecordedSource = null
    }

    if (this.v8RecordedGain) {
      try {
        this.v8RecordedGain.disconnect()
      } catch {}
      this.v8RecordedGain = null
    }

    if (this.subBassEQ) {
      try {
        this.subBassEQ.disconnect()
      } catch {}
      this.subBassEQ = null
    }

    if (this.growlEQ) {
      try {
        this.growlEQ.disconnect()
      } catch {}
      this.growlEQ = null
    }

    if (this.spatialPanner) {
      try {
        this.spatialPanner.disconnect()
      } catch {}
      this.spatialPanner = null
    }

    if (this.onLoadFilter) {
      try {
        this.onLoadFilter.disconnect()
      } catch {}
      this.onLoadFilter = null
    }

    this.stopMusic()
    this.isInitialized = false
  }
}

// Export singleton engine instance
export const audioSystem = new RealisticVehicleAudioEngine()

// Auto-unlock on initial user interaction to satisfy browser autoplay policies
if (typeof window !== 'undefined') {
  const autoUnlock = () => {
    audioSystem.unlock()
    window.removeEventListener('pointerdown', autoUnlock)
    window.removeEventListener('keydown', autoUnlock)
    window.removeEventListener('touchstart', autoUnlock)
  }
  window.addEventListener('pointerdown', autoUnlock, { once: true })
  window.addEventListener('keydown', autoUnlock, { once: true })
  window.addEventListener('touchstart', autoUnlock, { once: true })
}
