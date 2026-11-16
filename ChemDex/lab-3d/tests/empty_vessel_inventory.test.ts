import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { useInstrumentStore } from '../src/handling/instrumentState';
import { decantLiquid } from '../src/engine/decantTransfer';
import { clearHistory } from '../src/store/persistence';
import { vfxBus } from '../src/vfx/bus';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const initial = useAppStore.getState(), instruments = useInstrumentStore.getState();
const row = (formula: string, mass_g: number, phase: string): SubstanceContent => ({ formula, mass_g, phase, moles: mass_g / 18.015 });
const sample = (patch: Partial<VesselState> = {}): VesselState => ({
  id: 'receiver', name: 'Mẫu', type: 'beaker', capacity_ml: 100,
  position: [2, -.135, 1], rotationY: .4, isLocked: false,
  contents: [row('H2O', 20, 'l')], substances: ['H2O'], mass_g: 20, volume_ml: 20, volume: .2,
  temperature_c: 60, ph: 7, hasPrecipitate: false, hasGas: false, isBoiling: false, ...patch,
});
function mount(vessel = sample()) {
  clearHistory();
  useInstrumentStore.setState({ pipettePresentations: [], burettePresentations: [] });
  useAppStore.setState({ vessels: { [vessel.id]: vessel }, vesselIds: [vessel.id],
    selectedVesselId: vessel.id, burners: {}, isPouring: false, isMixing: false,
    pouringChemical: null, instrumentRinse: null, inFlightPours: [],
    draggingVesselId: null, moveMode: false, wasteMass_g: 3, wasteContents: [row('NaCl', 3, 's')],
    activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
    burette: { ...initial.burette, isDispensing: false } });
  return vessel;
}
afterEach(() => {
  useAppStore.setState(initial, true); useInstrumentStore.setState(instruments, true);
  SimulationEngine.clearAll(); clearHistory(); vi.restoreAllMocks();
});

describe('collecting the specimen into waste leaves reusable glass', () => {
  it('collects the actual 20 g sample once, retires foam and allows fresh measured liquid', () => {
    mount(sample({ foam_ml: 2, gasRate: 9, recentPourContact: { point: [0, 0, 0], expiresAt_ms: 1, remaining_s: 5 } }));
    const reset = vi.fn(), stop = vfxBus.on('vessel:sample-reset', reset);
    expect(useAppStore.getState().emptyVessel('receiver')).toBe(true);
    let state = useAppStore.getState(), empty = state.vessels.receiver;
    expect(empty).toMatchObject({ contents: [], mass_g: 0, volume_ml: 0, foam_ml: 0,
      hasPrecipitate: false, gasRate: 0, effectSampleRevision: 1, stockMotion: { tick: 0, grains: [] } });
    expect(empty.recentPourContact).toBeUndefined();
    expect(state.wasteMass_g).toBe(23);
    expect(state.wasteContents.reduce((sum, item) => sum + item.mass_g, 0)).toBe(23);
    expect(reset).toHaveBeenCalledOnce(); stop();
    expect(useAppStore.getState().emptyVessel('receiver')).toBe(true);
    state = useAppStore.getState(); expect(state.wasteMass_g).toBe(23);
    expect(state.wasteContents.reduce((sum, item) => sum + item.mass_g, 0)).toBe(23);
    const source = sample({ id: 'source', mass_g: 5, volume_ml: 5, contents: [row('H2O', 5, 'l')] });
    const fresh = decantLiquid(source, state.vessels.receiver, 1)!;
    expect(fresh).not.toBeNull(); expect(fresh.receiver!.mass_g).toBeCloseTo(1, 12);
    expect(fresh.receiver!.volume_ml).toBe(1);
  });

  it('collects separate wall water and every solid/deposit row without erasing provenance or historical sinks', () => {
    const deposit = { ...row('Cu', .3, 's'), solidOrigin: 'precipitate' as const,
      depositSubstrate: 'Fe', depositCarrierId: 'core-1', depositionReactionId: 'fe_cuso4' };
    const resident = sample({ contents: [row('H2O', 20, 'l'), row('Fe', 1, 's'), deposit], mass_g: 21.3,
      escapedGas_g: { O2: .2 }, evaporated_ml: .4, waterVaporReleased_g: .4,
      wallCondensation: { inner_g: .2, outer_g: .1, innerWall_c: 30, outerWall_c: 25, dewPoint_c: 15,
        ambientCollected_g: .1, ambientReleased_g: 0, returned_g: .03, drainedOutside_g: 0,
        heatRejected_J: 0, heatTransferredToSample_J: 0 },
      filterPaperResidue_g: .3, hasPrecipitate: true, precipitateAmount_g: .3, stainIntensity: .8,
      stockMotion: { tick: 12, grains: [] } });
    mount(resident); expect(useAppStore.getState().emptyVessel(resident.id)).toBe(true);
    const state = useAppStore.getState(), empty = state.vessels[resident.id];
    expect(state.wasteMass_g).toBeCloseTo(24.6, 12);
    expect(state.wasteContents.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(24.6, 12);
    expect(state.wasteContents.find(item => item.formula === 'Cu')).toEqual({ ...deposit, location: 'bulk' });
    expect(empty.wallCondensation).toMatchObject({ inner_g: 0, outer_g: 0, returned_g: .03, innerBeads: [], outerBeads: [] });
    expect(empty.escapedGas_g).toEqual({ O2: .2 }); expect(empty.evaporated_ml).toBe(.4);
    expect(empty.stainIntensity).toBe(0); expect(empty.filterPaperResidue_g).toBe(0);
  });

  it('preserves position, glass temperature, position lock and linked apparatus', () => {
    const vessel = mount(sample({ isLocked: true, heldByTongsId: 'tongs', flowReceiverId: 'other',
      physicalMotion: { rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], tick: 5 } }));
    expect(useAppStore.getState().emptyVessel(vessel.id)).toBe(true);
    expect(useAppStore.getState().vessels[vessel.id]).toMatchObject({ position: vessel.position,
      rotationY: .4, temperature_c: 60, isLocked: true, heldByTongsId: 'tongs', flowReceiverId: 'other',
      physicalMotion: vessel.physicalMotion });
  });

  it.each(['sealed', 'shattered', 'dose', 'carry', 'pour', 'rinse', 'pipette', 'parcel'] as const)(
    'rejects %s sample replacement while retaining its matter', kind => {
      const vessel = mount(sample({ isSealed: kind === 'sealed', isShattered: kind === 'shattered' }));
      if (kind === 'dose') useAppStore.getState().triggerPour('H2O', vessel.id, .12);
      if (kind === 'carry') useAppStore.setState({ draggingVesselId: vessel.id });
      if (kind === 'pour') useAppStore.setState({ isPouring: true });
      if (kind === 'rinse') useAppStore.setState({ instrumentRinse: { id: 1, bottleId: vessel.id, tool: 'pipette',
        epoch: 0, elapsed_s: 0, target_ml: 5, dispensed_ml: 0, phase: 'positioning', anchor: [0, 0, 0] } });
      if (kind === 'pipette') useInstrumentStore.getState().enqueuePipettePresentation({ target: vessel,
        epoch: useAppStore.getState().pourEpoch, direction: 'dispense', volume_ml: .05,
        before: { volume_ml: .05, color: '#fff' }, after: { volume_ml: 0, color: null } });
      if (kind === 'parcel') useAppStore.setState({ inFlightPours: [{ targetId: vessel.id } as never] });
      expect(useAppStore.getState().emptyVessel(vessel.id)).toBe(false);
      expect(useAppStore.getState().vessels[vessel.id]).toBe(vessel);
      expect(useAppStore.getState().wasteMass_g).toBe(3);
    });

  it('waits for a real burette drop presentation targeting the receiver', () => {
    const vessel = mount();
    const standPosition: [number, number, number] = [vessel.position[0] + .6, -.135, vessel.position[2]];
    expect(useInstrumentStore.getState().enqueueBurettePresentation({ target: vessel,
      epoch: useAppStore.getState().pourEpoch, standPosition, volume_ml: .05, color: '#fff' })).toBe(true);
    expect(useAppStore.getState().emptyVessel(vessel.id)).toBe(false);
    useInstrumentStore.getState().clearBurettePresentations();
    expect(useAppStore.getState().emptyVessel(vessel.id)).toBe(true);
  });

  it('retires pending chemistry and manager populations instead of replaying the old specimen', () => {
    const vessel = mount();
    useAppStore.setState({ activeKinetics: { [vessel.id]: {} as never }, pendingReactions: { [vessel.id]: {} as never },
      dissolvingSubstances: { [vessel.id]: { Cu: .5 } }, stirringVesselId: vessel.id, activeLitmusVesselId: vessel.id });
    const manager = SimulationEngine.getManager(vessel.id, 'low'), reset = vi.spyOn(manager, 'reset');
    expect(useAppStore.getState().emptyVessel(vessel.id)).toBe(true);
    const state = useAppStore.getState();
    expect(state.activeKinetics[vessel.id]).toBeUndefined(); expect(state.pendingReactions[vessel.id]).toBeUndefined();
    expect(state.dissolvingSubstances[vessel.id]).toBeUndefined();
    expect(state.stirringVesselId).toBeNull(); expect(state.activeLitmusVesselId).toBeNull();
    expect(reset).toHaveBeenCalledOnce();
  });

  it.each([{ mass_g: 20, contents: [] }, { mass_g: NaN }, { contents: [row('H2O', -1, 'l')] }])(
    'rejects an inconsistent old ledger without inventing species in waste', patch => {
      const vessel = mount(sample(patch));
      expect(useAppStore.getState().emptyVessel(vessel.id)).toBe(false);
      expect(useAppStore.getState().vessels[vessel.id]).toBe(vessel);
      expect(useAppStore.getState().wasteMass_g).toBe(3);
      expect(useAppStore.getState().wasteContents).toHaveLength(1);
    });

  it('restores specimen and waste together through undo and redo', () => {
    const vessel = mount();
    expect(useAppStore.getState().emptyVessel(vessel.id)).toBe(true);
    useAppStore.getState().undo();
    let state = useAppStore.getState();
    expect(state.vessels[vessel.id].mass_g).toBe(20);
    expect(state.wasteMass_g).toBe(3);
    expect(state.wasteContents.reduce((sum, item) => sum + item.mass_g, 0)).toBe(3);
    state.redo(); state = useAppStore.getState();
    expect(state.vessels[vessel.id].mass_g).toBe(0); expect(state.wasteMass_g).toBe(23);
    expect(state.wasteContents.reduce((sum, item) => sum + item.mass_g, 0)).toBe(23);
  });
});
