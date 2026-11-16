import { describe, expect, it } from 'vitest';
import { AutoExperiment, AUTO_TIMING } from '../src/vfx/autoplay/AutoExperiment';
import { computeMolarMass } from '../src/engine/ledger';
import type { AutoDonor } from '../src/vfx/autoplay/autoDonors';

function beginDonor(experiment: AutoExperiment, donor: AutoDonor) {
  experiment.donorIndex = experiment.donors.indexOf(donor);
  experiment.phase = 'carry';
  experiment.phaseTime = AUTO_TIMING.carry - 1 / 60;
  experiment.tick(1 / 60);
  expect(experiment.phase).toBe('dose');
}

describe('automatic accepted liquid volume', () => {
  it.each([
    ['hno3_koh', 'HNO3', 1.41],
    ['h2o2_ki_h2so4', 'H2O2', 1.11],
    ['ethanol_sodium', 'C2H5OH', 0.8],
  ])('retains %s packet volume through frames without an arrival', (id, formula, density) => {
    const experiment = new AutoExperiment(id as string, false);
    const donor = experiment.donors.find(item => item.row.formula === formula)!;
    expect(donor.totalMass_g / donor.solutionVolume_ml).toBeCloseTo(density as number, 10);
    expect(donor.doseMode).toBe('dropper');
    beginDonor(experiment, donor);
    for (let i = 0; i < 180 && !donor.liquidDrops?.[0]?.arrived; i++) experiment.tick(1 / 60);
    const first = donor.liquidDrops![0];
    expect(first.arrived).toBe(true);
    expect(experiment.sample.volume_ml).toBeCloseTo(first.volume_ml, 12);
    expect(experiment.sample.mass_g).toBeCloseTo(first.mass_g, 12);

    for (let i = 0; i < 15; i++) {
      experiment.tick(1 / 60);
      expect(donor.liquidDrops!.filter(drop => drop.arrived)).toHaveLength(1);
      expect(experiment.sample.volume_ml).toBeCloseTo(first.volume_ml, 12);
      expect(experiment.sample.volume).toBeCloseTo(first.volume_ml / experiment.sample.capacity_ml, 12);
    }
  });

  it('adds mixed-density continuous portions and discrete packets by their accepted volumes', () => {
    const experiment = new AutoExperiment('hno3_koh', false);
    // Without the acid there is no neutralization; this isolates transfer and
    // thermal ownership while combining actual catalog donors and dose modes.
    const water = experiment.donors.find(item => item.row.formula === 'H2O')!;
    const alkali = experiment.donors.find(item => item.row.formula === 'KOH')!;
    const alcohol = new AutoExperiment('ethanol_sodium', false).donors.find(item => item.row.formula === 'C2H5OH')!;
    experiment.donors.splice(0, experiment.donors.length, water, alkali, alcohol);
    expect(alkali.doseMode).toBe('pour'); expect(alcohol.doseMode).toBe('dropper');
    expect(alkali.totalMass_g / alkali.solutionVolume_ml).toBeCloseTo(1.05, 10);
    expect(alcohol.totalMass_g / alcohol.solutionVolume_ml).toBeCloseTo(0.8, 10);
    let checkedDoseFrames = 0;
    for (let i = 0; i < 60 * 60 && experiment.donorIndex < experiment.donors.length; i++) {
      experiment.tick(1 / 60);
      expect(experiment.error).toBeNull();
      const accepted = experiment.donors.reduce((sum, donor) => sum + donor.solutionVolume_ml * donor.fraction, 0);
      const evaporated = (experiment.sample.evaporated_ml ?? 0) - (experiment.sample.wallCondensation?.returned_g ?? 0);
      expect(experiment.sample.volume_ml + evaporated).toBeCloseTo(accepted, 7);
      if (experiment.phase === 'dose') checkedDoseFrames++;
    }
    expect(experiment.donorIndex).toBe(experiment.donors.length);
    expect(checkedDoseFrames).toBeGreaterThan(300);
    expect(experiment.donors.every(donor => donor.fraction === 1)).toBe(true);
  });

  it.each(['s', 'g'])('preserves resident liquid volume while a %s donor releases and arrives', phase => {
    const experiment = new AutoExperiment('mg_o2_burn', false);
    experiment.sourceEnabled = false;
    const donor = experiment.donors.find(item => item.row.phase === phase)!;
    const resident = { formula: 'C2H5OH', phase: 'l' as const, mass_g: 20, moles: 20 / computeMolarMass('C2H5OH') };
    experiment.sample = { ...experiment.sample, contents: [resident], substances: [resident.formula],
      mass_g: 20, volume_ml: 25, volume: 25 / experiment.sample.capacity_ml };
    beginDonor(experiment, donor);
    for (let i = 0; i < 600 && experiment.phase === 'dose'; i++) {
      experiment.tick(1 / 60);
      expect(experiment.error).toBeNull();
      expect(experiment.sample.volume_ml).toBe(25);
      expect(experiment.sample.volume).toBe(25 / experiment.sample.capacity_ml);
    }
    expect(experiment.phase).toBe('return');
    expect(donor.fraction).toBe(1);
    expect(experiment.sample.contents.find(row => row.formula === donor.row.formula)?.mass_g).toBeCloseTo(donor.totalMass_g, 10);
    expect(experiment.sample.mass_g).toBeCloseTo(20 + donor.totalMass_g, 10);
  });
});
