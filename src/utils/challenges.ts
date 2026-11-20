export interface DrivingChallenge {
  id: string
  title: string
  category: 'speed' | 'distance' | 'drift' | 'exploration' | 'precision' | 'manual'
  description: string
  targetValue: number
  unit: string
  reward: string
}

export const DRIVING_CHALLENGES: DrivingChallenge[] = [
  {
    id: 'alpine_velocity',
    title: 'Alpine Velocity',
    category: 'speed',
    description: 'Reach a top speed of 180 km/h (112 mph) along high-speed highway stretches.',
    targetValue: 180,
    unit: 'km/h',
    reward: 'Gold Calipers & GT Wing',
  },
  {
    id: 'grand_tourer',
    title: 'Grand Tourer',
    category: 'distance',
    description: 'Journey across 5.0 kilometers (3.1 miles) of continuous procedural world.',
    targetValue: 5.0,
    unit: 'km',
    reward: 'Pearlescent Paint Option',
  },
  {
    id: 'master_of_slip',
    title: 'Master of Slip',
    category: 'drift',
    description: 'Execute high-speed cornering slips accumulating 150 meters of tire slide.',
    targetValue: 150,
    unit: 'm',
    reward: 'Bronze Racing Rims',
  },
  {
    id: 'asphalt_purist',
    title: 'Asphalt Purist',
    category: 'precision',
    description: 'Drive cleanly on the paved asphalt road for 2,000 meters without going off-road.',
    targetValue: 2.0,
    unit: 'km',
    reward: 'Satin Finish Clearcoat',
  },
  {
    id: 'scenic_explorer',
    title: 'Scenic Explorer',
    category: 'exploration',
    description: 'Locate and discover 4 unique environmental landmarks along the highway.',
    targetValue: 4,
    unit: 'landmarks',
    reward: 'Acid Green Brake Calipers',
  },
  {
    id: 'redline_virtuoso',
    title: 'Redline Virtuoso',
    category: 'manual',
    description: 'Execute 5 clean manual upshifts above 7,000 RPM in Manual Transmission Mode.',
    targetValue: 5,
    unit: 'shifts',
    reward: 'Carbon Ducktail Spoiler',
  },
]
