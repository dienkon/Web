import type { VesselState } from '../types/chemistry';
import type { LiquidAliquot } from '../handling/aliquot';
import { withdrawAliquot, dispenseAliquot } from '../handling/aliquot';
import { refreshFlowInventory, solidContent } from './funnelFlow';

const RECEIVERS = new Set(['beaker', 'flask', 'test_tube', 'cylinder', 'volumetric_flask',
  'watch_glass', 'evaporating_dish', 'crucible', 'petri_dish', 'filter_funnel', 'separatory_funnel']);

export function canReceivePour(vessel: VesselState): boolean {
  return RECEIVERS.has(vessel.type) && !vessel.isSealed && !vessel.isShattered
    && Number.isFinite(vessel.capacity_ml) && vessel.capacity_ml > 0;
}

/** A decant keeps settled solids/headspace gas in the source. Suspended slurry
 * transport needs a separate entrainment model; never copy precipitate metadata. */
export function decantLiquid(source: VesselState, receiver: VesselState | null, requested_ml: number) {
  if (!Number.isFinite(requested_ml) || requested_ml <= 0 || !Number.isFinite(source.volume_ml)
    || source.volume_ml <= 0 || source.isShattered || source.isSealed
    || source.id === receiver?.id || (receiver && !canReceivePour(receiver))) return null;
  const valid = (v: VesselState) => Number.isFinite(v.mass_g) && v.mass_g >= 0
    && v.contents.every(item => Number.isFinite(item.mass_g) && item.mass_g >= 0
      && Number.isFinite(item.moles) && item.moles >= 0)
    && Math.abs(v.contents.reduce((sum, item) => sum + item.mass_g, 0) - v.mass_g)
      <= Math.max(1e-6, v.mass_g * 1e-4);
  if (!valid(source) || (receiver && (!valid(receiver) || !Number.isFinite(receiver.volume_ml)
    || receiver.volume_ml < 0))) return null;
  const liquid = source.contents.filter(item => !solidContent(item)
    && (item.phase ?? item.state) !== 'g' && item.state !== 'gas' && item.mass_g > 0);
  if (!liquid.length) return null;
  const withdrawn = withdrawAliquot(source, requested_ml);
  let remainder: LiquidAliquot = withdrawn.sample;
  let target: VesselState | undefined;
  let accepted_ml = 0;
  if (receiver) {
    const dispensed = dispenseAliquot(receiver, withdrawn.sample, withdrawn.sample.volume_ml);
    target = { ...refreshFlowInventory(dispensed.vessel), hasGas: false, gasRate: 0, isExplosion: false };
    remainder = dispensed.sample;
    accepted_ml = dispensed.dispensed_ml;
  }
  let remaining = { ...refreshFlowInventory(withdrawn.vessel), hasGas: false, gasRate: 0, isExplosion: false };
  if (remaining.volume_ml <= 1e-12) remaining = { ...remaining, liquidColor: undefined,
    isBoiling: false, boilingIntensity: 0, foam_ml: 0 };
  return { source: remaining, receiver: target, accepted_ml,
    moved_ml: withdrawn.sample.volume_ml,
    spill: remainder.volume_ml > 0 ? remainder : undefined };
}
