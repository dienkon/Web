import { describe, expect, it } from 'vitest';
import {
  balanceChemicalEquation,
  calculateStoichiometry,
} from '../core/equationBalancer';

describe('Exact Rational Chemical Equation Balancer & Stoichiometry', () => {
  it('balances redox and combustion equations with exact lowest integers', () => {
    const kmno4 = balanceChemicalEquation('KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O');
    expect(kmno4.ok).toBe(true);
    if (kmno4.ok) {
      expect(kmno4.reactants.map((r) => r.coefficient)).toEqual([2, 16]);
      expect(kmno4.products.map((p) => p.coefficient)).toEqual([2, 2, 5, 8]);
    }

    const pyrite = balanceChemicalEquation('FeS2 + O2 → Fe2O3 + SO2');
    expect(pyrite.ok).toBe(true);
    if (pyrite.ok) {
      expect(pyrite.reactants.map((r) => r.coefficient)).toEqual([4, 11]);
      expect(pyrite.products.map((p) => p.coefficient)).toEqual([2, 8]);
    }

    const cuNo = balanceChemicalEquation('Cu + HNO3 = Cu(NO3)2 + NO + H2O');
    expect(cuNo.ok).toBe(true);
    if (cuNo.ok) {
      expect(cuNo.reactants.map((r) => r.coefficient)).toEqual([3, 8]);
      expect(cuNo.products.map((p) => p.coefficient)).toEqual([3, 2, 4]);
    }

    const disprop = balanceChemicalEquation('Cl2+KOH->KCl+KClO3+H2O');
    expect(disprop.ok).toBe(true);
    if (disprop.ok) {
      expect(disprop.reactants.map((r) => r.coefficient)).toEqual([3, 6]);
      expect(disprop.products.map((p) => p.coefficient)).toEqual([5, 1, 3]);
    }
  });

  it('balances net ionic equations conserving both atoms and electrical charge', () => {
    const permanganateIron = balanceChemicalEquation(
      'MnO4- + Fe2+ + H+ -> Mn2+ + Fe3+ + H2O'
    );
    expect(permanganateIron.ok).toBe(true);
    if (permanganateIron.ok) {
      expect(permanganateIron.isIonic).toBe(true);
      expect(permanganateIron.reactants.map((r) => r.coefficient)).toEqual([1, 5, 8]);
      expect(permanganateIron.products.map((p) => p.coefficient)).toEqual([1, 5, 4]);
    }

    const dichromateIodide = balanceChemicalEquation(
      'Cr2O7^2- + I- + H+ -> Cr3+ + I2 + H2O'
    );
    expect(dichromateIodide.ok).toBe(true);
    if (dichromateIodide.ok) {
      expect(dichromateIodide.reactants.map((r) => r.coefficient)).toEqual([1, 6, 14]);
      expect(dichromateIodide.products.map((p) => p.coefficient)).toEqual([2, 3, 7]);
    }
  });

  it('handles hydrates, existing coefficients, and phase tags cleanly', () => {
    const res = balanceChemicalEquation(
      '3 CuSO4·5H2O(s) + 9 NaOH(aq) -> 1 Cu(OH)2(s) + 1 Na2SO4(aq) + H2O(l)'
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.reactants.map((r) => r.coefficient)).toEqual([1, 2]);
      expect(res.products.map((p) => p.coefficient)).toEqual([1, 1, 5]);
    }
  });

  it('rejects malformed, contradictory, or underdetermined equations cleanly', () => {
    expect(balanceChemicalEquation('H2 + O2 -> H2O + C').ok).toBe(false);
    expect(balanceChemicalEquation('').ok).toBe(false);
    expect(
      balanceChemicalEquation(
        'KMnO4 + H2O2 + H2SO4 -> K2SO4 + MnSO4 + O2 + H2O'
      ).ok
    ).toBe(false);
  });

  it('computes limiting reagent, excess remainder, theoretical yield, and gas volume', () => {
    const eq = balanceChemicalEquation('Zn(s) + HCl(aq) -> ZnCl2(aq) + H2(g)');
    expect(eq.ok).toBe(true);
    if (!eq.ok) return;

    // 6.538 g Zn (~0.1 mol) + 100 mL of 1.0 M HCl (0.1 mol) -> HCl limits (needs 0.2 mol HCl for 0.1 mol Zn)
    const stoich = calculateStoichiometry(eq, [
      { mode: 'mass_g', mass_g: 6.538 },
      { mode: 'solution', volume_ml: 100, molarity_M: 1.0 },
    ]);

    expect(stoich.ok).toBe(true);
    expect(stoich.extent_mol).toBeCloseTo(0.05, 3);
    expect(stoich.limitingFormulas).toContain('HCl(aq)');
    expect(stoich.reactants[0].isLimiting).toBe(false);
    expect(stoich.reactants[1].isLimiting).toBe(true);
    expect(stoich.reactants[0].remainingMoles).toBeCloseTo(0.05, 3);

    const h2 = stoich.products.find((p) => p.formula === 'H2')!;
    expect(h2.isGas).toBe(true);
    expect(h2.theoreticalMoles).toBeCloseTo(0.05, 3);
    expect(h2.gasVolumeSTP_L).toBeCloseTo(0.05 * 22.414, 3);
    expect(h2.gasVolume25C_L).toBeCloseTo(0.05 * 24.789, 3);
  });
});
