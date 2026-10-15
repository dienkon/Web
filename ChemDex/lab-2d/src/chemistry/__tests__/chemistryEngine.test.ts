import { describe, it, expect } from 'vitest';
import { parseChemicalFormula, computeMolarMass, formatFormulaUnicode } from '../core/formula';
import { countElementalAtoms, auditConservation, calculateExcessVolumeContraction_ml } from '../core/ledger';
import { calculateSolutionPh, getIndicatorColor } from '../equilibrium/acidBase';
import { runSimulationCycle } from '../reactions/engine';
import { SubstanceQuantity } from '../../types/chemistry';

describe('Scientific Chemistry Simulation Engine', () => {
  describe('Formula Parsing & Molar Masses', () => {
    it('accurately parses simple formulas and calculates molar masses', () => {
      expect(parseChemicalFormula('H2O')).toEqual({ H: 2, O: 1 });
      expect(computeMolarMass('H2O')).toBeCloseTo(18.015, 2);

      expect(parseChemicalFormula('NaCl')).toEqual({ Na: 1, Cl: 1 });
      expect(computeMolarMass('NaCl')).toBeCloseTo(58.44, 2);

      expect(parseChemicalFormula('H2SO4')).toEqual({ H: 2, S: 1, O: 4 });
      expect(computeMolarMass('H2SO4')).toBeCloseTo(98.072, 2);
    });

    it('accurately parses formulas with parentheses and brackets', () => {
      expect(parseChemicalFormula('Ca(OH)2')).toEqual({ Ca: 1, O: 2, H: 2 });
      expect(computeMolarMass('Ca(OH)2')).toBeCloseTo(74.09, 1);

      expect(parseChemicalFormula('Al2(SO4)3')).toEqual({ Al: 2, S: 3, O: 12 });
      expect(computeMolarMass('Al2(SO4)3')).toBeCloseTo(342.15, 1);
    });

    it('accurately parses hydrate salts', () => {
      expect(parseChemicalFormula('CuSO4.5H2O')).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
      expect(computeMolarMass('CuSO4.5H2O')).toBeCloseTo(249.68, 1);
    });

    it('formats chemical formulas with proper subscripts for presentation', () => {
      expect(formatFormulaUnicode('H2SO4')).toBe('H₂SO₄');
      expect(formatFormulaUnicode('Ca(OH)2')).toBe('Ca(OH)₂');
      expect(formatFormulaUnicode('CuSO4.5H2O')).toBe('CuSO₄·5H₂O');
    });
  });

  describe('Conservation of Mass & Elements (Ledger)', () => {
    it('verifies that atoms and mass are strictly conserved during neutralization', () => {
      const initial: SubstanceQuantity[] = [
        { formula: 'HCl', moles: 0.005, mass_g: 0.005 * computeMolarMass('HCl'), state: 'aq' },
        { formula: 'NaOH', moles: 0.005, mass_g: 0.005 * computeMolarMass('NaOH'), state: 'aq' },
      ];

      const sim = runSimulationCycle(initial, 100, 25.0);
      const audit = auditConservation(initial, sim.updatedContents);

      expect(audit.isConserved).toBe(true);
      expect(audit.massDiscrepancy_g).toBeLessThan(0.001);
      expect(Object.keys(audit.atomDiscrepancies).length).toBe(0);
    });

    it('verifies ethanol-water excess volume contraction', () => {
      const contraction = calculateExcessVolumeContraction_ml(50, 50, 'ethanol');
      expect(contraction).toBeLessThan(0);
      expect(contraction).toBeCloseTo(-3.5, 1);
    });
  });

  describe('Verification Case A: Equimolar Neutralization (HCl + NaOH)', () => {
    it('completely consumes reactants, forms NaCl, reaches pH 7 and releases heat', () => {
      // 50.0 mL of 0.100 M HCl = 0.00500 mol
      // 50.0 mL of 0.100 M NaOH = 0.00500 mol
      const initial: SubstanceQuantity[] = [
        { formula: 'HCl', moles: 0.005, mass_g: 0.005 * 36.46, state: 'aq', volume_ml: 50 },
        { formula: 'NaOH', moles: 0.005, mass_g: 0.005 * 39.997, state: 'aq', volume_ml: 50 },
      ];

      const result = runSimulationCycle(initial, 100.0, 25.0);

      expect(result.reactionsOccurred.length).toBe(1);
      expect(result.reactionsOccurred[0].extent_moles).toBeCloseTo(0.005, 4);

      // Both HCl and NaOH should be consumed
      const nacl = result.updatedContents.find(c => c.formula === 'NaCl');
      expect(nacl).toBeDefined();
      expect(nacl?.moles).toBeCloseTo(0.005, 4);

      // pH must be neutral 7.00
      expect(result.finalPh).toBeCloseTo(7.0, 1);

      // Temperature must rise due to exothermic neutralization (deltaH = -57.1 kJ/mol)
      expect(result.finalTemperature_c).toBeGreaterThan(25.0);
    });
  });

  describe('Verification Case B: Excess Acid (HCl + NaOH)', () => {
    it('correctly calculates limiting reagent NaOH, excess HCl, and acidic pH', () => {
      // 100.0 mL of 0.100 M HCl = 0.0100 mol
      // 50.0 mL of 0.100 M NaOH = 0.00500 mol
      const initial: SubstanceQuantity[] = [
        { formula: 'HCl', moles: 0.010, mass_g: 0.010 * 36.46, state: 'aq', volume_ml: 100 },
        { formula: 'NaOH', moles: 0.005, mass_g: 0.005 * 39.997, state: 'aq', volume_ml: 50 },
      ];

      const result = runSimulationCycle(initial, 150.0, 25.0);

      expect(result.reactionsOccurred[0].limitingReactant).toBe('NaOH');
      expect(result.reactionsOccurred[0].extent_moles).toBeCloseTo(0.005, 4);

      // Remaining HCl = 0.005 mol in 0.150 L => [H+] = 0.0333 M => pH ≈ 1.48
      expect(result.finalPh).toBeCloseTo(1.48, 1);
    });
  });

  describe('Verification Case C: Silver Chloride Precipitation', () => {
    it('produces insoluble white precipitate of AgCl with exact mass', () => {
      // 10.0 mL of 0.100 M AgNO3 = 0.00100 mol
      // 10.0 mL of 0.100 M NaCl = 0.00100 mol
      const initial: SubstanceQuantity[] = [
        { formula: 'AgNO3', moles: 0.001, mass_g: 0.001 * 169.87, state: 'aq', volume_ml: 10 },
        { formula: 'NaCl', moles: 0.001, mass_g: 0.001 * 58.44, state: 'aq', volume_ml: 10 },
      ];

      const result = runSimulationCycle(initial, 20.0, 25.0);

      expect(result.hasPrecipitate).toBe(true);
      expect(result.precipitateInfo?.formula).toBe('AgCl');
      expect(result.precipitateInfo?.colorHex).toBe('#ffffff');
      expect(result.precipitateInfo?.morphology).toBe('curdy');
      // Molar mass AgCl = 143.32 g/mol => 0.001 mol = ~0.143 g
      expect(result.precipitateInfo?.mass_g).toBeCloseTo(0.143, 2);
    });
  });

  describe('Verification Case D: Gas Evolution (NaHCO3 + HCl)', () => {
    it('triggers vigorous CO2 effervescence and tracks escaped gas in open vessel', () => {
      const initial: SubstanceQuantity[] = [
        { formula: 'NaHCO3', moles: 0.010, mass_g: 0.010 * 84.01, state: 'aq', volume_ml: 50 },
        { formula: 'HCl', moles: 0.015, mass_g: 0.015 * 36.46, state: 'aq', volume_ml: 50 },
      ];

      const result = runSimulationCycle(initial, 100.0, 25.0, false, true);

      expect(result.hasGas).toBe(true);
      expect(result.gasInfo?.formula).toBe('CO2');
      expect(result.gasInfo?.molesReleased).toBeCloseTo(0.010, 3);
      expect(result.reactionsOccurred[0].limitingReactant).toBe('NaHCO3');
    });
  });

  describe('Verification Case E: Thermal Decomposition', () => {
    it('requires heating to decompose Cu(OH)2 into black CuO', () => {
      const initial: SubstanceQuantity[] = [
        { formula: 'Cu(OH)2', moles: 0.002, mass_g: 0.002 * 97.56, state: 's' },
      ];

      // Without heat at 25°C -> No decomposition
      const unheated = runSimulationCycle(initial, 50.0, 25.0, false);
      expect(unheated.reactionsOccurred.length).toBe(0);

      // With burner heat above 65°C -> Decomposes into CuO
      const heated = runSimulationCycle(initial, 50.0, 75.0, true);
      expect(heated.reactionsOccurred.length).toBe(1);
      expect(heated.precipitateInfo?.formula).toBe('CuO');
      expect(heated.precipitateInfo?.colorHex).toBe('#18181b'); // Black
    });
  });

  describe('Verification Case F: Indicator Color Transitions', () => {
    it('correctly transitions phenolphthalein between acid, neutral, and base', () => {
      expect(getIndicatorColor('phenolphthalein', 1.0)).toBe('#f8fafc'); // Colorless
      expect(getIndicatorColor('phenolphthalein', 7.0)).toBe('#f8fafc'); // Colorless
      expect(getIndicatorColor('phenolphthalein', 9.5)).toBe('#ec4899'); // Pink
    });

    it('correctly transitions litmus paper / solution', () => {
      expect(getIndicatorColor('litmus', 2.0)).toBe('#ef4444'); // Red in acid
      expect(getIndicatorColor('litmus', 7.0)).toBe('#a855f7'); // Purple neutral
      expect(getIndicatorColor('litmus', 12.0)).toBe('#3b82f6'); // Blue in base
    });
  });
});
