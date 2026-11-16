import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import type { BurnerState, VesselState } from '../src/types/chemistry';

const initial = useAppStore.getState();
afterEach(() => useAppStore.setState(initial, true));
const vessel = (id: string, type: VesselState['type'] = 'beaker',
  position: [number, number, number] = [0, -.135, 0]): VesselState => ({
  id, name: id, type, capacity_ml: 100, position, rotationY: 0, isLocked: false,
  contents: [], substances: [], mass_g: 0, volume_ml: 0, volume: 0,
  temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
});
function mount(vessels: Record<string, VesselState>, burners: Record<string, BurnerState> = {}) {
  useAppStore.setState({ vessels, vesselIds: Object.keys(vessels), burners, burnerIds: Object.keys(burners),
    pouringChemical: null, stockDosePending: false, instrumentRinse: null, isSimulationPaused: false,
    moveMode: false, draggingVesselId: null, snapToGrid: false, activeKinetics: {}, pendingReactions: {},
    dissolvingSubstances: {}, inFlightPours: [], spills: {} });
}
function start(targetId: string) {
  useAppStore.getState().triggerPour('H2O', targetId, .12);
  return useAppStore.getState().pouringChemical!;
}

describe('stock receivers stay under their finite arriving dose', () => {
  it.each(['direct', 'rack', 'tongs', 'funnel', 'burner'] as const)('rejects starting stock addition into a moving %s receiver even outside Move mode', kind => {
    const receiver = vessel('receiver', kind === 'rack' ? 'test_tube' : kind === 'funnel' ? 'filter_funnel' : 'beaker',
      [0, kind === 'funnel' ? 1.2 : kind === 'burner' ? .8 : -.135, 0]);
    const root = vessel('root', kind === 'rack' ? 'test_tube_rack' : kind === 'tongs' ? 'tongs' : 'flask');
    const other = vessel('other', 'beaker', [3, -.135, 0]);
    if (kind === 'rack') root.slottedTestTubeIds = [receiver.id];
    if (kind === 'tongs') root.grippedVesselId = receiver.id;
    const burner: BurnerState = { ...initial.burners[initial.burnerIds[0]], id: 'burner_test', position: [0, -1.175, 0] };
    mount({ receiver, root, other }, kind === 'burner' ? { [burner.id]: burner } : {});
    const heldId = kind === 'direct' ? receiver.id : kind === 'burner' ? burner.id : root.id;
    const state = useAppStore.getState();
    state.setDraggingVesselId(heldId);
    expect(useAppStore.getState().moveMode).toBe(false);
    state.triggerPour('H2O', receiver.id, .12);
    expect(useAppStore.getState().pouringChemical).toBeNull();
    expect(useAppStore.getState().mixError).toBe('Đặt bình nhận xuống trước khi cấp hóa chất.');
    expect(useAppStore.getState().vessels.receiver.mass_g).toBe(0);
    state.setSpatulaScoop('Fe', .2, '#777');
    expect(state.beginSpatulaDose(receiver.id)).toBe(false);
    expect(useAppStore.getState().spatulaState.mass_g).toBe(.2);
    // Holding one assembly must not block stock addition elsewhere.
    state.triggerPour('H2O', other.id, .12);
    const otherDose = useAppStore.getState().pouringChemical!;
    expect(otherDose.targetId).toBe(other.id);
    state.clearPour(otherDose.id);
    state.setDraggingVesselId(null);
    state.triggerPour('H2O', receiver.id, .12);
    expect(useAppStore.getState().pouringChemical?.targetId).toBe(receiver.id);
  });

  it('rejects drag start and direct movement, preserves the dose, and allows unrelated motion', async () => {
    const receiver = vessel('receiver'), other = vessel('other', 'beaker', [3, -.135, 0]);
    mount({ receiver, other });
    const dose = start(receiver.id), state = useAppStore.getState();
    state.setMoveMode(true);
    state.setDraggingVesselId(receiver.id);
    state.updateVesselPosition(receiver.id, [2, .4, 1]);
    expect(useAppStore.getState().draggingVesselId).toBeNull();
    expect(useAppStore.getState().mixError).toBe('Chờ cấp hóa chất xong rồi di chuyển bình nhận.');
    expect(useAppStore.getState().vessels.receiver).toBe(receiver);
    expect(useAppStore.getState().pouringChemical).toBe(dose);
    state.setDraggingVesselId(other.id);
    state.updateVesselPosition(other.id, [4, -.135, 1]);
    expect(useAppStore.getState().draggingVesselId).toBe(other.id);
    expect(useAppStore.getState().vessels.other.position).toEqual([4, -.135, 1]);
    state.setDraggingVesselId(null);
    await state.advancePourContact(dose.id, 1);
    expect(useAppStore.getState().vessels.receiver.volume_ml).toBeCloseTo(.12, 12);
    // The renderer still owns its withdrawal phase until it clears this dose.
    state.setDraggingVesselId(receiver.id);
    expect(useAppStore.getState().draggingVesselId).toBeNull();
    state.clearPour(dose.id);
    state.setDraggingVesselId(receiver.id);
    state.updateVesselPosition(receiver.id, [2, .4, 1]);
    expect(useAppStore.getState().draggingVesselId).toBe(receiver.id);
    expect(useAppStore.getState().vessels.receiver.position).toEqual([2, .4, 1]);
    expect(useAppStore.getState().vessels.receiver.volume_ml).toBeCloseTo(.12, 12);
  });

  it('blocks programmatic position and orientation changes while allowing chemistry updates', () => {
    const receiver = vessel('receiver'), other = vessel('other');
    mount({ receiver, other }); start(receiver.id);
    const state = useAppStore.getState();
    const patches: Partial<VesselState>[] = [
      { position: [1, 0, 1] }, { rotationY: .5 }, { rotationZ: .5 },
      { physicalMotion: { rotation: [0, 0, .2, .98], velocity_m_s: [0, 0, 0],
        angularVelocity_rad_s: [0, 0, 0], tick: 1 } },
    ];
    for (const patch of patches) {
      state.setVesselState(receiver.id, patch);
      expect(useAppStore.getState().vessels.receiver).toBe(receiver);
    }
    state.rotateVessel(receiver.id);
    expect(useAppStore.getState().vessels.receiver).toBe(receiver);
    state.setVesselState(receiver.id, { temperature_c: 26, position: [...receiver.position] });
    expect(useAppStore.getState().vessels.receiver.temperature_c).toBe(26);
    state.rotateVessel(other.id);
    expect(useAppStore.getState().vessels.other.rotationY).toBeCloseTo(Math.PI / 4);
  });

  it.each(['rack', 'tongs', 'funnel', 'burner'] as const)('rejects picking up a %s that would carry the active receiver', kind => {
    const receiver = vessel('receiver', kind === 'rack' ? 'test_tube' : kind === 'funnel' ? 'filter_funnel' : 'beaker',
      [0, kind === 'funnel' ? 1.2 : kind === 'burner' ? .8 : -.135, 0]);
    const root = vessel('root', kind === 'rack' ? 'test_tube_rack' : kind === 'tongs' ? 'tongs' : 'flask');
    if (kind === 'rack') root.slottedTestTubeIds = [receiver.id];
    if (kind === 'tongs') root.grippedVesselId = receiver.id;
    const burner: BurnerState = { ...initial.burners[initial.burnerIds[0]], id: 'burner_test', position: [0, -1.175, 0] };
    mount(kind === 'burner' ? { receiver } : { root, receiver }, kind === 'burner' ? { [burner.id]: burner } : {});
    const dose = start(receiver.id), state = useAppStore.getState(), heldId = kind === 'burner' ? burner.id : root.id;
    state.setDraggingVesselId(heldId);
    expect(useAppStore.getState().draggingVesselId).toBeNull();
    if (kind !== 'burner') {
      state.updateVesselPosition(root.id, [2, -.135, 1]);
      state.setVesselState(root.id, { position: [2, -.135, 1] });
      expect(useAppStore.getState().vessels.root).toBe(root);
      expect(useAppStore.getState().vessels.receiver).toBe(receiver);
    }
    expect(useAppStore.getState().pouringChemical).toBe(dose);
    state.clearPour(dose.id);
    state.setDraggingVesselId(heldId);
    expect(useAppStore.getState().draggingVesselId).toBe(heldId);
  });

  it('rejects rack and hot-plate placement buttons without changing assembly membership', () => {
    const receiver = vessel('receiver', 'test_tube', [3, -.135, 0]);
    const rack = { ...vessel('rack', 'test_tube_rack'), slottedTestTubeIds: [] as string[] };
    const plate = vessel('plate', 'hot_plate', [-3, -.135, 0]);
    const plateReceiver = vessel('plateReceiver', 'beaker', [5, -.135, 0]);
    mount({ receiver, rack, plate, plateReceiver });
    const dose = start(receiver.id), state = useAppStore.getState();
    state.placeTestTubeInRack(rack.id, receiver.id);
    expect(useAppStore.getState().vessels.rack.slottedTestTubeIds).toEqual([]);
    expect(useAppStore.getState().vessels.receiver).toBe(receiver);
    state.clearPour(dose.id);
    const plateDose = start(plateReceiver.id);
    expect(state.placeOnHotPlate(plateReceiver.id, plate.id)).toBe(false);
    expect(useAppStore.getState().vessels.plateReceiver).toBe(plateReceiver);
    state.clearPour(plateDose.id);
    state.placeTestTubeInRack(rack.id, receiver.id);
    const slotted = useAppStore.getState().vessels.receiver;
    expect(useAppStore.getState().vessels.rack.slottedTestTubeIds).toEqual([receiver.id]);
    start(receiver.id);
    state.removeTestTubeFromRack(rack.id, receiver.id);
    expect(useAppStore.getState().vessels.receiver).toBe(slotted);
    expect(useAppStore.getState().vessels.rack.slottedTestTubeIds).toEqual([receiver.id]);
  });

  it('keeps only a cancelled dose receiver stationary until its contacted transaction settles', async () => {
    const receiver = vessel('receiver'), other = vessel('other', 'beaker', [3, -.135, 0]);
    mount({ receiver, other });
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    useAppStore.setState({ mixSubstances: async (...args) => { await gate; await initial.mixSubstances(...args); } });
    const dose = start(receiver.id), state = useAppStore.getState();
    const pending = state.advancePourContact(dose.id, .5);
    state.clearPour(dose.id);
    expect(useAppStore.getState().stockDosePending).toBe(true);
    expect(useAppStore.getState().pouringChemical).toBeNull();
    state.setDraggingVesselId(receiver.id);
    state.updateVesselPosition(receiver.id, [2, .4, 1]);
    state.rotateVessel(receiver.id);
    state.setVesselState(receiver.id, { position: [2, .4, 1] });
    expect(useAppStore.getState().draggingVesselId).toBeNull();
    expect(useAppStore.getState().vessels.receiver).toBe(receiver);
    state.updateVesselPosition(other.id, [4, -.135, 1]);
    expect(useAppStore.getState().vessels.other.position).toEqual([4, -.135, 1]);
    release(); await pending;
    expect(useAppStore.getState().stockDosePending).toBe(false);
    expect(useAppStore.getState().vessels.receiver.volume_ml).toBeCloseTo(.06, 12);
    state.setDraggingVesselId(receiver.id);
    state.updateVesselPosition(receiver.id, [2, .4, 1]);
    expect(useAppStore.getState().draggingVesselId).toBe(receiver.id);
    expect(useAppStore.getState().vessels.receiver.position).toEqual([2, .4, 1]);
    expect(useAppStore.getState().vessels.receiver.volume_ml).toBeCloseTo(.06, 12);
  });
});
