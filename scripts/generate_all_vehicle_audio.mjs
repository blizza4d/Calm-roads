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

// Resonant Bandpass Filter
class ResonantFilter {
  constructor(freq, q = 2.5) {
    this.setParams(freq, q);
    this.x1 = 0; this.x2 = 0;
    this.y1 = 0; this.y2 = 0;
  }
  setParams(freq, q) {
    const w0 = 2 * Math.PI * Math.min(freq, sampleRate * 0.48) / sampleRate;
    const alpha = Math.sin(w0) / (2 * Math.max(0.1, q));
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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function saveAudio(folder, filename, wavBuffer) {
  ensureDir(folder);
  fs.writeFileSync(path.join(folder, filename), wavBuffer);
}

console.log('=== GENERATING CUSTOM AUDIO PROFILES FOR ALL 5 CALM ROADS VEHICLES ===');

// ============================================================================
// 1. BMW M3 GTR '05: 4.0L P60B40 Racing V8 + Straight-Cut Spur Gearbox
// ============================================================================
function generateBmwAudio(outDir) {
  console.log(`Generating BMW M3 GTR Audio -> ${outDir}`);

  // Synthesizer helper for V8 crossplane
  function genV8(rpm, throttle = 1.0, duration = 3.2, gearWhineLevel = 0.35) {
    const totalSamples = Math.floor(sampleRate * duration);
    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);
    const revPerSec = rpm / 60;
    const radPerSec = revPerSec * 2 * Math.PI;
    const cycleRad = 4 * Math.PI;
    let crankAngle = 0;
    let whineAngle = 0;

    const b1Angles = [0, Math.PI, 1.5 * Math.PI, 2.5 * Math.PI];
    const b2Angles = [0.5 * Math.PI, 2.0 * Math.PI, 3.0 * Math.PI, 3.5 * Math.PI];
    const f1 = new ResonantFilter(180, 2.6);
    const f2 = new ResonantFilter(420, 2.2);

    for (let i = 0; i < totalSamples; i++) {
      crankAngle += radPerSec / sampleRate;
      const cPos = crankAngle % cycleRad;

      let p1 = 0, p2 = 0;
      for (let c = 0; c < 4; c++) {
        let d1 = cPos - b1Angles[c]; if (d1 < 0) d1 += cycleRad;
        if (d1 < 1.15) {
          const tRel = d1 / 1.15;
          p1 += Math.sin(Math.PI * Math.pow(tRel, 0.38)) * Math.exp(-3.2 * tRel);
        }
        let d2 = cPos - b2Angles[c]; if (d2 < 0) d2 += cycleRad;
        if (d2 < 1.15) {
          const tRel = d2 / 1.15;
          p2 += Math.sin(Math.PI * Math.pow(tRel, 0.38)) * Math.exp(-3.2 * tRel);
        }
      }

      // Straight-cut transmission whine (harmonic of engine speed)
      whineAngle += (radPerSec * 3.8) / sampleRate;
      const gearWhine = Math.sin(whineAngle) * 0.18 + Math.sin(whineAngle * 2.0) * 0.08;

      let sL = (p1 * 0.75 + p2 * 0.25) * throttle + gearWhine * gearWhineLevel;
      let sR = (p2 * 0.75 + p1 * 0.25) * throttle + gearWhine * gearWhineLevel;

      sL = f1.process(sL) * 0.7 + f2.process(sL) * 0.5;
      sR = f1.process(sR) * 0.7 + f2.process(sR) * 0.5;

      // Soft saturation
      left[i] = Math.tanh(sL * 1.5) * 0.85;
      right[i] = Math.tanh(sR * 1.5) * 0.85;
    }
    return createWav(2, [left, right]);
  }

  saveAudio(outDir, 'idle.wav', genV8(880, 0.35, 3.2, 0.05));
  saveAudio(outDir, 'low_rpm.wav', genV8(2400, 0.75, 3.2, 0.22));
  saveAudio(outDir, 'mid_rpm.wav', genV8(4800, 0.90, 3.2, 0.40));
  saveAudio(outDir, 'high_rpm.wav', genV8(7400, 1.0, 3.2, 0.55));

  // Deceleration / Engine Braking
  {
    const dur = 3.0;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const curRpm = 6500 * Math.exp(-t * 0.6) + 1200;
      const freq = (curRpm / 60) * 4;
      const gearWhine = Math.sin(2 * Math.PI * freq * 1.9 * t) * 0.35;
      const rumble = Math.sin(2 * Math.PI * freq * t) * 0.45 + Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.35;
      const crackle = (Math.random() > 0.992) ? (Math.random() - 0.5) * 1.2 : 0;
      const s = rumble * 0.5 + gearWhine * 0.4 + crackle;
      left[i] = s * 0.85;
      right[i] = s * 0.85;
    }
    saveAudio(outDir, 'off_throttle.wav', createWav(2, [left, right]));
  }

  // Gear Shift Transient
  {
    const dur = 0.28;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const thud = Math.sin(2 * Math.PI * 95 * t) * Math.exp(-t * 35) * 0.9;
      const click = Math.sin(2 * Math.PI * 1850 * t) * Math.exp(-t * 90) * 0.65;
      const pop = (t > 0.05 && t < 0.12) ? Math.sin(2 * Math.PI * 140 * (t - 0.05)) * Math.exp(-(t - 0.05) * 55) * 0.85 : 0;
      const s = thud + click + pop;
      left[i] = s; right[i] = s;
    }
    saveAudio(outDir, 'gear_shift.wav', createWav(2, [left, right]));
  }

  // Exhaust Overrun Pops
  {
    const dur = 0.45;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      let p = 0;
      if (t < 0.12) p += Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 45) * 0.95;
      if (t > 0.08 && t < 0.24) p += Math.sin(2 * Math.PI * 165 * (t - 0.08)) * Math.exp(-(t - 0.08) * 50) * 0.8;
      if (t > 0.18 && t < 0.38) p += Math.sin(2 * Math.PI * 210 * (t - 0.18)) * Math.exp(-(t - 0.18) * 60) * 0.65;
      const crackle = (Math.random() - 0.5) * Math.exp(-t * 12) * 0.45;
      left[i] = (p + crackle) * 0.9;
      right[i] = (p + crackle) * 0.9;
    }
    saveAudio(outDir, 'overrun.wav', createWav(2, [left, right]));
  }
}

// ============================================================================
// 2. SUPERCAR: High-Revving 9,000 RPM Exotic Italian V10/V12
// ============================================================================
function generateSupercarAudio(outDir) {
  console.log(`Generating Supercar V10 Audio -> ${outDir}`);

  function genV10(rpm, throttle = 1.0, duration = 3.2) {
    const totalSamples = Math.floor(sampleRate * duration);
    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);
    const revPerSec = rpm / 60;
    const firingFreq = revPerSec * 5.0; // 10 cylinders / 2 revs = 5 firings per rev

    const f1 = new ResonantFilter(320, 3.2); // Mid-throat resonance
    const f2 = new ResonantFilter(840, 2.8); // Screaming high harmonic acoustic cavity

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      // V10 firing tone: strong 1st, 2nd, 3rd, and 5th harmonics for the iconic metallic scream
      const h1 = Math.sin(2 * Math.PI * firingFreq * t) * 0.8;
      const h2 = Math.sin(2 * Math.PI * (firingFreq * 2.0) * t + 0.4) * 0.55;
      const h3 = Math.sin(2 * Math.PI * (firingFreq * 3.0) * t + 0.8) * 0.35;
      const h5 = Math.sin(2 * Math.PI * (firingFreq * 5.0) * t + 1.2) * 0.22;
      const sub = Math.sin(2 * Math.PI * (firingFreq * 0.5) * t) * 0.45;

      let s = (h1 + h2 + h3 + h5 + sub) * throttle;
      s = f1.process(s) * 0.6 + f2.process(s) * 0.7;
      s = Math.tanh(s * 1.6) * 0.88;

      left[i] = s;
      right[i] = s * 0.98;
    }
    return createWav(2, [left, right]);
  }

  saveAudio(outDir, 'idle.wav', genV10(1050, 0.4, 3.2));
  saveAudio(outDir, 'low_rpm.wav', genV10(3000, 0.75, 3.2));
  saveAudio(outDir, 'mid_rpm.wav', genV10(5800, 0.90, 3.2));
  saveAudio(outDir, 'high_rpm.wav', genV10(8600, 1.0, 3.2));

  // Supercar Deceleration
  {
    const dur = 3.0;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const curRpm = 7800 * Math.exp(-t * 0.75) + 1200;
      const freq = (curRpm / 60) * 5.0;
      const scream = Math.sin(2 * Math.PI * freq * t) * 0.45 + Math.sin(2 * Math.PI * (freq * 2) * t) * 0.25;
      const burble = (Math.random() > 0.985) ? (Math.random() - 0.5) * 1.4 : 0;
      const s = (scream * 0.6 + burble) * 0.85;
      left[i] = s; right[i] = s;
    }
    saveAudio(outDir, 'off_throttle.wav', createWav(2, [left, right]));
  }

  // Dual-Clutch Lightning Gear Snap
  {
    const dur = 0.18;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const snap = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 120) * 0.75;
      const boom = Math.sin(2 * Math.PI * 130 * t) * Math.exp(-t * 45) * 0.95;
      const s = snap + boom;
      left[i] = s; right[i] = s;
    }
    saveAudio(outDir, 'gear_shift.wav', createWav(2, [left, right]));
  }

  // Supercar Overrun Flame Crackle
  {
    const dur = 0.38;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const gunshot = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 55) * 0.95;
      const hiss = (Math.random() - 0.5) * Math.exp(-t * 25) * 0.5;
      left[i] = gunshot + hiss;
      right[i] = gunshot + hiss;
    }
    saveAudio(outDir, 'overrun.wav', createWav(2, [left, right]));
  }
}

// ============================================================================
// 3. HOVERCRAFT: Dual-Phase Magnetic Repulsor & Ion Turbine
// ============================================================================
function generateHovercraftAudio(outDir) {
  console.log(`Generating Hovercraft Audio -> ${outDir}`);

  function genIonThrust(thrustRatio, duration = 3.2) {
    const totalSamples = Math.floor(sampleRate * duration);
    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);

    const magHumBase = 46.0 + thrustRatio * 28.0; // 46 to 74 Hz deep magnetic flux
    const turbineBase = 220.0 + thrustRatio * 820.0; // 220 to 1040 Hz turbine whine
    const plasmaWash = 1800.0 + thrustRatio * 3200.0; // Shimmer

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      // Dual-phase magnetic hum
      const hum1 = Math.sin(2 * Math.PI * magHumBase * t) * 0.7;
      const hum2 = Math.sin(2 * Math.PI * (magHumBase * 2.02) * t + 0.3) * 0.45; // Subtle chorus beating

      // Ion turbine whine
      const turbine = Math.sin(2 * Math.PI * turbineBase * t) * (0.25 + thrustRatio * 0.45);
      const turbineHarmonic = Math.sin(2 * Math.PI * (turbineBase * 1.5) * t) * 0.18;

      // High-velocity plasma wash (filtered noise)
      const noise = (Math.random() - 0.5) * (0.08 + thrustRatio * 0.28);
      const plasma = Math.sin(2 * Math.PI * plasmaWash * t) * 0.08 * thrustRatio + noise;

      const sL = (hum1 + hum2 + turbine + turbineHarmonic + plasma) * 0.82;
      const sR = (hum1 + hum2 * 0.95 + turbine * 0.98 + turbineHarmonic * 1.02 + plasma) * 0.82;

      left[i] = Math.tanh(sL);
      right[i] = Math.tanh(sR);
    }
    return createWav(2, [left, right]);
  }

  saveAudio(outDir, 'idle.wav', genIonThrust(0.05, 3.2));
  saveAudio(outDir, 'low_rpm.wav', genIonThrust(0.35, 3.2));
  saveAudio(outDir, 'mid_rpm.wav', genIonThrust(0.70, 3.2));
  saveAudio(outDir, 'high_rpm.wav', genIonThrust(1.0, 3.2));

  // Hovercraft Deceleration / Regenerative Magnetic Braking
  {
    const dur = 3.0;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const curRatio = Math.max(0.1, 1.0 - t * 0.32);
      const freq = 650 * curRatio + 80;
      const whine = Math.sin(2 * Math.PI * freq * t) * 0.55 * curRatio;
      const airWash = (Math.random() - 0.5) * 0.35 * curRatio;
      const subRumble = Math.sin(2 * Math.PI * 48 * t) * 0.5;
      const s = whine + airWash + subRumble;
      left[i] = s * 0.85; right[i] = s * 0.85;
    }
    saveAudio(outDir, 'off_throttle.wav', createWav(2, [left, right]));
  }

  // Flux Mode / Gear Shift Discharge
  {
    const dur = 0.35;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const zap = Math.sin(2 * Math.PI * (1400 - t * 2400) * t) * Math.exp(-t * 22) * 0.8;
      const pulse = Math.sin(2 * Math.PI * 75 * t) * Math.exp(-t * 18) * 0.7;
      left[i] = zap + pulse;
      right[i] = zap + pulse;
    }
    saveAudio(outDir, 'gear_shift.wav', createWav(2, [left, right]));
  }

  // Overrun Plasma Vent
  {
    const dur = 0.40;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const whoosh = (Math.random() - 0.5) * Math.exp(-t * 14) * 0.85;
      const chirp = Math.sin(2 * Math.PI * (950 - t * 1200) * t) * Math.exp(-t * 28) * 0.5;
      left[i] = whoosh + chirp;
      right[i] = whoosh + chirp;
    }
    saveAudio(outDir, 'overrun.wav', createWav(2, [left, right]));
  }
}

// ============================================================================
// 4. CAMPER: 3.0L Heavy Turbo-Diesel Inline-6 + Pneumatic Air Brakes
// ============================================================================
function generateCamperAudio(outDir) {
  console.log(`Generating Camper Van Diesel Audio -> ${outDir}`);

  function genDiesel(rpm, throttle = 0.8, duration = 3.2) {
    const totalSamples = Math.floor(sampleRate * duration);
    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);
    const revPerSec = rpm / 60;
    const firingFreq = revPerSec * 3.0; // 6 cylinders / 2 revs = 3 firings per rev

    const fDieselKnock = new ResonantFilter(240, 2.2);
    const fLowGrunt = new ResonantFilter(85, 3.5);

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      // Heavy diesel clatter: asymmetric pulse with sharp compression knock
      const knock = Math.pow(Math.max(0, Math.sin(2 * Math.PI * firingFreq * t)), 3.5) * 1.1;
      const subThrum = Math.sin(2 * Math.PI * (firingFreq * 0.5) * t) * 0.65;
      const rumble = Math.sin(2 * Math.PI * firingFreq * t) * 0.5;

      // Turbo spool whistle under load
      const turboFreq = 1200 + (rpm / 3500) * 1800;
      const turboWhistle = Math.sin(2 * Math.PI * turboFreq * t) * (0.04 + throttle * 0.16);

      let s = (knock * 0.75 + subThrum + rumble) * (0.4 + throttle * 0.6) + turboWhistle;
      s = fLowGrunt.process(s) * 0.7 + fDieselKnock.process(s) * 0.6;
      s = Math.tanh(s * 1.4) * 0.9;

      left[i] = s;
      right[i] = s * 0.96;
    }
    return createWav(2, [left, right]);
  }

  saveAudio(outDir, 'idle.wav', genDiesel(680, 0.2, 3.2));
  saveAudio(outDir, 'low_rpm.wav', genDiesel(1450, 0.7, 3.2));
  saveAudio(outDir, 'mid_rpm.wav', genDiesel(2500, 0.85, 3.2));
  saveAudio(outDir, 'high_rpm.wav', genDiesel(3800, 1.0, 3.2));

  // Diesel Compression Engine Brake (Jake Brake chatter)
  {
    const dur = 3.0;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const curRpm = 3400 * Math.exp(-t * 0.5) + 800;
      const freq = (curRpm / 60) * 3;
      // Staccato Jake brake chug
      const chug = Math.pow(Math.max(0, Math.sin(2 * Math.PI * freq * t)), 4.0) * 0.85;
      const bass = Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.45;
      const s = (chug + bass) * 0.85;
      left[i] = s; right[i] = s;
    }
    saveAudio(outDir, 'off_throttle.wav', createWav(2, [left, right]));
  }

  // Pneumatic Air Brake Relief & Heavy Throw Shift
  {
    const dur = 0.42;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const clunk = Math.sin(2 * Math.PI * 65 * t) * Math.exp(-t * 25) * 0.85;
      const airHiss = (Math.random() - 0.5) * Math.exp(-t * 12) * 0.65;
      const s = clunk + airHiss;
      left[i] = s; right[i] = s;
    }
    saveAudio(outDir, 'gear_shift.wav', createWav(2, [left, right]));
  }

  // Turbo Wastegate Dump (Sigh)
  {
    const dur = 0.45;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const airRush = (Math.random() - 0.5) * Math.exp(-t * 9) * 0.75;
      left[i] = airRush; right[i] = airRush;
    }
    saveAudio(outDir, 'overrun.wav', createWav(2, [left, right]));
  }
}

// ============================================================================
// 5. HATCHBACK: 2.1L 5-Cylinder Turbo Rally Car + Wastegate Flutter (stututu)
// ============================================================================
function generateHatchbackAudio(outDir) {
  console.log(`Generating Rally Hatchback Audio -> ${outDir}`);

  function genRally(rpm, throttle = 1.0, duration = 3.2) {
    const totalSamples = Math.floor(sampleRate * duration);
    const left = new Float32Array(totalSamples);
    const right = new Float32Array(totalSamples);
    const revPerSec = rpm / 60;
    const firingFreq = revPerSec * 2.5; // 5 cylinders / 2 revs = 2.5 firings per rev

    const fThroat = new ResonantFilter(260, 2.5);
    const fRasp = new ResonantFilter(620, 2.2);

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      // Unique uneven 5-cylinder warble
      const p1 = Math.sin(2 * Math.PI * firingFreq * t) * 0.75;
      const p2 = Math.sin(2 * Math.PI * (firingFreq * 2.0) * t + 0.5) * 0.55;
      const p3 = Math.sin(2 * Math.PI * (firingFreq * 3.0) * t + 1.1) * 0.35;
      const unbalance = Math.sin(2 * Math.PI * revPerSec * t) * 0.3; // 1x crank unbalance gives classic 5-cyl growl!

      let s = (p1 + p2 + p3 + unbalance) * throttle;
      s = fThroat.process(s) * 0.65 + fRasp.process(s) * 0.65;
      s = Math.tanh(s * 1.5) * 0.88;

      left[i] = s;
      right[i] = s * 0.95;
    }
    return createWav(2, [left, right]);
  }

  saveAudio(outDir, 'idle.wav', genRally(940, 0.4, 3.2));
  saveAudio(outDir, 'low_rpm.wav', genRally(2500, 0.75, 3.2));
  saveAudio(outDir, 'mid_rpm.wav', genRally(4600, 0.90, 3.2));
  saveAudio(outDir, 'high_rpm.wav', genRally(7200, 1.0, 3.2));

  // Rally Off-Throttle: Wastegate Compressor Surge Flutter ("stutututu")
  {
    const dur = 2.8;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const curRpm = 6200 * Math.exp(-t * 0.7) + 1000;
      const freq = (curRpm / 60) * 2.5;
      const engineGrowl = Math.sin(2 * Math.PI * freq * t) * 0.35;

      // Iconic compressor surge flutter: ~14Hz amplitude modulation of 1.8kHz air whistle
      let flutter = 0;
      if (t < 1.1) {
        const flutterRate = 14.5;
        const mod = Math.max(0, Math.sin(2 * Math.PI * flutterRate * t)) * Math.exp(-t * 3.2);
        const airChirp = Math.sin(2 * Math.PI * 1750 * t) * mod * 0.75;
        const rush = (Math.random() - 0.5) * mod * 0.45;
        flutter = airChirp + rush;
      }
      const s = engineGrowl + flutter;
      left[i] = s * 0.88; right[i] = s * 0.88;
    }
    saveAudio(outDir, 'off_throttle.wav', createWav(2, [left, right]));
  }

  // Sequential Dog-Box Bang
  {
    const dur = 0.22;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const bang = Math.sin(2 * Math.PI * 160 * t) * Math.exp(-t * 40) * 0.95;
      const click = Math.sin(2 * Math.PI * 1400 * t) * Math.exp(-t * 80) * 0.65;
      const s = bang + click;
      left[i] = s; right[i] = s;
    }
    saveAudio(outDir, 'gear_shift.wav', createWav(2, [left, right]));
  }

  // Anti-Lag Gunshot Exhaust Pop
  {
    const dur = 0.35;
    const tot = Math.floor(sampleRate * dur);
    const left = new Float32Array(tot);
    const right = new Float32Array(tot);
    for (let i = 0; i < tot; i++) {
      const t = i / sampleRate;
      const gunshot = Math.sin(2 * Math.PI * 145 * t) * Math.exp(-t * 45) * 1.1;
      const crackle = (Math.random() - 0.5) * Math.exp(-t * 18) * 0.6;
      left[i] = Math.tanh(gunshot + crackle);
      right[i] = Math.tanh(gunshot + crackle);
    }
    saveAudio(outDir, 'overrun.wav', createWav(2, [left, right]));
  }
}

// Generate for all 5 vehicles in public/audio/cars/<vehicle_id>/
const baseDir = path.join('public', 'audio', 'cars');

generateBmwAudio(path.join(baseDir, 'bmw_m3'));
generateSupercarAudio(path.join(baseDir, 'supercar'));
generateHovercraftAudio(path.join(baseDir, 'hovercraft'));
generateCamperAudio(path.join(baseDir, 'camper'));
generateHatchbackAudio(path.join(baseDir, 'hatchback'));

// Also copy bmw_m3 audio to public/sounds for backward compatibility
const soundsDir = path.join('public', 'sounds');
ensureDir(soundsDir);
const bmwDir = path.join(baseDir, 'bmw_m3');
fs.readdirSync(bmwDir).forEach((file) => {
  fs.copyFileSync(path.join(bmwDir, file), path.join(soundsDir, file));
});

// Write comprehensive master manifest
const masterManifest = {
  version: '2.0.0',
  description: 'Calm Roads Multi-Vehicle Acoustic Audio Asset Registry',
  sampleRate: 44100,
  format: 'PCM 16-bit Stereo WAV / OGG Vorbis',
  license: 'CC-BY-4.0 / Calm Roads Audio Project',
  vehicles: {
    bmw_m3: {
      id: 'bmw_m3',
      name: "BMW M3 GTR '05",
      engineType: '4.0L P60B40 Naturally Aspirated 90° Racing V8',
      transmission: 'Hewland 6-Speed Sequential Dog-Box with Straight-Cut Spur Gears',
      redlineRpm: 8500,
      idleRpm: 880,
      soundCharacteristics: 'Screaming high-revving crossplane V8, straight-cut transmission whine, aggressive overrun crackles',
      files: {
        idle: '/audio/cars/bmw_m3/idle.wav',
        lowRPM: '/audio/cars/bmw_m3/low_rpm.wav',
        midRPM: '/audio/cars/bmw_m3/mid_rpm.wav',
        highRPM: '/audio/cars/bmw_m3/high_rpm.wav',
        offThrottle: '/audio/cars/bmw_m3/off_throttle.wav',
        gearShift: '/audio/cars/bmw_m3/gear_shift.wav',
        overrun: '/audio/cars/bmw_m3/overrun.wav',
      },
      rawRecordingLayers: ['/audio/raw/bmw_m3_gt2_2010.ogg', '/audio/raw/bmw_e46_engine.opus'],
    },
    supercar: {
      id: 'supercar',
      name: 'Veloce GT Supercar',
      engineType: '5.2L Naturally Aspirated 90° Exotic V10',
      transmission: '7-Speed Dual-Clutch Transmission (DCT)',
      redlineRpm: 9000,
      idleRpm: 1050,
      soundCharacteristics: 'Harmonic high-frequency F1 scream, instant laser throttle response, sharp crackling pops',
      files: {
        idle: '/audio/cars/supercar/idle.wav',
        lowRPM: '/audio/cars/supercar/low_rpm.wav',
        midRPM: '/audio/cars/supercar/mid_rpm.wav',
        highRPM: '/audio/cars/supercar/high_rpm.wav',
        offThrottle: '/audio/cars/supercar/off_throttle.wav',
        gearShift: '/audio/cars/supercar/gear_shift.wav',
        overrun: '/audio/cars/supercar/overrun.wav',
      },
      rawRecordingLayers: ['/audio/raw/v8_idle_and_revs.ogg'],
    },
    hovercraft: {
      id: 'hovercraft',
      name: 'AeroGlide Repulsorcraft',
      engineType: 'Dual-Phase Magnetic Levitation Coil & Twin Micro-Ion Turbines',
      transmission: 'Direct Flux Modulation Drive',
      redlineRpm: 12000,
      idleRpm: 450,
      soundCharacteristics: 'Deep magnetic sub-bass hum, rising ion turbine jet whine, reverse-thrust plasma wash',
      files: {
        idle: '/audio/cars/hovercraft/idle.wav',
        lowRPM: '/audio/cars/hovercraft/low_rpm.wav',
        midRPM: '/audio/cars/hovercraft/mid_rpm.wav',
        highRPM: '/audio/cars/hovercraft/high_rpm.wav',
        offThrottle: '/audio/cars/hovercraft/off_throttle.wav',
        gearShift: '/audio/cars/hovercraft/gear_shift.wav',
        overrun: '/audio/cars/hovercraft/overrun.wav',
      },
    },
    camper: {
      id: 'camper',
      name: 'Trailblazer Camper Van',
      engineType: '3.0L Heavy Turbo-Diesel Inline-6',
      transmission: 'Heavy-Duty 5-Speed Manual with Pneumatic Air-Assisted Linkage',
      redlineRpm: 4200,
      idleRpm: 680,
      soundCharacteristics: 'Heavy diesel compression clatter, torquey low-RPM grunt, turbo whistle, air brake relief hiss',
      files: {
        idle: '/audio/cars/camper/idle.wav',
        lowRPM: '/audio/cars/camper/low_rpm.wav',
        midRPM: '/audio/cars/camper/mid_rpm.wav',
        highRPM: '/audio/cars/camper/high_rpm.wav',
        offThrottle: '/audio/cars/camper/off_throttle.wav',
        gearShift: '/audio/cars/camper/gear_shift.wav',
        overrun: '/audio/cars/camper/overrun.wav',
      },
    },
    hatchback: {
      id: 'hatchback',
      name: 'Rallye Turbo Hatchback',
      engineType: '2.1L Turbocharged 5-Cylinder Group B Homologation Engine',
      transmission: 'Close-Ratio 5-Speed Sequential Dog-Box',
      redlineRpm: 7500,
      idleRpm: 940,
      soundCharacteristics: 'Uneven raspy 5-cylinder warble, turbo compressor surge wastegate flutter (stututu), anti-lag pops',
      files: {
        idle: '/audio/cars/hatchback/idle.wav',
        lowRPM: '/audio/cars/hatchback/low_rpm.wav',
        midRPM: '/audio/cars/hatchback/mid_rpm.wav',
        highRPM: '/audio/cars/hatchback/high_rpm.wav',
        offThrottle: '/audio/cars/hatchback/off_throttle.wav',
        gearShift: '/audio/cars/hatchback/gear_shift.wav',
        overrun: '/audio/cars/hatchback/overrun.wav',
      },
      rawRecordingLayers: ['/audio/raw/audi_quattro_rally.ogg'],
    },
  },
};

fs.writeFileSync(path.join('public', 'audio', 'manifest.json'), JSON.stringify(masterManifest, null, 2));
console.log('✓ Master Audio Manifest written to public/audio/manifest.json');
console.log('=== ALL AUDIO PROFILES GENERATED SUCCESSFULLY ===');
