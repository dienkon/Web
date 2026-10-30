import { describe, expect, it } from 'vitest';
import { ferricChlorideAqueousState, ferricHydroxideExtent, ferricHydroxideKsp } from '../src/science/ferricHydroxidePrecipitation';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { getProgramById } from '../src/vfx/programs/library';
import { planStudioProgram } from '../src/engine/studioProgram';
import { projectAqueousSolution } from '../src/engine/aqueousProjection';
import type { VesselState } from '../src/types/chemistry';

const sample = (n: number, ratio = 3) => {
  const contents = [{ formula: 'H2O', phase: 'l', moles: 5, mass_g: 5 * computeMolarMass('H2O') },
    ...[['FeCl3', n], ['NaOH', ratio * n]].map(([f, m]) => ({ formula: String(f), phase: 'aq',
      moles: Number(m), mass_g: Number(m) * computeMolarMass(String(f)) }))];
  return { id: 'ferric-test', contents, substances: contents.map(c => c.formula), volume_ml: 100,
    capacity_ml: 250, temperature_c: 25, ph: 7, mass_g: contents.reduce((s, c) => s + c.mass_g, 0) } as VesselState;
};

describe('Fresh amorphous ferric hydroxide saturation', () => {
  it('does not create visible floc or start Studio kinetics for an undersaturated trace', () => {
    const v = sample(1e-12), program = getProgramById('fecl3_naoh')!;
    expect(ferricHydroxideExtent(v.contents, 100, 25)).toBe(0);
    expect(planStudioProgram(program, v, 'vi').kinetics).toBeNull();
    expect(applyProgramToLedger(program, v, 1).contents!.some(c => c.formula === 'Fe(OH)3' && c.moles > 0)).toBe(false);
  });

  it('limits both paths, conserves inventory and stops the isothermal ledger at saturation', () => {
    const v = sample(1e-4), program = getProgramById('fecl3_naoh')!;
    const expected = ferricHydroxideExtent(v.contents, 100, 25)!;
    expect(expected).toBeGreaterThan(0);
    expect(expected).toBeLessThan(1e-4);
    const ledger = applyProgramToLedger(program, v, 1, { deferThermal: true });
    const native = executeMultiStepReactions(v.contents, v.substances, 100, 25, false, 'vi', { preserveQuantities: true });
    for (const contents of [ledger.contents!, native.updatedContents]) {
      const solid = contents.filter(c => c.formula === 'Fe(OH)3').reduce((s, c) => s + c.moles, 0);
      expect(solid).toBeGreaterThan(0);
      expect(solid).toBeLessThanOrEqual(1e-4);
      expect(contents.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(v.mass_g, 8);
      const chloride = contents.reduce((s, c) => s + (c.formula === 'FeCl3' ? 3 : c.formula === 'NaCl' ? 1 : 0) * c.moles, 0);
      expect(chloride).toBeCloseTo(3e-4, 12);
    }
    const state = ferricChlorideAqueousState(ledger.contents!, 100, 25)!;
    expect(state.freeIron_M * state.hydroxide_M ** 3 / ferricHydroxideKsp(25)!).toBeCloseTo(1, 5);
    expect(ferricHydroxideExtent(ledger.contents!, 100, 25)).toBe(0);
    const nativeState = ferricChlorideAqueousState(native.updatedContents, 100, native.finalTemperature_c)!;
    expect(native.finalPh).toBeCloseTo(nativeState.ph, 10);
  });

  it.each([0, 25, 60, 90])('balances dissolved iron, chloride and charge at %s C', temperature => {
    for (const ratio of [0, 1, 3, 6]) {
      const v = sample(1e-4, ratio);
      v.contents.push({ formula: 'NaCl', phase: 'aq', moles: 5e-4, mass_g: 5e-4 * computeMolarMass('NaCl') });
      const state = ferricChlorideAqueousState(v.contents, 100, temperature)!;
      expect(state).not.toBeNull();
      for (const amount of [state.freeIron_M, state.hydrolyzedIron_M, state.complexedIron_M,
        state.freeChloride_M, state.boundChloride_M]) {
        expect(Number.isFinite(amount)).toBe(true);
        expect(amount).toBeGreaterThanOrEqual(0);
      }
      expect(state.freeIron_M + state.hydrolyzedIron_M + state.complexedIron_M).toBeCloseTo(0.001, 12);
      expect(state.freeChloride_M + state.boundChloride_M).toBeCloseTo(0.008, 12);
      expect(Math.abs(state.chargeResidual_M)).toBeLessThan(1e-11);
      const h = 10 ** -state.ph;
      const thermal = (enthalpy: number) => Math.exp(enthalpy * 4184 / 8.314462618
        * (1 / 298.15 - 1 / (temperature + 273.15)));
      expect(state.dimer_M * h ** 2 / state.freeIron_M ** 2 / (10 ** -2.95 * thermal(13.5))).toBeCloseTo(1, 10);
      expect(state.trimer_M * h ** 4 / state.freeIron_M ** 3 / (10 ** -6.3 * thermal(14.3))).toBeCloseTo(1, 10);
    }
  });

  it('projects the acid pH of ferric chloride without consuming material', () => {
    const v = sample(1e-4, 0), before = structuredClone(v.contents);
    const state = ferricChlorideAqueousState(v.contents, 100, 25)!;
    expect(state.ph).toBeLessThan(7);
    expect(state.freeIron_M).toBeLessThan(0.001);
    expect(state.complexedIron_M).toBeGreaterThan(0);
    expect(state.dimer_M).toBeGreaterThan(0);
    expect(state.trimer_M).toBeGreaterThan(0);
    expect(projectAqueousSolution(v)?.ph).toBeCloseTo(state.ph, 10);
    expect(v.contents).toEqual(before);
    expect(Math.log10(ferricHydroxideKsp(25)!)).toBeCloseTo(-37.109, 10);
  });

  it('rejects other ligands, oxidation states and unsupported locations', () => {
    const v = sample(1e-4);
    for (const formula of ['NH3', 'HCl', 'FeCl2', 'Na2SO4']) {
      expect(ferricHydroxideExtent([...v.contents, { formula, phase: 'aq', moles: 0.001, mass_g: 0.1 }], 100, 25)).toBeNull();
    }
    expect(ferricHydroxideExtent(v.contents.map(c => ({ ...c, location: 'filter' as const })), 100, 25)).toBeNull();
  });

  it('recovers an independently constructed polynuclear equilibrium at pH 4', () => {
    // Reference state at 25 C: free Fe3+=1e-5 M, H+=1e-4 M, Cl-=0.01 M.
    // Apply the source equilibrium laws, then analytical mass/charge sums to
    // obtain these formula-unit totals; the solver must recover that state.
    const v = sample(0);
    const concentrations = { FeCl3: 0.0028370015413588974,
      NaOH: 0.0048723291530557225, NaCl: 0.001492285524909093 };
    v.contents = [v.contents[0], ...Object.entries(concentrations).map(([formula, concentration]) => ({
      formula, phase: 'aq', moles: concentration * 0.1,
      mass_g: concentration * 0.1 * computeMolarMass(formula),
    }))];
    const state = ferricChlorideAqueousState(v.contents, 100, 25)!;
    expect(state.ph).toBeCloseTo(4, 10);
    expect(state.freeIron_M / 1e-5).toBeCloseTo(1, 10);
    expect(state.freeChloride_M).toBeCloseTo(0.01, 12);
    expect(state.dimer_M / 0.000011220184543019632).toBeCloseTo(1, 10);
    expect(state.trimer_M / 0.000005011872336272725).toBeCloseTo(1, 10);
    expect(state.freeIron_M + state.hydrolyzedIron_M + state.complexedIron_M)
      .toBeCloseTo(concentrations.FeCl3, 12);
    expect(Math.abs(state.chargeResidual_M)).toBeLessThan(1e-12);
  });
});
