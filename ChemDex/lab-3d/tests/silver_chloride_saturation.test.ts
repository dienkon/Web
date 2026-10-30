import { describe, expect, it } from 'vitest';
import { silverChlorideExtent, silverChlorideKsp } from '../src/science/silverChloridePrecipitation';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { resolveMixture } from '../src/engine/resolveMixture';
import { getProgramById } from '../src/vfx/programs/library';
import type { VesselState } from '../src/types/chemistry';
const sample = (n: number) => {
  const contents = [{ formula: 'H2O', phase: 'l', moles: 5, mass_g: 90.075 },
    ...['AgNO3', 'NaCl'].map(formula => ({ formula, phase: 'aq', moles: n, mass_g: n * computeMolarMass(formula) }))];
  return { id: 'ag-test', contents, substances: contents.map(c => c.formula), volume_ml: 100,
    capacity_ml: 250, temperature_c: 25, ph: 7, mass_g: contents.reduce((s, c) => s + c.mass_g, 0) } as VesselState;
};
describe('Silver chloride supersaturation', () => {
  it('does not create a precipitate or animation below saturation', async () => {
    const v = sample(1e-7);
    expect(silverChlorideExtent(v.contents, 100, 25)).toBe(0);
    expect((await resolveMixture(v, 'vi', false)).kinetics).toBeNull();
  });
  it.each([1e-7, 1e-4])('limits both ledgers to the same finite amount (%s mol)', n => {
    const v = sample(n), expected = silverChlorideExtent(v.contents, 100, 25)!;
    const ledger = applyProgramToLedger(getProgramById('agno3_nacl')!, v, 1);
    const native = executeMultiStepReactions(v.contents, v.substances, 100, 25, false, 'vi', { preserveQuantities: true });
    for (const contents of [ledger.contents!, native.updatedContents]) {
      const solid = contents.filter(c => c.formula === 'AgCl' && c.phase === 's').reduce((s, c) => s + c.moles, 0);
      expect(solid).toBeCloseTo(expected, 12);
      expect(contents.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(v.mass_g, 9);
    }
    if (expected > 0) expect((n - expected) ** 2 / 0.01 / silverChlorideKsp(25)!).toBeCloseTo(1, 9);
  });
  it('responds to dilution, temperature and common chloride, and refuses ligands', () => {
    const v = sample(1e-6);
    expect(silverChlorideExtent(v.contents, 100, 25)).toBe(0);
    expect(silverChlorideExtent(v.contents, 10, 25)).toBeGreaterThan(0);
    expect(silverChlorideExtent([...v.contents, { formula: 'KCl', phase: 'aq', moles: 1e-4, mass_g: 0.007455 }], 100, 25)).toBeGreaterThan(0);
    expect(silverChlorideKsp(60)!).toBeGreaterThan(silverChlorideKsp(25)!);
    expect(silverChlorideExtent([...v.contents, { formula: 'NH3', phase: 'aq', moles: 0.01, mass_g: 0.17 }], 100, 25)).toBeNull();
  });
});
