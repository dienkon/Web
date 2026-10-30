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

    it('correctly transitions methyl orange indicator', () => {
      expect(getIndicatorColor('methyl_orange', 2.5)).toBe('#ef4444'); // Red at pH < 3.1
      expect(getIndicatorColor('methyl_orange', 3.8)).toBe('#f97316'); // Orange transition (3.1-4.4)
      expect(getIndicatorColor('methyl_orange', 5.5)).toBe('#eab308'); // Yellow at pH > 4.4
    });

    it('correctly transitions thymolphthalein indicator', () => {
      expect(getIndicatorColor('thymolphthalein', 7.0)).toBe('#f8fafc'); // Colorless at pH < 9.3
      expect(getIndicatorColor('thymolphthalein', 9.8)).toBe('#60a5fa'); // Light blue (9.3-10.5)
      expect(getIndicatorColor('thymolphthalein', 11.5)).toBe('#1d4ed8'); // Vivid royal blue at pH > 10.5
    });
  });

  describe('Verification Case G: Advanced 3D-Parity Realistic Mechanisms', () => {
    it('detects immiscible organic phase separation in esterification', () => {
      // CH3COOH + C2H5OH with H2SO4 catalyst under heating -> CH3COOC2H5
      const initial: SubstanceQuantity[] = [
        { formula: 'CH3COOH', moles: 0.05, mass_g: 3.0, state: 'l', volume_ml: 10 },
        { formula: 'C2H5OH', moles: 0.05, mass_g: 2.3, state: 'l', volume_ml: 10 },
        { formula: 'H2SO4', moles: 0.005, mass_g: 0.5, state: 'aq', volume_ml: 2 },
      ];

      const heated = runSimulationCycle(initial, 22.0, 75.0, true);
      expect(heated.reactionsOccurred.length).toBeGreaterThan(0);
      expect(heated.hasPhaseSeparation).toBe(true);
      expect(heated.organicLayerVolume_ml).toBeGreaterThan(0);
    });

    it('handles amphoteric multi-stage dissolution of Al(OH)3 in excess strong base', () => {
      // Stage 1: AlCl3 + 3 NaOH -> Al(OH)3 white gel precipitate
      const stage1Initial: SubstanceQuantity[] = [
        { formula: 'AlCl3', moles: 0.002, mass_g: 0.266, state: 'aq', volume_ml: 20 },
        { formula: 'NaOH', moles: 0.006, mass_g: 0.24, state: 'aq', volume_ml: 20 },
      ];
      const stage1 = runSimulationCycle(stage1Initial, 40.0, 25.0);
      expect(stage1.hasPrecipitate).toBe(true);
      expect(stage1.precipitateInfo?.formula).toBe('Al(OH)3');

      // Stage 2: Excess NaOH dissolves Al(OH)3 forming [Al(OH)4]-
      const stage2Initial: SubstanceQuantity[] = [
        ...stage1.updatedContents,
        { formula: 'NaOH', moles: 0.010, mass_g: 0.40, state: 'aq', volume_ml: 20 },
      ];
      const stage2 = runSimulationCycle(stage2Initial, 60.0, 25.0);
      const remainingAlOH3 = stage2.updatedContents.find(c => c.formula === 'Al(OH)3');
      expect(!remainingAlOH3 || remainingAlOH3.moles < 1e-4).toBe(true);
    });

    it('generates reddish-brown NO2 fumes in Cu + HNO3 concentrated redox reaction', () => {
      const initial: SubstanceQuantity[] = [
        { formula: 'Cu', moles: 0.005, mass_g: 0.32, state: 's' },
        { formula: 'HNO3', moles: 0.030, mass_g: 1.89, state: 'aq', volume_ml: 30 },
      ];

      const sim = runSimulationCycle(initial, 30.0, 35.0);
      expect(sim.hasGas).toBe(true);
      expect(sim.hasFumes).toBe(true);
      expect(sim.fumeType).toBe('no2');
      expect(sim.fumeColorHex).toBe('#b45309');
    });

    it('triggers instant heuristic rule-based solver when mixing uncataloged acid and base', () => {
      // Uncataloged molar combination of Ba(OH)2 and HNO3
      const initial: SubstanceQuantity[] = [
        { formula: 'HNO3', moles: 0.004, mass_g: 0.252, state: 'aq', volume_ml: 25 },
        { formula: 'Ba(OH)2', moles: 0.002, mass_g: 0.342, state: 'aq', volume_ml: 25 },
      ];

      const sim = runSimulationCycle(initial, 50.0, 25.0);
      expect(sim.reactionsOccurred.length).toBeGreaterThan(0);
      expect(sim.finalPh).toBeCloseTo(7.0, 1);
      expect(sim.finalTemperature_c).toBeGreaterThan(25.0);
    });

    it('simulates Golden Rain PbI2 precipitation with crystalline yellow morphology', () => {
      // Pb(NO3)2 + 2KI -> PbI2(s) + 2KNO3
      const initial: SubstanceQuantity[] = [
        { formula: 'Pb(NO3)2', moles: 0.002, mass_g: 0.662, state: 'aq', volume_ml: 25 },
        { formula: 'KI', moles: 0.004, mass_g: 0.664, state: 'aq', volume_ml: 25 },
      ];

      const sim = runSimulationCycle(initial, 50.0, 25.0);
      expect(sim.hasPrecipitate).toBe(true);
      expect(sim.precipitateInfo?.formula).toBe('PbI2');
      expect(sim.precipitateInfo?.morphology).toBe('crystalline');
      expect(sim.precipitateInfo?.colorHex).toMatch(/#(fbbf24|eab308)/);
    });

    it('simulates Tollens acetaldehyde reduction to form metallic silver mirror coating under heating', () => {
      // CH3CHO + 2AgNO3 + 3NH3 + H2O -> CH3COONH4 + 2Ag(s) + 2NH4NO3
      const initial: SubstanceQuantity[] = [
        { formula: 'CH3CHO', moles: 0.002, mass_g: 0.088, state: 'aq', volume_ml: 10 },
        { formula: 'AgNO3', moles: 0.004, mass_g: 0.680, state: 'aq', volume_ml: 20 },
        { formula: 'NH3', moles: 0.006, mass_g: 0.102, state: 'aq', volume_ml: 15 },
      ];

      // Below reaction temperature 50°C
      const cold = runSimulationCycle(initial, 45.0, 25.0, false);
      expect(cold.hasSilverMirror).toBe(false);

      // Heated above 50°C
      const heated = runSimulationCycle(initial, 45.0, 55.0, true);
      expect(heated.hasSilverMirror).toBe(true);
      expect(heated.updatedContents.some(c => c.formula === 'Ag')).toBe(true);
    });

    it('accurately identifies flame test emission colors for various cations', () => {
      // Copper solution -> Green flame emission
      const cuSol: SubstanceQuantity[] = [
        { formula: 'CuSO4', moles: 0.001, mass_g: 0.16, state: 'aq', volume_ml: 20 },
      ];
      expect(runSimulationCycle(cuSol, 20.0, 25.0).flameTestColorHex).toBe('#10b981');

      // Sodium solution -> Golden yellow flame emission
      const naSol: SubstanceQuantity[] = [
        { formula: 'NaCl', moles: 0.001, mass_g: 0.058, state: 'aq', volume_ml: 20 },
      ];
      expect(runSimulationCycle(naSol, 20.0, 25.0).flameTestColorHex).toBe('#eab308');

      // Potassium solution -> Lilac flame emission
      const kSol: SubstanceQuantity[] = [
        { formula: 'KCl', moles: 0.001, mass_g: 0.074, state: 'aq', volume_ml: 20 },
      ];
      expect(runSimulationCycle(kSol, 20.0, 25.0).flameTestColorHex).toBe('#c084fc');

      // Barium solution -> Apple green flame emission
      const baSol: SubstanceQuantity[] = [
        { formula: 'BaCl2', moles: 0.001, mass_g: 0.208, state: 'aq', volume_ml: 20 },
      ];
      expect(runSimulationCycle(baSol, 20.0, 25.0).flameTestColorHex).toBe('#84cc16');

      // Calcium solution -> Brick red flame emission
      const caSol: SubstanceQuantity[] = [
        { formula: 'CaCl2', moles: 0.001, mass_g: 0.111, state: 'aq', volume_ml: 20 },
      ];
      expect(runSimulationCycle(caSol, 20.0, 25.0).flameTestColorHex).toBe('#f97316');
    });

    it('simulates tetraamminecopper(II) deep royal blue complex formation', () => {
      // Cu(OH)2 + 4NH3 -> [Cu(NH3)4](OH)2
      const initial: SubstanceQuantity[] = [
        { formula: 'Cu(OH)2', moles: 0.002, mass_g: 0.195, state: 's' },
        { formula: 'NH3', moles: 0.008, mass_g: 0.136, state: 'aq', volume_ml: 25 },
      ];

      const sim = runSimulationCycle(initial, 25.0, 25.0);
      expect(sim.reactionsOccurred.length).toBeGreaterThan(0);
      expect(sim.finalLiquidColorHex).toBe('#1d4ed8'); // Royal azure blue
    });

    it('simulates violent reaction of metallic sodium with water generating H2 and alkaline NaOH', () => {
      // 2Na + 2H2O -> 2NaOH + H2(g)
      const initial: SubstanceQuantity[] = [
        { formula: 'Na', moles: 0.002, mass_g: 0.046, state: 's' },
        { formula: 'H2O', moles: 2.77, mass_g: 50.0, state: 'l', volume_ml: 50 },
      ];

      const sim = runSimulationCycle(initial, 50.0, 25.0);
      expect(sim.reactionsOccurred.length).toBeGreaterThan(0);
      expect(sim.hasGas).toBe(true);
      expect(sim.gasInfo?.formula).toBe('H2');
      expect(sim.finalPh).toBeGreaterThan(12.0); // Highly alkaline
      expect(sim.finalTemperature_c).toBeGreaterThan(25.0); // Exothermic
    });

    it('simulates iron(III) thiocyanate blood-red complex and subsequent decolorization with NaF', () => {
      // Stage 1: FeCl3 + 3KSCN -> Fe(SCN)3 blood-red
      const stage1Initial: SubstanceQuantity[] = [
        { formula: 'FeCl3', moles: 0.001, mass_g: 0.162, state: 'aq', volume_ml: 20 },
        { formula: 'KSCN', moles: 0.003, mass_g: 0.291, state: 'aq', volume_ml: 20 },
      ];
      const stage1 = runSimulationCycle(stage1Initial, 40.0, 25.0);
      expect(stage1.finalLiquidColorHex).toBe('#7f1d1d'); // Blood red

      // Stage 2: Add excess NaF to displace SCN- and form colorless [FeF6]3-
      const stage2Initial: SubstanceQuantity[] = [
        ...stage1.updatedContents,
        { formula: 'NaF', moles: 0.005, mass_g: 0.21, state: 'aq', volume_ml: 20 },
      ];
      const stage2 = runSimulationCycle(stage2Initial, 60.0, 25.0);
      expect(stage2.reactionsOccurred.length).toBeGreaterThan(0);
      expect(stage2.finalLiquidColorHex).not.toBe('#7f1d1d'); // Bleached blood-red
    });

    it('simulates combustion of magnesium ribbon under heat to produce white MgO', () => {
      // 2Mg + O2 -> 2MgO
      const initial: SubstanceQuantity[] = [
        { formula: 'Mg', moles: 0.004, mass_g: 0.097, state: 's' },
        { formula: 'O2', moles: 0.002, mass_g: 0.064, state: 'g' },
      ];

      // Cold: no reaction
      const cold = runSimulationCycle(initial, 0, 25.0, false);
      expect(cold.reactionsOccurred.length).toBe(0);

      // Heated above 60°C: ignites vigorously
      const hot = runSimulationCycle(initial, 0, 75.0, true);
      expect(hot.reactionsOccurred.length).toBeGreaterThan(0);
      expect(hot.updatedContents.some(c => c.formula === 'MgO')).toBe(true);
      expect(hot.precipitateInfo?.formula).toBe('MgO');
    });
  });
});
