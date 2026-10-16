import type { VesselState } from '../types/chemistry';

/**
 * Binary NaCl/water only, at the documented 25 C reference point.
 * 36.0 g NaCl / 100 g WATER (not 100 mL solution):
 * https://pubchem.ncbi.nlm.nih.gov/compound/Sodium-chloride#section=Solubility
 * The relaxation rate is illustrative, not a measured dissolution constant.
 * Other solutes/common ions, temperatures and solvents need separate models.
 */
export function partitionSodiumChloride(
  vessel: VesselState, dt: number, stirred = false,
): Partial<VesselState> | null {
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(vessel.temperature_c)
    || Math.abs(vessel.temperature_c - 25) > 1e-6 || vessel.volume_ml <= 0
    || vessel.isShattered || (vessel.immiscibleOrganicVolume_ml ?? 0) > 0) return null;
  const entries = vessel.contents;
  if (entries.some(item => !Number.isFinite(item.mass_g) || !Number.isFinite(item.moles)
    || item.mass_g < 0 || item.moles < 0 || item.location === 'filter')) return null;
  if (entries.some(item => item.mass_g > 1e-12 && !(
    item.formula === 'NaCl' && (item.phase === 's' || item.phase === 'aq')
    || item.formula === 'H2O' && item.phase === 'l'
  ))) return null;
  const salt = entries.filter(item => item.formula === 'NaCl');
  const waterMass = entries.filter(item => item.formula === 'H2O' && item.phase === 'l')
    .reduce((sum, item) => sum + item.mass_g, 0);
  const totalMass = salt.reduce((sum, item) => sum + item.mass_g, 0);
  const totalMoles = salt.reduce((sum, item) => sum + item.moles, 0);
  if (waterMass <= 0 || totalMass <= 0 || totalMoles <= 0) return null;
  const dissolved = salt.filter(item => item.phase === 'aq').reduce((sum, item) => sum + item.mass_g, 0);
  const target = Math.min(totalMass, waterMass * 0.36);
  const difference = target - dissolved;
  if (Math.abs(difference) <= Math.max(1e-12, totalMass * 1e-10)) return null;
  // Stirring/grinding change approach speed, never the final saturation limit.
  const rate = 0.25 * (stirred ? 3 : 1) * (vessel.isPulverized ? 2 : 1);
  const next = Math.abs(difference) < totalMass * 1e-7 ? target
    : dissolved + difference * -Math.expm1(-rate * dt);
  const dissolvedMoles = totalMoles * next / totalMass;
  const contents = entries.filter(item => item.formula !== 'NaCl');
  if (next > 1e-12) contents.push({ formula: 'NaCl', phase: 'aq', mass_g: next,
    moles: dissolvedMoles, concentration_M: dissolvedMoles / (vessel.volume_ml / 1000) });
  if (totalMass - next > 1e-12) contents.push({ formula: 'NaCl', phase: 's',
    mass_g: totalMass - next, moles: totalMoles - dissolvedMoles });
  return { contents, substances: [...new Set(contents.filter(item => item.moles > 0).map(item => item.formula))] };
}
