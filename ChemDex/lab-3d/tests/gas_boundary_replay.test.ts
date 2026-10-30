import { afterEach, describe, expect, it } from 'vitest';
import { applyProgramWithThermalSinks, applyLedgerWithThermalSinks } from '../src/engine/thermalLedger';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { reconcileReplayGas } from '../src/engine/replayGasBoundary';
import { getProgramById } from '../src/vfx/programs/library';
import { captureHeadspace } from '../src/engine/headspacePressure';
import { projectEscapedGas } from '../src/engine/gasInventory';
import { planStudioProgram } from '../src/engine/studioProgram';
import { advanceHeatActivatedProgress } from '../src/engine/heatActivatedProgress';
import { useAppStore } from '../src/store/useAppStore';
import { measureGasFlux } from '../src/engine/gasFlux';
import { reactionIsEmitting } from '../src/vfx/reactionActivity';
import { applyAluminumMaterialProgress, type AluminumMaterialStage } from '../src/engine/aluminumMaterialProgress';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const initialStore = useAppStore.getState();
afterEach(() => useAppStore.setState(initialStore, true));
const row = (formula: string, moles: number, phase: string): SubstanceContent => ({ formula, moles, phase, mass_g: moles * computeMolarMass(formula) });
const program = getProgramById('mg_hcl')!;
function specimen(isSealed = false): VesselState {
  const contents = [row('H2O', 50 / 18.015, 'l'), row('Mg', 0.001, 's'), row('HCl', 0.002, 'aq')];
  const v: VesselState = { id: 'b', name: 'sample', type: 'beaker', capacity_ml: 100, position: [0, 0, 0], rotationY: 0,
    isLocked: false, isSealed, volume_ml: 50, volume: 0.5, mass_g: contents.reduce((s, c) => s + c.mass_g, 0),
    contents, substances: contents.map(c => c.formula), temperature_c: 25, ph: 1, hasGas: false, hasPrecipitate: false, isBoiling: false };
  if (isSealed) v.sealedHeadspace = captureHeadspace(v);
  return v;
}
const massOut = (v: VesselState) => Object.values(v.escapedGas_g ?? {}).reduce((s, g) => s + g, 0);
const held = (v: VesselState, formula = 'H2') => v.contents.filter(c => c.formula === formula && c.phase === 'g').reduce((s, c) => s + c.mass_g, 0);
const step = (baseline: VesselState, current: VesselState, extent: number) => ({ ...current, ...applyProgramWithThermalSinks(program, baseline, current, extent) });
const close = (v: VesselState) => ({ ...v, isSealed: true, sealedHeadspace: captureHeadspace(v) });
const open = (v: VesselState) => { const next = { ...v, isSealed: false, sealedHeadspace: undefined }; return { ...next, ...projectEscapedGas(next) }; };
function setup(v: VesselState, active = false) {
  const kinetics = active ? planStudioProgram(program, v, 'vi').kinetics! : undefined;
  useAppStore.setState({ vessels: { b: v }, vesselIds: ['b'], activeKinetics: kinetics ? { b: kinetics } : {},
    burners: {}, pendingReactions: {}, dissolvingSubstances: {}, spills: {}, isSimulationPaused: false, timeScale: 1 });
  return kinetics;
}

describe('Cumulative gas replay follows the live boundary', () => {
  it.each([false, true])('preserves unchanged-boundary stoichiometry for sealed=%s', sealed => {
    const base = specimen(sealed), result = step(base, base, 0.5), expected = 0.0005 * computeMolarMass('H2');
    expect(held(result) + (result.escapedGas_g?.H2 ?? 0)).toBeCloseTo(expected, 12);
    expect(held(result)).toBeCloseTo(sealed ? expected : 0, 12);
    expect(result.mass_g + massOut(result)).toBeCloseTo(base.mass_g, 12);
  });
  it('retains only gas generated after closing and never recovers an old exhaust batch', () => {
    const base = specimen(), quarter = step(base, base, 0.25), closed = close(quarter), half = step(base, closed, 0.5);
    const quarterGas = 0.00025 * computeMolarMass('H2');
    expect(half.escapedGas_g!.H2).toBeCloseTo(quarterGas, 12); expect(held(half)).toBeCloseTo(quarterGas, 12);
    expect(half.mass_g + massOut(half)).toBeCloseTo(base.mass_g, 12);
    expect(half.sealedHeadspace).toBe(closed.sealedHeadspace);
    expect(half.internalPressure_atm!).toBeGreaterThan(closed.internalPressure_atm ?? 1);
  });
  it('sends new gas to the sink after opening a reaction that originally started sealed', () => {
    const base = specimen(true), quarter = step(base, base, 0.25), opened = open(quarter), half = step(base, opened, 0.5);
    expect(held(half)).toBe(0); expect(half.escapedGas_g!.H2).toBeCloseTo(0.0005 * computeMolarMass('H2'), 12);
    expect(half.mass_g + massOut(half)).toBeCloseTo(base.mass_g, 12);
  });
  it('handles repeated open/close cycles and same-extent replay without adding or losing matter or heat', () => {
    const base = specimen(); let current = step(base, base, 0.25);
    current = step(base, close(current), 0.5); current = step(base, open(current), 0.75); current = step(base, close(current), 1);
    expect(held(current)).toBeCloseTo(0.00025 * computeMolarMass('H2'), 12);
    expect(current.escapedGas_g!.H2).toBeCloseTo(0.00075 * computeMolarMass('H2'), 12);
    const replay = step(base, current, 1);
    expect(replay.mass_g).toBeCloseTo(current.mass_g, 12); expect(replay.temperature_c).toBeCloseTo(current.temperature_c, 12);
    expect(replay.escapedGas_g).toEqual(current.escapedGas_g);
    expect(replay.mass_g + massOut(replay)).toBeCloseTo(base.mass_g, 12);
  });
  it('preserves sink history that predates the reaction baseline', () => {
    const base = specimen(); base.escapedGas_g = { H2: 0.1 };
    const first = step(base, base, 0.25), second = step(base, close(first), 0.5);
    expect(second.escapedGas_g!.H2).toBeCloseTo(0.1 + 0.00025 * computeMolarMass('H2'), 12);
    expect(second.mass_g + massOut(second)).toBeCloseTo(base.mass_g + 0.1, 12);
  });
  it('reconciles a native retained-gas replay against the same finite external sink', () => {
    const base = specimen(); const raw = applyProgramToLedger(program, { ...base, isSealed: true }, 0.5, { deferThermal: true });
    const earlier = step(base, base, 0.25), current = close(earlier);
    const corrected = { ...current, ...applyLedgerWithThermalSinks(raw, base, current) };
    expect(held(corrected)).toBeCloseTo(0.00025 * computeMolarMass('H2'), 12);
    expect(corrected.mass_g + massOut(corrected)).toBeCloseTo(base.mass_g, 12);
  });
  it('does not resurrect an inert gas in native aluminum stages after that gas has vented', () => {
    const base = specimen(true);
    base.contents = [row('H2O', 50 / 18.015, 'l'), row('AlCl3', 0.001, 'aq'), row('NaOH', 0.003, 'aq'), row('N2', 0.0001, 'g')];
    base.mass_g = base.contents.reduce((sum, c) => sum + c.mass_g, 0);
    // Isothermal stoichiometry probe; timing/enthalpy calibration is not being tested.
    const stages: AluminumMaterialStage[] = [{ reactionId: 'alcl3_naoh', extent_mol: 0.001, weight_molAl: 0.001, deltaH_kJ_mol: 0,
      reactants: [{ formula: 'AlCl3', phase: 'aq', coeff: 1 }, { formula: 'NaOH', phase: 'aq', coeff: 3 }],
      products: [{ formula: 'Al(OH)3', phase: 's', coeff: 1 }, { formula: 'NaCl', phase: 'aq', coeff: 3 }] }];
    const first = { ...base, ...applyAluminumMaterialProgress(stages, base, base, 0.25) }, opened = open(first);
    const next = { ...opened, ...applyAluminumMaterialProgress(stages, base, opened, 0.5) };
    expect(held(next, 'N2')).toBe(0); expect(next.escapedGas_g!.N2).toBeCloseTo(0.0001 * computeMolarMass('N2'), 12);
    expect(next.mass_g + massOut(next)).toBeCloseTo(base.mass_g, 12);
  });
  it('keeps input snapshots immutable and normalizes species aliases in the gas sink', () => {
    const base = specimen(), current = { ...base, escapedGas_g: { 'CO2(g)': 0.02 }, isSealed: true };
    const result = { contents: [row('CO2', 0.001, 'g')], escapedGas_g: {}, mass_g: base.mass_g };
    const before = structuredClone([base, current, result]);
    const reconciled = reconcileReplayGas(result, base, current)!;
    expect(reconciled.escapedGas_g.CO2).toBe(0.02); expect(reconciled.escapedGas_g['CO2(g)']).toBeUndefined();
    expect(reconciled.contents[0].mass_g).toBeCloseTo(0.001 * computeMolarMass('CO2') - 0.02, 12);
    expect([base, current, result]).toEqual(before);
  });
  it('refuses an extent rewind that would resurrect molecules already exhausted', () => {
    const base = specimen(), current = step(base, base, 0.5);
    const result = applyProgramWithThermalSinks(program, base, current, 0.25);
    expect(result.gasReplayBlocked).toBe(true); expect(result.mass_g).toBe(current.mass_g);
    expect(result.contents).toEqual(current.contents); expect(result.escapedGas_g).toEqual(current.escapedGas_g);
  });
  it('routes chemically generated water vapor without mistaking it for a new liquid source', () => {
    const base = specimen(); base.contents = []; base.mass_g = 1;
    const raw = (fraction: number) => ({ contents: [] as SubstanceContent[], mass_g: 1 - 0.1 * fraction,
      escapedGas_g: { H2O: 0.1 * fraction } });
    const first = { ...base, ...applyLedgerWithThermalSinks(raw(0.25), base, base) };
    const next = { ...close(first), ...applyLedgerWithThermalSinks(raw(0.5), base, close(first)) };
    expect(held(next, 'H2O')).toBeCloseTo(0.025, 12); expect(next.escapedGas_g!.H2O).toBeCloseTo(0.025, 12);
    expect(next.mass_g + massOut(next)).toBeCloseTo(1, 12);
    expect(next.volume_ml).toBe(base.volume_ml);
  });
});

describe('Live seal changes during kinetics', () => {
  it('changes the live generated/exhaust flux without repeating cumulative amounts', () => {
    const base = specimen(); setup(base, true);
    for (let i = 0; i < 5; i++) useAppStore.getState().tickSimulation(0.05);
    const prior = useAppStore.getState().vessels.b, oldOut = prior.escapedGas_g!.H2;
    useAppStore.getState().sealVessel('b');
    for (let i = 0; i < 5; i++) useAppStore.getState().tickSimulation(0.05);
    const closed = useAppStore.getState().vessels.b;
    expect(closed.escapedGas_g!.H2).toBeCloseTo(oldOut, 12); expect(held(closed)).toBeGreaterThan(0);
    expect(closed.gasFlux!.escaped_mol_s.H2).toBe(0); expect(closed.gasFlux!.generated_mol_s.H2).toBeGreaterThan(0);
    useAppStore.getState().sealVessel('b'); const vented = useAppStore.getState().vessels.b;
    expect(held(vented)).toBe(0); expect(vented.escapedGas_g!.H2).toBeCloseTo(oldOut + held(closed), 12);
    useAppStore.getState().tickSimulation(0.05);
    const after = useAppStore.getState().vessels.b, flux = measureGasFlux(after, vented, 0.05);
    expect(flux.generated_mol_s.H2).toBeGreaterThan(0); expect(held(after)).toBe(0);
  });
  it('does not advance chemistry by consuming gaseous reactant that has already vented', () => {
    const consuming = structuredClone(program);
    consuming.id = 'gas-consumption-invariant'; consuming.chemistry.deltaH_kJ_per_mol = 0;
    consuming.chemistry.species = [{ formula: 'H2', phase: 'g', coeff: 1, role: 'reactant' },
      { formula: 'Cl2', phase: 'g', coeff: 1, role: 'reactant' }, { formula: 'HCl', phase: 'g', coeff: 2, role: 'product' }];
    consuming.chemistry.conditions = { activation: 'contact' }; consuming.chemistry.kinetics = { model: 'instant', halfTime_s: 1 };
    const base = specimen(true); base.contents = [row('H2', 0.0001, 'g'), row('Cl2', 0.0001, 'g')];
    base.mass_g = base.contents.reduce((sum, c) => sum + c.mass_g, 0); base.volume_ml = 0;
    const first = { ...base, ...applyProgramWithThermalSinks(consuming, base, base, 0.2) }, current = open(first);
    const kinetics = planStudioProgram(consuming, base, 'vi').kinetics!; kinetics.progress = 0.2;
    const next = advanceHeatActivatedProgress(kinetics, current, 0.1);
    expect(next).toBeCloseTo(0.2, 7);
    const impossible = applyProgramWithThermalSinks(consuming, base, current, 0.5);
    expect(impossible.gasReplayBlocked).toBe(true);
    setup(current); useAppStore.setState({ activeKinetics: { b: kinetics } });
    for (let i = 0; i < 3; i++) useAppStore.getState().tickSimulation(0.05);
    const state = useAppStore.getState();
    expect(state.activeKinetics.b.progress).toBeCloseTo(0.2, 7);
    expect(reactionIsEmitting(state.activeKinetics.b)).toBe(false);
    expect(useAppStore.getState().seekStudioProgram('b', 0.5)).toBe(false);
  });
});
