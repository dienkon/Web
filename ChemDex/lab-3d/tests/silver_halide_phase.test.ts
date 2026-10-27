import { describe, expect, it } from 'vitest';
import { partitionSilverHalide } from '../src/engine/silverChloridePhase';
import { silverChlorideKsp } from '../src/science/silverChloridePrecipitation';
import { supernatantColor } from '../src/science/supernatantAppearance';
import type { VesselState } from '../src/types/chemistry';
const finish = (v: VesselState) => {
  for (let i = 0; i < 1000; i++) v = { ...v, ...partitionSilverHalide(v, 0.1) };
  return v;
};
describe('Distinct reversible silver halide pools', () => {
  it.each([['Br', 187.77], ['I', 234.77]] as const)('Ag%s dissolves/recrystallizes with its own solubility and conserves mass', (halide, mm) => {
    const sample = (n = 1e-4) => ({ id: 'halide-phase', temperature_c: 25, volume_ml: 100,
      capacity_ml: 250, mass_g: 100 + n * mm, contents: [
        { formula: 'H2O', phase: 'l', moles: 100 / 18.015, mass_g: 100 },
        { formula: `Ag${halide}`, phase: 's', moles: n, mass_g: n * mm }] } as VesselState);
    const dissolved = (v: VesselState) => v.contents.filter(c => c.phase === 'aq').reduce((s, c) => s + c.moles, 0);
    const cold = finish(sample());
    expect(dissolved(cold)).toBeCloseTo(Math.sqrt(silverChlorideKsp(cold.temperature_c, halide)!) * 0.1, 12);
    expect(cold.precipitateSubstance).toBe(`Ag${halide}`);
    expect(supernatantColor(cold.contents, 100)).toBe('#f8fafc');
    const hot = finish({ ...cold, temperature_c: 60 });
    expect(dissolved(hot)).toBeGreaterThan(dissolved(cold));
    const back = finish({ ...JSON.parse(JSON.stringify(hot)), temperature_c: 25 });
    expect(dissolved(back)).toBeCloseTo(Math.sqrt(silverChlorideKsp(back.temperature_c, halide)!) * 0.1, 12);
    expect(back.contents.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(sample().mass_g, 12);
    expect(finish(sample(1e-11)).precipitateAmount_g).toBe(0);
    const filter = sample(); filter.contents[1].location = 'filter';
    expect(partitionSilverHalide(filter, 0.1)).toBeNull();
  });
  it('does not pretend a mixed-halide sample is a single-solid equilibrium', () => {
    const v = { id: 'mixed', contents: [{ formula: 'AgBr', phase: 's', moles: 0.001, mass_g: 0.18777 },
      { formula: 'AgI', phase: 's', moles: 0.001, mass_g: 0.23477 },
      { formula: 'H2O', phase: 'l', moles: 5, mass_g: 90 }], volume_ml: 100, temperature_c: 25 } as VesselState;
    expect(partitionSilverHalide(v, 0.1)).toBeNull();
  });
});
