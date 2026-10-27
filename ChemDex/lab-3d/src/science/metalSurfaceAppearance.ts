import type { VesselState } from '../types/chemistry';
import { bulkPrecipitateMass } from './precipitateInventory';

/** Initial attached-deposit approximation for two explicit displacement routes.
 * Assumes all product remains attached while substrate survives. No measured
 * adhesion/detachment law; amount is derived from the existing solid ledger. */
export function metalSurfaceAppearance(vessel: VesselState) {
  const id = vessel.lastReactionId ?? vessel.studioProgramId;
  const route = id === 'zn_agno3' ? { substrate: 'Zn', product: 'Ag', color: '#cbd5e1' }
    : id === 'mg_cuso4' ? { substrate: 'Mg', product: 'Cu', color: '#b45309' } : null;
  if (!route) return null;
  const substrateMass_g = bulkPrecipitateMass(vessel.contents, route.substrate);
  const attachedMass_g = bulkPrecipitateMass(vessel.contents, route.product);
  if (!(substrateMass_g > 1e-12) || !(attachedMass_g > 0)) return null;
  return { ...route, substrateMass_g, attachedMass_g,
    // Qualitative color coverage, not a geometric film thickness or measured coverage.
    colorFraction: attachedMass_g / (attachedMass_g + substrateMass_g) };
}
