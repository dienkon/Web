import { describe, it, expect } from 'vitest';
import { 
  GAS_FUME_TABLE, 
  calculateGrahamsRatio, 
  GRAHAM_NH3_HCL_RATIO, 
  calculateGasDensityRatioAir 
} from '../src/vfx/catalog/gasTable';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library/index';

describe('Gas & Fume Visual Physics Suite (§4.0 & §11.1)', () => {
  describe('Invisible Gas Constraints', () => {
    const INVISIBLE_GASES = ['H2', 'O2', 'N2', 'CO2', 'SO2', 'NH3', 'H2S', 'CH4'];

    it('asserts invisible gases are strictly marked invisible with no colored absorbers', () => {
      for (const gas of INVISIBLE_GASES) {
        const entry = GAS_FUME_TABLE[gas];
        expect(entry, `Gas entry missing for ${gas}`).toBeDefined();
        expect(entry.visible, `Gas ${gas} must be invisible`).toBe(false);
        expect(
          ['none', 'schlieren'].includes(entry.opacityModel),
          `Gas ${gas} opacity model must be none or schlieren, got ${entry.opacityModel}`
        ).toBe(true);
        expect(entry.opacityModel, `Gas ${gas} must never be an optical absorber`).not.toBe('absorber');
      }
    });

    it('verifies handcrafted programs producing invisible gases never mount colored gas plumes', () => {
      const coloredPlumeAtoms = new Set([
        'no2BrownPlume',
        'heavyYellowGreenChlorine',
        'bromineVaporLayer',
        'iodineVioletVapor',
        'sootBlackSmoke'
      ]);

      for (const prog of ALL_HANDCRAFTED_PROGRAMS) {
        const products = prog.chemistry.species.filter(s => s.role === 'product' && s.phase === 'g');
        const producesOnlyInvisibleGas = products.length > 0 && products.every(p => INVISIBLE_GASES.includes(p.formula));

        if (producesOnlyInvisibleGas) {
          for (const inst of prog.visual.timeline) {
            expect(
              coloredPlumeAtoms.has(inst.atom),
              `Program ${prog.id} produces only invisible gas but mounts colored atom ${inst.atom}`
            ).toBe(false);
          }
        }
      }
    });
  });

  describe('Colored Gases & Optical Absorbers', () => {
    const COLORED_GASES = ['Cl2', 'Br2', 'I2', 'NO2'];

    it('asserts colored gases have visible: true, absorber opacity model, and valid hex colors', () => {
      for (const gas of COLORED_GASES) {
        const entry = GAS_FUME_TABLE[gas];
        expect(entry).toBeDefined();
        expect(entry.visible).toBe(true);
        expect(entry.opacityModel).toBe('absorber');
        expect(entry.colorHex).toMatch(/^#[0-9a-f]{6}$/i);
        expect(entry.absorptionCrossSection_sigma).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Buoyancy & Atmospheric Density Ratios', () => {
    it('verifies density ratios relative to air (M / 28.96)', () => {
      expect(calculateGasDensityRatioAir(2.016)).toBeCloseTo(0.07, 2);   // H2 rises fast
      expect(calculateGasDensityRatioAir(17.03)).toBeCloseTo(0.59, 2);  // NH3 rises
      expect(calculateGasDensityRatioAir(44.01)).toBeCloseTo(1.52, 2);  // CO2 sinks
      expect(calculateGasDensityRatioAir(70.90)).toBeCloseTo(2.45, 2);  // Cl2 heavy
      expect(calculateGasDensityRatioAir(159.81)).toBeCloseTo(5.52, 2); // Br2 cascades
    });

    it('correctly classifies rising vs sinking behaviors based on relative density', () => {
      // Light gases (density < 1.0) rise
      expect(GAS_FUME_TABLE['H2'].buoyancyBehavior).toBe('rises_fast');
      expect(GAS_FUME_TABLE['CH4'].buoyancyBehavior).toBe('rises');
      expect(GAS_FUME_TABLE['NH3'].buoyancyBehavior).toBe('rises');

      // Heavy gases (density > 1.2) sink or cascade
      expect(GAS_FUME_TABLE['CO2'].buoyancyBehavior).toBe('sinks_heavy');
      expect(GAS_FUME_TABLE['Cl2'].buoyancyBehavior).toBe('sinks_heavy');
      expect(GAS_FUME_TABLE['Br2'].buoyancyBehavior).toBe('cascades_very_heavy');
      expect(GAS_FUME_TABLE['I2'].buoyancyBehavior).toBe('cascades_very_heavy');
    });
  });

  describe("Graham's Law Diffusion Tube Demonstration", () => {
    it("asserts Graham's law diffusion ratio for NH3 and HCl is 1.46 ± 0.1", () => {
      const M_NH3 = 17.03;
      const M_HCl = 36.46;
      const ratio = calculateGrahamsRatio(M_NH3, M_HCl);

      // d_NH3 / d_HCl = sqrt(36.46 / 17.03) = 1.463
      expect(ratio).toBeCloseTo(1.463, 2);
      expect(ratio).toBeGreaterThanOrEqual(1.36);
      expect(ratio).toBeLessThanOrEqual(1.56);
      expect(GRAHAM_NH3_HCL_RATIO).toBeCloseTo(ratio, 4);

      // In a normalized tube from 0 (NH3 end) to 1 (HCl end):
      // distance from NH3 = ratio / (1 + ratio) = 1.463 / 2.463 = 0.594
      const ringLocationFromNH3 = ratio / (1 + ratio);
      expect(ringLocationFromNH3).toBeCloseTo(0.594, 2);
      expect(ringLocationFromNH3).toBeGreaterThan(0.50); // distinctly closer to HCl end
    });
  });
});
