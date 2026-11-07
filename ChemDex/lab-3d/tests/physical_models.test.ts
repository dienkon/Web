import { describe, expect, it } from 'vitest';
import { MatterLedger, conservedTotals } from '../src/physical/MatterLedger';
import { buoyancyForce_N, submergedBoxVolume, viscousDragImpulse, apparentWeight_N } from '../src/physical/fluids';
import { exchangeThermalEnergy, iceWaterEnthalpy, gasPressurePa, exchangeGas, stepWaterBath } from '../src/physical/thermodynamics';
import { CONSTANTS } from '../src/core/units';
import type { MatterParcel } from '../src/physical/types';
import { compiledBox } from '../src/physical/fluids';
import { clippedSolidVolume } from '../src/science/clippedSolidVolume';
import { Euler, Quaternion, Vector3 } from 'three';

const parcel: MatterParcel = { id: 'source', ownerId: 'beaker', species: 'H2O', phase: 'liquid', dispersion: 'bulk',
  location: 'vessel', mass_kg: 0.1, amount_mol: 0.1 / 0.01801528, enthalpy_J: 1234, charge_mol: 0,
  elements_mol: { H: 2 * 0.1 / 0.01801528, O: 0.1 / 0.01801528 } };
describe('Finite material transactions', () => {
  it('preserves mass, heat and atoms through source → flight → receiver/waste, including reload', () => {
    const ledger = new MatterLedger({ revision: 0, parcels: [parcel] }), initial = conservedTotals([parcel]);
    const t = { receipt: 'pour1', sourceId: 'source', destinationId: 'flight', ownerId: 'air', location: 'flight' as const, mass_kg: 0.03 };
    ledger.transfer(t);
    ledger.transfer({ ...t, receipt: 'landing', sourceId: 'flight', destinationId: 'receiver', ownerId: 'receiver', location: 'vessel', mass_kg: 0.02 });
    const restored = new MatterLedger(ledger.snapshot());
    expect(restored.transfer(t).duplicate).toBe(true);
    restored.transfer({ ...t, receipt: 'cleanup', sourceId: 'flight', destinationId: 'waste', ownerId: 'bin', location: 'waste', mass_kg: 0.1 });
    const total = conservedTotals(restored.snapshot().parcels);
    expect(total.mass_kg).toBeCloseTo(initial.mass_kg, 14);
    expect(total.enthalpy_J).toBeCloseTo(initial.enthalpy_J, 10);
    for (const element of ['H', 'O']) expect(total.elements_mol[element]).toBeCloseTo(initial.elements_mol[element], 12);
  });
  it('rejects incompatible destinations atomically', () => {
    const ledger = new MatterLedger({ revision: 0, parcels: [parcel, { ...parcel, id: 'other', species: 'NaCl' }] });
    const before = ledger.snapshot();
    expect(() => ledger.transfer({ receipt: 'bad', sourceId: 'source', destinationId: 'other', ownerId: 'beaker', location: 'vessel', mass_kg: 0.01 })).toThrow();
    expect(ledger.snapshot()).toEqual(before);
  });
});
describe('Buoyancy and viscosity in SI', () => {
  it('analytic box immersion agrees with independently clipped triangles over arbitrary orientations and depths', () => {
    const size: [number, number, number] = [0.01, 0.02, 0.03], mesh = compiledBox(size), volume = size[0] * size[1] * size[2];
    for (let i = 0; i < 120; i++) {
      const q = new Quaternion().setFromEuler(new Euler(i * 0.413, i * 0.731, i * 0.177));
      const n = new Vector3(0, 1, 0).applyQuaternion(q.clone().invert()), depth = (i % 17 - 8) * 0.002;
      const origin = n.clone().multiplyScalar(depth);
      const oracle = clippedSolidVolume(mesh, [{ normal: n.toArray(), offset: depth }], origin.toArray());
      const actual = submergedBoxVolume(size, [0, 0, 0], q.toArray(), depth);
      expect(Math.abs(actual - oracle)).toBeLessThan(volume * 2e-6);
    }
  });
  it('clips oriented physical geometry instead of using a glyph radius', () => {
    const size: [number, number, number] = [0.01, 0.02, 0.03];
    expect(submergedBoxVolume(size, [0, 0, 0], [0, 0, 0, 1], 0)).toBeCloseTo(3e-6, 12);
    expect(submergedBoxVolume(size, [0, 0, 0], [0, 0, Math.sin(0.6), Math.cos(0.6)], 0)).toBeCloseTo(3e-6, 12);
    expect(buoyancyForce_N(1000, 1e-6)).toBeCloseTo(0.00980665, 12);
    expect(apparentWeight_N(0.0027, 1e-6, 1000)).toBeCloseTo(0.0017 * CONSTANTS.g, 12);
  });
  it('viscous drag dissipates kinetic energy without reversing velocity at a large timestep', () => {
    const mass = 0.001, v: [number, number, number] = [1, -2, 3];
    const water = viscousDragImpulse(v, mass, 0.001, 1000, 0.001, 0.1);
    const glycerol = viscousDragImpulse(v, mass, 0.001, 1261, 1.412, 0.1);
    expect(Math.hypot(...glycerol)).toBeGreaterThan(Math.hypot(...water));
    glycerol.forEach((p, i) => { expect((v[i] + p / mass) * v[i]).toBeGreaterThanOrEqual(-1e-12); });
  });
});
describe('Thermal, phase and pneumatic references', () => {
  it('two finite thermal nodes approach the analytic equilibrium without creating energy', () => {
    const a = { mass_kg: 1, cp_J_kgK: 4184, temperature_K: 353.15 }, b = { mass_kg: 0.1, cp_J_kgK: 900, temperature_K: 293.15 };
    const r = exchangeThermalEnergy(a, b, 100, 1000);
    const equilibrium = (4184 * a.temperature_K + 90 * b.temperature_K) / 4274;
    expect(r.a.temperature_K).toBeCloseTo(equilibrium, 10);
    expect(r.b.temperature_K).toBeCloseTo(equilibrium, 10);
    expect(r.transferred_J).toBeCloseTo((a.temperature_K - r.a.temperature_K) * 4184, 8);
  });
  it('latent fusion holds temperature and accounts for partial melting and freezing', () => {
    const state = iceWaterEnthalpy(0.01, 1667.5);
    expect(state.temperature_K).toBe(273.15); expect(state.solid_kg).toBeCloseTo(0.005, 12); expect(state.liquid_kg).toBeCloseTo(0.005, 12);
    expect(iceWaterEnthalpy(0.01, -210).temperature_K).toBeCloseTo(263.15, 12);
    expect(() => iceWaterEnthalpy(0.01, -1e8)).toThrow();
  });
  it('obeys ideal gas law, finite link conservation and cooling suck-back direction', () => {
    const a = { amount_mol: 0.01, volume_m3: 0.001, temperature_K: 300 }, b = { ...a, temperature_K: 200 };
    expect(gasPressurePa(a)).toBeCloseTo(24943.387854, 4);
    const r = exchangeGas(a, b, 1e-6, 100);
    expect(r.a.amount_mol + r.b.amount_mol).toBeCloseTo(0.02, 14);
    expect(gasPressurePa(r.a)).toBeCloseTo(gasPressurePa(r.b), 8);
    const cooled = exchangeGas({ ...a, temperature_K: 150 }, b, 1e-6, 0.1);
    expect(cooled.transferred_mol).toBeLessThan(0);
  });
  it('bath electrical input equals stored heat, sample heat and ambient losses', () => {
    let bath = { mass_kg: 0.5, cp_J_kgK: 4184, temperature_K: 293.15, setpoint_K: 333.15, maxPower_W: 100,
      ambientConductance_W_K: 2, electrical_J: 0, loss_J: 0, sampleHeat_J: 0 };
    let sample = { mass_kg: 0.1, cp_J_kgK: 4184, temperature_K: 293.15 };
    for (let i = 0; i < 1200; i++) { const next = stepWaterBath(bath, sample, 293.15, 3, 1 / 120); bath = next.bath; sample = next.sample; }
    const retained = 0.5 * 4184 * (bath.temperature_K - 293.15) + 0.1 * 4184 * (sample.temperature_K - 293.15);
    expect(bath.electrical_J - bath.loss_J).toBeCloseTo(retained, 6);
    expect(sample.temperature_K).toBeGreaterThan(293.15);
    expect(bath.temperature_K).toBeLessThanOrEqual(bath.setpoint_K);
  });
});
