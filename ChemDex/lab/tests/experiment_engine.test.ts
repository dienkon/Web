import { describe, it, expect, beforeEach } from 'vitest';
import { ExperimentEngine, ProceduralStep, ExperimentValidationState } from '../src/engine/experimentEngine';
import { PRECIPITATE_MORPHOLOGIES } from '../src/vfx/dev/VfxGallery';

describe('ExperimentEngine: Procedural Validation, Tolerances & Contamination', () => {
  let engine: ExperimentEngine;

  beforeEach(() => {
    engine = new ExperimentEngine();
  });

  describe('Tool Contamination Tracker', () => {
    it('initializes with all tools clean', () => {
      const tools = engine.getContaminatedTools();
      expect(tools.pipette).toBeNull();
      expect(tools.stirring_rod).toBeNull();
      expect(tools.spatula).toBeNull();
    });

    it('records chemical contact without cross-contamination on first use', () => {
      const result = engine.touchChemical('pipette', 'HCl');
      expect(result.isCrossContaminated).toBe(false);
      expect(result.previousChemical).toBeNull();
      expect(engine.getContaminatedTools().pipette).toBe('HCl');
    });

    it('detects cross-contamination when switching chemicals without cleaning', () => {
      engine.touchChemical('spatula', 'NaOH');
      const secondTouch = engine.touchChemical('spatula', 'KI');
      expect(secondTouch.isCrossContaminated).toBe(true);
      expect(secondTouch.previousChemical).toBe('NaOH');
      expect(engine.getContaminatedTools().spatula).toBe('KI');
    });

    it('resets contamination when tool is rinsed in distilled water', () => {
      engine.touchChemical('stirring_rod', 'CuSO4');
      expect(engine.getContaminatedTools().stirring_rod).toBe('CuSO4');

      engine.cleanTool('stirring_rod');
      expect(engine.getContaminatedTools().stirring_rod).toBeNull();

      // Subsequent touch with different chemical should not trigger cross-contamination
      const cleanTouch = engine.touchChemical('stirring_rod', 'HCl');
      expect(cleanTouch.isCrossContaminated).toBe(false);
    });
  });

  describe('Step Validation & Tolerance Checking', () => {
    const mockState: ExperimentValidationState = {
      vessels: {
        beaker_1: {
          id: 'beaker_1',
          name: 'Beaker 1',
          type: 'beaker',
          substances: ['HCl'],
          volume_ml: 20.4,
          mass_g: 20.4,
          temperature_c: 25.0,
          ph: 1.0,
          hasPrecipitate: false,
          hasGas: false,
        },
      },
      burners: {},
      activeTool: 'none',
      spatulaState: { chemical: null, mass_g: 0 },
      contaminatedTools: { pipette: null, stirring_rod: null, spatula: null },
      recentActions: [],
    };

    it('validates MEASURE_VOLUME within tolerance in standard mode', () => {
      const step: ProceduralStep = {
        stepNumber: 1,
        action: 'MEASURE_VOLUME',
        title_en: 'Measure HCl',
        title_vi: 'Đong HCl',
        instruction_en: 'Measure 20 mL of HCl',
        instruction_vi: 'Đong 20 mL HCl',
        expectedResult_en: '20 mL',
        expectedResult_vi: '20 mL',
        targetChemical: 'HCl',
        targetAmount: 20.0,
        tolerance: 1.0,
      };

      // 20.4 mL is within 20.0 +/- 1.0 mL
      const result = engine.validateStep(step, mockState, 'standard');
      expect(result.isValid).toBe(true);
      expect(result.isWithinTolerance).toBe(true);
      expect(result.toleranceError).toBe(0.4);
    });

    it('rejects MEASURE_VOLUME outside tolerance in practical mode (stricter tolerance)', () => {
      const step: ProceduralStep = {
        stepNumber: 1,
        action: 'MEASURE_VOLUME',
        title_en: 'Measure HCl',
        title_vi: 'Đong HCl',
        instruction_en: 'Measure 20 mL of HCl',
        instruction_vi: 'Đong 20 mL HCl',
        expectedResult_en: '20 mL',
        expectedResult_vi: '20 mL',
        targetChemical: 'HCl',
        targetAmount: 20.0,
        tolerance: 0.5,
      };

      // In practical mode, tolerance multiplier is 0.75 -> 0.5 * 0.75 = 0.375
      // 0.4 > 0.375 -> fails tolerance
      const result = engine.validateStep(step, mockState, 'practical');
      expect(result.isValid).toBe(false);
      expect(result.isWithinTolerance).toBe(false);
    });

    it('validates tool pick-up action correctly', () => {
      const step: ProceduralStep = {
        stepNumber: 2,
        action: 'PICK_UP_TOOL',
        requiredTool: 'spatula',
        title_en: 'Equip Spatula',
        title_vi: 'Cầm thìa xúc',
        instruction_en: 'Pick up the micro-spatula',
        instruction_vi: 'Cầm thìa xúc',
        expectedResult_en: 'Spatula equipped',
        expectedResult_vi: 'Đã cầm thìa',
      };

      // When spatula is not active
      const invalidRes = engine.validateStep(step, mockState);
      expect(invalidRes.isValid).toBe(false);

      // When spatula is active
      const validState = { ...mockState, activeTool: 'spatula' };
      const validRes = engine.validateStep(step, validState);
      expect(validRes.isValid).toBe(true);
    });
  });

  describe('Exam Report Card Grading', () => {
    it('generates an A+ report card for flawless performance', () => {
      const report = engine.generateReportCard(
        'sodium_water_reaction',
        'exam',
        4, // total steps
        4, // completed
        [0.1, 0.2], // minimal tolerance errors
        0, // zero contamination
        1, // quiz correct
        1, // quiz total
        120 // 2 minutes
      );

      expect(report.score).toBeGreaterThanOrEqual(95);
      expect(report.letterGrade).toBe('A+');
      expect(report.hygieneScore).toBe(15);
      expect(report.procedureScore).toBe(40);
    });

    it('penalizes score for tool contamination and excessive tolerance error', () => {
      const report = engine.generateReportCard(
        'acid_base_titration',
        'exam',
        4,
        3, // missed 1 step
        [3.5, 4.0], // large tolerance errors
        2, // 2 contaminations
        0, // failed quiz
        1,
        240
      );

      expect(report.score).toBeLessThan(75);
      expect(['C', 'D', 'F']).toContain(report.letterGrade);
      expect(report.hygieneScore).toBe(5); // 15 - 2*5 = 5
    });
  });

  describe('Precipitate Morphology Registry', () => {
    it('registers all 8 required non-spherical precipitate morphologies', () => {
      expect(PRECIPITATE_MORPHOLOGIES).toHaveLength(8);
      const types = PRECIPITATE_MORPHOLOGIES.map(m => m.type);
      expect(types).toContain('FINE_POWDER');
      expect(types).toContain('FLOC');
      expect(types).toContain('CURD');
      expect(types).toContain('GEL');
      expect(types).toContain('CRYSTAL_PLATE');
      expect(types).toContain('CRYSTAL_ROD');
      expect(types).toContain('IRREGULAR_GRAIN');
      expect(types).toContain('METALLIC_DEPOSIT');
    });

    it('ensures each morphology provides Stokes settling speed and optical description', () => {
      for (const morph of PRECIPITATE_MORPHOLOGIES) {
        expect(morph.name).toBeTruthy();
        expect(morph.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(morph.settlingSpeed).toBeTruthy();
        expect(morph.turbidity).toBeTruthy();
        expect(morph.description).toBeTruthy();
      }
    });
  });
});
