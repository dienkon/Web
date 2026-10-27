import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiquidMotionSystem } from '../src/simulation/effects/LiquidMotionSystem';
import { ConvectionSystem } from '../src/simulation/effects/ConvectionSystem';
import { VESSEL_PROFILES } from '../src/pour/physics/profiles';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { BoilingSystem, type BoilingSimulationParams } from '../src/simulation/effects/BoilingSystem';
import { PRNG } from '../src/core/rng';

afterEach(() => vi.restoreAllMocks());
const base = { temp_c: 25, ambientTemp_c: 25, heatPower_W: 0, viscosity_mPa_s: 1,
  radius: 1, liquidBottomY: 0, surfaceY: 2, agitation: 0.8 };

describe('Shared incompressible carrier velocity', () => {
  it('is a tangential, smooth swirl without vertical levitation', () => {
    const v = LiquidMotionSystem.sampleVelocity(0.3, 1, 0.4, base);
    expect(v[0]).toBeLessThan(0); expect(v[2]).toBeGreaterThan(0); expect(v[1]).toBe(0);
    expect(0.3 * v[0] + 0.4 * v[2]).toBeCloseTo(0, 14);
    const half = LiquidMotionSystem.sampleVelocity(0.3, 1, 0.4, { ...base, agitation: 0.4 });
    expect(half[0]).toBeCloseTo(v[0] / 2, 14); expect(half[2]).toBeCloseTo(v[2] / 2, 14);
    expect(LiquidMotionSystem.sampleVelocity(0, 1, 0, base)).toEqual([0, 0, 0]);
    for (const point of [[1,1,0], [0.2,0,0], [0.2,2,0], [2,1,0]]) {
      expect(Math.hypot(...LiquidMotionSystem.sampleVelocity(point[0], point[1], point[2], base))).toBe(0);
    }
  });
  it('superposes on the full thermal carrier and also stirs unsupported thermal solvents', () => {
    const point = [0.3, 1, 0.4] as const, hot = { ...base, temp_c: 60 };
    const thermal = ConvectionSystem.sampleVelocity(...point, hot);
    const stir = LiquidMotionSystem.sampleVelocity(...point, base);
    const combined = LiquidMotionSystem.sampleVelocity(...point, hot);
    for (let i = 0; i < 3; i++) expect(combined[i]).toBeCloseTo(thermal[i] + stir[i], 14);
    expect(LiquidMotionSystem.sampleVelocity(...point, { ...hot, agitation: 0 })).toEqual(thermal);
    expect(LiquidMotionSystem.sampleVelocity(...point, { ...base, fluidModel: 'unavailable' })).toEqual(stir);
  });
  it.each(Object.values(VESSEL_PROFILES))('has zero divergence and wall-normal flux in $type', profile => {
    const p = { ...base, vesselProfile: profile, liquidBottomY: profile.baseY,
      surfaceY: profile.baseY + profile.H * 0.9, temp_c: 55 };
    for (let i = 1; i < profile.contour!.length; i++) {
      const lower = Math.max(profile.contour![i-1][1], p.liquidBottomY), upper = Math.min(profile.contour![i][1], p.surfaceY);
      if (upper - lower < 1e-6) continue;
      const y = (lower + upper) / 2, r = profile.r(y); if (r < 1e-6) continue;
      const v = (x: number, yy: number, z: number) => LiquidMotionSystem.sampleVelocity(x, yy, z, p);
      expect(Math.hypot(...v(r,y,0))).toBeLessThan(1e-12);
      const x = r * 0.3, z = r * 0.4, d = Math.min(r, upper-lower) * 1e-5;
      const div = (v(x+d,y,z)[0]-v(x-d,y,z)[0] + v(x,y+d,z)[1]-v(x,y-d,z)[1]
        + v(x,y,z+d)[2]-v(x,y,z-d)[2])/(2*d);
      expect(Math.abs(div) * (upper-lower)).toBeLessThan(1e-7);
    }
  });
  it('rejects invalid stirring and invalid physical input', () => {
    for (const patch of [{ agitation: -0.1 }, { agitation: 1.1 }, { agitation: NaN }, { temp_c: NaN }, { viscosity_mPa_s: 0 }]) {
      expect(LiquidMotionSystem.sampleVelocity(0.3,1,0.4,{ ...base, ...patch })).toEqual([0,0,0]);
    }
  });
});

function solid(integrationHz = 120) {
  const rng = new PRNG(2); vi.spyOn(rng, 'gaussian').mockReturnValue(0);
  // Offline numerical refinement can vary the integration resolution without
  // confusing it with runtime render-frame partitioning (default120Hz).
  const system = new class extends PrecipitationSystem {
    public override readonly fixedDt = 1 / integrationHz;
  }(1, 'CuS', rng);
  const params = { ...base, agitation: 0, density_g_ml: 1, precipitateAmount_g: 0.1 };
  system.update(0.1, params);
  expect(system.particles).toHaveLength(1);
  const p = system.particles[0];
  p.x = p.z = 0; p.y = 1; p.vx = p.vy = p.vz = 0;
  return { system, p, params };
}

describe('Physical slip is independent of an imposed carrier velocity', () => {
  it('ages newly sampled precipitate only after its birth at30/60/120Hz', () => {
    for (const hz of [30,60,120]) {
      const rng = new PRNG(2); vi.spyOn(rng,'gaussian').mockReturnValue(0);
      const system = new PrecipitationSystem(1000,'CuS',rng);
      for (let i=0;i<hz;i++) system.update(1/hz,{ ...base,agitation:0,density_g_ml:1,precipitateAmount_g:0.1 });
      expect(system.emittedCount).toBe(64); expect(system.particles).toHaveLength(64);
      for (const p of system.particles) expect(p.age).toBeCloseTo(1-p.id/64,12);
      expect(system.representedMass_g).toBeCloseTo(0.1,14);
    }
  });
  it('does not replay unused whole birth attempts after a depleted source and quality increase', () => {
    const system = new PrecipitationSystem(40,'CuS',new PRNG(2));
    const params = { ...base,agitation:0,density_g_ml:1,precipitateAmount_g:1 };
    for (let i=0;i<7;i++) system.update(0.1,params);
    expect(system.emittedCount).toBe(40);
    system.setParticleBudget(80);
    system.update(0.001,{ ...params,precipitateAmount_g:1.025 });
    expect(system.emittedCount).toBe(40);
    system.update(1/64,{ ...params,precipitateAmount_g:1.025 });
    expect(system.emittedCount).toBe(41);
    expect(system.representedMass_g).toBeCloseTo(1.025,13);
  });
  it('recovers full fluid velocity plus settling in the short-response tracer limit', () => {
    const { system, p, params } = solid();
    vi.spyOn(ConvectionSystem, 'sampleVelocity').mockReturnValue([0.1, 0.2, -0.3]);
    system.update(0.01, params);
    expect(p.vx).toBeCloseTo(0.1, 12); expect(p.vz).toBeCloseTo(-0.3, 12);
    expect(p.vy).toBeCloseTo(0.2 - p.sedimentationSpeed, 12);
  });
  it('does not weaken vertical gravitational slip when agitation changes', () => {
    const quiet = solid(), stirred = solid();
    quiet.system.update(0.01, quiet.params);
    stirred.system.update(0.01, { ...stirred.params, agitation: 1 });
    // At the axis, swirl is zero. Agitation may not alter vertical slip.
    expect(stirred.p.vy).toBeCloseTo(quiet.p.vy, 14);
    expect(stirred.p.vy).toBeCloseTo(-stirred.p.sedimentationSpeed, 12);
    expect(stirred.p.y).toBeCloseTo(quiet.p.y, 14);
    expect(stirred.system.representedMass_g).toBeCloseTo(0.1, 14);
  });
  it('advects a precipitate around the axis without assigning it artificial upward velocity', () => {
    const { system, p, params } = solid(); p.x = 0.3;
    system.update(0.01, { ...params, agitation: 0.8 });
    expect(p.vz).toBeGreaterThan(0); expect(p.vy).toBeCloseTo(-p.sedimentationSpeed, 12);
    expect(p.z).toBeGreaterThan(0);
  });
  it('rejects invalid agitation before touching a solid inventory', () => {
    const { system, params } = solid(), snapshot = JSON.stringify(system.particles);
    system.update(0.1, { ...params, agitation: NaN });
    expect(JSON.stringify(system.particles)).toBe(snapshot);
    expect(system.representedMass_g).toBeCloseTo(0.1, 14);
  });
  it('converges to a circular tracer trajectory at30/60/120Hz without first-order outward drift', () => {
    const errors = [30, 60, 120].map(hz => {
      const { system, p, params } = solid(hz);
      p.x = 0.3; p.density = 1000; p.physicalRadius_m = 1e-9;
      const initial = LiquidMotionSystem.sampleVelocity(p.x, p.y, p.z, base);
      [p.vx, p.vy, p.vz] = initial;
      const omega = initial[2] / p.x;
      for (let i = 0; i < hz; i++) system.update(1/hz, { ...params, agitation: base.agitation });
      expect(p.y).toBe(1);
      expect(Math.abs(Math.hypot(p.x,p.z)-0.3)).toBeLessThan(3e-6);
      expect(system.representedMass_g).toBeCloseTo(0.1, 14);
      return Math.hypot(p.x - 0.3*Math.cos(omega), p.z - 0.3*Math.sin(omega));
    });
    expect(errors[1]).toBeLessThan(errors[0] / 3.3);
    expect(errors[2]).toBeLessThan(errors[1] / 3.3);
  });
  it('does not increase source sampling merely because stirring starts', () => {
    const p: BoilingSimulationParams = { ...base, temp_c: 100, boilingPoint_c: 100,
      boilingStage: 'ACTIVE_BOIL', boilingIntensity: 1, vaporRate_g_s: 0.01, reactionGasRate: 5,
      radius: 2, surfaceY: 10 };
    const run = (agitation: number) => {
      const system = new BoilingSystem(60, new PRNG(3));
      for (let i = 0; i < 120; i++) system.update(1/120, { ...p, agitation });
      return system.sourceSampling;
    };
    const quiet = run(0), stirred = run(1);
    expect(quiet.vaporGlyphsBorn).toBe(3); expect(stirred.vaporGlyphsBorn).toBe(quiet.vaporGlyphsBorn);
    expect(quiet.reactionGlyphsBorn).toBe(5); expect(stirred.reactionGlyphsBorn).toBe(quiet.reactionGlyphsBorn);
  });
  it('passes the same normalized stirring control to bubble and solid carrier sampling', () => {
    const { system, params } = solid(), sampler = vi.spyOn(LiquidMotionSystem, 'sampleVelocity');
    system.update(0.01, { ...params, agitation: 0.6 });
    expect(sampler.mock.calls.length).toBeGreaterThan(0);
    expect(sampler.mock.calls.every(call => call[3].agitation === 0.6)).toBe(true);
    sampler.mockClear();
    const bubbles = new BoilingSystem(20, new PRNG(1));
    bubbles.update(1/30, { ...base, agitation: 0.6, boilingPoint_c: 100, boilingStage: 'COLD_STABLE',
      boilingIntensity: 0, reactionGasRate: 120 });
    expect(sampler.mock.calls.length).toBeGreaterThan(0);
    expect(sampler.mock.calls.every(call => call[3].agitation === 0.6)).toBe(true);
  });
});
