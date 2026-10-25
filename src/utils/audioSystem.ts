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

  // 1. Multi-Layer Authentic BMW M3 GTR Audio Asset Library
  private m3IdleBuffer: AudioBuffer | null = null
  private m3LowBuffer: AudioBuffer | null = null
  private m3MidBuffer: AudioBuffer | null = null
  private m3HighBuffer: AudioBuffer | null = null
  private m3HighLoopBuffer: AudioBuffer | null = null
  private m3DecelBuffer: AudioBuffer | null = null
  private m3BrakingBuffer: AudioBuffer | null = null
  private m3OverrunBuffer: AudioBuffer | null = null
  private m3GearUpBuffer: AudioBuffer | null = null
  private m3GearDownBuffer: AudioBuffer | null = null
  private m3RealGtBuffer: AudioBuffer | null = null
  private rallyBuffer: AudioBuffer | null = null
  private m3AudioLibraryLoaded = false
  private m3AudioLibraryLoading = false

  // Active Continuous Loop Sources & Gain Nodes
  private m3IdleSource: AudioBufferSourceNode | null = null
  private m3IdleGain: GainNode | null = null

  private m3LowSource: AudioBufferSourceNode | null = null
  private m3LowGain: GainNode | null = null

  private m3HighLoopSource: AudioBufferSourceNode | null = null
  private m3HighLoopGain: GainNode | null = null

  private m3BrakingSource: AudioBufferSourceNode | null = null
  private m3BrakingGain: GainNode | null = null

  private m3RealGtSource: AudioBufferSourceNode | null = null
  private m3RealGtGain: GainNode | null = null

  private rallySource: AudioBufferSourceNode | null = null
  private rallyGain: GainNode | null = null

  // 2. BMW M3 Throaty Exhaust Roar Channel (Low-end V8 rumble & roar with Wave-Shaper Saturation)
  private exhaustRoarGain: GainNode | null = null
  private exhaustFilter: BiquadFilterNode | null = null
  private exhaustResonator: BiquadFilterNode | null = null
  private exhaustWaveShaper: WaveShaperNode | null = null
  private exhaustOsc1: OscillatorNode | null = null
  private exhaustOsc2: OscillatorNode | null = null
  private exhaustSubOsc: OscillatorNode | null = null
  private exhaustRaspOsc: OscillatorNode | null = null
  private whineOsc: OscillatorNode | null = null
  private whineGain: GainNode | null = null
  private whineFilter: BiquadFilterNode | null = null
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

    // Load authentic multi-layer BMW M3 GTR audio asset library & real recordings
    this.loadM3AudioLibrary()

    // 1. Throaty V8 Exhaust Roar Channel (BMW M3 GTR P60B40 Racing V8 with Wave-Shaper Saturation)
    this.exhaustRoarGain = this.ctx.createGain()
    this.exhaustRoarGain.gain.value = 0.0001
    this.exhaustFilter = this.ctx.createBiquadFilter()
    this.exhaustFilter.type = 'lowpass'
    this.exhaustFilter.frequency.value = 260
    this.exhaustFilter.Q.value = 2.4

    // Exhaust acoustic pipe resonance (twin 3-inch tuned exhaust pipes)
    this.exhaustResonator = this.ctx.createBiquadFilter()
    this.exhaustResonator.type = 'peaking'
    this.exhaustResonator.frequency.value = 420
    this.exhaustResonator.Q.value = 2.4
    this.exhaustResonator.gain.value = 5.5

    // Wave-Shaper saturation node: creates rich analog combustion harmonics and guttural bark
    this.exhaustWaveShaper = this.ctx.createWaveShaper()
    this.exhaustWaveShaper.curve = this.makeDistortionCurve(4.2) as any
    this.exhaustWaveShaper.oversample = 'none'

    this.exhaustOsc1 = this.ctx.createOscillator()
    this.exhaustOsc1.type = 'sawtooth'
    this.exhaustOsc1.frequency.value = 56

    this.exhaustOsc2 = this.ctx.createOscillator()
    this.exhaustOsc2.type = 'triangle'
    this.exhaustOsc2.frequency.value = 112

    this.exhaustSubOsc = this.ctx.createOscillator()
    this.exhaustSubOsc.type = 'sine'
    this.exhaustSubOsc.frequency.value = 28

    this.exhaustRaspOsc = this.ctx.createOscillator()
    this.exhaustRaspOsc.type = 'sawtooth'
    this.exhaustRaspOsc.frequency.value = 168

    // Connect combustion oscillators -> WaveShaper -> Lowpass Filter -> Resonator -> Roar Gain -> SFX Master
    this.exhaustOsc1.connect(this.exhaustWaveShaper)
    this.exhaustOsc2.connect(this.exhaustWaveShaper)
    this.exhaustSubOsc.connect(this.exhaustWaveShaper)
    this.exhaustRaspOsc.connect(this.exhaustWaveShaper)
    this.exhaustWaveShaper.connect(this.exhaustFilter)
    this.exhaustFilter.connect(this.exhaustResonator)
    this.exhaustResonator.connect(this.exhaustRoarGain)
    this.exhaustRoarGain.connect(this.sfxMaster)

    this.exhaustOsc1.start()
    this.exhaustOsc2.start()
    this.exhaustSubOsc.start()
    this.exhaustRaspOsc.start()

    // 1.1 Straight-Cut Dog-Box Transmission Whine (M3 GTR Screamer Layer)
    this.whineGain = this.ctx.createGain()
    this.whineGain.gain.value = 0.0001
    this.whineFilter = this.ctx.createBiquadFilter()
    this.whineFilter.type = 'bandpass'
    this.whineFilter.frequency.value = 1600
    this.whineFilter.Q.value = 4.5

    this.whineOsc = this.ctx.createOscillator()
    this.whineOsc.type = 'sawtooth'
    this.whineOsc.frequency.value = 1400

    this.whineOsc.connect(this.whineFilter)
    this.whineFilter.connect(this.whineGain)
    this.whineGain.connect(this.sfxMaster)
    this.whineOsc.start()

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
    if (!this.m3AudioLibraryLoaded && !this.m3AudioLibraryLoading) {
      this.loadM3AudioLibrary()
    } else if (this.m3AudioLibraryLoaded && !this.m3IdleSource) {
      this.setupM3AudioLayers()
    }
  }

  private makeDistortionCurve(k = 4.2): Float32Array {
    const n_samples = 512
    const curve = new Float32Array(n_samples)
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x))
    }
    return curve
  }

  // Asynchronously decode and instantiate the structured BMW M3 GTR audio library and authentic recordings
  private async loadM3AudioLibrary() {
    if (this.m3AudioLibraryLoaded || this.m3AudioLibraryLoading || !this.ctx) return
    this.m3AudioLibraryLoading = true

    const loadBuffer = async (url: string) => {
      try {
        const response = await fetch(url)
        if (!response.ok) return null
        const arrayBuffer = await response.arrayBuffer()
        return await this.ctx!.decodeAudioData(arrayBuffer)
      } catch (err) {
        console.warn(`Audio buffer decode warning for ${url}:`, err)
        return null
      }
    }

    try {
      const [idle, low, mid, high, highLoop, decel, braking, overrun, gearUp, gearDown, realGt, rally] =
        await Promise.all([
          loadBuffer('/audio/cars/bmw-m3-gtr/idle_loop.wav'),
          loadBuffer('/audio/cars/bmw-m3-gtr/low_rpm_acceleration.wav'),
          loadBuffer('/audio/cars/bmw-m3-gtr/mid_rpm_acceleration.wav'),
          loadBuffer('/audio/cars/bmw-m3-gtr/high_rpm_acceleration.wav'),
          loadBuffer('/audio/cars/bmw-m3-gtr/high_rpm_loop.wav'),
          loadBuffer('/audio/cars/bmw-m3-gtr/deceleration.wav'),
          loadBuffer('/audio/cars/bmw-m3-gtr/engine_braking.wav'),
          loadBuffer('/audio/cars/bmw-m3-gtr/exhaust_overrun.wav'),
          loadBuffer('/audio/cars/bmw-m3-gtr/gear_up.wav'),
          loadBuffer('/audio/cars/bmw-m3-gtr/gear_down.wav'),
          loadBuffer('/audio/raw/bmw_m3_gt2_2010.ogg'),
          loadBuffer('/audio/raw/audi_quattro_rally.ogg'),
        ])

      this.m3IdleBuffer = idle
      this.m3LowBuffer = low
      this.m3MidBuffer = mid
      this.m3HighBuffer = high
      this.m3HighLoopBuffer = highLoop
      this.m3DecelBuffer = decel
      this.m3BrakingBuffer = braking
      this.m3OverrunBuffer = overrun
      this.m3GearUpBuffer = gearUp
      this.m3GearDownBuffer = gearDown
      this.m3RealGtBuffer = realGt
      this.rallyBuffer = rally

      this.m3AudioLibraryLoaded = true
      this.setupM3AudioLayers()
    } catch (err) {
      console.warn('M3 Audio Library loading error:', err)
    } finally {
      this.m3AudioLibraryLoading = false
    }
  }

  private setupM3AudioLayers() {
    if (!this.ctx || !this.sfxMaster) return

    const createLoopChannel = (buffer: AudioBuffer | null) => {
      if (!this.ctx || !this.sfxMaster || !buffer) return { source: null, gain: null }
      const gain = this.ctx.createGain()
      gain.gain.value = 0.0001
      gain.connect(this.sfxMaster)

      const source = this.ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      source.playbackRate.value = 1.0
      source.connect(gain)

      try {
        source.start(0)
      } catch (e) {
        console.warn('Source loop start warning:', e)
      }
      return { source, gain }
    }

    if (!this.m3IdleSource && this.m3IdleBuffer) {
      const ch = createLoopChannel(this.m3IdleBuffer)
      this.m3IdleSource = ch.source
      this.m3IdleGain = ch.gain
    }

    if (!this.m3LowSource && this.m3LowBuffer) {
      const ch = createLoopChannel(this.m3LowBuffer)
      this.m3LowSource = ch.source
      this.m3LowGain = ch.gain
    }

    if (!this.m3HighLoopSource && this.m3HighLoopBuffer) {
      const ch = createLoopChannel(this.m3HighLoopBuffer)
      this.m3HighLoopSource = ch.source
      this.m3HighLoopGain = ch.gain
    }

    if (!this.m3BrakingSource && this.m3BrakingBuffer) {
      const ch = createLoopChannel(this.m3BrakingBuffer)
      this.m3BrakingSource = ch.source
      this.m3BrakingGain = ch.gain
    }

    if (!this.m3RealGtSource && this.m3RealGtBuffer) {
      const ch = createLoopChannel(this.m3RealGtBuffer)
      this.m3RealGtSource = ch.source
      this.m3RealGtGain = ch.gain
    }

    if (!this.rallySource && this.rallyBuffer) {
      const ch = createLoopChannel(this.rallyBuffer)
      this.rallySource = ch.source
      this.rallyGain = ch.gain
    }
  }

  // Explosive Overrun Exhaust Crackles & Backfire Pops
  public triggerExhaustPop(intensity = 1.0) {
    if (!this.ctx || !this.isUnlocked || !this.sfxMaster) return
    const now = this.ctx.currentTime
    if (now - this.lastDecelPopTime < 0.12) return
    this.lastDecelPopTime = now

    // Play authentic recorded exhaust overrun one-shot if loaded
    if (this.m3OverrunBuffer) {
      const source = this.ctx.createBufferSource()
      source.buffer = this.m3OverrunBuffer
      source.playbackRate.value = 0.94 + Math.random() * 0.14
      const gain = this.ctx.createGain()
      gain.gain.setValueAtTime(0.65 * intensity, now)
      source.connect(gain)
      gain.connect(this.sfxMaster)
      source.start(now)
      return
    }

    // Number of crackles in burst (1 to 3) fallback
    const pops = 1 + Math.floor(Math.random() * 2.2)
    for (let p = 0; p < pops; p++) {
      const delay = p * (0.035 + Math.random() * 0.045)
      const popTime = now + delay

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
      // 0.045s sequential ignition cut: momentary exhaust volume ducking
      if (this.m3LowGain && this.m3HighLoopGain) {
        this.m3LowGain.gain.setValueAtTime(0.06, now)
        this.m3HighLoopGain.gain.setValueAtTime(0.06, now)
        this.m3LowGain.gain.setTargetAtTime(0.55, now + 0.045, 0.03)
        this.m3HighLoopGain.gain.setTargetAtTime(0.55, now + 0.045, 0.03)
      }

      // Play authentic sequential dog-box shift one-shot
      const shiftBuffer = isDownshift ? (this.m3GearDownBuffer || this.m3GearUpBuffer) : this.m3GearUpBuffer
      if (shiftBuffer) {
        const source = this.ctx.createBufferSource()
        source.buffer = shiftBuffer
        source.playbackRate.value = 0.98 + Math.random() * 0.04
        const gain = this.ctx.createGain()
        gain.gain.setValueAtTime(0.72, now)
        source.connect(gain)
        gain.connect(this.sfxMaster)
        source.start(now)
      } else {
        const clunkOsc = this.ctx.createOscillator()
        clunkOsc.type = 'triangle'
        clunkOsc.frequency.setValueAtTime(160, now)
        clunkOsc.frequency.exponentialRampToValueAtTime(45, now + 0.045)

        const clunkGain = this.ctx.createGain()
        clunkGain.gain.setValueAtTime(0.28, now)
        clunkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)

        clunkOsc.connect(clunkGain)
        clunkGain.connect(this.sfxMaster)
        clunkOsc.start(now)
        clunkOsc.stop(now + 0.055)
      }

      this.triggerExhaustPop(isDownshift ? 0.85 : 0.55)
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

    // Detect rapid throttle lift-off to trigger authentic overrun crackle or BOV whoosh
    const throttleDrop = this.prevThrottleVal - throttle
    if (throttleDrop > 0.40) {
      if (isM3 && rpm > 4200) {
        this.triggerExhaustPop(Math.min(1.0, 0.5 + (rpm - 4200) / 4000))
      } else if (isHatch && rpm > 3200) {
        this.triggerBovWhoosh()
      }
    }
    this.prevThrottleVal = throttle

    // ------------------------------------------------------------------------
    // 1. BMW M3 GTR: Real Recording Crossfading & RPM-Aware Engine Management
    // ------------------------------------------------------------------------
    if (isHoverMode) {
      // Mute all combustion audio when hover mode is active
      this.m3IdleGain?.gain.setTargetAtTime(0.0001, now, 0.08)
      this.m3LowGain?.gain.setTargetAtTime(0.0001, now, 0.08)
      this.m3HighLoopGain?.gain.setTargetAtTime(0.0001, now, 0.08)
      this.m3BrakingGain?.gain.setTargetAtTime(0.0001, now, 0.08)
      this.m3RealGtGain?.gain.setTargetAtTime(0.0001, now, 0.08)
      this.exhaustRoarGain?.gain.setTargetAtTime(0.0001, now, 0.08)
      this.whineGain?.gain.setTargetAtTime(0.0001, now, 0.08)
      this.rallyGain?.gain.setTargetAtTime(0.0001, now, 0.08)
      this.engineGain?.gain.setTargetAtTime(0.0001, now, 0.08)
      this.turboGain?.gain.setTargetAtTime(0.0001, now, 0.08)
    } else if (isM3) {
      // Mute non-M3 channels
      this.rallyGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.engineGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.turboGain?.gain.setTargetAtTime(0.0001, now, 0.1)

      const rpmNorm = Math.min(1.0, Math.max(0, (rpm - 850) / (8200 - 850)))
      const speedNorm = Math.min(1.0, Math.max(0, speedKmh / 275))
      const throttleVal = Math.max(0, Math.min(1, throttle))
      const isDecel = isDecelerating || (throttleVal < 0.12 && speedKmh > 12 && rpm > 2000)

      // 1. Stationary / Low-Speed Mechanical V8 Idle Layer (850 RPM)
      if (this.m3IdleGain && this.m3IdleSource) {
        const targetIdle = Math.max(0, 1 - (rpm - 850) / 950) * (1 - throttleVal * 0.75) * 0.72
        this.m3IdleGain.gain.setTargetAtTime(targetIdle, now, 0.06)
        this.m3IdleSource.playbackRate.setTargetAtTime(0.96 + Math.sin(now * 4) * 0.03, now, 0.1)
      }

      // 2. Low-Mid Throttle Roll-On & Induction Layer (1,200 - 5,500 RPM)
      if (this.m3LowGain && this.m3LowSource) {
        const lowRpmCurve = Math.sin(Math.min(Math.PI, Math.max(0, (rpm - 1000) / 4600) * Math.PI))
        const targetLow = lowRpmCurve * (0.2 + throttleVal * 0.65) * (isDecel ? 0.35 : 1.0) * 0.78
        this.m3LowGain.gain.setTargetAtTime(targetLow, now, 0.05)
        this.m3LowSource.playbackRate.setTargetAtTime(0.85 + rpmNorm * 0.35, now, 0.05)
      }

      // 3. High-RPM Screaming Race-V8 Layer (4,800 - 8,200 RPM)
      if (this.m3HighLoopGain && this.m3HighLoopSource) {
        const highRpmCurve = Math.max(0, (rpm - 4800) / 3400)
        const targetHigh = highRpmCurve * (0.22 + throttleVal * 0.78) * (isDecel ? 0.25 : 1.0) * 0.88
        this.m3HighLoopGain.gain.setTargetAtTime(targetHigh, now, 0.04)
        this.m3HighLoopSource.playbackRate.setTargetAtTime(0.90 + (rpm - 5000) / 3200 * 0.25, now, 0.04)
      }

      // 4. Authentic Goodwood Hillclimb BMW M3 GT2 Recording Layer
      if (this.m3RealGtGain && this.m3RealGtSource) {
        const realGtCurve = Math.max(0, (rpm - 3400) / 4800)
        const targetGt = realGtCurve * (throttleVal * 0.62 + speedNorm * 0.20) * (isDecel ? 0.15 : 1.0) * 0.75
        this.m3RealGtGain.gain.setTargetAtTime(targetGt, now, 0.04)
        this.m3RealGtSource.playbackRate.setTargetAtTime(0.88 + rpmNorm * 0.28, now, 0.05)
      }

      // 5. Deceleration & Engine Braking Compression Layer
      if (this.m3BrakingGain && this.m3BrakingSource) {
        const targetDecel = isDecel
          ? Math.min(0.82, (1 - throttleVal) * Math.min(1, (rpm - 1500) / 2800) * Math.min(1, speedKmh / 22) * 0.85)
          : 0.0001
        this.m3BrakingGain.gain.setTargetAtTime(targetDecel, now, 0.06)
        this.m3BrakingSource.playbackRate.setTargetAtTime(0.85 + rpmNorm * 0.22, now, 0.06)
      }

      // 6. Straight-Cut Dog-Box Transmission Mechanical Gear Whine
      if (this.whineOsc && this.whineGain && this.whineFilter) {
        const dogBoxFreq = 900 + (speedKmh / 275) * 2100 + (rpm / 8500) * 600
        this.whineOsc.frequency.setTargetAtTime(dogBoxFreq, now, 0.04)
        this.whineFilter.frequency.setTargetAtTime(dogBoxFreq, now, 0.04)
        const targetWhine = Math.min(0.24, (speedKmh / 160) * 0.14 + throttleVal * 0.10)
        this.whineGain.gain.setTargetAtTime(targetWhine, now, 0.04)
      }

      // 7. Subtle WaveShaper Exhaust Resonance (Provides visceral low-frequency chassis vibration)
      if (this.exhaustRoarGain && this.exhaustOsc1 && this.exhaustOsc2 && this.exhaustSubOsc && this.exhaustRaspOsc && this.exhaustFilter) {
        const v8PulseFreq = Math.max(42, (rpm / 60) * 4)
        this.exhaustOsc1.frequency.setTargetAtTime(v8PulseFreq, now, 0.03)
        this.exhaustOsc2.frequency.setTargetAtTime(v8PulseFreq * 2, now, 0.03)
        this.exhaustSubOsc.frequency.setTargetAtTime(v8PulseFreq * 0.5, now, 0.03)
        this.exhaustRaspOsc.frequency.setTargetAtTime(v8PulseFreq * 3, now, 0.03)

        const filterCutoff = 220 + throttleVal * 1200 + (rpm / 8500) * 650
        this.exhaustFilter.frequency.setTargetAtTime(filterCutoff, now, 0.04)
        const targetSubRoar = 0.12 + throttleVal * 0.25 + (speedKmh / 260) * 0.08
        this.exhaustRoarGain.gain.setTargetAtTime(targetSubRoar, now, 0.04)
      }
    }
    // ------------------------------------------------------------------------
    // 2. Cozy Camper Van: Air-Cooled Flat-4 Boxer Engine Chug
    // ------------------------------------------------------------------------
    else if (isCamper) {
      this.m3IdleGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.m3LowGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.m3HighLoopGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.m3BrakingGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.m3RealGtGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.exhaustRoarGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.whineGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.rallyGain?.gain.setTargetAtTime(0.0001, now, 0.1)
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
    // 3. Vintage Rally Hatchback: Group B Turbo 5-Cylinder with Turbo Spool Whine
    // ------------------------------------------------------------------------
    else if (isHatch) {
      this.m3IdleGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.m3LowGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.m3HighLoopGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.m3BrakingGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.m3RealGtGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.exhaustRoarGain?.gain.setTargetAtTime(0.0001, now, 0.1)
      this.whineGain?.gain.setTargetAtTime(0.0001, now, 0.1)

      // Authentic Audi Sport Quattro Group B rally engine recording
      if (this.rallyGain && this.rallySource) {
        const rpmNorm = (rpm - 1000) / 6500
        this.rallySource.playbackRate.setTargetAtTime(0.85 + rpmNorm * 0.35, now, 0.04)
        const targetRallyVol = 0.18 + throttle * 0.62 + (speedKmh / 180) * 0.18
        this.rallyGain.gain.setTargetAtTime(targetRallyVol, now, 0.04)
      } else if (this.engineGain && this.engineOsc1 && this.engineOsc2 && this.engineFilter) {
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
        const targetTurboVol = throttle * 0.22 + (speedKmh / 180) * 0.10
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

  public getLoadedClipsInfo() {
    return {
      hasIdle: !!this.m3IdleBuffer,
      hasLow: !!this.m3LowBuffer,
      hasMid: !!this.m3MidBuffer,
      hasHigh: !!this.m3HighBuffer,
      hasHighLoop: !!this.m3HighLoopBuffer,
      hasDecel: !!this.m3DecelBuffer,
      hasBraking: !!this.m3BrakingBuffer,
      hasOverrun: !!this.m3OverrunBuffer,
      hasGearUp: !!this.m3GearUpBuffer,
      hasGearDown: !!this.m3GearDownBuffer,
      hasRealGt: !!this.m3RealGtBuffer,
      hasRally: !!this.rallyBuffer,
    }
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
