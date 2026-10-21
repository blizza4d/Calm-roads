// Complete Audio Ecosystem
// Features: Auto-looping Lo-Fi Ambient Radio, Real-Time Engine Pitch Hum,
// Surface Friction (Asphalt vs Off-Road), Hover Repulsor Thruster, and Weather Ambience

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

  // Music Nodes
  private musicGain: GainNode | null = null
  private musicTimer: number | null = null
  private isMusicPlaying = false
  private currentTrack = 0
  private musicVolume = 0.65

  // Engine SFX Nodes
  private engineGain: GainNode | null = null
  private engineOsc1: OscillatorNode | null = null
  private engineOsc2: OscillatorNode | null = null
  private engineFilter: BiquadFilterNode | null = null

  // Surface Friction SFX
  private frictionGain: GainNode | null = null
  private frictionFilter: BiquadFilterNode | null = null

  // Hover Repulsor SFX
  private hoverGain: GainNode | null = null
  private hoverOsc: OscillatorNode | null = null

  // Weather Ambience SFX
  private weatherGain: GainNode | null = null
  private sfxMasterVolume = 0.55

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
    const sfxMaster = this.ctx.createGain()
    sfxMaster.gain.value = this.sfxMasterVolume
    sfxMaster.connect(this.ctx.destination)

    // 1. Engine Hum Channel
    this.engineGain = this.ctx.createGain()
    this.engineGain.gain.value = 0.08
    this.engineFilter = this.ctx.createBiquadFilter()
    this.engineFilter.type = 'lowpass'
    this.engineFilter.frequency.value = 400

    this.engineOsc1 = this.ctx.createOscillator()
    this.engineOsc1.type = 'triangle'
    this.engineOsc1.frequency.value = 55 // Idle ~55 Hz

    this.engineOsc2 = this.ctx.createOscillator()
    this.engineOsc2.type = 'sawtooth'
    this.engineOsc2.frequency.value = 110

    this.engineOsc1.connect(this.engineFilter)
    this.engineOsc2.connect(this.engineFilter)
    this.engineFilter.connect(this.engineGain)
    this.engineGain.connect(sfxMaster)

    this.engineOsc1.start()
    this.engineOsc2.start()

    // 2. Surface Friction Noise
    try {
      const bufferSize = this.ctx.sampleRate * 2
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
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
      this.frictionGain.connect(sfxMaster)
      noiseSource.start()
    } catch {}

    // 3. Hover Repulsor Hum (Sine + Frequency modulation)
    this.hoverGain = this.ctx.createGain()
    this.hoverGain.gain.value = 0.0
    this.hoverOsc = this.ctx.createOscillator()
    this.hoverOsc.type = 'sine'
    this.hoverOsc.frequency.value = 180

    this.hoverOsc.connect(this.hoverGain)
    this.hoverGain.connect(sfxMaster)
    this.hoverOsc.start()

    // 4. Weather Ambience
    this.weatherGain = this.ctx.createGain()
    this.weatherGain.gain.value = 0.0
    this.weatherGain.connect(sfxMaster)

    this.isUnlocked = true
  }

  public unlock() {
    if (!this.ctx) this.init()
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  // Real-Time Telemetry Driving Sound Updates
  public updateVehicleAudio(params: {
    speedKmh: number
    rpm: number
    throttle: number
    isOffRoad: boolean
    isHoverMode: boolean
  }) {
    if (!this.ctx || !this.isUnlocked) return
    const now = this.ctx.currentTime

    const { speedKmh, rpm, throttle, isOffRoad, isHoverMode } = params

    // 1. Engine Hum Pitch & Filter
    if (this.engineOsc1 && this.engineOsc2 && this.engineFilter && this.engineGain) {
      if (isHoverMode) {
        // Mute combustion engine when in hovercraft antigravity mode
        this.engineGain.gain.setTargetAtTime(0.001, now, 0.1)
      } else {
        const baseFreq = 40 + (rpm / 8000) * 160
        this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05)
        this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2, now, 0.05)

        // Open filter under throttle
        const filterCutoff = 350 + throttle * 750 + (speedKmh / 200) * 600
        this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.05)

        const targetGain = 0.06 + throttle * 0.08 + (speedKmh / 200) * 0.04
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05)
      }
    }

    // 2. Surface Tire Friction (higher on offroad/grass)
    if (this.frictionGain && this.frictionFilter) {
      if (isHoverMode || speedKmh < 3) {
        this.frictionGain.gain.setTargetAtTime(0.0001, now, 0.1)
      } else {
        const speedNorm = Math.min(1, speedKmh / 160)
        const targetFriction = isOffRoad ? speedNorm * 0.14 : speedNorm * 0.05
        this.frictionGain.gain.setTargetAtTime(targetFriction, now, 0.05)

        // Lower, crunchier sound off-road
        this.frictionFilter.frequency.setTargetAtTime(isOffRoad ? 500 : 1200, now, 0.1)
      }
    }

    // 3. Hovercraft Repulsor Hum
    if (this.hoverGain && this.hoverOsc) {
      if (isHoverMode) {
        const hoverTarget = 0.12 + Math.min(0.12, (speedKmh / 180) * 0.1)
        this.hoverGain.gain.setTargetAtTime(hoverTarget, now, 0.1)
        const hoverFreq = 160 + (speedKmh / 200) * 90 + throttle * 40
        this.hoverOsc.frequency.setTargetAtTime(hoverFreq, now, 0.05)
      } else {
        this.hoverGain.gain.setTargetAtTime(0.0001, now, 0.1)
      }
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
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04)
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

