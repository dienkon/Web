import { describe, expect, it } from 'vitest';
import { gravityPour } from '../src/physical/gravityPour';
import { Quaternion, Euler } from 'three';
import type { VesselState } from '../src/types/chemistry';

const sample = (q: Quaternion): VesselState => ({ id: 'cup', name: 'cup', type: 'beaker', capacity_ml: 100,
  position: [0, 2, 0], rotationY: 0, rotationZ: 0, isLocked: false, contents: [{ formula: 'H2O', phase: 'l', mass_g: 60, moles: 60 / 18.015 }],
  substances: ['H2O'], mass_g: 60, volume_ml: 60, volume: 0.6, temperature_c: 20, ph: 7, hasPrecipitate: false, isBoiling: false, hasGas: false,
  physicalMotion: { rotation: q.toArray(), velocity_m_s: [0.1, 0, 0], angularVelocity_rad_s: [0, 0, 0], tick: 120 } });
describe('Passive tipped glassware emits finite airborne inventory', () => {
  it('does not leak upright or through a sealed mouth', () => {
    expect(gravityPour(sample(new Quaternion()), [], 0.01, 1)).toBeNull();
    expect(gravityPour({ ...sample(new Quaternion().setFromEuler(new Euler(0, 0, 1.5))), isSealed: true }, [], 0.01, 1)).toBeNull();
  });
  it('handles arbitrary tilt axes and inherits the falling body velocity', () => {
    const z = gravityPour(sample(new Quaternion().setFromEuler(new Euler(0, 0, 1.5))), [], 1 / 120, 120)!;
    const x = gravityPour(sample(new Quaternion().setFromEuler(new Euler(1.5, 0, 0))), [], 1 / 120, 120)!;
    expect(z.released_ml).toBeGreaterThan(0); expect(z.released_ml).toBeLessThan(60);
    expect(x.released_ml).toBeCloseTo(z.released_ml, 7);
    expect(z.draft.trajectory.timeOfFlight).toBeGreaterThan(0);
    expect(z.draft.releaseBasis).toBe('metered');
    expect(sample(new Quaternion()).volume_ml).toBe(60);
  });
});
