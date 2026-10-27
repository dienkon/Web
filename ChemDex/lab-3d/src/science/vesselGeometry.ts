import type { VesselState } from '../types/chemistry';
import { liquidGeometry, liquidLevelForVolume, vesselInnerRadius } from './vesselDimensions';
export { liquidGeometry } from './vesselDimensions';
import { liquidSurfaceVolume } from '../engine/waterPhase';

export function vesselLiquidSurfaceY(vessel: Pick<VesselState, 'type' | 'volume_ml' | 'capacity_ml' | 'contents'>): number {
  return liquidLevelForVolume(vessel.type, liquidSurfaceVolume(vessel), vessel.capacity_ml);
}
export function sodiumSurfaceRadius(vessel: VesselState): number {
  return Math.max(0.02, vesselInnerRadius(vessel.type,
    vesselLiquidSurfaceY(vessel) - liquidGeometry(vessel.type).floorY));
}
