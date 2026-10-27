import { describe, it, expect } from 'vitest';
import { suspensionFluidProperties } from '../src/science/suspensionFluid';
import type { SubstanceContent } from '../src/types/chemistry';
const water: SubstanceContent = { formula: 'H2O', phase: 'l', mass_g: 99, moles: 99 / 18.015 };
describe('Fluid properties supplied to sedimentation', () => {
  it('uses the independent IAPWS 298.15 K viscosity verification value', () => {
    const result = suspensionFluidProperties([water], 100, 25);
    expect(result.viscosity_mPa_s).toBeCloseTo(0.889996774, 8);
    expect(result.viscosityModel).toBe('iapws_pure_water');
    expect(result.density_g_ml).toBe(0.99);
  });
  it('counts actual liquid mass once, excluding precipitate, gas and filter cake', () => {
    const solute = { formula: 'NaCl', phase: 'aq', mass_g: 1, moles: 1 / 58.44 };
    const result = suspensionFluidProperties([water, solute,
      { ...solute, phase: 's', mass_g: 20 }, { ...solute, phase: 'g', mass_g: 10 },
      { ...solute, location: 'filter', mass_g: 10 }], 100, 25);
    expect(result.density_g_ml).toBe(1);
    expect(result.densityModel).toBe('liquid_inventory');
    expect(result.viscosityModel).toBe('aqueous_water_proxy');
    expect(result.viscosity_mPa_s).toBeCloseTo(0.889996774, 8);
  });
  it('labels unsupported temperatures and non-water solvents as reference proxies', () => {
    expect(suspensionFluidProperties([water], 100, 150).viscosityModel).toBe('reference_water_proxy');
    const ethanol = { ...water, formula: 'C2H5OH', mass_g: 79 };
    const result = suspensionFluidProperties([ethanol], 100, 25);
    expect(result.viscosityModel).toBe('reference_water_proxy');
    expect(result.density_g_ml).toBe(0.79);
    expect(suspensionFluidProperties([], 0, NaN).densityModel).toBe('reference_water_proxy');
  });
});
