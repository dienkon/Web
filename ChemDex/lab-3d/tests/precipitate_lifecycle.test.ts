import { describe, it, expect } from 'vitest';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { PRECIPITATE_PROFILES } from '../src/simulation/core/SimulationConfig';
import { PRNG } from '../src/core/rng';

const params = { temp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
  radius: 1, liquidBottomY: 0, surfaceY: 3, precipitateAmount_g: 1 };

describe('Finite precipitation lifecycle', () => {
  it.each(Object.keys(PRECIPITATE_PROFILES))('%s shrinks during dissolution without losing represented mass', substance => {
    const system = new PrecipitationSystem(100, substance, new PRNG(41));
    system.update(0.1, { ...params, substance });
    const p = system.particles[0];
    expect(p).toBeDefined();
    const originalRadius = p.radius;
    const originalMass = p.mass_ug;
    system.update(0.001, { ...params, substance, precipitateAmount_g: 0.125 });
    expect(p.radius).toBeCloseTo(originalRadius * 0.5, 12);
    expect(p.mass_ug).toBeCloseTo(originalMass * 0.125, 12);
    expect(system.representedMass_g).toBeCloseTo(0.125, 12);
    system.update(0.1, { ...params, substance, precipitateAmount_g: 0 });
    expect(system.representedMass_g).toBe(0);
    expect(system.particles).toHaveLength(0);
    expect(system.sedimentBed.thickness).toBe(0);
    expect(system.cloudiness).toBe(0);
  });

  it('stirring lifts existing bed material at the bottom without manufacturing more solid', () => {
    const system = new PrecipitationSystem(100, 'BaSO4', new PRNG(22));
    for (let i = 0; i < 30; i++) system.update(0.1, { ...params, surfaceY: 0 });
    expect(system.sedimentBed.amount_g).toBeCloseTo(1, 12);
    system.update(0.1, { ...params, agitation: 1 });
    expect(system.sedimentBed.amount_g).toBeLessThan(1);
    expect(system.particles.length).toBeGreaterThan(0);
    expect(system.particles.every(p => p.y < 0.3)).toBe(true);
    expect(system.representedMass_g).toBeCloseTo(1, 12);
    for (let i = 0; i < 200; i++) system.update(0.1, { ...params, agitation: i % 2 });
    expect(system.representedMass_g).toBeCloseTo(1, 10);
    system.update(0.1, { ...params, agitation: 1, precipitateAmount_g: 0.2 });
    expect(system.representedMass_g).toBeCloseTo(0.2, 10);
  });

  it('cloudiness of the same suspended inventory does not depend on glyph budget', () => {
    const low = new PrecipitationSystem(20, 'BaSO4', new PRNG(3));
    const high = new PrecipitationSystem(900, 'BaSO4', new PRNG(3));
    for (let i = 0; i < 10; i++) { low.update(0.05, params); high.update(0.05, params); }
    expect(low.cloudiness).toBeCloseTo(high.cloudiness, 12);
    expect(low.representedMass_g).toBeCloseTo(high.representedMass_g, 12);
  });
});
