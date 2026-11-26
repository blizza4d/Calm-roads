import type { VehicleModelType } from '../../../store/useGameStore'

export interface VehicleConfig {
  name: string
  massKg: number
  wheelRadius: number
  rideHeight: number
  wheelbase: number // Distance between front and rear axles (m)
  maxSteerAngle: number // Maximum front wheel steer lock (rad)
  maxSpeedMs: number
  maxSpeedKmh: number
  peakAccel: number
  brakeDecel: number
  dragCoeff: number // Aerodynamic drag factor
  downforceCoeff: number // Aerodynamic downforce
  turnRate: number
  tireGrip: number
  roadDamping: number
  offroadDamping: number
  gearRatios: number[] // Physical transmission gear ratios (1st, 2nd, ...)
  finalDrive: number // Final drive differential ratio
  reverseRatio: number // Reverse gear ratio
  idleRpm: number
  redlineRpm: number
  upshiftRpm: number
  downshiftRpm: number
  engineBraking: number
  drivetrain: 'rwd' | 'fwd' | 'awd'
}

export const VEHICLE_CONFIGS: Record<VehicleModelType, VehicleConfig> = {
  bmw_m3: {
    name: "BMW M3 GTR '05",
    massKg: 1350,
    wheelRadius: 0.34, // Exactly calibrated to 0.34m visual radius of tuner_wheel.glb
    rideHeight: 0.36,  // GT stance, 11.6cm front splitter clearance, perfect asphalt alignment
    wheelbase: 2.73,   // Authentic BMW M3 E46 2,731mm racing wheelbase
    maxSteerAngle: 0.40, // ~23° maximum lock
    maxSpeedMs: 76.4, // ~275 km/h
    maxSpeedKmh: 275,
    peakAccel: 6.8, // Progressive GT power curve
    brakeDecel: 28,
    dragCoeff: 0.32,
    downforceCoeff: 0.45,
    turnRate: 1.38,
    tireGrip: 1.15,
    roadDamping: 0.994,
    offroadDamping: 0.985,
    gearRatios: [3.25, 2.13, 1.58, 1.24, 1.00, 0.84],
    finalDrive: 3.85,
    reverseRatio: 3.40,
    idleRpm: 850,
    redlineRpm: 8500,
    upshiftRpm: 7400,
    downshiftRpm: 2800,
    engineBraking: 0.18,
    drivetrain: 'rwd',
  },
  supercar: {
    name: 'Modern Supercar',
    massKg: 1420,
    wheelRadius: 0.36,
    rideHeight: 0.38,
    wheelbase: 2.65,
    maxSteerAngle: 0.38,
    maxSpeedMs: 78.5, // ~282 km/h
    maxSpeedKmh: 282,
    peakAccel: 7.2, // Twin-turbo V8 power curve
    brakeDecel: 30,
    dragCoeff: 0.30,
    downforceCoeff: 0.50,
    turnRate: 1.45,
    tireGrip: 1.20,
    roadDamping: 0.995,
    offroadDamping: 0.985,
    gearRatios: [3.92, 2.44, 1.75, 1.30, 1.02, 0.84, 0.70],
    finalDrive: 3.44,
    reverseRatio: 3.55,
    idleRpm: 900,
    redlineRpm: 8800,
    upshiftRpm: 7800,
    downshiftRpm: 3000,
    engineBraking: 0.19,
    drivetrain: 'rwd',
  },
  hovercraft: {
    name: 'Antigravity Hovercraft',
    massKg: 980,
    wheelRadius: 0.32,
    rideHeight: 1.25,
    wheelbase: 2.80,
    maxSteerAngle: 0.35,
    maxSpeedMs: 86.1, // ~310 km/h
    maxSpeedKmh: 310,
    peakAccel: 7.6,
    brakeDecel: 22,
    dragCoeff: 0.22,
    downforceCoeff: 0.65,
    turnRate: 1.62,
    tireGrip: 0.85, // Low-friction inertia drift
    roadDamping: 0.997,
    offroadDamping: 0.996,
    gearRatios: [1.0],
    finalDrive: 1.0,
    reverseRatio: 1.0,
    idleRpm: 1000,
    redlineRpm: 9000,
    upshiftRpm: 9999,
    downshiftRpm: 0,
    engineBraking: 0.05,
    drivetrain: 'awd',
  },
  camper: {
    name: 'Cozy Camper Van',
    massKg: 1950,
    wheelRadius: 0.38,
    rideHeight: 0.48,
    wheelbase: 2.60,
    maxSteerAngle: 0.44,
    maxSpeedMs: 40.3, // ~145 km/h
    maxSpeedKmh: 145,
    peakAccel: 3.2, // Heavy vintage inertia
    brakeDecel: 19,
    dragCoeff: 0.44,
    downforceCoeff: 0.1,
    turnRate: 1.08,
    tireGrip: 0.95,
    roadDamping: 0.991,
    offroadDamping: 0.982,
    gearRatios: [4.15, 2.35, 1.45, 1.00, 0.78],
    finalDrive: 4.50,
    reverseRatio: 4.20,
    idleRpm: 700,
    redlineRpm: 4400,
    upshiftRpm: 3600,
    downshiftRpm: 1550,
    engineBraking: 0.14,
    drivetrain: 'rwd',
  },
  hatchback: {
    name: 'Rally Spec Hatchback',
    massKg: 1120,
    wheelRadius: 0.34,
    rideHeight: 0.38,
    wheelbase: 2.30,
    maxSteerAngle: 0.42,
    maxSpeedMs: 62.5, // ~225 km/h
    maxSpeedKmh: 225,
    peakAccel: 5.8,
    brakeDecel: 26,
    dragCoeff: 0.36,
    downforceCoeff: 0.35,
    turnRate: 1.44,
    tireGrip: 1.12,
    roadDamping: 0.992,
    offroadDamping: 0.986,
    gearRatios: [3.42, 2.14, 1.52, 1.16, 0.92],
    finalDrive: 4.25,
    reverseRatio: 3.50,
    idleRpm: 940,
    redlineRpm: 7500,
    upshiftRpm: 6700,
    downshiftRpm: 2600,
    engineBraking: 0.20,
    drivetrain: 'awd',
  },
  modern_supercar: {
    name: 'Modern Exotic V12 Hypercar',
    massKg: 1380,
    wheelRadius: 0.36,
    rideHeight: 0.36,
    wheelbase: 2.68,
    maxSteerAngle: 0.38,
    maxSpeedMs: 88.9, // ~320 km/h
    maxSpeedKmh: 320,
    peakAccel: 8.1, // 6.5L NA V12 hypercar acceleration
    brakeDecel: 33,
    dragCoeff: 0.28,
    downforceCoeff: 0.62,
    turnRate: 1.48,
    tireGrip: 1.26,
    roadDamping: 0.995,
    offroadDamping: 0.984,
    gearRatios: [3.95, 2.52, 1.82, 1.38, 1.09, 0.89, 0.74],
    finalDrive: 3.58,
    reverseRatio: 3.45,
    idleRpm: 1100,
    redlineRpm: 9500,
    upshiftRpm: 8650,
    downshiftRpm: 3200,
    engineBraking: 0.21,
    drivetrain: 'rwd',
  },
  vintage_hatch: {
    name: 'Vintage Raspy Turbo Hatch',
    massKg: 1040,
    wheelRadius: 0.34,
    rideHeight: 0.38,
    wheelbase: 2.28,
    maxSteerAngle: 0.43,
    maxSpeedMs: 59.7, // ~215 km/h
    maxSpeedKmh: 215,
    peakAccel: 5.4,
    brakeDecel: 25,
    dragCoeff: 0.37,
    downforceCoeff: 0.28,
    turnRate: 1.46,
    tireGrip: 1.08,
    roadDamping: 0.992,
    offroadDamping: 0.984,
    gearRatios: [3.62, 2.24, 1.58, 1.18, 0.91],
    finalDrive: 4.35,
    reverseRatio: 3.55,
    idleRpm: 900,
    redlineRpm: 7800,
    upshiftRpm: 7000,
    downshiftRpm: 2700,
    engineBraking: 0.21,
    drivetrain: 'fwd',
  },
}

export interface ExhaustConfig {
  offsets: [number, number, number][]
  colorPrimary: string
  colorSecondary: string
  isIonPlasma?: boolean
  isDieselSoot?: boolean
}

export const VEHICLE_EXHAUSTS: Record<VehicleModelType, ExhaustConfig> = {
  bmw_m3: {
    offsets: [[-0.34, -0.14, 2.18], [0.34, -0.14, 2.18]],
    colorPrimary: '#ff6b00',
    colorSecondary: '#ffb703',
  },
  supercar: {
    offsets: [[-0.18, 0.02, 2.05], [0.18, 0.02, 2.05]],
    colorPrimary: '#00b4d8', // High-energy blue core
    colorSecondary: '#ff9e00',
  },
  hovercraft: {
    offsets: [[-0.55, -0.06, 2.12], [0.55, -0.06, 2.12]],
    colorPrimary: '#00D6A3', // Teal ion plasma wash
    colorSecondary: '#38bdf8',
    isIonPlasma: true,
  },
  camper: {
    offsets: [[-0.62, -0.22, 2.25]],
    colorPrimary: '#2b2b2b', // Diesel soot puff
    colorSecondary: '#4a4a4a',
    isDieselSoot: true,
  },
  hatchback: {
    offsets: [[-0.42, -0.16, 1.98]],
    colorPrimary: '#ff7700',
    colorSecondary: '#ffd166',
  },
  modern_supercar: {
    offsets: [[-0.18, 0.02, 2.05], [0.18, 0.02, 2.05]],
    colorPrimary: '#00b4d8',
    colorSecondary: '#ff9e00',
  },
  vintage_hatch: {
    offsets: [[-0.42, -0.16, 1.98]],
    colorPrimary: '#ff7700',
    colorSecondary: '#ffd166',
  },
}

export const _wheelCorners: [number, number][] = [
  [-0.83, -1.48], // Front-Left (aligned with wheel arch)
  [0.83, -1.48],  // Front-Right (aligned with wheel arch)
  [-0.83, 1.18],  // Rear-Left (aligned with rear arch)
  [0.83, 1.18],   // Rear-Right (aligned with rear arch)
]
