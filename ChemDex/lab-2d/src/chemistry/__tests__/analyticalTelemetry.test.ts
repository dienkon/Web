import { describe, expect, it } from 'vitest';
import {
  calculateSolutionConductivity,
  calculateUvVisSpectrum,
} from '../equilibrium/analyticalTelemetry';
import { SubstanceQuantity } from '../../types/chemistry';

function makeAqueous(solutes: Array<{ formula: string; moles: number }>, volume_ml = 1000): SubstanceQuantity[] {
  return [
    { formula: 'H2O', moles: volume_ml / 18.015, mass_g: volume_ml, state: 'l' },
    ...solutes.map((s) => ({
      formula: s.formula,
      moles: s.moles,
      mass_g: s.moles * 50,
      state: 'aq' as const,
    })),
  ];
}

describe('Analytical Telemetry: Kohlrausch Conductivity & Virtual UV-Vis', () => {
  it('reproduces ultrapure water conductivity (~0.055 uS/cm) at 25 C', () => {
    const res = calculateSolutionConductivity(makeAqueous([], 1000), 1000, 25);
    expect(res.electrolyteClass).toBe('pure_water');
    expect(res.conductivity_uS_cm).toBeCloseTo(0.0548, 2);
    expect(res.ionicStrength_M).toBeCloseTo(1e-7, 9);
  });

  it('orders conductivity: 0.1 M HCl > 0.1 M NaCl >> 0.1 M CH3COOH > 0.1 M ethanol', () => {
    const hcl = calculateSolutionConductivity(makeAqueous([{ formula: 'HCl', moles: 0.1 }]), 1000, 25);
    const nacl = calculateSolutionConductivity(makeAqueous([{ formula: 'NaCl', moles: 0.1 }]), 1000, 25);
    const acoh = calculateSolutionConductivity(makeAqueous([{ formula: 'CH3COOH', moles: 0.1 }]), 1000, 25);
    const etoh = calculateSolutionConductivity(makeAqueous([{ formula: 'C2H5OH', moles: 0.1 }]), 1000, 25);

    expect(hcl.electrolyteClass).toBe('strong');
    expect(nacl.electrolyteClass).toBe('strong');
    expect(acoh.electrolyteClass).toBe('weak');
    expect(etoh.electrolyteClass).toBe('non_electrolyte');

    // Textbook CRC 25 C references: 0.1 M NaCl ~10.7 mS/cm, 0.1 M HCl ~39 mS/cm, 0.1 M CH3COOH ~0.5 mS/cm
    expect(nacl.conductivity_mS_cm).toBeGreaterThan(9.5);
    expect(nacl.conductivity_mS_cm).toBeLessThan(12.0);
    expect(hcl.conductivity_mS_cm).toBeGreaterThan(33);
    expect(hcl.conductivity_mS_cm).toBeLessThan(43);
    expect(acoh.conductivity_mS_cm).toBeGreaterThan(0.2);
    expect(acoh.conductivity_mS_cm).toBeLessThan(1.5);
    expect(hcl.conductivity_mS_cm).toBeGreaterThan(nacl.conductivity_mS_cm * 2.5);
    expect(nacl.conductivity_mS_cm).toBeGreaterThan(acoh.conductivity_mS_cm * 10);
    expect(etoh.conductivity_mS_cm).toBeLessThan(0.01);
  });

  it('increases ionic conductivity when solution is heated from 20 C to 60 C', () => {
    const sample = makeAqueous([{ formula: 'KCl', moles: 0.1 }]);
    const cool = calculateSolutionConductivity(sample, 1000, 20);
    const warm = calculateSolutionConductivity(sample, 1000, 60);
    expect(warm.conductivity_mS_cm).toBeGreaterThan(cool.conductivity_mS_cm * 1.4);
  });

  it('captures V-shaped conductometric titration minimum at HCl + NaOH equivalence', () => {
    const makeTitrationState = (naohMoles: number) =>
      makeAqueous([
        { formula: 'HCl', moles: Math.max(0, 0.01 - naohMoles) },
        { formula: 'NaCl', moles: Math.min(0.01, naohMoles) },
        { formula: 'NaOH', moles: Math.max(0, naohMoles - 0.01) },
      ], 100 + naohMoles * 1000);

    const kStart = calculateSolutionConductivity(makeTitrationState(0), 100, 25).conductivity_mS_cm;
    const kEq = calculateSolutionConductivity(makeTitrationState(0.01), 110, 25).conductivity_mS_cm;
    const kExcess = calculateSolutionConductivity(makeTitrationState(0.02), 120, 25).conductivity_mS_cm;

    expect(kStart).toBeGreaterThan(kEq * 2);
    expect(kExcess).toBeGreaterThan(kEq * 1.4);
  });

  it('computes characteristic Beer-Lambert UV-Vis spectra for KMnO4, CuSO4, and pH indicators', () => {
    const kmno4 = calculateUvVisSpectrum(makeAqueous([{ formula: 'KMnO4', moles: 0.0005 }], 1000), 1000, 7);
    expect(kmno4.hasAbsorption).toBe(true);
    expect(kmno4.lambdaMax_nm).toBeGreaterThanOrEqual(520);
    expect(kmno4.lambdaMax_nm).toBeLessThanOrEqual(550);
    expect(kmno4.peakAbsorbance).toBeGreaterThan(0.8);
    expect(kmno4.points).toHaveLength(69); // 380..720 nm in 5 nm step

    const cuso4 = calculateUvVisSpectrum(makeAqueous([{ formula: 'CuSO4', moles: 0.1 }], 1000), 1000, 5.5);
    expect(cuso4.hasAbsorption).toBe(true);
    expect(cuso4.lambdaMax_nm).toBeGreaterThan(670);

    const ppAcid = calculateUvVisSpectrum(
      makeAqueous([{ formula: 'Phenolphthalein', moles: 0.0001 }], 1000),
      1000,
      3.0
    );
    const ppBase = calculateUvVisSpectrum(
      makeAqueous([{ formula: 'Phenolphthalein', moles: 0.0001 }], 1000),
      1000,
      11.0
    );
    expect(ppAcid.peakAbsorbance).toBeLessThan(0.05);
    expect(ppBase.hasAbsorption).toBe(true);
    expect(ppBase.lambdaMax_nm).toBe(555); // closest 5 nm grid point to 553 nm

    const water = calculateUvVisSpectrum(makeAqueous([], 1000), 1000, 7.0);
    expect(water.hasAbsorption).toBe(false);
    expect(water.lambdaMax_nm).toBeNull();
  });
});
