import { describe, expect, it } from 'vitest';
import { SuspensionDensityField } from '../src/simulation/effects/SuspensionDensityField';
import { LiquidAppearanceField } from '../src/simulation/effects/LiquidAppearanceField';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { liquidParticlePlane } from '../src/simulation/effects/liquidParticleFrame';
import { suspensionCloudiness, suspensionOpticalDepth } from '../src/science/suspensionCloudiness';
import { opacityFromOpticalDepth } from '../src/science/opticalDepth';

const parcel = { x: -0.35, y: 0.75, z: 0, mass_ug: 100 };
const sample = { cloudiness: 0.5, particles: [parcel] };
const input = { color: '#ffffff', turbidity: 0.5, radius: 1, baseY: 0, fillY: 1 };
const meanLayer = (f: SuspensionDensityField, y: number) => f.opacity.slice(y * f.size ** 2, (y + 1) * f.size ** 2)
  .reduce((sum, a) => sum + a, 0) / f.size ** 2;

describe('suspended solid optical distribution', () => {
  it('places opacity around actual solid parcels and clears the space they leave', () => {
    const f = new SuspensionDensityField(12);
    f.update([sample], 1, 0, 1);
    expect(meanLayer(f, 8)).toBeGreaterThan(meanLayer(f, 1) + 0.1);
    f.update([{ ...sample, particles: [{ ...parcel, y: 0.15 }] }], 1, 0, 1);
    expect(meanLayer(f, 1)).toBeGreaterThan(meanLayer(f, 8) + 0.1);
    f.update([], 1, 0, 1);
    expect(f.opacity.every(a => a === 0)).toBe(true);
  });
  it('is independent of parcel count and does not change physical inventory', () => {
    const f = new SuspensionDensityField(12), before = JSON.stringify(sample);
    f.update([sample], 1, 0, 1);
    const one = [...f.opacity];
    f.update([{ ...sample, particles: Array.from({ length: 20 }, () => ({ ...parcel, mass_ug: 5 })) }], 1, 0, 1);
    one.forEach((a, i) => expect(f.opacity[i]).toBeCloseTo(a, 6));
    expect(JSON.stringify(sample)).toBe(before);
    expect(f.opacity.every(a => Number.isFinite(a) && a >= 0 && a <= 1)).toBe(true);
  });
  it('retains bulk haze before sampling, and composes mixed species by transmission', () => {
    const f = new SuspensionDensityField(12);
    f.update([{ cloudiness: 0.5, particles: [] }, { cloudiness: 0.4, particles: [] }], 1, 0, 1);
    expect(f.opacity[5 * 12 + 5]).toBeCloseTo(0.7, 6);
    f.update([{ cloudiness: 0.5, particles: [], representedMass_g: 1, sedimentBed: { amount_g: 1 } }], 1, 0, 1);
    expect(f.opacity.every(a => a === 0)).toBe(true);
  });
  it('retains concentrated mass depth on short paths after reference opacity saturates', () => {
    const f = new SuspensionDensityField(12), depths: number[] = [];
    for (const mass of [2, 4]) {
      f.update([{ cloudiness: suspensionCloudiness(mass, 100, 1),
        opticalDepth: suspensionOpticalDepth(mass, 100, 1), particles: [] }], 1, 0, 1);
      depths.push(f.optical[(5 * 144 + 5 * 12 + 5) * 4 + 3]);
    }
    expect(depths).toEqual([20, 40]);
    // A 0.5 mm path has only 5% of the reference 1 cm optical depth.
    const alpha = depths.map(tau => opacityFromOpticalDepth(tau * 0.05));
    expect(alpha[0]).toBeCloseTo(1 - Math.exp(-1), 14);
    expect(alpha[1]).toBeCloseTo(1 - Math.exp(-2), 14);
    expect(alpha[1]).toBeGreaterThan(alpha[0] + 0.2);
    f.update([{ cloudiness: 1, opticalDepth: 0, particles: [] }], 1, 0, 1);
    expect(f.optical.every(value => value === 0)).toBe(true);
    f.update([{ cloudiness: 0.5, opticalDepth: NaN, particles: [] }], 1, 0, 1);
    expect(f.opacity[5 * 12 + 5]).toBeCloseTo(0.5, 6);
  });
  it('updates the real liquid atlas while color is idle, obeys pause, and clears on dissolution', () => {
    const f = new LiquidAppearanceField();
    const suspensions = new Map([['AgCl', { ...sample, particles: [{ ...parcel }] }]]);
    f.advance(0, input);
    f.advance(0.1, { ...input, suspensions });
    expect(f.sample(0.325, 0.75, 0.5, 3)).toBeGreaterThan(0.5);
    expect(f.sample(0.325, 0.1, 0.5, 3)).toBeLessThan(0.01);
    const snapshot = [...f.pixels], revision = f.revision;
    suspensions.get('AgCl')!.particles[0].y = 0.1;
    f.advance(0, { ...input, suspensions });
    expect([...f.pixels]).toEqual(snapshot); expect(f.revision).toBe(revision);
    f.advance(0.1, { ...input, suspensions });
    expect(f.sample(0.325, 0.1, 0.5, 3)).toBeGreaterThan(0.5);
    suspensions.clear();
    f.advance(0.1, { ...input, turbidity: 0, suspensions });
    expect(f.sample(0.325, 0.1, 0.5, 3)).toBe(0);
  });
  it('keeps a wide flask bulb and tilted liquid inside their actual contours', () => {
    const f = new SuspensionDensityField(12), profile = getVesselProfile('flask', 250);
    const radius = Math.max(...profile.contour!.map(([r]) => r));
    const plane = liquidParticlePlane(profile, 130, [1, 0, 0])!;
    const bounds = { radius, liquidBottomY: profile.baseY, surfaceY: 0, vesselProfile: profile, surfacePlane: plane };
    f.update([{ cloudiness: 0.5, particles: [], renderBounds: bounds }], radius, profile.baseY, profile.H);
    let occupied = 0;
    for (let y = 0; y < 12; y++) for (let z = 0; z < 12; z++) for (let x = 0; x < 12; x++) {
      const px = (x / 11 * 2 - 1) * radius, py = profile.baseY + y / 11 * profile.H, pz = (z / 11 * 2 - 1) * radius;
      const alpha = f.opacity[y * 144 + z * 12 + x];
      if (alpha > 0) {
        occupied++;
        expect(Math.hypot(px, pz)).toBeLessThanOrEqual(profile.r(py) + 1e-8);
        expect(px).toBeLessThanOrEqual(plane.offset + 1e-8);
      }
    }
    expect(occupied).toBeGreaterThan(20);
  });
  it('retains optical depth in a thin tilted liquid wedge that contains no grid nodes', () => {
    const f = new SuspensionDensityField(12), profile = getVesselProfile('test_tube', 100);
    const radius = Math.max(...profile.contour!.map(([r]) => r));
    const plane = liquidParticlePlane(profile, 1, [0.6, 0.8, 0])!;
    const bounds = { radius, liquidBottomY: profile.baseY, surfaceY: plane.offset,
      vesselProfile: profile, surfacePlane: plane };
    const red = { cloudiness: 0.5, opticalDepth: 2, profile: { color: '#ff0000' },
      representedMass_g: 0.01, sedimentBed: { amount_g: 0 }, particles: [], renderBounds: bounds };
    const blue = { ...red, opticalDepth: 1, profile: { color: '#0000ff' } };
    f.update([red, blue], radius, profile.baseY, profile.H);
    // No nodal opacity is claimed outside the physical liquid. The renderer
    // samples padded coefficients only after clipping to its real wet volume.
    expect(f.opacity.every(alpha => alpha === 0)).toBe(true);
    for (let i = 0; i < f.optical.length; i += 4) {
      expect([...f.optical.slice(i, i + 4)]).toEqual([2, 0, 1, 3]);
    }
    f.update([{ ...red, sedimentBed: { amount_g: 0.01 } }], radius, profile.baseY, profile.H);
    expect(f.optical.every(value => value === 0)).toBe(true);
    f.update([], radius, profile.baseY, profile.H);
    expect(f.optical.every(value => value === 0)).toBe(true);
  });
});
