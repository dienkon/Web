import { describe, expect, it } from 'vitest';
import { aluminumAqueousConstants, aluminumAqueousState, aluminumHydroxidePrecipitationExtent,
  aluminumHydroxideDissolutionExtent, aluminateConversionExtent, aluminumHydroxideBaseDissolutionEnthalpy_J_mol,
  aluminumHydroxidePrecipitationEnthalpy_J_mol, aluminumAluminateFormationEnthalpy_J_mol } from '../src/science/aluminumHydroxideEquilibrium';
import { computeMolarMass } from '../src/engine/ledger';
import type { SubstanceContent } from '../src/types/chemistry';

const row = (formula: string, moles: number, phase = 'aq'): SubstanceContent => ({ formula, moles, phase,
  mass_g: moles * computeMolarMass(formula) });
const sample = (ratio: number, sulfate = false, n = 1e-4) => [row('H2O', 5, 'l'),
  row(sulfate ? 'Al2(SO4)3' : 'AlCl3', sulfate ? n / 2 : n), row('NaOH', ratio * n)];
const qRatio = (contents: SubstanceContent[], temperature = 25) => {
  const state = aluminumAqueousState(contents, 100, temperature)!;
  return state.freeAluminum_M * state.hydroxide_M ** 3 / aluminumAqueousConstants(temperature)!.ksp;
};

describe('Amorphous aluminum hydroxide and dissolved aluminate', () => {
  it.each([0, 25, 60, 90])('conserves Al/S and charge across chloride/sulfate and base additions at %s C', temperature => {
    for (const sulfate of [false, true]) for (const ratio of [0, 2, 3, 4, 6]) {
      const state = aluminumAqueousState(sample(ratio, sulfate), 100, temperature)!;
      expect(state).not.toBeNull();
      expect(state.freeAluminum_M + state.hydrolyzedAluminum_M + state.sulfateComplexedAluminum_M).toBeCloseTo(0.001, 12);
      expect(state.freeSulfate_M + state.bisulfate_M + state.boundSulfate_M).toBeCloseTo(sulfate ? 0.0015 : 0, 12);
      expect(Math.abs(state.chargeResidual_M)).toBeLessThan(1e-11);
      for (const amount of [state.freeAluminum_M, state.aluminate_M, state.freeSulfate_M, state.sulfateComplexedAluminum_M]) {
        expect(Number.isFinite(amount)).toBe(true); expect(amount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it.each([false, true])('has a finite solubility endpoint and suppresses fictitious gel in strong excess base (sulfate=%s)', sulfate => {
    const route = sulfate ? 'sulfate' : 'chloride';
    expect(aluminumHydroxidePrecipitationExtent(sample(3, sulfate, 1e-12), 100, 25, route)).toBe(0);
    const x = aluminumHydroxidePrecipitationExtent(sample(3, sulfate), 100, 25, route)!;
    expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(1e-4);
    const remaining = [row('H2O', 5, 'l'), row(sulfate ? 'Al2(SO4)3' : 'AlCl3', (1e-4 - x) / (sulfate ? 2 : 1)),
      row('NaOH', 3e-4 - 3 * x), row(sulfate ? 'Na2SO4' : 'NaCl', (sulfate ? 1.5 : 3) * x), row('Al(OH)3', x, 's')];
    expect(qRatio(remaining)).toBeCloseTo(1, 6);
    expect(aluminumHydroxidePrecipitationExtent(remaining, 100, 25, route)).toBe(0);
    expect(aluminumHydroxidePrecipitationExtent(sample(6, sulfate), 100, 25, route)).toBe(0);
    const three = aluminumHydroxidePrecipitationExtent(sample(3, sulfate), 100, 25, route)!;
    const four = aluminumHydroxidePrecipitationExtent(sample(4, sulfate), 100, 25, route)!;
    expect(four).toBeLessThan(three * 0.02);
  });

  it('bounds gel dissolution by saturation rather than assuming one equivalent always clears it completely', () => {
    const contents = [row('H2O', 5, 'l'), row('Al(OH)3', 1e-4, 's'), row('NaOH', 1e-4)];
    const x = aluminumHydroxideDissolutionExtent(contents, 100, 25)!;
    expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(1e-4);
    const remaining = [row('H2O', 5, 'l'), row('Al(OH)3', 1e-4 - x, 's'), row('NaOH', 1e-4 - x), row('Na[Al(OH)4]', x)];
    expect(qRatio(remaining)).toBeCloseTo(1, 6);
    expect(aluminumHydroxideDissolutionExtent(remaining, 100, 25)).toBe(0);
    expect(aluminumHydroxideDissolutionExtent([row('H2O', 5, 'l'), row('Al(OH)3', 1e-4, 's'), row('NaOH', 2e-4)], 100, 25)).toBe(1e-4);
  });

  it.each([false, true])('records only additional aqueous aluminate without changing analytical equilibrium (sulfate=%s)', sulfate => {
    const contents = sample(6, sulfate), route = sulfate ? 'sulfate' : 'chloride';
    const before = aluminumAqueousState(contents, 100, 25)!;
    const x = aluminateConversionExtent(contents, 100, 25, route)!;
    expect(x).toBeGreaterThan(9e-5); expect(x).toBeLessThanOrEqual(1e-4);
    const converted = [row('H2O', 5, 'l'), row(sulfate ? 'Al2(SO4)3' : 'AlCl3', (1e-4 - x) / (sulfate ? 2 : 1)),
      row('NaOH', 6e-4 - 4 * x), row(sulfate ? 'Na2SO4' : 'NaCl', (sulfate ? 1.5 : 3) * x), row('Na[Al(OH)4]', x)];
    const after = aluminumAqueousState(converted, 100, 25)!;
    expect(after.ph).toBeCloseTo(before.ph, 10);
    expect(after.freeAluminum_M / before.freeAluminum_M).toBeCloseTo(1, 10);
    expect(aluminateConversionExtent(converted, 100, 25, route)!).toBeLessThan(1e-12);
  });

  it('uses the selected amorphous phase and a temperature-consistent Hess cycle', () => {
    expect(Math.log10(aluminumAqueousConstants(25)!.ksp)).toBeCloseTo(-31.2, 10);
    for (const temperature of [1, 25, 60, 89]) {
      const step = 0.001;
      const logKd = (t: number) => {
        const c = aluminumAqueousConstants(t)!;
        return Math.log(c.acidDissolution * c.hydrolysis[3] / c.waterKw);
      };
      const derivative = (logKd(temperature + step) - logKd(temperature - step)) / (2 * step);
      const expected = derivative * 8.314462618 * (temperature + 273.15) ** 2;
      const dissolution = aluminumHydroxideBaseDissolutionEnthalpy_J_mol(temperature)!;
      expect(dissolution / expected).toBeCloseTo(1, 6);
      expect(aluminumHydroxidePrecipitationEnthalpy_J_mol(temperature)! + dissolution)
        .toBeCloseTo(aluminumAluminateFormationEnthalpy_J_mol(temperature)!, 8);
    }
    expect(aluminumHydroxideBaseDissolutionEnthalpy_J_mol(25)!).toBeGreaterThan(0);
  });

  it('rejects acid, ammonia, other metals and non-bulk inventory', () => {
    for (const formula of ['HCl', 'NH3', 'CuSO4']) expect(aluminumAqueousState([...sample(3), row(formula, 0.001)], 100, 25)).toBeNull();
    expect(aluminumAqueousState(sample(3).map(c => ({ ...c, location: 'filter' as const })), 100, 25)).toBeNull();
  });
});
