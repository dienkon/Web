import { describe, expect, it } from 'vitest';
import { evaporativeCooling } from '../src/science/evaporativeCooling';
import { waterLatentHeatJ_G } from '../src/science/waterThermodynamics';
import { applyThermalEnergy, sampleHeatCapacity } from '../src/engine/thermalState';
import { waterBoilingPointAtPressure } from '../src/science/labEnvironment';
import type { VesselState } from '../src/types/chemistry';

const water = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'b', name: 'b', type: 'beaker',
  position: [0, 0, 0], rotationY: 0, isLocked: false, volume_ml: 100, volume: 0.4, capacity_ml: 250,
  mass_g: 100, temperature_c: 80, contents: [{ formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 }],
  substances: ['H2O'], ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false, ...patch });

// Independent integration of dT/de=-L(T)/(C0-Cp*e), Q_lat'=L(T),
// Q_carried'=Cp*T. No quadrature/root code from the production solver.
function rk4(temperature: number, capacity: number, mass: number) {
  const h = mass / 2000; let state = [temperature, 0, 0];
  const slope = (e: number, s: number[]) => [-waterLatentHeatJ_G(s[0]) / (capacity - 4.184 * e),
    waterLatentHeatJ_G(s[0]), 4.184 * s[0]];
  const add = (s: number[], k: number[], scale: number) => s.map((v, i) => v + scale * k[i]);
  for (let i = 0; i < 2000; i++) {
    const e = i * h, a = slope(e, state), b = slope(e + h / 2, add(state, a, h / 2));
    const c = slope(e + h / 2, add(state, b, h / 2)), d = slope(e + h, add(state, c, h));
    state = state.map((v, j) => v + h * (a[j] + 2 * b[j] + 2 * c[j] + d[j]) / 6);
  }
  return state;
}

describe('Finite evaporation with changing heat capacity and L(T)', () => {
  it('agrees with independent RK4 for a large cooling packet and the vapor enthalpy flux', () => {
    const sample = water(), capacity = sampleHeatCapacity(sample);
    const result = evaporativeCooling(80, capacity, 100, 5), reference = rk4(80, capacity, 5);
    expect(result.limitedBy).toBe('none'); expect(result.temperature_c).toBeCloseTo(reference[0], 8);
    expect(result.latentEnergy_J).toBeCloseTo(reference[1], 5);
    expect(result.vaporSensibleEnergy_J).toBeCloseTo(reference[2], 5);
    // The old frozen-C/L result was ~54.445 C for this exact packet.
    expect(result.temperature_c).toBeGreaterThan(53.46); expect(result.temperature_c).toBeLessThan(53.47);
  });
  it('gives the same state and cumulative phase energies for one, ten or one hundred packets', () => {
    const run = (count: number) => {
      let sample = water(), latent = 0, carried = 0;
      for (let i = 0; i < count; i++) {
        const step = applyThermalEnergy(sample, 0, 1 / count, 5 / count);
        sample = { ...sample, ...step }; latent += step.latentEnergy_J; carried += step.vaporSensibleEnergy_J;
      }
      return { sample, latent, carried };
    };
    const reference = run(1);
    for (const n of [10, 100]) {
      const next = run(n); expect(next.sample.temperature_c).toBeCloseTo(reference.sample.temperature_c, 8);
      expect(next.sample.mass_g).toBeCloseTo(95, 9); expect(next.latent).toBeCloseTo(reference.latent, 5);
      expect(next.carried).toBeCloseTo(reference.carried, 5);
      expect(next.sample.contents[0].moles * 18.015).toBeCloseTo(next.sample.contents[0].mass_g, 9);
    }
  });
  it('stops at 0 C with a finite energy-limited mass, independently of packet splitting', () => {
    const run = (n: number) => {
      let t = 80, c = 451.6, available = 100, mass = 0, latent = 0, carried = 0;
      for (let i = 0; i < n; i++) {
        const r = evaporativeCooling(t, c, available, 100 / n);
        t = r.temperature_c; c = r.capacity_J_K; available -= r.evaporated_g;
        mass += r.evaporated_g; latent += r.latentEnergy_J; carried += r.vaporSensibleEnergy_J;
      }
      return { t, mass, latent, carried };
    };
    const one = run(1), many = run(100);
    expect(one.t).toBe(0); expect(many.t).toBe(0);
    expect(one.mass).toBeGreaterThan(10); expect(one.mass).toBeLessThan(20);
    expect(many.mass).toBeCloseTo(one.mass, 8);
    expect(one.latent + one.carried).toBeCloseTo(451.6 * 80, 6);
    expect(many.latent).toBeCloseTo(one.latent, 5); expect(many.carried).toBeCloseTo(one.carried, 5);
  });
  it('can evaporate a tiny finite sample from holder heat without fabricating water or a negative capacity', () => {
    const r = evaporativeCooling(80, 33.2 + 0.001 * 4.184, 0.001, 1);
    expect(r.limitedBy).toBe('inventory'); expect(r.evaporated_g).toBe(0.001);
    expect(r.capacity_J_K).toBeCloseTo(33.2, 12); expect(r.temperature_c).toBeGreaterThan(79);
    expect(r.temperature_c).toBeLessThan(80);
  });
  it('matches the analytic constant-L solution below the inherited 0.01 C boundary', () => {
    const t = 0.005, capacity = 33.2 + 4.184 * 0.001, mass = 1e-5, latent = waterLatentHeatJ_G(0);
    const result = evaporativeCooling(t, capacity, 0.001, mass);
    const expectedDrop = -latent / 4.184 * Math.log1p(-4.184 * mass / capacity);
    expect(result.temperature_c).toBeCloseTo(t - expectedDrop, 12);
    expect(result.latentEnergy_J).toBeCloseTo(latent * mass, 10);
    const floor = evaporativeCooling(t, capacity, 0.001, 0.001);
    expect(floor.temperature_c).toBe(0);
    expect(floor.evaporated_g).toBeCloseTo(capacity / 4.184 * -Math.expm1(-4.184 * t / latent), 12);
  });
  it('keeps solutes and their heat capacity while only water moles leave', () => {
    const initial = water({ mass_g: 101, contents: [...water().contents,
      { formula: 'NaCl', phase: 'aq', mass_g: 1, moles: 1 / 58.44 }] });
    const result = applyThermalEnergy(initial, 0, 1, 5), combined = { ...initial, ...result };
    expect(result.contents!.find(c => c.formula === 'NaCl')!.mass_g).toBe(1);
    expect(combined.mass_g).toBe(96);
    expect(sampleHeatCapacity(combined)).toBeCloseTo(sampleHeatCapacity(initial) - 5 * 4.184, 10);
    expect(result.storedSensibleEnergyChange_J + result.latentEnergy_J + result.vaporSensibleEnergy_J).toBeCloseTo(0, 7);
  });
  it('closes an external sensible heat packet followed by finite evaporation', () => {
    const initial = water({ temperature_c: 25 }), result = applyThermalEnergy(initial, 500, 1, 1);
    expect(result.storedSensibleEnergyChange_J + result.latentEnergy_J + result.vaporSensibleEnergy_J).toBeCloseTo(500, 7);
    const heated = applyThermalEnergy(initial, 500), cooled = applyThermalEnergy({ ...initial, ...heated }, 0, 1, 1);
    expect(result.temperature_c).toBeCloseTo(cooled.temperature_c, 10);
    expect(result.latentEnergy_J).toBeCloseTo(cooled.latentEnergy_J, 8);
  });
  it('includes fusion and outgoing vapor in the same stored-energy balance', () => {
    const initial = water({ mass_g: 5, volume_ml: 4, temperature_c: 0, contents: [
      { formula: 'H2O', phase: 'l', mass_g: 4, moles: 4 / 18.015 },
      { formula: 'H2O', phase: 's', mass_g: 1, moles: 1 / 18.015 }] });
    const result = applyThermalEnergy(initial, 434, 1, 0.01);
    expect(result.evaporatedStep_g).toBe(0.01); expect(result.iceVolume_ml).toBe(0);
    expect(result.storedSensibleEnergyChange_J + result.latentEnergy_J + result.vaporSensibleEnergy_J).toBeCloseTo(434, 7);
  });
  it('accounts for the sensible enthalpy carried out by boiling and after complete dryout', () => {
    const point = waterBoilingPointAtPressure();
    for (const mass of [100, 0.001]) {
      const initial = water({ temperature_c: point, mass_g: mass, volume_ml: mass,
        contents: [{ formula: 'H2O', phase: 'l', mass_g: mass, moles: mass / 18.015 }] });
      const result = applyThermalEnergy(initial, 100, 1);
      expect(result.vaporSensibleEnergy_J).toBeCloseTo(result.evaporatedStep_g * 4.184 * point, 9);
      expect(result.storedSensibleEnergyChange_J + result.latentEnergy_J + result.vaporSensibleEnergy_J).toBeCloseTo(100, 7);
    }
  });
  it('leaves sealed samples and invalid requests without an evaporation sink', () => {
    const result = applyThermalEnergy(water({ isSealed: true }), 0, 1, 5);
    expect(result.evaporatedStep_g).toBe(0); expect(result.vaporSensibleEnergy_J).toBe(0);
    for (const args of [[NaN, 100, 1, 1], [25, 0, 1, 1], [25, 1, 10, 1], [25, 100, 1, Infinity], [25, 100, -1, 1], [25, 100, 1, -1]]) {
      const r = evaporativeCooling(args[0], args[1], args[2], args[3]);
      expect(r.limitedBy).toBe('unsupported'); expect(r.evaporated_g).toBe(0); expect(r.latentEnergy_J).toBe(0);
    }
  });
});
