import { describe, it, expect } from 'vitest';
import { retainedVolume, solveLevel } from '../src/pour/physics/retained';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { clampTilt, clampLift, getHandleLimits, TILT_MIN, TILT_MAX } from '../src/handling/limits';

describe('Handling Limits & Full 0 to PI Inversion (K2.1)', () => {
  it('defines unified limits across all vessel types', () => {
    expect(TILT_MIN).toBe(0);
    expect(TILT_MAX).toBe(Math.PI);

    // Clamped burette cannot tilt
    expect(clampTilt('burette', 1.0)).toBe(0);
    expect(getHandleLimits('burette').fixedInClamp).toBe(true);

    // Beaker, flask, cylinder can tilt up to PI (180 degrees)
    expect(clampTilt('beaker', 3.5)).toBeCloseTo(Math.PI);
    expect(clampTilt('flask', 3.5)).toBeCloseTo(Math.PI);
    expect(clampTilt('test_tube', Math.PI)).toBeCloseTo(Math.PI);

    // Lift clamping
    expect(clampLift('beaker', 10.0)).toBe(3.5);
    expect(clampLift('beaker', -1.0)).toBe(-0.135);
  });

  it('asserts monotone non-increasing retained volume across θ ∈ [0, π]', () => {
    const vesselTypes = ['beaker', 'flask', 'cylinder', 'test_tube'] as const;

    for (const vType of vesselTypes) {
      const profile = getVesselProfile(vType);
      let prevVolume = profile.capacity_ml + 1;

      // Sweep from 0 to 180 degrees in 5 degree increments
      for (let deg = 0; deg <= 180; deg += 5) {
        const rad = (deg * Math.PI) / 180;
        const vRetained = retainedVolume(profile, rad);

        expect(isNaN(vRetained)).toBe(false);
        expect(vRetained).toBeGreaterThanOrEqual(0);
        expect(vRetained).toBeLessThanOrEqual(prevVolume + 1e-4);
        prevVolume = vRetained;
      }

      // At full inversion (θ = π), open vessels must have retainedVolume ≈ 0
      const at180 = retainedVolume(profile, Math.PI);
      expect(at180).toBeCloseTo(0, 1);
    }
  });

  it('guarantees solveLevel is stable and produces no NaN at 90°, 135°, and 180°', () => {
    const beaker = getVesselProfile('beaker');
    const angles = [
      Math.PI * 0.5,   // 90 degrees
      Math.PI * 0.75,  // 135 degrees
      Math.PI          // 180 degrees
    ];

    for (const theta of angles) {
      const result = solveLevel(beaker, theta, 50);
      expect(isNaN(result.c)).toBe(false);
      expect(isNaN(result.liquidTopY)).toBe(false);
      expect(isNaN(result.surfaceArea)).toBe(false);
      expect(result.surfaceArea).toBeGreaterThan(0);
    }
  });
});
