import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { landoltInventory, landoltSpeciation, LANDOLT_SOURCE, LANDOLT_STEPS } from '../src/science/landoltClock';
import { stepLandoltLedger } from '../src/engine/landoltClockLedger';
import { computeMolarMass } from '../src/engine/ledger';
import { readComposition, auditEquation } from '../src/science/balance';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { useAppStore } from '../src/store/useAppStore';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const output = 'artifacts/landolt-clock'; mkdirSync(output, { recursive: true });
const row = (formula: string, moles: number, phase = 'aq'): SubstanceContent => ({ formula, moles, mass_g: moles * computeMolarMass(formula), phase });
function sample(iodate: number, ratio: number, volume_ml: number): VesselState {
  const contents = [row('KIO3', iodate), row('NaHSO3', iodate * ratio), row('H2O', volume_ml / 18.015, 'l'), row('Starch', 1e-5)];
  return { id: 'audit_clock', name: 'Clock', type: 'beaker', capacity_ml: 250, volume_ml, volume: volume_ml / 250,
    mass_g: contents.reduce((n, c) => n + c.mass_g, 0), position: [0, 0, 0], rotationY: 0, isLocked: false,
    contents, substances: contents.map(c => c.formula), temperature_c: 25, ph: 7, liquidColor: '#f8fafc',
    hasGas: false, hasPrecipitate: false, isBoiling: false };
}
function atoms(contents: SubstanceContent[]) {
  const result: Record<string, number> = {};
  for (const c of contents.filter(c => c.formula !== 'Starch')) for (const [e, n] of Object.entries(readComposition(c.formula).atoms)) result[e] = (result[e] ?? 0) + n * c.moles;
  return result;
}
const grid = [];
for (const iodate of [0.0002, 0.001, 0.002]) for (const ratio of [1.5, 2.7, 3, 4]) for (const volume_ml of [30, 60]) {
  const original = sample(iodate, ratio, volume_ml), before = atoms(original.contents);
  let v = original, colorTime: number | null = null, peakIodineWhileSulfite_M = 0, maximumAtomError_mol = 0;
  for (let time = 0; time < 240; time += 0.25) {
    const step = stepLandoltLedger(v, 0.25)!; assert.ok(step);
    v = { ...v, ...step.patch };
    const t = landoltInventory(v.contents, v.volume_ml)!;
    const after = atoms(v.contents);
    maximumAtomError_mol = Math.max(maximumAtomError_mol, ...Object.keys(before).map(e => Math.abs(before[e] - after[e])));
    assert.ok(Math.abs(v.mass_g - original.mass_g) < 1e-8);
    assert.ok(Math.abs(landoltSpeciation(t).charge) < 1e-9);
    if (t.sulfite / t.liters > 1e-5) peakIodineWhileSulfite_M = Math.max(peakIodineWhileSulfite_M, t.iodine / t.liters);
    if (colorTime === null && t.iodine / t.liters > 2e-5) colorTime = time + 0.25;
    if (step.terminal) break;
  }
  assert.ok(maximumAtomError_mol < 1e-9);
  if (ratio >= 3) assert.equal(colorTime, null);
  if (ratio < 3) assert.notEqual(colorTime, null);
  const t = landoltInventory(v.contents, volume_ml)!;
  grid.push({ initialIodate_mol: iodate, sulfiteIodateRatio: ratio, volume_ml, colorThresholdTime_s: colorTime,
    finalSulfite_mol: t.sulfite, finalIodineEquivalent_mol: t.iodine, finalPh: landoltSpeciation(t).ph,
    maximumAtomError_mol, peakIodineWhileSulfite_M, finalColor: v.liquidColor });
}

await new Promise(resolve => setTimeout(resolve, 200));
const e = new AutoExperiment('iodine_clock', true); await e.stocks.initialize();
const before = useAppStore.getState(), initialMass = e.donors.reduce((sum, d) => sum + d.row.mass_g, 0);
let maximumMassError_g = 0, firstIodineTime_s: number | null = null;
for (let frame = 0; frame < 240 * 60 && !['complete', 'error'].includes(e.phase); frame++) {
  e.tick(1 / 60);
  const pending = e.donors.reduce((sum, d) => sum + d.row.mass_g * (1 - d.fraction), 0);
  const lost = (e.sample.evaporated_ml ?? 0) - (e.sample.condensateReceived_g ?? 0);
  maximumMassError_g = Math.max(maximumMassError_g, Math.abs(e.sample.mass_g + pending + lost - initialMass));
  const t = landoltInventory(e.sample.contents, e.sample.volume_ml);
  if (firstIodineTime_s === null && t && t.iodine / t.liters > 2e-5) firstIodineTime_s = e.elapsed;
}
const automatic = { phase: e.phase, error: e.error, elapsed_s: e.elapsed, firstIodineTime_s,
  finalColor: e.sample.liquidColor, maximumMassError_g, workbenchUnchanged: useAppStore.getState() === before,
  finalCloudiness: e.physics.cloudiness };
e.stocks.dispose();
assert.equal(automatic.error, null); assert.equal(automatic.phase, 'complete');
assert.equal(automatic.finalColor, '#0f172a'); assert.ok(automatic.maximumMassError_g < 1e-7);
assert.ok(automatic.workbenchUnchanged);
const steps = LANDOLT_STEPS.map(s => ({ ...s, balance: auditEquation(s.reactants, s.products) }));
assert.ok(steps.every(s => s.balance.valid));
const report = { checkedAt: new Date().toISOString(), source: LANDOLT_SOURCE, referenceTemperature_c: 25,
  steps, gridPoints: grid.length, grid, automatic, experimentallyCalibrated: false,
  limitations: ['Ideal concentrations and local fast equilibria.', 'No oxygen transfer or spatial fronts.',
    'No fitted temperature correction or calorimetry.', 'Starch color is an authored total-iodine proxy, not finite binding-site speciation.',
    'Run completion preserves trace material; it does not force exact stoichiometric exhaustion.'] };
writeFileSync(`${output}/audit.json`, JSON.stringify(report, null, 2) + '\n');
console.log({ gridPoints: grid.length, automatic });
