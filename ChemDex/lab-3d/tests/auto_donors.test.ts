import { describe, expect, it } from 'vitest';
import { automaticDonors } from '../src/vfx/autoplay/autoDonors';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library';
import type { SubstanceContent } from '../src/types/chemistry';

const program = ALL_HANDCRAFTED_PROGRAMS.find(item => item.id === 'h2so4_dilution')!;
const mass = (formula: string, moles: number, mass_g: number, phase: string, concentration_M?: number): SubstanceContent => ({
  formula, moles, mass_g, phase, concentration_M,
});

describe('automatic finite donor preparation', () => {
  it('honors acid grade and uses its authored water only once', () => {
    const contents = [mass('H2SO4 (conc)', 0.001, 0.098079, 'aq'), mass('H2O', 0.1, 1.8015, 'l')];
    const plan = automaticDonors(contents, program);
    const acid = plan.donors.find(donor => donor.row.formula.includes('H2SO4'))!;
    const water = plan.donors.find(donor => donor.row.formula === 'H2O')!;

    expect(acid.solutionVolume_ml).toBeCloseTo(0.001 / 18 * 1000, 8);
    expect(acid.components.some(component => component.formula === 'H2O' && component.mass_g > 0)).toBe(true);
    expect(water.totalMass_g).toBeCloseTo(plan.freeWater_g, 10);
    expect(plan.waterAllocated_g + plan.freeWater_g).toBeCloseTo(1.8015, 10);
    expect(plan.donors.reduce((sum, donor) => sum + donor.totalMass_g, 0))
      .toBeCloseTo(contents.reduce((sum, row) => sum + row.mass_g, 0), 10);
  });

  it('uses the dilute sulfuric stock for an explicitly dilute reagent', () => {
    const contents = [mass('H2SO4 (dil)', 0.001, 0.098079, 'aq'), mass('H2O', 1 / 18.015, 1, 'l')];
    const plan = automaticDonors(contents, program);
    const acid = plan.donors.find(donor => donor.row.formula.includes('H2SO4'))!;

    expect(acid.solutionVolume_ml).toBeCloseTo(1, 8);
    expect(acid.totalMass_g).toBeCloseTo(1.06, 8);
  });

  it('allocates authored solvent to concentrated liquid acid stock rows', () => {
    const contents = [mass('H2SO4 (conc)', 0.001, 0.098079, 'l'), mass('H2O', 0.1, 1.8015, 'l')];
    const concentrated = ALL_HANDCRAFTED_PROGRAMS.find(item => item.id === 'water_into_h2so4')!;
    const plan = automaticDonors(contents, concentrated);
    const acid = plan.donors.find(donor => donor.row.formula.includes('H2SO4'))!;

    expect(acid.row.phase).toBe('l');
    expect(acid.solutionVolume_ml).toBeCloseTo(0.001 / 18 * 1000, 8);
    expect(acid.components.some(component => component.formula === 'H2O' && component.mass_g > 0)).toBe(true);
    expect(plan.donors.reduce((sum, donor) => sum + donor.totalMass_g, 0)).toBeCloseTo(1.899579, 8);
  });

  it('caps stock carrier water at the authored solvent inventory', () => {
    const contents = [mass('CuSO4', 0.002, 0.319218, 'aq'), mass('H2O', 1 / 18.015, 1, 'l')];
    const plan = automaticDonors(contents, program);
    const copper = plan.donors.find(donor => donor.row.formula === 'CuSO4')!;

    expect(copper.components.some(component => component.formula === 'H2O' && component.mass_g > 0)).toBe(true);
    expect(plan.waterAllocated_g).toBeCloseTo(1, 10);
    expect(plan.freeWater_g).toBe(0);
    expect(plan.donors.reduce((sum, donor) => sum + donor.totalMass_g, 0)).toBeCloseTo(1.319218, 10);
    expect(copper.row.concentration_M).toBeGreaterThan(0.5);
  });

  it('prepares unknown aqueous species from a finite fallback solvent share', () => {
    const contents = [mass('Xq', 0.001, 0.1, 'aq'), mass('H2O', 10 / 18.015, 10, 'l')];
    const plan = automaticDonors(contents, program);
    const unknown = plan.donors.find(donor => donor.row.formula === 'Xq')!;

    expect(unknown.components.some(component => component.formula === 'H2O')).toBe(true);
    expect(unknown.solutionVolume_ml).toBeGreaterThan(0.1);
    expect(unknown.row.concentration_M).toBeGreaterThan(0);
    expect(plan.donors.reduce((sum, donor) => sum + donor.totalMass_g, 0)).toBeCloseTo(10.1, 10);
  });
});
