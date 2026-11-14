import { describe, expect, it } from 'vitest';
import { Color, DataUtils, Matrix4 } from 'three';
import { integrateOpticalSegments, opticalDepthFromOpacity, opacityFromOpticalDepth, SUSPENSION_REFERENCE_PATH_M } from '../src/science/opticalDepth';
import { SuspensionDensityField } from '../src/simulation/effects/SuspensionDensityField';
import { LiquidAppearanceField } from '../src/simulation/effects/LiquidAppearanceField';
import { createSpatialLiquidAppearance } from '../src/vfx/materials/spatialLiquidAppearance';
import { getVesselProfile } from '../src/pour/physics/profiles';

describe('optical depth and ordered suspension colors', () => {
  it('obeys Beer transmission, additive depths and multiplicative path segments', () => {
    for (const tau of [0, 0.001, 0.3, 1, 8, 15]) {
      const t = 1 - opacityFromOpticalDepth(tau);
      expect(t).toBeCloseTo(Math.exp(-tau), 14);
      const result = integrateOpticalSegments([{ depth: tau / 3, color: [1, 1, 1] }, { depth: 2 * tau / 3, color: [1, 1, 1] }]);
      expect(result.transmission).toBeCloseTo(t, 14);
      expect(1 - opacityFromOpticalDepth(2 * tau)).toBeCloseTo(t * t, 14);
    }
  });
  it('keeps concentrated local depth linear instead of saturating to an 8-bit alpha', () => {
    const f = new SuspensionDensityField(12);
    const sample = { cloudiness: 0.8, profile: { color: '#ff0000' }, particles: [{ x: 0, y: 0.5, z: 0, mass_ug: 100 }] };
    f.update([sample], 1, 0, 1);
    const first = [...f.optical];
    expect(Math.max(...first.filter((_, i) => i % 4 === 3))).toBeGreaterThan(10);
    f.update([sample, sample], 1, 0, 1);
    first.forEach((v, i) => expect(f.optical[i]).toBeCloseTo(2 * v, 5));
  });
  it('preserves each species local color and changes the visible mix with front-to-back order', () => {
    const f = new SuspensionDensityField(12);
    f.update([
      { cloudiness: 0.5, profile: { color: '#ff0000' }, particles: [{ x: -0.6, y: 0.5, z: 0, mass_ug: 100 }] },
      { cloudiness: 0.5, profile: { color: '#0000ff' }, particles: [{ x: 0.6, y: 0.5, z: 0, mass_ug: 100 }] },
    ], 1, 0, 1);
    const left = (5 * 144 + 5 * 12 + 2) * 4, right = left + 7 * 4;
    expect(f.optical[left]).toBeGreaterThan(f.optical[left + 2] * 10);
    expect(f.optical[right + 2]).toBeGreaterThan(f.optical[right] * 10);
    const layers = [{ depth: 1, color: [1, 0, 0] }, { depth: 1, color: [0, 0, 1] }];
    const forward = integrateOpticalSegments(layers), backward = integrateOpticalSegments([...layers].reverse());
    expect(forward.transmission).toBe(backward.transmission);
    expect(forward.color[0]).toBeGreaterThan(forward.color[2]);
    expect(backward.color[2]).toBeGreaterThan(backward.color[0]);
  });
  it('uploads linear half-float optical depth and scales by real physical length', () => {
    const field = new LiquidAppearanceField();
    const color = new Color('#38bdf8');
    field.advance(0.1, { color: '#ffffff', turbidity: 0.5, radius: 1, baseY: 0, fillY: 1,
      suspensions: new Map([['blue', { cloudiness: 0.5, particles: [], profile: { color: '#38bdf8' } }]]) });
    const appearance = createSpatialLiquidAppearance(field), index = (5 * 144 + 5 * 12 + 5) * 4;
    const profile = getVesselProfile('beaker', 100);
    appearance.update('#ffffff', new Matrix4(), { radius: 1, liquidBottomY: 0, surfaceY: 1, vesselProfile: profile });
    const pixels = appearance.opticalTexture.image.data as Uint16Array;
    const tau = DataUtils.fromHalfFloat(pixels[index + 3]);
    expect(tau).toBeCloseTo(Math.log(2), 3);
    expect(DataUtils.fromHalfFloat(pixels[index + 2]) / tau).toBeCloseTo(color.b, 3);
    expect(appearance.uniforms.uOpticalPathScale.value).toBe(profile.sceneScale / 100 / SUSPENSION_REFERENCE_PATH_M);
    expect(opticalDepthFromOpacity(0.5)).toBeCloseTo(Math.log(2), 14);
    appearance.dispose();
  });
  it('preserves plume color when optical depth exceeds half-float range', () => {
    const field = new LiquidAppearanceField();
    field.advance(0.1, { color: '#ffffff', turbidity: 1, radius: 1, baseY: 0, fillY: 1,
      suspensions: new Map([['dense', { cloudiness: 1, opticalDepth: 100000, particles: [], profile: { color: '#ff8040' } }]]) });
    const appearance = createSpatialLiquidAppearance(field), index = (5 * 144 + 5 * 12 + 5) * 4;
    appearance.update('#ffffff');
    const pixels = appearance.opticalTexture.image.data as Uint16Array;
    const tau = DataUtils.fromHalfFloat(pixels[index + 3]), color = new Color('#ff8040');
    expect(tau).toBe(65504);
    [color.r, color.g, color.b].forEach((channel, i) =>
      expect(DataUtils.fromHalfFloat(pixels[index + i]) / tau).toBeCloseTo(channel, 3));
    appearance.dispose();
  });
});
