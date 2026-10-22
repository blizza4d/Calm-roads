// Complete Audio Ecosystem
// Features: Authentic Screaming BMW M3 GTR Audio, Throaty V8 Exhaust Roar,
// Overrun Exhaust Crackles & Pops, Turbo Spool & BOV for Hatchback,
// Air-cooled Flat-4 Chug for Camper, Antigravity Repulsor Reactor,
// Surface Friction (Asphalt vs Off-Road), and Lo-Fi Ambient Radio.

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

class AudioEcosystem {
  private ctx: AudioContext | null = null
  private isUnlocked = false

  // Master Channels
  private musicGain: GainNode | null = null
  private sfxMaster: GainNode | null = null
  private musicTimer: number | null = null
  private isMusicPlaying = false
  private currentTrack = 0
  private musicVolume = 0.65
  private sfxMasterVolume = 0.62

  // 1. Authentic Screaming BMW M3 GTR (P60B40 Straight-Cut Whine Sample)
  private m3Buffer: AudioBuffer | null = null
  private m3Source: AudioBufferSourceNode | null = null
  private m3Gain: GainNode | null = null
  private m3Filter: BiquadFilterNode | null = null
  private m3Loading = false
  private m3Loaded = false

  // 2. BMW M3 Throaty Exhaust Roar Channel (Low-end V8 rumble & roar)
  private exhaustRoarGain: GainNode | null = null
  private exhaustFilter: BiquadFilterNode | null = null
  private exhaustOsc1: OscillatorNode | null = null
  private exhaustOsc2: OscillatorNode | null = null
  private exhaustSubOsc: OscillatorNode | null = null
  private lastDecelPopTime = 0
  private prevThrottleVal = 0

  // 3. General Engine Synthesis (Camper Flat-4, Rally Hatchback, Fallback)
  private engineGain: GainNode | null = null
  private engineOsc1: OscillatorNode | null = null
  private engineOsc2: OscillatorNode | null = null
  private engineFilter: BiquadFilterNode | null = null

  // 4. Turbocharger Spool & Blow-Off Valve (Hatchback)
  private turboGain: GainNode | null = null
  private turboOsc: OscillatorNode | null = null
  private lastBovTime = 0

  // 5. Surface Friction SFX
  private frictionGain: GainNode | null = null
  private frictionFilter: BiquadFilterNode | null = null

  // 5.1 Lateral Slip Tire Squeal SFX
  private tireSquealGain: GainNode | null = null
  private tireSquealFilter: BiquadFilterNode | null = null

  // 5.2 Aerodynamic High-Speed Wind Rush SFX
  private windRushGain: GainNode | null = null
  private windRushFilter: BiquadFilterNode | null = null

  // 6. Hover Repulsor SFX
  private hoverGain: GainNode | null = null
  private hoverOsc: OscillatorNode | null = null

  // 7. Weather Ambience SFX
  private weatherGain: GainNode | null = null

  // Lo-Fi Chord progressions
  private chordProgressions = [
    // Track 0
    [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23], // G7
    ],
    // Track 1
    [
      [293.66, 349.23, 440.00, 523.25], // Dm7
      [196.00, 246.94, 293.66, 349.23], // G7
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
    ],
    // Track 2
    [
      [329.63, 392.00, 493.88, 587.33], // Em7
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [246.94, 293.66, 349.23, 440.00], // Bm7
    ],
    // Track 3
    [
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [261.63, 329.63, 392.00, 523.25], // Cmaj7
      [164.81, 196.00, 246.94, 293.66], // Em7
    ],
    // Track 4
    [
      [349.23, 440.00, 523.25, 659.25], // Fmaj7
      [329.63, 392.00, 493.88, 587.33], // Em7
      [293.66, 349.23, 440.00, 523.25], // Dm7
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
    ],
  ]

  public init() {
    if (this.ctx) return
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new AudioCtx()

    // Master Music Channel
    this.musicGain = this.ctx.createGain()
    this.musicGain.gain.value = this.musicVolume
    this.musicGain.connect(this.ctx.destination)

    // Master SFX Channel
    this.sfxMaster = this.ctx.createGain()
    this.sfxMaster.gain.value = this.sfxMasterVolume
    this.sfxMaster.connect(this.ctx.destination)

    // Load authentic screaming M3 GTR audio sample (P60B40 V8 + straight-cut gear whine)
    this.loadM3Sample()

    // 1. Throaty V8 Exhaust Roar Channel (BMW M3 GTR)
    this.exhaustRoarGain = this.ctx.createGain()
    this.exhaustRoarGain.gain.value = 0.0001
    this.exhaustFilter = this.ctx.createBiquadFilter()
    this.exhaustFilter.type = 'lowpass'
    this.exhaustFilter.frequency.value = 350
    this.exhaustFilter.Q.value = 2.2

    this.exhaustOsc1 = this.ctx.createOscillator()
    this.exhaustOsc1.type = 'sawtooth'
    this.exhaustOsc1.frequency.value = 42

    this.exhaustOsc2 = this.ctx.createOscillator()
    this.exhaustOsc2.type = 'triangle'
    this.exhaustOsc2.frequency.value = 84

    this.exhaustSubOsc = this.ctx.createOscillator()
    this.exhaustSubOsc.type = 'sine'
    this.exhaustSubOsc.frequency.value = 32

    this.exhaustOsc1.connect(this.exhaustFilter)
    this.exhaustOsc2.connect(this.exhaustFilter)
    this.exhaustSubOsc.connect(this.exhaustFilter)
    this.exhaustFilter.connect(this.exhaustRoarGain)
    this.exhaustRoarGain.connect(this.sfxMaster)

    this.exhaustOsc1.start()
    this.exhaustOsc2.start()
    this.exhaustSubOsc.start()

    // 2. Procedural Engine Channel (Camper, Hatchback, Hovercraft)
    this.engineGain = this.ctx.createGain()
    this.engineGain.gain.value = 0.06
    this.engineFilter = this.ctx.createBiquadFilter()
    this.engineFilter.type = 'lowpass'
    this.engineFilter.frequency.value = 380

    this.engineOsc1 = this.ctx.createOscillator()
    this.engineOsc1.type = 'triangle'
    this.engineOsc1.frequency.value = 52

    this.engineOsc2 = this.ctx.createOscillator()
    this.engineOsc2.type = 'sawtooth'
    this.engineOsc2.frequency.value = 104

    this.engineOsc1.connect(this.engineFilter)
    this.engineOsc2.connect(this.engineFilter)
    this.engineFilter.connect(this.engineGain)
    this.engineGain.connect(this.sfxMaster)

    this.engineOsc1.start()
    this.engineOsc2.start()

    // 3. Turbo Whine Channel (Rally Hatchback)
    this.turboGain = this.ctx.createGain()
    this.turboGain.gain.value = 0.0001
    this.turboOsc = this.ctx.createOscillator()
    this.turboOsc.type = 'sine'
    this.turboOsc.frequency.value = 950
    this.turboOsc.connect(this.turboGain)
    this.turboGain.connect(this.sfxMaster)
    this.turboOsc.start()

    // 4. Surface Friction Noise + Tire Squeal + Aerodynamic Wind Rush
    try {
      const bufferSize = this.ctx.sampleRate * 2
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }

      // A. Road surface friction
      const noiseSource = this.ctx.createBufferSource()
      noiseSource.buffer = noiseBuffer
      noiseSource.loop = true

      this.frictionFilter = this.ctx.createBiquadFilter()
      this.frictionFilter.type = 'bandpass'
      this.frictionFilter.frequency.value = 800
      this.frictionFilter.Q.value = 1.0

      this.frictionGain = this.ctx.createGain()
      this.frictionGain.gain.value = 0.0

      noiseSource.connect(this.frictionFilter)
      this.frictionFilter.connect(this.frictionGain)
      this.frictionGain.connect(this.sfxMaster)
      noiseSource.start()

      // B. Lateral slip tire squeal (drifting & high-G cornering)
      const squealSource = this.ctx.createBufferSource()
      squealSource.buffer = noiseBuffer
      squealSource.loop = true

      this.tireSquealFilter = this.ctx.createBiquadFilter()
      this.tireSquealFilter.type = 'bandpass'
      this.tireSquealFilter.frequency.value = 1100
      this.tireSquealFilter.Q.value = 4.2

      this.tireSquealGain = this.ctx.createGain()
      this.tireSquealGain.gain.value = 0.0001

      squealSource.connect(this.tireSquealFilter)
      this.tireSquealFilter.connect(this.tireSquealGain)
      this.tireSquealGain.connect(this.sfxMaster)
      squealSource.start()

      // C. Aerodynamic high-speed wind rush
      const windSource = this.ctx.createBufferSource()
      windSource.buffer = noiseBuffer
      windSource.loop = true

      this.windRushFilter = this.ctx.createBiquadFilter()
      this.windRushFilter.type = 'lowpass'
      this.windRushFilter.frequency.value = 420

      this.windRushGain = this.ctx.createGain()
      this.windRushGain.gain.value = 0.0001

      windSource.connect(this.windRushFilter)
      this.windRushFilter.connect(this.windRushGain)
      this.windRushGain.connect(this.sfxMaster)
      windSource.start()
    } catch {}

    // 5. Hover Repulsor Hum (Sine + Frequency modulation)
    this.hoverGain = this.ctx.createGain()
    this.hoverGain.gain.value = 0.0
    this.hoverOsc = this.ctx.createOscillator()
    this.hoverOsc.type = 'sine'
    this.hoverOsc.frequency.value = 180

    this.hoverOsc.connect(this.hoverGain)
    this.hoverGain.connect(this.sfxMaster)
    this.hoverOsc.start()

    // 6. Weather Ambience
    this.weatherGain = this.ctx.createGain()
    this.weatherGain.gain.value = 0.0
    this.weatherGain.connect(this.sfxMaster)

    this.isUnlocked = true
  }

  public unlock() {
    if (!this.ctx) this.init()
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    if (!this.m3Loaded && !this.m3Loading) {
      this.loadM3Sample()
    } else if (this.m3Loaded && !this.m3Source) {
      this.setupM3Source()
    }
  }

  private async loadM3Sample() {
    if (this.m3Buffer || this.m3Loading || !this.ctx) return
    this.m3Loading = true
    try {
      const response = await fetch('/audio/m3_gtr_screaming.mp3')
      if (!response.ok) {
        console.warn('Could not fetch M3 GTR audio sample:', response.statusText)
        return
      }
      const arrayBuffer = await response.arrayBuffer()
      this.m3Buffer = await this.ctx.decodeAudioData(arrayBuffer)
      this.m3Loaded = true
      this.setupM3Source()
    } catch (err) {
      console.warn('Procedural audio fallback active. M3 sample load error:', err)
    } finally {
      this.m3Loading = false
    }
  }

  private setupM3Source() {
    if (!this.ctx || !this.m3Buffer || !this.sfxMaster || this.m3Source) return

    this.m3Gain = this.ctx.createGain()
    this.m3Gain.gain.value = 0.0001

    // Peaking filter to enhance screaming straight-cut transmission whine
    this.m3Filter = this.ctx.createBiquadFilter()
    this.m3Filter.type = 'peaking'
    this.m3Filter.frequency.value = 1600
    this.m3Filter.Q.value = 1.2
    this.m3Filter.gain.value = 4.5

    this.m3Source = this.ctx.createBufferSource()
    this.m3Source.buffer = this.m3Buffer
    this.m3Source.loop = true
    this.m3Source.playbackRate.value = 0.85

    this.m3Source.connect(this.m3Filter)
    this.m3Filter.connect(this.m3Gain)
    this.m3Gain.connect(this.sfxMaster)

    try {
      this.m3Source.start(0)
    } catch (e) {
      console.warn('M3 audio source start info:', e)
    }
  }

  // Explosive Overrun Exhaust Crackles & Backfire Pops
  public triggerExhaustPop(intensity = 1.0) {
    if (!this.ctx || !this.isUnlocked || !this.sfxMaster) return
    const now = this.ctx.currentTime
    if (now - this.lastDecelPopTime < 0.1) return
    this.lastDecelPopTime = now

    // Number of crackles in burst (1 to 3)
    const pops = 1 + Math.floor(Math.random() * 2.2)
    for (let p = 0; p < pops; p++) {
      const delay = p * (0.035 + Math.random() * 0.045)
      const popTime = now + delay

      // Transient sharp crackle noise
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.055)
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22))
      }
      const noiseSource = this.ctx.createBufferSource()
      noiseSource.buffer = noiseBuffer

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(320 + Math.random() * 420, popTime)
      filter.Q.setValueAtTime(3.2, popTime)

      const popGain = this.ctx.createGain()
      popGain.gain.setValueAtTime(0.0001, popTime)
      popGain.gain.linearRampToValueAtTime(0.48 * intensity, popTime + 0.004)
      popGain.gain.exponentialRampToValueAtTime(0.0001, popTime + 0.05)

      // Heavy sub-bass thud (unburnt fuel igniting in exhaust manifold)
      const subOsc = this.ctx.createOscillator()
      subOsc.type = 'sine'
      subOsc.frequency.setValueAtTime(95 + Math.random() * 25, popTime)
      subOsc.frequency.exponentialRampToValueAtTime(32, popTime + 0.055)

      const subGain = this.ctx.createGain()
      subGain.gain.setValueAtTime(0.38 * intensity, popTime)
      subGain.gain.exponentialRampToValueAtTime(0.0001, popTime + 0.055)

      noiseSource.connect(filter)
      filter.connect(popGain)
      popGain.connect(this.sfxMaster)

      subOsc.connect(subGain)
      subGain.connect(this.sfxMaster)

      noiseSource.start(popTime)
      noiseSource.stop(popTime + 0.06)
      subOsc.start(popTime)
      subOsc.stop(popTime + 0.06)
    }
  }

  // Turbo Blow-Off Valve (BOV) Whoosh
  public triggerBovWhoosh() {
    if (!this.ctx || !this.isUnlocked || !this.sfxMaster) return
    const now = this.ctx.currentTime
    if (now - this.lastBovTime < 0.6) return
    this.lastBovTime = now

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.26)
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1)
    }
    const noiseSource = this.ctx.createBufferSource()
    noiseSource.buffer = noiseBuffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(2400, now)
    filter.frequency.exponentialRampToValueAtTime(850, now + 0.24)
    filter.Q.setValueAtTime(3.8, now)

    const bovGain = this.ctx.createGain()
    bovGain.gain.setValueAtTime(0.0001, now)
    bovGain.gain.linearRampToValueAtTime(0.24, now + 0.03)
    bovGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)

    noiseSource.connect(filter)
    filter.connect(bovGain)
    bovGain.connect(this.sfxMaster)

    noiseSource.start(now)
    noiseSource.stop(now + 0.26)
  }

  // Mechanical Gear Shift Transient
  public triggerGearShift(vehicleModel = 'bmw_m3', isDownshift = false) {
    if (!this.ctx || !this.isUnlocked || !this.sfxMaster) return
    const now = this.ctx.currentTime

    if (vehicleModel === 'bmw_m3') {
      // Crisp racing sequential dog-clunk + instant unburnt fuel exhaust pop on downshift
      const clunkOsc = this.ctx.createOscillator()
      clunkOsc.type = 'triangle'
      clunkOsc.frequency.setValueAtTime(140, now)
      clunkOsc.frequency.exponentialRampToValueAtTime(45, now + 0.04)

      const clunkGain = this.ctx.createGain()
      clunkGain.gain.setValueAtTime(0.24, now)
      clunkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045)

      clunkOsc.connect(clunkGain)
      clunkGain.connect(this.sfxMaster)
      clunkOsc.start(now)
      clunkOsc.stop(now + 0.05)

      if (isDownshift) {
        this.triggerExhaustPop(0.75)
      }
    } else if (vehicleModel === 'hatchback') {
      // Turbo blow-off valve (BOV) atmospheric dump
      this.triggerBovWhoosh()
    } else if (vehicleModel === 'camper') {
      // Soft mechanical vintage linkage click
      const clickOsc = this.ctx.createOscillator()
      clickOsc.type = 'sine'
      clickOsc.frequency.setValueAtTime(320, now)
      clickOsc.frequency.exponentialRampToValueAtTime(80, now + 0.035)

      const clickGain = this.ctx.createGain()
      clickGain.gain.setValueAtTime(0.12, now)
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04)

      clickOsc.connect(clickGain)
      clickGain.connect(this.sfxMaster)
      clickOsc.start(now)
      clickOsc.stop(now + 0.045)
    }
  }

  // Real-Time Telemetry Driving Sound Updates
  public updateVehicleAudio(params: {
    speedKmh: number
    rpm: number
    throttle: number
    isOffRoad: boolean
    isHoverMode: boolean
    vehicleModel?: string
    isDecelerating?: boolean
    lateralSlip?: number
  }) {
    if (!this.ctx || !this.isUnlocked) return
    const now = this.ctx.currentTime

    const {
      speedKmh,
      rpm,
      throttle,
      isOffRoad,
      isHoverMode,
      vehicleModel = 'bmw_m3',
      isDecelerating = false,
      lateralSlip = 0,
    } = params

    const isM3 = vehicleModel === 'bmw_m3'
    const isCamper = vehicleModel === 'camper'
    const isHatch = vehicleModel === 'hatchback'

    // Detect throttle lift-off to trigger exhaust crackles or BOV whoosh
    const throttleDrop = this.prevThrottleVal - throttle
    if (throttleDrop > 0.35) {
      if (isM3 && rpm > 3400) {
        this.triggerExhaustPop(Math.min(1.0, rpm / 6500))
      } else if (isHatch && rpm > 3200) {
        this.triggerBovWhoosh()
      }
    }
    if (isDecelerating && isM3 && Math.random() < 0.28) {
      this.triggerExhaustPop(0.85)
    }
    this.prevThrottleVal = throttle

    // ------------------------------------------------------------------------
    // 1. BMW M3 GTR: Screaming Straight-Cut Transmission + Roaring V8 Exhaust
    // ------------------------------------------------------------------------
    if (isHoverMode) {
      // Mute combustion audio when hover mode is active
      this.m3Gain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.exhaustRoarGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.engineGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.turboGain?.gain.setTargetAtTime(0.0001, now, 0.1)
    } else if (isM3) {
      // A. Screaming Straight-Cut Gear Whine (Sample)
      if (this.m3Source && this.m3Gain) {
        const rpmNorm = Math.min(1.0, Math.max(0, (rpm - 800) / 7200))
        const speedNorm = Math.min(1.0, Math.max(0, speedKmh / 210))

        // Dynamic pitch scaling: 0.72x deep idle -> 1.82x redline scream
        const targetPitch = 0.72 + rpmNorm * 0.88 + speedNorm * 0.22
        this.m3Source.playbackRate.setTargetAtTime(targetPitch, now, 0.04)

        if (this.m3Filter) {
          const whineFreq = 1200 + speedNorm * 1300 + rpmNorm * 700
          this.m3Filter.frequency.setTargetAtTime(whineFreq, now, 0.05)
        }

        // Screaming volume under throttle and high speeds
        const targetGain = 0.18 + throttle * 0.62 + speedNorm * 0.25
        this.m3Gain.gain.setTargetAtTime(targetGain, now, 0.04)
      }

      // B. Throaty V8 Exhaust Roar Channel (Heavy low-end resonance)
      if (this.exhaustRoarGain && this.exhaustOsc1 && this.exhaustOsc2 && this.exhaustSubOsc && this.exhaustFilter) {
        const baseFreq = 40 + (rpm / 8000) * 165
        this.exhaustOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04)
        this.exhaustOsc2.frequency.setTargetAtTime(baseFreq * 2, now, 0.04)
        this.exhaustSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04)

        const filterCutoff = 220 + throttle * 780 + (speedKmh / 200) * 320
        this.exhaustFilter.frequency.setTargetAtTime(filterCutoff, now, 0.04)

        const targetRoar = 0.16 + throttle * 0.55 + (speedKmh / 200) * 0.22
        this.exhaustRoarGain.gain.setTargetAtTime(targetRoar, now, 0.04)
      }

      // Mute other engine synthesis
      this.engineGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.turboGain?.gain.setTargetAtTime(0.0001, now, 0.1)
    }
    // ------------------------------------------------------------------------
    // 2. Cozy Camper Van: Air-Cooled Flat-4 Boxer Engine Chug
    // ------------------------------------------------------------------------
    else if (isCamper) {
      this.m3Gain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.exhaustRoarGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.turboGain?.gain.setTargetAtTime(0.0001, now, 0.1)

      if (this.engineGain && this.engineOsc1 && this.engineOsc2 && this.engineFilter) {
        // Slow rhythmic putt-putt thrum (28 Hz - 75 Hz)
        const camperFreq = 28 + (rpm / 4500) * 45
        this.engineOsc1.type = 'triangle'
        this.engineOsc1.frequency.setTargetAtTime(camperFreq, now, 0.06)
        this.engineOsc2.type = 'sine'
        this.engineOsc2.frequency.setTargetAtTime(camperFreq * 2, now, 0.06)

        this.engineFilter.frequency.setTargetAtTime(280 + throttle * 420, now, 0.06)
        const targetGain = 0.12 + throttle * 0.24 + (speedKmh / 130) * 0.08
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05)
      }
    }
    // ------------------------------------------------------------------------
    // 3. Vintage Rally Hatchback: Raspy 4-Cylinder with Turbo Spool Whine
    // ------------------------------------------------------------------------
    else if (isHatch) {
      this.m3Gain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.exhaustRoarGain?.gain.setTargetAtTime(0.0001, now, 0.1)

      if (this.engineGain && this.engineOsc1 && this.engineOsc2 && this.engineFilter) {
        // Raspy rally 4-cylinder engine (62 Hz - 230 Hz)
        const hatchFreq = 62 + (rpm / 7500) * 168
        this.engineOsc1.type = 'sawtooth'
        this.engineOsc1.frequency.setTargetAtTime(hatchFreq, now, 0.04)
        this.engineOsc2.type = 'triangle'
        this.engineOsc2.frequency.setTargetAtTime(hatchFreq * 2, now, 0.04)

        this.engineFilter.frequency.setTargetAtTime(450 + throttle * 850, now, 0.04)
        const targetGain = 0.14 + throttle * 0.32 + (speedKmh / 180) * 0.12
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.04)
      }

      // Turbocharger Spool Whine (whistles up to 2600 Hz under boost)
      if (this.turboGain && this.turboOsc) {
        const spoolFreq = 800 + throttle * 1600 + (rpm / 7500) * 600
        this.turboOsc.frequency.setTargetAtTime(spoolFreq, now, 0.05)
        const targetTurboVol = throttle * 0.18 + (speedKmh / 180) * 0.08
        this.turboGain.gain.setTargetAtTime(targetTurboVol, now, 0.05)
      }
    }

    // ------------------------------------------------------------------------
    // 4. Surface Tire Friction (higher on offroad/grass)
    // ------------------------------------------------------------------------
    if (this.frictionGain && this.frictionFilter) {
      if (isHoverMode || speedKmh < 3) {
        this.frictionGain.gain.setTargetAtTime(0.0001, now, 0.1)
      } else {
        const speedNorm = Math.min(1, speedKmh / 160)
        const targetFriction = isOffRoad ? speedNorm * 0.14 : speedNorm * 0.05
        this.frictionGain.gain.setTargetAtTime(targetFriction, now, 0.05)
        this.frictionFilter.frequency.setTargetAtTime(isOffRoad ? 500 : 1200, now, 0.1)
      }
    }

    // ------------------------------------------------------------------------
    // 5. Hovercraft Repulsor Reactor Hum
    // ------------------------------------------------------------------------
    if (this.hoverGain && this.hoverOsc) {
      if (isHoverMode) {
        const hoverTarget = 0.14 + Math.min(0.14, (speedKmh / 180) * 0.12)
        this.hoverGain.gain.setTargetAtTime(hoverTarget, now, 0.1)
        const hoverFreq = 160 + (speedKmh / 200) * 95 + throttle * 45
        this.hoverOsc.frequency.setTargetAtTime(hoverFreq, now, 0.05)
      } else {
        this.hoverGain.gain.setTargetAtTime(0.0001, now, 0.1)
      }
    }

    // ------------------------------------------------------------------------
    // 6. Lateral Slip Tire Squeal (Drifting & High-G Cornering)
    // ------------------------------------------------------------------------
    if (this.tireSquealGain && this.tireSquealFilter) {
      if (isHoverMode || speedKmh < 15 || lateralSlip < 0.08) {
        this.tireSquealGain.gain.setTargetAtTime(0.0001, now, 0.06)
      } else {
        const slipIntensity = Math.min(1.0, (lateralSlip - 0.08) * 2.8)
        const speedFactor = Math.min(1.0, speedKmh / 50)
        const targetSquealGain = slipIntensity * speedFactor * 0.38
        this.tireSquealGain.gain.setTargetAtTime(targetSquealGain, now, 0.03)

        const squealFreq = 1000 + (speedKmh / 220) * 450 + slipIntensity * 320
        this.tireSquealFilter.frequency.setTargetAtTime(squealFreq, now, 0.04)
      }
    }

    // ------------------------------------------------------------------------
    // 7. Aerodynamic High-Speed Wind Rush Noise
    // ------------------------------------------------------------------------
    if (this.windRushGain && this.windRushFilter) {
      const speedNorm = Math.min(1.2, speedKmh / 280)
      const targetWindGain = speedNorm * speedNorm * 0.28
      this.windRushGain.gain.setTargetAtTime(Math.max(0.0001, targetWindGain), now, 0.06)

      const windFreq = 300 + speedNorm * 1150
      this.windRushFilter.frequency.setTargetAtTime(windFreq, now, 0.06)
    }
  }

  // ----------------------------------------------------
  // Lo-Fi Music Player
  // ----------------------------------------------------
  private playChord(chord: number[], durationSec: number) {
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

  public setMusicVolume(val: number) {
    this.musicVolume = Math.max(0, Math.min(1, val))
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05)
    }
  }

  public setSfxVolume(val: number) {
    this.sfxMasterVolume = Math.max(0, Math.min(1, val))
    if (this.sfxMaster && this.ctx) {
      this.sfxMaster.gain.setTargetAtTime(this.sfxMasterVolume, this.ctx.currentTime, 0.05)
    }
  }

  public startMusic(trackIdx = 0) {
    this.unlock()
    this.stopMusic()
    this.isMusicPlaying = true
    this.currentTrack = trackIdx % this.chordProgressions.length

    const prog = this.chordProgressions[this.currentTrack]
    let chordIdx = 0
    const beatDuration = 3.8 // ~63 BPM

    const loop = () => {
      if (!this.isMusicPlaying) return
      const chord = prog[chordIdx % prog.length]
      this.playChord(chord, beatDuration * 0.95)
      chordIdx++
      this.musicTimer = window.setTimeout(loop, beatDuration * 1000)
    }

    loop()
  }

  public stopMusic() {
    this.isMusicPlaying = false
    if (this.musicTimer) {
      clearTimeout(this.musicTimer)
      this.musicTimer = null
    }
  }

  public playHorn() {
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

  public getTrack(index: number): TrackInfo {
    return LOFI_PLAYLIST[index % LOFI_PLAYLIST.length]
  }
}

export const audioSystem = new AudioEcosystem()

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
