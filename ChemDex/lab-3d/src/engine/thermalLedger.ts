import type { VesselState } from '../types/chemistry';
import type { ReactionProgram } from '../shared/programSchema';
import { applyProgramToLedger } from './ledger';
import { sameMolecularFormula } from '../science/speciesIdentity';

/** Replaying a reaction from its baseline must also replay subsequent solvent
 * losses; otherwise each animation frame restores previously evaporated water.
 */
export function applyProgramWithThermalSinks(program: ReactionProgram, baseline: VesselState, current: VesselState, extent: number): Partial<VesselState> {
  const result = applyProgramToLedger(program, baseline, extent);
  const lostWater = Math.max(0, (current.evaporated_ml ?? 0) - (baseline.evaporated_ml ?? 0));
  if (lostWater <= 0 || !result.contents) return result;
  const liquidWater = result.contents.filter(item => sameMolecularFormula(item.formula, 'H2O') && item.phase !== 'g');
  const available = liquidWater.reduce((sum, item) => sum + item.mass_g, 0);
  const retained = available > 0 ? Math.max(0, 1 - lostWater / available) : 0;
  const waterEntries = new Set(liquidWater);
  const contents = result.contents.map(item => {
    if (waterEntries.has(item)) return { ...item, mass_g: item.mass_g * retained, moles: item.moles * retained };
    return { ...item, ...(item.phase === 'aq' && current.volume_ml > 0 ? { concentration_M: item.moles / (current.volume_ml / 1000) } : {}) };
  });
  return { ...result, contents, mass_g: Math.max(0, (result.mass_g ?? baseline.mass_g) - lostWater) };
}
