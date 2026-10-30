import { expect, it } from 'vitest';
import { mergeWorkbenchSpillBatch, mergeWorkbenchSpill } from '../src/engine/spillInventory';
import type { LiquidAliquot } from '../src/handling/aliquot';

const sample = (volume_ml: number): LiquidAliquot => ({ volume_ml, mass_g: volume_ml, temperature_c: 25,
  substances: ['H2O', 'NaCl'], color: '#70b9df', contents: [
    { formula: 'H2O', phase: 'l', mass_g: volume_ml * 0.98, moles: volume_ml * 0.98 / 18.015 },
    { formula: 'NaCl', phase: 'aq', mass_g: volume_ml * 0.02, moles: volume_ml * 0.02 / 58.44, initialMoles: volume_ml * 0.02 / 58.44 }] });
const sites = Array.from({ length: 24 }, (_, i): [number, number, number] => [5 + Math.cos(i * Math.PI / 12), -1.175, -3 + Math.sin(i * Math.PI / 12)]);
const physical = (pools: ReturnType<typeof mergeWorkbenchSpillBatch>) => Object.values(pools).map(p => ({
  position: p.position.map(v => +v.toFixed(10)), volume: +p.volume_ml.toFixed(10), mass: +p.mass_g.toFixed(10),
})).sort((a, b) => a.position[0] - b.position[0] || a.position[2] - b.position[2]);

it.each([0.01, 1, 20])('deposits %s mL around the ring independently of input site order and preserves first moments/species', volume => {
  const before = sample(volume), forward = mergeWorkbenchSpillBatch({}, sites, before);
  const reverse = mergeWorkbenchSpillBatch({}, [...sites].reverse(), before);
  const shuffled = mergeWorkbenchSpillBatch({}, [...sites.filter((_, i) => i % 2), ...sites.filter((_, i) => !(i % 2))], before);
  expect(physical(forward)).toEqual(physical(reverse)); expect(physical(forward)).toEqual(physical(shuffled));
  const values = Object.values(forward);
  expect(values.reduce((sum, p) => sum + p.volume_ml, 0)).toBeCloseTo(volume, 12);
  expect(values.reduce((sum, p) => sum + p.mass_g, 0)).toBeCloseTo(volume, 12);
  expect(values.reduce((sum, p) => sum + p.mass_g * p.position[0], 0)).toBeCloseTo(volume * 5, 10);
  expect(values.reduce((sum, p) => sum + p.mass_g * p.position[2], 0)).toBeCloseTo(volume * -3, 10);
  for (const item of before.contents) {
    const deposited = values.flatMap(p => p.contents ?? []).filter(c => c.formula === item.formula);
    expect(deposited.reduce((sum, c) => sum + c.moles, 0)).toBeCloseTo(item.moles, 12);
    expect(deposited.reduce((sum, c) => sum + c.mass_g, 0)).toBeCloseTo(item.mass_g, 12);
    if (item.initialMoles !== undefined) expect(deposited.reduce((sum, c) => sum + (c.initialMoles ?? 0), 0)).toBeCloseTo(item.initialMoles, 12);
  }
});

it('leaves distant pools and an immiscible layer intact, while joining compatible old water by actual contact', () => {
  const water = sample(1);
  let old = mergeWorkbenchSpill({}, [5, -1.175, -3], 1, ['H2O'], '#fff', 'water', 1, water.contents);
  old = mergeWorkbenchSpill(old, [100, -1.175, 100], 1, ['H2O'], '#fff', 'water', 1, water.contents);
  old = mergeWorkbenchSpill(old, [5, -1.175, -3], 1, ['Hexane'], '#fff', 'oil', 0.66,
    [{ formula: 'C6H14', phase: 'l', mass_g: 0.66, moles: 0.66 / 86.178, liquidLayer: 'organic' }]);
  const original = Object.values(old), far = original.find(p => p.position[0] === 100)!, oil = original.find(p => p.substances.includes('Hexane'))!;
  const result = mergeWorkbenchSpillBatch(old, sites, sample(20));
  expect(result[far.id]).toBe(far); expect(result[oil.id]).toBe(oil);
  expect(Object.values(result).reduce((sum, p) => sum + p.mass_g, 0)).toBeCloseTo(22.66, 10);
  const joined = Object.values(result).filter(p => p !== far && p !== oil);
  expect(joined).toHaveLength(1); expect(joined[0].volume_ml).toBeCloseTo(21, 10);
});
