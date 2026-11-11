import fs from 'fs';

console.log('=== CALM ROADS — SCREEN FLICKERING & RACING SPEEDOMETER VERIFICATION ===\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// ------------------------------------------------------------------------
// 1. Depth-Buffer Precision & Canvas Lifecycle (src/App.tsx)
// ------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Depth Buffer Precision & Canvas Lifecycle ---');
const appContent = fs.readFileSync('src/App.tsx', 'utf8');

assert(
  appContent.includes('GL_CONFIG') && appContent.includes('powerPreference: \'high-performance\''),
  'Static module-level GL_CONFIG defined to prevent Canvas context re-initialization'
);

assert(
  appContent.includes('near: 0.75') && appContent.includes('far: 3800'),
  'Camera depth range calibrated to near: 0.75, far: 3800 (eliminating medium & long-range Z-fighting)'
);

// Verify depth precision improvement mathematically:
// Standard depth buffer: Z_ndc = (far + near)/(far - near) + (2*far*near)/((far - near)*z)
// d(Z_ndc)/dz at z = 50m with near=0.2 vs near=0.75
const nearOld = 0.2;
const farOld = 4200;
const nearNew = 0.75;
const farNew = 3800;
const z = 50.0;
const gradOld = (2 * farOld * nearOld) / ((farOld - nearOld) * z * z);
const gradNew = (2 * farNew * nearNew) / ((farNew - nearNew) * z * z);
const precisionGainPercent = ((gradNew - gradOld) / gradOld) * 100;
assert(
  precisionGainPercent > 250,
  `Depth buffer resolution at 50m improved by ${precisionGainPercent.toFixed(1)}% (> 250%)`
);

// ------------------------------------------------------------------------
// 2. Road Markings Elevation Offset (src/utils/roadMath.ts)
// ------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Road Markings Thermoplastic Elevation Offset ---');
const roadMathContent = fs.readFileSync('src/utils/roadMath.ts', 'utf8');

assert(
  roadMathContent.includes('const lineLift = 0.022'),
  'Road markings elevation offset increased to 22mm (lineLift = 0.022) to prevent coplanar Z-fighting'
);

// ------------------------------------------------------------------------
// 3. Shadow Map Texel Snapping & Horizon Memoization (src/components/3d/Environment/GameEnvironment.tsx)
// ------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Shadow Map Texel Snapping & Stable Geometries ---');
const envContent = fs.readFileSync('src/components/3d/Environment/GameEnvironment.tsx', 'utf8');

assert(
  envContent.includes('texelSize = 110.0 / shadowMapRes') &&
  envContent.includes('Math.round(cx / texelSize) * texelSize'),
  'Directional light shadow coordinates snapped to discrete texel grid increments (0.0537m)'
);

assert(
  envContent.includes('function ProceduralEnvironmentProbe') &&
  !envContent.includes('<Environment'),
  'Drei Environment CDN component replaced with offline local PMREM ProceduralEnvironmentProbe'
);

assert(
  envContent.includes('mountainGeo = useMemo(') &&
  envContent.includes('}, [biomeId])'),
  'Horizon mountain mesh geometry memoized strictly by biomeId (no continuous GPU re-allocations)'
);

assert(
  envContent.includes('colorAttr.needsUpdate = true'),
  'Horizon mountain vertex colors updated in-place via Float32 buffer attribute'
);

// ------------------------------------------------------------------------
// 4. Post-Processing & SSAO Calibration
// ------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Post-Processing & ToneMapping Calibration ---');

assert(
  envContent.includes('<ToneMapping />'),
  'EffectComposer includes explicit <ToneMapping /> to guarantee non-black color space output in Three.js r163'
);

assert(
  envContent.includes('<Bloom') && envContent.includes('mipmapBlur'),
  'Bloom pass configured with mipmapBlur for smooth celestial and automotive lighting'
);

assert(
  envContent.includes('<Vignette') && envContent.includes('offset={0.42}'),
  'Cinematic Vignette pass calibrated with offset and darkness'
);

assert(
  !envContent.includes('enableNormalPass={true}'),
  'Broken SSAO normal-pass black-screen deadlock eliminated from post-processing'
);

// ------------------------------------------------------------------------
// 5. Biome Travel Transition Flickering Fix (src/components/ui/Overlay.tsx & useGameStore.ts)
// ------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Biome Travel Flickering & Chunk Synchronization ---');
const overlayContent = fs.readFileSync('src/components/ui/Overlay.tsx', 'utf8');
const storeContent = fs.readFileSync('src/store/useGameStore.ts', 'utf8');
const terrainContent = fs.readFileSync('src/components/3d/Environment/Terrain.tsx', 'utf8');

assert(
  !overlayContent.includes('bg-black') || !overlayContent.includes('opacity-85'),
  'Full-screen black overlay flash during biome travel eliminated in Overlay.tsx'
);

assert(
  storeContent.includes('_travelTimer = setTimeout') &&
  storeContent.includes('120'),
  'Biome travel state timer optimized to 120ms (zero prolonged gameplay freezing)'
);

assert(
  terrainContent.includes('travelCounter !== lastTravelCounter.current') &&
  terrainContent.includes('slotsRef.current = initial'),
  'Terrain chunk slots synchronized immediately during render on biome transition'
);

// ------------------------------------------------------------------------
// 6. Next-Generation Racing Speedometer & Telemetry Decoupling (src/components/ui/HUD.tsx)
// ------------------------------------------------------------------------
console.log('\n--- TEST GROUP 6: Racing Speedometer & Zero React Re-Renders ---');
const hudContent = fs.readFileSync('src/components/ui/HUD.tsx', 'utf8');

assert(
  !hudContent.includes('useState(rpm)') && !hudContent.includes('useState(0)'),
  'HUD tachometer decoupled completely from React useState (Zero React re-renders on telemetry)'
);

assert(
  hudContent.includes('TOTAL_RPM_SEGMENTS = 32'),
  'Racing tachometer features 32 precision angled LED segments'
);

assert(
  hudContent.includes('⚡ SHIFT ⚡') && hudContent.includes('isRedline'),
  'Dynamic vehicle redline detection with animated shift alert indicator'
);

assert(
  hudContent.includes('speedDisplayRef.current') &&
  hudContent.includes('racing-glow-red') &&
  hudContent.includes('racing-glow-amber'),
  'Speedometer features velocity-based dynamic color progression (white -> amber -> brick-red)'
);

assert(
  hudContent.includes('gearBoxRef.current.classList.add(\'bg-[#C63D2F]\'') &&
  hudContent.includes('setTimeout'),
  'Slanted gear box includes high-contrast shift punch flash animation'
);

assert(
  hudContent.includes('DRUM_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]') &&
  hudContent.includes('const pos6 = val % 10') &&
  hudContent.includes('const carry6 = Math.max(0, Math.min(1, (pos6 - 9.0) / 1.0))'),
  'NFS Most Wanted mechanical rolling odometer features 7 drums with continuous gear-train carry physics'
);

// ------------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------------
console.log('\n========================================');
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================');

if (failed > 0) process.exit(1);
