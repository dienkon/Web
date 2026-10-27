import { describe, expect, it } from 'vitest';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library';
import { applyProgramToLedger, computeMolarMass, calculateBeerLambertColor } from '../src/engine/ledger';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import type { VesselState } from '../src/types/chemistry';
describe('Brominated organic precipitates and residual bromine', () => {
  it.each(['C6H2Br3OH', 'C6H2Br3NH2'])('%s consumes finite bromine while excess bromine keeps its own color', product => {
    const program = ALL_HANDCRAFTED_PROGRAMS.find(p => p.visual.after.precipitate?.substance === product)!;
    const run = (excess: number) => {
      const contents = program.chemistry.species.filter(c => c.role === 'reactant').map(c => {
        const n = c.coeff * 0.001 * (c.formula === 'Br2' ? excess : 1);
        return { formula: c.formula, phase: c.phase, moles: n, mass_g: n * computeMolarMass(c.formula) };
      });
      contents.push({ formula: 'H2O', phase: 'l', moles: 5, mass_g: 90.075 });
      const initial = { id: 'organic', contents, temperature_c: 25, volume_ml: 100,
        capacity_ml: 250, ph: 7, mass_g: contents.reduce((s, c) => s + c.mass_g, 0) } as VesselState;
      const end = applyProgramToLedger(program, initial, 1);
      expect(end.contents!.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(initial.mass_g, 8);
      expect(end.contents!.find(c => c.formula === product)!.moles).toBeCloseTo(0.001, 12);
      return end;
    };
    const exact = run(1), excess = run(2);
    expect(exact.contents!.find(c => c.formula === 'Br2')?.moles ?? 0).toBe(0);
    expect(excess.contents!.find(c => c.formula === 'Br2')!.moles).toBeCloseTo(0.003, 12);
    expect(excess.liquidColor).not.toBe(exact.liquidColor);
    expect(getPrecipitateProfile(product).modelBasis).toBeUndefined();
  });
  it('ignores solid bromine and stale concentration caches when computing liquid color', () => {
    const item = { formula: 'Br2', phase: 'aq', moles: 0.001, mass_g: 0.16, concentration_M: 99 };
    expect(calculateBeerLambertColor([item], 100)).toBe(calculateBeerLambertColor([{ ...item, concentration_M: 0 }], 100));
    expect(calculateBeerLambertColor([{ ...item, phase: 's' }], 100, '#f8fafc')).toBe('#f8fafc');
  });
});
