import { describe, expect, it } from 'vitest';
import { advanceReaction } from '../src/engine/advanceReaction';
import { applyProgramToLedger } from '../src/engine/ledger';
import { createStudioSample, planStudioProgram } from '../src/engine/studioProgram';
import { assessProgramConditions } from '../src/science/conditions';
import { getProgramById } from '../src/vfx/programs/library';
import { REAGENT_AMOUNT_THRESHOLD_MOL } from '../src/science/reagentAvailability';
import type { VesselState } from '../src/types/chemistry';

const shell = { id: 'trace', name: 'Trace reaction', type: 'beaker', capacity_ml: 250, volume_ml: 30,
  volume: 0.12, mass_g: 30, temperature_c: 25, ph: 7, position: [0, 1.04, 0], rotationY: 0,
  isLocked: false, contents: [], substances: [], hasGas: false, hasPrecipitate: false, isBoiling: false } as VesselState;
function setup(id: string, progress = 1 - 2e-11) {
  const program = getProgramById(id)!, baseline = createStudioSample(program, shell);
  const kinetics = planStudioProgram(program, baseline, 'vi').kinetics!;
  const current = { ...baseline, ...applyProgramToLedger(program, baseline, progress) };
  kinetics.progress = progress;
  return { program, baseline, current, kinetics };
}
const accountedMass = (vessel: VesselState) => vessel.mass_g
  + Object.values(vessel.escapedGas_g ?? {}).reduce((sum, mass) => sum + mass, 0);

describe('finite stoichiometric reaction tails below reagent discovery threshold', () => {
  it.each(['kmno4_hcl', 'feoh3_hcl'])('%s finishes its conserved ledger without discarding trace material', id => {
    const { program, baseline, current, kinetics } = setup(id);
    expect(assessProgramConditions(program, current.contents, { temperature_c: current.temperature_c,
      volume_ml: current.volume_ml, pH: current.ph, requireInventory: true }).ready).toBe(false);
    const retained = structuredClone(current.contents);
    expect(advanceReaction(kinetics, current, 1 / 60)).toBe(1);
    expect(current.contents).toEqual(retained);
    expect(kinetics.unmetConditions).toEqual([]);
    const completed = { ...baseline, ...applyProgramToLedger(program, baseline, 1) };
    expect(accountedMass(completed)).toBeCloseTo(accountedMass(baseline), 11);
    expect(accountedMass(completed)).toBeCloseTo(accountedMass(current), 11);
    expect(completed.contents.some(row => row.phase === 's' && row.mass_g > 1e-10)).toBe(false);
  });

  it('does not finish substantial remaining reaction after a reactant is removed', () => {
    const { current, kinetics } = setup('kmno4_hcl', 0.8);
    current.contents = current.contents.filter(row => row.formula !== 'HCl');
    expect(advanceReaction(kinetics, current, 1 / 60)).toBe(0.8);
  });

  it('finishes a ferric trace with sufficient acid above the discovery threshold', () => {
    const { current, kinetics } = setup('feoh3_hcl', 1 - 5e-10);
    const amount = (formula: string) => current.contents.find(item => item.formula === formula)!.moles;
    expect(amount('Fe(OH)3')).toBeLessThan(REAGENT_AMOUNT_THRESHOLD_MOL);
    expect(amount('HCl')).toBeGreaterThan(REAGENT_AMOUNT_THRESHOLD_MOL);
    expect(advanceReaction(kinetics, current, 1 / 60)).toBe(1);
  });

  it.each(['phase', 'compartment', 'temperature'] as const)('keeps %s eligibility even for a trace tail', reason => {
    const { current, kinetics } = setup('kmno4_hcl');
    if (reason === 'phase') current.contents = current.contents.map(row => row.formula === 'HCl' ? { ...row, phase: 'g' } : row);
    if (reason === 'compartment') current.contents = current.contents.map(row => row.formula === 'HCl' ? { ...row, location: 'filter' } : row);
    if (reason === 'temperature') current.temperature_c = Number.NaN;
    expect(advanceReaction(kinetics, current, 1 / 60)).toBe(kinetics.progress);
    expect(kinetics.actualProgressRate_s).toBe(0);
  });
});
