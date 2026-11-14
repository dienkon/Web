import type { SubstanceContent, VesselState } from '../types/chemistry';
import { computeMolarMass } from './ledger';
import { reagentPhase } from '../science/reagentAvailability';
import { evolveLandolt, landoltCapacity, landoltContents, landoltEndpoint, landoltInventory,
  type LandoltInventory } from '../science/landoltClock';

export function landoltColor(t: LandoltInventory): string {
  const starch = t.retained.some(c => (!c.location || c.location === 'bulk') && c.moles > 0
    && reagentPhase(c) === 'aq' && /^(starch|tinh bột)$/i.test(c.formula));
  // Authored optical sensitivity, not calibrated absorbance or binding capacity.
  // Total oxidized iodine is an optical proxy: the model does not calculate
  // finite polymer binding sites or hydrolysis-supplied iodide at late times.
  const signal = t.iodine / t.liters / (starch ? 2e-5 : 1e-4);
  const weight = Math.max(0, Math.min(1, signal));
  const target = starch ? [15, 23, 42] : [153, 98, 29];
  return '#' + [248, 250, 252].map((base, i) => Math.round(base + (target[i] - base) * weight).toString(16).padStart(2, '0')).join('');
}

function project(vessel: VesselState, t: LandoltInventory): Partial<VesselState> | null {
  const composition = landoltContents(t);
  if (!composition) return null;
  const contents: SubstanceContent[] = composition.amounts.filter(([, n]) => n > 0).map(([formula, moles]) => ({
    formula, moles, mass_g: moles * computeMolarMass(formula), phase: 'aq', concentration_M: moles / t.liters,
  }));
  contents.push({ formula: 'H2O', moles: composition.water, mass_g: composition.water * computeMolarMass('H2O'), phase: 'l' });
  contents.push(...t.retained);
  return { contents, substances: [...new Set(contents.filter(c => c.moles > 1e-12).map(c => c.formula))],
    mass_g: contents.reduce((sum, c) => sum + c.mass_g, 0), liquidColor: landoltColor(t), ph: composition.state.ph,
    phModel: 'ideal_aqueous_25c', phReferenceTemperature_c: 25,
    hasGas: false, hasPrecipitate: vessel.hasPrecipitate, precipitateAmount_g: vessel.precipitateAmount_g ?? 0,
    programHeatApplied_J: vessel.programHeatApplied_J ?? 0 };
}

/** Terminal redox reference for planning. Runtime uses elapsed time below. */
export function previewLandoltLedger(vessel: VesselState, extent: number): Partial<VesselState> | null {
  const initial = landoltInventory(vessel.contents, vessel.volume_ml);
  if (!initial || !Number.isFinite(extent) || vessel.temperature_c < 0 || vessel.temperature_c > 90) return null;
  const end = landoltEndpoint(initial), fraction = Math.max(0, Math.min(1, extent));
  const blended = { ...initial };
  for (const key of ['iodate', 'iodide', 'iodine', 'sulfite', 'sulfate'] as const)
    blended[key] += (end[key] - initial[key]) * fraction;
  return project(vessel, blended);
}

const cache = new WeakMap<VesselState, { dt: number; result: ReturnType<typeof calculate> }>();
function calculate(vessel: VesselState, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(vessel.temperature_c)
    || vessel.temperature_c < 0 || vessel.temperature_c > 90) return null;
  const before = landoltInventory(vessel.contents, vessel.volume_ml);
  if (!before) return null;
  const after = evolveLandolt(before, dt);
  const scale = before.iodate + before.iodide + 2 * before.iodine + before.sulfite;
  // Stop the authored run at a trace-residual tolerance. Preserve those real
  // traces: reaching the UI endpoint must not force a stoichiometric jump.
  const terminal = landoltCapacity(after) <= Math.max(1e-14, scale * 1e-4)
    && Math.min(after.iodine, after.sulfite) <= Math.max(1e-14, scale * 1e-4);
  const patch = project(vessel, after);
  return patch ? { before, after, patch, terminal } : null;
}

/** Progress and material replay inspect the same accepted step. Transfers
 * naturally rebase this stateless calculation on the remaining finite sample. */
export function stepLandoltLedger(vessel: VesselState, dt: number) {
  const entry = cache.get(vessel);
  if (entry?.dt === dt) return entry.result;
  const result = calculate(vessel, dt);
  cache.set(vessel, { dt, result });
  return result;
}
