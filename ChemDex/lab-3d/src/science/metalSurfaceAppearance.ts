import type { VesselState } from '../types/chemistry';
import { bulkPrecipitateMass, precipitateComponents } from './precipitateInventory';

/** Attached-deposit approximation for explicit displacement routes.
 * Assumes all product remains attached while substrate survives. No measured
 * adhesion/detachment law; amount is derived from the existing solid ledger. */
export function metalSurfaceAppearance(vessel: VesselState) {
  const id = vessel.lastReactionId ?? vessel.studioProgramId;
  const route = id === 'zn_agno3' ? { substrate: 'Zn', product: 'Ag', color: '#cbd5e1' }
    : id === 'cu_agno3' ? { substrate: 'Cu', product: 'Ag', color: '#cbd5e1' }
    : id === 'fe_cuso4' ? { substrate: 'Fe', product: 'Cu', color: '#b87346' }
    : id === 'zn_cuso4' ? { substrate: 'Zn', product: 'Cu', color: '#b87346' }
    : id === 'mg_cuso4' ? { substrate: 'Mg', product: 'Cu', color: '#b87346' } : null;
  if (!route) return null;
  const substrateMass_g = bulkPrecipitateMass(vessel.contents, route.substrate);
  const attachedMass_g = precipitateComponents(vessel.contents, vessel.precipitateSubstance)
    .find(c => c.formula === route.product)?.mass_g ?? 0;
  if (!(substrateMass_g > 1e-12) || !(attachedMass_g > 0)) return null;
  return { ...route, substrateMass_g, attachedMass_g,
    // Qualitative color coverage, not a geometric film thickness or measured coverage.
    colorFraction: attachedMass_g / (attachedMass_g + substrateMass_g) };
}
