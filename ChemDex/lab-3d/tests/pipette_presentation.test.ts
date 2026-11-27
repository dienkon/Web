import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { advancePipettePresentations, makePipettePresentation, pipettePresentationView,
  pipetteTargetUnchanged, MAX_PIPETTE_PRESENTATIONS, type PipettePresentationInput } from '../src/handling/pipettePresentation';
import { useInstrumentStore } from '../src/handling/instrumentState';
import { HANDHELD_PIPETTE_TIP_LOCAL_Y } from '../src/handling/dropFlight';
import type { VesselState } from '../src/types/chemistry';
import { useAppStore } from '../src/store/useAppStore';
import { aspiratePipette, dispensePipette } from '../src/handling/instrumentOperations';
import { withdrawAliquot } from '../src/handling/aliquot';
import { clearHistory } from '../src/store/persistence';

const originalApp = useAppStore.getState();

const vessel = (id = 'receiverA'): VesselState => ({ id, name: id, type: 'beaker', capacity_ml: 100,
  position: [-1, -.135, .3], rotationY: 0, isLocked: false, mass_g: 5, volume_ml: 5, volume: .05,
  temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false, substances: ['H2O'],
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 5, moles: 5 / 18.015 }] });
function input(volume_ml = .12, direction: 'aspirate' | 'dispense' = 'dispense'): PipettePresentationInput {
  return { target: vessel(), epoch: 7, direction, volume_ml,
    before: { volume_ml: direction === 'dispense' ? volume_ml : 0, color: direction === 'dispense' ? '#b91c1c' : null },
    after: { volume_ml: direction === 'aspirate' ? volume_ml : 0, color: direction === 'aspirate' ? '#b91c1c' : null } };
}

beforeEach(() => useInstrumentStore.getState().clearPipettePresentations());
afterEach(() => useInstrumentStore.getState().clearPipettePresentations());

describe('pipette transfer presentation receipts', () => {
  it.each([.001, .05, .12, .2])('represents the exact %smL microdose without rounding up a last drop', volume => {
    const receipt = makePipettePresentation(input(volume), 1)!;
    expect(receipt.drops.reduce((sum, drop) => sum + drop.volume_ml, 0)).toBeCloseTo(volume, 14);
    expect(receipt.drops.every(drop => drop.volume_ml > 0 && drop.volume_ml <= .05)).toBe(true);
    for (const drop of receipt.drops) {
      const view = pipettePresentationView({ ...receipt, elapsed_s: receipt.position_s + drop.release_s + drop.flight.flightTime * .5 });
      const active = view.drops.find(d => d.visible)!;
      expect(view.stream).toBe(false);
      expect(active.position[0]).toBe(receipt.outlet[0]); expect(active.position[2]).toBe(receipt.outlet[2]);
      expect(active.position[1]).toBeGreaterThan(receipt.surface[1]);
      expect(active.position[1]).toBeLessThan(receipt.outlet[1]);
    }
    const ended = pipettePresentationView({ ...receipt, elapsed_s: receipt.position_s + receipt.transfer_s + .01 });
    expect(ended.drops.some(drop => drop.visible)).toBe(false);
    expect(ended.inventory.volume_ml).toBeCloseTo(0, 14);
    expect(ended.inventory.color).toBeNull();
    expect(receipt.color).toBe('#b91c1c');
  });

  it('keeps a 1mL ordinary dose as a quick finite stream with the actual discharged color', () => {
    const receipt = makePipettePresentation(input(1), 1)!;
    expect(receipt.drops).toEqual([]);
    expect(receipt.transfer_s).toBeLessThan(1);
    const start = pipettePresentationView(receipt);
    expect(start.stream).toBe(false); expect(start.inventory.volume_ml).toBe(1);
    const middle = pipettePresentationView({ ...receipt, elapsed_s: receipt.position_s + receipt.transfer_s / 2 });
    expect(middle.stream).toBe(true);
    expect(middle.flowRate_ml_s * receipt.transfer_s).toBeCloseTo(1, 12);
    expect(middle.inventory.volume_ml).toBeCloseTo(.5, 12);
    expect(middle.inventory.color).toBe('#b91c1c');
    expect(receipt.color).toBe('#b91c1c');
  });

  it('owns outlet, target, before/after and color even when the caller later changes its sample or selection', () => {
    const source = input(1), snapshot = structuredClone(source);
    const receipt = makePipettePresentation(source, 1)!;
    const outlet = [...receipt.outlet], surface = [...receipt.surface], toolPosition = [...receipt.toolPosition];
    source.target.position[0] = 9;
    source.target.volume_ml = 80;
    source.before.color = '#38bdf8'; source.after.volume_ml = 7;
    expect(receipt.targetId).toBe('receiverA');
    expect(receipt.color).toBe(snapshot.before.color);
    expect(receipt.before).toEqual(snapshot.before); expect(receipt.after).toEqual(snapshot.after);
    expect(receipt.outlet).toEqual(outlet); expect(receipt.surface).toEqual(surface);
    expect(receipt.toolPosition).toEqual(toolPosition);
    expect(receipt.toolPosition[1] + HANDHELD_PIPETTE_TIP_LOCAL_Y).toBeCloseTo(receipt.outlet[1], 12);
  });

  it('shows an aspiration from empty to its finite sample without emitting a dispensing jet', () => {
    const receipt = makePipettePresentation(input(2, 'aspirate'), 1)!;
    const start = pipettePresentationView(receipt);
    expect(start.inventory).toEqual({ volume_ml: 0, color: null });
    const middle = pipettePresentationView({ ...receipt, elapsed_s: receipt.position_s + receipt.transfer_s / 2 });
    expect(middle.stream).toBe(false); expect(middle.drops).toHaveLength(0);
    expect(middle.inventory).toEqual({ volume_ml: 1, color: '#b91c1c' });
    const end = pipettePresentationView({ ...receipt, elapsed_s: receipt.duration_s });
    expect(end.inventory).toEqual({ volume_ml: 2, color: '#b91c1c' });
  });

  it('carries elapsed time through queued receipts consistently across frame partitions and freezes at zero', () => {
    const first = makePipettePresentation(input(.12), 1)!, second = makePipettePresentation(input(1), 2)!;
    const total = first.duration_s + .15;
    const whole = advancePipettePresentations([first, second], total, 7);
    let split = [first, second];
    for (let i = 0; i < 13; i++) split = advancePipettePresentations(split, total / 13, 7);
    expect(whole).toHaveLength(1); expect(whole[0].id).toBe(2); expect(whole[0].elapsed_s).toBeCloseTo(.15, 12);
    expect(split[0].elapsed_s).toBeCloseTo(whole[0].elapsed_s, 12);
    const held = advancePipettePresentations(whole, 0, 7);
    expect(held[0]).toBe(whole[0]);
    expect(first.elapsed_s).toBe(0); expect(second.elapsed_s).toBe(0);
  });

  it('signals only dispensing impacts and follows the scheduled landing of each queued drop', () => {
    const dispense = makePipettePresentation(input(.12), 1)!;
    const aspirate = makePipettePresentation(input(.12, 'aspirate'), 2)!;
    const stream = makePipettePresentation(input(1), 3)!;
    const landed: [number, number][] = [];
    const impact = (receipt: typeof dispense, volume_ml: number) => landed.push([receipt.id, volume_ml]);
    const first = dispense.position_s + dispense.drops[0].flight.flightTime;
    const inFlight = advancePipettePresentations([dispense, aspirate, stream], first / 2, 7, undefined, impact);
    expect(landed).toEqual([]);
    const queue = advancePipettePresentations(inFlight, first * .51, 7, undefined, impact);
    expect(landed).toEqual([[1, .05]]);
    advancePipettePresentations(queue, 10, 7, undefined, impact);
    expect(landed.map(([id]) => id)).toEqual([1, 1, 1, 3]);
    expect(landed[2][1]).toBeCloseTo(.02, 14);
    expect(landed[3][1]).toBe(1);
  });

  it('retires a reset or removed/changed target and never reassigns its queued view to another receiver', () => {
    const receipt = makePipettePresentation(input(1), 1)!;
    expect(pipetteTargetUnchanged(receipt, { ...vessel(), volume_ml: 6 })).toBe(true);
    for (const target of [undefined, vessel('receiverB'), { ...vessel(), isSealed: true }, { ...vessel(), isShattered: true },
      { ...vessel(), position: [2, -.135, .3] as [number, number, number] }]) {
      expect(pipetteTargetUnchanged(receipt, target)).toBe(false);
      expect(advancePipettePresentations([receipt], 0, 7, queued => pipetteTargetUnchanged(queued, target))).toHaveLength(0);
    }
    expect(advancePipettePresentations([receipt], 0, 8)).toHaveLength(0);
  });

  it('retains an issued transfer through tiny physical pose jitter but cancels a material vessel move', () => {
    const receipt = makePipettePresentation(input(1), 1)!;
    expect(pipetteTargetUnchanged(receipt, { ...vessel(), position: [-1 + 1e-7, -.135, .3] })).toBe(true);
    expect(pipetteTargetUnchanged(receipt, { ...vessel(), position: [-1 + 1e-3, -.135, .3] })).toBe(false);
    expect(pipetteTargetUnchanged(receipt, { ...vessel(), rotationY: 1e-3 })).toBe(false);
  });

  it('rejects inconsistent or uncolored transfer receipts without consuming queue capacity', () => {
    const valid = input(1);
    for (const invalid of [{ ...valid, volume_ml: 0 }, { ...valid, volume_ml: NaN }, { ...valid, volume_ml: 11 },
      { ...valid, after: { volume_ml: .1, color: '#b91c1c' } }, { ...valid, before: { volume_ml: 1, color: null } }]) {
      expect(useInstrumentStore.getState().enqueuePipettePresentation(invalid)).toBe(false);
      expect(useInstrumentStore.getState().pipettePresentations).toHaveLength(0);
    }
  });

  it('bounds the queue at 32 and frees it after reset rather than replacing accepted receipts', () => {
    const store = useInstrumentStore.getState();
    for (let i = 0; i < MAX_PIPETTE_PRESENTATIONS; i++) expect(store.enqueuePipettePresentation(input(.01))).toBe(true);
    const queued = useInstrumentStore.getState().pipettePresentations;
    expect(store.canQueuePipettePresentation(7)).toBe(false);
    expect(store.enqueuePipettePresentation(input(.01))).toBe(false);
    expect(useInstrumentStore.getState().pipettePresentations).toBe(queued);
    expect(store.canQueuePipettePresentation(8)).toBe(true);
    expect(store.enqueuePipettePresentation({ ...input(.01), epoch: 8 })).toBe(true);
    expect(useInstrumentStore.getState().pipettePresentations).toHaveLength(1);
    expect(store.hasPipettePresentation(7)).toBe(false);
    store.clearPipettePresentations();
    expect(store.hasPipettePresentation(8)).toBe(false);
  });
});

describe('accepted pipette transfers and finite sample recovery', () => {
  beforeEach(() => {
    useAppStore.getState().resetWorkbench(); clearHistory();
    const source = { ...vessel('source'), liquidColor: '#b91c1c' };
    const A = { ...vessel(), contents: [], substances: [], mass_g: 0, volume_ml: 0, volume: 0 };
    const B = { ...A, id: 'receiverB', position: [2, -.135, .3] as [number, number, number] };
    useAppStore.setState({ ...originalApp, vessels: { source, receiverA: A, receiverB: B }, vesselIds: ['source', 'receiverA', 'receiverB'],
      selectedVesselId: 'source', activeTool: 'pipette', isSimulationPaused: false, moveMode: false,
      instrumentRinse: null, pouringChemical: null, stockDosePending: false,
      pipetteSample: null, activeKinetics: {}, pendingReactions: {}, burners: {}, burnerIds: [],
      inFlightPours: [], spills: {}, wasteMass_g: 0, wasteContents: [] });
    useInstrumentStore.getState().clearPipettePresentations();
  });
  afterEach(() => {
    useAppStore.getState().resetWorkbench(); useAppStore.setState(originalApp, true); clearHistory();
  });

  it('queues the actual emptied aliquot color and original target while selection and active tool change', () => {
    const app = useAppStore.getState();
    app.setPipetteSample({ volume_ml: .12, mass_g: .12, temperature_c: 25, color: '#b91c1c', substances: ['H2O'],
      contents: [{ formula: 'H2O', phase: 'l', mass_g: .12, moles: .12 / 18.015 }] });
    expect(dispensePipette(.12, 'receiverA').ok).toBe(true);
    const receipt = useInstrumentStore.getState().pipettePresentations[0];
    expect(receipt.targetId).toBe('receiverA'); expect(receipt.color).toBe('#b91c1c');
    expect(receipt.volume_ml).toBeCloseTo(.12, 12);
    expect(receipt.drops.reduce((sum, drop) => sum + drop.volume_ml, 0)).toBeCloseTo(.12, 12);
    expect(useAppStore.getState().pipetteSample).toBeNull();
    app.setSelectedVesselId('receiverB'); app.setActiveTool('thermometer');
    expect(useInstrumentStore.getState().pipettePresentations[0]).toBe(receipt);
    expect(useAppStore.getState().vessels.receiverA.volume_ml).toBeCloseTo(.12, 12);
    expect(useAppStore.getState().vessels.receiverB.volume_ml).toBe(0);
  });

  it('rejects a full presentation queue before changing either sample or receiver', () => {
    const app = useAppStore.getState(), instrument = useInstrumentStore.getState();
    app.setPipetteSample({ volume_ml: 1, mass_g: 1, temperature_c: 25, color: '#b91c1c', substances: ['H2O'],
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 1, moles: 1 / 18.015 }] });
    for (let i = 0; i < MAX_PIPETTE_PRESENTATIONS; i++) expect(instrument.enqueuePipettePresentation({ ...input(.01), epoch: app.pourEpoch })).toBe(true);
    const sample = useAppStore.getState().pipetteSample, A = useAppStore.getState().vessels.receiverA;
    expect(dispensePipette(1, 'receiverA').ok).toBe(false);
    expect(useAppStore.getState().pipetteSample).toBe(sample);
    expect(useAppStore.getState().vessels.receiverA).toBe(A);
    expect(useInstrumentStore.getState().pipettePresentations).toHaveLength(32);
  });

  it('rejects aspiration over a dry solid residue in both wrapper and central commit', () => {
    const app = useAppStore.getState();
    app.setPipetteSample({ volume_ml: 0, mass_g: .2, temperature_c: 25, color: '#fff', substances: ['NaCl'],
      contents: [{ formula: 'NaCl', phase: 's', mass_g: .2, moles: .2 / 58.44 }] });
    const sample = useAppStore.getState().pipetteSample, source = useAppStore.getState().vessels.source;
    expect(aspiratePipette(1).ok).toBe(false);
    const transfer = withdrawAliquot(source, 1);
    expect(app.commitPipetteTransfer({ vessel: transfer.vessel, sample: transfer.sample, withdrawal: true })).toBe(false);
    expect(useAppStore.getState().pipetteSample).toBe(sample);
    expect(useAppStore.getState().vessels.source).toBe(source);
    expect(useInstrumentStore.getState().pipettePresentations).toHaveLength(0);
  });

  it('rejects paused aspiration and thermal-shock dispensing before material or glass can change', () => {
    const app = useAppStore.getState();
    useAppStore.setState({ isSimulationPaused: true });
    const source = useAppStore.getState().vessels.source;
    expect(aspiratePipette(1).ok).toBe(false);
    expect(useAppStore.getState().vessels.source).toBe(source);
    app.setPipetteSample({ volume_ml: 1, mass_g: 1, temperature_c: 0, color: '#b91c1c', substances: ['H2O'],
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 1, moles: 1 / 18.015 }] });
    useAppStore.setState(s => ({ vessels: { ...s.vessels, receiverA: { ...s.vessels.receiverA, temperature_c: 350 } } }));
    const sample = useAppStore.getState().pipetteSample, receiver = useAppStore.getState().vessels.receiverA;
    expect(dispensePipette(1, 'receiverA').ok).toBe(false);
    expect(useAppStore.getState().pipetteSample).toBe(sample);
    expect(useAppStore.getState().vessels.receiverA).toBe(receiver);
    expect(useAppStore.getState().vessels.receiverA.isShattered).not.toBe(true);
    expect(useInstrumentStore.getState().pipettePresentations).toHaveLength(0);
  });

  it('collects a dry held residue to waste exactly once and restores it across undo/redo', () => {
    const app = useAppStore.getState();
    app.setPipetteSample({ volume_ml: 0, mass_g: .2, temperature_c: 25, color: '#fff', substances: ['NaCl'],
      contents: [{ formula: 'NaCl', phase: 's', mass_g: .2, moles: .2 / 58.44, solidOrigin: 'precipitate' }] });
    expect(app.discardPipetteSample()).toBe(true);
    expect(useAppStore.getState().pipetteSample).toBeNull();
    expect(useAppStore.getState().wasteMass_g).toBeCloseTo(.2, 12);
    expect(useAppStore.getState().wasteContents[0].moles).toBeCloseTo(.2 / 58.44, 12);
    expect(useAppStore.getState().wasteContents[0].phase).toBe('s');
    expect(app.discardPipetteSample()).toBe(false);
    app.undo();
    expect(useAppStore.getState().pipetteSample?.mass_g).toBeCloseTo(.2, 12);
    expect(useAppStore.getState().wasteMass_g).toBe(0);
    app.redo();
    expect(useAppStore.getState().pipetteSample).toBeNull();
    expect(useAppStore.getState().wasteMass_g).toBeCloseTo(.2, 12);
    expect(useAppStore.getState().wasteContents[0].mass_g).toBeCloseTo(.2, 12);
  });

  it('cannot discard a held sample while its accepted presentation is active, and reset clears old views', () => {
    const app = useAppStore.getState();
    expect(aspiratePipette(1).ok).toBe(true);
    const sample = useAppStore.getState().pipetteSample;
    expect(useInstrumentStore.getState().hasPipettePresentation(app.pourEpoch)).toBe(true);
    expect(app.discardPipetteSample()).toBe(false);
    expect(useAppStore.getState().pipetteSample).toBe(sample);
    app.resetWorkbench();
    expect(useInstrumentStore.getState().pipettePresentations).toHaveLength(0);
    expect(useAppStore.getState().pipetteSample).toBeNull();
  });
});
