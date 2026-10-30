import { expect, it } from 'vitest';
import { GasCloudRepository, representativeGasOpacity, type GasCloudSource } from '../src/simulation/effects/GasCloudRepository';

const source = (revision = 0, species = 'NO2', receipt: object = {}): GasCloudSource => ({ vesselId: 'source', revision, species,
  receipt, seconds: 0.1, input: { rate: 40, mol_s: 0.001, temperature_c: 25, ambient_c: 25,
    molarMass: species === 'NO2' ? 46.005 : 70.9, mouthY: 1, mouthRadius: 0.4, floorY: -1.175, wind_m_s: 0.1 } });
const cloud = (repo: GasCloudRepository) => [...repo.clouds.values()][0];

it('accepts one measured exhaust receipt exactly once while render frames repeat its old flux', () => {
  const repo = new GasCloudRepository(), s = source();
  for (let i = 0; i < 60; i++) repo.advance(1 / 60, [s]);
  expect(cloud(repo).acceptedExhaust_mol).toBeCloseTo(0.0001, 13);
  expect(cloud(repo).system.integratedGas_mol).toBeCloseTo(0.0001, 13);
  expect(cloud(repo).system.particles).toHaveLength(4);
  expect(s.input.rate).toBe(40);
});

it('preserves fractional sampling across successive small, finite source receipts', () => {
  const repo = new GasCloudRepository();
  for (let i = 0; i < 20; i++) { const s = source(); s.seconds = 0.01; s.input.rate = 10; repo.advance(0.01, [s]); }
  expect(cloud(repo).acceptedExhaust_mol).toBeCloseTo(0.0002, 13);
  expect(cloud(repo).system.particles.length).toBeGreaterThanOrEqual(1);
});

it('finishes already accepted emission and dissipates its tail after the source is deleted', () => {
  const repo = new GasCloudRepository(), s = source(); s.seconds = 0.5;
  repo.advance(0.1, [s]); const c = cloud(repo), accepted = c.acceptedExhaust_mol;
  repo.advance(0.1, []);
  expect(repo.clouds.size).toBe(1); expect(c.sourceLive).toBe(false);
  expect(c.acceptedExhaust_mol).toBe(accepted); expect(c.system.particles.length).toBeGreaterThan(4);
  for (let i = 0; i < 50; i++) repo.advance(0.1, []);
  expect(c.system.integratedGas_mol).toBeCloseTo(0.0005, 12); expect(repo.clouds.size).toBe(0);
});

it('keeps old and replacement samples separate even when vessel ID and species are unchanged', () => {
  const repo = new GasCloudRepository(); repo.advance(0.1, [source(1)]); const old = cloud(repo);
  const before = structuredClone(old.system.particles);
  repo.advance(0.1, [source(2)]);
  expect(repo.clouds.size).toBe(2); expect(old.sourceLive).toBe(false);
  expect(old.system.particles.length).toBe(before.length); expect(old.system.particles[0].age).toBeGreaterThan(before[0].age);
  expect([...repo.clouds.values()].find(c => c.revision === 2)!.system).not.toBe(old.system);
});

it('retires an empty tail with a residual ambient timestep but no pending source matter', () => {
  const repo = new GasCloudRepository(); repo.advance(0.013, [source()]); const c = cloud(repo);
  for (let i = 0; i < 40; i++) repo.advance(0.1, []);
  expect(c.system.pendingSeconds).toBeGreaterThan(0);
  expect(c.system.pendingGas_mol).toBe(0);
  expect(c.system.particles.length).toBe(0); expect(repo.clouds.size).toBe(0);
});

it('keeps species-specific colors and histories separate on one source revision', () => {
  const repo = new GasCloudRepository(), receipt = {};
  repo.advance(0.1, [source(0, 'NO2', receipt), source(0, 'Cl2', receipt)]);
  expect(repo.clouds.size).toBe(2);
  expect([...repo.clouds.values()].map(c => c.species)).toEqual(['NO2', 'Cl2']);
});

it('does not replay a pruned pulse while the same source remains mounted', () => {
  const repo = new GasCloudRepository(), s = source(); repo.advance(0.1, [s]);
  for (let i = 0; i < 50; i++) repo.advance(0.1, [s]);
  expect(repo.clouds.size).toBe(0);
  repo.advance(0.1, [s]); expect(repo.clouds.size).toBe(0);
  repo.advance(0.1, [source()]); expect(repo.clouds.size).toBe(1);
});

it('freezes pending receipt durations, ages and source accounting at pause', () => {
  const repo = new GasCloudRepository(), s = source(); repo.advance(0.04, [s]);
  const before = JSON.stringify([...repo.clouds.values()]);
  repo.advance(0, [source(1)]); expect(JSON.stringify([...repo.clouds.values()])).toBe(before);
});

it('keeps the room snapshot across a renderer lifetime but clears an explicit material timeline change', () => {
  const repo = new GasCloudRepository(); repo.syncEpoch(5); repo.advance(0.1, [source()]);
  const c = cloud(repo); repo.syncEpoch(5); expect(cloud(repo)).toBe(c);
  repo.syncEpoch(6); expect(repo.clouds.size).toBe(0);
});

it('matches model trajectories across 30/60/120 Hz for the same sequence of chemistry receipts', () => {
  function run(hz: number) {
    const repo = new GasCloudRepository(); let s = source(); s.seconds = 0.1;
    for (let i = 0; i < hz; i++) { if (i % (hz / 10) === 0) s = source(); repo.advance(1 / hz, [s]); }
    return cloud(repo);
  }
  const expected = run(120);
  for (const hz of [30, 60]) {
    const actual = run(hz);
    expect(actual.acceptedExhaust_mol).toBeCloseTo(expected.acceptedExhaust_mol, 12);
    expect(actual.system.particles.length).toBe(expected.system.particles.length);
    for (let i = 0; i < actual.system.particles.length; i++) for (const k of ['x', 'y', 'z', 'age', 'opacity'] as const)
      expect(actual.system.particles[i][k]).toBeCloseTo(expected.system.particles[i][k], 9);
  }
});

it('does not let nonfinite source quantities pollute room counters', () => {
  for (const bad of [NaN, Infinity, -1]) {
    const repo = new GasCloudRepository(), s = source(); s.input.mol_s = bad; repo.advance(0.1, [s]);
    expect(repo.clouds.size).toBe(0);
  }
});

it('keeps already accepted finite exhaust intact when a later source input is invalid', () => {
  const a = new GasCloudRepository(), b = new GasCloudRepository(), s = source(); s.seconds = 0.5;
  a.advance(0.1, [s]); b.advance(0.1, [s]);
  const bad = source(); bad.input.wind_m_s = NaN;
  a.advance(0.2, [bad]); b.advance(0.2, []);
  expect(cloud(a).system.particles).toEqual(cloud(b).system.particles);
  expect(cloud(a).system.integratedGas_mol).toBeCloseTo(0.0003, 12);
  expect(cloud(a).acceptedExhaust_mol).toBeCloseTo(0.0005, 12);
});

it('preserves sampled transmittance without changing particle population', () => {
  for (const opacity of [0, 0.1, 0.5, 1]) for (const weight of [1, 2, 8]) {
    expect(1 - representativeGasOpacity(opacity, weight)).toBeCloseTo((1 - opacity) ** weight, 13);
  }
  expect(representativeGasOpacity(1, 0)).toBe(0);
});
