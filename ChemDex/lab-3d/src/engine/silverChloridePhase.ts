import type { SubstanceContent, VesselState } from '../types/chemistry';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { silverChlorideIonInventory, silverChlorideKsp, silverHalideDissolutionEnthalpy_J_mol, type Halide } from '../science/silverChloridePrecipitation';
import { getPrecipitateProfile } from '../simulation/core/SimulationConfig';
import { applyThermalEnergy } from './thermalState';

const isHalidePool = (item: SubstanceContent, halide: Halide) => sameMolecularFormula(item.formula, `Ag${halide}`)
  && (item.phase === 's' || item.phase === 'aq');

/** Repartition only the existing AgCl formula-unit pool. Counterions stay
 * in their original pools; precipitation from other salts belongs to the
 * reaction ledger. Ideal concentrations, no complexation or activity model. */
export function silverChloridePhaseTarget(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number, halide: Halide = 'Cl') {
  const isSilverChloridePool = (c: SubstanceContent) => isHalidePool(c, halide);
  if (!(volume_ml > 0) || !Number.isFinite(volume_ml)) return null;
  const pool = contents.filter(isSilverChloridePool);
  if (!pool.length || contents.some(c => !Number.isFinite(c.mass_g) || c.mass_g < 0
    || !Number.isFinite(c.moles) || c.moles < 0 || (c.location && c.location !== 'bulk'))) return null;
  const all = silverChlorideIonInventory(contents, halide);
  const background = silverChlorideIonInventory(contents.filter(c => !isSilverChloridePool(c)), halide);
  const ksp = silverChlorideKsp(temperature_c, halide);
  if (!all || !background || ksp === null) return null;
  const totalMoles = pool.reduce((sum, c) => sum + c.moles, 0);
  const totalMass_g = pool.reduce((sum, c) => sum + c.mass_g, 0);
  if (!(totalMoles > 0) || !(totalMass_g > 0)) return null;
  // Guard on the largest potentially dissolved inventory, including the pool.
  const liters = volume_ml / 1000;
  if ((background.silver + totalMoles) / liters > 0.1
    || (background.chloride + totalMoles) / liters > 0.1) return null;
  const product = (n: number) => (background.silver + n) * (background.chloride + n);
  const limit = ksp * (volume_ml / 1000) ** 2;
  // Do not consume background ions without a counterion transaction.
  if (product(0) > limit * (1 + 1e-12)) return null;
  let dissolvedMoles = totalMoles;
  if (product(totalMoles) > limit) {
    let low = 0, high = totalMoles;
    for (let i = 0; i < 60; i++) {
      const middle = (low + high) / 2;
      if (product(middle) < limit) low = middle;
      else high = middle;
    }
    dissolvedMoles = (low + high) / 2;
  }
  return { dissolvedMoles, totalMoles, totalMass_g };
}

/** Finite visual relaxation (0.3/s), not measured silver chloride dissolution kinetics.
 * The equilibrium endpoint depends on T, volume and common ions, not dt. */
export function partitionSilverChloride(vessel: VesselState, dt: number): Partial<VesselState> | null {
  return partitionSilverHalide(vessel, dt, 'Cl');
}

export function partitionSilverHalide(vessel: VesselState, dt: number, selected?: Halide): Partial<VesselState> | null {
  const halide = selected ?? (['Cl', 'Br', 'I'] as const).find(h => vessel.contents.some(c => isHalidePool(c, h)));
  if (!halide) return null;
  const substance = `Ag${halide}`;
  const isSilverChloridePool = (c: SubstanceContent) => isHalidePool(c, halide);
  if (!(dt > 0) || !Number.isFinite(dt) || vessel.isShattered
    || (vessel.immiscibleOrganicVolume_ml ?? 0) > 0) return null;
  const target = silverChloridePhaseTarget(vessel.contents, vessel.volume_ml, vessel.temperature_c, halide);
  if (!target) return null;
  const dissolved = vessel.contents.filter(c => isSilverChloridePool(c) && c.phase === 'aq').reduce((sum, c) => sum + c.moles, 0);
  const difference = target.dissolvedMoles - dissolved;
  if (difference === 0) return null;
  if (target.dissolvedMoles > 0 && target.dissolvedMoles < target.totalMoles
    && Math.abs(difference) <= Math.max(1e-15, target.totalMoles * 1e-10)) return null;
  // Snap the last numerical tail into the equilibrium pool before idling.
  // Merely returning null here would retain a phantom solid indefinitely.
  const next = Math.abs(difference) <= Math.max(1e-15, target.totalMoles * 1e-8) ? target.dissolvedMoles
    : dissolved + difference * -Math.expm1(-0.3 * dt);
  const dissolvedMass = target.totalMass_g * next / target.totalMoles;
  const solidMass = target.totalMass_g - dissolvedMass;
  const contents = vessel.contents.filter(c => !isSilverChloridePool(c));
  if (next > 0) contents.push({ formula: substance, phase: 'aq', moles: next,
    mass_g: dissolvedMass, concentration_M: next / (vessel.volume_ml / 1000) });
  if (next < target.totalMoles) contents.push({ formula: substance, phase: 's',
    moles: target.totalMoles - next, mass_g: solidMass, solidOrigin: 'precipitate' });
  const heat_J = -(next - dissolved) * silverHalideDissolutionEnthalpy_J_mol(halide);
  const thermal = applyThermalEnergy({ ...vessel, contents }, heat_J);
  return { contents, ...thermal, substances: [...new Set(contents.map(c => c.formula))],
    hasPrecipitate: solidMass > 1e-9, precipitateAmount_g: solidMass,
    precipitateSubstance: substance, precipitateColor: getPrecipitateProfile(substance).color,
    precipitateMorphology: 'CURD',
    ...(solidMass <= 1e-9 ? { turbidity: 0 } : {}) };
}
