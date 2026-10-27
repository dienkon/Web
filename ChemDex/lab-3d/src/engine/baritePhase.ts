import type { SubstanceContent, VesselState } from '../types/chemistry';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { bariteIonInventory, bariteKspAtTemperature, bariteDissolutionEnthalpy_J_mol } from '../science/baritePrecipitation';
import { applyThermalEnergy } from './thermalState';

const isBaritePool = (item: SubstanceContent) => sameMolecularFormula(item.formula, 'BaSO4')
  && (item.phase === 's' || item.phase === 'aq');

/** Repartition only the existing BaSO4 formula-unit pool. Counterions stay
 * in their original pools; precipitation from other salts belongs to the
 * reaction ledger. Ideal concentrations, no complexation or activity model. */
export function baritePhaseTarget(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number) {
  if (!(volume_ml > 0) || !Number.isFinite(volume_ml)) return null;
  const pool = contents.filter(isBaritePool);
  if (!pool.length || contents.some(c => !Number.isFinite(c.mass_g) || c.mass_g < 0
    || !Number.isFinite(c.moles) || c.moles < 0 || (c.location && c.location !== 'bulk'))) return null;
  const all = bariteIonInventory(contents);
  const background = bariteIonInventory(contents.filter(c => !isBaritePool(c)));
  const ksp = bariteKspAtTemperature(temperature_c);
  if (!all || !background || ksp === null) return null;
  const totalMoles = pool.reduce((sum, c) => sum + c.moles, 0);
  const totalMass_g = pool.reduce((sum, c) => sum + c.mass_g, 0);
  if (!(totalMoles > 0) || !(totalMass_g > 0)) return null;
  const product = (n: number) => (background.barium + n) * (background.sulfate + n);
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

/** Finite visual relaxation (0.3/s), not measured barite dissolution kinetics.
 * The equilibrium endpoint depends on T, volume and common ions, not dt. */
export function partitionBarite(vessel: VesselState, dt: number): Partial<VesselState> | null {
  if (!(dt > 0) || !Number.isFinite(dt) || vessel.isShattered
    || (vessel.immiscibleOrganicVolume_ml ?? 0) > 0) return null;
  const target = baritePhaseTarget(vessel.contents, vessel.volume_ml, vessel.temperature_c);
  if (!target) return null;
  const dissolved = vessel.contents.filter(c => isBaritePool(c) && c.phase === 'aq').reduce((sum, c) => sum + c.moles, 0);
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
  const contents = vessel.contents.filter(c => !isBaritePool(c));
  if (next > 0) contents.push({ formula: 'BaSO4', phase: 'aq', moles: next,
    mass_g: dissolvedMass, concentration_M: next / (vessel.volume_ml / 1000) });
  if (next < target.totalMoles) contents.push({ formula: 'BaSO4', phase: 's',
    moles: target.totalMoles - next, mass_g: solidMass, solidOrigin: 'precipitate' });
  const heat_J = -(next - dissolved) * bariteDissolutionEnthalpy_J_mol(vessel.temperature_c)!;
  const thermal = applyThermalEnergy({ ...vessel, contents }, heat_J);
  return { contents, ...thermal, substances: [...new Set(contents.map(c => c.formula))],
    hasPrecipitate: solidMass > 1e-9, precipitateAmount_g: solidMass,
    precipitateSubstance: 'BaSO4', precipitateColor: '#ffffff',
    precipitateMorphology: 'FINE_POWDER',
    ...(solidMass <= 1e-9 ? { turbidity: 0 } : {}) };
}
