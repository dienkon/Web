import { describe, expect, it } from 'vitest';
import { copperHydroxideExtent, copperHydroxideKsp, copperSulfateAqueousState } from '../src/science/copperHydroxidePrecipitation';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { planStudioProgram } from '../src/engine/studioProgram';
import { getProgramById } from '../src/vfx/programs/library';
import type { VesselState } from '../src/types/chemistry';
const sample = (n: number) => {
  const contents = [{ formula: 'H2O', phase: 'l', moles: 5, mass_g: 90.075 },
    ...[['CuSO4', n], ['NaOH', 2 * n]].map(([f, m]) => ({ formula: String(f), phase: 'aq',
      moles: Number(m), mass_g: Number(m) * computeMolarMass(String(f)) }))];
  return { id: 'cu-test', contents, substances: contents.map(c => c.formula), volume_ml: 100,
    capacity_ml: 250, temperature_c: 25, ph: 7, mass_g: contents.reduce((s, c) => s + c.mass_g, 0) } as VesselState;
};
describe('Copper hydroxide finite supersaturation', () => {
  it.each([1e-9, 1e-4])('limits both reaction paths for %s mol copper', n => {
    const v = sample(n), program = getProgramById('cuso4_naoh')!;
    const expected = copperHydroxideExtent(v.contents, 100, 25)!;
    const native = executeMultiStepReactions(v.contents, v.substances, 100, 25, false, 'vi', { preserveQuantities: true });
    const ledger = applyProgramToLedger(program, v, 1);
    for (const contents of [native.updatedContents, ledger.contents!]) {
      const amount = contents.filter(c => c.formula === 'Cu(OH)2').reduce((s, c) => s + c.moles, 0);
      expect(amount).toBeGreaterThanOrEqual(expected - 1e-12);
      expect(amount).toBeLessThanOrEqual(n);
      expect(contents.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(v.mass_g, 8);
    }
    expect(ledger.contents!.filter(c => c.formula === 'Cu(OH)2').reduce((s, c) => s + c.moles, 0)).toBeCloseTo(expected, 12);
    if (expected > 0) {
      const finalState = copperSulfateAqueousState(native.updatedContents, 100, native.finalTemperature_c)!;
      expect(finalState.freeCopper_M * finalState.hydroxide_M ** 2 / copperHydroxideKsp(native.finalTemperature_c)!).toBeCloseTo(1, 4);
    }
    if (n === 1e-9) {
      expect(expected).toBe(0);
      expect(planStudioProgram(program, v, 'vi').kinetics).toBeNull();
    } else {
      const remaining = sample(n - expected).contents;
      remaining.push({ formula: 'Na2SO4', phase: 'aq', moles: expected, mass_g: expected * 142.04 });
      const state = copperSulfateAqueousState(remaining, 100, 25)!;
      expect(Math.abs(state.chargeResidual_M)).toBeLessThan(1e-12);
      expect(state.freeCopper_M * state.hydroxide_M ** 2 / copperHydroxideKsp(25)!).toBeCloseTo(1, 6);
    }
  });
  it('accounts for copper hydrolysis instead of treating all dissolved copper as free Cu2+', () => {
    const v = sample(1e-4);
    const copperOnly = v.contents.filter(c => c.formula !== 'NaOH');
    const state = copperSulfateAqueousState(copperOnly, 100, 25)!;
    expect(state.ph).toBeLessThan(7);
    expect(state.freeCopper_M).toBeLessThan(0.001);
    expect(state.copperSulfatePair_M).toBeGreaterThan(0);
    expect(state.freeCopper_M + state.hydrolyzedCopper_M + state.copperSulfatePair_M).toBeCloseTo(0.001, 12);
    expect(state.freeSulfate_M + state.bisulfate_M + state.copperSulfatePair_M).toBeCloseTo(0.001, 12);
    expect(state.copperSulfatePair_M / (state.freeCopper_M * state.freeSulfate_M)).toBeCloseTo(10 ** 2.31, 9);
    expect(Math.abs(state.chargeResidual_M)).toBeLessThan(1e-12);
  });
  it('does not apply the simple sulfate model to ammonia or acid mixtures', () => {
    const v = sample(1e-4);
    for (const formula of ['NH3', 'HCl']) expect(copperHydroxideExtent([...v.contents,
      { formula, phase: 'aq', moles: 0.001, mass_g: 0.1 }], 100, 25)).toBeNull();
    expect(Math.log10(copperHydroxideKsp(25)!)).toBeCloseTo(-19.36, 10);
  });
  it.each([0, 25, 60, 90])('preserves both analytical totals across base additions at %s C', temperature => {
    for (const baseRatio of [0, 1, 2, 4]) {
      const v = sample(1e-4);
      const base = v.contents.find(c => c.formula === 'NaOH')!;
      base.moles = baseRatio * 1e-4;
      base.mass_g = base.moles * computeMolarMass('NaOH');
      v.contents.push({ formula: 'Na2SO4', phase: 'aq', moles: 5e-5,
        mass_g: 5e-5 * computeMolarMass('Na2SO4') });
      const state = copperSulfateAqueousState(v.contents, 100, temperature)!;
      expect(state).not.toBeNull();
      expect(Number.isFinite(state.ph)).toBe(true);
      for (const amount of [state.freeCopper_M, state.hydrolyzedCopper_M,
        state.freeSulfate_M, state.bisulfate_M, state.copperSulfatePair_M]) {
        expect(Number.isFinite(amount)).toBe(true);
        expect(amount).toBeGreaterThanOrEqual(0);
      }
      expect(state.freeCopper_M + state.hydrolyzedCopper_M + state.copperSulfatePair_M).toBeCloseTo(0.001, 12);
      expect(state.freeSulfate_M + state.bisulfate_M + state.copperSulfatePair_M).toBeCloseTo(0.0015, 12);
      expect(Math.abs(state.chargeResidual_M)).toBeLessThan(1e-11);
      const beta = 10 ** 2.31 * Math.exp(1.22 * 4184 / 8.314462618
        * (1 / 298.15 - 1 / (temperature + 273.15)));
      expect(state.copperSulfatePair_M / (state.freeCopper_M * state.freeSulfate_M) / beta).toBeCloseTo(1, 10);
    }
  });
});
