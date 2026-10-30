import { describe, expect, it } from 'vitest';
import { particleResponseFactors, sphereDragResponseTime } from '../src/science/particleSettling';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { PRNG } from '../src/core/rng';

describe('Physical particle velocity response', () => {
  it('recovers the Stokes relaxation time and its physical scaling', () => {
    const tau = sphereDragResponseTime(1e-6, 4500, 1000, 0.001, 0);
    expect(tau).toBeCloseTo(1e-6, 15);
    expect(sphereDragResponseTime(2e-6, 4500, 1000, 0.001, 0) / tau).toBeCloseTo(4, 12);
    expect(sphereDragResponseTime(1e-6, 9000, 1000, 0.001, 0) / tau).toBeCloseTo(2, 12);
    expect(sphereDragResponseTime(1e-6, 4500, 1000, 0.002, 0) / tau).toBeCloseTo(0.5, 12);
    expect(sphereDragResponseTime(1e-4, 4500, 1000, 0.001, 0.2))
      .toBeLessThan(sphereDragResponseTime(1e-4, 4500, 1000, 0.001, 0));
  });

  it.each([1e-12, 1e-5, 0.01, 1, 1000])('integrates displacement without unstable Euler steps for dt/tau=%s', ratio => {
    const tau = 0.1, dt = ratio * tau;
    const f = particleResponseFactors(dt, tau);
    expect(f.relaxation).toBeCloseTo(-Math.expm1(-ratio), 14);
    expect(f.initialTime_s + f.targetTime_s).toBeCloseTo(dt, 14);
    expect(f.initialTime_s).toBeGreaterThanOrEqual(0);
    expect(f.targetTime_s).toBeGreaterThan(0);
    if (ratio < 1e-5) expect(f.targetTime_s / (dt * ratio / 2)).toBeCloseTo(1, 6);
    // A stationary initial particle under a constant unit acceleration has
    // v_terminal=tau. For short times its displacement tends to dt^2/2.
    if (ratio < 1e-5) expect(tau * f.targetTime_s / (dt * dt / 2)).toBeCloseTo(1, 6);
  });

  it('gives the same constant-drag trajectory after subdivision', () => {
    const tau = 0.07, target = -0.3, initial = 0.8, dt = 0.2;
    const one = particleResponseFactors(dt, tau);
    const expectedPosition = initial * one.initialTime_s + target * one.targetTime_s;
    const expectedVelocity = initial + (target - initial) * one.relaxation;
    let position = 0, velocity = initial;
    for (let i = 0; i < 100; i++) {
      const f = particleResponseFactors(dt / 100, tau);
      position += velocity * f.initialTime_s + target * f.targetTime_s;
      velocity += (target - velocity) * f.relaxation;
    }
    expect(position).toBeCloseTo(expectedPosition, 12);
    expect(velocity).toBeCloseTo(expectedVelocity, 12);
  });

  it('removes a spurious long-lived entry velocity from submicron precipitation', () => {
    const s = new PrecipitationSystem(40, 'CuS', new PRNG(4));
    const params = { substance: 'CuS', precipitateAmount_g: 0.1, volume_ml: 100,
      temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1, radius: 1,
      liquidBottomY: 0, surfaceY: 2, entryPoint: [0.5, 1.8, 0] as [number, number, number] };
    s.update(0.1, params);
    expect(s.particles.length).toBeGreaterThan(0);
    for (const p of s.particles) {
      expect(Math.abs(p.vx)).toBeLessThan(1e-12);
      expect(Math.abs(p.vz)).toBeLessThan(1e-12);
      expect(p.vy).toBeCloseTo(-p.sedimentationSpeed, 12);
    }
    expect(s.representedMass_g).toBeCloseTo(0.1, 12);
  });
});
