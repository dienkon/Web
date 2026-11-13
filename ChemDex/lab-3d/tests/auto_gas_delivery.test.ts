import { describe, expect, it } from 'vitest';
import { AutoExperiment, AUTO_EXPERIMENTS } from '../src/vfx/autoplay/AutoExperiment';
import { gasInlet, gasSourceHome, gasSyringeSize, gasVolumeMl } from '../src/vfx/autoplay/gasDelivery';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';

describe('automatic gas reagents use a finite metered delivery line', () => {
  it.each(AUTO_EXPERIMENTS.filter(e => e.program.chemistry.species.some(s => s.phase === 'g' && s.role === 'reactant')).map(e => [e.id]))('%s never lifts or tilts a gas source and never emits a pouring stream', id => {
    const e = new AutoExperiment(id, false);
    let sawGas = false;
    for (let i = 0; i < 3000 && !['complete', 'error'].includes(e.phase); i++) {
      e.tick(0.1);
      const donor = e.donors[e.donorIndex];
      if (!donor || donor.row.phase !== 'g') continue;
      sawGas = true;
      expect(e.donorPose.tilt).toBe(0); expect(e.streamActive).toBe(false);
      expect(e.donorPose.position).toEqual(gasSourceHome(e.gasOrdinal(e.donorIndex), donor.row.moles));
      if (e.gasValveOpen) expect(e.gasDeliveryRate_ml_s).toBeGreaterThanOrEqual(0);
    }
    expect(sawGas).toBe(true); expect(e.error).toBeNull();
    expect(e.donors.every(d => d.remaining === 0)).toBe(true);
  });
  it('finishes solids and liquids before sealing and connecting a gas reagent', () => {
    const e = new AutoExperiment('nh3_hcl', false);
    expect(e.hasGasSupply).toBe(true); expect(gasVolumeMl(0.001)).toBeCloseTo(24.4654, 3);
    for (let i = 0; i < 3000 && e.phase !== 'complete'; i++) e.tick(0.1);
    expect(e.gasValveOpen).toBe(false); expect(e.gasDeliveryRate_ml_s).toBe(0);
  });
  it('places an inlet below the actual liquid surface and inside the beaker', () => {
    const e = new AutoExperiment('cuso4_naoh', false);
    for (let i = 0; i < 200 && e.sample.volume_ml < 10; i++) e.tick(0.1);
    const inlet = gasInlet(e, 0);
    expect(inlet[1]).toBeLessThan(1.04 + vesselLiquidSurfaceY(e.sample));
    expect(inlet[1]).toBeGreaterThan(1.04 - 0.96);
  });
  it('uses a gas syringe whose calibrated barrel volume matches the finite molar stock', () => {
    for (const n of [0.001, 0.003, 0.005]) {
      const size = gasSyringeSize(n), cm = getVesselProfile('beaker', 100).sceneScale;
      expect(Math.PI * size.radius ** 2 * size.length * cm ** 3).toBeCloseTo(gasVolumeMl(n), 9);
    }
  });
  it('does not replay transferred CO2 as a second source of reaction bubbles', () => {
    const e = new AutoExperiment('caoh2_co2', false);
    for (let i = 0; i < 6000 && !(e.phase === 'dose' && e.donors[e.donorIndex]?.row.phase === 'g' && e.phaseTime > 1.2); i++) e.tick(1 / 60);
    expect(e.phase).toBe('dose');
    expect(e.sample.gasFlux?.generated_mol_s.CO2 ?? 0).toBe(0);
    expect(e.donors[e.donorIndex].fraction).toBeGreaterThan(0);
  });
  it.each(AUTO_EXPERIMENTS.map(e => [e.id]))('%s never stocks zero-amount products as reagent apparatus', id => {
    const e = new AutoExperiment(id, false);
    expect(e.donors.every(d => d.row.mass_g > 0 && d.row.moles > 0)).toBe(true);
    if (['ethanol_sodium', 'glucose_fermentation', 'caco3_heat'].includes(id)) expect(e.hasGasSupply).toBe(false);
  });
});
