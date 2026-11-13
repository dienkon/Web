import { LAB_PHYSICS } from '../engine/interactionEngine';
import { vesselBodyTransform } from '../science/vesselScale';

// Local lowest points of the rendered models. Tall glassware retains its
// existing support plinth; shallow vessels must not inherit a beaker's origin.
const MODEL_BOTTOM_Y: Record<string, number> = {
  watch_glass: -0.18, evaporating_dish: -0.42, petri_dish: -0.22,
  crucible: -0.65, mortar_pestle: -0.65, hot_plate: 0,
  retort_stand: -0.135, stopper: -0.11, pneumatic_trough: -0.3,
  test_tube_rack: -0.21, retort_clamp: -0.095,
  // Lowest rendered torus vertex after the two handle rotations.
  tongs: -0.9331352311658077,
};
const SCALED_MODEL_BOTTOM: Record<string, number> = {
  beaker: -1, flask: -1, test_tube: -1.04, cylinder: -1.04,
  volumetric_flask: -0.96, separatory_funnel: -1.28, filter_funnel: -1.16,
  condenser: -1.25, wash_bottle: -0.95,
};
const DEFAULT_CAPACITY: Record<string, number> = {
  beaker: 100, flask: 250, test_tube: 50, cylinder: 100, volumetric_flask: 100,
  separatory_funnel: 150, filter_funnel: 75, condenser: 120, wash_bottle: 250,
};
export function restingVesselHeight(type?: string, capacity_ml?: number): number {
  capacity_ml ??= type ? DEFAULT_CAPACITY[type] : undefined;
  if (type && capacity_ml !== undefined && SCALED_MODEL_BOTTOM[type] !== undefined) {
    const { scale, offsetY } = vesselBodyTransform({ type, capacity_ml });
    return LAB_PHYSICS.TABLE_SURFACE_Y - (SCALED_MODEL_BOTTOM[type] * scale + offsetY);
  }
  const bottom = type ? MODEL_BOTTOM_Y[type] : undefined;
  return bottom === undefined ? LAB_PHYSICS.VESSEL_REST_Y : LAB_PHYSICS.TABLE_SURFACE_Y - bottom;
}
