import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { PourController } from '../src/pour/controller/PourController';
import { decantLiquid } from '../src/engine/decantTransfer';
import { stepPourSimulation, type SimVessel, type PourPhysicsSession } from '../src/pour/physics/step';
import { computeMolarMass } from '../src/engine/ledger';
import { occupiedLiquidVolume } from '../src/handling/solidOccupancy';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';
import { vfxBus } from '../src/vfx/bus';

const original = useAppStore.getState();
afterEach(async () => { await PourController.commitCurrentPour(); useAppStore.setState(original, true); });
const item = (formula: string, mass_g: number, phase: string): SubstanceContent => ({
  formula, mass_g, phase, moles: mass_g / computeMolarMass(formula),
});
const vessel = (id: string, volume_ml: number, contents: SubstanceContent[]): VesselState => ({
  id, name: id, type: 'beaker', position: [0, -0.135, 0], rotationY: 0, isLocked: false,
  volume_ml, volume: volume_ml / 100, capacity_ml: 100, contents,
  substances: [...new Set(contents.map(entry => entry.formula))], mass_g: contents.reduce((sum, entry) => sum + entry.mass_g, 0),
  density_g_ml: 0.7, temperature_c: 25, ph: 7, liquidColor: '#f8fafc',
  hasGas: false, hasPrecipitate: false, isBoiling: false,
});
function specimens() {
  return { source: vessel('source', 50, [item('H2O', 50, 'l'), item('NaCl', 1, 'aq'), item('Cu', 1, 's')]),
    target: vessel('target', 89, [item('H2O', 89, 'l'), item('Cu', 89.6, 's')]) };
}
function setup(source: VesselState, target: VesselState) {
  useAppStore.setState({ vessels: { [source.id]: source, [target.id]: target }, vesselIds: [source.id, target.id],
    burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, spills: {}, timeScale: 1, isSimulationPaused: false });
}
const sim = (v: VesselState): SimVessel => ({ ...v, rotationZ: 0, density_g_ml: v.density_g_ml ?? 1, colorHex: v.liquidColor ?? '#f8fafc' });
const session = (): PourPhysicsSession => ({ sourceId: 'source', targetId: 'target', sourcePos: [0, 3, 0],
  tilt: 1.4, sourceRotationZ: -1.4, isStreaming: true, totalTransferred_ml: 0, totalSpilled_ml: 0, lastFlowRate: 0, assist: 'high' });

describe('Pour receipts and occupied receiver capacity', () => {
  it('returns received and spilled volumes from actual inventory and retains solid metal in the source', () => {
    const { source, target } = specimens(); setup(source, target);
    const receipt = useAppStore.getState().transferLiquidContinuous(source.id, target.id, 10);
    expect(receipt.moved_ml).toBeCloseTo(10, 10);
    expect(receipt.accepted_ml).toBeCloseTo(1, 8);
    expect(receipt.spilled_ml).toBeCloseTo(9, 8);
    const state = useAppStore.getState(), finalSource = state.vessels.source, finalTarget = state.vessels.target;
    expect(occupiedLiquidVolume(finalTarget)).toBeCloseTo(100, 8);
    expect(finalSource.contents.find(entry => entry.formula === 'Cu')!.mass_g).toBe(1);
    expect(finalTarget.contents.find(entry => entry.formula === 'Cu')!.mass_g).toBe(89.6);
    const spills = Object.values(state.spills);
    expect(finalSource.mass_g + finalTarget.mass_g + spills.reduce((sum, spill) => sum + spill.mass_g!, 0))
      .toBeCloseTo(source.mass_g + target.mass_g, 9);
    expect(spills.reduce((sum, spill) => sum + spill.volume_ml, 0)).toBeCloseTo(receipt.spilled_ml, 9);
  });
  it('uses phase inventories and the same aliquot plan in the pure physical prediction', () => {
    const { source, target } = specimens();
    const prediction = stepPourSimulation(session(), { source: sim(source), target: sim(target) }, 0.5, 0);
    const moved = source.volume_ml - prediction.updatedSource.volume_ml;
    const expected = decantLiquid(source, target, moved)!;
    expect(prediction.nextSession.totalTransferred_ml).toBeCloseTo(expected.accepted_ml, 9);
    expect(prediction.nextSession.totalSpilled_ml).toBeCloseTo(expected.spill!.volume_ml, 9);
    expect(prediction.updatedSource.contents).toEqual(expected.source.contents);
    expect(prediction.updatedTarget!.contents).toEqual(expected.receiver!.contents);
    expect(prediction.updatedSource.mass_g + prediction.updatedTarget!.mass_g + expected.spill!.mass_g)
      .toBeCloseTo(source.mass_g + target.mass_g, 9);
    expect(source.contents.find(entry => entry.formula === 'NaCl')!.mass_g).toBe(1);
  });
  it('counts actual received volume and spill in the live controller near an occupied brim', () => {
    const { source, target } = specimens(); setup(source, target);
    const emitted = vi.spyOn(vfxBus, 'emit');
    let previousStoredVolume = 0, previousSnapshot: object | undefined;
    const committed: { published: number; stored: number }[] = [];
    const stop = vfxBus.on('vessel:overflow', event => {
      const snapshot = useAppStore.getState().spills;
      const volume = Object.values(snapshot).reduce((sum, spill) => sum + spill.volume_ml, 0);
      if (snapshot !== previousSnapshot) {
        committed.push({ published: 0, stored: volume - previousStoredVolume });
        previousSnapshot = snapshot; previousStoredVolume = volume;
      }
      // All arrivals in this transaction are visible before the first callback.
      committed[committed.length - 1].published += event.volume_ml ?? 0;
    });
    try {
      PourController.beginPour({ sourceId: source.id, targetId: target.id, mode: 'ASSIST', requestedVolume_ml: 5 });
      PourController.setTilt(1.4);
      for (let i = 0; i < 240 && (PourController.getSession()?.phase !== 'dripping' || (PourController.getSession()?.inFlight_ml ?? 0) > 1e-8); i++) PourController.tick(1 / 60);
      const current = PourController.getSession()!, state = useAppStore.getState();
      expect(current.transferred_ml).toBeCloseTo(1, 8);
      expect(current.spilled_ml).toBeCloseTo(4, 8);
      expect(state.vessels.source.volume_ml).toBeCloseTo(45, 8);
      expect(state.vessels.target.volume_ml).toBeCloseTo(90, 8);
      expect(Object.values(state.spills).reduce((sum, spill) => sum + spill.volume_ml, 0)).toBeCloseTo(current.spilled_ml, 8);
      expect(current.transferred_ml + current.spilled_ml).toBeCloseTo(source.volume_ml - state.vessels.source.volume_ml, 9);
      expect(emitted.mock.calls.filter(([type]) => type === 'acid:splatter')).toHaveLength(0);
      const overflows = emitted.mock.calls.filter(([type]) => type === 'vessel:overflow').map(([, e]) => e as { vesselId: string; volume_ml: number });
      expect(overflows.length).toBeGreaterThan(0);
      expect(overflows.every(e => e.vesselId === target.id)).toBe(true);
      expect(overflows.reduce((sum, e) => sum + e.volume_ml, 0)).toBeCloseTo(4, 8);
      for (const receipt of committed) expect(receipt.stored).toBeCloseTo(receipt.published, 8);
    } finally { stop(); emitted.mockRestore(); }
  });
  it('reports zero movement when the store rejects a transfer and stops a rejected live session', () => {
    const { source, target } = specimens(); setup({ ...source, isSealed: true }, target);
    expect(useAppStore.getState().transferLiquidContinuous(source.id, target.id, 5))
      .toEqual({ moved_ml: 0, accepted_ml: 0, spilled_ml: 0 });
    const protectedSource = { ...source, id: 'lesson_vessel_protected' }; setup(protectedSource, target);
    PourController.beginPour({ sourceId: protectedSource.id, targetId: target.id, mode: 'ASSIST', requestedVolume_ml: 5 });
    PourController.setTilt(1.4);
    for (let i = 0; i < 180 && (PourController.getSession()?.phase !== 'dripping' || (PourController.getSession()?.inFlight_ml ?? 0) > 1e-8); i++) PourController.tick(1 / 60);
    expect(PourController.getSession()!.transferred_ml).toBe(0);
    expect(PourController.getSession()!.spilled_ml).toBe(0);
    expect(useAppStore.getState().vessels[protectedSource.id].volume_ml).toBe(50);
  });
  it('does not predict movement through a closed receiver or invalid time step', () => {
    const { source, target } = specimens();
    for (const dt of [0, -1, NaN]) {
      const prediction = stepPourSimulation(session(), { source: sim(source), target: sim(target) }, dt, 0);
      expect(prediction.updatedSource).toEqual(sim(source));
      expect(prediction.nextSession.isStreaming).toBe(false);
    }
    const prediction = stepPourSimulation(session(), { source: sim(source), target: { ...sim(target), isSealed: true } }, 1 / 60, 0);
    expect(prediction.updatedSource).toEqual(sim(source));
    expect(prediction.events).toHaveLength(0);
  });
  it('retains the discharged composition in the last spill event when the source empties', () => {
    const source = { ...vessel('source', 10, [item('H2O', 9.63539, 'l'), item('HCl', 0.36461, 'aq')]), ph: 1 };
    setup(source, vessel('target', 0, []));
    const seen: { isAcid: boolean; substances: string[]; vesselId?: string }[] = [];
    const stop = vfxBus.on('acid:splatter', event => { seen.push({ isAcid: event.isAcid!, substances: event.substances ?? [], vesselId: event.vesselId }); });
    try {
      PourController.beginPour({ sourceId: source.id, targetId: null, mode: 'TABLE', requestedVolume_ml: 10 });
      PourController.setTilt(Math.PI);
      for (let i = 0; i < 300 && (PourController.getSession()?.phase !== 'dripping' || (PourController.getSession()?.inFlight_ml ?? 0) > 1e-8); i++) PourController.tick(1 / 60);
      expect(useAppStore.getState().vessels.source.volume_ml).toBeCloseTo(0, 10);
      expect(seen.length).toBeGreaterThan(0);
      expect(seen.at(-1)!.isAcid).toBe(true);
      expect(seen.at(-1)!.substances).toContain('HCl');
      expect(seen.every(e => e.vesselId === source.id)).toBe(true);
    } finally { stop(); }
  });
});
