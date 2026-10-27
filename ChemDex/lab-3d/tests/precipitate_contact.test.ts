import { describe, expect, it } from 'vitest';
import { pourContactLocal, type PourParcel } from '../src/engine/pourTransport';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import type { VesselState } from '../src/types/chemistry';

describe('Delivered pour anchors new precipitate', () => {
  it('converts world impact to vessel local coordinates and uses the wall film endpoint', () => {
    const vessel = { position: [2, 3, 4], rotationY: Math.PI / 2 } as VesselState;
    const parcel = { trajectory: { impactPos: [3, 3.5, 4] } } as PourParcel;
    const point = pourContactLocal(parcel, vessel);
    expect(point[0]).toBeCloseTo(0, 12);
    expect(point[1]).toBe(0.5);
    expect(point[2]).toBeCloseTo(1, 12);
    const wall = { ...parcel, stage: 'wall', wallFilm: { angle_rad: 0,
      points: [{ y: 1, radius: 0.5 }, { y: 0.2, radius: 0.3 }] } } as PourParcel;
    expect(pourContactLocal(wall, vessel)).toEqual([0.3, 0.2, 0]);
  });
  it('nucleates finite new mass near an off-center contact and stays inside the vessel', () => {
    const s = new PrecipitationSystem(40, 'CuS');
    s.update(0.1, { substance: 'CuS', precipitateAmount_g: 0.1, volume_ml: 100,
      temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1, radius: 1,
      liquidBottomY: 0, surfaceY: 1, entryPoint: [0.5, 0.9, 0] });
    expect(s.particles.length).toBeGreaterThan(0);
    expect(s.particles.every(p => p.x > 0.25 && p.y <= 0.9)).toBe(true);
    expect(s.representedMass_g).toBeCloseTo(0.1, 12);
  });
});
