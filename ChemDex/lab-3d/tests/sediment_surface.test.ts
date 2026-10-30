import { expect, it } from 'vitest';
import { SedimentSurface } from '../src/science/sedimentSurface';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { sedimentPlane } from '../src/simulation/effects/sedimentPlane';
import { createClippedSedimentGeometry } from '../src/simulation/effects/clippedSedimentGeometry';
import { volumeBelowPlane } from '../src/pour/physics/retained';
import type { Point3 } from '../src/simulation/effects/liquidParticleFrame';
import type { BufferGeometry } from 'three';
import { polygonBedVolume } from '../src/simulation/effects/polygonBedVolume';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { PRNG } from '../src/core/rng';

const granular = { mass_g: 1, profile: { ...getPrecipitateProfile('PbI2'), morphology: 'crystalline' as const } };
export function meshProperties(geometry: BufferGeometry) {
  const p = geometry.toNonIndexed().attributes.position; let volume = 0, mx = 0, my = 0, mz = 0;
  for (let i = 0; i < p.count; i += 3) {
    const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i), bx = p.getX(i + 1), by = p.getY(i + 1), bz = p.getZ(i + 1),
      cx = p.getX(i + 2), cy = p.getY(i + 2), cz = p.getZ(i + 2);
    const v = (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
    volume += v; mx += v * (ax + bx + cx) / 4; my += v * (ay + by + cy) / 4; mz += v * (az + bz + cz) / 4;
  }
  return { volume, center: [mx / volume, my / volume, mz / volume] };
}
it('holds below the nominal friction cone and relaxes above it without changing bed matter', () => {
  const surface = new SedimentSurface();
  surface.advance(10, [0.3, Math.sqrt(0.91), 0], 0.05, 1000, 0.001, [granular]);
  expect(surface.status).toBe('static-friction'); expect(surface.normal).toEqual([0, 1, 0]);
  const angle = 1.2, up: Point3 = [Math.sin(angle), Math.cos(angle), 0];
  surface.advance(20, up, 0.05, 1000, 0.001, [granular]);
  expect(surface.status).toBe('granular-reference'); expect(surface.normal[0]).toBeGreaterThan(0);
  expect(Math.acos(surface.normal[0] * up[0] + surface.normal[1] * up[1])).toBeGreaterThanOrEqual(Math.PI / 6 - 1e-9);
  expect(granular.mass_g).toBe(1);
});
it('has the same surface trajectory under time subdivision, with a slower response in more viscous liquid', () => {
  const up: Point3 = [0.8, 0.6, 0], a = new SedimentSurface(), b = new SedimentSurface(), viscous = new SedimentSurface();
  a.advance(10, up, 0.05, 1000, 0.001, [granular]);
  for (let i = 0; i < 100; i++) b.advance(0.1, up, 0.05, 1000, 0.001, [granular]);
  for (let i = 0; i < 3; i++) expect(a.normal[i]).toBeCloseTo(b.normal[i], 12);
  viscous.advance(10, up, 0.05, 1000, 0.01, [granular]);
  expect(viscous.normal[0]).toBeLessThan(a.normal[0]);
});
it('keeps cohesive, dry/frozen and lost-contact limits explicit and does not advance at pause', () => {
  const s = new SedimentSurface(), up: Point3 = [0.8, 0.6, 0];
  s.advance(10, up, 0.05, 1000, 0.001, [{ mass_g: 1, profile: getPrecipitateProfile('Fe(OH)3') }]);
  expect(s.status).toBe('cohesion-unavailable'); expect(s.normal).toEqual([0, 1, 0]);
  s.advance(10, up, 0.05, 1000, 0.001, [granular], false); expect(s.status).toBe('carrier-unavailable');
  s.advance(10, [0, -1, 0], 0.05, 1000, 0.001, [granular]); expect(s.status).toBe('contact-lost');
  const before = JSON.stringify(s); s.advance(0, up, 0.05, 1000, 0.001, [granular]); expect(JSON.stringify(s)).toBe(before);
});
it('transfers a particle contacting the tilted bed into existing bed inventory, without a floor-y shortcut', () => {
  const system = new PrecipitationSystem(1, 'PbI2', new PRNG(73)), profile = getVesselProfile('beaker', 100);
  const params = { temp_c: 25, ambientTemp_c: 25, density_g_ml: 1, viscosity_mPa_s: 1,
    radius: 0.9, liquidBottomY: profile.baseY, surfaceY: 0.8, vesselProfile: profile, precipitateAmount_g: 1,
    volume_ml: 80, substance: 'PbI2', formation: 'CRYSTAL_PLATE', agitation: 0, heatPower_W: 0 };
  system.update(0.01, params); expect(system.particles.length).toBe(1);
  const p = system.particles[0]; p.x = -0.4; p.y = -0.2; p.z = 0;
  expect(p.y).toBeGreaterThan(profile.baseY + 0.5);
  const plane = { normal: [0.6, 0.8, 0] as [number, number, number], offset: -0.3 };
  system.update(0.01, { ...params, sharedSedimentPlane: plane });
  expect(system.particles).toHaveLength(0);
  expect(system.sedimentBed.amount_g).toBeCloseTo(1, 12); expect(system.representedMass_g).toBeCloseTo(1, 12);
});

it('lowers the bed center of mass under fixed gravity as the nominal surface relaxes', () => {
  const profile = getVesselProfile('beaker', 100), up: Point3 = [0.8, 0.6, 0], s = new SedimentSurface();
  const before = createClippedSedimentGeometry('beaker', sedimentPlane(profile, 1, s.normal));
  const a = meshProperties(before); s.advance(30, up, 0.05, 1000, 0.001, [granular]);
  const after = createClippedSedimentGeometry('beaker', sedimentPlane(profile, 1, s.normal)), b = meshProperties(after);
  expect(b.center.reduce((v, n, i) => v + n * up[i], 0)).toBeLessThan(a.center.reduce((v, n, i) => v + n * up[i], 0));
  expect(b.volume / a.volume).toBeCloseTo(1, 5); before.dispose(); after.dispose();
});
it.each(['beaker', 'flask', 'test_tube', 'cylinder', 'watch_glass', 'evaporating_dish', 'crucible', 'petri_dish',
  'volumetric_flask', 'separatory_funnel', 'filter_funnel', 'mortar_pestle', 'condenser', 'wash_bottle'])('renders a closed, mass-sized tilted bed inside the %s contour', type => {
  const profile = getVesselProfile(type, 100);
  for (const angle of [0, 0.3, 0.8, 1.2]) for (const volume_ml of [0.1, 2, 20]) {
    const normal: Point3 = [Math.sin(angle) * 0.6, Math.cos(angle), Math.sin(angle) * 0.8];
    const plane = sedimentPlane(profile, volume_ml, normal), geometry = createClippedSedimentGeometry(type, plane);
    const measured = meshProperties(geometry), polygon = polygonBedVolume(profile, normal, plane.offset);
    expect(polygon * profile.sceneScale ** 3).toBeCloseTo(volume_ml, 7);
    expect(measured.volume).toBeGreaterThan(0);
    expect(measured.volume * profile.sceneScale ** 3 / volume_ml).toBeGreaterThan(0.999);
    expect(measured.volume * profile.sceneScale ** 3 / volume_ml).toBeLessThan(1.001);
    const index = geometry.index!, edges = new Map<string, number>();
    for (let i = 0; i < index.count; i += 3) for (let j = 0; j < 3; j++) {
      const pair = [index.getX(i + j), index.getX(i + (j + 1) % 3)].sort((a, b) => a - b).join(':');
      edges.set(pair, (edges.get(pair) ?? 0) + 1);
    }
    expect([...edges.values()].every(n => n === 2)).toBe(true);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) expect(normal[0] * p.getX(i) + normal[1] * p.getY(i) + normal[2] * p.getZ(i)).toBeLessThanOrEqual(plane.offset + 1e-7);
    geometry.dispose();
  }
});
