import { describe, expect, it } from 'vitest';
import { contourVolumeBelow, liquidLevelForVolume, solidSceneVolume, vesselInterior, contourRadius, solidBlockDimensions } from '../src/science/vesselDimensions';
import { vesselContours } from '../src/science/vesselContours';
import { getVesselProfile, VESSEL_PROFILES, type VesselProfile } from '../src/pour/physics/profiles';
import { retainedVolume, solveLevel, volumeBelowPlane } from '../src/pour/physics/retained';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';
import { occupiedLiquidVolume } from '../src/handling/solidOccupancy';
import type { VesselState } from '../src/types/chemistry';
import { stepPourSimulation, type SimVessel } from '../src/pour/physics/step';

describe('Shared glass geometry and volume-calibrated contact levels', () => {
  it('integrates cylinders and cones against independent analytic volumes', () => {
    expect(contourVolumeBelow([[0, 0], [2, 0], [2, 3]], 3)).toBeCloseTo(12 * Math.PI, 12);
    expect(contourVolumeBelow([[0, 0], [2, 3]], 3)).toBeCloseTo(4 * Math.PI, 12);
    expect(contourVolumeBelow([[0, 0], [2, 3]], 1.5)).toBeCloseTo(Math.PI / 2, 12);
  });
  it.each(Object.keys(VESSEL_PROFILES))('%s recovers volume from its surface across the fill range', type => {
    const interior = vesselInterior(type), profile = getVesselProfile(type);
    expect(interior.volume).toBeGreaterThan(0);
    expect(liquidLevelForVolume(type, 0, 100)).toBe(interior.floorY);
    expect(liquidLevelForVolume(type, 100, 100)).toBe(interior.topY);
    for (const fraction of [1e-6, 0.01, 0.1, 0.25, 0.5, 0.75, 0.99, 0.999999]) {
      const level = liquidLevelForVolume(type, fraction * 100, 100);
      expect(contourVolumeBelow(interior.points, level) / interior.volume).toBeCloseTo(fraction, 10);
      expect(profile.r(level)).toBeCloseTo(contourRadius(interior.points, level), 12);
    }
    expect(solidSceneVolume({ type, capacity_ml: 100 }, 100)).toBeCloseTo(interior.volume, 12);
    expect(profile.sceneScale ** 3 * interior.volume).toBeCloseTo(profile.capacity_ml, 9);
  });
  it('places half-filled conical glass below half its height and treats equal neck volumes as larger level increments', () => {
    const interior = vesselInterior('flask');
    expect(liquidLevelForVolume('flask', 125, 250)).toBeLessThan(interior.floorY + interior.height / 2);
    const lowStep = liquidLevelForVolume('flask', 20, 250) - liquidLevelForVolume('flask', 10, 250);
    const highStep = liquidLevelForVolume('flask', 240, 250) - liquidLevelForVolume('flask', 230, 250);
    expect(highStep).toBeGreaterThan(lowStep * 3);
  });
  it('uses the actual sampled curved bowl wall instead of a constant-radius disk', () => {
    const contour = vesselContours('watch_glass').inner;
    for (const [r, y] of contour.slice(1)) expect(getVesselProfile('watch_glass').r(y)).toBeCloseTo(r, 10);
    expect(getVesselProfile('watch_glass').r(vesselInterior('watch_glass').floorY)).toBe(0);
  });
  it('solves displaced volume and ice support using the same bowl geometry', () => {
    const v = { type: 'watch_glass', capacity_ml: 40, volume_ml: 15,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 15, moles: 15 / 18.015 },
        { formula: 'H2O', phase: 's', mass_g: 1, moles: 1 / 18.015 }] } as VesselState;
    const occupied = occupiedLiquidVolume(v), y = vesselLiquidSurfaceY(v);
    expect(contourVolumeBelow(vesselInterior(v.type).points, y) / vesselInterior(v.type).volume * v.capacity_ml)
      .toBeCloseTo(occupied, 9);
    expect(occupied).toBeGreaterThan(15);
    expect(occupied).toBeLessThanOrEqual(16 + 1e-10);
    const chunk = solidBlockDimensions(v, 1 / 0.917);
    expect(chunk.floorY).toBeGreaterThan(vesselInterior(v.type).floorY);
    expect(getVesselProfile(v.type).r(chunk.floorY)).toBeGreaterThanOrEqual(chunk.width / Math.SQRT2 - 1e-10);
  });
  it('lands the stream on the displaced liquid surface of a receiver containing a submerged solid', () => {
    const source: SimVessel = { id: 'source', type: 'beaker', position: [0, 3, 0], rotationZ: -1.4,
      volume_ml: 80, capacity_ml: 100, mass_g: 80, density_g_ml: 1, temperature_c: 25,
      colorHex: '#f8fafc', substances: ['H2O'] };
    const target: SimVessel = { ...source, id: 'target', position: [0, -0.135, 0], rotationZ: 0,
      volume_ml: 20, mass_g: 109.6, substances: ['H2O', 'Cu'], contents: [
        { formula: 'H2O', phase: 'l', mass_g: 20, moles: 20 / 18.015 },
        { formula: 'Cu', phase: 's', mass_g: 89.6, moles: 89.6 / 63.546 }] };
    const result = stepPourSimulation({ sourceId: source.id, targetId: target.id, sourcePos: source.position,
      tilt: 1.4, sourceRotationZ: -1.4, isStreaming: true, totalTransferred_ml: 0,
      totalSpilled_ml: 0, lastFlowRate: 0, assist: 'high' }, { source, target }, 1 / 60, 0);
    const impact = result.events.find(event => event.type === 'flow:impact')!;
    expect(impact).toBeDefined();
    const level = vesselLiquidSurfaceY({ ...target, type: 'beaker', contents: target.contents! });
    expect(impact.position[1]).toBeCloseTo(target.position[1] + level, 10);
    expect(level).toBeGreaterThan(liquidLevelForVolume('beaker', 20, 100));
  });
});

describe('Tilted containment and model capacity', () => {
  it.each(['beaker', 'flask', 'test_tube', 'watch_glass', 'volumetric_flask', 'separatory_funnel'])('%s conserves geometric volume through tilted planes', type => {
    const profile = getVesselProfile(type);
    for (const theta of [0, 0.3, 0.8, Math.PI / 2, 2.2, Math.PI]) {
      for (const fraction of [0.001, 0.1, 0.5, 0.9]) {
        const result = solveLevel(profile, theta, profile.capacity_ml * fraction);
        const actual = volumeBelowPlane(profile, -Math.sin(theta), Math.cos(theta), result.c);
        expect(actual / profile.referenceSceneVolume!).toBeCloseTo(fraction, 5);
        expect(result.surfaceArea).toBeGreaterThan(0);
      }
    }
  });
  it('computes vertical-plane area of an independent cylinder and supports translated coordinates', () => {
    const cylinder: VesselProfile = { type: 'test-cylinder', baseY: 100, H: 20, r: () => 3,
      lipLocal: [3, 120, 0], mouthR: 3, spoutWidth: 1, capacity_ml: 500, sceneScale: 1 };
    expect(volumeBelowPlane(cylinder, 0, 1, 110)).toBeCloseTo(90 * Math.PI, 10);
    expect(solveLevel(cylinder, 0, 250).c).toBeCloseTo(110, 5);
    const side = solveLevel(cylinder, Math.PI / 2, 250);
    expect(side.c).toBeCloseTo(0, 5);
    expect(side.surfaceArea).toBeCloseTo(120, 3);
  });
  it('matches an analytic inclined-plane volume where the free surface clears both end caps', () => {
    const cylinder: VesselProfile = { type: 'analytic-cylinder', baseY: -2, H: 4, r: () => 1,
      lipLocal: [1, 2, 0], mouthR: 1, spoutWidth: 0.2, capacity_ml: 100, sceneScale: 1 };
    for (const tilt of [0.2, 0.4, 0.7]) {
      const offset = 0.3, expected = Math.PI * (2 + offset / Math.cos(tilt));
      const actual = volumeBelowPlane(cylinder, -Math.sin(tilt), Math.cos(tilt), offset);
      expect(Math.abs(actual - expected) / expected).toBeLessThan(0.001);
    }
  });
  it('does not reuse retained-volume curves across capacities or different shapes with the same type label', () => {
    const small = getVesselProfile('beaker', 100), large = getVesselProfile('beaker', 1000);
    expect(retainedVolume(large, 0.5) / retainedVolume(small, 0.5)).toBeCloseTo(10, 10);
    const changed = { ...small, H: small.H / 2, contour: undefined, referenceSceneVolume: undefined };
    expect(retainedVolume(changed, 0.5)).not.toBeCloseTo(retainedVolume(small, 0.5), 2);
    expect(getVesselProfile('beaker', 100)).toBe(small);
  });
});
