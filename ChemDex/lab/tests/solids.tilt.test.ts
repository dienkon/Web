import { describe, it, expect } from 'vitest';
import { 
  SOLID_PROPERTIES, 
  getSolidProperty, 
  calculateSolidDisplacement, 
  willSolidFloat,
  calculateAngleOfRepose,
  calculateGranularFlowRate,
  shouldSolidsSlump,
  isSolidDecanting,
  calculateNoyesWhitneyDissolution
} from '../src/pour/physics/solids';

describe('Solids Physics, Tilt Repose & Decanting Suite (§8.5 & §11.1)', () => {
  describe('Angle of Repose & Slumping Thresholds', () => {
    it('defines angles of repose: powders hold 30-35°, granules 25-30°, wet clumps 45°+', () => {
      const powderReposeRad = calculateAngleOfRepose('CaCO3', false);
      const granuleReposeRad = calculateAngleOfRepose('Zn', false);
      const wetReposeRad = calculateAngleOfRepose('CaCO3', true);

      expect((powderReposeRad * 180) / Math.PI).toBeCloseTo(32.0, 1);
      expect((granuleReposeRad * 180) / Math.PI).toBeCloseTo(28.0, 1);
      expect((wetReposeRad * 180) / Math.PI).toBeCloseTo(48.0, 1);

      // Below angle of repose: no slump
      const tilt20Rad = (20.0 * Math.PI) / 180;
      expect(shouldSolidsSlump('CaCO3', tilt20Rad, false)).toBe(false);

      // Above angle of repose: slumping begins
      const tilt36Rad = (36.0 * Math.PI) / 180;
      expect(shouldSolidsSlump('CaCO3', tilt36Rad, false)).toBe(true);
      expect(shouldSolidsSlump('CaCO3', tilt36Rad, true)).toBe(false); // Wet clumps hold
    });

    it('verifies decanting hierarchy: liquid leaves first at lower tilt, heavy solids stay until steep tilt', () => {
      const tilt40Rad = (40.0 * Math.PI) / 180;
      const tilt60Rad = (60.0 * Math.PI) / 180;

      // Heavy CaCO3 sinking solid stays in beaker at 40° tilt, decants at 60°
      expect(isSolidDecanting('CaCO3', tilt40Rad, true)).toBe(false);
      expect(isSolidDecanting('CaCO3', tilt60Rad, true)).toBe(true);

      // Floating Na metal floats out with liquid at 40° tilt
      expect(isSolidDecanting('Na', tilt40Rad, true)).toBe(true);
    });

    it('calculates Beverloo discharge flow and Noyes-Whitney dissolution rates', () => {
      const flowRate = calculateGranularFlowRate('CaCO3', 1.5, (45.0 * Math.PI) / 180);
      expect(flowRate).toBeGreaterThan(0);

      // Jamming when opening is too small
      const jammedFlow = calculateGranularFlowRate('CaCO3', 0.1, (45.0 * Math.PI) / 180);
      expect(jammedFlow).toBe(0);

      // Dissolution rate positive when undersaturated, 0 when saturated
      const dissolutionRate = calculateNoyesWhitneyDissolution('NaCl', 5.0, 0.1, 5.4, true);
      expect(dissolutionRate).toBeGreaterThan(0);
      const satRate = calculateNoyesWhitneyDissolution('NaCl', 5.0, 5.4, 5.4, true);
      expect(satRate).toBe(0);
    });
  });

  describe('Floating vs Sinking Solid Mechanics', () => {
    it('identifies floating solids (rho < 1.0) such as sodium metal (rho = 0.968 g/cm3)', () => {
      expect(willSolidFloat('Na', 1.0)).toBe(true);
      const naProp = getSolidProperty('Na');
      expect(naProp.density_g_cm3).toBeLessThan(1.0);
      expect(naProp.density_g_cm3).toBeCloseTo(0.968, 3);
    });

    it('identifies sinking solids (rho > 1.0) such as Zn, Fe, Cu, and CaCO3', () => {
      expect(willSolidFloat('Zn', 1.0)).toBe(false);
      expect(willSolidFloat('Fe', 1.0)).toBe(false);
      expect(willSolidFloat('Cu', 1.0)).toBe(false);
      expect(willSolidFloat('CaCO3', 1.0)).toBe(false);

      expect(getSolidProperty('Zn').density_g_cm3).toBeGreaterThan(7.0);
      expect(getSolidProperty('Fe').density_g_cm3).toBeGreaterThan(7.5);
      expect(getSolidProperty('Cu').density_g_cm3).toBeGreaterThan(8.5);
      expect(getSolidProperty('CaCO3').density_g_cm3).toBeCloseTo(2.71, 2);
    });
  });

  describe('Archimedes Liquid Volume Displacement', () => {
    it('calculates displaced liquid volume (mL) = mass (g) / density (g/cm3)', () => {
      // 10.0 g of Zn (rho = 7.14 g/cm3)
      const znDisplaced_ml = calculateSolidDisplacement('Zn', 10.0);
      expect(znDisplaced_ml).toBeCloseTo(10.0 / 7.14, 2); // ~1.40 mL

      // 5.42 g of CaCO3 (rho = 2.71 g/cm3)
      const caco3Displaced_ml = calculateSolidDisplacement('CaCO3', 5.42);
      expect(caco3Displaced_ml).toBeCloseTo(2.0, 2); // exactly 2.00 mL
    });
  });
});
