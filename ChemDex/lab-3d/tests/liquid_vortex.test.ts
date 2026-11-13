import { describe, expect, it } from 'vitest';
import { LiquidVortex, vortexHeight, vortexSlope, vortexVolume } from '../src/science/liquidVortex';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { LiquidMotionSystem } from '../src/simulation/effects/LiquidMotionSystem';
import { pointPlaneDepth, projectToLiquidPlane } from '../src/simulation/effects/liquidParticleFrame';
import { containParticle } from '../src/simulation/effects/particleBounds';
import { GRAVITY_M_S2, metersPerModelUnit } from '../src/science/sceneUnits';

const profile = getVesselProfile('beaker', 100), fill = -0.15;
function spin(intensity: number, seconds = 6, direction = 1) {
  const vortex = new LiquidVortex();
  for (let i = 0; i < seconds * 60; i++) vortex.advance(1 / 60, intensity, profile, fill, 1, 1, direction);
  return vortex;
}
describe('shared stirring vortex, free surface and particle carrier', () => {
  it('starts at rest, spins up continuously and decays after the rod stops', () => {
    const v = new LiquidVortex(); v.advance(1 / 60, 0, profile, fill, 1, 1);
    expect(v.surface).toBeUndefined(); expect(v.angularSpeed_rad_s).toBe(0);
    v.advance(1 / 60, 0.95, profile, fill, 1, 1);
    expect(v.angularSpeed_rad_s).toBeGreaterThan(0); expect(v.angularSpeed_rad_s).toBeLessThan(10);
    const speed = v.angularSpeed_rad_s;
    v.advance(1 / 60, 0, profile, fill, 1, 1);
    expect(v.angularSpeed_rad_s).toBeGreaterThan(0); expect(v.angularSpeed_rad_s).toBeLessThan(speed);
    v.reset(); expect(v.surface).toBeUndefined(); expect(v.phase_rad).toBe(0);
  });
  it('deeper central depression and faster particle transport follow stronger stirring', () => {
    const weak = spin(0.3), strong = spin(0.95);
    expect(vortexHeight(0, 0, strong.surface!)).toBeLessThan(vortexHeight(0, 0, weak.surface!));
    expect(vortexHeight(0.9, 0, strong.surface!)).toBeGreaterThan(fill);
    const params = { temp_c: 25, ambientTemp_c: 25, heatPower_W: 0, viscosity_mPa_s: 1, radius: 0.965,
      liquidBottomY: profile.baseY, surfaceY: fill, agitation: 0, vesselProfile: profile };
    const a = LiquidMotionSystem.sampleVelocity(0.3, -0.5, 0, { ...params, vortex: weak.surface });
    const b = LiquidMotionSystem.sampleVelocity(0.3, -0.5, 0, { ...params, vortex: strong.surface });
    expect(b[2]).toBeGreaterThan(a[2] * 2); expect(b[1]).toBe(0);
    const reverse = spin(0.65, 6, -1);
    expect(LiquidMotionSystem.sampleVelocity(0.3, -0.5, 0, { ...params, vortex: reverse.surface })[2]).toBeLessThan(0);
  });
  it('free-surface pressure slope agrees with the same regularized angular carrier', () => {
    const surface = spin(0.65).surface!, r = 0.35;
    const vTheta = surface.angularSpeed_rad_s * r / (1 + r * r / surface.coreRadius ** 2);
    expect(vortexSlope(r, surface)).toBeCloseTo(vTheta ** 2 * metersPerModelUnit(profile) / (GRAVITY_M_S2 * r), 10);
  });
  it('limits both pressure head and velocity together when the liquid layer is shallow', () => {
    const v = new LiquidVortex(), shallow = profile.baseY + 0.03;
    for (let i = 0; i < 120; i++) v.advance(1 / 60, 1, profile, shallow, 1, 1);
    const s = v.surface!, r = 0.25, speed = s.angularSpeed_rad_s * r / (1 + r * r / s.coreRadius ** 2);
    expect(s.offset).toBeGreaterThan(profile.baseY);
    expect(vortexSlope(r, s)).toBeCloseTo(speed ** 2 * metersPerModelUnit(profile) / (GRAVITY_M_S2 * r), 10);
  });
  it.each(['beaker', 'flask', 'cylinder'])('%s retains liquid volume under the curved surface', type => {
    const p = getVesselProfile(type, 100), v = new LiquidVortex();
    for (let i = 0; i < 120; i++) v.advance(1 / 60, 0.95, p, 0, 1, 1);
    const target = vortexVolume(p, { offset: 0, amplitude: 0, coreRadius: 0.3 });
    expect(vortexVolume(p, v.surface!) / target).toBeCloseTo(1, 3);
    expect(vortexHeight(0, 0, v.surface!)).toBeGreaterThan(p.baseY);
  });
  it('particles and bubble contacts use the curved interface, including the depressed centre', () => {
    const v = spin(0.95), plane = { normal: [0, 1, 0] as const, offset: fill, vortex: v.surface };
    const p = { x: 0.01, y: fill, z: 0, radius: 0.03 };
    expect(pointPlaneDepth(p, fill, plane)).toBeLessThan(0);
    expect(containParticle(p, { radius: 0.965, liquidBottomY: profile.baseY, surfaceY: fill, surfacePlane: plane, vesselProfile: profile })).toBe(true);
    expect(pointPlaneDepth(p, fill, plane)).toBeGreaterThanOrEqual(p.radius);
    projectToLiquidPlane(p, fill, plane); expect(pointPlaneDepth(p, fill, plane)).toBeCloseTo(0, 12);
  });
  it('the azimuthal field is divergence-free, finite on-axis and bounded at walls', () => {
    const v = spin(0.95), params = { temp_c: 25, ambientTemp_c: 25, heatPower_W: 0, viscosity_mPa_s: 1,
      radius: 0.965, liquidBottomY: profile.baseY, surfaceY: fill, agitation: 1, vesselProfile: profile, vortex: v.surface };
    const h = 1e-5, velocity = (x: number, z: number) => LiquidMotionSystem.sampleVelocity(x, -0.5, z, params);
    expect(velocity(0, 0)).toEqual([0, 0, 0]); expect(velocity(0.965, 0)).toEqual([0, 0, 0]);
    const dx = (velocity(0.3 + h, 0.2)[0] - velocity(0.3 - h, 0.2)[0]) / (2 * h);
    const dz = (velocity(0.3, 0.2 + h)[2] - velocity(0.3, 0.2 - h)[2]) / (2 * h);
    expect(dx + dz).toBeCloseTo(0, 7);
  });
});
