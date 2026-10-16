import type { VesselState } from '../types/chemistry';
import { checkSaturation } from '../simulation/chemistry/SolubilityEngine';

/** Formula-unit phase partition; dissolved Pb/I speciation is simplified. */
export function partitionLeadIodide(vessel: VesselState, dt: number): Partial<VesselState> | null {
  // The generic beaker phase model cannot relocate retained filter cake.
  if (vessel.contents.some(item => item.formula === 'PbI2' && item.location === 'filter')) return null;
  const entries = vessel.contents.filter(item => item.formula === 'PbI2');
  if (!entries.length || !Number.isFinite(dt) || dt <= 0 || vessel.volume_ml <= 0) return null;
  const totalMass = entries.reduce((sum, item) => sum + item.mass_g, 0);
  const totalMoles = entries.reduce((sum, item) => sum + item.moles, 0);
  if (totalMass <= 0 || totalMoles <= 0) return null;
  const currentSolid = entries.filter(item => item.phase === 's').reduce((sum, item) => sum + item.mass_g, 0);
  const saturation = checkSaturation('PbI2', totalMass, vessel.volume_ml, vessel.temperature_c);
  const targetSolid = saturation.excessPrecipitate_g;
  const difference = targetSolid - currentSolid;
  if (Math.abs(difference) < 1e-12
    && Math.abs((vessel.precipitateAmount_g ?? 0) - currentSolid) < 1e-9) return null;
  const response = 1 - Math.exp(-Math.min(dt, 0.5) * (difference < 0 ? 1.2 : 0.35));
  const solidMass = Math.abs(difference) < Math.max(1e-9, totalMass * 1e-6) ? targetSolid
    : Math.max(0, Math.min(totalMass, currentSolid + difference * response));
  const solidMoles = totalMoles * solidMass / totalMass;
  const contents = vessel.contents.filter(item => item.formula !== 'PbI2');
  if (solidMass > 1e-12) contents.push({ formula: 'PbI2', phase: 's', moles: solidMoles, mass_g: solidMass });
  if (totalMass - solidMass > 1e-12) contents.push({
    formula: 'PbI2', phase: 'aq', moles: totalMoles - solidMoles,
    mass_g: totalMass - solidMass,
    concentration_M: (totalMoles - solidMoles) / (vessel.volume_ml / 1000),
  });
  return {
    contents,
    hasPrecipitate: solidMass > 1e-9,
    precipitateAmount_g: solidMass,
    precipitateColor: '#f5c518',
    precipitateSubstance: 'PbI2',
    precipitateMorphology: 'CRYSTAL_PLATE',
    liquidColor: '#f8fafc',
    turbidity: Math.min(0.45, solidMass / Math.max(0.01, vessel.volume_ml) * 5),
  };
}
