import { describe, expect, it } from 'vitest';
import { getVesselProfile, VESSEL_PROFILES, type VesselProfile } from '../src/pour/physics/profiles';
import { retainedVolume, segArea, solveLevel, volumeBelowPlane } from '../src/pour/physics/retained';
import { calculateWeirFlow } from '../src/pour/physics/flow';
import { polygonBedVolume } from '../src/simulation/effects/polygonBedVolume';
import { cylinderPlaneReference } from './helpers/cylinderPlaneReference';
import { liquidRadialSegments } from '../src/vfx/materials/liquidGeometry';

const cylinder: VesselProfile = { type: 'reference-cylinder', H: 2, baseY: -1, r: () => 1,
  lipLocal: [1, 1, 0], mouthR: 1, spoutWidth: 0.2, capacity_ml: 100, sceneScale: Math.cbrt(100 / (2 * Math.PI)),
  contour: [[1, -1], [1, 1]], referenceSceneVolume: 2 * Math.PI };
describe('Thin liquid reference geometry', () => {
  it('retains a circular cap at tiny radii and arbitrarily close to the wall', () => {
    // Independent leading-order expansion, cap height h: (4/3)sqrt(2R)h^1.5.
    for (const radius of [1, 1e-6]) {
      const h = radius * 1e-8, actualHeight = radius + (-radius + h);
      const expected = 4 / 3 * Math.sqrt(2 * radius) * actualHeight ** 1.5;
      expect(segArea(radius, -radius + h) / expected).toBeCloseTo(1, 7);
    }
  });
  for (const angle of [0, 0.3, 0.8, Math.PI / 2, 2.2, Math.PI]) {
    it(`matches independent cylinder integration at ${angle} rad, including 1e-8 capacity`, () => {
      for (const fraction of [1e-8, 1e-6, 1e-4, 0.01, 0.4, 0.99, 1 - 1e-8]) {
        const result = solveLevel(cylinder, angle, fraction * 100);
        const nx = -Math.sin(angle), ny = Math.cos(angle);
        const independent = cylinderPlaneReference(1, 2, -1, nx, ny, result.c);
        const error = Math.abs(independent / (2 * Math.PI) - fraction);
        expect(error / Math.min(fraction, 1 - fraction)).toBeLessThan(3e-7);
        expect(result.surfaceArea).toBeGreaterThan(0);
        if (angle === Math.PI / 2) expect(result.surfaceArea).toBeCloseTo(4 * Math.sqrt((1 - result.c) * (1 + result.c)), 9);
      }
    });
  }
  it('keeps volume cubic and area quadratic under changes of length unit and origin', () => {
    const angle = 0.8, reference = solveLevel(cylinder, angle, 1e-4);
    for (const scale of [1e-6, 0.03, 1000]) {
      const shift = 3 * scale;
      const p: VesselProfile = { ...cylinder, H: 2 * scale, baseY: -scale + shift,
        r: () => scale, contour: [[scale, -scale + shift], [scale, scale + shift]], referenceSceneVolume: 2 * Math.PI * scale ** 3 };
      const result = solveLevel(p, angle, 1e-4);
      expect((result.c - Math.cos(angle) * shift) / scale).toBeCloseTo(reference.c, 11);
      expect(result.surfaceArea / scale ** 2 / reference.surfaceArea).toBeCloseTo(1, 7);
      expect(volumeBelowPlane(p, -Math.sin(angle), Math.cos(angle), result.c) / scale ** 3 / (2 * Math.PI * 1e-6)).toBeCloseTo(1, 7);
    }
  });
  it('returns exact empty/full support planes with zero section, without a fake area floor', () => {
    for (const angle of [0, 0.8, Math.PI / 2, Math.PI]) {
      for (const volume of [0, 100]) {
        const result = solveLevel(cylinder, angle, volume);
        expect(result.surfaceArea).toBe(0);
        expect(volumeBelowPlane(cylinder, -Math.sin(angle), Math.cos(angle), result.c)).toBeCloseTo(volume / 100 * 2 * Math.PI, 12);
      }
    }
  });
  for (const type of Object.keys(VESSEL_PROFILES)) {
    it(`bounds adaptive mesh volume error in a thin tilted ${type}`, () => {
      const p = getVesselProfile(type), fraction = 1e-6;
      for (const angle of [0.8, Math.PI / 2, 2.2]) {
        const result = solveLevel(p, angle, p.capacity_ml * fraction);
        const segments = liquidRadialSegments(p, angle, result.depth);
        const azimuth = 0.37;
        const normal: [number, number, number] = [-Math.sin(angle) * Math.cos(azimuth), Math.cos(angle), -Math.sin(angle) * Math.sin(azimuth)];
        const meshVolume = polygonBedVolume(p, normal, result.c, segments);
        expect(Math.abs(meshVolume / (p.referenceSceneVolume! * fraction) - 1)).toBeLessThan(0.002);
      }
    });
    it(`fits independently bounded polygon volumes for ${type}`, () => {
      const p = getVesselProfile(type), dilation = 1 / Math.cos(Math.PI / 128);
      const outer = { ...p, contour: p.contour!.map(([r, y]) => [r * dilation, y] as const) };
      for (const angle of [0.3, 0.9, Math.PI / 2, 2.2]) {
        const normal: [number, number, number] = [-Math.sin(angle), Math.cos(angle), 0];
        for (const fraction of [1e-8, 1e-4, 0.4, 1 - 1e-8]) {
          const result = solveLevel(p, angle, fraction * p.capacity_ml);
          const target = fraction * p.referenceSceneVolume!;
          const innerVolume = polygonBedVolume(p, normal, result.c, 128);
          const outerVolume = polygonBedVolume(outer, normal, result.c, 128);
          const roundoff = p.referenceSceneVolume! * 2e-12;
          expect(innerVolume).toBeLessThanOrEqual(target + roundoff);
          expect(outerVolume).toBeGreaterThanOrEqual(target - roundoff);
        }
      }
    });
  }
  it('starts discharge at the actual lip plane between cached assist angles', () => {
    const p = getVesselProfile('flask');
    for (const angle of [0.823, 1.134, 1.613, 2.071]) {
      const retained = retainedVolume(p, angle), delta = 1e-5;
      const lip = -Math.sin(angle) * p.lipLocal[0] + Math.cos(angle) * p.lipLocal[1];
      const expected = volumeBelowPlane(p, -Math.sin(angle), Math.cos(angle), lip) / p.referenceSceneVolume! * p.capacity_ml;
      expect(retained).toBeCloseTo(expected, 10);
      expect(calculateWeirFlow(p, retained - delta, angle).flowRate_ml_s).toBe(0);
      const above = calculateWeirFlow(p, retained + delta, angle);
      expect(above.head_cm).toBeGreaterThan(0);
      expect(above.flowRate_ml_s).toBeGreaterThan(0);
    }
  });
});
