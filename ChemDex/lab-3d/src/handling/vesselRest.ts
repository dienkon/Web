import { LAB_PHYSICS } from '../engine/interactionEngine';

// Local lowest points of the rendered models. Tall glassware retains its
// existing support plinth; shallow vessels must not inherit a beaker's origin.
const MODEL_BOTTOM_Y: Record<string, number> = {
  watch_glass: -0.18, evaporating_dish: -0.42, petri_dish: -0.22,
  crucible: -0.65, mortar_pestle: -0.65, hot_plate: 0,
  retort_stand: -0.135, stopper: -0.11, pneumatic_trough: -0.3,
};
export function restingVesselHeight(type?: string): number {
  const bottom = type ? MODEL_BOTTOM_Y[type] : undefined;
  return bottom === undefined ? LAB_PHYSICS.VESSEL_REST_Y : LAB_PHYSICS.TABLE_SURFACE_Y - bottom;
}
