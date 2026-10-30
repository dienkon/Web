import { afterEach, describe, expect, it } from 'vitest';
import { reactAliquotMixture } from '../src/engine/aliquotReaction';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { applyAluminumMaterialProgress, aluminumStageFractions } from '../src/engine/aluminumMaterialProgress';
import { computeMolarMass } from '../src/engine/ledger';
import { readComposition } from '../src/science/balance';
import { useAppStore } from '../src/store/useAppStore';
import { useInstrumentStore } from '../src/handling/instrumentState';
import { aspiratePipette, dispensePipette } from '../src/handling/instrumentOperations';
import { stockLiquidAliquot } from '../src/engine/stockAddition';
import { findChemical } from '../src/data/chemicals';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const original = useAppStore.getState(), instruments = useInstrumentStore.getState();
afterEach(() => { useAppStore.setState(original, true); useInstrumentStore.setState(instruments, true); });
const row = (formula: string, moles: number, phase = 'aq'): SubstanceContent => ({ formula, moles, phase, mass_g: moles * computeMolarMass(formula) });
function specimen(sulfate = false, ratio = 3, dissolution = false): VesselState {
  const contents = [row('H2O', 100 / 18.015, 'l'),
    dissolution ? { ...row('Al(OH)3', 1e-4, 's'), solidOrigin: 'precipitate' as const, precipitateFormation: 'GEL' }
      : row(sulfate ? 'Al2(SO4)3' : 'AlCl3', sulfate ? 5e-5 : 1e-4), row('NaOH', ratio * 1e-4)];
  return { id: 'al-material', name: 'Al', type: 'beaker', capacity_ml: 250, position: [0, -0.135, 0], rotationY: 0,
    isLocked: false, contents, substances: contents.map(c => c.formula), mass_g: contents.reduce((s, c) => s + c.mass_g, 0),
    volume_ml: 100, volume: 0.4, temperature_c: 25, ph: 7, liquidColor: '#f8fafc', hasGas: false, isBoiling: false,
    hasPrecipitate: dissolution, precipitateSubstance: dissolution ? 'Al(OH)3' : undefined,
    precipitateAmount_g: dissolution ? contents[1].mass_g : 0 };
}
const amount = (v: VesselState, formula: string) => v.contents.filter(c => c.formula === formula).reduce((s, c) => s + c.moles, 0);
function conserved(before: VesselState, after: VesselState) {
  const atoms = (v: VesselState) => {
    const result: Record<string, number> = {};
    for (const c of v.contents) for (const [a, n] of Object.entries(readComposition(c.formula).atoms)) result[a] = (result[a] ?? 0) + n * c.moles;
    const removedWaterMoles = ((v.evaporated_ml ?? 0) - (v.wallCondensation?.returned_g ?? 0)) / 18.015;
    result.H = (result.H ?? 0) + 2 * removedWaterMoles;
    result.O = (result.O ?? 0) + removedWaterMoles;
    return result;
  };
  const a = atoms(before), b = atoms(after);
  for (const [element, moles] of Object.entries(a)) expect(b[element] ?? 0, element).toBeCloseTo(moles, 11);
  expect(after.contents.reduce((s, c) => s + c.mass_g, 0)
    + (after.evaporated_ml ?? 0) - (after.wallCondensation?.returned_g ?? 0))
    .toBeCloseTo(before.mass_g + (before.evaporated_ml ?? 0) - (before.wallCondensation?.returned_g ?? 0), 9);
  expect(after.contents.every(c => c.moles >= 0 && c.mass_g >= 0)).toBe(true);
}
function start(v: VesselState) {
  const plan = reactAliquotMixture(v, 'vi', false);
  expect(plan.kinetics?.materialStages?.length).toBeGreaterThan(0);
  const k = plan.kinetics!;
  const at = (p: number, current: VesselState = plan.vessel): VesselState => ({ ...current,
    ...applyAluminumMaterialProgress(k.materialStages!, k.initialVesselBaseline!, current, p) });
  return { plan, k, at };
}
function setup(v: VesselState) {
  const { plan, k } = start(v);
  useAppStore.setState({ vessels: { [v.id]: plan.vessel }, vesselIds: [v.id], activeKinetics: { [v.id]: k },
    burners: {}, spills: {}, pendingReactions: {}, dissolvingSubstances: {}, inFlightPours: [],
    isSimulationPaused: false, timeScale: 1, moveMode: false, selectedVesselId: v.id });
  return { plan, k };
}

describe('Native Al material and heat progress together', () => {
  it.each([false, true])('does not create endpoint gel at contact; conserves every intermediate for sulfate=%s', sulfate => {
    const v = specimen(sulfate), { plan, at } = start(v);
    expect(plan.vessel.contents).toEqual(v.contents);
    expect(plan.vessel.temperature_c).toBe(25);
    let previous = 0;
    for (const p of [0, 0.01, 0.1, 0.4, 0.8, 1]) {
      const state = at(p), solid = amount(state, 'Al(OH)3');
      expect(solid).toBeGreaterThanOrEqual(previous - 1e-12); previous = solid;
      conserved(v, state);
      if (p > 0) expect(state.hasPrecipitate).toBe(true);
      for (const c of state.contents.filter(c => c.formula === 'Al(OH)3' && c.moles > 0)) expect(c.solidOrigin).toBe('precipitate');
    }
    const native = executeMultiStepReactions(v.contents, v.substances, 100, 25, false, 'vi', { preserveQuantities: true });
    for (const c of native.updatedContents) expect(amount(at(1), c.formula)).toBeCloseTo(c.moles, 10);
    expect(amount(at(0.01), 'Al(OH)3')).toBeLessThan(amount(at(1), 'Al(OH)3'));
  });

  it('dissolves gel progressively and preserves the saturation-limited residue', () => {
    const v = specimen(false, 1, true), { at } = start(v);
    let previous = amount(v, 'Al(OH)3');
    for (const p of [0.01, 0.2, 0.5, 1]) {
      const state = at(p), solid = amount(state, 'Al(OH)3');
      expect(solid).toBeLessThan(previous); expect(solid).toBeGreaterThan(0);
      expect(state.temperature_c).toBeLessThan(25); conserved(v, state); previous = solid;
    }
  });

  it.each([false, true])('does not force a gel intermediate in sufficient excess base for sulfate=%s', sulfate => {
    const v = specimen(sulfate, 6), { at } = start(v);
    for (const p of [0, 0.01, 0.5, 1]) {
      const state = at(p); expect(amount(state, 'Al(OH)3')).toBe(0);
      expect(state.hasPrecipitate).toBe(false); conserved(v, state);
    }
  });

  it('applies cumulative heat once and retains externally imposed temperature', () => {
    const { at } = start(specimen());
    const half = at(0.5), replay = at(0.5, half);
    expect(replay.temperature_c).toBe(half.temperature_c);
    expect(replay.programHeatApplied_J).toBe(half.programHeatApplied_J);
    const externallyHeated = { ...half, temperature_c: half.temperature_c + 3 };
    const final = at(1, half), heatedFinal = at(1, externallyHeated);
    expect(heatedFinal.temperature_c - final.temperature_c).toBeCloseTo(3, 8);
    expect(heatedFinal.programHeatApplied_J).toBe(final.programHeatApplied_J);
  });

  it('does not resurrect previously evaporated solvent during baseline replay', () => {
    const { at } = start(specimen()), half = at(0.5);
    const lost = 2, water = amount(half, 'H2O');
    const current = { ...half, volume_ml: half.volume_ml - lost, evaporated_ml: lost, mass_g: half.mass_g - lost,
      contents: half.contents.map(c => c.formula === 'H2O' ? { ...c, mass_g: c.mass_g - lost, moles: c.moles - lost / 18.015 } : c) };
    const end = at(1, current), replay = at(1, end);
    expect(amount(end, 'H2O')).toBeCloseTo(water - lost / 18.015, 11);
    expect(amount(replay, 'H2O')).toBeCloseTo(amount(end, 'H2O'), 11);
    expect(end.volume_ml).toBeCloseTo(98, 9);
  });

  it('keeps the store paused, advances real inventory, and does not replay a pipette withdrawal', () => {
    const v = specimen(), { plan } = setup(v);
    useAppStore.setState({ isSimulationPaused: true });
    useAppStore.getState().tickSimulation(0.1);
    expect(useAppStore.getState().vessels[v.id].contents).toEqual(plan.vessel.contents);
    useAppStore.setState({ isSimulationPaused: false });
    useAppStore.getState().tickSimulation(0.1);
    const halfway = useAppStore.getState().vessels[v.id];
    expect(amount(halfway, 'Al(OH)3')).toBeGreaterThan(0);
    expect(amount(halfway, 'AlCl3')).toBeLessThan(amount(v, 'AlCl3'));
    useAppStore.getState().setPipetteSample(null);
    expect(aspiratePipette(10).ok).toBe(true);
    const withdrawn = useAppStore.getState().vessels[v.id];
    const continued = useAppStore.getState().activeKinetics[v.id];
    expect(continued.replayProgressBase).toBe(continued.progress);
    useAppStore.getState().tickSimulation(0.1);
    expect(amount(useAppStore.getState().vessels[v.id], 'AlCl3')).toBeLessThan(amount(withdrawn, 'AlCl3'));
    const cooled = useAppStore.getState().vessels[v.id];
    const sample = useAppStore.getState().pipetteSample!;
    conserved(v, { ...cooled, contents: [...cooled.contents, ...sample.contents], mass_g: cooled.mass_g + sample.mass_g });
  });

  it('replans a new pipette dose from current gel and finite base, rather than its old baseline', () => {
    const v = specimen(); setup(v); useAppStore.getState().tickSimulation(0.1);
    const before = useAppStore.getState().vessels[v.id], oldKinetics = useAppStore.getState().activeKinetics[v.id];
    const dose = stockLiquidAliquot(findChemical('NaOH'), 'NaOH', 1, 25);
    useAppStore.getState().setPipetteSample(dose);
    expect(dispensePipette(1, v.id).ok).toBe(true);
    const state = useAppStore.getState(), k = state.activeKinetics[v.id];
    expect(k).not.toBe(oldKinetics);
    expect(amount(k.initialVesselBaseline!, 'Al(OH)3')).toBeCloseTo(amount(before, 'Al(OH)3'), 12);
    expect(amount(state.vessels[v.id], 'NaOH')).toBeCloseTo(amount(before, 'NaOH') + dose.contents.find(c => c.formula === 'NaOH')!.moles, 12);
    // Dissolved Al can convert first; gel need not shrink on the first frame.
    for (let t = 0; t < k.duration + 0.2; t += 0.1) useAppStore.getState().tickSimulation(0.1);
    expect(amount(useAppStore.getState().vessels[v.id], 'Al(OH)3')).toBeLessThan(amount(before, 'Al(OH)3'));
  });

  it('uses progressive material for direct stock additions too', async () => {
    const v = specimen(); setup(v);
    // Reset to aluminum salt alone, then add a genuinely finite stock dose.
    const contents = v.contents.filter(c => c.formula !== 'NaOH');
    useAppStore.setState({ vessels: { [v.id]: { ...v, contents, substances: contents.map(c => c.formula),
      mass_g: contents.reduce((s, c) => s + c.mass_g, 0) } }, activeKinetics: {} });
    await useAppStore.getState().mixSubstances(v.id, 'NaOH', 0.3);
    const state = useAppStore.getState();
    expect(state.activeKinetics[v.id]?.materialStages?.length).toBeGreaterThan(0);
    expect(amount(state.vessels[v.id], 'Al(OH)3')).toBe(0);
    useAppStore.getState().tickSimulation(0.1);
    expect(amount(useAppStore.getState().vessels[v.id], 'Al(OH)3')).toBeGreaterThan(0);
  });

  it('completes in the store without losing small residual reagents', () => {
    const v = specimen(), { k } = setup(v);
    const expected = { ...v, ...applyAluminumMaterialProgress(k.materialStages!, k.initialVesselBaseline!, v, 1) };
    for (let t = 0; t < k.duration + 0.2; t += 0.1) useAppStore.getState().tickSimulation(0.1);
    const state = useAppStore.getState(), end = state.vessels[v.id];
    expect(state.activeKinetics[v.id]).toBeUndefined();
    expect(amount(end, 'Al(OH)3')).toBeCloseTo(amount(expected, 'Al(OH)3'), 11);
    expect(end.substances).toContain('AlCl3'); conserved(v, end);
  });

  it('orders finite stages without allocating time to absent material', () => {
    const { k } = start(specimen()), stage = k.materialStages![0];
    const stages = [{ ...stage, weight_molAl: 1 }, { ...stage, weight_molAl: 3 }];
    expect(aluminumStageFractions(stages, 0)).toEqual([0, 0]);
    expect(aluminumStageFractions(stages, 0.25)).toEqual([1, 0]);
    const fractions = aluminumStageFractions(stages, 0.5);
    expect(fractions[0]).toBe(1); expect(fractions[1]).toBeGreaterThan(0); expect(fractions[1]).toBeLessThan(1);
    expect(aluminumStageFractions(stages, 1)).toEqual([1, 1]);
  });
});
