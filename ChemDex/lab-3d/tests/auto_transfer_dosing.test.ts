import { describe, expect, it } from 'vitest';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { CHEMICAL_DATABASE } from '../src/data/chemicals';
import { sameMolecularFormula } from '../src/science/speciesIdentity';
import { goldenRainInventory, GOLDEN_RAIN_PROTOCOL } from '../src/science/goldenRainProtocol';

describe('automatic finite liquid delivery', () => {
  it('models stock solution volume and carrier water from the catalog concentration', () => {
    const experiment = new AutoExperiment('cuso4_naoh', false);
    const copperStock = CHEMICAL_DATABASE.find(chemical => chemical.formula === 'CuSO4')!;
    const copper = experiment.donors.find(donor => sameMolecularFormula(donor.row.formula, 'CuSO4'))!;
    expect(copper.solutionVolume_ml).toBeCloseTo(copper.row.moles / copperStock.defaultConcentration! * 1000, 12);
    expect(copper.components.some(component => sameMolecularFormula(component.formula, 'H2O') && component.phase === 'l')).toBe(true);
    expect(copper.doseMode).toBe('pour');
    for (const donor of experiment.donors) expect(donor.totalMass_g)
      .toBeCloseTo(donor.components.reduce((sum, component) => sum + component.mass_g, 0), 10);
  });

  it('uses finite separate drops whose receiver inventory changes only at contact', () => {
    const experiment = new AutoExperiment('hno3_koh', false);
    for (let i = 0; i < 60 * 120 && !(experiment.phase === 'dose' && experiment.donors[experiment.donorIndex]?.doseMode === 'dropper'); i++)
      experiment.tick(1 / 60);
    expect(experiment.phase).toBe('dose');
    const donor = experiment.donors[experiment.donorIndex];
    expect(donor.solutionVolume_ml).toBeLessThanOrEqual(0.2);
    expect(donor.dropSchedule?.count).toBeGreaterThan(1);
    const total = experiment.sample.mass_g + experiment.donors.reduce((sum, item) => sum + item.remaining, 0);
    const initialMoles = experiment.sample.contents.find(row => sameMolecularFormula(row.formula, donor.row.formula))?.moles ?? 0;
    for (let i = 0; i < 8; i++) experiment.tick(1 / 60);
    expect(donor.fraction).toBe(0);
    expect(experiment.sample.contents.find(row => sameMolecularFormula(row.formula, donor.row.formula))?.moles ?? 0).toBe(initialMoles);
    for (let i = 0; i < 120 && donor.fraction === 0; i++) experiment.tick(1 / 60);
    expect(donor.fraction).toBeCloseTo(Math.min(0.05, donor.solutionVolume_ml) / donor.solutionVolume_ml, 10);
    expect(experiment.sample.contents.find(row => sameMolecularFormula(row.formula, donor.row.formula))?.moles).toBeGreaterThan(0);
    expect(experiment.sample.mass_g + (experiment.sample.evaporated_ml ?? 0)
      + experiment.donors.reduce((sum, item) => sum + item.remaining, 0) + experiment.inFlightMass_g).toBeCloseTo(total, 2);
    experiment.paused = true;
    const held = { fraction: donor.fraction, sample: structuredClone(experiment.sample), time: experiment.elapsed };
    experiment.tick(1);
    expect(donor.fraction).toBe(held.fraction); expect(experiment.sample).toEqual(held.sample); expect(experiment.elapsed).toBe(held.time);
  });

  it('retains stock carrier water in lesson-ledger reactions and fits large automatic recipes', () => {
    const lesson = new AutoExperiment('phenol_naoh', false);
    const initialMass = lesson.donors.reduce((sum, donor) => sum + donor.totalMass_g, 0);
    for (let frame = 0; frame < 60 * 80 && lesson.phase !== 'complete' && lesson.phase !== 'error'; frame++) lesson.tick(1 / 60);
    expect(lesson.phase).toBe('complete');
    expect(lesson.sample.mass_g + Object.values(lesson.sample.escapedGas_g ?? {}).reduce((sum, mass) => sum + mass, 0)
      + (lesson.sample.evaporated_ml ?? 0)).toBeCloseTo(initialMass, 7);

    const large = new AutoExperiment('kmno4_oxalic', false);
    expect(large.sample.capacity_ml).toBe(250);
    expect(large.donors.reduce((sum, donor) => sum + donor.solutionVolume_ml, 0)).toBeLessThan(large.sample.capacity_ml);
  });

  it('keeps golden rain as a distinct staged reheating and natural cooling experiment', () => {
    const experiment = new AutoExperiment('golden_rain', false);
    expect(experiment.program.id).toBe('pbno32_ki');
    expect(experiment.id).toBe('golden_rain');
    expect(experiment.sample.mass_g).toBe(0);
    const initial = experiment.donors.reduce((sum, donor) => sum + donor.totalMass_g, 0);
    expect(initial).toBeGreaterThan(GOLDEN_RAIN_PROTOCOL.water_g);
    for (let frame = 0; frame < 60 * 360 && experiment.phase !== 'condition'; frame++) experiment.tick(1 / 60);
    expect(experiment.phase).toBe('condition');
    for (let frame = 0; frame < 60 * 15 && goldenRainInventory(experiment.sample).solid_g <= 1e-9; frame++) experiment.tick(1 / 60);
    const cold = goldenRainInventory(experiment.sample);
    const totalMoles = experiment.sample.contents.filter(row => sameMolecularFormula(row.formula, 'PbI2'))
      .reduce((sum, row) => sum + row.moles, 0);
    expect(cold.total_g).toBeGreaterThan(0.13);
    expect(cold.solid_g).toBeGreaterThan(0);
    for (let frame = 0; frame < 60 * 240 && experiment.sample.temperature_c < 60; frame++) experiment.tick(1 / 60);
    expect(experiment.phase).toBe('condition');
    expect(experiment.flame).toBe(true);
    for (let frame = 0; frame < 60 * 240 && experiment.phase !== 'cool'; frame++) experiment.tick(1 / 60);
    expect(experiment.phase).toBe('cool');
    expect(experiment.flame).toBe(false);
    expect(experiment.electricalHeat_J).toBeGreaterThan(0);
    const heatingEnergy = experiment.electricalHeat_J;
    experiment.tick(1 / 60);
    expect(experiment.electricalHeat_J).toBe(heatingEnergy);
    expect(experiment.sample.temperature_c).toBeGreaterThanOrEqual(GOLDEN_RAIN_PROTOCOL.heatTarget_c - 1);
    expect(goldenRainInventory(experiment.sample).solid_g).toBeLessThan(cold.solid_g * 0.01);
    for (let frame = 0; frame < 60 * 2400 && experiment.phase !== 'settle'; frame++) experiment.tick(1 / 60);
    expect(experiment.phase).toBe('settle');
    expect(experiment.sample.temperature_c).toBeLessThan(30);
    const final = goldenRainInventory(experiment.sample);
    expect(final.plates_g).toBeGreaterThan(0);
    expect(experiment.sample.contents.filter(row => sameMolecularFormula(row.formula, 'PbI2'))
      .reduce((sum, row) => sum + row.moles, 0)).toBeCloseTo(totalMoles, 7);
  }, 90000);
});
