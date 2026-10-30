import type { SubstanceContent, VesselState } from '../types/chemistry';
import { isImmiscibleOrganic } from '../data/chemicals';

type LayerVessel = Pick<VesselState, 'contents' | 'volume_ml'> & Partial<Pick<VesselState, 'immiscibleOrganicVolume_ml'>>;
export const solidContent = (item: SubstanceContent) => item.phase === 's' || item.state === 's' || item.state === 'solid';
export const gasContent = (item: SubstanceContent) => item.phase === 'g' || item.state === 'g' || item.state === 'gas';
export const organicContent = (item: SubstanceContent) => item.liquidLayer === 'organic'
  || (item.liquidLayer !== 'aqueous' && isImmiscibleOrganic(item.formula));

/** volume_ml is TOTAL liquid; organic volume is a subset, never added twice. */
export function phaseVolumes(vessel: Pick<LayerVessel, 'volume_ml' | 'immiscibleOrganicVolume_ml'>) {
  const total = Math.max(0, vessel.volume_ml);
  const organic = Math.max(0, Math.min(total, vessel.immiscibleOrganicVolume_ml ?? 0));
  return { organic, aqueous: total - organic };
}

/** Inventory densities include solute mass assigned to each phase; solids and
 * gases never increase a liquid's hydrostatic density. No partition guessed. */
export function phaseDensities(vessel: LayerVessel) {
  const volumes = phaseVolumes(vessel);
  const liquid = vessel.contents.filter(item => !solidContent(item) && !gasContent(item));
  const mass = (organic: boolean) => liquid.filter(item => organicContent(item) === organic)
    .reduce((sum, item) => sum + Math.max(0, item.mass_g), 0);
  return { organic: volumes.organic > 0 ? mass(true) / volumes.organic : 0,
    aqueous: volumes.aqueous > 0 ? mass(false) / volumes.aqueous : 0 };
}

export function separatedLayers(vessel: LayerVessel) {
  const volumes = phaseVolumes(vessel), density = phaseDensities(vessel);
  const organicBelow = volumes.organic > 0 && (volumes.aqueous <= 0 || density.organic > density.aqueous);
  return { lower: organicBelow ? 'organic' as const : 'aqueous' as const,
    lowerVolume_ml: organicBelow ? volumes.organic : volumes.aqueous,
    upperVolume_ml: organicBelow ? volumes.aqueous : volumes.organic };
}
