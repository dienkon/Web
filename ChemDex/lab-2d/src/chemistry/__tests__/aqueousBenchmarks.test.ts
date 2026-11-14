import { describe, expect, it } from 'vitest';
import {
  calculateSolutionPh,
  calculateSolutionPhWithModel,
  solveAqueousEquilibrium,
} from '../equilibrium/acidBase';
import { runSimulationCycle } from '../reactions/engine';
import type { SubstanceQuantity } from '../../types/chemistry';

function aq(formula: string, molarity: number, volume_ml = 100): SubstanceQuantity[] {
  const moles = molarity * (volume_ml / 1000);
  return [
    { formula, moles, mass_g: moles * 60, state: 'aq', concentration_M: molarity },
    { formula: 'H2O', moles: volume_ml / 18.015, mass_g: volume_ml, state: 'l' },
  ];
}

describe('Aqueous Charge-Balance Equilibrium pH Benchmarks (25 °C)', () => {
  it('computes 0.1 M CH3COOH weak acid pH within ±0.05 of 2.88', () => {
    const res = calculateSolutionPhWithModel(aq('CH3COOH', 0.1), 100);
    expect(res.model).toBe('charge_balance_ideal');
    expect(Math.abs(res.ph - 2.88)).toBeLessThanOrEqual(0.05);
  });

  it('computes 0.1 M NH3 weak base pH within ±0.05 of 11.13', () => {
    const res = calculateSolutionPhWithModel(aq('NH3', 0.1), 100);
    expect(res.model).toBe('charge_balance_ideal');
    expect(Math.abs(res.ph - 11.13)).toBeLessThanOrEqual(0.05);
  });

  it('computes 0.1 M / 0.1 M CH3COOH + CH3COONa acetate buffer pH within ±0.05 of 4.76', () => {
    const res = calculateSolutionPhWithModel(
      [
        { formula: 'CH3COOH', moles: 0.01, mass_g: 0.6, state: 'aq' },
        { formula: 'CH3COONa', moles: 0.01, mass_g: 0.82, state: 'aq' },
        { formula: 'H2O', moles: 5.55, mass_g: 100, state: 'l' },
      ],
      100
    );
    expect(res.model).toBe('charge_balance_ideal');
    expect(Math.abs(res.ph - 4.76)).toBeLessThanOrEqual(0.05);
  });

  it('computes 0.1 M H3PO4 triprotic acid pH within ±0.05 of 1.63', () => {
    const res = calculateSolutionPhWithModel(aq('H3PO4', 0.1), 100);
    expect(res.model).toBe('charge_balance_ideal');
    expect(Math.abs(res.ph - 1.63)).toBeLessThanOrEqual(0.05);
  });

  it('computes 0.1 M Na2CO3 carbonate hydrolysis pH within ±0.05 of 11.66', () => {
    const res = calculateSolutionPhWithModel(aq('Na2CO3', 0.1), 100);
    expect(res.model).toBe('charge_balance_ideal');
    expect(Math.abs(res.ph - 11.66)).toBeLessThanOrEqual(0.05);
  });

  it('computes 0.1 M NaHCO3 amphiprotic pH within ±0.05 of 8.34', () => {
    const res = calculateSolutionPhWithModel(aq('NaHCO3', 0.1), 100);
    expect(res.model).toBe('charge_balance_ideal');
    expect(Math.abs(res.ph - 8.34)).toBeLessThanOrEqual(0.05);
  });

  it('computes equivalence-point pH of 0.1 M CH3COOH + 0.1 M NaOH within ±0.05 of 8.72', () => {
    // 50 mL 0.1 M CH3COOH + 50 mL 0.1 M NaOH -> 100 mL containing 0.05 M CH3COONa
    const eqSim = runSimulationCycle(
      [
        { formula: 'CH3COOH', moles: 0.005, mass_g: 0.3003, state: 'aq' },
        { formula: 'NaOH', moles: 0.005, mass_g: 0.2, state: 'aq' },
        { formula: 'H2O', moles: 5.55, mass_g: 100, state: 'l' },
      ],
      100,
      25
    );
    expect(Math.abs(eqSim.finalPh - 8.72)).toBeLessThanOrEqual(0.05);

    const directEq = calculateSolutionPh(aq('CH3COONa', 0.05), 100);
    expect(Math.abs(directEq - 8.72)).toBeLessThanOrEqual(0.05);
  });

  it('computes ultra-dilute 1e-8 M HCl with water autoionization within ±0.05 of 6.98', () => {
    const res = calculateSolutionPhWithModel(aq('HCl', 1e-8, 1000), 1000);
    expect(res.model).toBe('charge_balance_ideal');
    expect(Math.abs(res.ph - 6.98)).toBeLessThanOrEqual(0.05);

    const solver = solveAqueousEquilibrium(aq('HCl', 1e-8, 1000), 1000)!;
    expect(Math.abs(solver.chargeResidual_M)).toBeLessThan(1e-12);
  });

  it('tracks temperature dependence of neutral Kw and falls back cleanly for unrecognized solutes', () => {
    const warmWater = calculateSolutionPhWithModel(
      [{ formula: 'H2O', moles: 5.55, mass_g: 100, state: 'l' }],
      100,
      80
    );
    expect(warmWater.model).toBe('charge_balance_ideal');
    expect(warmWater.ph).toBeLessThan(6.5);

    const fecl3 = calculateSolutionPhWithModel(aq('FeCl3', 0.1), 100);
    expect(fecl3.model).toBe('legacy_heuristic');
    expect(fecl3.ph).toBeLessThan(4);
  });
});
