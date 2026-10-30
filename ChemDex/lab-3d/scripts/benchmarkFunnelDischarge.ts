import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { calculateFunnelDischarge, circularPortFlux } from '../src/science/funnelDischarge';
import { stepFunnelFlow, advanceFunnelFlow } from '../src/engine/funnelFlow';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { solveLevel } from '../src/pour/physics/retained';
import { metersPerModelUnit, GRAVITY_M_S2 } from '../src/science/sceneUnits';
import { computeMolarMass } from '../src/engine/ledger';
import type { VesselState } from '../src/types/chemistry';
const contents = [{ formula: 'H2O', phase: 'l', liquidLayer: 'aqueous' as const, mass_g: 20, moles: 20 / computeMolarMass('H2O') },
  { formula: 'C6H6', phase: 'l', liquidLayer: 'organic' as const, mass_g: 8.79, moles: 8.79 / computeMolarMass('C6H6') }];
const fixture: VesselState = { id: 'source', name: 'source', type: 'separatory_funnel', capacity_ml: 150, volume_ml: 30, volume: 0.2,
  immiscibleOrganicVolume_ml: 10, contents, substances: ['H2O', 'C6H6'], mass_g: 28.79, position: [0, 4, 0], rotationY: 0,
  isLocked: false, temperature_c: 25, ph: 7, stopcockOpen: true, hasGas: false, hasPrecipitate: false, isBoiling: false };
const quantile = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)];
const times: number[] = [];
const advanceTimes: number[] = [];
for (let i = 0; i < 150; i++) {
  const angle = 0.5 + i / 150, start = performance.now(); calculateFunnelDischarge(fixture, [-Math.sin(angle), Math.cos(angle), 0]);
  if (i >= 30) times.push(performance.now() - start);
  const stepStart = performance.now(); advanceFunnelFlow(fixture, null, 0.05, [-Math.sin(angle), Math.cos(angle), 0]);
  if (i >= 30) advanceTimes.push(performance.now() - stepStart);
}
const angles = [0, 0.5, 1.08, 1.1, 1.3, Math.PI].map(theta => ({ theta, ...calculateFunnelDischarge(fixture, [-Math.sin(theta), Math.cos(theta), 0]) }));
const profile = getVesselProfile(fixture.type, fixture.capacity_ml), base = calculateFunnelDischarge(fixture), meters = metersPerModelUnit(profile);
// Independent scalar ODE oracle for the upright, still-water-lower interval.
// No store, withdrawals or production port quadrature in this time integral.
const rate = (water: number) => {
  const c1 = solveLevel(profile, 0, water).c, c2 = solveLevel(profile, 0, water + 10).c;
  const head = (c1 - base.outletY + 0.879 * (c2 - c1)) * meters;
  return 0.62 * Math.PI * (base.radius * meters) ** 2 * Math.sqrt(2 * GRAVITY_M_S2 * head) * 1e6;
};
let referenceWater = 20; const dt = 1 / 4096;
for (let i = 0; i < 4096; i++) {
  const a = -rate(referenceWater), b = -rate(referenceWater + dt * a / 2), c = -rate(referenceWater + dt * b / 2), d = -rate(referenceWater + dt * c);
  referenceWater += dt / 6 * (a + 2 * b + 2 * c + d);
}
const temporal = [20, 60, 120].map(hz => {
  let v = fixture, midpoint = fixture;
  for (let i = 0; i < hz; i++) { v = stepFunnelFlow(v, null, 1 / hz).source; midpoint = advanceFunnelFlow(midpoint, null, 1 / hz).source; }
  return { hz, eulerWaterRemaining_ml: v.volume_ml - 10, eulerError_ml: v.volume_ml - 10 - referenceWater,
    midpointWaterRemaining_ml: midpoint.volume_ml - 10, midpointError_ml: midpoint.volume_ml - 10 - referenceWater };
});
let oracle = 0; const r = 0.06, count = 200000, end = 0.001, m = 0.04;
for (let i = 0; i < count; i++) {
  const s = -r + (end + r) * (i + 0.5) / count;
  oracle += 2 * Math.sqrt(r * r - s * s) * Math.sqrt(2 * GRAVITY_M_S2 * (0.001 - s) * m) * (end + r) / count;
}
const partial = circularPortFlux(r, -r, r, 0.001, 1, m).flow_ml_s, reference = oracle * 0.62 * m * m * 1e6;
const output = 'docs/research/funnel-discharge-2026-10-30'; mkdirSync(output, { recursive: true });
writeFileSync(`${output}/cpu.json`, JSON.stringify({ node: process.version,
  method: '30 warmups and 120 changing normals, CPU discharge only, no React/render/transport. Separate one-second scalar RK4 time oracle and independent 200000-strip port integral. No FPS or calibration claim.',
  median_ms: quantile(times, 0.5), p95_ms: quantile(times, 0.95), times, angles,
  advance_median_ms: quantile(advanceTimes, 0.5), advance_p95_ms: quantile(advanceTimes, 0.95), advanceTimes,
  partial: { production_ml_s: partial, reference_ml_s: reference, error_ml_s: partial - reference },
  referenceWater_ml: referenceWater, temporal }, null, 2));
console.log({ median_ms: quantile(times, 0.5), p95_ms: quantile(times, 0.95), partialError: partial - reference, referenceWater, temporal });
