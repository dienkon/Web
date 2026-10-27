import { describe, expect, it } from 'vitest';
import { partitionSilverChloride } from '../src/engine/silverChloridePhase';
import { silverChlorideKsp } from '../src/science/silverChloridePrecipitation';
import { supernatantColor } from '../src/science/supernatantAppearance';
import type { VesselState } from '../src/types/chemistry';
const sample = (n = 1e-4) => ({ id: 'silver-phase', temperature_c: 25, volume_ml: 100,
  capacity_ml: 250, mass_g: 100 + n * 143.32, contents: [
    { formula: 'H2O', phase: 'l', moles: 100 / 18.015, mass_g: 100 },
    { formula: 'AgCl', phase: 's', moles: n, mass_g: n * 143.32 }] } as VesselState);
const finish = (v: VesselState) => {
  for (let i = 0; i < 1000; i++) v = { ...v, ...partitionSilverChloride(v, 0.1) };
  return v;
};
const dissolved = (v: VesselState) => v.contents.filter(c => c.formula === 'AgCl' && c.phase === 'aq').reduce((s, c) => s + c.moles, 0);
describe('Reversible finite silver chloride pool', () => {
  it('dissolves to saturation with finite heat absorption and preserves total mass', () => {
    const v = finish(sample());
    expect(dissolved(v)).toBeCloseTo(Math.sqrt(silverChlorideKsp(v.temperature_c)!) * 0.1, 12);
    expect(v.temperature_c).toBeLessThan(25);
    expect(v.contents.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(v.mass_g, 12);
    expect(partitionSilverChloride(v, 0.1)).toBeNull();
    expect(supernatantColor(v.contents, 100)).toBe('#f8fafc');
  });
  it('responds to dilution, heating/cooling and common chloride', () => {
    const cold = finish(sample());
    expect(dissolved(finish({ ...cold, volume_ml: 200 }))).toBeGreaterThan(dissolved(cold));
    const hot = finish({ ...cold, temperature_c: 60 });
    expect(dissolved(hot)).toBeGreaterThan(dissolved(cold));
    const back = finish({ ...JSON.parse(JSON.stringify(hot)), temperature_c: 25 });
    expect(dissolved(back)).toBeCloseTo(Math.sqrt(silverChlorideKsp(back.temperature_c)!) * 0.1, 12);
    const withSalt = sample();
    const salt = { formula: 'NaCl', phase: 'aq' as const, moles: 1e-3, mass_g: 0.05844 };
    withSalt.contents.push(salt);
    const end = finish(withSalt);
    expect(dissolved(end)).toBeLessThan(dissolved(cold));
    expect(end.contents.find(c => c.formula === 'NaCl')).toEqual(salt);
  });
  it('fully dissolves a tiny pool and does not relocate filter cake', () => {
    const tiny = finish(sample(1e-8));
    expect(tiny.precipitateAmount_g).toBe(0);
    expect(tiny.hasPrecipitate).toBe(false);
    const filter = sample(); filter.contents[1].location = 'filter';
    expect(partitionSilverChloride(filter, 0.1)).toBeNull();
  });
});
