import { describe, expect, it } from 'vitest';
import { iceShape, iceBlockDimensions, iceCenterY, iceGroundedDisplacementMl } from '../src/science/iceShape';
import { compileSolid, clippedSolidVolume } from '../src/science/clippedSolidVolume';
import { solidSceneVolume } from '../src/science/vesselDimensions';
import { ICE_DENSITY_G_ML } from '../src/engine/waterProperties';

describe('ice geometry shared with phase displacement', () => {
  it('matches mesh clipping between precomputed vertex levels', () => {
    const shape = iceShape(), oracle = compileSolid(shape.geometry);
    let previous = 0;
    for (let i = 0; i <= 200; i++) {
      const y = i / 200 - 0.5;
      const expected = clippedSolidVolume(oracle, [{ normal: [0, 1, 0], offset: y }], [0, y, 0]) / oracle.volume;
      const actual = shape.fractionBelow(y);
      expect(actual).toBeCloseTo(expected, 6);
      expect(actual).toBeGreaterThanOrEqual(previous - 1e-10); previous = actual;
    }
  });
  it.each(['beaker', 'flask', 'cylinder', 'test_tube'])('preserves actual ice volume and Archimedes immersion in %s', type => {
    const vessel = { type, capacity_ml: 100 }, shape = iceShape();
    for (const mass of [0.01, 1, 5]) {
      const volume = mass / ICE_DENSITY_G_ML, chunk = iceBlockDimensions(vessel, volume);
      expect(chunk.width ** 2 * chunk.height * shape.unitVolume).toBeCloseTo(solidSceneVolume(vessel, volume), 10);
      expect(shape.fractionBelow(shape.floatingPlane) * volume).toBeCloseTo(mass, 8);
      const y = iceCenterY(vessel, volume, chunk.floorY + chunk.height * 2);
      const plane = (chunk.floorY + chunk.height * 2 - y) / chunk.height;
      expect(shape.fractionBelow(plane) * volume).toBeCloseTo(mass, 8);
      expect(iceGroundedDisplacementMl(vessel, volume, chunk.floorY)).toBe(0);
      expect(iceGroundedDisplacementMl(vessel, volume, chunk.floorY + chunk.height)).toBeCloseTo(volume, 8);
    }
  });
});
