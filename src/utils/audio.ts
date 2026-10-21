// Enhanced Procedural Lo-Fi Ambient Synthesizer using Web Audio API
// Generates warm, cozy electric piano chords, vinyl crackle, tape flutter, and winter/rain soundscapes

class LoFiSynthesizer {
  private ctx: AudioContext | null = null
  private isPlaying = false
  private timer: number | null = null
  private masterGain: GainNode | null = null
  private filterNode: BiquadFilterNode | null = null
  private noiseNode: AudioNode | null = null
  private noiseGain: GainNode | null = null
  private volume = 0.65

  // 5 Atmospheric Lo-Fi Tracks
  private tracks = [
    {
      title: "01. Sunset Boulevard (Warm Rhodes)",
      bpm: 64,
      vibe: "Warm Summer Dusk",
      chords: [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [196.00, 246.94, 293.66, 349.23], // G7
      ]
    },
    {
      title: "02. Rain on Windshield (Misty Chill)",
      bpm: 58,
      vibe: "Cozy Rainy Day",
      chords: [
        [293.66, 349.23, 440.00, 523.25], // Dm7
        [196.00, 246.94, 293.66, 349.23], // G7
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
      ]
    },
    {
      title: "03. Snowy Pine Cabin (Winter Chill)",
      bpm: 60,
      vibe: "Frost & Warm Tea",
      chords: [
        [329.63, 392.00, 493.88, 587.33], // Em7
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [246.94, 293.66, 349.23, 440.00], // Bm7
      ]
    },
    {
      title: "04. Midnight Highway (Tape Echo)",
      bpm: 62,
      vibe: "Late Night Drive",
      chords: [
        [220.00, 261.63, 329.63, 392.00], // Am7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [261.63, 329.63, 392.00, 523.25], // Cmaj7
        [164.81, 196.00, 246.94, 293.66], // Em7
      ]
    },
    {
      title: "05. Golden Hour Horizon (Dream Chords)",
      bpm: 66,
      vibe: "Euphoric Sunset",
      chords: [
        [349.23, 440.00, 523.25, 659.25], // Fmaj7
        [329.63, 392.00, 493.88, 587.33], // Em7
        [293.66, 349.23, 440.00, 523.25], // Dm7
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
      ]
    }
  ]

  public getTrackCount() {
    return this.tracks.length
  }

  public getTrackTitle(index: number) {
    return this.tracks[index % this.tracks.length].title
  }

  public getTrackVibe(index: number) {
    return this.tracks[index % this.tracks.length].vibe
  }

  private ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioCtx()
      
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = this.volume

      // Warm tape lowpass filter (removes harsh digital highs)
      this.filterNode = this.ctx.createBiquadFilter()
      this.filterNode.type = 'lowpass'
      this.filterNode.frequency.value = 1600
      this.filterNode.Q.value = 1.0

      this.masterGain.connect(this.filterNode)
      this.filterNode.connect(this.ctx.destination)

      this.initVinylNoise()
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  // Generates subtle vinyl crackle & warm tape hiss for that authentic Lo-Fi aesthetic
  private initVinylNoise() {
    if (!this.ctx || !this.masterGain) return

    try {
      const bufferSize = this.ctx.sampleRate * 2
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        // Soft pink noise
        const white = Math.random() * 2 - 1
        output[i] = white * 0.015 + (Math.random() < 0.0008 ? (Math.random() * 2 - 1) * 0.12 : 0) // Subtle vinyl pop
      }

      const whiteNoise = this.ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer
      whiteNoise.loop = true

      const noiseFilter = this.ctx.createBiquadFilter()
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.value = 1200
      noiseFilter.Q.value = 0.7

      this.noiseGain = this.ctx.createGain()
      this.noiseGain.gain.value = 0.25

      whiteNoise.connect(noiseFilter)
      noiseFilter.connect(this.noiseGain)
      this.noiseGain.connect(this.masterGain)

      whiteNoise.start(0)
      this.noiseNode = whiteNoise
    } catch {
      // Audio buffer creation fallback
    }
  }

  private playChord(chord: number[], durationSec: number) {
    if (!this.ctx || !this.masterGain) return

    const now = this.ctx.currentTime

    chord.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return
      const osc = this.ctx.createOscillator()
      const noteGain = this.ctx.createGain()

      // Warm electric piano timbre (triangle root + gentle sine harmonic)
      osc.type = i === 0 ? 'sine' : 'triangle'
      // Subtle vintage chorus / tape wow & flutter
      const flutter = 1 + (Math.random() - 0.5) * 0.005
      osc.frequency.setValueAtTime(freq * flutter, now)

      // Dynamic attack and decay
      const attackTime = 0.08 + i * 0.04
      const releaseTime = durationSec * 0.95
      noteGain.gain.setValueAtTime(0.0001, now)
      noteGain.gain.linearRampToValueAtTime(0.14 / (i + 1), now + attackTime)
      noteGain.gain.exponentialRampToValueAtTime(0.04 / (i + 1), now + durationSec * 0.7)
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime)

      osc.connect(noteGain)
      noteGain.connect(this.masterGain)

      osc.start(now + i * 0.03) // Subtle arpeggiated strum
      osc.stop(now + releaseTime)
    })
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val))
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime)
    }
  }

  public start(trackIndex = 0) {
    this.ensureContext()
    if (this.isPlaying) this.stop()
    this.isPlaying = true

    const track = this.tracks[trackIndex % this.tracks.length]
    let chordIdx = 0
    const beatDuration = (60 / track.bpm) * 4 // 1 measure per chord

    const loop = () => {
      if (!this.isPlaying) return
      const chord = track.chords[chordIdx % track.chords.length]
      this.playChord(chord, beatDuration * 0.96)
      chordIdx++
      this.timer = window.setTimeout(loop, beatDuration * 1000)
    }

    // Play first chord immediately
    loop()
  }

  public stop() {
    this.isPlaying = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.noiseNode) {
      try {
        (this.noiseNode as AudioBufferSourceNode).stop()
      } catch {}
      this.noiseNode = null
    }
  }
}

export const lofiAudio = new LoFiSynthesizer()
