import type { VesselState } from '../types/chemistry';
import { liquidGeometry, liquidLevelForVolume, vesselInnerRadius } from './vesselDimensions';
export { liquidGeometry } from './vesselDimensions';
import { liquidSurfaceVolume } from '../engine/waterPhase';
import { vesselBodyTransform } from './vesselScale';

export function vesselLiquidSurfaceY(vessel: Pick<VesselState, 'type' | 'volume_ml' | 'capacity_ml' | 'contents'>): number {
  return liquidLevelForVolume(vessel.type, liquidSurfaceVolume(vessel), vessel.capacity_ml);
}
/** Upright surface height relative to the vessel's world-space pose origin. */
export function vesselWorldLiquidSurfaceY(vessel: Pick<VesselState, 'type' | 'volume_ml' | 'capacity_ml' | 'contents'>): number {
  const { scale, offsetY } = vesselBodyTransform(vessel);
  return offsetY + scale * vesselLiquidSurfaceY(vessel);
}
export function sodiumSurfaceRadius(vessel: VesselState): number {
  return Math.max(0.02, vesselInnerRadius(vessel.type,
    vesselLiquidSurfaceY(vessel) - liquidGeometry(vessel.type).floorY));
}
