import { describe, expect, it } from 'vitest';
import { partitionCalciumHydroxide, PORTLANDITE_KSP_25C, portlanditeKspAtTemperature, portlanditeDissolutionEnthalpy_J_mol } from '../src/engine/calciumHydroxidePhase';
import { sampleHeatCapacity } from '../src/engine/thermalState';
import { aqueousConstantsAtTemperature } from '../src/science/aqueousTemperature';
import { projectAqueousSolution } from '../src/engine/aqueousProjection';
import { supernatantColor } from '../src/science/supernatantAppearance';
import type { VesselState } from '../src/types/chemistry';
const sample = (mass = 1) => ({ id: 'lime', temperature_c: 25, volume_ml: 100,
  capacity_ml: 250, mass_g: 100 + mass, ph: 7, contents: [
    { formula: 'H2O', phase: 'l', moles: 100 / 18.015, mass_g: 100 },
    { formula: 'Ca(OH)2', phase: 's', moles: mass / 74.092, mass_g: mass }] } as VesselState);
const finish = (v: VesselState) => {
  for (let i = 0; i < 1000; i++) v = { ...v, ...partitionCalciumHydroxide(v, 0.1) };
  return v;
};
describe('Limewater and milk of lime remain distinct', () => {
  it('uses dissolution heat consistent with the derivative of its own Ksp curve', () => {
    for (const t of [10, 25, 60, 80]) {
      const derivative = (Math.log(portlanditeKspAtTemperature(t + 0.001)!)
        - Math.log(portlanditeKspAtTemperature(t - 0.001)!)) / 0.002;
      const independentHeat = 8.314462618 * (t + 273.15) ** 2 * derivative;
      expect(portlanditeDissolutionEnthalpy_J_mol(t)! / independentHeat).toBeCloseTo(1, 7);
    }
    const v = sample(), end = { ...v, ...partitionCalciumHydroxide(v, 0.1) };
    const dissolved = end.contents.find(c => c.phase === 'aq')!.moles;
    expect(end.temperature_c).toBeGreaterThan(v.temperature_c);
    expect((end.temperature_c - v.temperature_c) * sampleHeatCapacity(end))
      .toBeCloseTo(-dissolved * portlanditeDissolutionEnthalpy_J_mol(25)!, 8);
  });
  it.each(['NaOH', 'KOH', 'CaCl2'])('suppresses dissolution with %s while preserving the added salt', formula => {
    const pure = finish(sample());
    const v = sample();
    const salt = { formula, phase: 'aq' as const, moles: 0.01, mass_g: 1 };
    v.contents.push(salt);
    const end = finish(v);
    expect(end.precipitateAmount_g!).toBeGreaterThan(pure.precipitateAmount_g!);
    expect(end.contents.find(c => c.formula === formula)).toEqual(salt);
    const oh = aqueousConstantsAtTemperature(end.temperature_c)!.waterKw / 10 ** -end.ph;
    const ca = end.contents.find(c => c.formula === 'Ca(OH)2' && c.phase === 'aq')!.moles / 0.1
      + (formula === 'CaCl2' ? salt.moles / 0.1 : 0);
    expect(ca * oh * oh / portlanditeKspAtTemperature(end.temperature_c)!).toBeCloseTo(1, 6);
    expect(end.contents.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(102, 12);
  });
  it('does not consume supersaturated background salts through a phase-only transaction', () => {
    const v = sample();
    for (const formula of ['CaCl2', 'NaOH']) v.contents.push({ formula, phase: 'aq', moles: 0.01, mass_g: 1 });
    expect(partitionCalciumHydroxide(v, 1)).toBeNull();
  });
  it('precipitates more on heating and redissolves on cooling with temperature-consistent pH', () => {
    const cold = finish(sample());
    const hot = finish({ ...cold, temperature_c: 60 });
    expect(hot.precipitateAmount_g!).toBeGreaterThan(cold.precipitateAmount_g!);
    const ca = hot.contents.find(c => c.phase === 'aq')!.moles / 0.1;
    const hydrogen = 10 ** -hot.ph;
    const oh = aqueousConstantsAtTemperature(hot.temperature_c)!.waterKw / hydrogen;
    expect(ca * oh ** 2 / portlanditeKspAtTemperature(hot.temperature_c)!).toBeCloseTo(1, 6);
    const back = finish({ ...JSON.parse(JSON.stringify(hot)), temperature_c: 25 });
    expect(back.precipitateAmount_g!).toBeLessThan(hot.precipitateAmount_g!);
    expect(portlanditeKspAtTemperature(25)).toBeCloseTo(PORTLANDITE_KSP_25C, 15);
    expect(portlanditeKspAtTemperature(100)).toBeNull();
  });
  it('retains excess lime while its supernatant reaches saturation and alkaline pH', () => {
    const v = finish(sample());
    const c = v.contents.find(c => c.phase === 'aq')!.moles / 0.1;
    const oh = aqueousConstantsAtTemperature(v.temperature_c)!.waterKw / 10 ** -v.ph;
    expect(c * oh * oh / portlanditeKspAtTemperature(v.temperature_c)!).toBeCloseTo(1, 6);
    expect(v.hasPrecipitate).toBe(true);
    expect(v.ph).toBeGreaterThan(12);
    expect(projectAqueousSolution(v)).toBeNull();
    expect(partitionCalciumHydroxide(v, 0.1)).toBeNull();
    expect(supernatantColor(v.contents, 100)).toBe('#f8fafc');
    expect(v.contents.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(101, 12);
  });
  it('fully dissolves a small quantity and dissolves more after dilution', () => {
    const tiny = finish(sample(0.01));
    expect(tiny.precipitateAmount_g).toBe(0);
    const normal = finish(sample());
    const dilute = finish({ ...normal, volume_ml: 200 });
    expect(dilute.precipitateAmount_g!).toBeLessThan(normal.precipitateAmount_g!);
    expect(dilute.contents.filter(c => c.formula === 'Ca(OH)2').reduce((s, c) => s + c.moles, 0)).toBeCloseTo(1 / 74.092, 12);
  });
  it('does not manufacture carbonate or relocate filter cake, and refuses unsupported conditions', () => {
    const v = sample();
    v.contents[1].location = 'filter';
    expect(partitionCalciumHydroxide(v, 1)).toBeNull();
    expect(partitionCalciumHydroxide({ ...sample(), temperature_c: 100 }, 1)).toBeNull();
    const gas = sample();
    gas.contents.push({ formula: 'CO2', phase: 'g', moles: 0.001, mass_g: 0.044 });
    expect(partitionCalciumHydroxide(gas, 1)).toBeNull();
    expect(finish(sample()).contents.some(c => c.formula === 'CaCO3')).toBe(false);
  });
});
