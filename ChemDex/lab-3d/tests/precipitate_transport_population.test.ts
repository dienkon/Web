import { describe, expect, it } from 'vitest';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { PRNG } from '../src/core/rng';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { liquidLevelForVolume } from '../src/science/vesselDimensions';
import { compactPrecipitateParcels, precipitateDisplayIndex } from '../src/science/precipitateParcels';
import { containParticle } from '../src/simulation/effects/particleBounds';
import type { PhysicalPrecipitateParticle } from '../src/simulation/core/SimulationTypes';

const base = { temp_c: 25, density_g_ml: 1, viscosity_mPa_s: 1, volume_ml: 100,
  radius: 1, liquidBottomY: 0, surfaceY: 3, precipitateAmount_g: 1, substance: 'BaSO4' };
const snapshot = (s: PrecipitationSystem) => ({ particles: s.particles, mass: s.representedMass_g,
  bed: s.sedimentBed.amount_g, optics: s.opticalDepth, flocs: s.flocculation, emitted: s.emittedCount });

describe('Transport parcels are independent of the renderer', () => {
  it('keeps the same settling and clearing at zero, low and high display budgets', () => {
    const profile = getVesselProfile('beaker', 100), fill = liquidLevelForVolume('beaker', 10, 100);
    const params = { ...base, volume_ml: 10, radius: profile.r(fill), liquidBottomY: profile.baseY,
      surfaceY: fill, vesselProfile: profile, precipitateAmount_g: 0.01, substance: 'PbI2', formation: 'CRYSTAL_PLATE' };
    const systems = [0, 20, 140, 900].map(budget => new PrecipitationSystem(budget, 'PbI2', new PRNG(9)));
    for (let frame = 0; frame < 20; frame++) {
      for (const s of systems) s.update(0.05, params);
      for (const s of systems.slice(1)) expect(snapshot(s)).toEqual(snapshot(systems[0]));
    }
    expect(systems[0].sedimentBed.amount_g).toBeCloseTo(0.01, 12);
    expect(systems[0].representedMass_g).toBeCloseTo(0.01, 12);
  });
  it('samples committed source mass immediately and budget changes leave future transport and RNG untouched', () => {
    const a = new PrecipitationSystem(0, 'BaSO4', new PRNG(3));
    const b = new PrecipitationSystem(900, 'BaSO4', new PRNG(3));
    a.update(0.001, base); b.update(0.001, base);
    expect(a.particles.reduce((sum, p) => sum + p.mass_ug / 1e6, 0)).toBeCloseTo(1, 13);
    expect(a.particles.every(p => Math.abs(p.age - 0.001) < 1e-12)).toBe(true);
    for (const budget of [7, 0, 500, 1]) {
      const before = structuredClone(snapshot(a)); a.setParticleBudget(budget);
      expect(snapshot(a)).toEqual(before);
      const params = { ...base, precipitateAmount_g: a.representedMass_g + 0.01, entryPoint: [0.4, 2, 0] as [number, number, number] };
      a.update(0.1, params); b.update(0.1, params);
      expect(snapshot(a)).toEqual(snapshot(b)); expect(a.particles.length).toBeLessThanOrEqual(a.transportCapacity);
    }
    const indices = Array.from({ length: 7 }, (_, i) => precipitateDisplayIndex(i, 7, 128));
    expect(new Set(indices).size).toBe(7); expect(indices[0]).toBeLessThan(12); expect(indices[6]).toBeGreaterThan(116);
  });
  it('does not regenerate undissolved grain size after partial dissolution, including frozen reservoirs and bed entrainment', () => {
    const regular = new PrecipitationSystem(100, 'BaSO4', new PRNG(9));
    regular.update(0.1, base); regular.update(0.001, { ...base, precipitateAmount_g: 0.125 });
    regular.update(0.1, { ...base, precipitateAmount_g: 0.125 });
    expect(regular.particles.every(p => Math.abs(p.physicalRadius_m! - 2.5e-7) < 1e-18)).toBe(true);
    for (const carrierMode of ['frozen-matrix', 'dry-residue'] as const) {
      const s = new PrecipitationSystem(0, 'BaSO4', new PRNG(9));
      s.update(0.1, { ...base, carrierMode });
      s.update(0.1, { ...base, carrierMode, precipitateAmount_g: 0.125 });
      s.update(0.1, { ...base, carrierMode: 'liquid', precipitateAmount_g: 0.125, agitation: carrierMode === 'dry-residue' ? 1 : 0 });
      expect(s.particles.length).toBeGreaterThan(0);
      expect(s.particles.every(p => Math.abs(p.physicalRadius_m! - 2.5e-7) < 1e-18)).toBe(true);
      expect(s.representedMass_g).toBeCloseTo(0.125, 13);
    }
  });
  it('retains dissolved and fresh compact-size cohorts and their Stokes settling moment during compaction', () => {
    const s = new PrecipitationSystem(0, 'BaSO4', new PRNG(9));
    s.update(0.01, base);
    s.update(0.01, { ...base, precipitateAmount_g: 0.001 });
    s.update(0.001, { ...base, precipitateAmount_g: 0.002 });
    const small = s.particles.filter(p => p.physicalRadius_m! < 1e-7);
    const large = s.particles.filter(p => p.physicalRadius_m! > 4e-7);
    expect(small.length).toBeGreaterThan(0); expect(large.length).toBeGreaterThan(0);
    expect(small.length + large.length).toBe(s.particles.length);
    for (const cohort of [small, large]) expect(cohort.reduce((sum, p) => sum + p.mass_ug / 1e6, 0)).toBeCloseTo(0.001, 13);
    const fluxMoment = s.particles.reduce((sum, p) => sum + p.mass_ug / 1e6 * p.physicalRadius_m! ** 2, 0);
    expect(fluxMoment / (0.001 * (5e-8 ** 2 + 5e-7 ** 2))).toBeCloseTo(1, 12);
  });
  it('projects merged centroids into a nonconvex wet shoulder without changing mass or momentum', () => {
    const profile = getVesselProfile('flask', 100);
    const bounds = { radius: 1, liquidBottomY: profile.baseY, surfaceY: profile.baseY + profile.H, vesselProfile: profile };
    const seed = new PrecipitationSystem(1, 'BaSO4', new PRNG(9)); seed.update(0.01, base);
    const p = seed.particles[0];
    const particles: PhysicalPrecipitateParticle[] = [
      { ...p, x: profile.r(-0.5) - 1e-4, y: -0.5, z: 0, mass_ug: 1, vx: 2, vy: 0, vz: 0 },
      { ...p, id: p.id + 1, x: profile.r(1) - 1e-4, y: 1, z: 0, mass_ug: 3, vx: -2, vy: 0, vz: 0 },
    ];
    expect((particles[0].x + 3 * particles[1].x) / 4).toBeGreaterThan(profile.r(0.625));
    compactPrecipitateParcels(particles, 1, grain => {
      const point = { ...grain, radius: 1e-5 }; expect(containParticle(point, bounds)).toBe(true);
      grain.x = point.x; grain.y = point.y; grain.z = point.z;
    });
    expect(particles).toHaveLength(1); expect(particles[0].mass_ug).toBe(4);
    expect(particles[0].vx).toBe(-1);
    expect(Math.hypot(particles[0].x, particles[0].z)).toBeLessThan(profile.r(particles[0].y));
    expect(particles[0].physicalRadius_m).toBeCloseTo(p.physicalRadius_m!, 18);
  });
});
