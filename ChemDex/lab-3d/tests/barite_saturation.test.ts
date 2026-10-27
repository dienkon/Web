import { describe, expect, it } from 'vitest';
import { BARITE_KSP_25C, bariteKspAtTemperature, baritePrecipitationExtent } from '../src/science/baritePrecipitation';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { PRECIPITATION_PROGRAMS } from '../src/vfx/programs/library/precipitationPrograms';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';
import { planStudioProgram } from '../src/engine/studioProgram';
import { resolveMixture } from '../src/engine/resolveMixture';

const item = (formula: string, moles: number, phase: SubstanceContent['phase'] = 'aq'): SubstanceContent =>
  ({ formula, moles, phase, mass_g: moles * computeMolarMass(formula) });
const sample = (barium: number, sulfate = barium) =>
  [item('H2O', 5, 'l'), item('BaCl2', barium), item('Na2SO4', sulfate)];
const program = PRECIPITATION_PROGRAMS.find(p => p.id === 'bacl2_na2so4')!;
const vessel = (contents: SubstanceContent[]) => ({ id: 'barite-test', contents,
  substances: contents.map(c => c.formula), volume_ml: 100, capacity_ml: 250, volume: 0.4,
  temperature_c: 25, mass_g: contents.reduce((s, c) => s + c.mass_g, 0), ph: 7,
  liquidColor: '#f8fafc' } as VesselState);

describe('BaSO4 saturation-limited precipitation', () => {
  it('uses the sourced temperature curve without extrapolating beyond the supported range', () => {
    expect(bariteKspAtTemperature(25)).toBe(BARITE_KSP_25C);
    expect(bariteKspAtTemperature(0)! / 3.315461810151494e-11).toBeCloseTo(1, 10);
    expect(bariteKspAtTemperature(50)! / 2.1065137144217577e-10).toBeCloseTo(1, 10);
    expect(bariteKspAtTemperature(80)! / 2.9444851703353374e-10).toBeCloseTo(1, 10);
    for (const t of [-1, 91, NaN, Infinity]) {
      expect(bariteKspAtTemperature(t)).toBeNull();
      expect(baritePrecipitationExtent(sample(1e-4), 100, t)).toBeNull();
    }
  });
  it('changes precipitation and animation eligibility with the actual sample temperature', async () => {
    const cold = vessel(sample(1.3e-6));
    const hot = { ...cold, temperature_c: 50 };
    expect(planStudioProgram(program, cold, 'vi').kinetics).not.toBeNull();
    expect(planStudioProgram(program, hot, 'vi').kinetics).toBeNull();
    expect((await resolveMixture(hot, 'vi', true)).kinetics).toBeNull();
    expect(applyProgramToLedger(program, cold, 1).hasPrecipitate).toBe(true);
    expect(applyProgramToLedger(program, hot, 1).hasPrecipitate).toBe(false);
    const native = executeMultiStepReactions(hot.contents, hot.substances, 100, 50, true, 'vi', { preserveQuantities: true });
    expect(native.hasPrecipitate).toBe(false);
  });
  it('does not launch precipitation animation below saturation or rerun a saturated sample', async () => {
    const dilute = vessel(sample(1e-7));
    expect(planStudioProgram(program, dilute, 'vi').kinetics).toBeNull();
    expect((await resolveMixture(dilute, 'vi', false)).kinetics).toBeNull();
    const initial = vessel(sample(1e-4));
    const end = { ...initial, ...applyProgramToLedger(program, initial, 1) };
    expect(planStudioProgram(program, end, 'vi').kinetics).toBeNull();
  });
  it('rejects undersaturation and retains dissolved ions at saturation', () => {
    expect(baritePrecipitationExtent(sample(1e-7), 100)).toBe(0);
    const extent = baritePrecipitationExtent(sample(1e-4), 100)!;
    expect(extent).toBeCloseTo(1e-4 - 0.1 * Math.sqrt(BARITE_KSP_25C), 13);
    const unequal = baritePrecipitationExtent(sample(1e-4, 2e-4), 100)!;
    expect((1e-4 - unequal) * (2e-4 - unequal) / 0.01).toBeCloseTo(BARITE_KSP_25C, 18);
  });
  it('responds to dilution and common ions without counting existing solid in Q', () => {
    const contents = sample(1e-6);
    expect(baritePrecipitationExtent(contents, 100)).toBe(0);
    expect(baritePrecipitationExtent(contents, 10)).toBeGreaterThan(0);
    expect(baritePrecipitationExtent([...contents, item('BaSO4', 1, 's')], 100)).toBe(0);
    expect(baritePrecipitationExtent([...contents, item('Ba(NO3)2', 1e-4)], 100)).toBeGreaterThan(0);
    expect(baritePrecipitationExtent([...contents, item('HCl', 0.01)], 100)).toBeNull();
  });
  it.each([1e-7, 1e-4])('applies the same finite extent through both chemistry paths (%s mol)', moles => {
    const contents = sample(moles);
    const expected = baritePrecipitationExtent(contents, 100)!;
    const ledger = applyProgramToLedger(program, vessel(contents), 1);
    const native = executeMultiStepReactions(contents, contents.map(c => c.formula), 100, 25, false, 'vi', { preserveQuantities: true });
    for (const output of [ledger.contents!, native.updatedContents]) {
      const solid = output.filter(c => c.formula === 'BaSO4' && c.phase === 's').reduce((s, c) => s + c.moles, 0);
      expect(solid).toBeCloseTo(expected, 12);
      expect(output.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(contents.reduce((s, c) => s + c.mass_g, 0), 8);
    }
    if (expected === 0) {
      expect(ledger.hasPrecipitate).toBeFalsy();
      expect(native.hasPrecipitate).toBeFalsy();
    }
  });
});
