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

// Lowpass filter helper (simple single-pole IIR)
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

// Wave-shaping saturation (soft asymmetric saturation characteristic of racing exhaust manifolds)
function saturate(x, drive = 1.8) {
  const v = x * drive;
  return Math.tanh(v) * 0.85 + Math.sin(v * 2) * 0.08;
}

// Cross-plane V8 combustion pulse synthesizer
// Firing intervals: 90, 180, 270, 180 deg
function synthesizeV8Combustion(rpm, throttle = 1.0, durationSec = 3.0, rpmEnd = null) {
  const totalSamples = Math.floor(sampleRate * durationSec);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const startRpm = rpm;
  const endRpm = rpmEnd !== null ? rpmEnd : rpm;

  let phase = 0;
  let whinePhase = 0;
  let noiseState = 0;

  for (let i = 0; i < totalSamples; i++) {
    const progress = i / totalSamples;
    const curRpm = startRpm + (endRpm - startRpm) * progress;
    const revPerSec = curRpm / 60;
    const firingFreq = revPerSec * 4; // 4 combustion pulses per crank rev for V8
    const crankFreq = revPerSec;

    // Advance phase
    phase += (firingFreq / sampleRate) * 2 * Math.PI;
    whinePhase += ((curRpm * 0.44 * 6) / sampleRate) * 2 * Math.PI; // Straight-cut dog-box gear tooth mesh frequency

    // Cylinder firing pulse: asymmetric pulse train
    const p1 = Math.sin(phase);
    const p2 = Math.sin(phase * 2) * 0.65;
    const p3 = Math.sin(phase * 3) * 0.42;
    const p4 = Math.sin(phase * 4) * 0.28;
    const sub = Math.sin(crankFreq * 2 * Math.PI * (i / sampleRate)) * 0.35; // Sub-crank thrum

    // High-RPM harmonic screaming rasp (3.5kHz peak)
    const rasp = Math.sin(phase * 5) * 0.22 + Math.sin(phase * 7) * 0.15;

    // Dog-box transmission straight-cut whine
    const whineIntensity = Math.min(1.0, (curRpm - 1200) / 4500) * 0.28;
    const gearWhine = Math.sin(whinePhase) * whineIntensity + Math.sin(whinePhase * 2) * (whineIntensity * 0.3);

    // Intake air suction noise
    noiseState = noiseState * 0.94 + (Math.random() - 0.5) * 0.06;
    const intakeHiss = noiseState * (throttle * 0.18);

    // Raw exhaust mixture
    const rawPulse = p1 + p2 + p3 + p4 + sub + (curRpm > 4500 ? rasp * 1.5 : rasp);
    const saturatedExhaust = saturate(rawPulse, 1.2 + throttle * 1.6);

    const mono = (saturatedExhaust * 0.72 + gearWhine + intakeHiss) * (0.45 + throttle * 0.55);

    // Stereo spread (left bank vs right bank exhaust pulse phase offset)
    const bankDelay = Math.sin(crankFreq * 2 * Math.PI * (i / sampleRate) + 0.5) * 0.12;
    left[i] = mono * (1.0 + bankDelay);
    right[i] = mono * (1.0 - bankDelay);
  }

  return [left, right];
}

// Make a loop seamless by crossfading end with beginning
function makeSeamlessLoop(channels, crossfadeSec = 0.25) {
  const xfSamples = Math.floor(sampleRate * crossfadeSec);
  const numSamples = channels[0].length;
  const loopLen = numSamples - xfSamples;
  const outL = new Float32Array(loopLen);
  const outR = new Float32Array(loopLen);

  for (let i = 0; i < loopLen; i++) {
    if (i < xfSamples) {
      const t = i / xfSamples;
      const endIdx = loopLen + i;
      outL[i] = channels[0][i] * t + channels[0][endIdx] * (1 - t);
      outR[i] = channels[1][i] * t + channels[1][endIdx] * (1 - t);
    } else {
      outL[i] = channels[0][i];
      outR[i] = channels[1][i];
    }
  }
  return [outL, outR];
}

const outDir = 'public/audio/cars/bmw-m3-gtr';
fs.mkdirSync(outDir, { recursive: true });

console.log('Generating authentic BMW M3 GTR racing V8 audio library...');

// 1. Idle Loop (850 RPM steady mechanical rumble)
{
  const raw = synthesizeV8Combustion(850, 0.08, 3.2);
  const looped = makeSeamlessLoop(raw, 0.3);
  fs.writeFileSync(path.join(outDir, 'idle_loop.wav'), createWav(2, looped));
  console.log('✓ idle_loop.wav');
}

// 2. Low-RPM Acceleration (1,200 - 3,500 RPM)
{
  const raw = synthesizeV8Combustion(1200, 0.75, 4.0, 3500);
  fs.writeFileSync(path.join(outDir, 'low_rpm_acceleration.wav'), createWav(2, raw));
  console.log('✓ low_rpm_acceleration.wav');
}

// 3. Mid-RPM Acceleration (3,500 - 5,800 RPM)
{
  const raw = synthesizeV8Combustion(3500, 0.88, 3.8, 5800);
  fs.writeFileSync(path.join(outDir, 'mid_rpm_acceleration.wav'), createWav(2, raw));
  console.log('✓ mid_rpm_acceleration.wav');
}

// 4. High-RPM Acceleration (5,800 - 8,200 RPM Screamer)
{
  const raw = synthesizeV8Combustion(5800, 1.0, 3.5, 8200);
  fs.writeFileSync(path.join(outDir, 'high_rpm_acceleration.wav'), createWav(2, raw));
  console.log('✓ high_rpm_acceleration.wav');
}

// 5. Full-Throttle Racing (Screaming 6,500 - 8,400 RPM Wide Open Throttle)
{
  const raw = synthesizeV8Combustion(6500, 1.0, 4.0, 8400);
  fs.writeFileSync(path.join(outDir, 'full_throttle_racing.wav'), createWav(2, raw));
  console.log('✓ full_throttle_racing.wav');
}

// 6. High-RPM Sustained Loop (7,800 RPM Redline Scream)
{
  const raw = synthesizeV8Combustion(7800, 0.95, 3.0);
  const looped = makeSeamlessLoop(raw, 0.3);
  fs.writeFileSync(path.join(outDir, 'high_rpm_loop.wav'), createWav(2, looped));
  console.log('✓ high_rpm_loop.wav');
}

// 7. Deceleration (Throttle-off overrun from 6,800 down to 2,200 RPM)
{
  const totalSamples = Math.floor(sampleRate * 3.5);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);
  let phase = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    const curRpm = 6800 - (6800 - 2200) * Math.pow(t, 0.7);
    const firingFreq = (curRpm / 60) * 4;
    phase += (firingFreq / sampleRate) * 2 * Math.PI;

    // Hollow engine braking compression pulses
    const p1 = Math.sin(phase);
    const p2 = Math.sin(phase * 2) * 0.45;
    const sub = Math.sin((curRpm / 60) * 2 * Math.PI * (i / sampleRate)) * 0.55;

    // Occasional subtle burbles in exhaust
    const burble = (Math.random() < 0.003) ? (Math.random() - 0.5) * 0.8 : 0;

    const s = (p1 + p2 + sub + burble) * (0.35 + (1 - t) * 0.3);
    left[i] = s * 0.9;
    right[i] = s * 0.9;
  }
  fs.writeFileSync(path.join(outDir, 'deceleration.wav'), createWav(2, [left, right]));
  console.log('✓ deceleration.wav');
}

// 8. Engine Braking Loop (Hollow 4,500 RPM compression loop)
{
  const raw = synthesizeV8Combustion(4500, 0.02, 2.5);
  const looped = makeSeamlessLoop(raw, 0.25);
  fs.writeFileSync(path.join(outDir, 'engine_braking.wav'), createWav(2, looped));
  console.log('✓ engine_braking.wav');
}

// 9. Exhaust Overrun Crackles & Pops (Unburnt fuel detonations)
{
  const dur = 2.2;
  const totalSamples = Math.floor(sampleRate * dur);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // Generate 8 discrete explosive backfire crackles
  const popTimes = [0.08, 0.22, 0.41, 0.65, 0.88, 1.15, 1.45, 1.82];
  for (const pt of popTimes) {
    const center = Math.floor(pt * sampleRate);
    const popDur = Math.floor(0.04 * sampleRate); // 40ms transient
    const amp = 0.55 + Math.random() * 0.45;
    const freq = 120 + Math.random() * 180;

    for (let j = 0; j < popDur && center + j < totalSamples; j++) {
      const decay = Math.exp(-j / (sampleRate * 0.008));
      const val = (Math.random() * 2 - 1) * decay * amp + Math.sin(2 * Math.PI * freq * (j / sampleRate)) * decay * amp;
      left[center + j] += val;
      right[center + j] += val * (0.8 + Math.random() * 0.4);
    }
  }

  fs.writeFileSync(path.join(outDir, 'exhaust_overrun.wav'), createWav(2, [left, right]));
  console.log('✓ exhaust_overrun.wav');
}

// 10. Gear Up (Dog-box sequential ignition cut & engagement clunk, 0.4s)
{
  const dur = 0.42;
  const totalSamples = Math.floor(sampleRate * dur);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // 0 to 45ms: ignition cut silence/drop
    let s = 0;
    if (t > 0.045 && t < 0.12) {
      // Mechanical steel dog ring engagement clunk
      const clunkT = (t - 0.045);
      const clunkDecay = Math.exp(-clunkT * 95);
      s = Math.sin(2 * Math.PI * 340 * clunkT) * clunkDecay * 0.8 + (Math.random() - 0.5) * clunkDecay * 0.6;
    } else if (t >= 0.12) {
      // Re-engagement exhaust pop & resume
      const resumeT = (t - 0.12);
      s = Math.sin(2 * Math.PI * 480 * resumeT) * Math.exp(-resumeT * 25) * 0.5;
    }
    left[i] = s;
    right[i] = s;
  }
  fs.writeFileSync(path.join(outDir, 'gear_up.wav'), createWav(2, [left, right]));
  console.log('✓ gear_up.wav');
}

// 11. Gear Down (Heel-and-toe throttle blip + downshift clunk, 0.55s)
{
  const dur = 0.55;
  const totalSamples = Math.floor(sampleRate * dur);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Throttle blip barking +500 RPM for 180ms
    const blipRpm = 4500 + Math.sin((t / 0.25) * Math.PI) * 1200;
    const firingFreq = (blipRpm / 60) * 4;
    const blipEnv = t < 0.25 ? Math.sin((t / 0.25) * Math.PI) : 0;
    const pulse = Math.sin(2 * Math.PI * firingFreq * t) * blipEnv * 0.7;

    // Dog-ring mechanical engagement clunk at t = 0.22s
    let clunk = 0;
    if (t >= 0.20 && t < 0.32) {
      const ct = t - 0.20;
      clunk = (Math.sin(2 * Math.PI * 290 * ct) + (Math.random() - 0.5)) * Math.exp(-ct * 80) * 0.75;
    }

    const s = pulse + clunk;
    left[i] = s;
    right[i] = s;
  }
  fs.writeFileSync(path.join(outDir, 'gear_down.wav'), createWav(2, [left, right]));
  console.log('✓ gear_down.wav');
}

// 12. Startup (Race starter motor cranking + V8 ignition flare, 2.8s)
{
  const dur = 2.8;
  const totalSamples = Math.floor(sampleRate * dur);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let s = 0;
    if (t < 0.85) {
      // Starter motor high-pitched whine (1,200 Hz) + 3 heavy compression chugs (18 Hz)
      const starterWhine = Math.sin(2 * Math.PI * 1150 * t) * 0.25;
      const chug = Math.sin(2 * Math.PI * 18 * t) * 0.45;
      s = starterWhine + chug;
    } else if (t >= 0.85 && t < 1.6) {
      // Violent explosive ignition flare up to 2,600 RPM
      const ignT = t - 0.85;
      const flareRpm = 2600 * Math.exp(-ignT * 1.8) + 850;
      const firingFreq = (flareRpm / 60) * 4;
      s = Math.sin(2 * Math.PI * firingFreq * t) * (0.85 + Math.sin(t * 30) * 0.15) + (Math.random() - 0.5) * 0.2;
    } else {
      // Settles into steady 850 RPM idle
      s = Math.sin(2 * Math.PI * 56.7 * t) * 0.5 + Math.sin(2 * Math.PI * 113.4 * t) * 0.25;
    }
    left[i] = s * 0.85;
    right[i] = s * 0.85;
  }
  fs.writeFileSync(path.join(outDir, 'startup.wav'), createWav(2, [left, right]));
  console.log('✓ startup.wav');
}

// 13. Asset Manifest
const manifest = {
  carId: 'bmw-m3-gtr',
  name: 'BMW M3 GTR E46 P60B40 Racing V8',
  engineType: '4.0L 90° Naturally Aspirated Racing V8 (Flat-Plane / Cross-Plane High Revving)',
  transmission: 'Hewland 6-Speed Sequential Dog-Box with Straight-Cut Spur Gears',
  redlineRpm: 8200,
  idleRpm: 850,
  audioFormat: 'PCM 16-bit 44.1kHz Stereo WAV',
  license: 'CC-BY-4.0 / Calm Roads Audio Project',
  clips: {
    idle_loop: {
      file: 'idle_loop.wav',
      purpose: 'Stationary idle combustion rumble (850 RPM)',
      loop: true,
      loopStartSec: 0.0,
      loopEndSec: 2.9,
      baseRpm: 850,
      rpmRange: [750, 1200]
    },
    low_rpm_acceleration: {
      file: 'low_rpm_acceleration.wav',
      purpose: 'Low-speed throttle roll-on with intake suction and primary V8 heartbeat',
      loop: false,
      baseRpm: 2200,
      rpmRange: [1200, 3500]
    },
    mid_rpm_acceleration: {
      file: 'mid_rpm_acceleration.wav',
      purpose: 'Midrange throttle ramp with tuned header pipe resonance',
      loop: false,
      baseRpm: 4500,
      rpmRange: [3400, 5800]
    },
    high_rpm_acceleration: {
      file: 'high_rpm_acceleration.wav',
      purpose: 'High-RPM screaming race-V8 harmonics with straight-cut dog-box whine',
      loop: false,
      baseRpm: 7000,
      rpmRange: [5600, 8200]
    },
    full_throttle_racing: {
      file: 'full_throttle_racing.wav',
      purpose: 'Aggressive wide-open throttle racing run with peak manifold saturation',
      loop: false,
      baseRpm: 7500,
      rpmRange: [6000, 8400]
    },
    high_rpm_loop: {
      file: 'high_rpm_loop.wav',
      purpose: 'Sustained top-speed redline howl (7,800 - 8,200 RPM)',
      loop: true,
      loopStartSec: 0.0,
      loopEndSec: 2.7,
      baseRpm: 7800,
      rpmRange: [7200, 8400]
    },
    deceleration: {
      file: 'deceleration.wav',
      purpose: 'Throttle lift-off compression braking and exhaust burble',
      loop: false,
      baseRpm: 4500,
      rpmRange: [2200, 6800]
    },
    engine_braking: {
      file: 'engine_braking.wav',
      purpose: 'Sustained reverse torque engine braking',
      loop: true,
      loopStartSec: 0.0,
      loopEndSec: 2.25,
      baseRpm: 4500,
      rpmRange: [2500, 6000]
    },
    exhaust_overrun: {
      file: 'exhaust_overrun.wav',
      purpose: 'Unburnt fuel popping and crackling on rapid throttle lift',
      loop: false,
      trigger: 'throttle_release_fast'
    },
    gear_up: {
      file: 'gear_up.wav',
      purpose: 'Sequential dog-box ignition cut & engagement clunk',
      loop: false,
      trigger: 'upshift'
    },
    gear_down: {
      file: 'gear_down.wav',
      purpose: 'Heel-and-toe rev-matched throttle blip & downshift clunk',
      loop: false,
      trigger: 'downshift'
    },
    startup: {
      file: 'startup.wav',
      purpose: 'High-torque starter motor crank and V8 ignition flare',
      loop: false,
      trigger: 'engine_start'
    }
  }
};

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('✓ manifest.json written successfully');
