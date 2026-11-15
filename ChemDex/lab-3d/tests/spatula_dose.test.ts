import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as reactionResolver from '../src/vfx/programs/resolver';
import { useAppStore } from '../src/store/useAppStore';
import { depositSpatula } from '../src/handling/instrumentOperations';
import { SpatulaDoseReservations } from '../src/handling/spatulaDose';
import { pendingStockContacts, acknowledgeStockContacts } from '../src/physical/stockContacts';
import type { VesselState } from '../src/types/chemistry';
import { clearHistory, pushHistorySnapshot } from '../src/store/persistence';

const originalState = useAppStore.getState();
const vessel = (): VesselState => ({ id: 'spatula_receiver', name: 'Receiver', type: 'beaker', capacity_ml: 100,
  position: [0, -0.135, 0], rotationY: 0, isLocked: false, contents: [], substances: [], mass_g: 0,
  volume_ml: 0, volume: 0, ph: 7, temperature_c: 25, hasGas: false, hasPrecipitate: false, isBoiling: false });
const mass = () => useAppStore.getState().vessels.spatula_receiver?.mass_g ?? 0;
function load(amount = 0.037) { useAppStore.getState().setSpatulaScoop('Fe', amount, '#73777f'); }
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }

beforeEach(() => {
  clearHistory();
  const v = vessel();
  useAppStore.setState({ ...originalState, vessels: { [v.id]: v }, vesselIds: [v.id], selectedVesselId: v.id,
    pouringChemical: null, spatulaState: { chemical: null, mass_g: 0, color: '#cbd5e1' },
    activeKinetics: {}, pendingReactions: {}, burners: {}, isSimulationPaused: false, moveMode: false, timeScale: 1 });
});
afterEach(() => {
  useAppStore.getState().clearPour();
  acknowledgeStockContacts(pendingStockContacts().map(contact => contact.id));
  useAppStore.setState(originalState, true);
  vi.restoreAllMocks();
});

describe('Finite spatula contact dosing shared by button and 3D action', () => {
  it('reserves the exact scoop without adding matter before contact or accepting a second dose', async () => {
    load();
    expect((await depositSpatula()).ok).toBe(true);
    const dose = useAppStore.getState().pouringChemical!;
    expect(dose.amount).toBe(0.037);
    expect(dose.source).toEqual({ kind: 'spatula', color: '#73777f' });
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0);
    expect(mass()).toBe(0);
    expect((await depositSpatula()).ok).toBe(false);
    useAppStore.getState().triggerPour('H2O', dose.targetId, 10);
    expect(useAppStore.getState().pouringChemical?.id).toBe(dose.id);
  });

  it('transfers only cumulative arriving fractions and freezes contact while paused', async () => {
    load(); await depositSpatula();
    const dose = useAppStore.getState().pouringChemical!;
    await useAppStore.getState().advancePourContact(dose.id, 0.25);
    expect(mass()).toBeCloseTo(0.037 / 4, 12);
    await useAppStore.getState().advancePourContact(dose.id, 0.25);
    await useAppStore.getState().advancePourContact(dose.id, 0.1);
    useAppStore.setState({ isSimulationPaused: true });
    await useAppStore.getState().advancePourContact(dose.id, 1);
    expect(mass()).toBeCloseTo(0.037 / 4, 12);
    useAppStore.setState({ isSimulationPaused: false });
    await useAppStore.getState().advancePourContact(dose.id, 1);
    useAppStore.getState().clearPour(dose.id);
    expect(mass()).toBeCloseTo(0.037, 12);
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0);
  });

  it('returns only the uncontacted remainder and ignores old callbacks after cancellation', async () => {
    load(); await depositSpatula();
    const dose = useAppStore.getState().pouringChemical!;
    await useAppStore.getState().advancePourContact(dose.id, 0.25);
    useAppStore.getState().clearPour(dose.id);
    useAppStore.getState().clearPour(dose.id);
    await useAppStore.getState().advancePourContact(dose.id, 1);
    expect(mass() + useAppStore.getState().spatulaState.mass_g).toBeCloseTo(0.037, 12);
    expect(useAppStore.getState().spatulaState.mass_g).toBeCloseTo(0.037 * 0.75, 12);
  });

  it('returns all uncontacted matter immediately when the target is removed during pause', async () => {
    load(); await depositSpatula();
    const dose = useAppStore.getState().pouringChemical!;
    useAppStore.setState({ isSimulationPaused: true });
    useAppStore.getState().removeVessel(dose.targetId);
    expect(useAppStore.getState().pouringChemical).toBeNull();
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0.037);
    await useAppStore.getState().advancePourContact(dose.id, 1);
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0.037);
  });

  it('rejects closed targets, move/pause mode and nonfinite or empty samples without inventing a fallback dose', async () => {
    for (const value of [0, NaN, Infinity, -0.1]) {
      load(value);
      expect((await depositSpatula()).ok).toBe(false);
      expect(useAppStore.getState().pouringChemical).toBeNull();
    }
    load();
    for (const patch of [{ isSimulationPaused: true }, { moveMode: true }]) {
      useAppStore.setState(patch);
      expect((await depositSpatula()).ok).toBe(false);
      useAppStore.setState({ isSimulationPaused: false, moveMode: false });
    }
    useAppStore.setState({ vessels: { spatula_receiver: { ...vessel(), isSealed: true } } });
    expect((await depositSpatula()).ok).toBe(false);
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0.037);
  });

  it('keeps in-flight writes reserved and refunds cancelled queued contacts exactly once', async () => {
    const gate = deferred();
    useAppStore.setState({ mixSubstances: async (target, chemical, amount, accepted) => {
      await gate.promise;
      await originalState.mixSubstances(target, chemical, amount, accepted);
    } });
    load(1); await depositSpatula();
    const dose = useAppStore.getState().pouringChemical!;
    const first = useAppStore.getState().advancePourContact(dose.id, 0.25);
    const queued = useAppStore.getState().advancePourContact(dose.id, 0.5);
    useAppStore.getState().clearPour(dose.id);
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0.5);
    load(3); // A late return must never overwrite a new chemical/sample.
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0.5);
    gate.resolve(); await Promise.all([first, queued]);
    expect(mass()).toBeCloseTo(0.25, 12);
    expect(useAppStore.getState().spatulaState.mass_g).toBeCloseTo(0.75, 12);
    expect(mass() + useAppStore.getState().spatulaState.mass_g).toBeCloseTo(1, 12);
  });

  it('recovers rejected contacted grams and removes their failed physical contact receipt', async () => {
    useAppStore.setState({ mixSubstances: async () => { throw new Error('Resolver unavailable'); } });
    load(); await depositSpatula();
    const dose = useAppStore.getState().pouringChemical!;
    await useAppStore.getState().advancePourContact(dose.id, 0.5, [{ mass_g: dose.amount / 2,
      position_m: [0, 0, 0], rotation: [0, 0, 0, 1], velocity_m_s: [0, -1, 0], angularVelocity_rad_s: [0, 0, 0] }]);
    expect(mass()).toBe(0);
    expect(useAppStore.getState().spatulaState.mass_g).toBeCloseTo(0.037, 12);
    expect(useAppStore.getState().pouringChemical).toBeNull();
    expect(pendingStockContacts()).toHaveLength(0);
  });

  it('never refunds an acknowledged commit when a later resolver operation throws', async () => {
    useAppStore.setState({ mixSubstances: async (target, chemical, amount, accepted) => {
      await originalState.mixSubstances(target, chemical, amount, accepted);
      throw new Error('Post-commit presentation failure');
    } });
    load(); await depositSpatula();
    const dose = useAppStore.getState().pouringChemical!;
    await useAppStore.getState().advancePourContact(dose.id, 1);
    useAppStore.getState().clearPour(dose.id);
    expect(mass()).toBeCloseTo(0.037, 12);
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0);
  });

  it('does not start queued chemistry writes until the simulation resumes', async () => {
    const gate = deferred(); let calls = 0;
    useAppStore.setState({ mixSubstances: async (target, chemical, amount, accepted) => {
      calls++;
      await originalState.mixSubstances(target, chemical, amount, accepted);
      if (calls === 1) await gate.promise;
    } });
    load(1); await depositSpatula();
    const dose = useAppStore.getState().pouringChemical!;
    const first = useAppStore.getState().advancePourContact(dose.id, 0.25);
    const queued = useAppStore.getState().advancePourContact(dose.id, 0.5);
    useAppStore.setState({ isSimulationPaused: true }); gate.resolve();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(calls).toBe(1);
    useAppStore.setState({ isSimulationPaused: false });
    await Promise.all([first, queued]);
    expect(calls).toBe(2);
    useAppStore.getState().clearPour(dose.id);
    expect(mass() + useAppStore.getState().spatulaState.mass_g).toBeCloseTo(1, 12);
  });

  it('defers an already resolving contact commit if its result returns during pause', async () => {
    const gate = deferred(), resolve = reactionResolver.resolveReactionProgram;
    const spy = vi.spyOn(reactionResolver, 'resolveReactionProgram').mockImplementation(async (...args) => {
      await gate.promise; return resolve(...args);
    });
    load(); await depositSpatula();
    const dose = useAppStore.getState().pouringChemical!;
    const delivery = useAppStore.getState().advancePourContact(dose.id, 1);
    expect(spy).toHaveBeenCalled();
    useAppStore.setState({ isSimulationPaused: true }); gate.resolve();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(mass()).toBe(0);
    useAppStore.setState({ isSimulationPaused: false });
    await delivery;
    expect(mass()).toBeCloseTo(0.037, 12);
  });

  it('blocks undo and redo during a half-transferred scoop and releases history when transactions finish', async () => {
    const baseline = useAppStore.getState().vessels;
    pushHistorySnapshot('RESET', baseline, {}, 'baseline', 'baseline');
    load(1); await depositSpatula();
    const dose = useAppStore.getState().pouringChemical!;
    await useAppStore.getState().advancePourContact(dose.id, 0.5);
    useAppStore.getState().undo();
    expect(mass()).toBeCloseTo(0.5, 12);
    expect(useAppStore.getState().pouringChemical?.releasedAmount).toBe(0.5);
    expect(useAppStore.getState().globalWarning).toContain('Chờ');
    await useAppStore.getState().advancePourContact(dose.id, 1);
    useAppStore.getState().clearPour(dose.id);
    expect(useAppStore.getState().stockDosePending).toBe(false);
    useAppStore.getState().undo();
    expect(mass()).toBeCloseTo(0.5, 12);
    load(0.1); await depositSpatula();
    useAppStore.getState().redo();
    expect(mass()).toBeCloseTo(0.5, 12);
    useAppStore.getState().clearPour();
    useAppStore.getState().redo();
    expect(mass()).toBeCloseTo(1, 12);
  });

  it('blocks history after cancellation while an already contacted transaction is still unresolved', async () => {
    const baseline = useAppStore.getState().vessels, changed = { ...baseline, spatula_receiver: { ...vessel(), position: [2, -0.135, 0] as [number, number, number] } };
    pushHistorySnapshot('RESET', baseline, {}, 'baseline', 'baseline');
    pushHistorySnapshot('POUR', changed, {}, 'move', 'move');
    useAppStore.setState({ vessels: changed });
    const gate = deferred();
    useAppStore.setState({ mixSubstances: async (target, chemical, amount, accepted) => {
      await gate.promise; await originalState.mixSubstances(target, chemical, amount, accepted);
    } });
    load(1); await depositSpatula();
    const dose = useAppStore.getState().pouringChemical!;
    const pending = useAppStore.getState().advancePourContact(dose.id, 0.5);
    useAppStore.getState().clearPour(dose.id);
    useAppStore.getState().undo();
    expect(useAppStore.getState().vessels.spatula_receiver.position[0]).toBe(2);
    expect(useAppStore.getState().stockDosePending).toBe(true);
    gate.resolve(); await pending;
    expect(useAppStore.getState().stockDosePending).toBe(false);
    useAppStore.getState().undo();
    expect(mass()).toBe(0);
  });

  it('invalidates a real delayed fallback result on reset even when the receiver ID exists on the new bench', async () => {
    const gate = deferred(), started = deferred(), resolve = reactionResolver.resolveReactionProgram;
    vi.spyOn(reactionResolver, 'resolveReactionProgram').mockImplementation(async (...args) => {
      started.resolve(); await gate.promise; return resolve(...args);
    });
    const target = { ...vessel(), id: 'beaker_1' };
    useAppStore.setState({ vessels: { beaker_1: target }, vesselIds: ['beaker_1'], selectedVesselId: 'beaker_1' });
    load(1); await depositSpatula();
    const dose = useAppStore.getState().pouringChemical!;
    const pending = useAppStore.getState().advancePourContact(dose.id, 0.5);
    await started.promise;
    useAppStore.getState().resetWorkbench();
    const reset = useAppStore.getState().vessels.beaker_1;
    expect(reset.mass_g).toBe(0);
    expect(useAppStore.getState().stockDosePending).toBe(false);
    expect(useAppStore.getState().pouringChemical).toBeNull();
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0);
    // New doses can start before an old external resolver returns.
    useAppStore.getState().setSpatulaScoop('Fe', 0.2, '#777');
    expect(useAppStore.getState().beginSpatulaDose('beaker_1')).toBe(true);
    const fresh = useAppStore.getState().pouringChemical!;
    gate.resolve(); await pending;
    expect(useAppStore.getState().vessels.beaker_1).toBe(reset);
    expect(useAppStore.getState().pouringChemical?.id).toBe(fresh.id);
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0);
    useAppStore.getState().clearPour(fresh.id);
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0.2);
  });
});

describe('Reserved solid amount accounting', () => {
  it('keeps tiny positive contacted doses finite instead of discarding them below a fixed gram threshold', () => {
    const ledger = new SpatulaDoseReservations();
    ledger.begin(1, { chemical: 'Fe', mass_g: 1e-15, color: '#777' });
    ledger.release(1, 1e-15);
    expect(ledger.close(1)).toBeNull();
    expect(ledger.occupied).toBe(true);
    expect(ledger.settle(1, 1e-15, false)?.mass_g).toBe(1e-15);
    expect(ledger.occupied).toBe(false);
  });

  it('keeps the reservation until every submitted transaction settles and bounds duplicate close/settle', () => {
    const ledger = new SpatulaDoseReservations();
    expect(ledger.begin(1, { chemical: 'Fe', mass_g: 1, color: '#777' })).toBe(true);
    ledger.release(1, 0.4);
    expect(ledger.close(1)?.mass_g).toBeCloseTo(0.6, 12);
    expect(ledger.close(1)).toBeNull();
    expect(ledger.occupied).toBe(true);
    expect(ledger.settle(1, 0.4, false)?.mass_g).toBeCloseTo(0.4, 12);
    expect(ledger.settle(1, 0.4, false)).toBeNull();
    expect(ledger.occupied).toBe(false);
  });
});
