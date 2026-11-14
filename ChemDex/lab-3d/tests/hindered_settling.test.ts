import { describe, expect, it } from 'vitest';
import { settlingHindrance, supportsCompactHindrance } from '../src/science/hinderedSettling';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { PRNG } from '../src/core/rng';
import type { VesselState } from '../src/types/chemistry';

describe('concentrated suspension settling', () => {
  it('matches the reported low-Re hard-sphere branches and the dilute limit', () => {
    const brownian = settlingHindrance(1e-6, 2500, 1000, 0.001, 25, 10, 90);
    expect(brownian.volumeFraction).toBe(0.1);
    expect(brownian.exponent).toBe(5.6);
    expect(brownian.factor).toBeCloseTo(0.9 ** 5.6, 14);
    const coarse = settlingHindrance(0.0005, 2500, 1000, 1, 25, 10, 90);
    expect(coarse.reynolds).toBeLessThan(0.1);
    expect(coarse.peclet).toBeGreaterThan(1e8);
    expect(coarse.exponent).toBe(4.48);
    expect(coarse.factor).toBeCloseTo(0.9 ** 4.48, 14);
    expect(settlingHindrance(1e-6, 2500, 1000, 0.001, 25, 0, 100).factor).toBe(1);
  });
  it('does not apply sphere crowding to porous gels, plates or unknown matter', () => {
    for (const [formula, formation] of [['Cu(OH)2'], ['AgCl'], ['Unknown'], ['PbI2', 'CRYSTAL_PLATE']]) {
      const profile = getPrecipitateProfile(formula, formation);
      expect(supportsCompactHindrance(profile)).toBe(false);
      expect(settlingHindrance(1e-6, 2500, 1000, 0.001, 25, 10, 90, false).factor).toBe(1);
    }
    expect(settlingHindrance(1e-3, 4500, 1000, 0.001, 25, 10, 90).limit).toBe('outside-low-re');
    expect(settlingHindrance(1e-6, 4500, 1000, 0.001, 25, 90, 10).limit).toBe('dense-extrapolation');
    expect(settlingHindrance(1e-6, 4500, 1000, 0.001, 25, NaN, 10).limit).toBe('invalid-input');
  });
  it('slows concentrated grains, recovers on dilution and preserves mass under display-budget changes', () => {
    const base = { substance: 'BaSO4', temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
      radius: 10, liquidBottomY: 0, surfaceY: 100, precipitateAmount_g: 45, volume_ml: 90 };
    const run = (budget: number) => {
      const s = new PrecipitationSystem(budget, 'BaSO4', new PRNG(5));
      s.update(0.2, base); return s;
    };
    const a = run(10), b = run(100);
    expect(a.hindrance!.factor).toBeCloseTo(0.9 ** 5.6, 14);
    expect(a.hindrance).toEqual(b.hindrance);
    expect(a.representedMass_g).toBeCloseTo(45, 10);
    expect(b.representedMass_g).toBeCloseTo(45, 10);
    const speed = a.particles[0].sedimentationSpeed;
    a.update(0.1, { ...base, volume_ml: 990 });
    expect(a.particles[0].sedimentationSpeed).toBeGreaterThan(speed);
    expect(a.hindrance!.volumeFraction).toBeCloseTo(0.01, 14);
    expect(a.representedMass_g).toBeCloseTo(45, 10);
  });
  it('uses shared compact suspension and excludes the settled portion of mixed solids', () => {
    const s = new PrecipitationSystem(20, 'BaSO4', new PRNG(7));
    const params = { substance: 'BaSO4', temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
      radius: 10, liquidBottomY: 0, surfaceY: 100, precipitateAmount_g: 4.5, volume_ml: 90,
      sharedCompactSuspendedVolume_ml: 10 };
    s.update(0.2, params);
    expect(s.hindrance!.volumeFraction).toBe(0.1);
    const v = { id: 'mixed-hindrance', type: 'beaker', capacity_ml: 250, position: [0, 0, 0], rotationY: 0,
      volume_ml: 90, mass_g: 145, temperature_c: 25, contents: [
        { formula: 'H2O', phase: 'l', mass_g: 90, moles: 5 },
        { formula: 'BaSO4', phase: 's', solidOrigin: 'precipitate', mass_g: 22.5, moles: 0.1 },
        { formula: 'PbI2', phase: 's', solidOrigin: 'precipitate', mass_g: 30.8, moles: 0.067 },
      ], substances: ['H2O', 'BaSO4', 'PbI2'] } as VesselState;
    const manager = new VesselSimulationManager(v.id);
    manager.step(v, 0.1, { thermalStateAuthoritative: true });
    for (const system of manager.precipitationSystems.values()) expect(system.hindrance!.volumeFraction).toBeCloseTo(0.1, 12);
    const barite = manager.precipitationSystems.get('BaSO4')!;
    barite.particles = []; barite.sedimentBed.amount_g = 22.5;
    manager.step(v, 1 / 120, { thermalStateAuthoritative: true });
    expect(manager.precipitationSystems.get('PbI2')!.hindrance!.volumeFraction).toBeCloseTo(5 / 95, 12);
  });
});
