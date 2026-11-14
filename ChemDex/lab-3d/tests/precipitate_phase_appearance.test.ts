import { describe, expect, it } from 'vitest';
import { applyProgramToLedger, calculateBeerLambertColor, computeMolarMass } from '../src/engine/ledger';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { ALL_HANDCRAFTED_PROGRAMS, getProgramById } from '../src/vfx/programs/library';
import { precipitateComponents, clearedPrecipitateTurbidity } from '../src/science/precipitateInventory';
import { LiquidAppearanceField } from '../src/simulation/effects/LiquidAppearanceField';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const row = (formula: string, moles: number, phase = 'aq', precipitate = false): SubstanceContent => ({
  formula, moles, phase, mass_g: moles * computeMolarMass(formula),
  ...(precipitate ? { solidOrigin: 'precipitate' as const } : {}),
});
const vessel = (contents: SubstanceContent[]): VesselState => ({ id: 'phase-appearance', type: 'beaker',
  capacity_ml: 250, volume_ml: 100, temperature_c: 25, ph: 7, hasPrecipitate: false,
  liquidColor: '#f8fafc', contents: [row('H2O', 5, 'l'), ...contents],
  mass_g: 5 * computeMolarMass('H2O') + contents.reduce((sum, c) => sum + c.mass_g, 0),
}) as VesselState;
const native = (contents: SubstanceContent[]) => executeMultiStepReactions(
  [row('H2O', 5, 'l'), ...contents], contents.map(c => c.formula), 100, 25, false);
const programs = ALL_HANDCRAFTED_PROGRAMS.filter(p => p.visual.after.precipitate);

describe('Reaction solids and carrier liquid have separate identities', () => {
  it.each(programs.map(p => [p.id, p] as const))('%s creates finite solid inventory with its own physical profile', (_, program) => {
    const reactants = program.chemistry.species.filter(s => s.role === 'reactant')
      .map(s => row(s.formula, s.coeff * 0.001, s.phase));
    const initial = vessel(reactants);
    const result = applyProgramToLedger(program, initial, 1, { deferThermal: true, conditionTemperature_c: 200 });
    const solid = program.visual.after.precipitate!;
    const components = precipitateComponents(result.contents!);
    expect(components.some(c => c.formula === solid.substance && c.mass_g > 0)).toBe(true);
    expect(result.hasPrecipitate).toBe(true);
    expect(result.precipitateAmount_g).toBeCloseTo(components.reduce((sum, c) => sum + c.mass_g, 0), 10);
    expect(getPrecipitateProfile(solid.substance).id).toBe(solid.substance);
    // The only colored soluble endpoint among these programs is iodine
    // accompanying CuI. Studio previews must also keep solid color separate.
    if (program.id !== 'cuso4_ki') expect(['#f8fafc', '#ffffff']).toContain(program.visual.after.liquidColor);
    expect(result.contents!.reduce((sum, c) => sum + c.mass_g, 0)
      + Object.values(result.escapedGas_g ?? {}).reduce((sum, mass) => sum + mass, 0)).toBeCloseTo(initial.mass_g, 6);
  });

  it.each(['na2s_cuso4', 'na2s_pbno32', 'agno3_ki', 'k2cro4_agno3', 'fecl3_k4fecn6',
    'niso4_naoh', 'cocl2_naoh', 'feso4_naoh'])('%s does not dye the liquid with its solid color', id => {
    const program = getProgramById(id)!;
    const initial = vessel(program.chemistry.species.filter(s => s.role === 'reactant')
      .map(s => row(s.formula, s.coeff * 0.001, s.phase)));
    const result = applyProgramToLedger(program, initial, 1, { deferThermal: true });
    expect(result.precipitateAmount_g).toBeGreaterThan(0);
    expect(result.liquidColor).toBe('#f8fafc');
  });

  it('retains dissolved reagent color beside solids and colors the iodine product beside CuI', () => {
    const program = getProgramById('na2s_cuso4')!;
    const partial = applyProgramToLedger(program, vessel([row('CuSO4', 0.002), row('Na2S', 0.001)]), 1, { deferThermal: true });
    expect(partial.liquidColor).not.toBe('#f8fafc');
    expect(partial.liquidColor).not.toBe(program.visual.after.liquidColor);
    const iodine = getProgramById('cuso4_ki')!;
    const end = applyProgramToLedger(iodine, vessel(iodine.chemistry.species.filter(s => s.role === 'reactant')
      .map(s => row(s.formula, s.coeff * 0.001, s.phase))), 1, { deferThermal: true });
    expect(end.liquidColor).not.toBe('#f8fafc');
    expect(end.contents!.some(c => c.formula === 'I2' && c.phase === 'aq' && c.moles > 0)).toBe(true);
  });

  it('ignores solid labels, historical state fields and separated compartments when deriving dissolved color', () => {
    for (const item of [{ ...row('CuSO4(s)', 0.01), phase: undefined },
      { ...row('CuSO4', 0.01), phase: undefined, state: 'solid' },
      { ...row('CuSO4', 0.01), location: 'filter' as const }]) {
      expect(calculateBeerLambertColor([item], 100, '#f8fafc')).toBe('#f8fafc');
    }
    expect(calculateBeerLambertColor([row('CuSO4(aq)', 0.01)], 100, '#f8fafc')).not.toBe('#f8fafc');
    expect(native([row('CuSO4', 0.01, 's')]).finalLiquidColor).toBe('#f8fafc');
  });

  it('counts every tagged species and split row but never converts added stock into suspension', () => {
    const stock = row('Cu', 0.02, 's');
    const result = native([stock, row('AgBr', 0.001, 's', true), row('AgBr', 0.002, 's', true),
      row('CuS', 0.001, 's', true), { ...row('PbS', 0.01, 's', true), location: 'filter' }]);
    expect(result.precipitateAmount_g).toBeCloseTo(0.003 * computeMolarMass('AgBr') + 0.001 * computeMolarMass('CuS'), 10);
    expect(result.hasPrecipitate).toBe(true);
    expect(native([stock]).hasPrecipitate).toBe(false);
  });

  it('leaves a nonreacting mixture clear and does not manufacture solid from a visual declaration', () => {
    const initial = vessel([row('NaCl', 0.001), row('KNO3', 0.001)]);
    const result = applyProgramToLedger(getProgramById('na2s_cuso4')!, initial, 1);
    expect(result.contents).toEqual(initial.contents);
    expect(result.hasPrecipitate).toBe(false);
    expect(result.liquidColor).toBe(initial.liquidColor);
    const noReaction = native([row('NaCl', 0.001), row('KNO3', 0.001)]);
    expect(noReaction.reactionsOccurred).toHaveLength(0);
    expect(noReaction.hasPrecipitate).toBe(false);
  });

  it('does not count added stock of the same formula in the precipitate summary', () => {
    const initial = vessel([row('CuS', 0.01, 's'), row('CuSO4', 0.001), row('Na2S', 0.001)]);
    const result = applyProgramToLedger(getProgramById('na2s_cuso4')!, initial, 1, { deferThermal: true });
    expect(result.precipitateAmount_g).toBeCloseTo(0.001 * computeMolarMass('CuS'), 10);
    expect(result.contents!.filter(c => c.formula === 'CuS')).toHaveLength(2);
  });

  it('keeps a second precipitate when an acid dissolves the active solid', () => {
    const initial = vessel([row('Cu(OH)2', 0.001, 's', true), row('AgBr', 0.002, 's', true), row('HCl', 0.002)]);
    initial.hasPrecipitate = true;
    initial.precipitateSubstance = 'Cu(OH)2';
    const program = ALL_HANDCRAFTED_PROGRAMS.find(p => p.chemistry.species.some(s => s.role === 'reactant'
      && s.formula === 'Cu(OH)2') && p.chemistry.species.some(s => s.role === 'reactant' && s.formula === 'HCl'))!;
    const result = applyProgramToLedger(program, initial, 1, { deferThermal: true });
    expect(result.hasPrecipitate).toBe(true);
    expect(result.precipitateSubstance).toBe('AgBr');
    expect(result.precipitateAmount_g).toBeCloseTo(0.002 * computeMolarMass('AgBr'), 10);
  });

  it('clears precipitate haze permanently after dissolution even when the solution color changes', () => {
    const initial = vessel([row('Cu(OH)2', 0.001, 's', true), row('HCl', 0.002)]);
    initial.hasPrecipitate = true; initial.precipitateSubstance = 'Cu(OH)2'; initial.turbidity = 0.5;
    const program = ALL_HANDCRAFTED_PROGRAMS.find(p => p.chemistry.species.some(s => s.role === 'reactant'
      && s.formula === 'Cu(OH)2') && p.chemistry.species.some(s => s.role === 'reactant' && s.formula === 'HCl'))!;
    const dissolved = { ...initial, ...applyProgramToLedger(program, initial, 1, { deferThermal: true }) };
    expect(dissolved.hasPrecipitate).toBe(false);
    expect(dissolved.turbidity).toBe(0);
    expect(native([row('Fe(OH)3', 0.001, 's', true), row('HCl', 0.01)]).finalTurbidity).toBe(0);
    const field = new LiquidAppearanceField();
    const input = { color: '#ffffff', turbidity: 0.5, radius: 1, baseY: 0, fillY: 1 };
    field.advance(0.1, { ...input, suspensions: new Map([['Cu(OH)2', { cloudiness: 0.5,
      particles: [{ x: 0, y: 0.2, z: 0, mass_ug: 100 }] }]]) });
    for (let i = 0; i < 60; i++) field.advance(0.1, { ...input, color: dissolved.liquidColor!,
      turbidity: dissolved.turbidity!, suspensions: new Map() });
    expect(field.sample(0.5, 0.2, 0.5, 3)).toBe(0);
  });

  it('does not erase unrelated haze or a remaining suspension', () => {
    const clear = vessel([row('NaCl', 0.001)]);
    clear.turbidity = 0.4;
    expect(clearedPrecipitateTurbidity(clear, clear.contents)).toBeUndefined();
    const solid = vessel([row('CuS', 0.001, 's', true)]);
    expect(clearedPrecipitateTurbidity(solid, solid.contents)).toBeUndefined();
    expect(clearedPrecipitateTurbidity({ ...solid, foam_ml: 5 }, [])).toBeUndefined();
    expect(clearedPrecipitateTurbidity(solid, [{ ...row('C6H6', 0.001, 'l'), liquidLayer: 'organic' }])).toBeUndefined();
  });
});
