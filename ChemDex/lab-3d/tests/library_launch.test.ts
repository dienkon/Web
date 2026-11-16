import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { continueLibraryProgram, launchLibraryProgram, libraryProgram } from '../src/engine/libraryLaunch';
import { REACTION_QUICK_STARTS } from '../src/data/reactionQuickStarts';
import { createStudioSample } from '../src/engine/studioProgram';
import { getProgramById } from '../src/vfx/programs/library';
import { findHandcraftedProgram, resolveReactionProgram } from '../src/vfx/programs/resolver';
import type { VesselState } from '../src/types/chemistry';
import { vesselLocalToWorld } from '../src/science/vesselScale';
import { vesselInterior } from '../src/science/vesselDimensions';

const initial = useAppStore.getState();
const shell: VesselState = { id: 'existing', name: 'Keep this sample', type: 'beaker', capacity_ml: 100,
  position: [0, 0, 0], rotationY: 0, isLocked: false, volume_ml: 12, volume: 0.12, mass_g: 12,
  temperature_c: 25, ph: 7, contents: [{ formula: 'H2O', phase: 'l', moles: 12 / 18.015, mass_g: 12 }],
  substances: ['H2O'], hasGas: false, hasPrecipitate: false, isBoiling: false };
beforeEach(() => {
  useAppStore.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {},
    dissolvingSubstances: {}, inFlightPours: [], spills: {}, pouringChemical: null,
    selectedVesselId: null, isSimulationPaused: true, mixError: null, globalWarning: null,
    isMixing: false, isPouring: false, draggingVesselId: null, instrumentRinse: null });
});

describe('Prepared library specimens can continue from the ordinary vessel inspector', () => {
  it('keeps a warming-dependent specimen until ready, then starts that same vessel and resumes', () => {
    const prepared = launchLibraryProgram('cuoh2_decomp');
    expect(prepared.status).toBe('conditions');
    const id = prepared.vesselId!, cold = useAppStore.getState().vessels[id];
    const waiting = continueLibraryProgram(id);
    expect(waiting.status).toBe('conditions'); expect(waiting.message).toContain('60');
    expect(useAppStore.getState().isSimulationPaused).toBe(true);
    expect(useAppStore.getState().vessels[id]).toBe(cold);
    useAppStore.getState().setVesselState(id, { temperature_c: 65 });
    const warmed = useAppStore.getState().vessels[id];
    expect(continueLibraryProgram(id).status).toBe('running');
    const state = useAppStore.getState();
    expect(state.vesselIds).toEqual([id]);
    expect(state.activeKinetics[id].program?.id).toBe('cuoh2_decomp');
    expect(state.vessels[id].contents).toEqual(warmed.contents);
    expect(state.vessels[id].mass_g).toBe(cold.mass_g);
    expect(state.isSimulationPaused).toBe(false);
    const run = state.activeKinetics[id];
    expect(continueLibraryProgram(id).status).toBe('conditions');
    expect(useAppStore.getState().activeKinetics[id]).toBe(run);
  });

  it('uses the physical ignition action and retains inventory/pause when no source reaches the mouth', () => {
    const prepared = launchLibraryProgram('mg_o2_burn'), id = prepared.vesselId!;
    const sample = useAppStore.getState().vessels[id];
    expect(continueLibraryProgram(id).message).toContain('nguồn nhiệt');
    expect(useAppStore.getState().isSimulationPaused).toBe(true);
    expect(useAppStore.getState().activeKinetics[id]).toBeUndefined();
    const mouth = vesselLocalToWorld(sample, [0, vesselInterior(sample.type).topY, 0]);
    useAppStore.setState({ burners: { source: { id: 'source', isOn: true, intensity: 3, fuelLevel_ml: 1,
      position: [mouth[0], mouth[1] - 1.1, mouth[2]] } } });
    expect(continueLibraryProgram(id).status).toBe('running');
    const state = useAppStore.getState();
    expect(state.vesselIds).toEqual([id]);
    expect(state.activeKinetics[id].initialVesselBaseline?.ignitedProgramId).toBe('mg_o2_burn');
    expect(state.vessels[id].temperature_c).toBe(25);
    expect(state.vessels[id].contents).toEqual(sample.contents);
    expect(state.isSimulationPaused).toBe(false);
  });

  it('blocks activation during a pending transfer and reports invalid specimens without creating a replacement', () => {
    const id = useAppStore.getState().prepareStudioProgram('cuso4_naoh')!;
    const sample = useAppStore.getState().vessels[id];
    useAppStore.setState({ pouringChemical: { id: 123, targetId: id } as never });
    expect(continueLibraryProgram(id).message).toContain('chuyển mẫu');
    expect(useAppStore.getState().activeKinetics[id]).toBeUndefined();
    expect(useAppStore.getState().isSimulationPaused).toBe(true);
    expect(useAppStore.getState().vessels[id]).toBe(sample);
    expect(continueLibraryProgram('missing').status).toBe('error');
    expect(useAppStore.getState().vesselIds).toEqual([id]);
  });
});
afterEach(() => { useAppStore.setState(initial); vi.unstubAllGlobals(); });

describe('Library specimens start locally and preserve the working bench', () => {
  it.each(REACTION_QUICK_STARTS)('starts $programId from a finite, ready sample without a remote resolver', preset => {
    const fetch = vi.fn(() => { throw new Error('A local sample must not need the network'); });
    vi.stubGlobal('fetch', fetch);
    const result = launchLibraryProgram(preset.programId);
    expect(result.status, result.message).toBe('running');
    const state = useAppStore.getState(), vessel = state.vessels[result.vesselId!];
    expect(state.activeKinetics[vessel.id].program?.id).toBe(preset.programId);
    expect(vessel.mass_g).toBeGreaterThan(0);
    expect(vessel.contents.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(vessel.mass_g, 10);
    expect(state.selectedVesselId).toBe(vessel.id);
    expect(state.isSimulationPaused).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('creates a different vessel while preserving the selected sample and its reaction', () => {
    useAppStore.setState({ vessels: { existing: shell }, vesselIds: ['existing'], selectedVesselId: 'existing' });
    const first = launchLibraryProgram('cuso4_naoh');
    const firstReaction = useAppStore.getState().activeKinetics[first.vesselId!];
    const second = launchLibraryProgram('fe_cuso4');
    const state = useAppStore.getState();
    expect(first.status).toBe('running'); expect(second.status).toBe('running');
    expect(new Set(state.vesselIds).size).toBe(3);
    expect(state.vessels.existing).toBe(shell);
    expect(state.activeKinetics[first.vesselId!]).toBe(firstReaction);
  });
  it('prepares ignition-dependent specimens without pretending they can react cold', () => {
    const result = launchLibraryProgram('mg_o2_burn');
    expect(result.status).toBe('conditions');
    expect(result.message).toContain('mồi cháy');
    const state = useAppStore.getState();
    expect(state.activeKinetics[result.vesselId!]).toBeUndefined();
    expect(state.vessels[result.vesselId!].temperature_c).toBe(25);
    expect(state.isSimulationPaused).toBe(true);
  });
  it('rejects unknown entries without changing the bench', () => {
    expect(libraryProgram('not_a_program')).toBeNull();
    expect(launchLibraryProgram('not_a_program').status).toBe('error');
    expect(useAppStore.getState().vesselIds).toEqual([]);
  });
});

describe('Local lookup with catalysts and repeated inventory labels', () => {
  it('recognizes the actual H2O2/MnO2/water inventory before any network request', async () => {
    const sample = createStudioSample(getProgramById('h2o2_mno2')!, shell);
    const fetch = vi.fn(() => new Promise(() => {})); vi.stubGlobal('fetch', fetch);
    expect(findHandcraftedProgram(sample.substances, sample.contents,
      { temperature_c: 25, volume_ml: sample.volume_ml })?.id).toBe('h2o2_mno2');
    const resolved = await resolveReactionProgram(sample.substances, sample.contents,
      { temperature_c: 25, volume_ml: sample.volume_ml });
    expect(resolved.provenance).toBe('handcrafted');
    expect(resolved.program.id).toBe('h2o2_mno2');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('still requires the catalyst in its declared phase and actual inventory', () => {
    const sample = createStudioSample(getProgramById('h2o2_mno2')!, shell);
    for (const contents of [sample.contents.filter(item => item.formula !== 'MnO2'),
      sample.contents.map(item => item.formula === 'MnO2' ? { ...item, phase: 'aq' as const } : item)]) {
      expect(findHandcraftedProgram(sample.substances, contents,
        { temperature_c: 25, volume_ml: sample.volume_ml })).toBeNull();
    }
  });
  it('accepts duplicated formula labels but does not ignore unrelated chemicals', () => {
    const sample = createStudioSample(getProgramById('hcl_naoh')!, shell);
    const env = { temperature_c: 25, volume_ml: sample.volume_ml };
    expect(findHandcraftedProgram([...sample.substances, 'HCl', 'NaOH'], sample.contents, env)?.id).toBe('hcl_naoh');
    expect(findHandcraftedProgram([...sample.substances, 'mystery_reagent'], sample.contents, env)).toBeNull();
  });
});
