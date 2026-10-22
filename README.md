# Calm Roads — Zen & Anti-Gravity Driving Odyssey 🚗✨

[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r163-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Stage3D / AS3](https://img.shields.io/badge/ActionScript-3.0_Stage3D-red.svg)](https://github.com/blizza4d/Calm-roads)

> A feature-rich, infinitely generating, cozy driving and anti-gravity racing experience inspired by *Slow Roads* and futuristic anti-gravity hovercraft physics.

---

## 🌟 Highlights & Systems

### 1. 🏎️ Heavy, Smooth Vehicle Physics & Anti-Gravity Mode
- **Dual Driving Dynamics**:
  - **Standard Ground Mode**: Re-tuned realistic acceleration (down from arcadish spikes to smooth, heavy GT touring momentum), independent 4-wheel suspension with raycast ground tracking, speed-sensitive steering stabilization, and progressive bump stops.
  - **Antigravity / Hover Mode**: Deploys quad downward repulsor coils floating 1.25m above any terrain surface, with authentic sci-fi inward banking into turns and low-friction inertia drifting.
- **Slope Gravity & Momentum**: Inclines exert realistic gravitational resistance ($a = -g \cdot \sin(\theta)$) requiring throttle to climb, while descents grant natural rolling momentum.
- **Heading-Aware Terrain Alignment**: The vehicle samples local elevation along its actual forward $\vec{F}$ and right $\vec{R}$ vectors, ensuring smooth navigation across hills and dunes in all 360 degrees.

### 2. 🌲 Infinite Procedural Terrain, Realistic Camber & Highway Guardrails
- **Seamless Chunk Streaming**: Dynamically recycles 6 chunk tiles ($200\text{m}$ each) ahead of the player with strict geometry disposal (`.dispose()`) to prevent memory leaks.
- **Slope-Aware Terrain Relief**: Multi-octave FBM terrain featuring per-vertex slope coloring—steep rock strata blend naturally into lush grass and terracotta sand.
- **Road Crown Camber & Steel Guardrails**: Realistic highway crown drainage camber with outer curve W-beam steel guardrails and bevelled gravel shoulder transitions.
- **Highway Markings**: Yellow dashed centerline, solid white shoulder boundary lines, and asphalt curbs.
- **4 Seamless Biomes**:
  - 🌲 **Lush Forest**: Tall evergreen pines, birch foliage, and stone boulders.
  - 🍂 **Autumn Mountains**: Crimson/amber maple trees, golden grass, and rugged ridges.
  - ❄️ **Snowy Tundra**: Pure snow cover, frosted snow pines, and icy road friction.
  - 🏜️ **Desert Dunes**: Golden terracotta sand dunes, Saguaro cacti, and sandstone spires.

### 3. 🚙 4 Realistic Sculpted 3D Vehicle Models & Garage Customizer
- **BMW M3 GTR '05**: Sculpted GT widebody with blistered wheel arches, dual kidney grilles with chrome surrounds, vented power dome hood, carbon fiber roof, dual upright GT wing, quad titanium exhaust tips with hollow dark barrels, BBS cross-spoke wheels, and Brembo blue brake calipers with cross-drilled rotors.
- **Futuristic Stealth Hovercraft**: Faceted stealth fuselage, contoured canopy with high-reflectivity glass, glowing blue repulsor rings, and vectoring rear thrusters.
- **Vintage Camper Van**: Classic rounded microbus body with front chrome chevron, round fluted headlights, baby moon chrome hubcaps, and wooden roof rack with surfboard.
- **Rally Spec Hatchback**: Boxy flared rally arches, quad front rally pod lights, roof air scoop, rally mudflaps, and big-bore exhaust cannon.
- **Real-Time Garage Customization**: Interactive palette picker for car body paint, metallic sheen, and surface roughness.

### 4. 🌅 Dynamic 24-Hour Atmosphere, Weather & Graphics
- **24-Hour Day/Night SkyDome**: Continuous celestial progression from sunrise to golden hour, deep twilight, and dark starry night with 4,200 stars.
- **Dynamic Moon & Soft Shadows**: Orbiting sun and moon directional light casters with soft shadow biasing.
- **Atmospheric Weather**:
  - **Soft Rain**: Wet reflective asphalt (`roughness = 0.10`, `metalness = 0.45`), angled rain streaks, and overcast sky.
  - **Gentle Snow**: Floating harmonic snowflakes and winter haze.
  - **Morning Mist**: Volumetric rolling fog with headlight glow.
- **Cinematic Post-Processing**: ACESFilmic `ToneMapping`, `Bloom` luminance threshold, and `Vignette`.
- **Authentic Headlight Projectors**: Dedicated forward target Object3Ds casting volumetric beams 45m+ down the highway.

### 5. 📻 Roaring V8 Exhaust, Overrun Crackles, Lo-Fi Radio & Audio Ecosystem
- **BMW M3 GTR Dual Sound Engine**:
  - **Screaming Straight-Cut Gear Whine**: Raw high-RPM audio sample scaling from idle (0.72x) to maximum redline scream (1.82x) with vehicle speed and engine RPM.
  - **Throaty V8 Exhaust Roar**: Deep resonant exhaust bass (32 Hz - 350 Hz) that barks and roars on acceleration.
  - **Overrun Exhaust Crackles & Backfire Pops**: Rapid explosive exhaust crackles and unburnt fuel pops on deceleration and throttle lift-off!
- **Vehicle-Specific Acoustic Profiles**:
  - **Camper Van**: Rhythmic low-RPM air-cooled Boxer flat-4 putt-putt thrum.
  - **Rally Hatchback**: High-strung raspy 4-cylinder with turbocharger spool whine and atmospheric blow-off valve (BOV) hiss on throttle release.
  - **Hovercraft**: Sci-Fi frequency-modulated repulsor reactor pulse and ion thruster rushing air.
- **Dynamic Sound Effects**: Gravel surface friction on off-road terrain, and a classic dual-tone horn.
- **Cozy Lo-Fi Playlist**: 5 original ambient tracks with tape flutter and vinyl warmth.

### 6. 📱 Minimalist UI/UX & On-Screen Touch Pedals
- **Aesthetic Palette**: Refined Paper Cream (`#F4F1EA`) with Soft Charcoal (`#2A2A2A`), Sage Green (`#6B705C`), and Brick Red (`#B83B2F`) highlights.
- **On-Screen Touch Pedals**: Drive, Brake, Steer Left, Steer Right, and Horn buttons for full accessibility on mouse and touch devices.
- **Photo Mode**: Freezes physics, unlocks 360° free orbit camera, and captures full-resolution wallpaper screenshots.
- **Zen Mode**: Instant clean HUD-free immersion.

---

## 🎮 Controls

| Action | Keyboard | On-Screen UI |
| :--- | :--- | :--- |
| **Accelerate** | `W` or `↑` | **DRIVE** pedal |
| **Brake / Reverse** | `S` or `↓` | **BRAKE** pedal |
| **Steer Left / Right** | `A` / `D` or `←` / `→` | **←** / **→** buttons |
| **Handbrake / Drift** | `Spacebar` | Keyboard shortcut |
| **Horn** | `H` | **HORN** button |
| **Hover Mode Toggle** | `H` | **HOVER ON/OFF** pill |
| **Cycle Cameras** | `C` | **Chase / Cockpit / Drone / Bumper** |
| **Auto-Drive Cruise** | Click CRUISE | **CRUISE ON/OFF** pill |
| **Photo Mode** | `P` | Camera shutter icon |
| **Zen Mode** | `Z` | Eye icon |
| **Lo-Fi Radio** | `M` | Radio widget |
| **Fullscreen** | `F` | Fullscreen icon |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation
```bash
git clone https://github.com/blizza4d/Calm-roads.git
cd Calm-roads
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production
```bash
npm run build
```

---

## 📂 Project Structure

```
calm-roads/
├── as3/                               # ActionScript 3.0 / Stage3D Reference Engine
│   └── src/
│       ├── Main.as                    # Stage3D entry point & physics-render loop
│       └── com/antigrav/
│           ├── audio/VehicleAudioManager.as          # SampleDataEvent procedural DSP
│           ├── graphics/MaterialShaders.as           # AGAL metallic PBR & neon glow
│           ├── graphics/BloomPostProcess.as          # Stage3D bloom & glare render targets
│           ├── physics/AntiGravVehiclePhysics.as      # Quad-raycast repulsor hover physics
│           └── world/ProceduralTrackGenerator.as     # Parallel transport frame spline ribbon
├── src/                               # WebGL / React Three Fiber Production Codebase
│   ├── components/
│   │   ├── 3d/
│   │   │   ├── Environment/
│   │   │   │   ├── GameEnvironment.tsx  # Day/night sky, weather particles, lighting, post-processing
│   │   │   │   └── Terrain.tsx          # Infinite chunk streaming, road ribbon, markings, props
│   │   │   ├── Vehicles/
│   │   │   │   ├── CarModels.tsx        # BMW M3 GTR, Hovercraft, Camper, Hatchback models
│   │   │   │   └── VehicleController.tsx# Raycast suspension, slope physics, multi-camera, auto-drive
│   │   │   └── Experience.tsx           # R3F scene composition & Photo Mode OrbitControls
│   │   └── ui/
│   │       └── Overlay.tsx              # Minimalist HUD, virtual pedals, garage & atmosphere modals
│   ├── store/
│   │   └── useGameStore.ts              # Zustand global state (telemetry, weather, vehicles, audio)
│   ├── utils/
│   │   ├── audioSystem.ts               # Web Audio API engine, tire friction, horn, lo-fi player
│   │   └── roadMath.ts                  # Simplex noise terrain, slope vectors, road spline & normals
│   ├── App.tsx                          # Fullscreen canvas wrapper & keyboard controls
│   └── index.css                        # Tailwind v4 & Paper Cream glassmorphism styling
├── package.json
└── vite.config.ts
```

---

## 📄 License
MIT License. Created for cozy driving and high-speed anti-gravity exploration.
