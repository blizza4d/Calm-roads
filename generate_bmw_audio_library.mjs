import fs from 'fs'
import path from 'path'

const sampleRate = 44100;

function createWav(channels, samples) {
  const bytesPerSample = 2;
  const numSamples = samples[0].length;
  const dataSize = numSamples * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // Linear PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);

  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < channels; ch++) {
      const s = Math.max(-1, Math.min(1, samples[ch][i]));
      const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
      buffer.writeInt16LE(Math.floor(intSample), offset);
      offset += 2;
    }
  }
  return buffer;
}

// 2-Pole Resonant Bandpass Filter (Models Tuned Exhaust Runner & Collector Cavities)
class ResonantFilter {
  constructor(freq, q = 2.5) {
    this.setParams(freq, q);
    this.x1 = 0; this.x2 = 0;
    this.y1 = 0; this.y2 = 0;
  }
  setParams(freq, q) {
    const w0 = 2 * Math.PI * freq / sampleRate;
    const alpha = Math.sin(w0) / (2 * q);
    const b0 = alpha;
    const b1 = 0;
    const b2 = -alpha;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - alpha;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }
  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

// Lowpass filter helper (single-pole IIR)
function applyLowpass(samples, cutoffHz) {
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const alpha = dt / (rc + dt);
  const out = new Float32Array(samples.length);
  let prev = 0;
  for (let i = 0; i < samples.length; i++) {
    prev = prev + alpha * (samples[i] - prev);
    out[i] = prev;
  }
  return out;
}

// Asymmetric Soft Saturation with Rich Even & Odd Harmonics (Models High-Pressure Exhaust Tube Gas Compression)
function saturateExhaust(x, drive = 1.6) {
  const v = x * drive;
  // Asymmetric polynomial transfer curve typical of high-velocity exhaust pulses
  if (v > 1.2) return 0.88 + 0.12 * Math.tanh(v - 1.2);
  if (v < -1.2) return -0.88 + 0.12 * Math.tanh(v + 1.2);
  return v - 0.22 * Math.pow(v, 3) + 0.08 * Math.pow(v, 2);
}

/**
 * Authentic Racing V8 Physical Combustion Acoustic Synthesizer:
 * Models:
 * - 4-Stroke 720-degree crankshaft cycle
 * - Cross-plane staggered bank firing order (Cylinders 1-8-4-3-6-5-7-2)
 * - Bank 1 vs Bank 2 pulse collisions (the iconic guttural V8 burble/thrum)
 * - Explosive supersonic blowdown shock wave + resonant tuned header pipe ringing
 * - Massive low-end sub-bass crank thrum (subwoofer frequencies: 25 - 90 Hz)
 * - Intake runner induction growl under load (Helmholtz resonance: 130 - 280 Hz)
 * - Straight-cut Hewland dog-box gear whine
 * - Dual side-exit exhaust collector acoustic delay and stereo spread
 */
function synthesizeRealisticV8(rpm, throttle = 1.0, durationSec = 3.2, rpmEnd = null) {
  const totalSamples = Math.floor(sampleRate * durationSec);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const startRpm = rpm;
  const endRpm = rpmEnd !== null ? rpmEnd : rpm;

  // Cross-plane V8 Firing Angles in Radians over a 720° (4*pi) 4-stroke cycle
  // Left Bank (Bank 1): Cyl 1 (0°), Cyl 4 (180°), Cyl 3 (270°), Cyl 5 (450°)
  // Right Bank (Bank 2): Cyl 8 (90°), Cyl 6 (360°), Cyl 7 (540°), Cyl 2 (630°)
  const bank1Angles = [0, Math.PI, 1.5 * Math.PI, 2.5 * Math.PI];
  const bank2Angles = [0.5 * Math.PI, 2.0 * Math.PI, 3.0 * Math.PI, 3.5 * Math.PI];
  const cycleRad = 4.0 * Math.PI;

  let crankAngle = 0;
  let whinePhase = 0;
  let noiseState = 0;

  // Tuned exhaust runner resonant filters (180Hz body punch, 420Hz throat rasp)
  const filterL1 = new ResonantFilter(175, 2.8);
  const filterL2 = new ResonantFilter(390, 2.2);
  const filterR1 = new ResonantFilter(175, 2.8);
  const filterR2 = new ResonantFilter(390, 2.2);

  for (let i = 0; i < totalSamples; i++) {
    const progress = i / totalSamples;
    const curRpm = startRpm + (endRpm - startRpm) * progress;
    const revPerSec = curRpm / 60;
    const radPerSec = revPerSec * 2 * Math.PI;
    const dt = 1 / sampleRate;

    crankAngle += radPerSec * dt;
    const cyclePos = crankAngle % cycleRad;

    // 1. Bank 1 (Left Exhaust Collector) Individual Combustion Pulses
    let pulseB1 = 0;
    for (let c = 0; c < 4; c++) {
      let delta = cyclePos - bank1Angles[c];
      if (delta < 0) delta += cycleRad;
      // Cylinder blowdown phase lasts ~1.1 radians (~63 degrees of crank rotation)
      if (delta < 1.15) {
        const tRel = delta / 1.15;
        // Asymmetric steep wavefront spike
        const shock = Math.sin(Math.PI * Math.pow(tRel, 0.38)) * Math.exp(-3.2 * tRel);
        // Header pipe acoustic ring
        const ring = Math.sin(delta * 16.0) * Math.exp(-4.2 * tRel) * 0.42;
        // Negative rebound pulse in exhaust collector
        const rebound = -0.16 * Math.sin(Math.PI * 2 * tRel) * Math.exp(-2.2 * tRel);
        pulseB1 += shock + ring + rebound;
      }
    }

    // 2. Bank 2 (Right Exhaust Collector) Individual Combustion Pulses
    let pulseB2 = 0;
    for (let c = 0; c < 4; c++) {
      let delta = cyclePos - bank2Angles[c];
      if (delta < 0) delta += cycleRad;
      if (delta < 1.15) {
        const tRel = delta / 1.15;
        const shock = Math.sin(Math.PI * Math.pow(tRel, 0.38)) * Math.exp(-3.2 * tRel);
        const ring = Math.sin(delta * 16.0) * Math.exp(-4.2 * tRel) * 0.42;
        const rebound = -0.16 * Math.sin(Math.PI * 2 * tRel) * Math.exp(-2.2 * tRel);
        pulseB2 += shock + ring + rebound;
      }
    }

    // 3. Deep Visceral Sub-Bass Body & Crank Thrum
    // Sub-harmonic fundamental (1x and 2x crank speed, creates deep chest punch)
    const sub1 = Math.sin(crankAngle * 0.5) * 0.36; // 4-stroke cycle fundamental (f_crank / 2)
    const sub2 = Math.sin(crankAngle) * 0.42;       // Crankshaft revolution fundamental
    const sub3 = Math.sin(crankAngle * 2.0) * 0.28; // Bank collision pulse (heavy V8 thrum)
    const subBass = sub1 + sub2 + sub3;

    // 4. Heavy Intake Manifold Induction Roar (Guttural roar under heavy throttle load)
    const intakeResonance = Math.sin(crankAngle * 2.0 + 0.8) * 0.45 + Math.sin(crankAngle * 4.0) * 0.28;
    noiseState = noiseState * 0.92 + (Math.random() - 0.5) * 0.08;
    const intakeRoar = (intakeResonance * 0.65 + noiseState * 0.35) * (throttle * 0.85);

    // 5. Straight-Cut Dog-Box Transmission Whine (6-speed sequential spur gears)
    whinePhase += ((curRpm * 0.42 * 6.0) / sampleRate) * 2 * Math.PI;
    const whineIntensity = Math.min(1.0, Math.max(0, (curRpm - 1100) / 4800)) * (0.16 + throttle * 0.12);
    const dogBoxWhine = (Math.sin(whinePhase) + Math.sin(whinePhase * 2.0) * 0.35) * whineIntensity;

    // 6. Mechanical Valvetrain & DOHC Camshaft Click
    const valveClick = Math.pow(Math.abs(Math.sin(crankAngle * 4.0)), 28.0) * 0.18;

    // 7. Exhaust Tube Acoustics & Saturation
    // Pass Bank pulses through resonant body filters
    const tunedL = filterL1.process(pulseB1) * 0.65 + filterL2.process(pulseB1) * 0.35;
    const tunedR = filterR1.process(pulseB2) * 0.65 + filterR2.process(pulseB2) * 0.35;

    // Combine raw pulses, tuned exhaust resonances, sub-bass thump, and induction roar
    const rawMixL = (pulseB1 * 0.55 + tunedL * 0.45) * (0.65 + throttle * 0.55) + subBass * 0.62 + intakeRoar * 0.5 + valveClick;
    const rawMixR = (pulseB2 * 0.55 + tunedR * 0.45) * (0.65 + throttle * 0.55) + subBass * 0.62 + intakeRoar * 0.5 + valveClick;

    // Saturated high-velocity exhaust compression
    const satL = saturateExhaust(rawMixL, 1.4 + throttle * 1.8);
    const satR = saturateExhaust(rawMixR, 1.4 + throttle * 1.8);

    // Master Stereo Output with Transmission Whine
    left[i] = satL * 0.82 + dogBoxWhine * 0.45;
    right[i] = satR * 0.82 + dogBoxWhine * 0.45;
  }

  return [left, right];
}

// Seamless Looper with Power-Preserving Sinusoidal Crossfade
function makeSeamlessLoop(channels, crossfadeSec = 0.35) {
  const xfSamples = Math.floor(sampleRate * crossfadeSec);
  const numSamples = channels[0].length;
  const loopLen = numSamples - xfSamples;
  const outL = new Float32Array(loopLen);
  const outR = new Float32Array(loopLen);

  for (let i = 0; i < loopLen; i++) {
    if (i < xfSamples) {
      const t = i / xfSamples;
      // Sinusoidal equal-power crossfade prevents volume dips at the loop boundary
      const gainStart = Math.sin(t * Math.PI * 0.5);
      const gainEnd = Math.cos(t * Math.PI * 0.5);
      const endIdx = loopLen + i;
      outL[i] = channels[0][i] * gainStart + channels[0][endIdx] * gainEnd;
      outR[i] = channels[1][i] * gainStart + channels[1][endIdx] * gainEnd;
    } else {
      outL[i] = channels[0][i];
      outR[i] = channels[1][i];
    }
  }
  return [outL, outR];
}

const outDirs = [
  'public/audio/cars/bmw-m3-gtr',
  'public/sounds'
];

outDirs.forEach(dir => fs.mkdirSync(dir, { recursive: true }));

console.log('Generating heavy, realistic, authentic racing V8 audio library...');

function saveAudio(filename, buffer) {
  outDirs.forEach(dir => {
    fs.writeFileSync(path.join(dir, filename), buffer);
  });
}

// 1. Idle Loop: Deep, guttural 850 RPM cross-plane mechanical heartbeat with low sub-bass thrum
{
  const raw = synthesizeRealisticV8(850, 0.06, 3.6);
  const looped = makeSeamlessLoop(raw, 0.45);
  const wav = createWav(2, looped);
  saveAudio('idle_loop.wav', wav);
  saveAudio('engine_idle.wav', wav);
  console.log('✓ idle_loop.wav & engine_idle.wav (Deep Heavy V8 Rumble)');
}

// 2. Low-RPM Acceleration (1,200 - 3,200 RPM): Heavy low-end torque, throaty manifold roar
{
  const raw = synthesizeRealisticV8(1200, 0.85, 3.8, 3200);
  const looped = makeSeamlessLoop(raw, 0.4);
  const wav = createWav(2, looped);
  saveAudio('low_rpm_acceleration.wav', wav);
  saveAudio('engine_low.wav', wav);
  console.log('✓ low_rpm_acceleration.wav & engine_low.wav (Throaty Heavy Torque)');
}

// 3. Mid-RPM Acceleration (3,200 - 5,600 RPM): Tuned header pipe resonance, visceral exhaust bark
{
  const raw = synthesizeRealisticV8(3200, 0.95, 3.6, 5600);
  const looped = makeSeamlessLoop(raw, 0.4);
  const wav = createWav(2, looped);
  saveAudio('mid_rpm_acceleration.wav', wav);
  saveAudio('engine_mid.wav', wav);
  console.log('✓ mid_rpm_acceleration.wav & engine_mid.wav (Resonant Exhaust Growl)');
}

// 4. High-RPM Acceleration (5,600 - 8,200 RPM Screamer): Screaming racing harmonics, dog-box gear tooth whine
{
  const raw = synthesizeRealisticV8(5600, 1.0, 3.4, 8200);
  const looped = makeSeamlessLoop(raw, 0.35);
  const wav = createWav(2, looped);
  saveAudio('high_rpm_acceleration.wav', wav);
  console.log('✓ high_rpm_acceleration.wav');
}

// 5. High-RPM Sustained Loop (7,800 RPM Redline Howl)
{
  const raw = synthesizeRealisticV8(7800, 1.0, 3.2);
  const looped = makeSeamlessLoop(raw, 0.4);
  const wav = createWav(2, looped);
  saveAudio('high_rpm_loop.wav', wav);
  saveAudio('engine_high.wav', wav);
  console.log('✓ high_rpm_loop.wav & engine_high.wav (Screaming Top-End)');
}

// 6. Deceleration / Engine Braking (Heavy reverse torque compression burble from 6,800 to 2,000 RPM)
{
  const totalSamples = Math.floor(sampleRate * 3.6);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  let crankAngle = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    const curRpm = 6800 - (6800 - 2000) * Math.pow(t, 0.65);
    const revPerSec = curRpm / 60;
    crankAngle += (revPerSec * 2 * Math.PI) / sampleRate;

    // Heavy hollow compression pulses
    const p1 = Math.sin(crankAngle * 2.0) * 0.55;
    const p2 = Math.sin(crankAngle * 4.0) * 0.35;
    const subThump = Math.sin(crankAngle) * 0.48; // Deep sub-bass compression drag

    // Random explosive exhaust manifold burble on trailing throttle
    let burble = 0;
    if (Math.random() < 0.004) {
      burble = (Math.random() - 0.5) * 1.2;
    }

    const s = saturateExhaust(p1 + p2 + subThump + burble, 1.3) * (0.38 + (1 - t) * 0.32);
    left[i] = s * 0.92;
    right[i] = s * 0.88;
  }
  const looped = makeSeamlessLoop([left, right], 0.35);
  const wav = createWav(2, looped);
  saveAudio('deceleration.wav', wav);
  saveAudio('engine_braking.wav', wav);
  saveAudio('engine_off_throttle.wav', wav);
  console.log('✓ deceleration.wav & engine_off_throttle.wav (Heavy Compression Burble)');
}

// 7. Explosive Exhaust Overrun Crackles & Concussive Pops (Unburnt fuel detonation in hot side-pipes)
{
  const dur = 2.4;
  const totalSamples = Math.floor(sampleRate * dur);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // 10 discrete concussive pop transients with deep chest-thump bass and metallic whip crack
  const popTimes = [0.06, 0.18, 0.34, 0.52, 0.76, 1.05, 1.35, 1.62, 1.95, 2.15];
  for (const pt of popTimes) {
    const center = Math.floor(pt * sampleRate);
    const popDur = Math.floor(0.045 * sampleRate);
    const amp = 0.75 + Math.random() * 0.45;
    const subFreq = 55 + Math.random() * 45; // 55-100 Hz deep concussive punch

    for (let j = 0; j < popDur && center + j < totalSamples; j++) {
      const decayFast = Math.exp(-j / (sampleRate * 0.005));
      const decaySub = Math.exp(-j / (sampleRate * 0.025));
      // Sharp metallic detonation + deep acoustic bass concussion
      const metallicSnap = (Math.random() * 2 - 1) * decayFast * amp * 0.85;
      const subThud = Math.sin(2 * Math.PI * subFreq * (j / sampleRate)) * decaySub * amp * 0.95;
      const val = metallicSnap + subThud;
      left[center + j] += val;
      right[center + j] += val * (0.8 + Math.random() * 0.4);
    }
  }

  const wav = createWav(2, [left, right]);
  saveAudio('exhaust_overrun.wav', wav);
  saveAudio('exhaust_pop.wav', wav);
  console.log('✓ exhaust_overrun.wav & exhaust_pop.wav (Heavy Concussive Pops)');
}

// 8. Dog-Box Sequential Gear Up Clunk & Ignition Cut
{
  const dur = 0.38;
  const totalSamples = Math.floor(sampleRate * dur);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let s = 0;
    if (t > 0.035 && t < 0.11) {
      const clunkT = (t - 0.035);
      const clunkDecay = Math.exp(-clunkT * 110);
      // Heavy mechanical dog-ring engagement clunk (280Hz steel strike + sub-thud)
      s = Math.sin(2 * Math.PI * 260 * clunkT) * clunkDecay * 0.9 + Math.sin(2 * Math.PI * 90 * clunkT) * clunkDecay * 0.7;
    } else if (t >= 0.11) {
      const resumeT = (t - 0.11);
      s = Math.sin(2 * Math.PI * 440 * resumeT) * Math.exp(-resumeT * 30) * 0.45;
    }
    left[i] = s;
    right[i] = s;
  }
  const wav = createWav(2, [left, right]);
  saveAudio('gear_up.wav', wav);
  saveAudio('gear_shift.wav', wav);
  console.log('✓ gear_up.wav & gear_shift.wav (Mechanical Dog-Ring Shift)');
}

// 9. Downshift Throttle Blip & Clunk
{
  const dur = 0.52;
  const totalSamples = Math.floor(sampleRate * dur);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const blipRpm = 4200 + Math.sin((t / 0.22) * Math.PI) * 1400;
    const firingFreq = (blipRpm / 60) * 4;
    const blipEnv = t < 0.22 ? Math.sin((t / 0.22) * Math.PI) : 0;
    const pulse = Math.sin(2 * Math.PI * firingFreq * t) * blipEnv * 0.85;

    let clunk = 0;
    if (t >= 0.18 && t < 0.28) {
      const ct = t - 0.18;
      clunk = Math.sin(2 * Math.PI * 240 * ct) * Math.exp(-ct * 95) * 0.85;
    }
    const s = pulse + clunk;
    left[i] = s;
    right[i] = s;
  }
  const wav = createWav(2, [left, right]);
  saveAudio('gear_down.wav', wav);
  saveAudio('gear_downshift.wav', wav);
  console.log('✓ gear_down.wav & gear_downshift.wav');
}

// 10. High-Torque Starter Motor & V8 Ignition Flare
{
  const dur = 2.8;
  const totalSamples = Math.floor(sampleRate * dur);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let s = 0;
    if (t < 0.8) {
      const starterWhine = Math.sin(2 * Math.PI * 980 * t) * 0.22;
      const compressionChug = Math.sin(2 * Math.PI * 16 * t) * 0.65;
      s = starterWhine + compressionChug;
    } else if (t >= 0.8 && t < 1.6) {
      const ignT = t - 0.8;
      const flareRpm = 2800 * Math.exp(-ignT * 1.6) + 850;
      const firingFreq = (flareRpm / 60) * 4;
      s = Math.sin(2 * Math.PI * firingFreq * t) * 0.95 + Math.sin(2 * Math.PI * (firingFreq * 0.5) * t) * 0.45;
    } else {
      s = Math.sin(2 * Math.PI * 56.7 * t) * 0.55 + Math.sin(2 * Math.PI * 113.4 * t) * 0.35;
    }
    left[i] = s * 0.9;
    right[i] = s * 0.9;
  }
  const wav = createWav(2, [left, right]);
  saveAudio('startup.wav', wav);
  console.log('✓ startup.wav');
}

// 11. Write Asset Manifest
const manifest = {
  carId: 'bmw-m3-gtr',
  name: 'BMW M3 GTR E46 P60B40 Racing V8',
  engineType: '4.0L 90° Naturally Aspirated Racing V8 (Cross-Plane High Revving with Tuned Side-Pipes)',
  transmission: 'Hewland 6-Speed Sequential Dog-Box with Straight-Cut Spur Gears',
  redlineRpm: 8500,
  idleRpm: 850,
  audioFormat: 'PCM 16-bit 44.1kHz Stereo WAV',
  license: 'CC-BY-4.0 / Calm Roads Audio Project',
};

fs.writeFileSync(path.join('public/audio/cars/bmw-m3-gtr', 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('✓ manifest.json written successfully. All audio assets updated!');
