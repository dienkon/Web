import { describe, expect, it } from 'vitest';
import { magnesiumHydroxideExtent, bruciteKsp } from '../src/science/magnesiumHydroxidePrecipitation';
import { getProgramById } from '../src/vfx/programs/library';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { planStudioProgram } from '../src/engine/studioProgram';
import { projectAqueousSolution } from '../src/engine/aqueousProjection';
import { aqueousConstantsAtTemperature } from '../src/science/aqueousTemperature';
import type { VesselState } from '../src/types/chemistry';
const sample = (n: number) => ({ id: 'mg-test', volume_ml: 100, capacity_ml: 250,
  temperature_c: 25, ph: 7, mass_g: 100 + n * (95.211 + 2 * 39.997),
  contents: [{ formula: 'H2O', phase: 'l', moles: 100 / 18.015, mass_g: 100 },
    ...[['MgCl2', n], ['NaOH', n * 2]].map(([f, m]) => ({ formula: String(f), phase: 'aq',
      moles: Number(m), mass_g: Number(m) * computeMolarMass(String(f)) }))] } as VesselState);
const program = getProgramById('mgcl2_naoh')!;
describe('Magnesium hydroxide supersaturation', () => {
  it('does not precipitate or launch a reaction in a sufficiently dilute mixture', () => {
    const v = sample(1e-7);
    expect(magnesiumHydroxideExtent(v.contents, 100, 25)).toBe(0);
    expect(applyProgramToLedger(program, v, 1).hasPrecipitate).toBeFalsy();
    expect(planStudioProgram(program, v, 'vi').kinetics).toBeNull();
  });
  it('retains dissolved Mg and hydroxide at the measured reference product', () => {
    const v = sample(1e-3), x = magnesiumHydroxideExtent(v.contents, 100, 25)!;
    const mg = (1e-3 - x) / 0.1, alk = 2 * mg;
    const oh = (alk + Math.sqrt(alk ** 2 + 4e-14)) / 2;
    expect(mg * oh ** 2 / bruciteKsp(25)!).toBeCloseTo(1, 9);
    const patch = applyProgramToLedger(program, v, 1);
    expect(patch.contents!.find(c => c.formula === 'Mg(OH)2')!.moles).toBeCloseTo(x, 12);
    const end = { ...v, ...patch };
    const remainingBase = end.contents.find(c => c.formula === 'NaOH')!.moles / 0.1;
    expect(end.ph).toBeGreaterThan(9);
    // Use the post-reaction temperature's Kw; the heat step changes T.
    expect(end.phReferenceTemperature_c).toBe(end.temperature_c);
    expect(remainingBase).toBeGreaterThan(0);
    const kw = aqueousConstantsAtTemperature(end.temperature_c)!.waterKw;
    const currentOh = (remainingBase + Math.sqrt(remainingBase ** 2 + 4 * kw)) / 2;
    expect(end.ph).toBeCloseTo(-Math.log10(kw / currentOh), 10);
    expect(projectAqueousSolution(end)).toBeNull();
    expect(patch.contents!.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(v.contents.reduce((s, c) => s + c.mass_g, 0), 9);
  });
  it('uses the sourced temperature points and refuses unsupported mixtures', () => {
    expect(-Math.log10(bruciteKsp(25)!)).toBe(10.88);
    expect(-Math.log10(bruciteKsp(90)!)).toBe(11.10);
    expect(bruciteKsp(9)).toBeNull();
    const v = sample(1e-3);
    expect(magnesiumHydroxideExtent([...v.contents, { formula: 'NH3', phase: 'aq', moles: 0.01, mass_g: 0.17 }], 100, 25)).toBeNull();
  });
});
