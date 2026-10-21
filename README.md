# Calm Roads — Zen & Anti-Gravity Driving Odyssey 🚗✨

[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r163-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Stage3D / AS3](https://img.shields.io/badge/ActionScript-3.0_Stage3D-red.svg)](https://github.com/blizza4d/Calm-roads)

> A feature-rich, infinitely generating, cozy driving and anti-gravity racing experience inspired by *Slow Roads* and futuristic anti-gravity hovercraft physics.

---

## 🌟 Highlights & Systems

### 1. 🏎️ Advanced Vehicle Physics & Anti-Gravity Mode
- **Dual Driving Dynamics**:
  - **Standard Ground Mode**: Independent 4-wheel suspension with raycast contact detection, realistic body roll on turns, and progressive bump stops to prevent under-chassis clipping.
  - **Antigravity / Hover Mode**: Deploys quad downward repulsor coils floating 1.25m above any terrain surface, with authentic sci-fi inward banking into turns and low-friction inertia drifting.
- **Slope Gravity & Momentum**: Inclines exert realistic gravitational resistance ($a = -g \cdot \sin(\theta)$) requiring throttle to climb, while descents grant natural rolling momentum.
- **Heading-Aware Terrain Alignment**: The vehicle samples local elevation along its actual forward $\vec{F}$ and right $\vec{R}$ vectors, ensuring smooth navigation across hills and dunes in all 360 degrees.

### 2. 🌲 Infinite Procedural Terrain & Constant-Width Highway
- **Seamless Chunk Streaming**: Dynamically recycles 6 chunk tiles ($200\text{m}$ each) ahead of the player with strict geometry disposal (`.dispose()`) to prevent memory leaks.
- **Curved Ribbon Math**: Highway ribbon vertices are generated using mathematical curve normals ($nx, nz$) to eliminate road narrowing on curves.
- **Highway Markings**: Yellow dashed centerline, solid white shoulder boundary lines, and asphalt curbs.
- **4 Seamless Biomes**:
  - 🌲 **Lush Forest**: Tall evergreen pines, birch foliage, and stone boulders.
  - 🍂 **Autumn Mountains**: Crimson/amber maple trees, golden grass, and rugged ridges.
  - ❄️ **Snowy Tundra**: Pure snow cover, frosted snow pines, and icy road friction.
  - 🏜️ **Desert Dunes**: Golden terracotta sand dunes, Saguaro cacti, and sandstone spires.

### 3. 🚙 4 Detailed 3D Vehicle Models & Garage Customizer
- **BMW M3 GTR '05**: Iconic widebody race profile, dual vented hood louvers, front carbon splitter, high-mount rear GT wing, dual chrome exhaust tips, and BBS-style rims.
- **Futuristic Hovercraft**: Swept-back fuselage, bubble canopy, quad glowing repulsor disks, and twin rear ion thrusters.
- **Cozy Camper Van**: Two-tone retro body, roof rack surfboard, chrome hubcaps, and soft suspension travel.
- **Vintage Rally Hatchback**: Dual front circular fog lamps, white rally wheels, and responsive steering.
- **Real-Time Garage Customization**: Interactive palette picker for car body paint, metallic sheen, and surface roughness.

### 4. 🌅 Dynamic 24-Hour Atmosphere, Weather & Graphics
- **24-Hour Day/Night SkyDome**: Continuous celestial progression from sunrise to golden hour, deep twilight, and dark starry night with 4,200 stars.
- **Dynamic Moon & Soft Shadows**: Orbiting sun and moon directional light casters.
- **Atmospheric Weather**:
  - **Soft Rain**: Wet reflective asphalt (`roughness = 0.12`, `metalness = 0.42`), angled rain streaks, and overcast sky.
  - **Gentle Snow**: Floating harmonic snowflakes and winter haze.
  - **Morning Mist**: Volumetric rolling fog with headlight glow.
- **Cinematic Post-Processing**: `ToneMapping`, `Bloom` luminance threshold, and `Vignette`.
- **Authentic Headlight Projectors**: Dedicated forward target Object3Ds casting volumetric beams 40m+ down the highway.

### 5. 📻 Lo-Fi Radio & Procedural Audio Ecosystem
- **Auto-Unlock Audio**: Engine hum, tire friction, and hover repulsor resonance play immediately on first interaction.
- **Dynamic Sound Effects**: Engine pitch modulated by RPM, gravel surface friction on off-road terrain, and a classic dual-tone horn.
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
