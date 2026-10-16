import { afterEach, describe, expect, it } from 'vitest';
import { ALL_HANDCRAFTED_PROGRAMS, getProgramById } from '../src/vfx/programs/library';
import { LESSON_PROGRAM_IDS } from '../src/lesson/programCompiler';
import { createStudioSample, planStudioProgram, studioProgramForReaction } from '../src/engine/studioProgram';
import { useAppStore } from '../src/store/useAppStore';
import { computeMolarMass } from '../src/engine/ledger';
import { readComposition } from '../src/science/balance';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const shell: VesselState = { id: 'studio_shell', name: 'Empty', type: 'beaker', position: [0, 0, 0], rotationY: 0,
  capacity_ml: 100, isLocked: false, volume_ml: 0, volume: 0, mass_g: 0, contents: [], substances: [],
  temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false };
const before = useAppStore.getState();
afterEach(() => useAppStore.setState(before));
const ordinary = ALL_HANDCRAFTED_PROGRAMS.filter(program => !LESSON_PROGRAM_IDS.has(program.id)
  && program.chemistry.representation !== 'emission');
function setup() {
  useAppStore.setState({ vessels: { [shell.id]: shell }, vesselIds: [shell.id], burners: {},
    activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: true, mixError: null });
}
function atoms(contents: SubstanceContent[]) {
  const result: Record<string, number> = {};
  for (const item of contents) for (const [element, amount] of Object.entries(readComposition(item.formula).atoms)) {
    result[element] = (result[element] ?? 0) + amount * item.moles;
  }
  return result;
}
function conservation(initial: VesselState, current: VesselState) {
  const escaped = Object.entries(current.escapedGas_g ?? {}).map(([formula, mass_g]) => ({ formula, mass_g, moles: mass_g / computeMolarMass(formula) }));
  const a = atoms(initial.contents), b = atoms([...current.contents, ...escaped]);
  for (const element of Object.keys(a)) expect(b[element] ?? 0).toBeCloseTo(a[element], 9);
  expect(current.mass_g + escaped.reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(initial.mass_g, 5);
}

describe('Quantitative Studio specimens and playback', () => {
  it('builds all 108 non-lesson, non-emission specimens with explicit consistent masses/phases', () => {
    expect(ordinary).toHaveLength(108);
    for (const program of ordinary) {
      const sample = createStudioSample(program, shell);
      expect(sample.contents.length, program.id).toBeGreaterThan(0);
      expect(sample.mass_g, program.id).toBeCloseTo(sample.contents.reduce((sum, item) => sum + item.mass_g, 0), 10);
      expect(sample.volume_ml, program.id).toBeLessThanOrEqual(sample.capacity_ml);
      for (const item of sample.contents) {
        expect(item.phase, program.id).toMatch(/^(aq|l|s|g)$/);
        expect(item.moles, program.id).toBeGreaterThan(0);
        expect(Number.isFinite(item.mass_g), program.id).toBe(true);
        try { readComposition(item.formula); }
        catch { continue; }
        expect(item.mass_g / item.moles, program.id + ': ' + item.formula).toBeCloseTo(computeMolarMass(item.formula), 8);
      }
      expect(sample.hasGas).toBe(false);
      expect(sample.precipitateAmount_g).toBe(0);
    }
  });
  it('adds finite solvent for dissolution and actual indicators without pseudo-species', () => {
    for (const id of ['nh4no3_dissolution', 'naoh_dissolution', 'cacl2_dissolution']) {
      const program = getProgramById(id)!, sample = createStudioSample(program, shell);
      expect(sample.contents.some(item => item.formula === 'H2O' && item.phase === 'l')).toBe(true);
      expect(planStudioProgram(program, sample, 'vi').unmet).toEqual([]);
    }
    for (const id of ['phenolphthalein_naoh', 'methyl_orange_hcl', 'bromothymol_blue_base']) {
      const sample = createStudioSample(getProgramById(id)!, shell);
      expect(sample.contents.some(item => ['In_basic', 'HIn_acidic', 'In_blue'].includes(item.formula))).toBe(false);
    }
  });
  it('keeps stock acid grade and water explicit in concentrated acid examples', () => {
    const sample = createStudioSample(getProgramById('cu_hno3_conc')!, shell);
    const acid = sample.contents.find(item => item.formula.includes('HNO3'))!;
    const water = sample.contents.find(item => item.formula === 'H2O')!;
    expect(acid.formula).toContain('(conc)');
    expect(acid.mass_g / (acid.mass_g + water.mass_g)).toBeCloseTo(0.68, 10);
  });
  it('routes existing reaction buttons to their catalog program and rejects unknown keys', () => {
    for (const key of ['AgNO3+NaCl', 'golden_rain_pbi2', 'BaCl2+Na2SO4', 'cuso4_naoh_precipitate',
      'cacl2_na2co3_precipitate', 'cuso4_nh3_complex', 'al_naoh', 'na2s2o3_hcl_turbidity', 'caco3_hcl_gas',
      'zn_hcl_gas', 'mg_hcl_gas', 'h2o2_mno2_decomposition', 'nh3_hcl_fumes', 'na2co3_hcl_gas',
      'cu_hno3_conc', 'cu_conc_h2so4_heated', 'hcl_naoh_neutralization', 'h2so4_naoh_neutralization',
      'k2cr2o7_naoh_equilibrium', 'fe_cuso4_displacement', 'fecl3_kscn_complex', 'kmno4_oxalic_redox',
      'iodine_clock', 'cuoh2_thermal_decomposition', 'iodine_sublimation', 'water_into_conc_h2so4_explosion',
      'sodium_water_reaction', 'burn_magnesium']) expect(studioProgramForReaction(key), key).toBeDefined();
    expect(studioProgramForReaction('not_a_real_reaction')).toBeUndefined();
  });
  it('preserves an existing sample when preparing a separate Studio sample', () => {
    setup();
    const id = useAppStore.getState().prepareStudioProgram('agno3_nacl')!;
    expect(id).toBeTruthy();
    expect(useAppStore.getState().vessels[shell.id]).toBe(shell);
    expect(useAppStore.getState().vessels[id].studioProgramId).toBe('agno3_nacl');
  });
  it('does not run a heat-required sample at room temperature, then uses the real heated sample', () => {
    setup();
    const id = useAppStore.getState().prepareStudioProgram('cuoh2_decomp')!;
    expect(useAppStore.getState().runStudioProgram(id)).toBe(false);
    expect(useAppStore.getState().vessels[id].temperature_c).toBe(25);
    useAppStore.getState().setVesselState(id, { temperature_c: 70 });
    expect(useAppStore.getState().runStudioProgram(id)).toBe(true);
    expect(useAppStore.getState().activeKinetics[id].initialVesselBaseline!.temperature_c).toBe(70);
  });
  it('scrubs precipitate quantity from stoichiometry and refuses to rewind it', () => {
    setup();
    const id = useAppStore.getState().prepareStudioProgram('agno3_nacl')!;
    const initial = useAppStore.getState().vessels[id];
    expect(useAppStore.getState().runStudioProgram(id)).toBe(true);
    expect(useAppStore.getState().seekStudioProgram(id, 0.5)).toBe(true);
    const half = useAppStore.getState().vessels[id];
    expect(half.contents.find(item => item.formula === 'AgCl')!.moles).toBeCloseTo(0.0005, 10);
    expect(half.precipitateAmount_g).toBeCloseTo(0.0005 * computeMolarMass('AgCl'), 8);
    conservation(initial, half);
    expect(useAppStore.getState().seekStudioProgram(id, 0.1)).toBe(false);
    expect(useAppStore.getState().vessels[id]).toBe(half);
    expect(useAppStore.getState().seekStudioProgram(id, 1)).toBe(true);
    const end = useAppStore.getState().vessels[id]; conservation(initial, end);
    expect(useAppStore.getState().activeKinetics[id]).toBeUndefined();
    expect(useAppStore.getState().runStudioProgram(id)).toBe(false);
    expect(useAppStore.getState().vessels[id]).toBe(end);
  });
  it('keeps finite evolved gas in the escape ledger across forward seeks', () => {
    setup();
    const id = useAppStore.getState().prepareStudioProgram('zn_hcl')!;
    const initial = useAppStore.getState().vessels[id];
    useAppStore.getState().runStudioProgram(id);
    for (const progress of [0.1, 0.5, 1]) {
      expect(useAppStore.getState().seekStudioProgram(id, progress)).toBe(true);
      conservation(initial, useAppStore.getState().vessels[id]);
    }
    expect(useAppStore.getState().vessels[id].hasGas).toBe(false);
    expect(useAppStore.getState().vessels[id].escapedGas_g!.H2).toBeCloseTo(0.001 * computeMolarMass('H2'), 8);
  });
  it('rejects invalid seeks, unknown programs and lesson bypass through the generic Studio path', () => {
    setup();
    expect(useAppStore.getState().prepareStudioProgram('missing')).toBeNull();
    expect(useAppStore.getState().prepareStudioProgram([...LESSON_PROGRAM_IDS][0])).toBeNull();
    expect(useAppStore.getState().prepareStudioProgram('flame_na')).toBeNull();
    for (const progress of [NaN, Infinity, -1, 2]) expect(useAppStore.getState().seekStudioProgram(shell.id, progress)).toBe(false);
  });
});
