import { describe, expect, it } from 'vitest';
import { deriveStandardEnthalpy, formationEnthalpy, sourceProgramThermochemistry } from '../src/science/formationEnthalpy';
import { getProgramById } from '../src/vfx/programs/library';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import type { VesselState } from '../src/types/chemistry';

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
  it('uses phase-specific NIST references for oxide, hydroxide precipitation and solid dissolution', () => {
    expect(getProgramById('mg_o2_burn')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-1203.2, 8);
    expect(getProgramById('cuso4_naoh')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-55.14, 8);
    // Mg(OH)2 precipitation is slightly endothermic under this dilute
    // standard-state reference, rather than the legacy -22 kJ event.
    expect(getProgramById('mgcl2_naoh')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(2.24, 8);
    expect(getProgramById('naoh_dissolution')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-44.17, 8);
    expect(getProgramById('cacl2_dissolution')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-81.56, 8);
    expect(formationEnthalpy('MgO', 'aq')).toBeNull();
    expect(formationEnthalpy('NaOH', 'g')).toBeNull();
  });
  it('does not charge water vaporization twice in copper hydroxide decomposition', () => {
    const p = getProgramById('cuoh2_decomp')!;
    expect(p.chemistry.deltaH_kJ_per_mol).toBeCloseTo(7.24, 8);
    const vapor = deriveStandardEnthalpy(p.chemistry.species.map(s => s.formula === 'H2O' ? { ...s, phase: 'g' as const } : s))!;
    expect(vapor.value).toBeCloseTo(51.25, 8);
    expect(vapor.value - p.chemistry.deltaH_kJ_per_mol!).toBeCloseTo(44.01, 8);
  });
  it('gives duplicate chromate precipitation programs the same sourced heat', () => {
    for (const id of ['k2cro4_agno3', 'agno3_k2cro4']) {
      expect(getProgramById(id)!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-61.74, 8);
      expect(getProgramById(id)!.chemistry.deltaHSourceUrls?.some(url => url.includes('jpcrdS2Vol11.pdf#page=208'))).toBe(true);
    }
    expect(getProgramById('pbno32_k2cro4')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-48, 8);
    expect(getProgramById('pbno32_na2so4')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-8.94, 8);
    expect(getProgramById('k2cro4_bacl2')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-27.2, 8);
    expect(getProgramById('k2cro4_bacl2')!.chemistry.deltaH_kJ_per_mol).toBe(getProgramById('bacl2_k2cro4')!.chemistry.deltaH_kJ_per_mol);
  });
  it('distinguishes dissolved halogens and weak aqueous ammonia from gas or elemental references', () => {
    expect(formationEnthalpy('Cl2', 'aq')!.value).toBe(-23.4);
    expect(formationEnthalpy('Cl2', 'g')!.value).toBe(0);
    expect(formationEnthalpy('I2', 'aq')!.value).toBe(22.6);
    expect(formationEnthalpy('I2', 's')!.value).toBe(0);
    expect(formationEnthalpy('NH3', 'aq')!.value).toBe(-80.29);
    expect(getProgramById('h2so4_nh3')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-104.42, 8);
    expect(getProgramById('cl2_kbr')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-71.79, 8);
    expect(getProgramById('cl2_kbr')!.chemistry.deltaH_kJ_per_mol).toBe(getProgramById('kbr_cl2')!.chemistry.deltaH_kJ_per_mol);
    expect(getProgramById('fecl3_ki')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(51.78, 8);
  });
  it('does not assign exothermic legacy signs to sourced sulfite acidification or silver complex dissolution', () => {
    expect(getProgramById('na2so3_hcl')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(52.84, 8);
    expect(getProgramById('agcl_nh3')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(9.09, 8);
    expect(getProgramById('agi_na2s2o3')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(17.95, 8);
    expect(getProgramById('na2s2o3_i2')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-60.18, 8);
    expect(getProgramById('naclo_hcl_chlorine')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-11.53, 8);
    expect(getProgramById('h2o2_kmno4')!.chemistry.deltaH_kJ_per_mol).toBeCloseTo(-416.67, 8);
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
  it.each(['mgcl2_naoh', 'fecl3_ki', 'agcl_nh3'])('%s consumes heat in actual ledger playback while preserving sample mass', id => {
    const program = getProgramById(id)!;
    const contents = program.chemistry.species.filter(s => s.role === 'reactant').map(s => ({ formula: s.formula,
      phase: s.phase, moles: s.coeff * 0.001, mass_g: s.coeff * 0.001 * computeMolarMass(s.formula) }));
    contents.push({ formula: 'H2O', phase: 'l', moles: 50 / 18.015, mass_g: 50 });
    const sample: VesselState = { id: 'heat-check', name: 'Heat check', type: 'beaker', capacity_ml: 100,
      position: [0, 0, 0], rotationY: 0, isLocked: false, volume_ml: 50, volume: 0.5,
      mass_g: contents.reduce((sum, c) => sum + c.mass_g, 0), contents, substances: contents.map(c => c.formula),
      temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false };
    const after = applyProgramToLedger(program, sample, 1);
    expect(after.programHeatApplied_J!).toBeLessThan(0);
    expect(after.temperature_c!).toBeLessThan(25);
    expect(after.mass_g).toBeCloseTo(sample.mass_g, 9);
    expect(after.contents!.reduce((sum, c) => sum + c.mass_g, 0)).toBeCloseTo(sample.mass_g, 8);
  });
});
