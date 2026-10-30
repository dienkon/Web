import { afterEach, expect, it } from 'vitest';
import { Matrix4 } from 'three';
import { calculateFunnelDischarge, circularPortFlux } from '../src/science/funnelDischarge';
import { stepFunnelFlow, advanceFunnelFlow } from '../src/engine/funnelFlow';
import { createFunnelParcel } from '../src/engine/funnelTransport';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { solveLevel } from '../src/pour/physics/retained';
import { GRAVITY_M_S2, metersPerModelUnit } from '../src/science/sceneUnits';
import { phaseDensities, separatedLayers } from '../src/science/liquidLayers';
import { computeMolarMass } from '../src/engine/ledger';
import { useAppStore } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';
const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));
const fixture = (organicDensity = 0.879): VesselState => {
  const row = (formula: string, mass_g: number, liquidLayer: 'aqueous' | 'organic') => ({ formula, mass_g,
    moles: mass_g / computeMolarMass(formula), phase: 'l', liquidLayer });
  const contents = [row('H2O', 20, 'aqueous'), row('C6H6', organicDensity * 10, 'organic')];
  return { id: 'source', name: 'source', type: 'separatory_funnel', capacity_ml: 150, volume_ml: 30, volume: 0.2,
    immiscibleOrganicVolume_ml: 10, contents, substances: ['H2O', 'C6H6'], mass_g: contents.reduce((s, r) => s + r.mass_g, 0),
    position: [0, 4, 0], rotationY: 0, temperature_c: 25, ph: 7, isLocked: false, stopcockOpen: true,
    hasGas: false, hasPrecipitate: false, isBoiling: false };
};
const receiver = (): VesselState => ({ ...fixture(), id: 'target', name: 'target', type: 'beaker', position: [0, -0.135, 0],
  volume_ml: 0, volume: 0, mass_g: 0, contents: [], substances: [], immiscibleOrganicVolume_ml: 0, capacity_ml: 100 });

it('recovers constant-head circular orifice flow and radius-squared scaling', () => {
  const r = 0.06, meters = 0.04, head = 0.8, cd = 0.62;
  const expected = cd * Math.PI * (r * meters) ** 2 * Math.sqrt(2 * GRAVITY_M_S2 * head * meters) * 1e6;
  const flux = circularPortFlux(r, -r, r, head, 0, meters, cd);
  expect(flux.flow_ml_s).toBeCloseTo(expected, 11);
  expect(circularPortFlux(r * 2, -2 * r, 2 * r, head, 0, meters, cd).flow_ml_s).toBeCloseTo(expected * 4, 10);
  expect(circularPortFlux(r, 0, r, head, 0, meters, cd).flow_ml_s).toBeCloseTo(expected / 2, 11);
});
it('matches a separate fine midpoint strip integral for partial and zero-pressure port bands', () => {
  const r = 0.06, meters = 0.04;
  for (const [a, b, head, slope] of [[-r, r, 0.001, 1], [-0.03, 0.02, 0.2, 0.6], [0.02, r, -0.03, 1]]) {
    const low = Math.max(-r, a), high = Math.min(r, b, slope > 0 ? head / slope : r), n = 200000;
    let integral = 0;
    if (high > low) for (let i = 0; i < n; i++) {
      const s = low + (i + 0.5) / n * (high - low);
      integral += 2 * Math.sqrt(r * r - s * s) * Math.sqrt(2 * GRAVITY_M_S2 * Math.max(0, head - slope * s) * meters) * (high - low) / n;
    }
    expect(circularPortFlux(r, a, b, head, slope, meters).flow_ml_s).toBeCloseTo(0.62 * integral * meters ** 2 * 1e6, 5);
  }
});
for (const rho of [0.879, 1.49]) it(`uses both hydrostatic columns for density ${rho}`, () => {
  const v = fixture(rho), p = getVesselProfile(v.type, v.capacity_ml), layers = separatedLayers(v), densities = phaseDensities(v);
  const lower = solveLevel(p, 0, layers.lowerVolume_ml).c, top = solveLevel(p, 0, v.volume_ml).c;
  const flow = calculateFunnelDischarge(v), upperPhase = layers.lower === 'organic' ? 'aqueous' : 'organic';
  const head = lower - flow.outletY + densities[upperPhase] / densities[layers.lower] * (top - lower);
  const meters = metersPerModelUnit(p);
  const expected = 0.62 * Math.PI * (flow.radius * meters) ** 2 * Math.sqrt(2 * GRAVITY_M_S2 * head * meters) * 1e6;
  expect(flow.total_ml_s).toBeCloseTo(expected, 9);
  expect(flow[layers.lower].flow_ml_s).toBe(flow.total_ml_s); expect(flow[upperPhase].flow_ml_s).toBe(0);
});
it('stops at a dry or sealed port and permits both phases to wet a tilted port', () => {
  const v = fixture();
  expect(calculateFunnelDischarge({ ...v, stopcockOpen: false }).total_ml_s).toBe(0);
  expect(calculateFunnelDischarge({ ...v, isSealed: true }).total_ml_s).toBe(0);
  expect(calculateFunnelDischarge({ ...v, volume_ml: 0 }).total_ml_s).toBe(0);
  expect(calculateFunnelDischarge(v, [0, -1, 0]).total_ml_s).toBe(0);
  let found = false;
  for (let theta = 0.9; theta < 1.7; theta += 0.002) {
    const flow = calculateFunnelDischarge(v, [-Math.sin(theta), Math.cos(theta), 0]);
    if (flow.aqueous.flow_ml_s > 0 && flow.organic.flow_ml_s > 0) { found = true; break; }
  }
  expect(found).toBe(true);
});
it('withdraws Q*dt without changing source solids or making negative phase inventories', () => {
  const v = fixture(), dt = 0.001, flow = calculateFunnelDischarge(v), transfer = stepFunnelFlow(v, null, dt);
  expect(transfer.moved_ml).toBeCloseTo(flow.total_ml_s * dt, 12);
  expect(transfer.source.mass_g + transfer.spill!.mass_g).toBeCloseTo(v.mass_g, 12);
  expect(transfer.source.volume_ml + transfer.spill!.volume_ml).toBeCloseTo(v.volume_ml, 12);
});
it('keeps source birth coordinates in a finite parcel and waits for flight before receipt', () => {
  const v = fixture(), target = receiver(), release = stepFunnelFlow(v, null, 0.001), matrix = new Matrix4().makeTranslation(0, 4, 0);
  const parcel = createFunnelParcel(v, target, release.spill!, 0.001, release.discharge, matrix)!;
  matrix.makeTranslation(20, 20, 20);
  expect(parcel.trajectory.exitPos[0]).toBe(0); expect(parcel.trajectory.timeOfFlight).toBeGreaterThan(0);
  useAppStore.setState({ vessels: { source: release.source, target }, vesselIds: ['source', 'target'],
    inFlightPours: [parcel], spills: {}, isSimulationPaused: false, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {} });
  useAppStore.getState().advancePourTransport(parcel.trajectory.timeOfFlight / 2);
  expect(useAppStore.getState().vessels.target.volume_ml).toBe(0);
  expect(useAppStore.getState().inFlightPours[0].sample.volume_ml).toBe(release.moved_ml);
  useAppStore.getState().advancePourTransport(parcel.trajectory.timeOfFlight + 1);
  expect(useAppStore.getState().vessels.target.volume_ml).toBeCloseTo(release.moved_ml, 10);
  expect(useAppStore.getState().inFlightPours.length).toBe(0);
});

it('publishes actual store withdrawal and parcel ownership in one state transaction', () => {
  const source = fixture(), target = receiver();
  useAppStore.setState({ vessels: { source, target }, vesselIds: ['source', 'target'], inFlightPours: [], spills: {}, burners: {},
    isSimulationPaused: false, timeScale: 1, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {} });
  const totals: number[] = [];
  const unsubscribe = useAppStore.subscribe(s => totals.push(Object.values(s.vessels).reduce((sum, v) => sum + v.mass_g, 0)
    + s.inFlightPours.reduce((sum, p) => sum + p.sample.mass_g, 0)));
  try { useAppStore.getState().tickSimulation(0.01); } finally { unsubscribe(); }
  const state = useAppStore.getState();
  expect(state.inFlightPours.length).toBeGreaterThan(0); expect(state.vessels.target.volume_ml).toBe(0);
  expect(state.vessels.source.volume_ml).toBeLessThan(source.volume_ml);
  for (const mass of totals) expect(mass).toBeCloseTo(source.mass_g, 8);
});

it('shortens the final emission interval to its finite inventory instead of stretching it to dt', () => {
  const v = fixture(), row = { ...v.contents[0], mass_g: 0.0002, moles: 0.0002 / computeMolarMass('H2O') };
  const tiny = { ...v, contents: [row], substances: ['H2O'], volume_ml: 0.0002, mass_g: 0.0002, immiscibleOrganicVolume_ml: 0 };
  const result = stepFunnelFlow(tiny, null, 1);
  expect(result.moved_ml).toBe(0.0002); expect(result.source.volume_ml).toBe(0);
  expect(result.releaseDuration_s).toBeCloseTo(0.0002 / result.discharge!.total_ml_s, 14);
  expect(result.releaseDuration_s).toBeLessThan(1);
});

it('converges in time against a separate upright hydrostatic RK4 oracle', () => {
  const initial = fixture(), p = getVesselProfile(initial.type, initial.capacity_ml), meters = metersPerModelUnit(p);
  const rate = (water: number) => {
    const c1 = solveLevel(p, 0, water).c, c2 = solveLevel(p, 0, water + 10).c;
    return 0.62 * Math.PI * (0.06 * meters) ** 2 * Math.sqrt(2 * GRAVITY_M_S2 * meters * (c1 + 1.25 + 0.879 * (c2 - c1))) * 1e6;
  };
  let reference = 20; const dt = 1 / 1024;
  for (let i = 0; i < 1024; i++) {
    const a = -rate(reference), b = -rate(reference + dt * a / 2), c = -rate(reference + dt * b / 2), d = -rate(reference + dt * c);
    reference += dt / 6 * (a + 2 * b + 2 * c + d);
  }
  const errors = [20, 60, 120].map(hz => {
    let v = initial; for (let i = 0; i < hz; i++) v = advanceFunnelFlow(v, null, 1 / hz).source;
    return Math.abs(v.volume_ml - 10 - reference);
  });
  expect(errors[0]).toBeLessThan(0.00002);
  expect(errors[1]).toBeLessThan(errors[0] / 5);
  expect(errors[2]).toBeLessThan(errors[1] / 3.5);
});

it('does not strand a positive phase behind a fixed 1e-12 mL depletion cutoff', () => {
  const base = fixture(), amount = 1e-13;
  const tiny = { ...base, volume_ml: amount, mass_g: amount, immiscibleOrganicVolume_ml: 0, substances: ['H2O'],
    contents: [{ formula: 'H2O', phase: 'l', mass_g: amount, moles: amount / computeMolarMass('H2O') }] };
  const result = advanceFunnelFlow(tiny, null, 1);
  expect(result.moved_ml).toBe(amount); expect(result.source.volume_ml).toBe(0);
  expect(result.spill!.mass_g).toBe(amount); expect(result.spill!.contents[0].moles).toBe(tiny.contents[0].moles);
});
