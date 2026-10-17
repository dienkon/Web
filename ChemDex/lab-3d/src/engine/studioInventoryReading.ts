import type { VesselState } from '../types/chemistry';
import { cachedAqueousEquilibrium } from '../science/aqueousEquilibrium';

/** Same-state inventory consistency, not conservation across an experiment. */
export function studioInventoryReading(vessel: VesselState | undefined) {
  if (!vessel || !Number.isFinite(vessel.mass_g) || vessel.mass_g < 0
    || vessel.contents.some(item => !Number.isFinite(item.mass_g) || item.mass_g < 0 || !Number.isFinite(item.moles) || item.moles < 0)) {
    return { status: 'unavailable' as const, relativeMassError: null, chargeResidual_M: null };
  }
  const inventory = vessel.contents.reduce((sum, item) => sum + item.mass_g, 0);
  const relativeMassError = Math.abs(inventory - vessel.mass_g) / Math.max(inventory, vessel.mass_g, 1e-12);
  const aqueous = vessel.phModel === 'ideal_aqueous_25c' && Math.abs(vessel.temperature_c - 25) < 0.5
    ? cachedAqueousEquilibrium(vessel.contents, vessel.volume_ml) : null;
  return { status: relativeMassError <= 1e-8 ? 'consistent' as const : 'mismatch' as const,
    relativeMassError, chargeResidual_M: aqueous?.chargeResidual_M ?? null };
}
