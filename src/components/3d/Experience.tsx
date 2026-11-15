import { OrbitControls } from '@react-three/drei'
import { useGameStore } from '../../store/useGameStore'
import GameEnvironment from './Environment/GameEnvironment'
import Terrain from './Environment/Terrain'
import VehicleController from './Vehicles/VehicleController'
import ShaderReadinessPipeline from './ShaderReadinessPipeline'
import PerformanceBridge from './PerformanceBridge'

export default function Experience() {
  const photoMode = useGameStore((state) => state.photoMode)

  return (
    <>
      <PerformanceBridge />
      <ShaderReadinessPipeline />
      {photoMode && (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          maxDistance={70}
          minDistance={1.2}
        />
      )}
      <GameEnvironment />
      <Terrain />
      <VehicleController />
    </>
  )
}

