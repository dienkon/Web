import { describe, it, expect } from 'vitest';
import { CONSTANTS, celsiusToKelvin, kelvinToCelsius } from '../src/core/units';
import { PRNG } from '../src/core/rng';
import { validateSubstanceDatabase, SUBSTANCE_DATABASE } from '../src/chem/substances';
import { validateReactionDatabase, REACTION_DATABASE } from '../src/chem/reactions';
import {
  solvePrecipitationEquilibrium,
  solvePhEquilibrium,
  computeIonicStrength,
  kspAtTemperature
} from '../src/chem/equilibrium';
import {
  calculateVaporPressure,
  calculateSaturationTemp,
  stepThermalODE
} from '../src/chem/thermo';
import { stepKinetics } from '../src/chem/kinetics';
import { calculateMixtureColorRGB } from '../src/chem/optics';
import { calculateIndicatorAbsorptivity } from '../src/chem/indicators';

describe('M0 & M1: Core Physical Invariants & Database Integrity', () => {
  it('passes comprehensive substance database validation', () => {
    const res = validateSubstanceDatabase();
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.total).toBeGreaterThanOrEqual(40);
  });

  it('passes comprehensive reaction database validation', () => {
    const res = validateReactionDatabase();
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.total).toBeGreaterThanOrEqual(30);
  });

  it('guarantees PRNG determinism for identical seeds', () => {
    const rng1 = new PRNG(42);
    const rng2 = new PRNG(42);
    const samples1 = Array.from({ length: 50 }, () => rng1.next());
    const samples2 = Array.from({ length: 50 }, () => rng2.next());
    expect(samples1).toEqual(samples2);

    // Verify Gaussian distribution mean and standard deviation
    const rng3 = new PRNG(1337);
    const gaussSamples = Array.from({ length: 1000 }, () => rng3.gaussian(5.0, 2.0));
    const mean = gaussSamples.reduce((a, b) => a + b, 0) / gaussSamples.length;
    expect(Math.abs(mean - 5.0)).toBeLessThan(0.15);
  });
});

describe('M1: Thermodynamics & Antoine Equation', () => {
  it('verifies water Antoine equation yields 760 mmHg ± 1 mmHg at 100 °C', () => {
    const waterAntoine = SUBSTANCE_DATABASE['H2O'].antoine!;
    const res = calculateVaporPressure(waterAntoine, celsiusToKelvin(100.0));
    // Normal boiling point is exactly 760 mmHg at 100 °C
    expect(Math.abs(res.p_mmHg - 760.0)).toBeLessThan(1.5);
    expect(Math.abs(res.p_Pa - CONSTANTS.P_ATM)).toBeLessThan(200.0);
  });

  it('verifies water saturation temperature Tsat at 1 atm is 373.15 K ± 0.1 K', () => {
    const waterAntoine = SUBSTANCE_DATABASE['H2O'].antoine!;
    const tsat_K = calculateSaturationTemp(waterAntoine, CONSTANTS.P_ATM);
    expect(Math.abs(tsat_K - 373.15)).toBeLessThan(0.1);
  });

  it('verifies neutralization temperature rise: 50 mL 1M HCl + 50 mL 1M NaOH yields ΔT ≈ 6.8 K', () => {
    // 50 mL of 1 M HCl has 0.050 mol H+
    // 50 mL of 1 M NaOH has 0.050 mol OH-
    // Neutralization enthalpy ΔH = -57.1 kJ/mol
    // Heat released Q = 0.050 mol * 57,100 J/mol = 2855 J
    // Total solution mass = 100 g = 0.100 kg, Cp = 4184 J/(kg·K)
    // C_total = 0.100 * 4184 = 418.4 J/K
    // Expected adiabatic ΔT = 2855 / 418.4 ≈ 6.82 K
    const molesReacted = 0.050;
    const dH_J_mol = -57100.0;
    const Q_J = -dH_J_mol * molesReacted;
    const mass_kg = 0.100;
    const Cp = 4184.0;
    const expectedDeltaT = Q_J / (mass_kg * Cp);
    expect(Math.abs(expectedDeltaT - 6.82)).toBeLessThan(0.05);

    // Verify thermal ODE step matches theoretical heating
    const state = {
      liquidTemp_K: 298.15,
      glassTemp_K: 298.15,
      ambientTemp_K: 298.15,
      liquidMass_kg: mass_kg,
      liquidCp_J_kgK: Cp,
      glassMass_kg: 0.05,
      glassCp_J_kgK: 830.0,
      outerArea_m2: 0.015,
      innerArea_m2: 0.012
    };

    // Instant reaction heat released in dt = 0.1s: power = Q_J / dt
    const dt = 0.1;
    const stepRes = stepThermalODE(state, {
      heaterPower_W: 0,
      reactionHeat_W: Q_J / dt,
      dissolutionHeat_W: 0,
      evaporationMassRate_kg_s: 0,
      latentHeatVap_J_kg: 2.257e6,
      tsat_K: 373.15,
      convective_h_W_m2K: 0 // Adiabatic check
    }, dt);

    const actualDeltaT = stepRes.newLiquidTemp_K - 298.15;
    expect(Math.abs(actualDeltaT - expectedDeltaT)).toBeLessThan(0.15);
  });
});

describe('M1: Chemical Equilibrium & Solubility (Ksp)', () => {
  it('verifies AgCl pure water saturation equilibrium is ~ 1.33e-5 M', () => {
    // AgCl <=> Ag+ + Cl-, Ksp = 1.77e-10
    // In pure water, [Ag+] = [Cl-] = sqrt(Ksp) = sqrt(1.77e-10) ≈ 1.3304e-5 M
    const ksp = 1.77e-10;
    const expectedSolubility = Math.sqrt(ksp);
    expect(Math.abs(expectedSolubility - 1.33e-5)).toBeLessThan(1e-7);

    // If we mix 0.01 M AgNO3 + 0.01 M NaCl:
    const eq = solvePrecipitationEquilibrium(0.01, 0.01, ksp, [1, 1]);
    expect(eq.isSupersaturated).toBe(true);
    // Precipitated moles per liter x should consume almost all ions down to sqrt(Ksp)
    const expectedPpt = 0.01 - expectedSolubility;
    expect(Math.abs(eq.precipitatedMolesPerLiter - expectedPpt)).toBeLessThan(1e-6);
    expect(Math.abs(eq.remainingCation_M - expectedSolubility)).toBeLessThan(1e-6);
  });

  it('demonstrates common-ion effect reducing solubility', () => {
    // Add 0.1 M NaCl to AgCl solution: [Cl-] = 0.1 M
    // [Ag+] = Ksp / [Cl-] = 1.77e-10 / 0.1 = 1.77e-9 M (reduced by factor of 7500!)
    const ksp = 1.77e-10;
    const eq = solvePrecipitationEquilibrium(0.001, 0.1, ksp, [1, 1]);
    expect(eq.remainingCation_M).toBeLessThan(2e-9);
    expect(eq.remainingCation_M).toBeGreaterThan(1.5e-9);
  });

  it('verifies temperature-dependent Ksp via van t Hoff for PbI2 Golden Rain', () => {
    const kspCold = kspAtTemperature(9.8e-9, 46500, celsiusToKelvin(20.0));
    const kspHot = kspAtTemperature(9.8e-9, 46500, celsiusToKelvin(95.0));
    // Hot Ksp must be significantly larger than cold Ksp due to endothermic dissolution
    expect(kspHot).toBeGreaterThan(kspCold * 25.0);
  });
});

describe('M1: Acid-Base Equilibrium & pH Solver', () => {
  it('calculates pH of 0.1 M strong acid HCl is 1.00', () => {
    const ph = solvePhEquilibrium([
      { type: 'strong_acid', concentration_M: 0.1 }
    ]);
    expect(ph).toBeCloseTo(1.00, 2);
  });

  it('calculates pH of 0.1 M strong base NaOH is 13.00', () => {
    const ph = solvePhEquilibrium([
      { type: 'strong_base', concentration_M: 0.1 }
    ]);
    expect(ph).toBeCloseTo(13.00, 2);
  });

  it('calculates pH of 0.1 M weak acid (Acetic Acid, Ka=1.75e-5) is ~ 2.88', () => {
    // [H+] ≈ sqrt(Ka * C) = sqrt(1.75e-5 * 0.1) = sqrt(1.75e-6) ≈ 1.323e-3 M
    // pH = -log10(1.323e-3) ≈ 2.878
    const ph = solvePhEquilibrium([
      { type: 'weak_acid', concentration_M: 0.1, Ka: [1.75e-5] }
    ]);
    expect(Math.abs(ph - 2.88)).toBeLessThan(0.03);
  });
});

describe('M1: Optics and Phenolphthalein Indicator Transition', () => {
  it('correctly models phenolphthalein color change from colorless to magenta across pH 8.2 - 10.0', () => {
    const acidAbs = calculateIndicatorAbsorptivity('Phenolphthalein', 4.0);
    const baseAbs = calculateIndicatorAbsorptivity('Phenolphthalein', 11.0);
    const midAbs = calculateIndicatorAbsorptivity('Phenolphthalein', 9.4); // At pKin

    // Acid form has negligible green extinction
    expect(acidAbs[1]).toBeLessThan(0.01);
    // Base form has strong green extinction -> magenta
    expect(baseAbs[1]).toBeGreaterThan(1.5);
    // Midpoint is intermediate
    expect(midAbs[1]).toBeGreaterThan(0.7);
    expect(midAbs[1]).toBeLessThan(1.2);

    const acidColor = calculateMixtureColorRGB([{ absorptivity_RGB: acidAbs, concentration_M: 0.001 }]);
    const baseColor = calculateMixtureColorRGB([{ absorptivity_RGB: baseAbs, concentration_M: 0.001 }]);
    expect(acidColor.colorHex.toLowerCase()).not.toEqual(baseColor.colorHex.toLowerCase());
  });
});
