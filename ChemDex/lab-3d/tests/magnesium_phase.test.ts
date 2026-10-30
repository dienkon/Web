import { describe, expect, it } from 'vitest';
import { partitionMagnesiumHydroxide } from '../src/engine/magnesiumHydroxidePhase';
import { bruciteKsp } from '../src/science/magnesiumHydroxidePrecipitation';
import { projectAqueousSolution } from '../src/engine/aqueousProjection';
import { supernatantColor } from '../src/science/supernatantAppearance';
import type { VesselState } from '../src/types/chemistry';
const sample = (n = 1e-4) => ({ id: 'mg-phase', temperature_c: 25, volume_ml: 100,
  contents: [{ formula: 'H2O', phase: 'l', moles: 5, mass_g: 90.075 },
    { formula: 'Mg(OH)2', phase: 's', moles: n, mass_g: n * 58.319 }] } as VesselState);
const finish = (v: VesselState) => {
  for (let i = 0; i < 1000; i++) v = { ...v, ...partitionMagnesiumHydroxide(v, 0.1) };
  return v;
};
const dissolved = (v: VesselState) => v.contents.filter(c => c.formula === 'Mg(OH)2' && c.phase === 'aq').reduce((s, c) => s + c.moles, 0);
describe('Reversible magnesium hydroxide pool', () => {
  it('reaches saturation with pH consistent with dissolved hydroxide and conserved mass', () => {
    const v = finish(sample()), mg = dissolved(v) / 0.1, oh = 10 ** (v.ph - 14);
    expect(mg * oh * oh / bruciteKsp(25)!).toBeCloseTo(1, 6);
    expect(v.ph).toBeGreaterThan(10);
    expect(projectAqueousSolution(v)).toBeNull();
    expect(partitionMagnesiumHydroxide(v, 0.1)).toBeNull();
    expect(supernatantColor(v.contents, 100)).toBe('#f8fafc');
    expect(v.contents.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(90.075 + 1e-4 * 58.319, 12);
  });
  it('responds to dilution and common ions and fully dissolves a small pool', () => {
    const pure = finish(sample());
    expect(dissolved(finish({ ...pure, volume_ml: 200 }))).toBeGreaterThan(dissolved(pure));
    for (const formula of ['NaOH', 'MgCl2']) {
      const v = sample(), salt = { formula, phase: 'aq' as const, moles: 0.001, mass_g: 0.1 };
      v.contents.push(salt);
      const end = finish(v);
      expect(dissolved(end)).toBeLessThan(dissolved(pure));
      expect(end.contents.find(c => c.formula === formula)).toEqual(salt);
    }
    expect(finish(sample(1e-8)).precipitateAmount_g).toBe(0);
  });
  it('does not relocate barium/filter/acid inventories into this pool', () => {
    const v = sample(); v.contents[1].location = 'filter';
    expect(partitionMagnesiumHydroxide(v, 0.1)).toBeNull();
    const acid = sample(); acid.contents.push({ formula: 'HCl', phase: 'aq', moles: 0.01, mass_g: 0.3646 });
    expect(partitionMagnesiumHydroxide(acid, 0.1)).toBeNull();
  });
});
