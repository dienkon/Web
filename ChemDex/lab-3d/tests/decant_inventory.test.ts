import { afterEach, describe, expect, it } from 'vitest';
import { decantLiquid } from '../src/engine/decantTransfer';
import { computeMolarMass } from '../src/engine/ledger';
import { readComposition } from '../src/science/balance';
import { useAppStore } from '../src/store/useAppStore';
import { PourController } from '../src/pour/controller/PourController';
import { storeBridge } from '../src/pour/controller/store-bridge';
import { applyProgramToLedger } from '../src/engine/ledger';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const item = (formula: string, mass_g: number, phase: string): SubstanceContent => ({
  formula, mass_g, phase, moles: mass_g / computeMolarMass(formula),
});
const vessel = (id: string, contents: SubstanceContent[], patch: Partial<VesselState> = {}): VesselState => ({
  id, name: id, type: 'beaker', capacity_ml: 250, position: [0, -0.135, 0], rotationY: 0,
  isLocked: false, volume_ml: 100, volume: 0.4, contents, substances: [...new Set(contents.map(x => x.formula))],
  mass_g: contents.reduce((sum, x) => sum + x.mass_g, 0), density_g_ml: 1,
  temperature_c: 25, ph: 7, hasPrecipitate: false, hasGas: false, isBoiling: false, ...patch,
});
const empty = () => vessel('target', [], { volume_ml: 0, volume: 0 });
const original = useAppStore.getState();
afterEach(async () => { await PourController.commitCurrentPour(); useAppStore.setState(original); });
function atoms(contents: SubstanceContent[]) {
  const result: Record<string, number> = {};
  for (const entry of contents) for (const [symbol, coefficient] of Object.entries(readComposition(entry.formula).atoms)) {
    result[symbol] = (result[symbol] ?? 0) + coefficient * entry.moles;
  }
  return result;
}
function expectAtoms(before: SubstanceContent[], after: SubstanceContent[]) {
  const a = atoms(before), b = atoms(after);
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) expect(b[key] ?? 0).toBeCloseTo(a[key] ?? 0, 10);
}
function setup(source: VesselState, target = empty()) {
  useAppStore.setState({ vessels: { [source.id]: source, [target.id]: target }, vesselIds: [source.id, target.id],
    burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, spills: {}, timeScale: 1 });
}

describe('Decanting transfers actual phase inventory once', () => {
  it('moves dissolved salt even when its stock chemical is classified solid', () => {
    const source = vessel('source', [item('H2O', 100, 'l'), item('CuSO4', 2, 'aq'), item('Cu', 1, 's')]);
    const result = decantLiquid(source, empty(), 25)!;
    expect(result.receiver!.contents.find(x => x.formula === 'CuSO4')!.mass_g).toBeCloseTo(0.5, 12);
    expect(result.source.contents.find(x => x.formula === 'CuSO4')!.mass_g).toBeCloseTo(1.5, 12);
    expect(result.receiver!.contents.some(x => x.formula === 'Cu')).toBe(false);
    expect(result.source.contents.find(x => x.formula === 'Cu')!.mass_g).toBe(1);
    expectAtoms(source.contents, [...result.source.contents, ...result.receiver!.contents]);
    expect(source.volume_ml).toBe(100);
    expect(source.contents[1].mass_g).toBe(2);
  });
  it('clamps an oversized request and accounts for overflow inventory', () => {
    const source = vessel('source', [item('H2O', 100, 'l'), item('NaCl', 1, 'aq')]);
    const result = decantLiquid(source, { ...empty(), capacity_ml: 30 }, 1000)!;
    expect(result.source.volume_ml).toBe(0);
    expect(result.receiver!.volume_ml).toBe(30);
    expect(result.spill!.volume_ml).toBe(70);
    expect(result.source.mass_g + result.receiver!.mass_g + result.spill!.mass_g).toBeCloseTo(101, 10);
    expectAtoms(source.contents, [...result.source.contents, ...result.receiver!.contents, ...result.spill!.contents]);
  });
  it('retains headspace gas and all settled/filter solids', () => {
    const source = vessel('source', [item('H2O', 100, 'l'), item('H2', 0.002, 'g'),
      { ...item('AgCl', 1, 's'), location: 'filter' }, item('BaSO4', 2, 's')]);
    const result = decantLiquid(source, empty(), 100)!;
    expect(result.receiver!.contents.filter(x => x.mass_g > 0).map(x => x.formula)).toEqual(['H2O']);
    expect(result.source.mass_g).toBeCloseTo(3.002, 10);
    expectAtoms(source.contents, [...result.source.contents, ...result.receiver!.contents]);
  });
  it('preserves trace amounts below the old one micromole cutoff', () => {
    const source = vessel('source', [item('H2O', 100, 'l'), item('AgNO3', 1e-6, 'aq')]);
    const result = decantLiquid(source, empty(), 1)!;
    expect(result.receiver!.contents.find(x => x.formula === 'AgNO3')!.mass_g).toBeCloseTo(1e-8, 16);
    expectAtoms(source.contents, [...result.source.contents, ...result.receiver!.contents]);
  });
  it('rejects self-pours, invalid amounts, closed/broken vessels and invented solvent', () => {
    const source = vessel('source', [item('H2O', 100, 'l')]);
    for (const value of [NaN, Infinity, -1, 0]) expect(decantLiquid(source, empty(), value)).toBeNull();
    expect(decantLiquid(source, source, 10)).toBeNull();
    expect(decantLiquid({ ...source, isSealed: true }, empty(), 10)).toBeNull();
    expect(decantLiquid(source, { ...empty(), isShattered: true }, 10)).toBeNull();
    expect(decantLiquid(source, { ...empty(), isSealed: true }, 10)).toBeNull();
    expect(decantLiquid({ ...source, contents: [] }, empty(), 10)).toBeNull();
  });
  it('conserves mass and atoms through repeated partial pours across changing capacities', () => {
    let source = vessel('source', [item('H2O', 100, 'l'), item('NaCl', 1, 'aq'), item('Cu', 3, 's')]);
    const before = source.contents;
    const moved: SubstanceContent[] = [];
    let collectedMass = 0;
    for (let i = 0; i < 101; i++) {
      const result = decantLiquid(source, { ...empty(), capacity_ml: i % 2 ? 0.1 : 10 }, 1);
      if (!result) break;
      source = result.source;
      collectedMass += result.receiver!.mass_g + (result.spill?.mass_g ?? 0);
      moved.push(...result.receiver!.contents, ...(result.spill?.contents ?? []));
    }
    expect(source.volume_ml).toBeCloseTo(0, 10);
    expect(source.mass_g + collectedMass).toBeCloseTo(104, 10);
    expectAtoms(before, [...source.contents, ...moved]);
  });
  it('invalidates an old source program baseline when material is poured away', () => {
    const source = vessel('source', [item('H2O', 100, 'l'), item('NaCl', 1, 'aq')]);
    setup(source);
    useAppStore.setState({ activeKinetics: { [source.id]: { vesselId: source.id, reactionName: 'Stale', equation: '',
      startTime: 0, duration: 10, progress: 0, hasGas: false, hasPrecipitate: false,
      initialLiquidColor: '#fff', targetLiquidColor: '#fff', dissolvingReactants: [], targetTemp: 25,
      initialVesselBaseline: source } } });
    useAppStore.getState().transferLiquidContinuous(source.id, 'target', 20);
    expect(useAppStore.getState().activeKinetics[source.id]).toBeUndefined();
    expect(useAppStore.getState().vessels[source.id].contents.find(x => x.formula === 'NaCl')!.mass_g).toBeCloseTo(0.8);
  });
  it('stores exact spilled mass/composition when the receiver is full', async () => {
    const source = vessel('source', [item('H2O', 100, 'l'), item('NaCl', 1, 'aq')]);
    setup(source, { ...empty(), capacity_ml: 10 });
    await useAppStore.getState().pourVessel(source.id, 'target', 20);
    const state = useAppStore.getState(), spill = Object.values(state.spills)[0];
    expect(state.vessels[source.id].volume_ml).toBe(80);
    expect(state.vessels.target.volume_ml).toBe(10);
    expect(spill.volume_ml).toBe(10);
    expect(state.vessels[source.id].mass_g + state.vessels.target.mass_g + spill.mass_g!).toBeCloseTo(101, 10);
  });
  it('keeps handcrafted reactions beyond the native solver available after a pour', async () => {
    const source = vessel('source', [item('H2O', 100, 'l'), item('Na2S', computeMolarMass('Na2S') * 0.001, 'aq')]);
    const target = vessel('target', [item('H2O', 100, 'l'), item('Pb(NO3)2', computeMolarMass('Pb(NO3)2') * 0.001, 'aq')]);
    setup(source, target);
    await useAppStore.getState().pourVessel(source.id, target.id, 100);
    const kinetics = useAppStore.getState().activeKinetics[target.id];
    expect(kinetics?.program?.id).toBe('na2s_pbno32');
    const end = applyProgramToLedger(kinetics.program!, kinetics.initialVesselBaseline!, 1);
    expect(end.contents!.find(x => x.formula === 'PbS')!.moles).toBeCloseTo(0.001, 10);
    expectAtoms([...source.contents, ...target.contents], end.contents!);
  });
  it('does not overwrite a vessel changed while an async program was resolving', async () => {
    const source = vessel('source', [item('H2O', 100, 'l'), item('Na2S', computeMolarMass('Na2S') * 0.001, 'aq'),
      item('Pb(NO3)2', computeMolarMass('Pb(NO3)2') * 0.001, 'aq')]);
    setup(source);
    const pending = useAppStore.getState().settleVesselMixture(source.id);
    const replacement = { ...source, temperature_c: 35, contents: [item('H2O', 100, 'l')] };
    useAppStore.setState({ vessels: { [source.id]: replacement } });
    await pending;
    expect(useAppStore.getState().vessels[source.id]).toBe(replacement);
    expect(useAppStore.getState().activeKinetics[source.id]).toBeUndefined();
  });
  it('live controller updates immutable inventories and commit cannot rewind or double-transfer', async () => {
    const source = vessel('source', [item('H2O', 100, 'l'), item('NaCl', 1, 'aq')]);
    setup(source);
    PourController.beginPour({ sourceId: source.id, targetId: 'target', mode: 'ASSIST', requestedVolume_ml: 15 });
    PourController.setTilt(1.25);
    for (let i = 0; i < 120 && PourController.getSession()?.phase !== 'dripping'; i++) PourController.tick(1 / 60);
    const session = PourController.getSession()!;
    expect(session.transferred_ml).toBeCloseTo(15, 8);
    const state = useAppStore.getState();
    const sourceBeforeCommit = state.vessels[source.id];
    const targetBeforeCommit = state.vessels.target;
    expect(source.volume_ml).toBe(100);
    expect(sourceBeforeCommit.volume_ml).toBeCloseTo(85, 8);
    expect(targetBeforeCommit.volume_ml).toBeCloseTo(15, 8);
    expectAtoms(source.contents, [...sourceBeforeCommit.contents, ...targetBeforeCommit.contents]);
    await PourController.commitCurrentPour();
    expect(useAppStore.getState().vessels[source.id]).toBe(sourceBeforeCommit);
    expect(useAppStore.getState().vessels.target.volume_ml).toBe(targetBeforeCommit.volume_ml);
    await storeBridge.commitVesselPour(source.id, 'target', 1, 100, 0);
    expect(useAppStore.getState().vessels[source.id].volume_ml).toBeCloseTo(84, 8);
    expect(sourceBeforeCommit.volume_ml).toBeCloseTo(85, 8);
  });
  it('commits a table pour without restoring the spilled inventory', async () => {
    const source = vessel('source', [item('H2O', 100, 'l'), item('NaCl', 1, 'aq')]);
    setup(source);
    PourController.beginPour({ sourceId: source.id, targetId: null, mode: 'TABLE', requestedVolume_ml: 5 });
    PourController.setTilt(1.4);
    for (let i = 0; i < 180 && PourController.getSession()?.phase !== 'dripping'; i++) PourController.tick(1 / 60);
    const session = PourController.getSession()!;
    expect(session.spilled_ml).toBeCloseTo(5, 8);
    const beforeCommit = useAppStore.getState().vessels[source.id];
    await PourController.commitCurrentPour();
    const state = useAppStore.getState();
    expect(state.vessels[source.id]).toBe(beforeCommit);
    expect(state.vessels[source.id].volume_ml).toBeCloseTo(95, 8);
    const spills = Object.values(state.spills);
    expect(spills.reduce((sum, x) => sum + x.mass_g!, 0) + state.vessels[source.id].mass_g).toBeCloseTo(101, 9);
    expect(state.isPouring).toBe(false);
  });
});
