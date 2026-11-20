import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { useInstrumentStore } from '../src/handling/instrumentState';
import { useToolDockStore } from '../src/handling/toolDock';
import { dispenseOneBuretteDrop, serviceBurette, setBuretteValve } from '../src/handling/instrumentOperations';
import { advanceBurettePresentations, burettePresentationView, buretteTargetUnchanged,
  makeBurettePresentation, MAX_BURETTE_PRESENTATIONS, type BurettePresentationInput } from '../src/handling/burettePresentation';
import { dropRadius } from '../src/handling/dropFlight';
import { BuretteFlowClock } from '../src/handling/buretteFlow';
import { clearHistory, loadPersistedLabState, pushHistorySnapshot } from '../src/store/persistence';
import type { VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
const stand: [number, number, number] = [0, 1, 0];
const receiver = (id = 'receiverA', x = 0): VesselState => ({ id, name: id, type: 'beaker', capacity_ml: 100,
  position: [x, -.135, 0], rotationY: 0, isLocked: false, mass_g: 0, volume_ml: 0, volume: 0,
  temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false, contents: [], substances: [] });
const presentation = (volume_ml = .02): BurettePresentationInput => ({ target: receiver(), epoch: 7,
  standPosition: [...stand], volume_ml, color: '#d946ef' });
const readLedger = () => {
  const state = useAppStore.getState();
  return { volume_ml: state.burette.currentVolume_ml, target: JSON.parse(JSON.stringify(state.vessels.receiverA)),
    history: structuredClone(state.titrationHistory) };
};

beforeEach(() => {
  useAppStore.getState().resetWorkbench(); clearHistory();
  useInstrumentStore.getState().clearBurettePresentations();
  useInstrumentStore.getState().clearPipettePresentations();
  useToolDockStore.setState({ positions: {}, dragging: null });
  useAppStore.setState({ vessels: { receiverA: receiver(), receiverB: receiver('receiverB', 3) },
    vesselIds: ['receiverA', 'receiverB'], selectedVesselId: 'receiverA', activeTool: 'none',
    isSimulationPaused: false, moveMode: false, draggingVesselId: null, instrumentRinse: null,
    pouringChemical: null, stockDosePending: false, activeKinetics: {}, pendingReactions: {},
    dissolvingSubstances: {}, burners: {}, burnerIds: [], spills: {}, inFlightPours: [],
    titrationHistory: [], burette: { ...original.burette, position: [...stand], reagentFormula: 'NaCl',
      concentration_M: .2, currentVolume_ml: .02, isDispensing: false, flowRate_ml_s: .5 } });
  const state = useAppStore.getState();
  pushHistorySnapshot('RESET', state.vessels, state.burners, 'Burette test baseline', 'Bản gốc kiểm thử buret', {
    inFlightPours: state.inFlightPours, spills: state.spills, wasteMass_g: state.wasteMass_g,
    wasteContents: state.wasteContents, burette: state.burette, titrationHistory: state.titrationHistory });
});
afterEach(() => {
  vi.useRealTimers(); vi.unstubAllGlobals();
  useAppStore.getState().resetWorkbench(); useAppStore.setState(original, true); clearHistory();
  useInstrumentStore.getState().clearBurettePresentations();
});

describe('finite burette accepted drop presentation', () => {
  it('renders the final .02mL as its own physical drop from the nozzle to its saved receiver contact', () => {
    const receipt = makeBurettePresentation(presentation(), 1)!;
    expect(receipt.volume_ml).toBe(.02);
    expect(receipt.radius).toBeCloseTo(dropRadius(.02), 14);
    expect(receipt.radius).toBeLessThan(dropRadius(.05));
    expect(receipt.outlet).toEqual([0, .9, 0]);
    const start = burettePresentationView(receipt);
    expect(start.position).toEqual(receipt.outlet); expect(start.visible).toBe(true);
    const middle = burettePresentationView({ ...receipt, elapsed_s: receipt.flight.flightTime / 2 });
    expect(middle.position[0]).toBe(receipt.outlet[0]); expect(middle.position[2]).toBe(receipt.outlet[2]);
    expect(middle.position[1]).toBeLessThan(receipt.outlet[1]); expect(middle.position[1]).toBeGreaterThan(receipt.surface[1]);
    const ended = burettePresentationView({ ...receipt, elapsed_s: receipt.flight.flightTime });
    expect(ended.visible).toBe(false);
    expect(ended.position[0]).toBeCloseTo(receipt.surface[0], 12);
    expect(ended.position[1]).toBeCloseTo(receipt.surface[1], 12);
    expect(ended.position[2]).toBeCloseTo(receipt.surface[2], 12);
  });

  it('advances simultaneous accepted drops together, freezes at zero, and removes old epochs', () => {
    const first = makeBurettePresentation(presentation(.05), 1)!, second = makeBurettePresentation(presentation(), 2)!;
    const queue = advanceBurettePresentations([first, second], .03, 7);
    expect(queue.map(r => r.elapsed_s)).toEqual([.03, .03]);
    expect(advanceBurettePresentations(queue, 0, 7).map(r => r.elapsed_s)).toEqual([.03, .03]);
    expect(advanceBurettePresentations(queue, 0, 8)).toEqual([]);
    expect(advanceBurettePresentations(queue, 5, 7)).toEqual([]);
  });

  it('snapshots color, nozzle and target and cancels a moved receiver instead of following selection', () => {
    const input = presentation(), receipt = makeBurettePresentation(input, 1)!;
    const snapshot = structuredClone(receipt);
    input.target.position[0] = 8; input.standPosition[0] = -9; input.color = '#000';
    expect(receipt).toEqual(snapshot);
    expect(buretteTargetUnchanged(receipt, { ...receiver(), volume_ml: 1, position: [1e-7, -.135, 0] })).toBe(true);
    expect(buretteTargetUnchanged(receipt, receiver('receiverB', 3))).toBe(false);
    expect(buretteTargetUnchanged(receipt, { ...receiver(), position: [.01, -.135, 0] })).toBe(false);
  });
});

describe('burette delivery material and interaction guards', () => {
  it('drains the remainder into the waste ledger, supports undo, and refills with matching solution', () => {
    const before = useAppStore.getState();
    expect(serviceBurette('discard').transferred_ml).toBeCloseTo(.02, 12);
    const drained = useAppStore.getState();
    expect(drained.burette.currentVolume_ml).toBe(0);
    expect(drained.wasteMass_g - before.wasteMass_g).toBeCloseTo(.02, 12);
    expect(drained.wasteContents.find(row => row.formula === 'NaCl')?.moles).toBeCloseTo(.2 * .02 / 1000, 14);
    expect(drained.vessels).toBe(before.vessels);
    drained.undo();
    expect(useAppStore.getState().burette.currentVolume_ml).toBeCloseTo(.02, 12);
    expect(useAppStore.getState().wasteContents).toEqual(before.wasteContents);
    expect(serviceBurette('fill').transferred_ml).toBeCloseTo(49.98, 12);
    const refilled = useAppStore.getState();
    expect(refilled.burette).toMatchObject({ currentVolume_ml: 50, reagentFormula: 'NaCl', concentration_M: .2 });
    expect(refilled.wasteMass_g).toBe(before.wasteMass_g);
    expect(serviceBurette('fill').ok).toBe(false);
    expect(refilled.vessels).toEqual(before.vessels);
  });

  it('leaves the vessel, waste and source inventories alone when servicing during motion or flight', () => {
    useAppStore.getState().setMoveMode(true);
    expect(serviceBurette('discard').ok).toBe(false);
    expect(serviceBurette('fill').ok).toBe(false);
    useAppStore.getState().setMoveMode(false);
    expect(dispenseOneBuretteDrop().ok).toBe(true);
    const before = readLedger();
    expect(serviceBurette('fill').ok).toBe(false);
    expect(readLedger()).toEqual(before);
  });

  it.each([{ isSimulationPaused: true }, { moveMode: true }, { draggingVesselId: 'receiverA' }])(
    'rejects direct and instrument dosing/opening while %j', guard => {
      useAppStore.setState(guard);
      const before = readLedger(), state = useAppStore.getState();
      state.dispenseBuretteDrop('receiverA'); expect(dispenseOneBuretteDrop().ok).toBe(false);
      expect(setBuretteValve(true).ok).toBe(false); state.toggleBuretteStopcock(); state.updateBurette({ isDispensing: true });
      expect(readLedger()).toEqual(before); expect(useAppStore.getState().burette.isDispensing).toBe(false);
      expect(useInstrumentStore.getState().burettePresentations).toHaveLength(0);
    });

  it.each([{ isLocked: true }, { isSealed: true }, { isShattered: true },
    { position: [3, -.135, 0] as [number, number, number] },
    { type: 'test_tube' as const, capacity_ml: 50, position: [.35, -.135, 0] as [number, number, number] },
    { position: [0, 3, 0] as [number, number, number] }])(
    'rejects a locked, closed, broken or off-axis selected target %j without consuming reagent', patch => {
      useAppStore.setState(s => ({ vessels: { receiverA: { ...s.vessels.receiverA, ...patch } }, vesselIds: ['receiverA'] }));
      const before = readLedger();
      useAppStore.getState().dispenseBuretteDrop('receiverA');
      expect(dispenseOneBuretteDrop().ok).toBe(false); expect(setBuretteValve(true).ok).toBe(false);
      expect(readLedger()).toEqual(before); expect(useInstrumentStore.getState().burettePresentations).toHaveLength(0);
    });

  it('couples the finite final source loss to target mass/moles, titration history and one presentation', () => {
    expect(dispenseOneBuretteDrop().transferred_ml).toBeCloseTo(.02, 12);
    const state = useAppStore.getState(), target = state.vessels.receiverA;
    expect(state.burette.currentVolume_ml).toBe(0); expect(target.volume_ml).toBeCloseTo(.02, 12);
    expect(target.mass_g).toBeCloseTo(.02, 12);
    expect(target.contents.reduce((sum, row) => sum + row.mass_g, 0)).toBeCloseTo(.02, 12);
    expect(target.contents.find(row => row.formula === 'NaCl')?.moles).toBeCloseTo(.2 * .02 / 1000, 14);
    expect(state.titrationHistory).toHaveLength(1); expect(state.titrationHistory[0].volumeAdded_ml).toBe(.02);
    const receipt = useInstrumentStore.getState().burettePresentations[0];
    expect(receipt.volume_ml).toBeCloseTo(.02, 12); expect(receipt.targetId).toBe('receiverA');
    state.setSelectedVesselId('receiverB'); state.setActiveTool('thermometer');
    expect(useInstrumentStore.getState().burettePresentations[0]).toBe(receipt);
    expect(useAppStore.getState().vessels.receiverB.mass_g).toBe(0);
    expect(dispenseOneBuretteDrop().ok).toBe(false);
    expect(useInstrumentStore.getState().burettePresentations).toHaveLength(1);
  });

  it('rejects an overflowing presentation queue before target or source matter changes', () => {
    const instrument = useInstrumentStore.getState(), epoch = useAppStore.getState().pourEpoch;
    for (let i = 0; i < MAX_BURETTE_PRESENTATIONS; i++) expect(instrument.enqueueBurettePresentation({ ...presentation(), epoch })).toBe(true);
    const before = readLedger();
    useAppStore.getState().dispenseBuretteDrop('receiverA');
    expect(readLedger()).toEqual(before); expect(useInstrumentStore.getState().burettePresentations).toHaveLength(MAX_BURETTE_PRESENTATIONS);
  });

  it('keeps continuous valve ticks at zero dose while move mode is enabled', () => {
    useAppStore.setState(s => ({ moveMode: true, burette: { ...s.burette, currentVolume_ml: 1, isDispensing: true } }));
    const clock = new BuretteFlowClock(), before = readLedger();
    const moved = clock.step(2, true, .5, 1, () => {
      const volume = useAppStore.getState().burette.currentVolume_ml;
      useAppStore.getState().dispenseBuretteDrop('receiverA');
      return volume - useAppStore.getState().burette.currentVolume_ml;
    });
    expect(moved).toBe(0); expect(readLedger()).toEqual(before);
    expect(useInstrumentStore.getState().burettePresentations).toHaveLength(0);
  });

  it('keeps a run of accepted drops in one undoable finite titration operation', () => {
    useAppStore.setState(s => ({ burette: { ...s.burette, currentVolume_ml: .12 } }));
    const baseline = useAppStore.getState(); clearHistory();
    pushHistorySnapshot('RESET', baseline.vessels, baseline.burners, 'Burette batch baseline', 'Bản gốc buret', {
      inFlightPours: [], spills: {}, wasteMass_g: 0, wasteContents: [], burette: baseline.burette, titrationHistory: [] });
    for (let i = 0; i < 3; i++) useAppStore.getState().dispenseBuretteDrop('receiverA');
    expect(useAppStore.getState().vessels.receiverA.mass_g).toBeCloseTo(.12, 12);
    expect(useAppStore.getState().titrationHistory).toHaveLength(3);
    useAppStore.getState().undo();
    expect(useAppStore.getState().burette.currentVolume_ml).toBeCloseTo(.12, 12);
    expect(useAppStore.getState().vessels.receiverA.mass_g).toBe(0);
    expect(useAppStore.getState().titrationHistory).toHaveLength(0);
    useAppStore.getState().redo();
    expect(useAppStore.getState().burette.currentVolume_ml).toBe(0);
    expect(useAppStore.getState().vessels.receiverA.mass_g).toBeCloseTo(.12, 12);
    expect(useAppStore.getState().titrationHistory.at(-1)?.volumeAdded_ml).toBeCloseTo(.12, 12);
  });

  it('undoes and redoes source inventory, target material and titration history as one transaction', () => {
    const before = readLedger();
    useAppStore.getState().dispenseBuretteDrop('receiverA'); const accepted = readLedger();
    useAppStore.getState().undo(); expect(readLedger()).toEqual(before);
    expect(useInstrumentStore.getState().burettePresentations).toHaveLength(0);
    useAppStore.getState().redo(); expect(readLedger()).toEqual(accepted);
    expect(useInstrumentStore.getState().burettePresentations).toHaveLength(0);
  });

  it('persists the depleted source with the accepted target and history in one reload record', () => {
    vi.useFakeTimers();
    const data = new Map<string, string>();
    vi.stubGlobal('window', {}); vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); } });
    useAppStore.getState().dispenseBuretteDrop('receiverA');
    vi.advanceTimersByTime(1100);
    const restored = loadPersistedLabState();
    expect(restored?.vessels.receiverA.mass_g).toBeCloseTo(.02, 12);
    expect(restored?.materials?.burette?.currentVolume_ml).toBe(0);
    expect(restored?.materials?.titrationHistory).toEqual(useAppStore.getState().titrationHistory);
  });
});
