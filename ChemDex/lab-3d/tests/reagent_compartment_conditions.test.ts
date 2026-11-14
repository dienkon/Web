import { describe, expect, it } from 'vitest';
import { availableReagent } from '../src/science/reagentAvailability';
import { assessProgramConditions } from '../src/science/conditions';
import { getProgramById } from '../src/vfx/programs/library';
import { createStudioSample, planStudioProgram } from '../src/engine/studioProgram';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { DETERMINISTIC_REACTIONS, executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { nativeReagentPhases } from '../src/science/nativeReagentPhases';
import { planMetalAcid } from '../src/engine/metalAcidPlan';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const shell: VesselState = { id: 'compartment', name: 'Compartment', type: 'beaker',
  capacity_ml: 250, volume_ml: 50, volume: 0.2, mass_g: 50, temperature_c: 25,
  ph: 7, position: [0, 0, 0], rotationY: 0, isLocked: false, contents: [],
  substances: [], hasGas: false, hasPrecipitate: false, isBoiling: false };
const row = (formula: string, phase: string, moles = 0.01): SubstanceContent => ({
  formula, phase, moles, mass_g: moles * computeMolarMass(formula),
});
const native = (contents: SubstanceContent[]) => executeMultiStepReactions(contents,
  contents.map(c => c.formula), 50, 25, false, 'vi', { preserveQuantities: true });

describe('Only finite material in the reaction compartment can react', () => {
  it('declares a phase domain for every reactant in all native rules', () => {
    const missing = DETERMINISTIC_REACTIONS.flatMap(r => r.reactants
      .filter(formula => nativeReagentPhases(formula).length === 0).map(formula => `${r.id}: ${formula}`));
    expect(missing).toEqual([]);
  });

  it.each(['g', 's'])('does not substitute HCl(%s) for aqueous acid on a metal', phase => {
    expect(native([row('Mg', 's'), row('HCl', phase)]).reactionsOccurred).toHaveLength(0);
  });

  it('does not instantly precipitate from dry silver nitrate and sodium chloride', () => {
    expect(native([row('AgNO3', 's'), row('NaCl', 's')]).reactionsOccurred).toHaveLength(0);
    expect(native([row('AgNO3', 'aq'), row('NaCl', 'aq')]).reactionsOccurred.length).toBeGreaterThan(0);
  });

  it('does not apply aqueous chemistry to a zero-volume or invalid-temperature sample', () => {
    const contents = [row('AgNO3', 'aq'), row('NaCl', 'aq')];
    for (const [volume, temperature] of [[0, 25], [50, NaN], [50, -300], [Infinity, 25]]) {
      expect(executeMultiStepReactions(contents, contents.map(c => c.formula), volume, temperature,
        false, 'vi', { preserveQuantities: true }).reactionsOccurred).toHaveLength(0);
    }
  });

  it.each(['water_into_h2so4', 'h2so4_dilution'])('%s accepts its explicitly liquid concentrated acid', id => {
    const p = getProgramById(id)!, v = createStudioSample(p, shell);
    expect(assessProgramConditions(p, v.contents, { requireInventory: true, volume_ml: v.volume_ml }).ready).toBe(true);
    expect(planStudioProgram(p, v, 'vi').kinetics).toBeDefined();
  });

  it.each(['HNO3', 'H2SO4(conc)'])('does not infer H2 from mixed HCl and %s', formula => {
    const reagents = [row('Mg', 's'), row('HCl', 'aq')];
    expect(native([...reagents, row(formula, 'aq')]).hasGas).toBe(false);
    expect(native([...reagents, row(formula, 'l')]).hasGas).toBe(false);
    const separated = { ...row(formula, 'aq'), location: 'filter' as const };
    expect(native([...reagents, separated]).hasGas).toBe(true);
  });

  it('uses the same finite-volume and pH domain in the program gate', () => {
    const p = getProgramById('agno3_nacl')!, v = createStudioSample(p, shell);
    for (const env of [{ volume_ml: 0 }, { volume_ml: Infinity }, { volume_ml: -1 }, { pH: NaN }, { pH: -Infinity }]) {
      expect(assessProgramConditions(p, v.contents, { ...env, requireInventory: true }).ready).toBe(false);
    }
  });
  it.each(['filter', 'foam'] as const)('does not use %s inventory to satisfy a program or native reaction', location => {
    const p = getProgramById('agno3_nacl')!;
    const v = createStudioSample(p, shell);
    v.contents = v.contents.map(c => c.formula === 'NaCl' ? { ...c, location } : c);
    expect(assessProgramConditions(p, v.contents, { requireInventory: true }).ready).toBe(false);
    expect(planStudioProgram(p, v, 'vi').kinetics).toBeNull();
    expect(native(v.contents).reactionsOccurred).toHaveLength(0);
    expect(applyProgramToLedger(p, v, 1).contents).toEqual(v.contents);
  });

  it.each([NaN, Infinity, -Infinity, -0.01, 0])('does not use invalid/exhausted moles %s', moles => {
    const p = getProgramById('agno3_nacl')!;
    const contents = [row('AgNO3', 'aq'), { ...row('NaCl', 'aq'), moles }];
    expect(assessProgramConditions(p, contents, { requireInventory: true }).ready).toBe(false);
    expect(native(contents).reactionsOccurred).toHaveLength(0);
  });

  it('honours legacy state metadata and rejects an explicitly wrong phase', () => {
    const p = getProgramById('mg_hcl')!, v = createStudioSample(p, shell);
    v.contents = v.contents.map(c => ({ ...c, state: c.phase === 's' ? 'solid' : c.phase,
      phase: undefined }));
    expect(planMetalAcid(v, 'vi')?.kinetics).toBeDefined();
    const converted = applyProgramToLedger(p, v, 0.5);
    const before = v.contents.find(c => c.formula === 'Mg')!.moles;
    expect(converted.contents!.find(c => c.formula === 'Mg')!.moles).toBeLessThan(before);
    v.contents = v.contents.map(c => c.formula === 'HCl' ? { ...c, state: 'gas' } : c);
    expect(planMetalAcid(v, 'vi')).toBeNull();
    expect(assessProgramConditions(p, v.contents, { requireInventory: true }).ready).toBe(false);
    expect(availableReagent({ ...row('HCl(g)', 'aq') }, 'HCl', 'aq')).toBe(false);
  });

  it('requires gas-phase contact for ammonium chloride smoke in both dispatchers', () => {
    const p = getProgramById('nh3_hcl')!;
    const aqueous = [row('NH3', 'aq'), row('HCl', 'aq')];
    expect(assessProgramConditions(p, aqueous, { requireInventory: true }).ready).toBe(false);
    expect(native(aqueous).reactionsOccurred.some(r => r.reactionId === 'nh3_hcl_smoke')).toBe(false);
    const gases = aqueous.map(c => ({ ...c, phase: undefined, state: 'gas' }));
    expect(assessProgramConditions(p, gases, { requireInventory: true, isSealed: true }).ready).toBe(true);
    expect(native(gases).reactionsOccurred.length).toBeGreaterThan(0);
  });

  it('does not mistake separated acid, gaseous acid or nonfinite acid for an acidic solution', () => {
    const p = structuredClone(getProgramById('agno3_nacl')!);
    p.chemistry.conditions = { medium: 'acidic' };
    const reagents = [row('AgNO3', 'aq'), row('NaCl', 'aq')];
    for (const acid of [{ ...row('HCl', 'aq'), location: 'filter' as const },
      row('HCl', 'g'), { ...row('HCl', 'aq'), moles: Infinity }]) {
      expect(assessProgramConditions(p, [...reagents, acid], { pH: 7 }).unmet).toContain('Cần môi trường axit.');
    }
    expect(assessProgramConditions(p, [...reagents, row('HCl', 'aq')], { pH: 7 }).ready).toBe(true);
  });

  it('finds the acid grade in the actual bulk rather than the first matching separated row', () => {
    const p = getProgramById('cu_hno3_conc')!, v = createStudioSample(p, shell);
    v.contents.unshift({ ...row('HNO3(dil)', 'aq'), location: 'filter' });
    expect(assessProgramConditions(p, v.contents, { temperature_c: 25, requireInventory: true }).ready).toBe(true);
    v.contents = v.contents.map(c => c.formula.includes('conc') ? { ...c, location: 'foam' } : c);
    expect(assessProgramConditions(p, v.contents, { temperature_c: 25, requireInventory: true }).ready).toBe(false);
  });

  it('keeps separated product unchanged while adding new bulk precipitate in both ledgers', () => {
    const p = getProgramById('agno3_nacl')!, v = createStudioSample(p, shell);
    const cake = { ...row('AgCl', 's', 0.002), location: 'filter' as const, solidOrigin: 'precipitate' as const };
    v.contents.unshift(cake);
    const n = native(v.contents), ledger = applyProgramToLedger(p, v, 1);
    for (const [contents, amount] of [[n.updatedContents, n.precipitateAmount_g], [ledger.contents!, ledger.precipitateAmount_g]] as const) {
      expect(contents.find(c => c.location === 'filter')!.moles).toBe(cake.moles);
      expect(contents.some(c => c.formula === 'AgCl' && c.location !== 'filter' && c.moles > 0)).toBe(true);
      const bulkMass = contents.filter(c => c.formula === 'AgCl' && c.location !== 'filter').reduce((sum, c) => sum + c.mass_g, 0);
      expect(amount).toBeCloseTo(bulkMass, 12);
    }
    expect(native([cake]).hasPrecipitate).toBe(false);
  });

  it('does not bypass a saturation gate when an unrelated filtered solid is recorded', () => {
    const p = getProgramById('agno3_nacl')!;
    const contents = [row('H2O', 'l', 50 / 18.015), row('AgNO3', 'aq', 1e-8),
      row('NaCl', 'aq', 1e-8), { ...row('SiO2', 's'), location: 'filter' as const }];
    const v = { ...shell, contents, substances: contents.map(c => c.formula) };
    expect(planStudioProgram(p, v, 'vi').kinetics).toBeNull();
    expect(native(contents).reactionsOccurred).toHaveLength(0);
    expect(applyProgramToLedger(p, v, 1).contents!.some(c => c.formula === 'AgCl')).toBe(false);
  });
});
