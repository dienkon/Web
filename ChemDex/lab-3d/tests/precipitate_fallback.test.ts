import { describe, expect, it } from 'vitest';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library';
import { sameMolecularFormula } from '../src/science/speciesIdentity';
describe('Unsupported precipitates preserve identity', () => {
  it('does not turn unsupported colored solids into white barium sulfate', () => {
    for (const [formula, color] of [['CrPO4', '#228833'], ['NiS', '#181818']]) {
      const p = getPrecipitateProfile(formula, undefined, color);
      expect(p.id).toBe(formula);
      expect(p.color).toBe(color);
      expect(p.modelBasis).toBe('generic_fallback');
    }
  });
  it('keeps identity for every declared precipitate without calling fallback calibrated', () => {
    for (const program of ALL_HANDCRAFTED_PROGRAMS) {
      const p = program.visual.after.precipitate;
      if (p) expect(sameMolecularFormula(getPrecipitateProfile(p.substance).id, p.substance)).toBe(true);
    }
  });
  it('does not match a molecular substring as an entire species', () => {
    expect(getPrecipitateProfile('CuO2').id).toBe('CuO2');
    expect(getPrecipitateProfile('CuO2').modelBasis).toBe('generic_fallback');
    expect(getPrecipitateProfile('CuO').modelBasis).toBeUndefined();
  });
});
