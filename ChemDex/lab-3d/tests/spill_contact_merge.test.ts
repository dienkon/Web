import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergeWorkbenchSpill } from '../src/engine/spillInventory';
import { calculateSpillRadius } from '../src/science/overflowPhysics';
import type { SpillState, SubstanceContent } from '../src/types/chemistry';

afterEach(() => vi.restoreAllMocks());
const water = (v: number): SubstanceContent[] => [{ formula: 'H2O', phase: 'l', liquidLayer: 'aqueous',
  volume_ml: v, mass_g: v, moles: v / 18.015, initialMass_g: v, initialMoles: v / 18.015 }];
const spill = (id: string, x: number, v = 0.001, patch: Partial<SpillState> = {}): SpillState => ({
  id, position: [x, -1.175, 0], volume_ml: v, mass_g: v, radius: calculateSpillRadius(v),
  contents: water(v), substances: ['H2O'], color: '#fff', isHazard: false, timestamp: 1, ...patch });
const arrive = (spills: Record<string, SpillState>, x: number, v = 0.001) =>
  mergeWorkbenchSpill(spills, [x, -1.175, 0], v, ['H2O'], '#fff', 'arrival', v, water(v));
const total = (spills: Record<string, SpillState>) => Object.values(spills).reduce((s, v) => ({
  mass: s.mass + v.mass_g, volume: s.volume + v.volume_ml,
  moles: s.moles + (v.contents ?? []).reduce((n, c) => n + c.moles, 0) }), { mass: 0, volume: 0, moles: 0 });

describe('Contact-based quasistatic spill merge', () => {
  it('keeps tiny separated droplets apart even inside the former 0.35-scene-unit capture range', () => {
    const a = spill('a', 0), result = arrive({ a }, 0.2);
    expect(Object.keys(result)).toHaveLength(2); expect(result.a).toBe(a);
    expect(total(result).volume).toBeCloseTo(0.002, 14);
  });
  it('uses both radii so a large arriving footprint can touch a small old droplet beyond the old threshold', () => {
    const a = spill('a', 0), result = arrive({ a }, 0.9, 10);
    expect(Object.keys(result)).toEqual(['a']); expect(result.a.volume_ml).toBeCloseTo(10.001, 12);
    expect(result.a.position[0]).toBeCloseTo(0.9 * 10 / 10.001, 12);
  });
  it('does not trust an inflated legacy radius to join disconnected drops', () => {
    const a = spill('a', 0, 0.001, { radius: 100 });
    expect(Object.keys(arrive({ a }, 1))).toHaveLength(2);
  });
  it('invalidates the derived contact footprint when the same object receives a different volume', () => {
    const a = spill('a', 0);
    arrive({ a }, 2);
    a.volume_ml = 10; a.mass_g = 10; a.contents = water(10);
    expect(Object.keys(arrive({ a }, 0.9))).toEqual(['a']);
  });
  it('merges at physical tangency but preserves a measurable gap', () => {
    const a = spill('a', 0), contact = 2 * a.radius;
    expect(Object.keys(arrive({ a }, contact))).toHaveLength(1);
    expect(Object.keys(arrive({ a }, contact + 1e-6))).toHaveLength(2);
  });
  it('takes both neighbours bridged by one arrival, preserves an unrelated droplet and all extensive quantities', () => {
    const a = spill('a', 0), b = spill('b', 0.1), c = spill('c', 0.3);
    const initial = { a, b, c }, before = structuredClone(initial), result = arrive(initial, 0.05);
    expect(initial).toEqual(before); expect(Object.keys(result).sort()).toEqual(['a', 'c']); expect(result.c).toBe(c);
    expect(result.a.volume_ml).toBeCloseTo(0.003, 14); expect(result.a.position[0]).toBeCloseTo(0.05, 14);
    expect(result.a.radius).toBeCloseTo(calculateSpillRadius(0.003), 12);
    expect(total(result).mass).toBeCloseTo(total(initial).mass + 0.001, 14);
    expect(total(result).moles).toBeCloseTo(total(initial).moles + 0.001 / 18.015, 14);
    expect(result.a.contents![0].volume_ml).toBeCloseTo(0.003, 14);
    expect(result.a.contents![0].initialMass_g).toBeCloseTo(0.003, 14);
  });
  it('walks the original connected contact component instead of stopping at the first matching record', () => {
    const initial = { a: spill('a', 0), b: spill('b', 0.05), c: spill('c', 0.1) };
    const result = arrive(initial, -0.05);
    expect(Object.keys(result)).toEqual(['a']); expect(result.a.volume_ml).toBeCloseTo(0.004, 14);
    expect(result.a.position[0]).toBeCloseTo(0.025, 14);
  });
  it('is independent of record insertion order and preserves the first moment for equal-density samples', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100);
    const a = spill('a', 0), b = spill('b', 0.1), first = arrive({ a, b }, 0.05), reversed = arrive({ b, a }, 0.05);
    expect(first).toEqual(reversed);
    const beforeMoment = a.position[0] * a.volume_ml + b.position[0] * b.volume_ml + 0.05 * 0.001;
    expect(first.a.position[0] * first.a.volume_ml).toBeCloseTo(beforeMoment, 15);
  });
  it('preserves the mass first moment when equal-volume samples have different densities', () => {
    const a = spill('a', 0, 1);
    const result = mergeWorkbenchSpill({ a }, [0.1, -1.175, 0.2], 1, ['H2O', 'NaCl'], '#fff', undefined, 2,
      [{ formula: 'H2O', phase: 'l', mass_g: 1, moles: 1 / 18.015, volume_ml: 1 },
        { formula: 'NaCl', phase: 'aq', mass_g: 1, moles: 1 / 58.44 }]);
    expect(Object.keys(result)).toEqual(['a']);
    expect(result.a.position[0]).toBeCloseTo(0.2 / 3, 12);
    expect(result.a.position[2]).toBeCloseTo(0.4 / 3, 12);
    expect(result.a.mass_g * result.a.position[0]).toBeCloseTo(2 * 0.1, 12);
    expect(result.a.volume_ml).toBe(2);
  });
  it('keeps a dry solid deposit separate from a wet footprint even at the same location', () => {
    const dry = spill('dry', 0, 0, { mass_g: 1, contents: [{ formula: 'Cu', phase: 's', mass_g: 1, moles: 1 / 63.546 }], substances: ['Cu'] });
    const result = arrive({ dry }, 0);
    expect(Object.keys(result)).toHaveLength(2); expect(result.dry).toBe(dry);
    expect(result.dry.radius).toBe(0); expect(total(result).mass).toBeCloseTo(1.001, 12);
  });
  it('merges coincident dry point inventories without giving nearby powder a wet capture disk', () => {
    const dry = spill('dry', 0, 0, { mass_g: 1, contents: [{ formula: 'Cu', phase: 's', mass_g: 1, moles: 1 / 63.546 }], substances: ['Cu'] });
    const add = (x: number) => mergeWorkbenchSpill({ dry }, [x, 0, 0], 0, ['Cu'], '#fff', undefined, 1,
      [{ formula: 'Cu', phase: 's', mass_g: 1, moles: 1 / 63.546 }]);
    expect(Object.keys(add(0))).toEqual(['dry']); expect(add(0).dry.mass_g).toBe(2);
    expect(Object.keys(add(0.01))).toHaveLength(2);
  });
  it('does not homogenize explicitly organic and aqueous layers or use an unknown bridge to bypass that distinction', () => {
    const a = spill('a', 0), oil = spill('oil', 0.1, 0.001, { substances: ['C6H14'], contents: [
      { formula: 'C6H14', phase: 'l', liquidLayer: 'organic', mass_g: 0.00066, moles: 0.00066 / 86.178 }] });
    const direct = mergeWorkbenchSpill({ a }, [0, 0, 0], oil.volume_ml, oil.substances, oil.color, undefined, oil.mass_g, oil.contents);
    expect(Object.keys(direct)).toHaveLength(2);
    const result = mergeWorkbenchSpill({ a, oil }, [0.05, 0, 0], 0.001, ['unknown'], '#fff', undefined, 0.001);
    expect(Object.keys(result).sort()).toEqual(['a', 'oil']); expect(result.oil).toBe(oil);
  });
  it('retains hazard provenance and recomputes an aqueous concentration after finite dilution', () => {
    const a = spill('a', 0, 1, { isHazard: true, substances: ['H2O', 'NaOH'], mass_g: 1.04,
      contents: [...water(1), { formula: 'NaOH', phase: 'aq', mass_g: 0.04, moles: 0.001, concentration_M: 1 }] });
    const result = arrive({ a }, 0, 1);
    expect(result.a.isHazard).toBe(true); expect(result.a.mass_g).toBeCloseTo(2.04, 12);
    expect(result.a.contents!.find(c => c.formula === 'NaOH')!.concentration_M).toBeCloseTo(0.5, 12);
  });
});
