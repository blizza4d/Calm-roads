function testRoadCenter(z, char, macro, seedCfg) {
  const f = seedCfg.freqScale;
  const hairpinGate = Math.max(0.0, Math.min(1.0, (macro.roadCurvature - 0.25) / 0.55));

  // Switchbacks with calibrated wavelength ~260m and smooth curvature (R >= 45m)
  const hairpin = Math.sin(z * 0.022 * f + seedCfg.phase1) * (char.hairpinAmplitude * 0.55);
  const technicalChicane = Math.sin(z * 0.031 * f + seedCfg.phase2) * (char.hairpinAmplitude * 0.18);
  const switchbacks = (hairpin + technicalChicane) * char.switchbackWeight * hairpinGate;

  const sCurveMultiplier = macro.roadCurvature * 0.95;
  const sCurves = (Math.sin(z * 0.0125 * f + seedCfg.phase3) * 16.0 + Math.cos(z * 0.0095 * f + seedCfg.phase4) * 12.0) * char.sCurveWeight * sCurveMultiplier;

  const sweepMultiplier = 0.35 + 0.65 * macro.roadCurvature;
  const valleySweeps = (Math.sin(z * 0.0042 * f + seedCfg.phase5) * 24.0 + Math.sin(z * 0.0022 * f + seedCfg.phase6) * 15.0) * char.valleySweepWeight * sweepMultiplier;

  return switchbacks + sCurves + valleySweeps;
}

import { setWorldGenerationConfig, getInterpolatedBiomeCharacter, getInterpolatedMacroProfile, BIOME_ROAD_CHARACTERS } from '../src/utils/roadMath.ts';

const biomes = ['desert', 'twisted_mountains', 'alpine', 'plains', 'rolling_hills', 'coastal'];

for (const b of biomes) {
  setWorldGenerationConfig(1337, b, 0);
  const char = BIOME_ROAD_CHARACTERS[b];
  const macro = getInterpolatedMacroProfile(0);
  const seedCfg = { freqScale: 1.0, phase1: 0, phase2: 1.2, phase3: 2.4, phase4: 3.6, phase5: 4.8, phase6: 5.9 };

  let maxCurv = 0;
  for (let z = 1000; z >= -1000; z -= 1.0) {
    const c1 = testRoadCenter(z + 1, char, macro, seedCfg);
    const c2 = testRoadCenter(z, char, macro, seedCfg);
    const c3 = testRoadCenter(z - 1, char, macro, seedCfg);
    const curv = Math.abs(c3 - 2 * c2 + c1);
    if (curv > maxCurv) maxCurv = curv;
  }
  const minR = 1 / maxCurv;
  console.log(`Biome: ${b.padEnd(18)} | MaxCurv: ${maxCurv.toFixed(4)} | Min Radius: ${minR.toFixed(1)}m`);
}
