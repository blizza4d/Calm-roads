import type { BiomeType } from './roadMath'

export interface LandmarkDefinition {
  id: string
  name: string
  subtitle: string
  biome: BiomeType
  description: string
  targetZ: number          // Canonical world Z distance along highway (m)
  side: -1 | 1             // Left (-1) or Right (+1) of road centerline
  lateralOffset: number    // Distance in meters from road center (outside road corridor)
  elevationOffset: number  // Vertical adjustment relative to road elevation (m)
  type:
    | 'lighthouse'
    | 'covered_bridge'
    | 'windmill'
    | 'alpine_lodge'
    | 'sandstone_arch'
    | 'scenic_lookout'
    | 'wind_turbine'
    | 'highland_cairn'
}

/**
 * 12 Signature Discoverable Landmarks across the 6 major procedural regions.
 * Positioned at memorable scenic locations along the continuous highway.
 */
export const WORLD_LANDMARKS: LandmarkDefinition[] = [
  // 1. Twisted Mountains / Alpine Region (Z: 400m - 1,800m)
  {
    id: 'eagle_peak_lookout',
    name: 'Eagle Peak Lookout',
    subtitle: 'Summit Panorama • Elevation 1,840m',
    biome: 'twisted_mountains',
    description: 'A wooden alpine observation deck built on a sheer cliffside overlooking the snow-covered mountain valley.',
    targetZ: 680,
    side: 1,
    lateralOffset: 24.0,
    elevationOffset: 3.5,
    type: 'scenic_lookout',
  },
  {
    id: 'timberline_lodge',
    name: 'Timberline Pine Lodge',
    subtitle: 'High-Altitude Sanctuary • Cozy Fireplace',
    biome: 'twisted_mountains',
    description: 'A traditional alpine timber refuge with log walls, pitched snow roof, and a warm hearth for winter travelers.',
    targetZ: 1420,
    side: -1,
    lateralOffset: 28.0,
    elevationOffset: 1.2,
    type: 'alpine_lodge',
  },

  // 2. Forest Valleys & Highlands (Z: 2,000m - 3,600m)
  {
    id: 'highland_wayfarer_shrine',
    name: 'Highland Wayfarer Shrine',
    subtitle: 'Ancient Stone Cairn • Highland Pass',
    biome: 'alpine',
    description: 'A majestic megalithic stone cairn standing vigil over sweeping windswept mountain passes.',
    targetZ: 2250,
    side: 1,
    lateralOffset: 22.0,
    elevationOffset: 2.8,
    type: 'highland_cairn',
  },
  {
    id: 'ancient_redwood_grove',
    name: 'Ancient Redwood Hollow',
    subtitle: 'Primeval Forest • Century-Old Giant',
    biome: 'enchanted_forest',
    description: 'A cathedral of primordial towering redwoods where golden sunbeams pierce through misty morning canopy.',
    targetZ: 3100,
    side: -1,
    lateralOffset: 25.0,
    elevationOffset: 0.5,
    type: 'scenic_lookout',
  },

  // 3. Autumn Valley Region (Z: 3,800m - 5,400m)
  {
    id: 'golden_covered_bridge',
    name: 'Golden Hollow Covered Bridge',
    subtitle: 'Historic Timber Truss • Amber Foliage',
    biome: 'autumn',
    description: 'An iconic crimson-red wooden covered bridge spanning a crystal-clear mountain stream amid golden maple trees.',
    targetZ: 4150,
    side: 1,
    lateralOffset: 26.0,
    elevationOffset: 1.0,
    type: 'covered_bridge',
  },
  {
    id: 'maple_ridge_windmill',
    name: 'Maple Ridge Windmill',
    subtitle: 'Rustic Gristmill • Turning Sails',
    biome: 'autumn',
    description: 'A historic octagonal timber windmill whose four sails turn gracefully in the crisp autumn valley breeze.',
    targetZ: 4920,
    side: -1,
    lateralOffset: 30.0,
    elevationOffset: 2.2,
    type: 'windmill',
  },

  // 4. Desert Canyon Region (Z: 5,600m - 7,200m)
  {
    id: 'sandstone_natural_arch',
    name: 'Sandstone Natural Arch',
    subtitle: 'Geological Marvel • Sun-Carved Stone',
    biome: 'desert',
    description: 'A colossal red sandstone arch sculpted by millennia of desert winds, framing distant canyon plateaus.',
    targetZ: 5850,
    side: 1,
    lateralOffset: 32.0,
    elevationOffset: 4.0,
    type: 'sandstone_arch',
  },
  {
    id: 'sunstone_canyon_lookout',
    name: 'Sunstone Canyon Vista',
    subtitle: 'Mesa Precipice • Panoramic Depth',
    biome: 'desert',
    description: 'A breathtaking promontory perched directly above a 200-meter drop into the heart of the sandstone badlands.',
    targetZ: 6720,
    side: -1,
    lateralOffset: 26.0,
    elevationOffset: 2.0,
    type: 'scenic_lookout',
  },

  // 5. Coastal Beach Highway Region (Z: 7,400m - 9,000m)
  {
    id: 'pelican_point_lighthouse',
    name: 'Pelican Point Lighthouse',
    subtitle: 'Maritime Beacon • Ocean Swells',
    biome: 'coastal',
    description: 'A classic coastal sentinel with a spiraling lantern room and revolving searchlight guiding ships along the rocky coast.',
    targetZ: 7650,
    side: -1, // Seaward ocean side
    lateralOffset: 36.0,
    elevationOffset: 4.5,
    type: 'lighthouse',
  },
  {
    id: 'pacific_headland_vista',
    name: 'Pacific Headland Vista',
    subtitle: 'Ocean Headlands • Sea Spray Balustrade',
    biome: 'coastal',
    description: 'A curved stone balustrade lookout where the roaring ocean tide crashes against rugged volcanic sea stacks.',
    targetZ: 8520,
    side: -1,
    lateralOffset: 28.0,
    elevationOffset: 3.0,
    type: 'scenic_lookout',
  },

  // 6. Rolling Plains Region (Z: 9,200m - 10,800m)
  {
    id: 'prairie_wind_turbines',
    name: 'Prairie Wind Energy Park',
    subtitle: 'Modern Monoliths • Endless Horizons',
    biome: 'forest',
    description: 'Towering white wind turbines turning in synchronized harmony above the vast, golden rolling grasslands.',
    targetZ: 9540,
    side: 1,
    lateralOffset: 34.0,
    elevationOffset: 2.5,
    type: 'wind_turbine',
  },
  {
    id: 'wayfarer_rest_oasis',
    name: 'Wayfarer Valley Pavilion',
    subtitle: 'Open Meadow Rest • Tranquil Clearing',
    biome: 'forest',
    description: 'A rustic stone-and-cedar shelter nestled in a sunlit meadow of wildflowers beside the endless highway.',
    targetZ: 10400,
    side: -1,
    lateralOffset: 26.0,
    elevationOffset: 1.5,
    type: 'scenic_lookout',
  },
]

export const DISCOVERY_RADIUS = 85.0 // Discovery trigger radius in meters around targetZ

/**
 * Returns any landmark within proximity of the vehicle's current world Z coordinate.
 */
export function getLandmarkNearZ(worldZ: number): LandmarkDefinition | null {
  const absZ = Math.abs(worldZ)
  for (const lm of WORLD_LANDMARKS) {
    if (Math.abs(absZ - lm.targetZ) <= DISCOVERY_RADIUS) {
      return lm
    }
  }
  return null
}
