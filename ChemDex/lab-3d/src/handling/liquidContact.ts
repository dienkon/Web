import type { VesselState } from '../types/chemistry';
import type { LiquidAliquot } from './aliquot';

export const THERMAL_SHOCK_REASON = 'Thermal Shock: Cold liquid contacted hot, nearly dry glassware (illustrative model)';
const glassware = new Set(['beaker', 'flask', 'test_tube', 'cylinder', 'volumetric_flask', 'watch_glass',
  'petri_dish', 'filter_funnel', 'separatory_funnel', 'condenser']);

/** Shared legacy teaching criterion, evaluated at actual material contact.
 * These temperature thresholds are illustrative, not certified glass ratings
 * or a stress/strength calculation. Warm liquid is not a cold-water shock. */
export function liquidContactFailure(receiver: VesselState, sample: Pick<LiquidAliquot, 'volume_ml' | 'mass_g' | 'temperature_c'>,
  accepted_ml: number): typeof THERMAL_SHOCK_REASON | undefined {
  if (!receiver.isShattered && !receiver.isSealed && glassware.has(receiver.type)
    && [receiver.volume_ml, receiver.temperature_c, sample.volume_ml, sample.mass_g, sample.temperature_c, accepted_ml].every(Number.isFinite)
    && accepted_ml > 0 && sample.mass_g > 0 && sample.volume_ml > 0
    && receiver.volume_ml >= 0 && receiver.volume_ml <= 2 && receiver.temperature_c >= 180
    && receiver.temperature_c - sample.temperature_c >= 130) return THERMAL_SHOCK_REASON;
  return undefined;
}
