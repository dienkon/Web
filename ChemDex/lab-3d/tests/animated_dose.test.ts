import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnimatedDoseQueue, releaseDoseAmount, type AnimatedStockDose } from '../src/engine/animatedDose';
import { continuousDoseFraction, dropSchedule, fallingContactTime, landedDropFraction, NOMINAL_DROP_ML,
  stockLiquidPacket, stockArrivedFraction, STOCK_RELEASE_START_S, STOCK_RELEASE_END_S } from '../src/handling/doseTiming';
import { useAppStore } from '../src/store/useAppStore';
import { computeMolarMass } from '../src/engine/ledger';
import type { VesselState } from '../src/types/chemistry';
import { SCENE_GRAVITY } from '../src/science/sceneUnits';

const before = useAppStore.getState();
afterEach(() => useAppStore.setState(before, true));
const empty = (): VesselState => ({ id: 'dose_target', name: 'Dose target', type: 'beaker', capacity_ml: 100,
  position: [0, -0.135, 0], rotationY: 0, isLocked: false, contents: [], substances: [],
  volume_ml: 0, volume: 0, mass_g: 0, ph: 7, temperature_c: 25,
  hasGas: false, hasPrecipitate: false, isBoiling: false });
function setup(v = empty()) {
  useAppStore.setState({ vessels: { [v.id]: v }, burners: {}, activeKinetics: {}, pendingReactions: {},
    pouringChemical: null, isSimulationPaused: false, timeScale: 1, spills: {} });
  return v;
}
const count = (v: VesselState, formula: string) => v.contents.filter(item => item.formula === formula).reduce((sum, item) => sum + item.moles, 0);

describe('Animated addition transfers only contacted matter', () => {
  it('keeps a stock solution out of the vessel until contact and meters partial contact cumulatively', async () => {
    const v = setup();
    useAppStore.getState().triggerPour('H2O', v.id, 20);
    const id = useAppStore.getState().pouringChemical!.id;
    expect(useAppStore.getState().vessels[v.id].mass_g).toBe(0);
    await useAppStore.getState().advancePourContact(id, 0.25);
    expect(useAppStore.getState().vessels[v.id].volume_ml).toBeCloseTo(5, 10);
    await useAppStore.getState().advancePourContact(id, 0.25);
    await useAppStore.getState().advancePourContact(id, 0.1);
    expect(useAppStore.getState().vessels[v.id].volume_ml).toBeCloseTo(5, 10);
    await useAppStore.getState().advancePourContact(id, 1);
    expect(useAppStore.getState().vessels[v.id].volume_ml).toBeCloseTo(20, 10);
  });
  it('keeps precise mole amounts across many small aliquots', async () => {
    const v = setup();
    useAppStore.getState().triggerPour('NaOH', v.id, 1);
    const id = useAppStore.getState().pouringChemical!.id;
    for (let i = 1; i <= 100; i++) await useAppStore.getState().advancePourContact(id, i / 100);
    expect(count(useAppStore.getState().vessels[v.id], 'NaOH')).toBeCloseTo(0.001, 12);
    expect(useAppStore.getState().vessels[v.id].volume_ml).toBeCloseTo(1, 10);
  });
  it('cancels unreleased liquid, ignores stale callbacks, and cannot clear a replacement dose', async () => {
    const v = setup();
    useAppStore.getState().triggerPour('H2O', v.id, 20);
    const oldId = useAppStore.getState().pouringChemical!.id;
    await useAppStore.getState().advancePourContact(oldId, 0.25);
    useAppStore.getState().clearPour(oldId);
    useAppStore.getState().triggerPour('H2O', v.id, 10);
    const newId = useAppStore.getState().pouringChemical!.id;
    await useAppStore.getState().advancePourContact(oldId, 1);
    useAppStore.getState().clearPour(oldId);
    expect(useAppStore.getState().pouringChemical?.id).toBe(newId);
    await useAppStore.getState().advancePourContact(newId, 1);
    expect(useAppStore.getState().vessels[v.id].volume_ml).toBeCloseTo(15, 10);
  });
  it('does not deliver during pause or through a closed/shattered receiver', async () => {
    const v = setup();
    useAppStore.getState().triggerPour('H2O', v.id, 20);
    const id = useAppStore.getState().pouringChemical!.id;
    useAppStore.setState({ isSimulationPaused: true });
    await useAppStore.getState().advancePourContact(id, 1);
    expect(useAppStore.getState().vessels[v.id].volume_ml).toBe(0);
    useAppStore.setState({ isSimulationPaused: false, vessels: { [v.id]: { ...v, isSealed: true } } });
    await useAppStore.getState().advancePourContact(id, 1);
    expect(useAppStore.getState().vessels[v.id].volume_ml).toBe(0);
  });
  it('begins acid/base chemistry only with arriving reagent and never exceeds its finite dose', async () => {
    const v = setup({ ...empty(), contents: [
      { formula: 'HCl', phase: 'aq', moles: 0.01, mass_g: 0.01 * computeMolarMass('HCl') },
      { formula: 'H2O', phase: 'l', moles: (10 - 0.01 * computeMolarMass('HCl')) / 18.015, mass_g: 10 - 0.01 * computeMolarMass('HCl') },
    ], substances: ['HCl', 'H2O'], mass_g: 10, volume_ml: 10, volume: 0.1 });
    useAppStore.getState().triggerPour('NaOH', v.id, 20);
    const id = useAppStore.getState().pouringChemical!.id;
    expect(count(useAppStore.getState().vessels[v.id], 'NaCl')).toBe(0);
    await useAppStore.getState().advancePourContact(id, 0.25);
    const first = useAppStore.getState().vessels[v.id];
    expect(count(first, 'NaCl')).toBeCloseTo(0.005, 10);
    expect(count(first, 'HCl')).toBeCloseTo(0.005, 10);
    await useAppStore.getState().advancePourContact(id, 1);
    const last = useAppStore.getState().vessels[v.id];
    expect(count(last, 'NaCl')).toBeCloseTo(0.01, 10);
    expect(count(last, 'NaOH')).toBeCloseTo(0.01, 10);
  });
});

describe('Contact timing and serialization', () => {
  it('uses the stock-bottle lip trajectory for both visible liquid contact and metered chemistry', () => {
    const mouth = 1, surface = -0.5;
    for (const fraction of [0, 0.2, 0.5, 0.8, 1]) {
      const release = STOCK_RELEASE_START_S + fraction * (STOCK_RELEASE_END_S - STOCK_RELEASE_START_S);
      const packet = stockLiquidPacket(release, mouth, surface), t = packet.flightTime;
      expect(packet.x + packet.vx * t).toBeCloseTo(0, 10);
      expect(packet.y + packet.vy * t - 0.5 * SCENE_GRAVITY * t * t).toBeCloseTo(surface, 10);
      expect(stockArrivedFraction(packet.impactTime, mouth, surface)).toBeCloseTo(fraction, 7);
    }
    const first = stockLiquidPacket(STOCK_RELEASE_START_S, mouth, surface);
    expect(stockArrivedFraction(first.impactTime - 0.01, mouth, surface)).toBe(0);
  });
  it('keeps stock arrival time ordered as the bottle tilts and the lip lowers', () => {
    let previous = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const release = STOCK_RELEASE_START_S + i / 100 * (STOCK_RELEASE_END_S - STOCK_RELEASE_START_S);
      const packet = stockLiquidPacket(release, 0.8, -0.9);
      expect(packet.impactTime).toBeGreaterThan(previous);
      expect(packet.vy).toBeLessThan(0);
      previous = packet.impactTime;
    }
  });
  it('uses gravity and defers continuous delivery until the first liquid reaches the target', () => {
    const flight = fallingContactTime(1);
    expect(0.5 * SCENE_GRAVITY * flight * flight).toBeCloseTo(1, 10);
    expect(continuousDoseFraction(0.854 + flight - 0.01, 0.854, 2.214, flight)).toBe(0);
    expect(continuousDoseFraction(2.214 + flight, 0.854, 2.214, flight)).toBeCloseTo(1, 10);
  });
  it('delivers the selected number of drops instead of always showing three', () => {
    const amount = 2 * NOMINAL_DROP_ML, schedule = dropSchedule(amount, 1);
    expect(schedule.count).toBe(2);
    const first = schedule.releaseStart + schedule.flightTime;
    expect(landedDropFraction(first - 0.001, amount, 1)).toBe(0);
    expect(landedDropFraction(first, amount, 1)).toBe(0.5);
    expect(landedDropFraction(schedule.lastImpact, amount, 1)).toBe(1);
    expect(landedDropFraction(schedule.lastImpact + 5, amount, 1)).toBe(1);
  });
  it('bounds and deduplicates contact reports without accepting NaN', () => {
    const dose: AnimatedStockDose = { id: 1, targetId: 'v', chemical: 'H2O', amount: 10, type: 'liquid', releasedAmount: 4, awaitingContact: true };
    expect(releaseDoseAmount(dose, NaN).amount).toBe(0);
    expect(releaseDoseAmount(dose, 0.2).amount).toBe(0);
    expect(releaseDoseAmount(dose, 2).amount).toBe(6);
  });
  it('coalesces waiting contacts while a slow resolver runs and serializes different doses', async () => {
    let resolveFirst!: () => void;
    const calls: { id: number; amount: number }[] = [];
    const first = new Promise<void>(resolve => { resolveFirst = resolve; });
    const errors = vi.fn();
    const queue = new AnimatedDoseQueue(async job => { calls.push({ id: job.id, amount: job.amount }); if (calls.length === 1) await first; }, errors);
    const job = { id: 1, targetId: 'v', chemical: 'H2O', amount: 1 };
    const a = queue.enqueue(job);
    const b = queue.enqueue({ ...job, amount: 2 });
    const c = queue.enqueue({ ...job, amount: 3 });
    const d = queue.enqueue({ ...job, id: 2, amount: 4 });
    expect(calls).toEqual([{ id: 1, amount: 1 }]);
    resolveFirst(); await Promise.all([a, b, c, d]);
    expect(calls).toEqual([{ id: 1, amount: 1 }, { id: 1, amount: 5 }, { id: 2, amount: 4 }]);
    expect(errors).not.toHaveBeenCalled();
  });
});
