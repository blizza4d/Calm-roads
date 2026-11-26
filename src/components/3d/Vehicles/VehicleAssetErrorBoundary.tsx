import { Component, ErrorInfo, ReactNode } from 'react'
import type { VehicleModelType } from '../../../store/useGameStore'
import { useLoadingStore } from '../../../store/useLoadingStore'
import { ProceduralSportsCarFallback, clearVehicleAssetCache } from './CarModels'
import { worldReadinessRegistry } from '../../../utils/loadingRegistry'

export interface VehicleErrorBoundaryProps {
  resetKey: string
  vehicleModel: VehicleModelType
  children: ReactNode
}

export interface VehicleErrorBoundaryState {
  hasError: boolean
}

export class VehicleAssetErrorBoundary extends Component<VehicleErrorBoundaryProps, VehicleErrorBoundaryState> {
  constructor(props: VehicleErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): VehicleErrorBoundaryState {
    return { hasError: true }
  }

  componentDidUpdate(prevProps: VehicleErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error('[VehicleAssetErrorBoundary] Failed to load vehicle assets:', error)
    clearVehicleAssetCache(this.props.vehicleModel)
    const msg = error?.message || `Failed to load 3D model for ${this.props.vehicleModel}`
    worldReadinessRegistry.vehicleAssetLoaded = false
    worldReadinessRegistry.vehicleError = msg
    if (!useLoadingStore.getState().isReady) {
      useLoadingStore.getState().setError(`Vehicle asset error: ${msg}`, 'vehicle', true)
    }
  }

  render() {
    if (this.state.hasError) {
      if (worldReadinessRegistry.vehicleAllowFallback || useLoadingStore.getState().isReady) {
        return <ProceduralSportsCarFallback paintColor="#cbd5e1" vehicleType={this.props.vehicleModel} />
      }
      return null
    }
    return this.props.children
  }
}
