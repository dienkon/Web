import type { VesselState } from '../types/chemistry';
import { sodiumChlorideSolubilityRatio } from '../science/sodiumChlorideSolubility';
import { partitionDryStock, stockLiquidContactFraction } from '../physical/stockLiquidContact';
import { withLegacyPrecipitateOrigins } from '../science/precipitateInventory';
import { transferSolidPhase } from './solidPhaseTransfer';
import { allocateStockConsumption } from '../physical/stockConsumption';

/**
 * Binary NaCl/water only, using the IUPAC temperature-dependent saturation
 * correlation in sodiumChlorideSolubilityRatio (g salt / g WATER).
 * The relaxation rate is illustrative, not a measured dissolution constant.
 * Other solutes/common ions, out-of-range temperatures and solvents need separate models.
 * This partition does not yet couple dissolution enthalpy or solution volume.
 */
export function partitionSodiumChloride(
  vessel: VesselState, dt: number, stirred = false,
): Partial<VesselState> | null {
  const solubility = sodiumChlorideSolubilityRatio(vessel.temperature_c);
  if (!Number.isFinite(dt) || dt <= 0 || solubility === undefined || vessel.volume_ml <= 0
    || vessel.isShattered || (vessel.immiscibleOrganicVolume_ml ?? 0) > 0) return null;
  if (vessel.contents.some(item => !Number.isFinite(item.mass_g) || !Number.isFinite(item.moles)
    || item.mass_g < 0 || item.moles < 0 || item.location && item.location !== 'bulk')) return null;
  if (vessel.contents.some(item => item.mass_g > 1e-12 && !(
    item.formula === 'NaCl' && (item.phase === 's' || item.phase === 'aq')
    || item.formula === 'H2O' && item.phase === 'l'
  ))) return null;
  const { reactiveContents: entries, inertContents, reactiveVessel } = partitionDryStock(vessel);
  const salt = entries.filter(item => item.formula === 'NaCl');
  const waterMass = entries.filter(item => item.formula === 'H2O' && item.phase === 'l')
    .reduce((sum, item) => sum + item.mass_g, 0);
  const totalMass = salt.reduce((sum, item) => sum + item.mass_g, 0);
  const totalMoles = salt.reduce((sum, item) => sum + item.moles, 0);
  if (waterMass <= 0 || totalMass <= 0 || totalMoles <= 0) return null;
  const dissolved = salt.filter(item => item.phase === 'aq').reduce((sum, item) => sum + item.mass_g, 0);
  const target = Math.min(totalMass, waterMass * solubility);
  const difference = target - dissolved;
  if (Math.abs(difference) <= Math.max(1e-12, totalMass * 1e-10)) return null;
  // Stirring/grinding change approach speed, never the final saturation limit.
  const contact = difference > 0 ? stockLiquidContactFraction(reactiveVessel, 'NaCl') : 1;
  if (!(contact > 0)) return null;
  const rate = 0.25 * (stirred ? 3 : 1) * (vessel.isPulverized ? 2 : 1) * contact;
  const next = Math.abs(difference) < totalMass * 1e-7 ? target
    : dissolved + difference * -Math.expm1(-rate * dt);
  const dissolvedMoles = totalMoles * next / totalMass;
  const normalized = withLegacyPrecipitateOrigins({ ...vessel, contents: entries,
    hasPrecipitate: vessel.hasPrecipitate && !vessel.stockMotion?.grains.some(pose => pose.formula === 'NaCl') });
  const contents = [...transferSolidPhase(normalized, 'NaCl', dissolvedMoles, vessel.volume_ml), ...inertContents];
  return { contents, stockMotion: allocateStockConsumption(vessel, contents),
    substances: [...new Set(contents.filter(item => item.moles > 0).map(item => item.formula))] };
}
