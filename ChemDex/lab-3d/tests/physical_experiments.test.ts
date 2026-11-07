import { afterEach, describe, expect, it } from 'vitest';
import { createReferenceExperiment, stepReferenceExperiment, type ExperimentKind } from '../src/physical/ReferenceExperiments';
import { capturePhysicalLab, restorePhysicalLab, usePhysicsStore } from '../src/physical/usePhysicsStore';
import { sampleDefinition } from '../src/physical/catalog';
import { CONSTANTS } from '../src/core/units';
import { MATERIALS } from '../src/physical/materials';
const simulate = (kind: ExperimentKind, seconds: number, options = {}) => {
  let state = createReferenceExperiment(kind, kind, options);
  for (let i = 0; i < Math.round(seconds * 120); i++) state = stepReferenceExperiment(state, 1 / 120);
  return state;
};
afterEach(() => { usePhysicsStore.setState({ enabled: false }); restorePhysicalLab(); });
describe('New instruments have finite controlled measurement scenarios', () => {
  it('force meter agrees with weight minus displaced fluid force for all solid references', () => {
    for (const material of ['borosilicate', 'steel', 'aluminum', 'polyethylene']) {
      const e = createReferenceExperiment('force', 'force_meter', { material, liquid: 'water' });
      expect(e.values.reading_N).toBeCloseTo((MATERIALS[material].density_kg_m3 - 998.2) * 1e-6 * CONSTANTS.g, 12);
    }
  });
  it('pressure meter follows absolute temperature at fixed moles and volume', () => {
    const cold = createReferenceExperiment('p', 'pressure_sensor', { temperature_K: 293.15 });
    const hot = createReferenceExperiment('p', 'pressure_sensor', { temperature_K: 373.15 });
    expect(hot.values.pressure_Pa / cold.values.pressure_Pa).toBeCloseTo(373.15 / 293.15, 12);
  });
  it('bulb suction preserves finite water and gas while approaching hydrostatic balance', () => {
    const e = simulate('pipette_bulb', 5), v = e.values;
    expect(v.sample_m3).toBeGreaterThan(2e-6); expect(v.sample_m3).toBeLessThan(3e-6);
    expect(v.source_m3 + v.sample_m3).toBeCloseTo(e.initial.water_m3, 14);
    expect(v.air_mol).toBe(e.initial.air_mol);
    const head = MATERIALS.water.density_kg_m3 * CONSTANTS.g * v.sample_m3 / v.area_m2;
    expect(Math.abs(v.pressure_Pa + head - CONSTANTS.P_ATM)).toBeLessThan(0.01);
  });
  it('gas collection retains source+collector gas and displaced water exactly', () => {
    const e = simulate('gas_collector', 30), v = e.values;
    expect(v.gasVolume_m3).toBeGreaterThan(0);
    expect(v.source_mol + v.collected_mol).toBeCloseTo(e.initial.totalGas_mol, 14);
    expect(v.jarWater_m3 + v.tankWater_m3).toBeCloseTo(e.initial.water_m3, 14);
    expect(v.gasVolume_m3 + v.jarWater_m3).toBeCloseTo(v.capacity_m3, 14);
  });
  it('viscosity cases reproduce Stokes terminal speed in the declared Reynolds domain', () => {
    for (const liquid of ['water', 'glycerol', 'silicone_oil']) {
      const e = simulate('viscosity', 1, { liquid }), f = MATERIALS[liquid], v = e.values;
      const oracle = 2 / 9 * (2700 - f.density_kg_m3) * CONSTANTS.g * (5e-6) ** 2 / f.viscosity_Pas!;
      expect(v.velocity_m_s).toBeCloseTo(oracle, 12); expect(v.reynolds).toBeLessThan(0.1);
    }
  });
  it('ice test converts only supplied enthalpy into heat and latent fusion', () => {
    const e = simulate('ice', 30), v = e.values;
    expect(v.supplied_J).toBeCloseTo(600, 8);
    expect(v.enthalpy_J - e.initial.enthalpy_J).toBeCloseTo(600, 8);
    expect(v.temperature_K).toBe(273.15);
    expect(v.solid_kg + v.liquid_kg).toBeCloseTo(v.mass_kg, 14);
  });
  it('water bath closes its electrical/thermal budget', () => {
    const e = simulate('water_bath', 10), v = e.values;
    const stored = (v.bath_K - 293.15) * 0.5 * 4184 + (v.sample_K - 293.15) * 0.1 * 4184;
    expect(v.electrical_J - v.loss_J).toBeCloseTo(stored, 6);
  });
  it('persists expansion positions, velocities, experiment inventories and clock together', () => {
    const input = { id: 'sample', definition: sampleDefinition('aluminum'), position_m: [0, 1, 0] as [number, number, number],
      rotation: [0, 0, 0, 1] as [number, number, number, number], contentsMass_kg: 0, temperature_K: 293.15, locked: false };
    usePhysicsStore.setState({ enabled: true, expansions: [input], resumeTick: 240, seed: 99, experiments: [simulate('pipette_bulb', 1)] });
    const save = capturePhysicalLab(); restorePhysicalLab(save);
    expect(capturePhysicalLab()).toEqual(save);
    restorePhysicalLab({ ...save, version: 2 } as never);
    expect(usePhysicsStore.getState().expansions).toEqual([]);
  });
});
