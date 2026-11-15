import { describe, expect, it } from 'vitest';
import { liquidDosePlan, liquidDropAmount, volumeDropRadius_scene } from '../src/handling/liquidDosePlan';

describe('finite liquid dose planning', () => {
  it('uses a Pasteur dropper for small liquid transfers and a bottle stream for larger amounts', () => {
    expect(liquidDosePlan(0.05)).toMatchObject({ mode: 'dropper', dropCount: 1 });
    expect(liquidDosePlan(2)).toMatchObject({ mode: 'dropper', dropCount: 40 });
    expect(liquidDosePlan(2.001)).toMatchObject({ mode: 'pour', dropCount: 0 });
  });

  it('divides a fractional last drop without adding unrequested volume', () => {
    const drops = Array.from({ length: liquidDosePlan(0.12).dropCount }, (_, index) => liquidDropAmount(0.12, index));
    expect(drops).toHaveLength(3);
    expect(drops.slice(0, 2)).toEqual([0.05, 0.05]);
    expect(drops[2]).toBeCloseTo(0.02, 14);
    expect(drops.reduce((sum, amount) => sum + amount, 0)).toBeCloseTo(0.12, 12);
    expect(liquidDropAmount(0.12, 3)).toBe(0);
  });

  it('renders drop size from volume while preserving the spherical volume ratio', () => {
    const small = volumeDropRadius_scene(0.025), large = volumeDropRadius_scene(0.2);
    expect(small).toBeGreaterThan(0);
    expect(large / small).toBeCloseTo(2, 12);
    expect(volumeDropRadius_scene(0)).toBe(0);
  });
});
