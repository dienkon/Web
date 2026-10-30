import { describe, expect, it } from 'vitest';
import { aluminumReactionExtent, aluminumAqueousState, aluminumAqueousConstants } from '../src/science/aluminumHydroxideEquilibrium';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { createStudioSample, planStudioProgram } from '../src/engine/studioProgram';
import { getProgramById } from '../src/vfx/programs/library';
import { resolveReactionProgram } from '../src/vfx/programs/resolver';
import { readComposition } from '../src/science/balance';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const row = (formula: string, moles: number, phase = 'aq'): SubstanceContent => ({ formula, moles, phase, mass_g: moles * computeMolarMass(formula) });
function vessel(contents: SubstanceContent[]): VesselState {
  return { id: 'al-path', type: 'beaker', capacity_ml: 250, volume_ml: 100, temperature_c: 25, ph: 7,
    contents, substances: contents.map(c => c.formula), mass_g: contents.reduce((s, c) => s + c.mass_g, 0),
    hasPrecipitate: contents.some(c => c.phase === 's'), precipitateSubstance: 'Al(OH)3',
    precipitateAmount_g: contents.filter(c => c.phase === 's').reduce((s, c) => s + c.mass_g, 0) } as VesselState;
}
const sample = (ratio: number, sulfate: boolean, n = 1e-4) => vessel([row('H2O', 5, 'l'),
  row(sulfate ? 'Al2(SO4)3' : 'AlCl3', sulfate ? n / 2 : n), row('NaOH', ratio * n)]);
const solid = (contents: SubstanceContent[]) => contents.filter(c => c.formula === 'Al(OH)3' && c.phase === 's').reduce((s, c) => s + c.moles, 0);
function conserved(before: SubstanceContent[], after: SubstanceContent[]) {
  const atoms = (rows: SubstanceContent[]) => {
    const result: Record<string, number> = {};
    for (const c of rows) for (const [atom, n] of Object.entries(readComposition(c.formula).atoms)) result[atom] = (result[atom] ?? 0) + c.moles * n;
    return result;
  };
  expect(after.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(before.reduce((s, c) => s + c.mass_g, 0), 8);
  const a = atoms(before), b = atoms(after);
  for (const [atom, n] of Object.entries(a)) expect(b[atom] ?? 0).toBeCloseTo(n, 10);
}

describe('Aluminum gel and excess-base pathways use actual equilibrium quantities', () => {
  it.each([false, true])('limits formation, native output and isothermal ledger for sulfate=%s', sulfate => {
    const id = sulfate ? 'al2so43_naoh' : 'alcl3_naoh', v = sample(3, sulfate);
    const program = getProgramById(id)!, expected = aluminumReactionExtent(id, v.contents, 100, 25)!;
    expect(planStudioProgram(program, v, 'vi').kinetics).not.toBeNull();
    const patch = applyProgramToLedger(program, v, 1, { deferThermal: true });
    const native = executeMultiStepReactions(v.contents, v.substances, 100, 25, false, 'vi', { preserveQuantities: true });
    expect(solid(patch.contents!)).toBeCloseTo(expected * (sulfate ? 2 : 1), 12);
    for (const contents of [patch.contents!, native.updatedContents]) {
      expect(solid(contents)).toBeGreaterThan(0); expect(solid(contents)).toBeLessThan(1e-4);
      conserved(v.contents, contents);
    }
    const state = aluminumAqueousState(patch.contents!, 100, 25)!;
    expect(state.freeAluminum_M * state.hydroxide_M ** 3 / aluminumAqueousConstants(25)!.ksp).toBeCloseTo(1, 5);
    expect(native.finalPh).toBeCloseTo(aluminumAqueousState(native.updatedContents, 100, native.finalTemperature_c)!.ph, 10);
  });

  it.each([false, true])('uses the clear aluminate branch directly in sufficient excess base for sulfate=%s', async sulfate => {
    const v = sample(6, sulfate), formationId = sulfate ? 'al2so43_naoh' : 'alcl3_naoh';
    const directId = sulfate ? 'al2so43_naoh_excess' : 'alcl3_naoh_excess';
    expect(planStudioProgram(getProgramById(formationId)!, v, 'vi').kinetics).toBeNull();
    expect(solid(applyProgramToLedger(getProgramById(formationId)!, v, 1).contents!)).toBe(0);
    const chosen = await resolveReactionProgram(v.substances, v.contents, { temperature_c: 25, volume_ml: 100 });
    expect(chosen.program.id).toBe(directId);
    const patch = applyProgramToLedger(chosen.program, v, 1, { deferThermal: true });
    expect(solid(patch.contents!)).toBe(0);
    expect(patch.contents!.find(c => c.formula === 'Na[Al(OH)4]')!.moles).toBeGreaterThan(9e-5);
    expect(planStudioProgram(chosen.program, { ...v, ...patch }, 'vi').kinetics).toBeNull();
    const native = executeMultiStepReactions(v.contents, v.substances, 100, 25, false, 'vi', { preserveQuantities: true });
    expect(solid(native.updatedContents)).toBe(0);
    expect(native.reactionsOccurred.some(r => r.reactionId.endsWith('_aluminate'))).toBe(true);
    expect(native.reactionsOccurred.some(r => r.match.hasPrecipitate)).toBe(false);
    conserved(v.contents, patch.contents!); conserved(v.contents, native.updatedContents);
  });

  it.each([false, true])('does not animate a trace precipitate for sulfate=%s', sulfate => {
    const v = sample(3, sulfate, 1e-12), p = getProgramById(sulfate ? 'al2so43_naoh' : 'alcl3_naoh')!;
    expect(planStudioProgram(p, v, 'vi').kinetics).toBeNull();
    expect(solid(applyProgramToLedger(p, v, 1).contents!)).toBe(0);
  });

  it('keeps saturation-limited gel and uses the sourced endothermic dissolution heat', () => {
    const v = vessel([row('H2O', 5, 'l'), row('Al(OH)3', 1e-4, 's'), row('NaOH', 1e-4)]);
    const p = getProgramById('aloh3_naoh')!, extent = aluminumReactionExtent(p.id, v.contents, 100, 25)!;
    const end = applyProgramToLedger(p, v, 1, { deferThermal: true });
    const halfway = applyProgramToLedger(p, v, 0.5, { deferThermal: true });
    expect(solid(end.contents!)).toBeCloseTo(1e-4 - extent, 12);
    expect(end.hasPrecipitate).toBe(true);
    expect(solid(halfway.contents!)).toBeCloseTo(1e-4 - extent / 2, 12);
    expect(planStudioProgram(p, { ...v, ...end }, 'vi').kinetics).toBeNull();
    const native = executeMultiStepReactions(v.contents, v.substances, 100, 25, false, 'vi', { preserveQuantities: true });
    expect(native.finalTemperature_c).toBeLessThan(25);
    expect(native.reactionsOccurred.find(r => r.reactionId === 'aloh3_naoh_dissolution')!.deltaH_kJ).toBeGreaterThan(0);
    conserved(v.contents, native.updatedContents); conserved(v.contents, end.contents!);
  });

  it('prepares an existing gel and finite genuinely excess base for reviewed Studio specimens', () => {
    const shell = vessel([]);
    for (const id of ['aloh3_naoh', 'alcl3_naoh_excess', 'al2so43_naoh_excess', 'al2so43_naoh']) {
      const p = getProgramById(id)!, prepared = createStudioSample(p, shell);
      expect(planStudioProgram(p, prepared, 'vi').unmet, id).toEqual([]);
      expect(prepared.ph).toBeCloseTo(aluminumAqueousState(prepared.contents, prepared.volume_ml, 25)!.ph, 10);
      if (id === 'aloh3_naoh') {
        expect(prepared.hasPrecipitate).toBe(true); expect(prepared.precipitateMorphology).toBe('GEL');
        expect(prepared.precipitateAmount_g).toBeGreaterThan(0);
      }
    }
  });
});
