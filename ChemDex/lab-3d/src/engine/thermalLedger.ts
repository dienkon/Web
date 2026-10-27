import type { VesselState } from '../types/chemistry';
import type { ReactionProgram } from '../shared/programSchema';
import { applyProgramToLedger } from './ledger';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { applyThermalEnergy } from './thermalState';
import { ensureHeadspaceReference, gasPressurePatch } from './headspacePressure';
import { projectAqueousSolution } from './aqueousProjection';
import { reconcileReplayGas } from './replayGasBoundary';

/** Replay composition from the reaction baseline, but add only heat not already
 * delivered. The current temperature includes external heating and cooling.
 * Historical solvent loss is removed before applying the new heat packet. */
export function applyProgramWithThermalSinks(program: ReactionProgram, baseline: VesselState, current: VesselState, extent: number, elapsed_s = 0): Partial<VesselState> {
  const result = applyProgramToLedger(program, baseline, extent, { deferThermal: true });
  return applyLedgerWithThermalSinks(result, baseline, current, elapsed_s);
}

/** Shared by program replay and staged native chemistry. Composition and total
 * reaction heat are cumulative; only the new heat packet reaches the sample. */
export function applyLedgerWithThermalSinks(result: Partial<VesselState>, baseline: VesselState, current: VesselState, elapsed_s = 0): Partial<VesselState> {
  baseline = ensureHeadspaceReference(baseline);
  const gasBoundary = reconcileReplayGas(result, baseline, current);
  if (!gasBoundary) return { ...current, contents: current.contents.map(c => ({ ...c })), gasReplayBlocked: true };
  result = { ...result, ...gasBoundary };
  const returnedWater = (current.wallCondensation?.returned_g ?? 0) - (baseline.wallCondensation?.returned_g ?? 0)
    + (current.condensateReceived_g ?? 0) - (baseline.condensateReceived_g ?? 0);
  const netLostWater = (current.evaporated_ml ?? 0) - (baseline.evaporated_ml ?? 0) - returnedWater;
  const lostWater = Math.max(0, netLostWater);
  const suppliedWater = Math.max(0, -netLostWater);
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
  if (suppliedWater > 0) {
    const liquid = contents.find(item => sameMolecularFormula(item.formula, 'H2O') && item.phase === 'l');
    if (liquid) { liquid.mass_g += suppliedWater; liquid.moles += suppliedWater / 18.015; }
    else contents.push({ formula: 'H2O', phase: 'l', mass_g: suppliedWater, moles: suppliedWater / 18.015 });
  }
  const targetHeat = result.programHeatApplied_J ?? current.programHeatApplied_J ?? baseline.programHeatApplied_J ?? 0;
  const previousHeat = current.programHeatApplied_J ?? baseline.programHeatApplied_J ?? 0;
  const inventory = { ...current, ...result, contents,
    temperature_c: current.temperature_c, volume_ml: current.volume_ml, evaporated_ml: current.evaporated_ml,
    thermalVaporEnthalpy_J: current.thermalVaporEnthalpy_J,
    thermalVaporSensibleEnthalpy_J: current.thermalVaporSensibleEnthalpy_J,
    mass_g: Math.max(0, (result.mass_g ?? baseline.mass_g) - removed + suppliedWater) };
  const thermal = applyThermalEnergy(inventory, targetHeat - previousHeat, elapsed_s);
  const projected = { ...inventory, ...thermal, sealedHeadspace: current.sealedHeadspace ?? baseline.sealedHeadspace };
  return { ...result, ...thermal, ph: projected.ph, phModel: projected.phModel,
    phReferenceTemperature_c: projected.phReferenceTemperature_c,
    ...projectAqueousSolution(projected), programHeatApplied_J: targetHeat,
    gasReplayBlocked: false,
    ...gasPressurePatch(projected) };
}
