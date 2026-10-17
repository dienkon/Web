import type { VesselState } from '../types/chemistry';
import type { ReactionProgram } from '../shared/programSchema';
import { applyProgramToLedger } from './ledger';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { applyThermalEnergy, sealedGasPressure } from './thermalState';

/** Replay composition from the reaction baseline, but add only heat not already
 * delivered. The current temperature includes external heating and cooling.
 * Historical solvent loss is removed before applying the new heat packet. */
export function applyProgramWithThermalSinks(program: ReactionProgram, baseline: VesselState, current: VesselState, extent: number, elapsed_s = 0): Partial<VesselState> {
  const result = applyProgramToLedger(program, baseline, extent, { deferThermal: true });
  const lostWater = Math.max(0, (current.evaporated_ml ?? 0) - (baseline.evaporated_ml ?? 0));
  const entries = result.contents ?? baseline.contents;
  const liquidWater = entries.filter(item => sameMolecularFormula(item.formula, 'H2O') && item.phase !== 'g');
  const available = liquidWater.reduce((sum, item) => sum + item.mass_g, 0);
  const removed = Math.min(lostWater, available);
  const retained = available > 0 ? Math.max(0, 1 - removed / available) : 0;
  const waterEntries = new Set(liquidWater);
  const contents = entries.map(item => {
    if (waterEntries.has(item)) return { ...item, mass_g: item.mass_g * retained, moles: item.moles * retained };
    return { ...item, ...(item.phase === 'aq' && current.volume_ml > 0 ? { concentration_M: item.moles / (current.volume_ml / 1000) } : {}) };
  });
  const targetHeat = result.programHeatApplied_J ?? current.programHeatApplied_J ?? baseline.programHeatApplied_J ?? 0;
  const previousHeat = current.programHeatApplied_J ?? baseline.programHeatApplied_J ?? 0;
  const inventory = { ...current, ...result, contents,
    temperature_c: current.temperature_c, volume_ml: current.volume_ml, evaporated_ml: current.evaporated_ml,
    mass_g: Math.max(0, (result.mass_g ?? baseline.mass_g) - removed) };
  const thermal = applyThermalEnergy(inventory, targetHeat - previousHeat, elapsed_s);
  const projected = { ...inventory, ...thermal };
  return { ...result, ...thermal, programHeatApplied_J: targetHeat,
    internalPressure_atm: sealedGasPressure(projected) };
}
