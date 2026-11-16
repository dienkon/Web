import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { clearHistory, getHistoryList } from '../src/store/persistence';
import { labSound } from '../src/utils/audio';
import { washBottleSqueezeProblem } from '../src/handling/washBottleSqueeze';
import type { VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
const bottle: VesselState = { id: 'wash', name: 'Wash', type: 'wash_bottle', position: [-2, -.135, 0],
  rotationY: 0, isLocked: false, capacity_ml: 250, volume_ml: 25, volume: .1, mass_g: 25,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 25, moles: 25 / 18.015 }], substances: ['H2O'],
  temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false, washTargetId: 'receiver' };
const receiver: VesselState = { ...bottle, id: 'receiver', name: 'Receiver', type: 'beaker',
  position: [2, -.135, 0], volume_ml: 0, volume: 0, mass_g: 0, contents: [], substances: [] };

beforeEach(() => {
  clearHistory();
  useAppStore.setState({ vessels: { wash: structuredClone(bottle), receiver: structuredClone(receiver) },
    vesselIds: ['wash', 'receiver'], selectedVesselId: 'wash', burners: {}, burnerIds: [],
    activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, spills: {}, inFlightPours: [],
    wasteMass_g: 0, wasteContents: [], instrumentRinse: null, isSimulationPaused: false,
    moveMode: false, draggingVesselId: null });
});
afterEach(() => { useAppStore.setState(original, true); clearHistory(); vi.restoreAllMocks(); });
const ledger = () => {
  const s = useAppStore.getState();
  return JSON.stringify({ vessels: s.vessels, spills: s.spills, inFlightPours: s.inFlightPours,
    wasteMass_g: s.wasteMass_g, wasteContents: s.wasteContents, kinetics: s.activeKinetics });
};

describe('wash-bottle user squeeze interaction boundary', () => {
  it.each([{ isSimulationPaused: true }, { moveMode: true }, { draggingVesselId: 'wash' },
    { draggingVesselId: 'receiver' }, { draggingVesselId: 'other' }])('rejects a squeeze while %j', patch => {
    useAppStore.setState(patch);
    const before = ledger(), sound = vi.spyOn(labSound, 'playLiquidPour');
    expect(washBottleSqueezeProblem(useAppStore.getState(), 'wash')).toBeTruthy();
    useAppStore.getState().squirtWashBottle('wash');
    expect(ledger()).toBe(before); expect(getHistoryList()).toHaveLength(0); expect(sound).not.toHaveBeenCalled();
  });

  it.each(['wash', 'receiver'])('respects the locked %s through direct store calls', id => {
    useAppStore.setState(s => ({ vessels: { ...s.vessels, [id]: { ...s.vessels[id], isLocked: true } } }));
    const before = ledger();
    useAppStore.getState().squirtWashBottle('wash', 'receiver');
    expect(ledger()).toBe(before); expect(getHistoryList()).toHaveLength(0);
  });

  it('keeps exact source/receiver water mass and moles when a valid squeeze is accepted', () => {
    expect(washBottleSqueezeProblem(useAppStore.getState(), 'wash')).toBeNull();
    useAppStore.getState().squirtWashBottle('wash');
    const state = useAppStore.getState(), source = state.vessels.wash, target = state.vessels.receiver;
    expect(source.volume_ml).toBe(20); expect(target.volume_ml).toBe(5);
    expect(source.mass_g + target.mass_g).toBeCloseTo(25, 12);
    expect([...source.contents, ...target.contents].reduce((sum, row) => sum + row.moles, 0)).toBeCloseTo(25 / 18.015, 12);
    expect(state.inFlightPours).toHaveLength(0); expect(Object.keys(state.spills)).toHaveLength(0);
    expect(getHistoryList()).toHaveLength(1);
  });
});
