import type { VesselState } from '../types/chemistry';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { WATER_LATENT_HEAT_J_G } from './thermalState';

/** Explicit connected source, finite vapor supply and ideal cooling sink.
 * Water-only coupling; proximity does not constitute a vapor connection.
 */
export function transferWaterCondensate(
  vessels: Record<string, VesselState>, vaporBudgets: ReadonlyMap<string, number>,
): Record<string, VesselState> {
  let result = vessels;
  const remaining = new Map(vaporBudgets);
  for (const receiverId of Object.keys(vessels)) {
    const receiver = result[receiverId];
    const sourceId = receiver.vaporSourceId;
    if (receiver.type !== 'condenser' || !receiver.coolingWaterActive || !sourceId || sourceId === receiverId) continue;
    const source = result[sourceId];
    if (!source || source.isSealed || receiver.isSealed || receiver.isShattered || source.isShattered) continue;
    const mass = Math.min(Math.max(0, remaining.get(sourceId) ?? 0), Math.max(0, receiver.capacity_ml - receiver.volume_ml));
    if (mass <= 1e-12) continue;
    remaining.set(sourceId, (remaining.get(sourceId) ?? 0) - mass);
    const contents = receiver.contents.map(item => ({ ...item }));
    const water = contents.find(item => sameMolecularFormula(item.formula, 'H2O') && item.phase !== 'g');
    if (water) { water.mass_g += mass; water.moles += mass / 18.015; }
    else contents.push({ formula: 'H2O', phase: 'l', mass_g: mass, moles: mass / 18.015 });
    if (result === vessels) result = { ...vessels };
    result[receiverId] = { ...receiver, contents, substances: [...new Set([...receiver.substances, 'H2O'])],
      volume_ml: receiver.volume_ml + mass, volume: (receiver.volume_ml + mass) / receiver.capacity_ml,
      mass_g: receiver.mass_g + mass, liquidColor: receiver.liquidColor ?? '#f8fafc',
      condensationHeatRemoved_J: (receiver.condensationHeatRemoved_J ?? 0) + mass * WATER_LATENT_HEAT_J_G };
    result[sourceId] = { ...source, condensedTransfer_g: (source.condensedTransfer_g ?? 0) + mass };
  }
  return result;
}
