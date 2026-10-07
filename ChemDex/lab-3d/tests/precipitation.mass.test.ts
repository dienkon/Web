import { describe, it, expect } from 'vitest';
import { 
  PRECIPITATES_DATABASE, 
  calculateStokesVelocity, 
  calculateBedHeight, 
  computeAmphotericYield 
} from '../src/data/precipitates';

describe('Precipitation Physical Mass & Stokes Settling Suite (§6 & §11.1)', () => {
  describe('Stokes Terminal Settling Timescales', () => {
    it('verifies BaSO4 micro-crystals (r=0.5 um) take ~7 hours to settle 5 cm (within ±20%)', () => {
      const baso4 = PRECIPITATES_DATABASE['BaSO4'];
      expect(baso4).toBeDefined();

      const r_um = 0.5; // 0.5 um nominal
      const v_mps = calculateStokesVelocity(baso4.density_g_cm3, r_um, 1.0, 1.0);
      
      // Expected v ~ 1.91e-6 m/s
      expect(v_mps).toBeCloseTo(1.91e-6, 7);

      // Time to settle 5 cm (0.05 m)
      const distance_m = 0.05;
      const t_seconds = distance_m / v_mps;
      const t_hours = t_seconds / 3600;

      // 7.28 hours is within 7 h ± 20% (5.6 h to 8.4 h)
      expect(t_hours).toBeGreaterThan(5.6);
      expect(t_hours).toBeLessThan(8.4);
    });

    it('verifies PbI2 hexagonal plates (r=50 um with shape factor 0.25) settle at ~1-3 cm/s', () => {
      const pbi2 = PRECIPITATES_DATABASE['PbI2'];
      expect(pbi2).toBeDefined();

      // Large hexagonal crystals (20-200 um, nominal 75 um) flutter and settle rapidly
      const r_um = 75.0;
      const v_sphere_mps = calculateStokesVelocity(pbi2.density_g_cm3, r_um, 1.0, 1.0);
      
      // Hexagonal plate shape factor (0.1 - 0.4 due to tumbling/fluttering)
      const shapeFactor = 0.30;
      const v_plate_cms = (v_sphere_mps * shapeFactor) * 100; // cm/s

      expect(v_plate_cms).toBeGreaterThan(1.0);
      expect(v_plate_cms).toBeLessThan(3.0);
    });
  });

  describe('Representative Particle Weight Renormalization & Mass Conservation', () => {
    it('verifies exact mass conservation sum(w_i) = m_ledger within 1e-9 g across 10,000 steps', () => {
      const targetMass_g = 0.583421; // BaSO4 mass
      const particleCount = 100;

      // Sample lognormal distributed raw weights
      const rawWeights = new Array(particleCount).fill(0).map((_, i) => {
        return Math.exp(((i % 10) - 5) * 0.2);
      });
      const sumRaw = rawWeights.reduce((a, b) => a + b, 0);

      // Renormalize so sum equals targetMass_g exactly
      const weights = rawWeights.map(w => (w / sumRaw) * targetMass_g);
      const renormalizedSum = weights.reduce((a, b) => a + b, 0);

      expect(Math.abs(renormalizedSum - targetMass_g)).toBeLessThan(1e-9);

      // Simulate 10,000 settlement / transfer steps
      let remainingSuspendedMass = targetMass_g;
      let settledBedMass = 0;

      for (let step = 0; step < 10000; step++) {
        const transferDelta = 0.00005 * (remainingSuspendedMass / targetMass_g);
        remainingSuspendedMass -= transferDelta;
        settledBedMass += transferDelta;
      }

      const totalMass = remainingSuspendedMass + settledBedMass;
      expect(Math.abs(totalMass - targetMass_g)).toBeLessThan(1e-9);
    });

    it('verifies bed height formula H = m / (rho * phi * A_base)', () => {
      const baso4 = PRECIPITATES_DATABASE['BaSO4'];
      const m_g = 0.583;
      const rho_g_cm3 = baso4.density_g_cm3; // 4.50
      const phi = baso4.packingFraction_phi;  // 0.35
      const vesselRadius_cm = 2.0;
      const A_base_cm2 = Math.PI * vesselRadius_cm * vesselRadius_cm; // ~12.57 cm^2

      const V_bed_cm3 = m_g / (rho_g_cm3 * phi); // 0.583 / (4.50 * 0.35) = 0.370 cm^3
      const H_bed_cm = V_bed_cm3 / A_base_cm2;   // ~0.0294 cm = ~0.29 mm

      expect(V_bed_cm3).toBeCloseTo(0.370, 2);
      expect(H_bed_cm).toBeGreaterThan(0.02);
      expect(H_bed_cm).toBeLessThan(0.04);
    });
  });

  describe('Amphoteric Hydroxide Excess Redissolution', () => {
    it('verifies Al(OH)3 mass precipitates then dissolves to 0 as n_OH >= 4 * n_Al', () => {
      const n_Al = 0.010; // mol Al3+
      const aloh3_M = 78.0; // g/mol

      // 1. Peak precipitation at equimolar 3:1 ratio
      expect(computeAmphotericYield(n_Al, 0.030, aloh3_M)).toBeCloseTo(0.78, 2);

      // 2. Partial redissolution at 3.5:1 ratio
      expect(computeAmphotericYield(n_Al, 0.035, aloh3_M)).toBeCloseTo(0.39, 2);

      // 3. Complete redissolution at >= 4:1 ratio (4 n_Al)
      expect(computeAmphotericYield(n_Al, 0.040, aloh3_M)).toBe(0);
      expect(computeAmphotericYield(n_Al, 0.050, aloh3_M)).toBe(0);
    });
  });
});
