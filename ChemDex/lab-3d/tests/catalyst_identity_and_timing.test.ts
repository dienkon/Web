import { describe, expect, it } from 'vitest';
import { getProgramById } from '../src/vfx/programs/library';
import { createStudioSample, planStudioProgram } from '../src/engine/studioProgram';
import { assessProgramConditions } from '../src/science/conditions';
import { advanceCatalyticProgress } from '../src/engine/contactKinetics';
import { applyProgramToLedger } from '../src/engine/ledger';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { reactionObservationGuide } from '../src/science/reactionObservationGuide';
import type { VesselState } from '../src/types/chemistry';

const shell = { id: 'catalyst', type: 'beaker', capacity_ml: 100, temperature_c: 25, ph: 7,
  volume_ml: 30, mass_g: 30, contents: [], substances: [], position: [0, 0, 0] } as unknown as VesselState;
const program = getProgramById('h2o2_mno2')!;
function sample() { return createStudioSample(program, shell); }
describe('Catalyst inventory, phase and authored timing', () => {
  it('requires catalyst-role species even if the optional condition label is absent', () => {
    const p = { ...program, chemistry: { ...program.chemistry, conditions: undefined } };
    const absent = sample().contents.filter(c => c.formula !== 'MnO2');
    expect(assessProgramConditions(p, absent, { temperature_c: 25 }).ready).toBe(false);
  });
  it.each(['filter', 'foam'] as const)('does not use catalyst separated in %s as bulk catalyst', location => {
    const contents = sample().contents.map(c => c.formula === 'MnO2' ? { ...c, location } : c);
    expect(assessProgramConditions(program, contents, { temperature_c: 25 }).ready).toBe(false);
  });
  it('consumes half the peroxide at its authored half-time, independent of effect clip length', () => {
    const s = sample(), run = planStudioProgram(program, s, 'vi').kinetics!;
    expect(advanceCatalyticProgress(run, s, 1)).toBeCloseTo(0.5, 12);
    expect(advanceCatalyticProgress({ ...run, progress: 0.5 }, s, 1)).toBeCloseTo(0.75, 12);
    expect(advanceCatalyticProgress({ ...run, duration: 100 }, s, 1)).toBeCloseTo(0.5, 12);
    const without = { ...s, contents: s.contents.filter(c => c.formula !== 'MnO2') };
    expect(advanceCatalyticProgress({ ...run, progress: 0.3 }, without, 1)).toBe(0.3);
    expect(advanceCatalyticProgress(run, s, 0)).toBe(0);
  });
  it('preserves catalyst mass and moles rather than reporting new MnO2 precipitate', () => {
    const s = sample(), before = s.contents.find(c => c.formula === 'MnO2')!;
    const result = applyProgramToLedger(program, s, 1);
    expect(result.contents!.find(c => c.formula === 'MnO2')).toEqual(before);
    const deterministic = executeMultiStepReactions(s.contents, s.substances, s.volume_ml, 25, false, 'vi', { preserveQuantities: true });
    expect(deterministic.hasPrecipitate).toBe(false);
    const wrong = s.contents.map(c => c.formula === 'MnO2' ? { ...c, phase: 'aq' } : c);
    const blocked = executeMultiStepReactions(wrong, s.substances, s.volume_ml, 25, false, 'vi', { preserveQuantities: true });
    expect(blocked.reactionsOccurred).toHaveLength(0);
  });
  it('explains separate cold-precipitation, crystallization and catalyst observations', () => {
    expect(reactionObservationGuide(getProgramById('pbno32_ki')!).standing_vi).toContain('tái kết tinh');
    expect(reactionObservationGuide(getProgramById('zn_agno3')!).standing_vi).toContain('bám trên bề mặt');
    expect(reactionObservationGuide(program).standing_vi).toContain('không phải kết tủa mới');
    expect(reactionObservationGuide(getProgramById('h2o2_ki_h2so4')!).catalyst_vi).not.toContain('Xúc tác: KI');
  });
});
