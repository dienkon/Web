import { describe, it, expect } from 'vitest';
import { sphereSettlingSpeed } from '../src/science/particleSettling';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
describe('SI particle settling', () => {
  it('recovers the Stokes limit for a micron-scale sphere without a minimum fall speed', () => {
    const expected = 2 * 3500 * 9.80665 * (0.5e-6) ** 2 / (9 * 0.001);
    const actual = sphereSettlingSpeed(0.5e-6, 4500, 1000, 0.001);
    expect(actual / expected).toBeCloseTo(1, 4);
    expect(actual).toBeLessThan(2e-6);
  });
  it('balances buoyancy against nonlinear drag outside the creeping-flow limit', () => {
    const r = 0.0001, rho = 4500, fluid = 1000, mu = 0.001;
    const v = sphereSettlingSpeed(r, rho, fluid, mu);
    const re = 2 * r * fluid * v / mu;
    const cd = re < 1000 ? 24 / re * (1 + 0.15 * re ** 0.687) : 0.44;
    const drag = 0.5 * fluid * v * v * cd * Math.PI * r * r;
    const weight = (rho - fluid) * 9.80665 * 4 / 3 * Math.PI * r ** 3;
    expect(drag / weight).toBeCloseTo(1, 8);
    expect(sphereSettlingSpeed(r, rho, fluid, 0.002)).toBeLessThan(v);
  });
  it('handles neutral buoyancy, upward slip and invalid inputs', () => {
    expect(sphereSettlingSpeed(1e-5, 1000, 1000, 0.001)).toBe(0);
    expect(sphereSettlingSpeed(1e-5, 900, 1000, 0.001)).toBeLessThan(0);
    expect(sphereSettlingSpeed(NaN, 4000, 1000, 0.001)).toBe(0);
  });
  it('updates actual particle slip when viscosity changes and uses the common scene scale', () => {
    const system = new PrecipitationSystem(100, 'BaSO4');
    const conditions = { temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1, radius: 1,
      liquidBottomY: 0, surfaceY: 4, precipitateAmount_g: 1 };
    system.update(0.1, conditions);
    const particle = system.particles[0];
    const initial = particle.sedimentationSpeed;
    expect(initial * METERS_PER_SCENE_UNIT).toBeCloseTo(sphereSettlingSpeed(particle.physicalRadius_m!, particle.density, 1000, 0.001), 12);
    system.update(0.001, { ...conditions, viscosity_mPa_s: 3 });
    expect(particle.sedimentationSpeed).toBeLessThan(initial);
  });
});
