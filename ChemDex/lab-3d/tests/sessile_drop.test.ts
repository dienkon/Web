import { afterEach, describe, expect, it } from 'vitest';
import { solveSessileDrop } from '../src/science/sessileDrop';
import { createSpillGeometry } from '../src/pour/render/spillGeometry';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import { calculateSpillRadius } from '../src/science/overflowPhysics';
import { useAppStore } from '../src/store/useAppStore';
import { overflowLandingPosition } from '../src/engine/spillInventory';
import type { VesselState } from '../src/types/chemistry';

const initial = useAppStore.getState();
afterEach(() => useAppStore.setState(initial, true));

describe('Finite-volume Young–Laplace puddle', () => {
  it.each([0.000001, 0.001, 0.1, 1, 10, 100, 500])('closes the requested %s mL volume in the solver and actual render mesh', volume_ml => {
    const drop = solveSessileDrop(volume_ml)!;
    expect(drop).not.toBeNull();
    expect(Math.abs(drop.volume_m3 / (volume_ml * 1e-6) - 1)).toBeLessThan(2e-7);
    const geometry = createSpillGeometry(drop), pos = geometry.getAttribute('position'), index = geometry.getIndex()!;
    let signed = 0;
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
      signed += (pos.getX(a) * (pos.getY(b) * pos.getZ(c) - pos.getZ(b) * pos.getY(c))
        + pos.getY(a) * (pos.getZ(b) * pos.getX(c) - pos.getX(b) * pos.getZ(c))
        + pos.getZ(a) * (pos.getX(b) * pos.getY(c) - pos.getY(b) * pos.getX(c))) / 6;
    }
    expect(signed).toBeGreaterThan(0); // outward winding, closed positive volume
    expect(Math.abs(signed * METERS_PER_SCENE_UNIT ** 3 / (volume_ml * 1e-6) - 1)).toBeLessThan(0.004);
    geometry.dispose();
  });
  it('recovers a spherical cap at small Bond number', () => {
    const volume_ml = 1e-6, theta = Math.PI / 3, c = Math.cos(theta);
    const sphereR = Math.cbrt(3 * volume_ml * 1e-6 / (Math.PI * (2 - 3 * c + c ** 3)));
    const drop = solveSessileDrop(volume_ml)!;
    expect(Math.abs(drop.radius_m / (sphereR * Math.sin(theta)) - 1)).toBeLessThan(0.001);
    expect(Math.abs(drop.height_m / (sphereR * (1 - c)) - 1)).toBeLessThan(0.001);
  });
  it('approaches the gravity-limited height of a broad puddle rather than an indefinitely growing dome', () => {
    const length = Math.sqrt(0.072 / (998 * 9.80665));
    const large = solveSessileDrop(500)!;
    expect(Math.abs(large.height_m / (2 * length * Math.sin(Math.PI / 6)) - 1)).toBeLessThan(0.01);
    expect(large.radius_m).toBeGreaterThan(solveSessileDrop(100)!.radius_m);
  });
  it('satisfies hydrostatic Young–Laplace curvature along the profile', () => {
    const drop = solveSessileDrop(1)!, p = drop.profile;
    for (let i = 5; i < p.length - 4; i++) {
      const a = p[i - 1], b = p[i], c = p[i + 1];
      const x1 = b.radius_m - a.radius_m, z1 = a.height_m - b.height_m;
      const x2 = c.radius_m - b.radius_m, z2 = b.height_m - c.height_m;
      const l1 = Math.hypot(x1, z1), l2 = Math.hypot(x2, z2);
      const meridional = 2 * (x1 * z2 - z1 * x2) / (l1 * l2 * Math.hypot(x1 + x2, z1 + z2));
      const angle = (Math.atan2(z1, x1) + Math.atan2(z2, x2)) / 2;
      const curvature = meridional + Math.sin(angle) / b.radius_m;
      const expected = 2 * drop.apexCurvature_m_inv + 998 * 9.80665 * (drop.height_m - b.height_m) / 0.072;
      expect(Math.abs(curvature / expected - 1)).toBeLessThan(0.04);
    }
  });
  it('changes with wetting and density, and respects capillary-length similarity', () => {
    const base = solveSessileDrop(0.2)!;
    const wetting = solveSessileDrop(0.2, { contactAngle_deg: 30 })!;
    expect(wetting.radius_m).toBeGreaterThan(base.radius_m);
    expect(wetting.height_m).toBeLessThan(base.height_m);
    expect(solveSessileDrop(0.2, { densityContrast_kg_m3: 1996 })!.height_m).toBeLessThan(base.height_m);
    const scaled = solveSessileDrop(0.2 * 8, { surfaceTension_N_m: 0.072 * 4 })!;
    expect(scaled.radius_m).toBeCloseTo(base.radius_m * 2, 9);
    expect(scaled.height_m).toBeCloseTo(base.height_m * 2, 9);
  });
  it('does not infer a wet puddle from dry mass, zero volume or invalid data', () => {
    for (const volume of [0, -1, NaN, Infinity]) {
      expect(solveSessileDrop(volume)).toBeNull(); expect(calculateSpillRadius(volume, 800)).toBe(0);
    }
    for (const options of [{ contactAngle_deg: 0 }, { contactAngle_deg: 100 }, { surfaceTension_N_m: 0 },
      { densityContrast_kg_m3: -1 }, { gravity_m_s2: 0 }]) expect(solveSessileDrop(1, options)).toBeNull();
  });
  it('stores the overflow landing position and keeps it fixed when the vessel moves or rotates', () => {
    const vessel = { id: 'wet', type: 'beaker', position: [2, 0, 3], rotationY: Math.PI / 2,
      volume_ml: 100, capacity_ml: 100 } as VesselState;
    useAppStore.setState({ vessels: { wet: vessel }, vesselIds: ['wet'], spills: {} });
    useAppStore.getState().addSpill(vessel.position, 1, ['H2O'], '#fff', 'water', 1,
      [{ formula: 'H2O', phase: 'l', mass_g: 1, moles: 1 / 18.015 }], 'wet');
    const spill = Object.values(useAppStore.getState().spills)[0];
    expect(spill.position).toEqual(overflowLandingPosition(vessel));
    const deposited = [...spill.position];
    useAppStore.getState().setVesselState('wet', { position: [10, 0, 10], rotationY: 0 });
    expect(Object.values(useAppStore.getState().spills)[0].position).toEqual(deposited);
    expect(spill.radius).toBeCloseTo(solveSessileDrop(1)!.radius_m / METERS_PER_SCENE_UNIT, 10);
    expect(spill.contents![0].mass_g).toBe(1);
  });
});
