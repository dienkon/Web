import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { releaseShatteredInventory } from '../src/engine/shatterInventory';
import { computeMolarMass } from '../src/engine/ledger';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const entry = (formula: string, mass_g: number, phase: string): SubstanceContent => ({
  formula, mass_g, phase, moles: mass_g / computeMolarMass(formula),
});
const vessel = (id: string, contents: SubstanceContent[], patch: Partial<VesselState> = {}): VesselState => ({
  id, name: id, type: 'beaker', capacity_ml: 100, position: [0, -0.135, 0], rotationY: 0,
  isLocked: false, volume_ml: 0, volume: 0, contents, substances: contents.map(item => item.formula),
  mass_g: contents.reduce((sum, item) => sum + item.mass_g, 0), temperature_c: 25, ph: 7,
  hasPrecipitate: false, hasGas: false, isBoiling: false, ...patch,
});
const bottle = (patch: Partial<VesselState> = {}) => vessel('wash', [entry('H2O', 20, 'l')], {
  type: 'wash_bottle', volume_ml: 20, volume: 0.2, washDose_ml: 5, washTargetId: 'target', ...patch,
});
const baseline = useAppStore.getState();
afterEach(() => useAppStore.setState(baseline));
function setup(source = bottle(), target = vessel('target', [])) {
  useAppStore.setState({ vessels: { [source.id]: source, [target.id]: target },
    vesselIds: [source.id, target.id], activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
    burners: {}, spills: {}, wasteMass_g: 0, wasteContents: [], selectedVesselId: source.id });
}

describe('Finite wash bottle, breakage and cleanup', () => {
  it('transfers the exact water mass/moles and preserves unknown residue', () => {
    const target = vessel('target', [entry('H2O', 10, 'l')], { volume_ml: 10, stainIntensity: 0.8 });
    setup(bottle(), target);
    useAppStore.getState().squirtWashBottle('wash');
    const state = useAppStore.getState();
    expect(state.vessels.wash.volume_ml).toBe(15);
    expect(state.vessels.target.volume_ml).toBe(15);
    expect(state.vessels.target.mass_g + state.vessels.wash.mass_g).toBeCloseTo(30, 12);
    expect(state.vessels.target.contents[0].moles + state.vessels.wash.contents[0].moles)
      .toBeCloseTo(30 / computeMolarMass('H2O'), 12);
    expect(state.vessels.target.stainIntensity).toBe(0.8);
  });
  it('stops when empty and never recreates water from the bottle label', () => {
    setup(bottle({ volume_ml: 3, contents: [entry('H2O', 3, 'l')], mass_g: 3 }));
    for (let i = 0; i < 10; i++) useAppStore.getState().squirtWashBottle('wash');
    const state = useAppStore.getState();
    expect(state.vessels.wash.volume_ml).toBe(0);
    expect(state.vessels.wash.mass_g).toBeCloseTo(0, 12);
    expect(state.vessels.target.volume_ml).toBe(3);
    expect(state.vessels.target.mass_g).toBeCloseTo(3, 12);
  });
  it('uses actual bottle contents instead of forcing every bottle to be pure water', () => {
    setup(bottle({ contents: [entry('H2O', 20, 'l'), entry('NaCl', 1, 'aq')], mass_g: 21 }));
    useAppStore.getState().squirtWashBottle('wash');
    expect(useAppStore.getState().vessels.target.contents.find(item => item.formula === 'NaCl')!.mass_g).toBeCloseTo(0.25, 12);
  });
  it('does not accept a non-bottle, closed/broken bottle or unusable receiver', () => {
    for (const patch of [{ type: 'beaker' as const }, { isSealed: true }, { isShattered: true },
      { washDose_ml: NaN }, { washDose_ml: 0 }, { washDose_ml: 26 }, { washTargetId: 'missing' }, { washTargetId: 'wash' }]) {
      const source = bottle(patch);
      setup(source);
      useAppStore.getState().squirtWashBottle('wash');
      expect(useAppStore.getState().vessels.wash).toBe(source);
    }
    const source = bottle(); setup(source, vessel('target', [], { isSealed: true }));
    useAppStore.getState().squirtWashBottle('wash');
    expect(useAppStore.getState().vessels.wash).toBe(source);
  });
  it('accounts for overflow and supports deliberately uncollected rinse water', () => {
    setup(bottle(), vessel('target', [], { capacity_ml: 2 }));
    useAppStore.getState().squirtWashBottle('wash');
    let state = useAppStore.getState();
    expect(state.vessels.target.volume_ml).toBe(2);
    expect(Object.values(state.spills)).toHaveLength(0);
    expect(state.inFlightPours[0].sample.volume_ml).toBe(3);
    useAppStore.getState().advancePourTransport(2); state = useAppStore.getState();
    expect(Object.values(state.spills).reduce((sum, s) => sum + s.volume_ml, 0)).toBeCloseTo(3, 10);
    setup(bottle({ washTargetId: null }));
    useAppStore.getState().squirtWashBottle('wash');
    state = useAppStore.getState();
    expect(state.vessels.target.volume_ml).toBe(0);
    expect(Object.values(state.spills)[0].mass_g).toBeCloseTo(5, 12);
  });
  it('dilutes actual acid concentration without inventing a neutralization reaction', () => {
    const acid = entry('HCl', computeMolarMass('HCl') * 0.001, 'aq');
    setup(bottle(), vessel('target', [entry('H2O', 10, 'l'), acid], { volume_ml: 10, ph: 1 }));
    useAppStore.getState().squirtWashBottle('wash');
    const state = useAppStore.getState();
    expect(state.vessels.target.ph).toBeCloseTo(-Math.log10(0.001 / 0.015), 6);
    expect(state.vessels.target.contents.find(item => item.formula === 'HCl')!.moles).toBeCloseTo(0.001, 12);
    expect(state.activeKinetics.target).toBeUndefined();
  });
  it('releases gas separately from condensed material when sealed glass breaks', () => {
    const source = vessel('target', [entry('H2O', 10, 'l'), entry('PbI2', 1, 's'), entry('NO2', 0.1, 'g')],
      { volume_ml: 10, isSealed: true, escapedGas_g: { NO2: 0.05 } });
    const result = releaseShatteredInventory(source);
    expect(result.spill.volume_ml).toBe(10);
    expect(result.spill.mass_g).toBeCloseTo(11, 12);
    expect(result.spill.contents.some(item => item.phase === 'g')).toBe(false);
    expect(result.escapedGas_g.NO2).toBeCloseTo(0.15, 12);
    expect(result.spill.mass_g + result.escapedGas_g.NO2 - 0.05).toBeCloseTo(source.mass_g, 12);
  });
  it('keeps dry powder as a zero-liquid spill and cannot release it twice', () => {
    const source = vessel('target', [entry('CuSO4', 2, 's')]);
    setup(bottle(), source);
    useAppStore.getState().shatterVessel('target', 'Impact');
    useAppStore.getState().shatterVessel('target', 'Repeated impact');
    const state = useAppStore.getState(), spills = Object.values(state.spills);
    expect(spills).toHaveLength(1);
    expect(spills[0].volume_ml).toBe(0);
    expect(spills[0].mass_g).toBe(2);
    expect(spills[0].contents![0].moles).toBeCloseTo(2 / computeMolarMass('CuSO4'), 12);
    expect(state.vessels.target.mass_g).toBe(0);
    expect(state.vessels.target.contents).toEqual([]);
  });
  it('moves wet and dry spill composition into waste exactly once', () => {
    setup();
    const wet = [entry('H2O', 5, 'l'), entry('NaCl', 1, 'aq')], dry = [entry('Cu', 2, 's')];
    useAppStore.getState().addSpill([1, 0, 0], 5, ['H2O', 'NaCl'], '#fff', 'Wet', 6, wet);
    useAppStore.getState().addSpill([3, 0, 0], 0, ['Cu'], '#b87333', 'Dry', 2, dry);
    useAppStore.getState().wipeSpillAt([1, 0, 0], 0.1);
    const patchWaste = useAppStore.getState().wasteMass_g;
    expect(patchWaste).toBeGreaterThan(0);
    expect(patchWaste).toBeLessThan(6);
    expect(useAppStore.getState().wasteContents.find(item => item.formula === 'NaCl')!.mass_g).toBeCloseTo(patchWaste / 6, 12);
    useAppStore.getState().cleanSpills();
    useAppStore.getState().cleanSpills();
    const state = useAppStore.getState();
    expect(state.wasteMass_g).toBe(8);
    expect(state.wasteContents.reduce((sum, item) => sum + item.mass_g, 0)).toBe(8);
    for (const before of [...wet, ...dry]) expect(state.wasteContents.find(item => item.formula === before.formula)!.moles).toBe(before.moles);
  });
  it('retains the hazard flag when hazardous liquid merges with an existing water spill', () => {
    setup();
    useAppStore.getState().addSpill([0, 0, 0], 5, ['H2O'], '#fff', 'Water', 5, [entry('H2O', 5, 'l')]);
    useAppStore.getState().addSpill([0, 0, 0], 1, ['NaOH'], '#fff', 'Base', 1, [entry('NaOH', 1, 'aq')]);
    expect(Object.values(useAppStore.getState().spills)[0].isHazard).toBe(true);
  });
  it('does not draw a salt-residue ring when pure distilled water evaporates', () => {
    const hotWater = vessel('target', [entry('H2O', 10, 'l')], { volume_ml: 10, temperature_c: 110 });
    setup(bottle(), hotWater);
    useAppStore.setState({ isSimulationPaused: false, timeScale: 1 });
    useAppStore.getState().tickSimulation(1);
    const after = useAppStore.getState().vessels.target;
    expect(after.evaporated_ml).toBeGreaterThan(0);
    expect(after.stainIntensity ?? 0).toBe(0);
  });
});
