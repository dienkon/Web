import { afterEach, expect, it } from 'vitest';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';
import type { LiquidAliquot } from '../src/handling/aliquot';
import { dispenseAliquot } from '../src/handling/aliquot';
import { receivePourAliquot } from '../src/handling/pourReceiver';
import { computeMolarMass } from '../src/engine/ledger';
import { readComposition } from '../src/science/balance';
import { occupiedLiquidVolume } from '../src/handling/solidOccupancy';
import { liquidOptics } from '../src/pour/physics/mixing';
import { useAppStore } from '../src/store/useAppStore';
import { traceLaunchedStream } from '../src/pour/physics/ballistics';
import { getWorldVesselProfile } from '../src/pour/physics/profiles';
import { stockLiquidAliquot } from '../src/engine/stockAddition';
import { findChemical } from '../src/data/chemicals';
import { mergeWorkbenchSpill, mergeWorkbenchSpillBatch } from '../src/engine/spillInventory';
import { runContactScenario } from '../src/vfx/dev/contactScenarios';

const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));
const row = (formula: string, mass_g: number, phase: string): SubstanceContent => ({ formula, phase, mass_g, moles: mass_g / computeMolarMass(formula) });
const shell = (id = 'target', volume_ml = 100, patch: Partial<VesselState> = {}): VesselState => ({ id, name: id, type: 'beaker',
  position: [id === 'source' ? -3 : 0, -0.135, 0], rotationY: 0, capacity_ml: 100, isLocked: false,
  volume_ml, mass_g: volume_ml, volume: volume_ml / 100, temperature_c: 25, contents: [row('H2O', volume_ml, 'l')],
  substances: ['H2O'], ph: 7, liquidColor: '#f8fafc', hasGas: false, hasPrecipitate: false, isBoiling: false, ...patch });
const water = (volume_ml: number, temperature_c = 25, color = '#f8fafc'): LiquidAliquot => ({ volume_ml, temperature_c, color,
  mass_g: volume_ml, contents: [row('H2O', volume_ml, 'l')], substances: ['H2O'] });
const copper = (volume_ml = 100) => shell('target', volume_ml, { temperature_c: 60, liquidColor: '#2563eb',
  contents: [row('H2O', volume_ml * 0.9, 'l'), row('CuSO4', volume_ml * 0.1, 'aq')], substances: ['H2O', 'CuSO4'] });
const grams = (contents: SubstanceContent[], formula: string) => contents.filter(c => c.formula === formula).reduce((sum, c) => sum + c.mass_g, 0);
function conserved(before: SubstanceContent[], after: SubstanceContent[]) {
  expect(after.reduce((sum, c) => sum + c.mass_g, 0)).toBeCloseTo(before.reduce((sum, c) => sum + c.mass_g, 0), 8);
  const atoms = (contents: SubstanceContent[]) => {
    const result: Record<string, number> = {};
    for (const c of contents) for (const [element, coefficient] of Object.entries(readComposition(c.formula).atoms))
      result[element] = (result[element] ?? 0) + coefficient * c.moles;
    return result;
  };
  const a = atoms(before), b = atoms(after);
  for (const element of new Set([...Object.keys(a), ...Object.keys(b)])) expect(b[element] ?? 0).toBeCloseTo(a[element] ?? 0, 9);
}

it('a full mixed tank releases its actual integrated effluent, color and sensible heat instead of bypassing pure feed', () => {
  const input = copper(), dose = water(100, 20), out = receivePourAliquot(input, dose), retained = Math.exp(-1);
  expect(out.contacted_ml).toBe(100); expect(out.accepted_ml).toBeCloseTo(0, 12); expect(out.spill.volume_ml).toBeCloseTo(100, 12);
  expect(grams(out.vessel.contents, 'CuSO4')).toBeCloseTo(10 * retained, 12);
  expect(grams(out.spill.contents, 'CuSO4')).toBeCloseTo(10 * (1 - retained), 12);
  expect(out.vessel.temperature_c).toBeCloseTo(20 + 40 * retained, 10);
  expect(out.spill.temperature_c).toBeCloseTo(20 + 40 * (1 - retained), 10);
  const beforeA = liquidOptics(input.liquidColor!).absorbance, feedA = liquidOptics(dose.color).absorbance;
  for (let i = 0; i < 3; i++) expect(out.vessel.liquidOptics!.absorbance[i]).toBeCloseTo(beforeA[i] * retained + feedA[i] * (1 - retained), 12);
  expect(out.spill.color).not.toBe(dose.color);
  expect(out.vessel.mass_g * out.vessel.temperature_c + out.spill.mass_g * out.spill.temperature_c).toBeCloseTo(8000, 9);
  conserved([...input.contents, ...dose.contents], [...out.vessel.contents, ...out.spill.contents]);
});

it.each([1, 2, 10, 100])('fill followed by through-flow is independent of splitting one dose into %s steps', steps => {
  let v = copper(90), spill_g = 0, spillCu_g = 0, spilled_ml = 0;
  const total = 250, initial = v, feed = water(total, 20);
  for (let i = 0; i < steps; i++) {
    const dose = water(total / steps, 20), result = receivePourAliquot(v, dose);
    v = result.vessel; spill_g += result.spill.mass_g; spilled_ml += result.spill.volume_ml;
    spillCu_g += grams(result.spill.contents, 'CuSO4');
  }
  const r = Math.exp(-240 / 100);
  expect(v.volume_ml).toBeCloseTo(100, 9); expect(spilled_ml).toBeCloseTo(240, 9);
  expect(grams(v.contents, 'CuSO4')).toBeCloseTo(9 * r, 10); expect(spillCu_g).toBeCloseTo(9 * (1 - r), 10);
  expect(v.mass_g + spill_g).toBeCloseTo(340, 9);
  const oldA = liquidOptics(initial.liquidColor!).absorbance, incomingA = liquidOptics(feed.color).absorbance;
  for (let j = 0; j < 3; j++) expect(v.liquidOptics!.absorbance[j]).toBeCloseTo(incomingA[j] + (oldA[j] - incomingA[j]) * 0.9 * r, 10);
});

it('a chemistry color replacement invalidates previous optical memory', () => {
  const prior = receivePourAliquot(copper(), water(10)).vessel;
  const replaced = { ...prior, liquidColor: '#dc2626' };
  const next = receivePourAliquot(replaced, water(10)).vessel;
  const expected = liquidOptics('#dc2626').absorbance, incoming = liquidOptics('#f8fafc').absorbance;
  for (let j = 0; j < 3; j++) expect(next.liquidOptics!.absorbance[j]).toBeCloseTo(expected[j] * Math.exp(-0.1) + incoming[j] * -Math.expm1(-0.1), 12);
});

it('malformed saved optical memory falls back to the sample color without propagating NaN', () => {
  const saved = { hex: '#2563eb', absorbance: [null, 0, 1] } as unknown as import('../src/pour/physics/mixing').LiquidOptics;
  const v = { ...copper(), liquidOptics: saved };
  const next = receivePourAliquot(v, water(10)).vessel;
  expect(next.liquidOptics!.absorbance.every(Number.isFinite)).toBe(true);
  expect(next.liquidColor).toBe(receivePourAliquot(copper(), water(10)).vessel.liquidColor);
});

it.each(['single', 'circular'])('the %s ground deposition preserves optical balance across many mixed effluent packets', mode => {
  let v = copper(), pools = {}, totalOptical = [0, 0, 0], totalVolume = 0;
  for (let i = 0; i < 100; i++) {
    const result = receivePourAliquot(v, water(1)), s = result.spill; v = result.vessel;
    const optics = liquidOptics(s.color, s.optics);
    totalVolume += s.volume_ml;
    for (let j = 0; j < 3; j++) totalOptical[j] += optics.absorbance[j] * s.volume_ml;
    pools = mode === 'single' ? mergeWorkbenchSpill(pools, [0, -1.175, 0], s.volume_ml, s.substances,
      s.color, 'effluent', s.mass_g, s.contents, s.temperature_c, s.optics)
      : mergeWorkbenchSpillBatch(pools, [[0, -1.175, 0], [0.001, -1.175, 0]], s);
  }
  const pool = Object.values(pools) as import('../src/types/chemistry').SpillState[];
  expect(pool).toHaveLength(1);
  for (let j = 0; j < 3; j++) expect(pool[0].optics!.absorbance[j]).toBeCloseTo(totalOptical[j] / totalVolume, 11);
  expect(grams(pool[0].contents!, 'CuSO4')).toBeCloseTo(10 * -Math.expm1(-1), 10);
});

it('through-flow respects inner-wall liquid occupancy without consuming that separate inventory', () => {
  const v = copper(90); v.wallCoating_ml = 10; v.wallCoatingMass_g = 10;
  const result = receivePourAliquot(v, water(45));
  expect(result.vessel.volume_ml).toBeCloseTo(90, 10); expect(result.spill.volume_ml).toBeCloseTo(45, 10);
  expect(result.vessel.wallCoatingMass_g).toBe(10);
  expect(grams(result.vessel.contents, 'CuSO4')).toBeCloseTo(9 * Math.exp(-0.5), 10);
});

it('retains a settled solid while displacing mixed liquid at the actual rim capacity', () => {
  const v = copper(99); v.contents.push(row('Cu', 8.96, 's')); v.mass_g += 8.96;
  const result = receivePourAliquot(v, water(20));
  expect(occupiedLiquidVolume(result.vessel)).toBeCloseTo(100, 8);
  expect(result.spill.volume_ml).toBeCloseTo(20, 8); expect(grams(result.spill.contents, 'Cu')).toBe(0);
  expect(grams(result.vessel.contents, 'Cu')).toBe(8.96); expect(grams(result.spill.contents, 'CuSO4')).toBeGreaterThan(0);
  conserved([...v.contents, ...water(20).contents], [...result.vessel.contents, ...result.spill.contents]);
});

it.each([0.7, 1.5])('immiscible density %s determines the surface layer that overflows without mixing its species or colors', density => {
  const v = copper(), oil: LiquidAliquot = { volume_ml: 20, mass_g: 20 * density, temperature_c: 25, color: '#facc15',
    contents: [{ ...row('C6H14', 20 * density, 'l'), liquidLayer: 'organic' }], substances: ['C6H14'],
    organicVolume_ml: 20, organicColor: '#facc15' };
  const result = receivePourAliquot(v, oil);
  expect(result.spill.volume_ml).toBeCloseTo(20, 10); expect(result.vessel.volume_ml).toBeCloseTo(100, 10);
  expect(result.vessel.liquidColor).toBe(v.liquidColor);
  if (density < 1) {
    expect(result.vessel.immiscibleOrganicVolume_ml).toBe(0); expect(grams(result.spill.contents, 'C6H14')).toBeCloseTo(14, 10);
    expect(grams(result.spill.contents, 'CuSO4')).toBe(0); expect(result.spill.color).toBe('#facc15');
  } else {
    expect(result.vessel.immiscibleOrganicVolume_ml).toBe(20); expect(grams(result.spill.contents, 'C6H14')).toBe(0);
    expect(grams(result.spill.contents, 'CuSO4')).toBeCloseTo(2, 10); expect(result.spill.color).toBe(v.liquidColor);
  }
  conserved([...v.contents, ...oil.contents], [...result.vessel.contents, ...result.spill.contents]);
});

it('a metered instrument still stops at capacity; a closed, invalid or broken receiver never exchanges matter', () => {
  expect(dispenseAliquot(copper(), water(10), 10).dispensed_ml).toBe(0);
  for (const patch of [{ isSealed: true }, { isShattered: true }, { capacity_ml: NaN }]) {
    const v = { ...copper(), ...patch }, dose = water(10), result = receivePourAliquot(v, dose);
    expect(result.vessel).toBe(v); expect(result.spill).toBe(dose); expect(result.contacted_ml).toBe(0);
  }
});

function setup(target: VesselState, source = shell('source', 50)) {
  useAppStore.setState({ vessels: { target, source }, vesselIds: ['target', 'source'], spills: {}, inFlightPours: [], burners: {},
    activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, workbenchEscapedGas_g: {}, isSimulationPaused: false, timeScale: 1 });
}
it.each(['stock', 'continuous', 'flight'])('the %s path exchanges a full receiver and the finite overflow contains the old solute', async mode => {
  setup(copper()); const s = useAppStore.getState();
  if (mode === 'stock') await s.mixSubstances('target', 'H2O', 20);
  if (mode === 'continuous') s.transferLiquidContinuous('source', 'target', 20);
  if (mode === 'flight') {
    const v = s.vessels.target, profile = getWorldVesselProfile(v.type, v.capacity_ml);
    const trajectory = traceLaunchedStream([0, v.position[1] + profile.lipLocal[1] + 0.3, 0], [0, -1, 0],
      { id: v.id, position: v.position, mouthR: profile.mouthR, mouthY: v.position[1] + profile.lipLocal[1],
        liquidSurfaceY: v.position[1] + profile.lipLocal[1] - 0.001, profile }, -1.175);
    s.releasePourLiquid({ id: 'full-dose', sessionId: 'test', sourceId: 'source', sourceName: 'Water', targetId: 'target',
      targetPose: '', duration_s: 0.12, trajectory }, 20);
    for (let i = 0; i < 80; i++) s.advancePourTransport(0.025);
  }
  const state = useAppStore.getState(), effluent = [...state.inFlightPours.map(p => p.sample.contents), ...Object.values(state.spills).map(p => p.contents ?? [])].flat();
  expect(grams(state.vessels.target.contents, 'CuSO4')).toBeCloseTo(10 * Math.exp(-0.2), 8);
  expect(grams(effluent, 'CuSO4')).toBeCloseTo(10 * -Math.expm1(-0.2), 8);
  expect(state.vessels.target.recentPourContact!.remaining_s).toBeGreaterThan(0);
});

it('pouring a reagent into a full vessel starts supported chemistry in both the tank and its effluent', async () => {
  const v = copper(); v.temperature_c = 25; setup(v);
  await useAppStore.getState().mixSubstances('target', 'NaOH', 20);
  const initial = useAppStore.getState();
  expect(initial.activeKinetics.target?.reactionId).toMatch(/^cuso4_naoh/);
  const out = initial.inFlightPours[0];
  expect(grams(out.sample.contents, 'CuSO4')).toBeGreaterThan(0); expect(grams(out.sample.contents, 'NaOH')).toBeGreaterThan(0);
  for (let i = 0; i < 100; i++) useAppStore.getState().advancePourTransport(0.025);
  const products = [...useAppStore.getState().inFlightPours.map(p => p.sample.contents), ...Object.values(useAppStore.getState().spills).map(p => p.contents ?? [])].flat();
  expect(grams(products, 'Cu(OH)2')).toBeGreaterThan(0);
  const dose = stockLiquidAliquot(findChemical('NaOH'), 'NaOH', 20, 25);
  conserved([...v.contents, ...dose.contents], [...useAppStore.getState().vessels.target.contents, ...products]);
});

it('Studio reactive overflow uses the actual full-vessel stock paths and retains both reactants in the spill', async () => {
  setup(shell());
  await runContactScenario('target', 'reactive_overflow');
  const s = useAppStore.getState(), effluent = s.inFlightPours[0].sample;
  expect(s.vessels.target.volume_ml).toBeCloseTo(100, 8);
  expect(effluent.volume_ml).toBeCloseTo(20, 8);
  expect(grams(effluent.contents, 'CuSO4')).toBeGreaterThan(0);
  expect(grams(effluent.contents, 'NaOH')).toBeGreaterThan(0);
});

it('later precipitation displaces a finite mixed stream and never restores its lost reactants on the next kinetics step', async () => {
  setup(shell());
  await runContactScenario('target', 'reactive_overflow');
  const s = useAppStore.getState();
  const before = [...s.vessels.target.contents, ...s.inFlightPours.flatMap(p => p.sample.contents)];
  for (let i = 0; i < 60; i++) {
    useAppStore.getState().tickSimulation(0.025);
    useAppStore.getState().advancePourTransport(0.025);
    const current = useAppStore.getState(), v = current.vessels.target;
    expect(occupiedLiquidVolume(v)).toBeLessThanOrEqual(100 + 1e-8);
    const parts = [...v.contents, ...current.inFlightPours.flatMap(p => p.sample.contents),
      ...Object.values(current.spills).flatMap(p => p.contents ?? [])];
    // Water's open-room evaporation is separately inventoried by the thermal
    // solver. Nonvolatile Cu/S/Na are the decisive reaction/outflow invariant.
    for (const element of ['Cu', 'S', 'Na']) {
      const atoms = (rows: SubstanceContent[]) => rows.reduce((sum, c) => sum + (readComposition(c.formula).atoms[element] ?? 0) * c.moles, 0);
      expect(atoms(parts)).toBeCloseTo(atoms(before), 9);
    }
  }
  const after = useAppStore.getState();
  expect(Object.values(after.spills).reduce((sum, p) => sum + p.volume_ml, 0)
    + after.inFlightPours.reduce((sum, p) => sum + p.sample.volume_ml, 0)).toBeGreaterThan(20);
});
