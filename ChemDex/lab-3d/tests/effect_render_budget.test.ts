import { describe, expect, it } from 'vitest';
import { sampleGasCloudParticles } from '../src/simulation/effects/GasCloudRepository';
import { GasPlumeSystem } from '../src/simulation/effects/GasPlumeSystem';
import { createPrecipitateGeometry } from '../src/simulation/render/precipitateGeometry';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';

describe('Effect drawing budgets', () => {
  it('samples uniformly across sources without changing gas inventory or particles', () => {
    const make = (start: number, count: number) => {
      const system = new GasPlumeSystem();
      system.particles = Array.from({ length: count }, (_, i) => ({ id: start + i }) as GasPlumeSystem['particles'][number]);
      return system;
    };
    const a = make(0, 3), b = make(3, 7), other = make(100, 5);
    const original = a.particles;
    const clouds = new Map([
      ['a', { species: 'NO2', system: a }],
      ['other', { species: 'Cl2', system: other }],
      ['empty', { species: 'NO2', system: make(0, 0) }],
      ['b', { species: 'NO2', system: b }],
    ]);
    const ids: number[] = [], weights: number[] = [];
    expect(sampleGasCloudParticles(clouds, 'NO2', 4, (p, i, weight) => { ids[i] = p.id; weights[i] = weight; })).toBe(4);
    expect(ids).toEqual([0, 2, 5, 7]);
    expect(weights).toEqual([2.5, 2.5, 2.5, 2.5]);
    expect(a.particles).toBe(original);
    expect(a.acceptedGas_mol).toBe(0);
    expect(a.particles).toHaveLength(3);
    const all: number[] = [];
    expect(sampleGasCloudParticles(clouds, 'NO2', 20, p => all.push(p.id))).toBe(10);
    expect(all).toEqual(Array.from({ length: 10 }, (_, i) => i));
    expect(sampleGasCloudParticles(clouds, 'missing', 10, () => { throw Error('unexpected particle'); })).toBe(0);
    expect(sampleGasCloudParticles(clouds, 'NO2', 0, () => { throw Error('unexpected particle'); })).toBe(0);
  });

  it.each(['Fe(OH)3', 'Cu(OH)2', 'Cu'])('reduces GPU geometry while containing %s inside the physical glyph envelope', formula => {
    const profile = getPrecipitateProfile(formula);
    const full = createPrecipitateGeometry(profile);
    const reduced = createPrecipitateGeometry(profile, 'reduced');
    const triangles = (g: typeof full) => (g.index?.count ?? g.getAttribute('position').count) / 3;
    expect(triangles(reduced)).toBeLessThan(triangles(full));
    const positions = reduced.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      expect(Math.hypot(positions.getX(i), positions.getY(i), positions.getZ(i))).toBeLessThanOrEqual(1);
    }
    full.dispose(); reduced.dispose();
  });
});
