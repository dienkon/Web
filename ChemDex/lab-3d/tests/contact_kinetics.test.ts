import { afterEach, describe, expect, it } from 'vitest';
import { advanceAqueousContactProgress, aqueousContactHalfTime } from '../src/engine/contactKinetics';
import { getProgramById } from '../src/vfx/programs/library';
import { useAppStore } from '../src/store/useAppStore';
import { applyProgramToLedger } from '../src/engine/ledger';

const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));
describe('Aqueous contact timing, independent of presentation length', () => {
  it('uses the declared half-time and composes exactly across frame subdivisions', () => {
    const program = getProgramById('fecl3_naoh')!;
    const state = { program, progress: 0, duration: 1000 };
    expect(advanceAqueousContactProgress(state, 0.1)).toBeCloseTo(0.5, 14);
    for (const fps of [10, 30, 60, 120]) {
      let progress = 0;
      for (let i = 0; i < fps * 0.6; i++) progress = advanceAqueousContactProgress({ ...state, progress }, 1 / fps);
      expect(progress).toBeCloseTo(1 - 2 ** -6, 13);
    }
  });
  it('keeps solids, gas contacts, clocks, heating and metal surfaces on their existing models', () => {
    for (const id of ['na_h2o', 'zn_hcl', 'nahco3_hcl', 'nh3_hcl', 'iodine_clock', 'cuoh2_decomp']) {
      const program = getProgramById(id);
      if (!program) throw new Error(`Missing reference program ${id}`);
      expect(aqueousContactHalfTime({ program }), id).toBeNull();
    }
  });
  it('rejects invalid elapsed time and preserves bounded progress', () => {
    const state = { program: getProgramById('agno3_nacl')!, progress: 0.3, duration: 8 };
    for (const dt of [0, -1, NaN, Infinity]) expect(advanceAqueousContactProgress(state, dt)).toBe(0.3);
    expect(advanceAqueousContactProgress(state, 10)).toBe(1);
  });
  it.each(['agno3_nacl', 'fecl3_naoh', 'bacl2_na2so4', 'hcl_naoh'])('advances the actual %s ledger rapidly and completes without a second material source', id => {
    useAppStore.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {},
      dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
    const vesselId = useAppStore.getState().prepareStudioProgram(id)!;
    const initial = useAppStore.getState().vessels[vesselId];
    const program = getProgramById(id)!;
    const final = applyProgramToLedger(program, initial, 1);
    expect(useAppStore.getState().runStudioProgram(vesselId)).toBe(true);
    for (let i = 0; i < 36; i++) useAppStore.getState().tickSimulation(1 / 60);
    const kinetics = useAppStore.getState().activeKinetics[vesselId];
    expect(kinetics.progress).toBeGreaterThan(0.93);
    const current = useAppStore.getState().vessels[vesselId];
    expect(current.mass_g + (current.evaporated_ml ?? 0)).toBeCloseTo(initial.mass_g, 6);
    if (final.precipitateAmount_g! > 0) {
      expect(current.precipitateAmount_g! / final.precipitateAmount_g!).toBeGreaterThan(0.93);
      expect(current.hasPrecipitate).toBe(true);
    }
    for (let i = 0; i < 150; i++) useAppStore.getState().tickSimulation(1 / 60);
    expect(useAppStore.getState().activeKinetics[vesselId]).toBeUndefined();
    const end = useAppStore.getState().vessels[vesselId];
    expect(end.mass_g + (end.evaporated_ml ?? 0)).toBeCloseTo(initial.mass_g, 6);
    expect(end.precipitateAmount_g ?? 0).toBeCloseTo(final.precipitateAmount_g ?? 0, 5);
  });
});
