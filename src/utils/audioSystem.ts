/**
 * CALM ROADS — MULTI-VEHICLE ACOUSTIC AUDIO ENGINE
 * 
 * Architecture:
 * - Reusable VehicleAudioProfile registry keyed by actual vehicle IDs:
 *   'bmw_m3' | 'supercar' | 'hovercraft' | 'camper' | 'hatchback'.
 * - 100% sample-based multi-tier Web Audio API graph.
 * - Global AudioBuffer cache: buffers are decoded once and reused permanently across vehicle switches.
 * - Single-use AudioBufferSourceNode lifecycle management (strictly creates new sources on switch/reset).
 * - Multi-layer continuous loops: [Idle], [Low RPM], [Mid RPM], [High RPM], [Off-Throttle / Engine Braking].
 * - Telemetry-driven pitch mapping (playbackRate = currentRPM / baseSampleRPM) with safety clamps.
 * - Equal-power sinusoidal crossfading across RPM powerbands with 0.045s time constant.
 * - Dynamic Load vs. Coasting bus management (On-Load acceleration vs. Off-Throttle engine braking).
 * - Per-vehicle exhaust overrun crackles, backfires, and compressor surge.
 * - Vehicle-specific gear shift transients (Hewland dog-box, DCT snap, pneumatic air brake, ion pulse).
 * - Surface friction, tire squeal, aerodynamic wind rush, horn, and Lo-Fi ambient radio.
 */

import { VehicleModelType } from '../store/useGameStore'

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

export interface VehicleAudioProfile {
  vehicleId: VehicleModelType
  name: string
  engineType: string
  transmission: string
  idleRpm: number
  redlineRpm: number
  baseRpm: {
    idle: number
    low: number
    mid: number
    high: number
    offThrottle: number
  }
  urls: {
    idle: string[]
    low_rpm: string[]
    mid_rpm: string[]
    high_rpm: string[]
    off_throttle: string[]
    gear_shift: string[]
    overrun: string[]
  }
  eqProfile: {
    subBassFreq: number
    subBassGain: number
    growlFreq: number
    growlGain: number
  }
  rawRecordingUrl?: string
  rawRecordingUrls?: string[]
  screamerUrls?: string[]
  straightCutGearWhine?: boolean
}

// Master Per-Vehicle Audio Registry
export const VEHICLE_AUDIO_REGISTRY: Record<VehicleModelType, VehicleAudioProfile> = {
  bmw_m3: {
    vehicleId: 'bmw_m3',
    name: "BMW M3 GTR '05",
    engineType: '4.0L P60B40 Naturally Aspirated 90° Racing V8',
    transmission: 'Hewland 6-Speed Sequential Dog-Box with Straight-Cut Spur Gears',
    idleRpm: 880,
    redlineRpm: 8500,
    baseRpm: { idle: 880, low: 2400, mid: 4800, high: 7400, offThrottle: 4500 },
    urls: {
      idle: [
        '/audio/cars/bmw-m3-gtr/engine_idle.wav',
        '/audio/cars/bmw-m3-gtr/idle_loop.wav',
        '/audio/cars/bmw_m3/idle.wav',
        '/sounds/engine_idle.wav',
      ],
      low_rpm: [
        '/audio/cars/bmw-m3-gtr/low_rpm_acceleration.wav',
        '/audio/cars/bmw-m3-gtr/engine_low.wav',
        '/audio/cars/bmw_m3/low_rpm.wav',
        '/sounds/engine_low.wav',
      ],
      mid_rpm: [
        '/audio/cars/bmw-m3-gtr/mid_rpm_acceleration.wav',
        '/audio/cars/bmw-m3-gtr/engine_mid.wav',
        '/audio/cars/bmw_m3/mid_rpm.wav',
        '/sounds/engine_mid.wav',
      ],
      high_rpm: [
        '/audio/cars/bmw-m3-gtr/high_rpm_acceleration.wav',
        '/audio/cars/bmw-m3-gtr/full_throttle_racing.wav',
        '/audio/cars/bmw-m3-gtr/high_rpm_loop.wav',
        '/audio/cars/bmw_m3/high_rpm.wav',
        '/sounds/engine_high.wav',
      ],
      off_throttle: [
        '/audio/cars/bmw-m3-gtr/engine_off_throttle.wav',
        '/audio/cars/bmw-m3-gtr/deceleration.wav',
        '/audio/cars/bmw-m3-gtr/engine_braking.wav',
        '/audio/cars/bmw_m3/off_throttle.wav',
        '/sounds/engine_off_throttle.wav',
      ],
      gear_shift: [
        '/audio/cars/bmw-m3-gtr/gear_shift.wav',
        '/audio/cars/bmw-m3-gtr/gear_up.wav',
        '/audio/cars/bmw-m3-gtr/gear_down.wav',
        '/audio/cars/bmw_m3/gear_shift.wav',
        '/sounds/gear_shift.wav',
      ],
      overrun: [
        '/audio/cars/bmw-m3-gtr/exhaust_overrun.wav',
        '/audio/cars/bmw-m3-gtr/exhaust_pop.wav',
        '/audio/cars/bmw_m3/overrun.wav',
        '/sounds/exhaust_pop.wav',
      ],
    },
    eqProfile: { subBassFreq: 90, subBassGain: 6.2, growlFreq: 240, growlGain: 4.5 },
    screamerUrls: [
      '/audio/m3_gtr_screaming.mp3',
      '/audio/m3_gtr_screaming.m4a',
      '/audio/cars/bmw-m3-gtr/full_throttle_racing.wav',
    ],
    rawRecordingUrls: [
      '/audio/raw/bmw_m3_gt2_2010.ogg',
      '/audio/raw/bmw_e46_engine.opus',
    ],
    straightCutGearWhine: true,
  },
  supercar: {
    vehicleId: 'supercar',
    name: 'Veloce GT Supercar',
    engineType: '5.2L Naturally Aspirated 90° Exotic V10',
    transmission: '7-Speed Dual-Clutch Transmission (DCT)',
    idleRpm: 1050,
    redlineRpm: 9000,
    baseRpm: { idle: 1050, low: 3000, mid: 5800, high: 8600, offThrottle: 5000 },
    urls: {
      idle: ['/audio/cars/supercar/idle.wav', '/sounds/engine_idle.wav'],
      low_rpm: ['/audio/cars/supercar/low_rpm.wav', '/sounds/engine_low.wav'],
      mid_rpm: ['/audio/cars/supercar/mid_rpm.wav', '/sounds/engine_mid.wav'],
      high_rpm: ['/audio/cars/supercar/high_rpm.wav', '/sounds/engine_high.wav'],
      off_throttle: ['/audio/cars/supercar/off_throttle.wav', '/sounds/engine_off_throttle.wav'],
      gear_shift: ['/audio/cars/supercar/gear_shift.wav', '/sounds/gear_shift.wav'],
      overrun: ['/audio/cars/supercar/overrun.wav', '/sounds/exhaust_pop.wav'],
    },
    eqProfile: { subBassFreq: 110, subBassGain: 4.2, growlFreq: 380, growlGain: 4.5 },
    rawRecordingUrl: '/audio/raw/v8_idle_and_revs.ogg',
    screamerUrls: ['/audio/raw/v8_idle_and_revs.ogg'],
  },
  hovercraft: {
    vehicleId: 'hovercraft',
    name: 'AeroGlide Repulsorcraft',
    engineType: 'Dual-Phase Magnetic Levitation Coil & Twin Micro-Ion Turbines',
    transmission: 'Direct Flux Modulation Drive',
    idleRpm: 450,
    redlineRpm: 12000,
    baseRpm: { idle: 450, low: 2500, mid: 6000, high: 10000, offThrottle: 5000 },
    urls: {
      idle: ['/audio/cars/hovercraft/idle.wav'],
      low_rpm: ['/audio/cars/hovercraft/low_rpm.wav'],
      mid_rpm: ['/audio/cars/hovercraft/mid_rpm.wav'],
      high_rpm: ['/audio/cars/hovercraft/high_rpm.wav'],
      off_throttle: ['/audio/cars/hovercraft/off_throttle.wav'],
      gear_shift: ['/audio/cars/hovercraft/gear_shift.wav'],
      overrun: ['/audio/cars/hovercraft/overrun.wav'],
    },
    eqProfile: { subBassFreq: 52, subBassGain: 6.2, growlFreq: 420, growlGain: 1.5 },
  },
  camper: {
    vehicleId: 'camper',
    name: 'Trailblazer Camper Van',
    engineType: '3.0L Heavy Turbo-Diesel Inline-6',
    transmission: 'Heavy-Duty 5-Speed Manual with Pneumatic Air-Assisted Linkage',
    idleRpm: 680,
    redlineRpm: 4200,
    baseRpm: { idle: 680, low: 1450, mid: 2500, high: 3800, offThrottle: 2400 },
    urls: {
      idle: ['/audio/cars/camper/idle.wav', '/sounds/engine_idle.wav'],
      low_rpm: ['/audio/cars/camper/low_rpm.wav', '/sounds/engine_low.wav'],
      mid_rpm: ['/audio/cars/camper/mid_rpm.wav', '/sounds/engine_mid.wav'],
      high_rpm: ['/audio/cars/camper/high_rpm.wav', '/sounds/engine_high.wav'],
      off_throttle: ['/audio/cars/camper/off_throttle.wav', '/sounds/engine_off_throttle.wav'],
      gear_shift: ['/audio/cars/camper/gear_shift.wav', '/sounds/gear_shift.wav'],
      overrun: ['/audio/cars/camper/overrun.wav', '/sounds/exhaust_pop.wav'],
    },
    eqProfile: { subBassFreq: 70, subBassGain: 6.8, growlFreq: 160, growlGain: 4.2 },
  },
  hatchback: {
    vehicleId: 'hatchback',
    name: 'Rallye Turbo Hatchback',
    engineType: '2.1L Turbocharged 5-Cylinder Group B Homologation Engine',
    transmission: 'Close-Ratio 5-Speed Sequential Dog-Box',
    idleRpm: 940,
    redlineRpm: 7500,
    baseRpm: { idle: 940, low: 2500, mid: 4600, high: 7200, offThrottle: 4000 },
    urls: {
      idle: ['/audio/cars/hatchback/idle.wav', '/sounds/engine_idle.wav'],
      low_rpm: ['/audio/cars/hatchback/low_rpm.wav', '/sounds/engine_low.wav'],
      mid_rpm: ['/audio/cars/hatchback/mid_rpm.wav', '/sounds/engine_mid.wav'],
      high_rpm: ['/audio/cars/hatchback/high_rpm.wav', '/sounds/engine_high.wav'],
      off_throttle: ['/audio/cars/hatchback/off_throttle.wav', '/sounds/engine_off_throttle.wav'],
      gear_shift: ['/audio/cars/hatchback/gear_shift.wav', '/sounds/gear_shift.wav'],
      overrun: ['/audio/cars/hatchback/overrun.wav', '/sounds/exhaust_pop.wav'],
    },
    eqProfile: { subBassFreq: 85, subBassGain: 4.8, growlFreq: 280, growlGain: 4.0 },
    rawRecordingUrl: '/audio/raw/audi_quattro_rally.ogg',
    screamerUrls: ['/audio/raw/audi_quattro_rally.ogg'],
  },
}

interface ActiveLoopChannel {
  source: AudioBufferSourceNode | null
  gain: GainNode | null
  state: EngineAudioState
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

  // High-Octane Aggressive Overdrive & Compression Nodes
  private overdriveNode: WaveShaperNode | null = null
  private overdriveGain: GainNode | null = null
  private engineCompressor: DynamicsCompressorNode | null = null
  private chaseStereoPanner: StereoPannerNode | null = null

  // Active Vehicle Tracking
  private currentVehicleId: VehicleModelType = 'bmw_m3'
  private isSwitchingProfile = false

  // Global AudioBuffer Cache: Decoded once and stored for fast zero-latency access
  private bufferCache: Map<string, AudioBuffer> = new Map()

  // Loop Channels for the 5 Active Engine States
  private loops: Record<EngineAudioState, ActiveLoopChannel> = {
    idle: { source: null, gain: null, state: 'idle' },
    low_rpm: { source: null, gain: null, state: 'low_rpm' },
    mid_rpm: { source: null, gain: null, state: 'mid_rpm' },
    high_rpm: { source: null, gain: null, state: 'high_rpm' },
    off_throttle: { source: null, gain: null, state: 'off_throttle' },
  }

  // Raw recording layer (optional supplemental texture)
  private rawSource: AudioBufferSourceNode | null = null
  private rawGain: GainNode | null = null

  // Dedicated High-RPM Screamer Layer (e.g. BMW M3 GTR '05 screaming race V8)
  private screamerSource: AudioBufferSourceNode | null = null
  private screamerGain: GainNode | null = null
  private screamerFilter: BiquadFilterNode | null = null

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

  // Straight-Cut Spur Transmission Whine (Hewland 6-Speed Sequential Dog-Box)
  private gearWhineOsc: OscillatorNode | null = null
  private gearWhineGain: GainNode | null = null
  private gearWhineFilter: BiquadFilterNode | null = null

  // Lo-Fi Synth Chord progressions
  private chordProgressions = [
    [[261.63, 329.63, 392.00, 493.88], [220.00, 261.63, 329.63, 392.00], [174.61, 220.00, 261.63, 329.63], [196.00, 246.94, 293.66, 349.23]],
    [[293.66, 349.23, 440.00, 523.25], [196.00, 246.94, 293.66, 349.23], [261.63, 329.63, 392.00, 493.88], [220.00, 261.63, 329.63, 392.00]],
    [[329.63, 392.00, 493.88, 587.33], [261.63, 329.63, 392.00, 493.88], [220.00, 261.63, 329.63, 392.00], [246.94, 293.66, 349.23, 440.00]],
    [[220.00, 261.63, 329.63, 392.00], [174.61, 220.00, 261.63, 329.63], [261.63, 329.63, 392.00, 523.25], [164.81, 196.00, 246.94, 293.66]],
    [[349.23, 440.00, 523.25, 659.25], [329.63, 392.00, 493.88, 587.33], [293.66, 349.23, 440.00, 523.25], [261.63, 329.63, 392.00, 493.88]],
  ]

  public get unlocked(): boolean {
    return this.isUnlocked
  }

  public get activeVehicle(): VehicleModelType {
    return this.currentVehicleId
  }

  /**
   * Initialize the Web Audio API context and assemble the master audio routing graph.
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

      // 3D Spatial Panner Node
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

      // Engine Master Sub-Bus
      this.engineMaster = ctx.createGain()
      this.engineMaster.gain.setValueAtTime(1.0, ctx.currentTime)

      // Heavy Sub-Bass Reinforcement EQ
      this.subBassEQ = ctx.createBiquadFilter()
      this.subBassEQ.type = 'lowshelf'
      this.subBassEQ.frequency.setValueAtTime(90, ctx.currentTime)
      this.subBassEQ.gain.setValueAtTime(5.8, ctx.currentTime)

      // Guttural Throat / Resonance EQ
      this.growlEQ = ctx.createBiquadFilter()
      this.growlEQ.type = 'peaking'
      this.growlEQ.frequency.setValueAtTime(230, ctx.currentTime)
      this.growlEQ.Q.setValueAtTime(1.3, ctx.currentTime)
      this.growlEQ.gain.setValueAtTime(3.6, ctx.currentTime)

      this.engineMaster.connect(this.subBassEQ)
      this.subBassEQ.connect(this.growlEQ)

      // Dynamic High-Octane Overdrive WaveShaper (Visceral Throttle Saturation)
      this.overdriveNode = ctx.createWaveShaper()
      this.overdriveNode.curve = this.makeDistortionCurve(45)
      this.overdriveNode.oversample = '4x'

      this.overdriveGain = ctx.createGain()
      this.overdriveGain.gain.setValueAtTime(0.0001, ctx.currentTime)

      // Punchy Engine Dynamics Compressor (meaner & compressed under full throttle)
      this.engineCompressor = ctx.createDynamicsCompressor()
      this.engineCompressor.threshold.setValueAtTime(-14, ctx.currentTime)
      this.engineCompressor.knee.setValueAtTime(8, ctx.currentTime)
      this.engineCompressor.ratio.setValueAtTime(5.5, ctx.currentTime)
      this.engineCompressor.attack.setValueAtTime(0.003, ctx.currentTime)
      this.engineCompressor.release.setValueAtTime(0.09, ctx.currentTime)

      // Chase Camera Stereo Drift Panner
      if (typeof ctx.createStereoPanner === 'function') {
        this.chaseStereoPanner = ctx.createStereoPanner()
        this.chaseStereoPanner.pan.setValueAtTime(0, ctx.currentTime)
      }

      // Overdrive routing: branch from growlEQ through overdriveNode and overdriveGain
      this.growlEQ.connect(this.overdriveNode)
      this.overdriveNode.connect(this.overdriveGain)

      // Both Clean Growl and Overdrive feed into the Compressor
      this.growlEQ.connect(this.engineCompressor)
      this.overdriveGain.connect(this.engineCompressor)

      // Route compressor through chase stereo panner
      if (this.chaseStereoPanner) {
        this.engineCompressor.connect(this.chaseStereoPanner)
        if (this.spatialPanner) {
          this.chaseStereoPanner.connect(this.spatialPanner)
        } else {
          this.chaseStereoPanner.connect(this.sfxMaster)
        }
      } else if (this.spatialPanner) {
        this.engineCompressor.connect(this.spatialPanner)
      } else {
        this.engineCompressor.connect(this.sfxMaster)
      }

      // Dynamic Manifold Combustion Roar Filter on On-Load Bus
      this.onLoadFilter = ctx.createBiquadFilter()
      this.onLoadFilter.type = 'lowpass'
      this.onLoadFilter.frequency.setValueAtTime(4500, ctx.currentTime)
      this.onLoadFilter.Q.setValueAtTime(0.7, ctx.currentTime)
      this.onLoadFilter.connect(this.engineMaster)

      // On-Load Acceleration Bus
      this.onLoadBus = ctx.createGain()
      this.onLoadBus.gain.setValueAtTime(0.0001, ctx.currentTime)
      this.onLoadBus.connect(this.onLoadFilter)

      // Off-Throttle Deceleration Bus (Engine Braking)
      this.offLoadBus = ctx.createGain()
      this.offLoadBus.gain.setValueAtTime(0.0001, ctx.currentTime)
      this.offLoadBus.connect(this.engineMaster)

      // Straight-Cut Spur Transmission Whine (Hewland 6-Speed Sequential Dog-Box)
      this.gearWhineOsc = ctx.createOscillator()
      this.gearWhineOsc.type = 'triangle'
      this.gearWhineOsc.frequency.setValueAtTime(220, ctx.currentTime)

      this.gearWhineFilter = ctx.createBiquadFilter()
      this.gearWhineFilter.type = 'bandpass'
      this.gearWhineFilter.frequency.setValueAtTime(1200, ctx.currentTime)
      this.gearWhineFilter.Q.setValueAtTime(3.8, ctx.currentTime)

      this.gearWhineGain = ctx.createGain()
      this.gearWhineGain.gain.setValueAtTime(0.0001, ctx.currentTime)

      this.gearWhineOsc.connect(this.gearWhineFilter)
      this.gearWhineFilter.connect(this.gearWhineGain)
      this.gearWhineGain.connect(this.engineCompressor)

      try {
        this.gearWhineOsc.start(0)
      } catch {}

      // Initialize environmental noise generators (friction, wind, tire squeal)
      this.initEnvironmentalSFX(ctx)

      this.isInitialized = true
      this.isUnlocked = ctx.state === 'running'

      // Preload current vehicle audio assets and spin up loops
      await this.preloadVehicleProfile(this.currentVehicleId)
      this.mountVehicleLoopNodes(this.currentVehicleId)
    } catch (err) {
      console.warn('[VehicleAudioEngine] Initialization warning:', err)
    }
  }

  /**
   * Resumes the AudioContext upon user gesture
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
   * Fetch and decode an audio buffer across primary and fallback URLs, caching in memory
   */
  private async fetchAndDecode(urls: string[]): Promise<AudioBuffer | null> {
    if (!this.ctx) return null
    for (const url of urls) {
      if (this.bufferCache.has(url)) {
        return this.bufferCache.get(url)!
      }
      try {
        const response = await fetch(url)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          const decoded = await this.ctx.decodeAudioData(arrayBuffer)
          this.bufferCache.set(url, decoded)
          return decoded
        }
      } catch {
        // Continue to fallback path
      }
    }
    return null
  }

  /**
   * Preload all audio assets for a specific vehicle profile
   */
  public async preloadVehicleProfile(vehicleId: VehicleModelType): Promise<void> {
    const profile = VEHICLE_AUDIO_REGISTRY[vehicleId] || VEHICLE_AUDIO_REGISTRY.bmw_m3
    const states: EngineAudioState[] = ['idle', 'low_rpm', 'mid_rpm', 'high_rpm', 'off_throttle']

    const statePromises = states.map((st) => this.fetchAndDecode(profile.urls[st]))
    const transientPromises = [
      this.fetchAndDecode(profile.urls.gear_shift),
      this.fetchAndDecode(profile.urls.overrun),
    ]

    const rawUrls = profile.rawRecordingUrls || (profile.rawRecordingUrl ? [profile.rawRecordingUrl] : [])
    if (rawUrls.length > 0) {
      transientPromises.push(this.fetchAndDecode(rawUrls))
    }

    const screamerUrls = profile.screamerUrls || []
    if (screamerUrls.length > 0) {
      transientPromises.push(this.fetchAndDecode(screamerUrls))
    }

    await Promise.all([...statePromises, ...transientPromises])
  }

  /**
   * Mounts new AudioBufferSourceNodes for the specified vehicle.
   * Note: AudioBufferSourceNodes are one-shot objects in the Web Audio API;
   * each profile mount creates fresh source nodes referencing cached buffers.
   */
  private mountVehicleLoopNodes(vehicleId: VehicleModelType): void {
    if (!this.ctx || !this.engineMaster || !this.onLoadBus || !this.offLoadBus) return
    const ctx = this.ctx
    const profile = VEHICLE_AUDIO_REGISTRY[vehicleId] || VEHICLE_AUDIO_REGISTRY.bmw_m3
    const states: EngineAudioState[] = ['idle', 'low_rpm', 'mid_rpm', 'high_rpm', 'off_throttle']

    // Update EQ for vehicle character
    if (this.subBassEQ) {
      this.subBassEQ.frequency.setTargetAtTime(profile.eqProfile.subBassFreq, ctx.currentTime, 0.05)
      this.subBassEQ.gain.setTargetAtTime(profile.eqProfile.subBassGain, ctx.currentTime, 0.05)
    }
    if (this.growlEQ) {
      this.growlEQ.frequency.setTargetAtTime(profile.eqProfile.growlFreq, ctx.currentTime, 0.05)
      this.growlEQ.gain.setTargetAtTime(profile.eqProfile.growlGain, ctx.currentTime, 0.05)
    }

    states.forEach((state) => {
      const channel = this.loops[state]
      const urls = profile.urls[state]
      let buffer: AudioBuffer | null = null
      for (const u of urls) {
        if (this.bufferCache.has(u)) {
          buffer = this.bufferCache.get(u)!
          break
        }
      }

      if (!buffer) return

      // Create dedicated GainNode for RPM crossfading
      const gainNode = ctx.createGain()
      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime)

      if (state === 'idle') {
        gainNode.connect(this.engineMaster!)
      } else if (state === 'off_throttle') {
        gainNode.connect(this.offLoadBus!)
      } else {
        gainNode.connect(this.onLoadBus!)
      }

      channel.gain = gainNode

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      source.playbackRate.setValueAtTime(1.0, ctx.currentTime)
      source.connect(gainNode)

      try {
        source.start(0)
      } catch (err) {
        console.warn(`[VehicleAudioEngine] Loop start error for ${state}:`, err)
      }

      channel.source = source
    })

    // Mount supplemental raw recording layer if present
    const rawUrls = profile.rawRecordingUrls || (profile.rawRecordingUrl ? [profile.rawRecordingUrl] : [])
    let rawBuf: AudioBuffer | null = null
    for (const u of rawUrls) {
      if (this.bufferCache.has(u)) {
        rawBuf = this.bufferCache.get(u)!
        break
      }
    }

    if (rawBuf) {
      const rGain = ctx.createGain()
      rGain.gain.setValueAtTime(0.0001, ctx.currentTime)
      rGain.connect(this.engineMaster)

      const rSrc = ctx.createBufferSource()
      rSrc.buffer = rawBuf
      rSrc.loop = true
      rSrc.connect(rGain)
      try {
        rSrc.start(0)
      } catch {}

      this.rawSource = rSrc
      this.rawGain = rGain
    }

    // Mount Dedicated High-RPM Screamer Layer (e.g. BMW M3 GTR '05 screaming race V8)
    const screamerUrls = profile.screamerUrls || []
    let screamerBuf: AudioBuffer | null = null
    for (const u of screamerUrls) {
      if (this.bufferCache.has(u)) {
        screamerBuf = this.bufferCache.get(u)!
        break
      }
    }

    if (screamerBuf) {
      const sGain = ctx.createGain()
      sGain.gain.setValueAtTime(0.0001, ctx.currentTime)

      const sFilter = ctx.createBiquadFilter()
      sFilter.type = 'peaking'
      sFilter.frequency.setValueAtTime(3200, ctx.currentTime)
      sFilter.Q.setValueAtTime(1.8, ctx.currentTime)
      sFilter.gain.setValueAtTime(4.5, ctx.currentTime)

      sFilter.connect(sGain)
      sGain.connect(this.engineCompressor || this.engineMaster)

      const sSrc = ctx.createBufferSource()
      sSrc.buffer = screamerBuf
      sSrc.loop = true
      sSrc.connect(sFilter)
      try {
        sSrc.start(0)
      } catch {}

      this.screamerSource = sSrc
      this.screamerGain = sGain
      this.screamerFilter = sFilter
    }
  }

  /**
   * Dismounts and stops all active source nodes for the current vehicle.
   */
  private dismountVehicleLoopNodes(): void {
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

    if (this.rawSource) {
      try {
        this.rawSource.stop()
        this.rawSource.disconnect()
      } catch {}
      this.rawSource = null
    }
    if (this.rawGain) {
      try {
        this.rawGain.disconnect()
      } catch {}
      this.rawGain = null
    }

    if (this.screamerSource) {
      try {
        this.screamerSource.stop()
        this.screamerSource.disconnect()
      } catch {}
      this.screamerSource = null
    }
    if (this.screamerGain) {
      try {
        this.screamerGain.disconnect()
      } catch {}
      this.screamerGain = null
    }
    if (this.screamerFilter) {
      try {
        this.screamerFilter.disconnect()
      } catch {}
      this.screamerFilter = null
    }
  }

  /**
   * Smoothly crossfades between different vehicle audio profiles.
   */
  public async switchVehicleProfile(newVehicleId: VehicleModelType): Promise<void> {
    if (this.currentVehicleId === newVehicleId || this.isSwitchingProfile) return
    this.isSwitchingProfile = true

    if (!this.ctx || !this.isInitialized) {
      this.currentVehicleId = newVehicleId
      this.isSwitchingProfile = false
      return
    }

    const now = this.ctx.currentTime

    // 1. Fade out current engine master bus smoothly over 100ms
    if (this.engineMaster) {
      this.engineMaster.gain.setTargetAtTime(0.0001, now, 0.035)
    }

    // 2. Preload assets for new vehicle
    await this.preloadVehicleProfile(newVehicleId)

    // 3. Dismount obsolete single-use sources
    this.dismountVehicleLoopNodes()

    // 4. Update current profile ID and mount new sources
    this.currentVehicleId = newVehicleId
    this.mountVehicleLoopNodes(newVehicleId)

    // 5. Fade in new engine master bus smoothly
    const afterTime = this.ctx.currentTime
    if (this.engineMaster) {
      this.engineMaster.gain.setValueAtTime(0.0001, afterTime)
      this.engineMaster.gain.setTargetAtTime(1.0, afterTime + 0.02, 0.045)
    }

    this.isSwitchingProfile = false
  }

  /**
   * Primary frame update function: maps vehicle telemetry to the active vehicle's profile.
   */
  public updateEngineSound(rpm: number, throttle: number | boolean, speed = 0): void {
    if (!this.ctx || !this.isInitialized) return
    const now = this.ctx.currentTime
    const profile = VEHICLE_AUDIO_REGISTRY[this.currentVehicleId] || VEHICLE_AUDIO_REGISTRY.bmw_m3

    // Normalize inputs
    const curRpm = Math.max(profile.idleRpm * 0.8, Math.min(profile.redlineRpm * 1.1, rpm))
    const throttleVal = typeof throttle === 'boolean' ? (throttle ? 1.0 : 0.0) : Math.max(0, Math.min(1, throttle))
    const isPressed = throttleVal > 0.05
    const speedKmh = Math.max(0, speed)

    // Detect rapid throttle lift for overrun crackles
    const throttleDelta = this.prevThrottle - throttleVal
    if (throttleDelta > 0.35 && curRpm > profile.baseRpm.mid * 0.9) {
      this.triggerExhaustPop(Math.min(1.0, 0.6 + (curRpm - profile.baseRpm.mid) / 3500))
    }
    this.prevThrottle = throttleVal

    // ------------------------------------------------------------------------
    // Dynamic Pitch Mapping (playbackRate = currentRPM / baseSampleRPM)
    // ------------------------------------------------------------------------
    const states: EngineAudioState[] = ['idle', 'low_rpm', 'mid_rpm', 'high_rpm', 'off_throttle']

    states.forEach((state) => {
      const channel = this.loops[state]
      if (channel.source) {
        const base = profile.baseRpm[state === 'low_rpm' ? 'low' : state === 'mid_rpm' ? 'mid' : state === 'high_rpm' ? 'high' : state === 'off_throttle' ? 'offThrottle' : 'idle']
        const rawPitch = curRpm / base
        // Constrain pitch range between 0.72 and 1.45 to eliminate tape-stretch chipmunk artifacts
        const clampedPitch = Math.min(1.45, Math.max(0.72, rawPitch))
        channel.source.playbackRate.setTargetAtTime(clampedPitch, now, 0.045)
      }
    })

    // ------------------------------------------------------------------------
    // Dynamic Equal-Power Crossfading (Sinusoidal Conservation)
    // ------------------------------------------------------------------------
    let gainIdle = 0
    let gainLow = 0
    let gainMid = 0
    let gainHigh = 0

    const rIdle = profile.baseRpm.idle
    const rLow = profile.baseRpm.low
    const rMid = profile.baseRpm.mid
    const rHigh = profile.baseRpm.high

    if (curRpm <= rIdle * 1.1) {
      gainIdle = 1.0
      gainLow = 0.0
    } else if (curRpm < rLow) {
      const t = (curRpm - rIdle * 1.1) / (rLow - rIdle * 1.1)
      gainIdle = Math.cos(t * Math.PI * 0.5)
      gainLow = Math.sin(t * Math.PI * 0.5)
    } else if (curRpm < rMid) {
      const t = (curRpm - rLow) / (rMid - rLow)
      gainLow = Math.cos(t * Math.PI * 0.5)
      gainMid = Math.sin(t * Math.PI * 0.5)
    } else if (curRpm < rHigh) {
      const t = (curRpm - rMid) / (rHigh - rMid)
      gainMid = Math.cos(t * Math.PI * 0.5)
      gainHigh = Math.sin(t * Math.PI * 0.5)
    } else {
      gainHigh = 1.0
    }

    const midLoadBoost = 1.0 + throttleVal * 0.35
    const highLoadBoost = 1.0 + throttleVal * 0.45
    const timeConstant = 0.045

    this.loops.idle.gain?.gain.setTargetAtTime(gainIdle * (1 - throttleVal * 0.65), now, timeConstant)
    this.loops.low_rpm.gain?.gain.setTargetAtTime(gainLow, now, timeConstant)
    this.loops.mid_rpm.gain?.gain.setTargetAtTime(gainMid * midLoadBoost, now, timeConstant)
    this.loops.high_rpm.gain?.gain.setTargetAtTime(gainHigh * highLoadBoost, now, timeConstant)

    // Dynamic Load Filter
    if (this.onLoadFilter) {
      const targetFilterFreq = isPressed
        ? 4500 + throttleVal * 12500 + (curRpm / profile.redlineRpm) * 3000
        : 2800
      this.onLoadFilter.frequency.setTargetAtTime(Math.min(20000, targetFilterFreq), now, timeConstant)
    }

    // Dynamic Sub-Bass & Manifold Growl Swell
    if (this.subBassEQ) {
      const targetBass = profile.eqProfile.subBassGain + throttleVal * 3.5
      this.subBassEQ.gain.setTargetAtTime(targetBass, now, timeConstant)
    }
    if (this.growlEQ) {
      const targetGrowl = profile.eqProfile.growlGain + throttleVal * 3.2
      this.growlEQ.gain.setTargetAtTime(targetGrowl, now, timeConstant)
    }

    // High-Octane Aggressive Overdrive & Dynamic Compression
    if (this.overdriveGain && this.engineCompressor) {
      // Direct high-frequency saturation: meaner growl and distortion when pinned
      const driveGain = Math.pow(throttleVal, 1.5) * 0.45
      this.overdriveGain.gain.setTargetAtTime(driveGain, now, timeConstant)

      // Dynamic compression: punchier, tighter, more compressed engine roar under load
      const compThreshold = -12 - throttleVal * 12 // -12dB at idle to -24dB at full throttle
      this.engineCompressor.threshold.setTargetAtTime(compThreshold, now, timeConstant)
      this.engineCompressor.ratio.setTargetAtTime(4.0 + throttleVal * 4.0, now, timeConstant)
    }

    // Supplemental Raw Texture Layer (Real GT2 V8 / Rally Quattro / V10 recordings)
    if (this.rawGain && this.rawSource) {
      const normRpm = Math.max(0, Math.min(1, (curRpm - profile.idleRpm) / (profile.redlineRpm - profile.idleRpm)))
      const recPitch = 0.82 + normRpm * 0.68
      this.rawSource.playbackRate.setTargetAtTime(recPitch, now, 0.045)
      const targetRecGain = (0.35 + throttleVal * 0.65) * Math.min(1.0, 0.4 + normRpm * 0.7)
      this.rawGain.gain.setTargetAtTime(targetRecGain, now, 0.045)
    }

    // Dedicated High-RPM Screamer Layer (Authentic High-RPM Racing Scream for BMW M3 GTR '05)
    if (this.screamerGain && this.screamerSource) {
      if (curRpm > 4400 && throttleVal > 0.05) {
        const screamerNorm = Math.min(1.0, Math.max(0, (curRpm - 4400) / (profile.redlineRpm - 4400)))
        const screamerPitch = 0.90 + screamerNorm * 0.45
        this.screamerSource.playbackRate.setTargetAtTime(screamerPitch, now, 0.045)

        const screamerVolume = Math.pow(screamerNorm, 1.25) * Math.pow(throttleVal, 1.1) * 0.95
        this.screamerGain.gain.setTargetAtTime(screamerVolume, now, 0.045)
      } else {
        this.screamerGain.gain.setTargetAtTime(0.0001, now, 0.045)
      }
    }

    // Hewland Straight-Cut Spur Transmission Whine for BMW M3 GTR
    if (this.gearWhineGain && this.gearWhineOsc && this.gearWhineFilter) {
      if (profile.straightCutGearWhine && speedKmh > 3) {
        const whineFreq = Math.min(6500, 220 + speedKmh * 18.2)
        this.gearWhineOsc.frequency.setTargetAtTime(whineFreq, now, timeConstant)
        this.gearWhineFilter.frequency.setTargetAtTime(whineFreq, now, timeConstant)

        const speedFactor = Math.min(1.0, speedKmh / 140)
        const loadFactor = isPressed ? 0.14 + throttleVal * 0.12 : 0.075
        const targetWhineGain = speedFactor * loadFactor * 0.45
        this.gearWhineGain.gain.setTargetAtTime(targetWhineGain, now, timeConstant)
      } else {
        this.gearWhineGain.gain.setTargetAtTime(0.0001, now, timeConstant)
      }
    }

    // ------------------------------------------------------------------------
    // Load vs. Coasting (Throttle State)
    // ------------------------------------------------------------------------
    if (this.onLoadBus && this.offLoadBus) {
      if (isPressed) {
        const targetOnLoad = 0.45 + throttleVal * 0.75
        this.onLoadBus.gain.setTargetAtTime(targetOnLoad, now, timeConstant)
        this.offLoadBus.gain.setTargetAtTime(0.0001, now, timeConstant)
      } else {
        this.onLoadBus.gain.setTargetAtTime(0.08, now, 0.06)

        if (speedKmh > 5 && curRpm > profile.baseRpm.idle * 1.4) {
          const offThrottleIntensity = Math.min(
            1.0,
            ((curRpm - profile.baseRpm.idle * 1.4) / (profile.baseRpm.mid - profile.baseRpm.idle)) * Math.min(1.0, speedKmh / 20)
          )
          this.offLoadBus.gain.setTargetAtTime(offThrottleIntensity * 0.90, now, timeConstant)
          this.loops.off_throttle.gain?.gain.setTargetAtTime(1.0, now, timeConstant)
        } else {
          this.offLoadBus.gain.setTargetAtTime(0.0001, now, timeConstant)
        }
      }
    }
  }

  public update(rpm: number, throttle: number | boolean, speed = 0): void {
    this.updateEngineSound(rpm, throttle, speed)
  }

  /**
   * 3D Spatial Audio Integration
   */
  public updateSpatialPosition(
    carPos: { x: number; y: number; z: number },
    camPos: { x: number; y: number; z: number },
    camForward?: { x: number; y: number; z: number }
  ): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const listener = this.ctx.listener

    if (listener.positionX) {
      listener.positionX.setTargetAtTime(camPos.x, now, 0.04)
      listener.positionY.setTargetAtTime(camPos.y, now, 0.04)
      listener.positionZ.setTargetAtTime(camPos.z, now, 0.04)
    } else {
      listener.setPosition(camPos.x, camPos.y, camPos.z)
    }

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
   * tire lateral slip squeal, road friction, aerodynamics, and dynamic vehicle switching.
   */
  public updateVehicleAudio(params: {
    speedKmh: number
    rpm: number
    throttle: number
    isOffRoad?: boolean
    isHoverMode?: boolean
    vehicleModel?: VehicleModelType
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

    // Dynamic vehicle switching check
    if (vehicleModel !== this.currentVehicleId) {
      this.switchVehicleProfile(vehicleModel)
    }

    // 1. Hover mode: Mute combustion audio and engage ion repulsor hum
    if (isHoverMode) {
      this.engineMaster?.gain.setTargetAtTime(0.0001, now, 0.06)

      if (this.hoverGain && this.hoverOsc) {
        const hoverTarget = 0.16 + Math.min(0.18, (speedKmh / 180) * 0.14)
        this.hoverGain.gain.setTargetAtTime(hoverTarget, now, 0.08)
        const hoverFreq = 160 + (speedKmh / 200) * 95 + throttle * 55
        this.hoverOsc.frequency.setTargetAtTime(hoverFreq, now, 0.05)
      }
      return
    }

    // 2. Combustion Mode Active
    this.hoverGain?.gain.setTargetAtTime(0.0001, now, 0.06)
    this.engineMaster?.gain.setTargetAtTime(1.0, now, 0.05)
    this.updateEngineSound(rpm, throttle, speedKmh)

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

    // 5. Aerodynamic High-Speed Wind Rush mapped directly to vehicle speed
    if (this.windRushGain && this.windRushFilter) {
      const speedNorm = Math.min(1.2, speedKmh / 240)
      const targetWindGain = Math.pow(speedNorm, 1.4) * 0.38
      this.windRushGain.gain.setTargetAtTime(Math.max(0.0001, targetWindGain), now, 0.05)
      const windFreq = 280 + speedNorm * 1500
      this.windRushFilter.frequency.setTargetAtTime(windFreq, now, 0.05)
    }

    // 6. Chase Camera Stereo Drift Panning: shifts slightly as car drifts left or right
    if (this.chaseStereoPanner) {
      const panFactor = Math.max(-0.35, Math.min(0.35, -lateralSlip * 0.35))
      this.chaseStereoPanner.pan.setTargetAtTime(panFactor, now, 0.05)
    }

    // 7. High-RPM Lift-Off Detection: rapid array of exhaust crackles & backfires
    if (this.prevThrottle > 0.45 && throttle < 0.12 && rpm > 5000 && !isHoverMode) {
      const crackleCount = Math.floor(Math.random() * 3) + 3 // 3 to 5 rapid crackles
      this.triggerOverrunCrackles(crackleCount, Math.min(1.0, rpm / 7000))
    }
    this.prevThrottle = throttle
  }

  /**
   * Generates a non-linear distortion curve for high-frequency saturation / overdrive
   */
  private makeDistortionCurve(k = 40, n_samples = 44100): Float32Array<ArrayBuffer> {
    const buffer = new ArrayBuffer(n_samples * 4)
    const curve = new Float32Array(buffer)
    const deg = Math.PI / 180
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
    }
    return curve
  }

  /**
   * Triggers a randomized array of rapid exhaust crackles and backfires on high-RPM lift-off
   */
  public triggerOverrunCrackles(count = 4, intensity = 1.0): void {
    if (!this.ctx || !this.sfxMaster) return
    const numPops = Math.max(2, Math.min(6, count))
    for (let i = 0; i < numPops; i++) {
      const delayMs = i * (45 + Math.random() * 45) + Math.random() * 20
      window.setTimeout(() => {
        this.triggerExhaustPop(intensity * (0.8 + Math.random() * 0.45))
      }, delayMs)
    }
  }

  /**
   * Triggers vehicle-specific exhaust overrun / pop / crackle
   */
  public triggerExhaustPop(intensity = 1.0): void {
    if (!this.ctx || !this.sfxMaster) return
    const now = this.ctx.currentTime
    if (now - this.lastExhaustPopTime < 0.08) return
    this.lastExhaustPopTime = now

    const profile = VEHICLE_AUDIO_REGISTRY[this.currentVehicleId] || VEHICLE_AUDIO_REGISTRY.bmw_m3
    let buffer: AudioBuffer | null = null
    for (const u of profile.urls.overrun) {
      if (this.bufferCache.has(u)) {
        buffer = this.bufferCache.get(u)!
        break
      }
    }

    if (buffer) {
      const source = this.ctx.createBufferSource()
      source.buffer = buffer
      source.playbackRate.value = 0.94 + Math.random() * 0.14
      const gain = this.ctx.createGain()
      gain.gain.setValueAtTime(0.72 * intensity, now)
      source.connect(gain)
      gain.connect(this.sfxMaster)
      source.start(now)
    }
  }

  /**
   * Triggers vehicle-specific transmission shift cut and explosive pop transient
   */
  public triggerGearShift(vehicleModel: VehicleModelType = 'bmw_m3', isDownshift = false): void {
    if (!this.ctx || !this.sfxMaster) return
    const now = this.ctx.currentTime
    const profile = VEHICLE_AUDIO_REGISTRY[vehicleModel] || VEHICLE_AUDIO_REGISTRY.bmw_m3

    // Ignition cut: momentarily duck on-load acceleration volume
    if (this.onLoadBus && vehicleModel !== 'camper') {
      this.onLoadBus.gain.setValueAtTime(0.04, now)
      this.onLoadBus.gain.setTargetAtTime(0.85, now + 0.05, 0.045)
    }

    // Explosive ignition backfire / shift pop transient (sharp sub-bass crack)
    try {
      const popOsc = this.ctx.createOscillator()
      popOsc.type = 'triangle'
      popOsc.frequency.setValueAtTime(140, now)
      popOsc.frequency.exponentialRampToValueAtTime(35, now + 0.065)

      const popGain = this.ctx.createGain()
      popGain.gain.setValueAtTime(0.85, now)
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

      popOsc.connect(popGain)
      popGain.connect(this.sfxMaster)
      popOsc.start(now)
      popOsc.stop(now + 0.085)
    } catch {
      // Audio transient fallback
    }

    let shiftBuffer: AudioBuffer | null = null
    for (const u of profile.urls.gear_shift) {
      if (this.bufferCache.has(u)) {
        shiftBuffer = this.bufferCache.get(u)!
        break
      }
    }

    if (shiftBuffer) {
      const source = this.ctx.createBufferSource()
      source.buffer = shiftBuffer
      source.playbackRate.value = isDownshift ? 1.08 : 0.96 + Math.random() * 0.06
      const gain = this.ctx.createGain()
      gain.gain.setValueAtTime(0.85, now)
      source.connect(gain)
      gain.connect(this.sfxMaster)
      source.start(now)
    }

    // Accompanying explosive exhaust pop on shift
    if (vehicleModel !== 'hovercraft') {
      this.triggerExhaustPop(isDownshift ? 0.95 : 0.75)
    }
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

  /**
   * Stops loop nodes and closes the audio graph to prevent memory leaks in useEffect.
   */
  public cleanup(): void {
    this.dismountVehicleLoopNodes()

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

    if (this.gearWhineOsc) {
      try {
        this.gearWhineOsc.stop()
        this.gearWhineOsc.disconnect()
      } catch {}
      this.gearWhineOsc = null
    }
    if (this.gearWhineGain) {
      try {
        this.gearWhineGain.disconnect()
      } catch {}
      this.gearWhineGain = null
    }
    if (this.gearWhineFilter) {
      try {
        this.gearWhineFilter.disconnect()
      } catch {}
      this.gearWhineFilter = null
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
