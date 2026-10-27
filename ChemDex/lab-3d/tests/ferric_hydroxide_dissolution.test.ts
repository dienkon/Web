import { describe, expect, it } from 'vitest';
import { ferricHydroxideDissolutionExtent, ferricChlorideAqueousState, ferricHydroxideKsp } from '../src/science/ferricHydroxidePrecipitation';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { getProgramById } from '../src/vfx/programs/library';
import { resolveReactionProgram } from '../src/vfx/programs/resolver';
import { planStudioProgram } from '../src/engine/studioProgram';
import { readComposition } from '../src/science/balance';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

function sample(acid: number): VesselState {
  const contents = [['H2O', 'l', 5], ['Fe(OH)3', 's', 1e-4], ['HCl', 'aq', acid]]
    .map(([f, phase, n]) => ({ formula: String(f), phase: String(phase), moles: Number(n), mass_g: Number(n) * computeMolarMass(String(f)) }));
  return { id: 'ferric-acid', contents, substances: contents.map(c => c.formula), volume_ml: 100,
    capacity_ml: 250, temperature_c: 25, ph: 7, mass_g: contents.reduce((s, c) => s + c.mass_g, 0),
    hasPrecipitate: true, precipitateSubstance: 'Fe(OH)3', precipitateAmount_g: 1e-4 * computeMolarMass('Fe(OH)3') } as VesselState;
}
const amount = (contents: readonly SubstanceContent[], formula: string) => contents.filter(c => c.formula === formula).reduce((s, c) => s + c.moles, 0);
function atoms(contents: readonly SubstanceContent[]) {
  const totals: Record<string, number> = {};
  for (const c of contents) for (const [atom, count] of Object.entries(readComposition(c.formula).atoms)) {
    totals[atom] = (totals[atom] ?? 0) + count * c.moles;
  }
  return totals;
}

describe('Finite ferric hydroxide acid dissolution', () => {
  it.each([0, 1.5e-4, 1e-3])('consumes only available acid and solid with %s mol HCl', acid => {
    const v = sample(acid), program = getProgramById('feoh3_hcl')!;
    const extent = ferricHydroxideDissolutionExtent(v.contents, 100, 25)!;
    expect(extent).toBeGreaterThanOrEqual(0);
    expect(extent).toBeLessThanOrEqual(Math.min(1e-4, acid / 3));
    const patch = applyProgramToLedger(program, v, 1, { deferThermal: true });
    const native = executeMultiStepReactions(v.contents, v.substances, 100, 25, false, 'vi', { preserveQuantities: true });
    for (const contents of [patch.contents!, native.updatedContents]) {
      const dissolved = amount(contents, 'FeCl3');
      expect(dissolved).toBeLessThanOrEqual(Math.min(1e-4, acid / 3) + 1e-14);
      expect(amount(contents, 'Fe(OH)3') + dissolved).toBeCloseTo(1e-4, 12);
      expect(amount(contents, 'HCl') + 3 * dissolved).toBeCloseTo(acid, 12);
      expect(contents.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(v.mass_g, 8);
      for (const [atom, total] of Object.entries(atoms(v.contents))) expect(atoms(contents)[atom] ?? 0).toBeCloseTo(total, 10);
    }
    expect(amount(patch.contents!, 'FeCl3')).toBeCloseTo(extent, 12);
    if (acid > 0) {
      expect(native.reactionsOccurred.some(r => r.reactionId === 'feoh3_hcl_dissolution')).toBe(true);
      expect(native.combinedMixResult!.effects.some(e => e.type === 'PRECIPITATE' || e.type === 'GAS')).toBe(false);
      const state = ferricChlorideAqueousState(native.updatedContents, 100, native.finalTemperature_c)!;
      expect(native.finalPh).toBeCloseTo(state.ph, 10);
    }
    if (acid === 0) expect(planStudioProgram(program, v, 'vi').kinetics).toBeNull();
    if (acid === 1e-3) {
      expect(extent).toBeCloseTo(1e-4, 12);
      expect(patch.hasPrecipitate).toBe(false);
    }
    if (acid === 1.5e-4) {
      expect(extent).toBeGreaterThan(0);
      expect(patch.hasPrecipitate).toBe(true);
      expect(patch.precipitateAmount_g).toBeGreaterThan(0);
      if (extent < acid / 3 - 1e-12) {
        const state = ferricChlorideAqueousState(patch.contents!, 100, 25)!;
        expect(state.freeIron_M * state.hydroxide_M ** 3 / ferricHydroxideKsp(25)!).toBeCloseTo(1, 5);
      }
    }
  });

  it('updates solid progressively without clearing the whole precipitate at partial progress', () => {
    const v = sample(1e-3), program = getProgramById('feoh3_hcl')!;
    const half = applyProgramToLedger(program, v, 0.5, { deferThermal: true });
    expect(amount(half.contents!, 'Fe(OH)3')).toBeCloseTo(5e-5, 12);
    expect(half.precipitateAmount_g).toBeCloseTo(5e-5 * computeMolarMass('Fe(OH)3'), 12);
    expect(half.hasPrecipitate).toBe(true);
    expect(program.visual.after.gasesOffgassed).toEqual([]);
    expect(program.visual.after.precipitate).toBeUndefined();
  });

  it('resolves the reviewed dissolution program rather than inventing a fallback', async () => {
    const v = sample(1e-3);
    const result = await resolveReactionProgram(v.substances, v.contents, { temperature_c: 25, pH: 2, volume_ml: 100, lang: 'vi' });
    expect(result.program.id).toBe('feoh3_hcl');
  });

  it('does not apply the chloride acid model to other ligands, trapped solids or remaining base', () => {
    const v = sample(1e-3), program = getProgramById('feoh3_hcl')!;
    for (const formula of ['NH3', 'NaOH', 'Na2SO4']) {
      const contents = [...v.contents, { formula, phase: 'aq', moles: 1e-4, mass_g: 1e-4 * computeMolarMass(formula) }];
      expect(ferricHydroxideDissolutionExtent(contents, 100, 25)).toBeNull();
      const patch = applyProgramToLedger(program, { ...v, contents }, 1, { deferThermal: true });
      expect(amount(patch.contents!, 'Fe(OH)3')).toBe(1e-4);
      expect(planStudioProgram(program, { ...v, contents }, 'vi').kinetics).toBeNull();
    }
    expect(ferricHydroxideDissolutionExtent(v.contents.map(c => c.phase === 's' ? { ...c, location: 'filter' as const } : c), 100, 25)).toBeNull();
  });
});
