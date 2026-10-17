import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { ALL_HANDCRAFTED_PROGRAMS, getProgramById } from '../src/vfx/programs/library';
import { createStudioSample, planStudioProgram } from '../src/engine/studioProgram';
import { applyProgramToLedger } from '../src/engine/ledger';
import { assessProgramConditions } from '../src/science/conditions';
import { resolveReactionProgram } from '../src/vfx/programs/resolver';
import type { VesselState, BurnerState } from '../src/types/chemistry';

const shell: VesselState = { id: 'activation_sample', name: 'Activation', type: 'beaker', capacity_ml: 100,
  position: [0, 1, 0], rotationY: 0, isLocked: false, contents: [], substances: [],
  volume_ml: 0, volume: 0, mass_g: 0, temperature_c: 25, ph: 7,
  hasPrecipitate: false, hasGas: false, isBoiling: false };
const before = useAppStore.getState();
afterEach(() => useAppStore.setState(before));
function setupMg() {
  useAppStore.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {},
    dissolvingSubstances: {}, isSimulationPaused: true, globalWarning: null });
  const id = useAppStore.getState().prepareStudioProgram('mg_o2_burn')!;
  return useAppStore.getState().vessels[id];
}
function sourceNear(vessel: VesselState, patch: Partial<BurnerState> = {}): BurnerState {
  return { id: 'ignition_source', isOn: true, intensity: 3, fuelLevel_ml: 1,
    position: [vessel.position[0], vessel.position[1] - 1, vessel.position[2]], ...patch };
}

describe('Contact, catalyst, warming and ignition are separate conditions', () => {
  it('allows the reviewed contact reactions at room temperature without a burner', () => {
    for (const id of ['mg_hcl', 'cu_hno3_conc', 'na_h2o', 'k_h2o', 'mg_cuso4', 'cac2_h2o', 'al_naoh_h2', 'kcl_conc_h2so4', 'kmno4_hcl']) {
      const program = getProgramById(id)!, sample = createStudioSample(program, shell);
      expect(program.chemistry.conditions?.activation, id).toBe('contact');
      expect(program.chemistry.kinetics.model, id).not.toBe('heat_activated');
      expect(planStudioProgram(program, sample, 'vi').unmet, id).toEqual([]);
    }
  });
  it('requires MnO2 rather than assuming heating substitutes for a catalyst', () => {
    const program = getProgramById('h2o2_mno2')!, sample = createStudioSample(program, shell);
    expect(planStudioProgram(program, sample, 'vi').unmet).toEqual([]);
    const absent = sample.contents.filter(item => item.formula !== 'MnO2');
    expect(assessProgramConditions(program, absent, { temperature_c: 90, volume_ml: 30, isHeated: true }).ready).toBe(false);
    const wrongPhase = sample.contents.map(item => item.formula === 'MnO2' ? { ...item, phase: 'aq' } : item);
    expect(assessProgramConditions(program, wrongPhase, { temperature_c: 25, volume_ml: 30 }).ready).toBe(false);
  });
  it('labels warming as rate assistance for acidic oxalate rather than an invented on/off temperature', () => {
    const program = getProgramById('kmno4_na2c2o4_titration')!, sample = createStudioSample(program, shell);
    expect(program.chemistry.conditions?.activation).toBe('warming');
    expect(program.chemistry.kinetics.model).toBe('autocatalytic');
    expect(planStudioProgram(program, sample, 'vi').unmet).toEqual([]);
    expect(assessProgramConditions(program, sample.contents.filter(item => item.formula !== 'H2SO4'),
      { temperature_c: 60, volume_ml: 30, pH: 7 }).ready).toBe(false);
  });
  it('blocks cold magnesium combustion in the planner, ledger and resolver', async () => {
    const program = getProgramById('mg_o2_burn')!, sample = createStudioSample(program, shell);
    expect(planStudioProgram(program, sample, 'vi').kinetics).toBeNull();
    expect(applyProgramToLedger(program, sample, 1).contents).toEqual(sample.contents);
    const resolved = await resolveReactionProgram(sample.substances, sample.contents, { temperature_c: 25, volume_ml: 0 });
    expect(resolved.program.id).not.toBe(program.id);
  });
  it('does not initiate without a nearby source that is actually burning fuel', () => {
    const sample = setupMg();
    for (const source of [sourceNear(sample, { isOn: false }), sourceNear(sample, { fuelLevel_ml: 0 }),
      sourceNear(sample, { position: [10, 0, 10] }), sourceNear(sample, { ethanolVolumeFraction: 0 })]) {
      useAppStore.setState({ burners: { [source.id]: source } });
      expect(useAppStore.getState().igniteStudioSample(sample.id)).toBe(false);
      expect(useAppStore.getState().activeKinetics[sample.id]).toBeUndefined();
      expect(useAppStore.getState().vessels[sample.id].contents).toEqual(sample.contents);
    }
  });
  it('captures initiation for one finite run without changing bulk temperature or adding matter', () => {
    const sample = setupMg(), source = sourceNear(sample);
    useAppStore.setState({ burners: { [source.id]: source } });
    expect(useAppStore.getState().runStudioProgram(sample.id)).toBe(false);
    expect(useAppStore.getState().igniteStudioSample(sample.id)).toBe(true);
    const state = useAppStore.getState(), run = state.activeKinetics[sample.id];
    expect(run.initialVesselBaseline?.ignitedProgramId).toBe('mg_o2_burn');
    expect(state.vessels[sample.id].ignitedProgramId).toBeUndefined();
    expect(state.vessels[sample.id].temperature_c).toBe(25);
    expect(state.vessels[sample.id].mass_g).toBe(sample.mass_g);
    expect(state.vessels[sample.id].contents).toEqual(sample.contents);
    expect(state.seekStudioProgram(sample.id, 1)).toBe(true);
    expect(useAppStore.getState().vessels[sample.id].contents.find(item => item.formula === 'MgO')!.moles).toBeCloseTo(0.002, 10);
    expect(useAppStore.getState().activeKinetics[sample.id]).toBeUndefined();
    useAppStore.setState(s => ({ vessels: { ...s.vessels, [sample.id]: sample } }));
    expect(useAppStore.getState().runStudioProgram(sample.id)).toBe(false);
  });
  it('rejects initiation if the finite oxygen inventory is missing', () => {
    const sample = setupMg(), source = sourceNear(sample);
    useAppStore.getState().setVesselState(sample.id, { contents: sample.contents.filter(item => item.formula !== 'O2') });
    useAppStore.setState({ burners: { [source.id]: source } });
    expect(useAppStore.getState().igniteStudioSample(sample.id)).toBe(false);
  });
  it('leaves no heat-activated program without a declared minimum or explicit initiation event', () => {
    const unresolved = ALL_HANDCRAFTED_PROGRAMS.filter(program => program.chemistry.kinetics.model === 'heat_activated'
      && program.chemistry.conditions?.minTemp_c === undefined && program.chemistry.conditions?.activation !== 'ignition');
    expect(unresolved.map(program => program.id)).toEqual([]);
  });
});
