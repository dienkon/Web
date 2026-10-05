import { describe, it, expect } from 'vitest';
import { 
  parseChemicalFormula, 
  computeMolarMass, 
  calculateBeerLambertColor,
  calculateNonIdealExcessVolume_ml,
  LedgerEngine,
  applyProgramToLedger
} from '../src/engine/ledger';
import { ReactionProgram } from '../src/shared/programSchema';
import { VesselState } from '../src/types/chemistry';

describe('Conservation Ledger Engine & Stoichiometry Suite', () => {
  describe('Formula Parsing & Atomic Mass Computations', () => {
    it('correctly parses simple formulas', () => {
      const h2o = parseChemicalFormula('H2O');
      expect(h2o).toEqual({ H: 2, O: 1 });

      const nacl = parseChemicalFormula('NaCl');
      expect(nacl).toEqual({ Na: 1, Cl: 1 });

      const h2so4 = parseChemicalFormula('H2SO4');
      expect(h2so4).toEqual({ H: 2, S: 1, O: 4 });
    });

    it('correctly parses formulas with parentheses', () => {
      const caoh2 = parseChemicalFormula('Ca(OH)2');
      expect(caoh2).toEqual({ Ca: 1, O: 2, H: 2 });

      const al2so43 = parseChemicalFormula('Al2(SO4)3');
      expect(al2so43).toEqual({ Al: 2, S: 3, O: 12 });

      const pbno32 = parseChemicalFormula('Pb(NO3)2');
      expect(pbno32).toEqual({ Pb: 1, N: 2, O: 6 });
    });

    it('correctly parses hydrate salts with dot notations', () => {
      const cuso4_5h2o = parseChemicalFormula('CuSO4.5H2O');
      expect(cuso4_5h2o).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });

      const feso4_7h2o = parseChemicalFormula('FeSO4.7H2O');
      expect(feso4_7h2o).toEqual({ Fe: 1, S: 1, O: 11, H: 14 });
    });

    it('computes exact molar mass from standard IUPAC atomic weights', () => {
      expect(computeMolarMass('H2O')).toBeCloseTo(18.015, 2);
      expect(computeMolarMass('NaCl')).toBeCloseTo(58.44, 2);
      expect(computeMolarMass('CaCO3')).toBeCloseTo(100.086, 2);
      expect(computeMolarMass('BaSO4')).toBeCloseTo(233.39, 1);
      expect(computeMolarMass('CuSO4.5H2O')).toBeCloseTo(249.68, 1);
    });
  });

  describe('Non-Ideal Volume Mixing & Optical Absorbance', () => {
    it('calculates volume contraction for water-ethanol binary mixtures', () => {
      // 50 mL water + 50 mL ethanol contracts by ~3.5%
      const excess = calculateNonIdealExcessVolume_ml(50, 50, 'ethanol');
      expect(excess).toBeLessThan(0);
      expect(excess).toBeGreaterThan(-4.0);
    });

    it('computes Beer-Lambert transmitted color from chemical contents', () => {
      // Dilute Cu2+ solution should remain light sky blue
      const dilute = calculateBeerLambertColor([
        { formula: 'CuSO4', moles: 0.001, mass_g: 0.16, concentration_M: 0.02 }
      ], 50, '#38bdf8');
      expect(dilute).toMatch(/^#[0-9a-fA-F]{6}$/);

      // Concentrated Cu2+ solution deepens toward dark royal blue
      const conc = calculateBeerLambertColor([
        { formula: 'CuSO4', moles: 0.05, mass_g: 8.0, concentration_M: 1.0 }
      ], 50, '#1d4ed8');
      expect(conc).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe('Ledger Mass, Atom & Limiting Reagent Balance', () => {
    it('enforces rigorous mass conservation across precipitation reactions', () => {
      const baseVessel: VesselState = {
        id: 'beaker_1',
        name: 'Beaker 1',
        type: 'beaker',
        position: [0, 0, 0],
        rotationY: 0,
        isLocked: false,
        volume: 0.4,
        mass_g: 100,
        ph: 7,
        hasPrecipitate: false,
        isBoiling: false,
        hasGas: false,
        capacity_ml: 250,
        volume_ml: 100,
        temperature_c: 25,
        substances: ['BaCl2', 'Na2SO4'],
        contents: [
          { formula: 'BaCl2', moles: 0.02, mass_g: 0.02 * computeMolarMass('BaCl2'), volume_ml: 50, concentration_M: 0.4 },
          { formula: 'Na2SO4', moles: 0.05, mass_g: 0.05 * computeMolarMass('Na2SO4'), volume_ml: 50, concentration_M: 1.0 }
        ]
      };

      const ledger = LedgerEngine.createLedger(baseVessel);
      const auditBefore = ledger.audit();
      expect(auditBefore.isConserved).toBe(true);

      const program: ReactionProgram = {
        schema: 'chemdex.program/1',
        id: 'bacl2_na2so4',
        provenance: 'handcrafted',
        chemistry: {
          equation: 'BaCl2 + Na2SO4 -> BaSO4(s) + 2NaCl',
          species: [
            { formula: 'BaCl2', role: 'reactant', coeff: 1, phase: 'aq' },
            { formula: 'Na2SO4', role: 'reactant', coeff: 1, phase: 'aq' },
            { formula: 'BaSO4', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
            { formula: 'NaCl', role: 'product', coeff: 2, phase: 'aq' }
          ],
          kinetics: { model: 'instant', halfTime_s: 0.1 },
          hazards: []
        },
        visual: {
          duration_s: 6.0,
          timeline: [],
          after: { liquidColor: '#ffffff', liquidOpacity: 0.95, turbidity: 0.8, gasesOffgassed: [] }
        },
        explain: { observation_vi: '', observation_en: '', why_vi: '', why_en: '' },
        confidence: 1.0
      };

      // Limiting reagent is BaCl2 (0.02 mol vs Na2SO4 0.05 mol)
      const result = applyProgramToLedger(program, baseVessel, 1.0);
      expect(result.contents).toBeDefined();

      const remainingBaCl2 = result.contents?.find(c => c.formula.toLowerCase() === 'bacl2');
      const remainingNa2SO4 = result.contents?.find(c => c.formula.toLowerCase() === 'na2so4');
      const producedBaSO4 = result.contents?.find(c => c.formula.toLowerCase() === 'baso4');
      const producedNaCl = result.contents?.find(c => c.formula.toLowerCase() === 'nacl');

      // Limiting reagent completely consumed
      expect(remainingBaCl2?.moles).toBeCloseTo(0.0, 4);

      // Excess reagent partially consumed: 0.05 - 0.02 = 0.03 mol
      expect(remainingNa2SO4?.moles).toBeCloseTo(0.03, 3);

      // Stoichiometric product produced: 0.02 mol BaSO4
      expect(producedBaSO4?.moles).toBeCloseTo(0.02, 3);
      expect(result.precipitateAmount_g).toBeCloseTo(0.02 * computeMolarMass('BaSO4'), 2);

      // 2 * 0.02 = 0.04 mol NaCl produced
      expect(producedNaCl?.moles).toBeCloseTo(0.04, 3);
    });

    it('strictly yields 0 reaction extent and produces no phantom products when reactants have 0 moles', () => {
      const baseVessel: VesselState = {
        id: 'beaker_zero',
        name: 'Empty Reactants Beaker',
        type: 'beaker',
        position: [0, 0, 0],
        rotationY: 0,
        isLocked: false,
        volume: 0.1,
        mass_g: 50,
        ph: 7,
        hasPrecipitate: false,
        isBoiling: false,
        hasGas: false,
        capacity_ml: 250,
        volume_ml: 50,
        temperature_c: 25,
        substances: ['BaCl2', 'Na2SO4'],
        contents: [
          { formula: 'BaCl2', moles: 0, mass_g: 0, volume_ml: 25, concentration_M: 0 },
          { formula: 'Na2SO4', moles: 0.05, mass_g: 7.1, volume_ml: 25, concentration_M: 1.0 }
        ]
      };

      const program: ReactionProgram = {
        schema: 'chemdex.program/1',
        id: 'bacl2_na2so4',
        provenance: 'handcrafted',
        chemistry: {
          equation: 'BaCl2 + Na2SO4 -> BaSO4(s) + 2NaCl',
          species: [
            { formula: 'BaCl2', role: 'reactant', coeff: 1, phase: 'aq' },
            { formula: 'Na2SO4', role: 'reactant', coeff: 1, phase: 'aq' },
            { formula: 'BaSO4', role: 'product', coeff: 1, phase: 's', colorHex: '#ffffff' },
            { formula: 'NaCl', role: 'product', coeff: 2, phase: 'aq' }
          ],
          kinetics: { model: 'instant', halfTime_s: 0.1 },
          hazards: []
        },
        visual: {
          duration_s: 6.0,
          timeline: [],
          after: { liquidColor: '#ffffff', liquidOpacity: 0.95, turbidity: 0.8, gasesOffgassed: [] }
        },
        explain: { observation_vi: '', observation_en: '', why_vi: '', why_en: '' },
        confidence: 1.0
      };

      const result = applyProgramToLedger(program, baseVessel, 1.0);
      expect(result.hasPrecipitate).toBe(false);
      expect(result.precipitateAmount_g).toBe(0);
      const baso4 = result.contents?.find(c => c.formula.toLowerCase() === 'baso4');
      expect(baso4).toBeUndefined();
    });

    it('decreases mass in open vessel during gas evolution and builds pressure in sealed vessel', () => {
      const gasProgram: ReactionProgram = {
        schema: 'chemdex.program/1',
        id: 'zn_hcl_gas',
        provenance: 'handcrafted',
        chemistry: {
          equation: 'Zn + 2HCl -> ZnCl2 + H2(g)',
          species: [
            { formula: 'Zn', role: 'reactant', coeff: 1, phase: 's' },
            { formula: 'HCl', role: 'reactant', coeff: 2, phase: 'aq' },
            { formula: 'ZnCl2', role: 'product', coeff: 1, phase: 'aq' },
            { formula: 'H2', role: 'product', coeff: 1, phase: 'g' }
          ],
          kinetics: { model: 'instant', halfTime_s: 0.1 },
          hazards: []
        },
        visual: {
          duration_s: 5.0,
          timeline: [],
          after: { liquidColor: '#ffffff', liquidOpacity: 0.95, turbidity: 0.0, gasesOffgassed: [] }
        },
        explain: { observation_vi: '', observation_en: '', why_vi: '', why_en: '' },
        confidence: 1.0
      };

      // Open vessel: mass decreases by escaped H2 gas mass (0.05 mol * 2.016 g/mol = ~0.1008 g)
      const openVessel: VesselState = {
        id: 'open_flask',
        name: 'Open Flask',
        type: 'flask',
        position: [0, 0, 0],
        rotationY: 0,
        isLocked: false,
        isSealed: false,
        volume: 0.4,
        mass_g: 100.0,
        capacity_ml: 250,
        volume_ml: 100,
        temperature_c: 25,
        ph: 7,
        hasPrecipitate: false,
        isBoiling: false,
        hasGas: false,
        substances: ['Zn', 'HCl'],
        contents: [
          { formula: 'Zn', moles: 0.05, mass_g: 3.27, phase: 's' },
          { formula: 'HCl', moles: 0.2, mass_g: 7.29, volume_ml: 100, concentration_M: 2.0 }
        ]
      };

      const openResult = applyProgramToLedger(gasProgram, openVessel, 1.0);
      expect(openResult.hasGas).toBe(true);
      expect(openResult.mass_g).toBeLessThan(100.0);
      expect(openResult.mass_g).toBeCloseTo(100.0 - (0.05 * 2.016), 2);
      expect(openResult.internalPressure_atm).toBe(1.0);

      // Sealed vessel: mass is conserved, but headspace internal pressure increases
      const sealedVessel: VesselState = {
        ...openVessel,
        id: 'sealed_flask',
        isSealed: true,
        internalPressure_atm: 1.0
      };

      const sealedResult = applyProgramToLedger(gasProgram, sealedVessel, 1.0);
      expect(sealedResult.hasGas).toBe(true);
      expect(sealedResult.mass_g).toBe(100.0);
      expect(sealedResult.internalPressure_atm).toBeGreaterThan(1.0);
    });
  });
});
