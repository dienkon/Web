import { describe, expect, it } from 'vitest';
import { deriveStandardEnthalpy, formationEnthalpy, sourceProgramThermochemistry } from '../src/science/formationEnthalpy';
import { getProgramById } from '../src/vfx/programs/library';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { computeMolarMass } from '../src/engine/ledger';

describe('Source-reviewed standard thermochemistry', () => {
  it('calculates the same ideal ionic neutralization heat with different spectator salts', () => {
    // OpenStax G: H2O(l) -285.83, OH-(aq) -230.00, H+(aq) 0 kJ/mol.
    for (const id of ['hcl_naoh', 'hno3_koh', 'hno3_naoh']) {
      const p = getProgramById(id)!;
      expect(p.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-55.83, 8);
      expect(p.chemistry.deltaHSourceUrls?.some(url => url.includes('openstax.org'))).toBe(true);
      expect(p.chemistry.deltaHReferenceTemperature_K).toBe(298.15);
    }
    expect(getProgramById('h2so4_naoh')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-111.66, 8);
  });
  it('distinguishes endothermic calcite precipitation from exothermic acid dissolution', () => {
    expect(getProgramById('cacl2_na2co3')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(13.16, 8);
    expect(getProgramById('caco3_hcl')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-15.4, 8);
    expect(getProgramById('caco3_hno3')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-15.4, 8);
    expect(getProgramById('caco3_heat')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(178.49, 8);
  });
  it('does not treat ammonia release with alkali as a mandatory exothermic event', () => {
    expect(getProgramById('nh4cl_naoh')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(30.77, 8);
    expect(getProgramById('nh42so4_naoh')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(61.54, 8);
    expect(getProgramById('nh3_hcl')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-176.223, 8);
  });
  it('assigns liquid water and water vapor different formation enthalpies', () => {
    expect(formationEnthalpy('H2O', 'g')!.value - formationEnthalpy('H2O', 'l')!.value).toBeCloseTo(44.01, 8);
    expect(getProgramById('ethanol_combustion')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-1366.91, 8);
    expect(getProgramById('methane_combustion')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-890.57, 8);
  });
  it('scales enthalpy with coefficients and reverses the sign with reaction direction', () => {
    const p = getProgramById('cacl2_na2co3')!;
    const original = deriveStandardEnthalpy(p.chemistry.species)!;
    const doubled = deriveStandardEnthalpy(p.chemistry.species.map(term => ({ ...term, coeff: term.coeff * 2 })))!;
    const reversed = deriveStandardEnthalpy(p.chemistry.species.map(term => ({ ...term,
      role: term.role === 'reactant' ? 'product' as const : term.role === 'product' ? 'reactant' as const : term.role })))!;
    expect(doubled.value).toBeCloseTo(original.value * 2, 8);
    expect(reversed.value).toBeCloseTo(-original.value, 8);
  });
  it('refuses unknown species, incorrect phases and concentrated-acid substitutions', () => {
    expect(formationEnthalpy('C6H12O6', 'aq')).toBeNull();
    expect(formationEnthalpy('Na', 'g')).toBeNull();
    expect(formationEnthalpy('H2SO4 (conc)', 'aq')).toBeNull();
    const p = structuredClone(getProgramById('h2so4_dilution')!);
    const before = structuredClone(p.chemistry);
    sourceProgramThermochemistry(p);
    expect(p.chemistry).toEqual(before);
    expect(deriveStandardEnthalpy([{ formula: 'Unknown', phase: 'aq', coeff: 1, role: 'reactant' },
      { formula: 'H2O', phase: 'l', coeff: 1, role: 'product' }])).toBeNull();
  });
  it('uses the same sourced heat in native quantitative mixing and program playback', () => {
    const contents = ['HCl', 'NaOH'].map(formula => ({ formula, phase: 'aq', moles: 0.001, mass_g: 0.001 * computeMolarMass(formula) }));
    contents.push({ formula: 'H2O', phase: 'l', moles: 50 / 18.015, mass_g: 50 });
    const result = executeMultiStepReactions(contents, contents.map(x => x.formula), 50, 25, false, 'en', { preserveQuantities: true });
    expect(result.reactionsOccurred[0].deltaH_kJ).toBe(getProgramById('hcl_naoh')!.chemistry.deltaH_kJ_per_mol);
    expect(result.finalTemperature_c).toBeGreaterThan(25);
  });
});
