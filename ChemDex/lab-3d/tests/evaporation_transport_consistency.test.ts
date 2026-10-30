import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { EvaporationSystem, type EvaporationSimulationParams } from '../src/simulation/effects/EvaporationSystem';
import { PRNG } from '../src/core/rng';
import { SimulationEngine, VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { createInstancedMistMaterial, mistParticleAppearance } from '../src/simulation/render/mistAppearance';
import { waterPlumeVisibility, waterSaturationPressurePa } from '../src/science/waterSurface';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import type { VesselState } from '../src/types/chemistry';

const source: EvaporationSimulationParams = { temp_c: 100, ambient_c: 20, relativeHumidity: 0.5,
  pressure_atm: 1, actualRate_g_s: 0.1, radius: 0.5, mouthRadius: 0.2,
  surfaceY: 0.1, mouthY: 1, surfaceArea_cm2: 10, isBoiling: true, airflowVector: [0, 0, 0] };
const system = (count = 80) => new EvaporationSystem(count, new PRNG(321));
afterEach(() => SimulationEngine.clearAll());

describe('External water-mist transport uses accepted source history', () => {
  it('matches particle trajectories, counts and vapor integrals at 30/60/120 Hz', () => {
    const run = (hz: number) => {
      const sim = system();
      for (let i = 0; i < hz * 2; i++) sim.update(1 / hz, source);
      return sim;
    };
    const expected = run(120);
    expect(expected.particles.length).toBeGreaterThan(0);
    for (const hz of [30, 60]) {
      const actual = run(hz);
      expect(actual.particles.length).toBe(expected.particles.length);
      expect(actual.integratedSeconds).toBeCloseTo(2, 10);
      expect(actual.integratedVapor_g).toBeCloseTo(0.2, 12);
      for (let i = 0; i < actual.particles.length; i++) {
        for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'size', 'opacity', 'age', 'life'] as const) {
          expect(actual.particles[i][key]).toBeCloseTo(expected.particles[i][key], 10);
        }
        expect(actual.particles[i].id).toBe(expected.particles[i].id);
      }
    }
  });
  it('retains deferred time and vapor, without draining on pause or replaying it as new supply', () => {
    const sim = system();
    sim.update(3, source);
    expect(sim.acceptedSeconds).toBe(3);
    expect(sim.integratedSeconds).toBeCloseTo(2, 10);
    expect(sim.pendingSeconds).toBeCloseTo(1, 10);
    expect(sim.acceptedVapor_g).toBeCloseTo(0.3, 12);
    expect(sim.integratedVapor_g).toBeCloseTo(0.2, 12);
    const frozen = JSON.stringify(sim.particles);
    sim.update(0, { ...source, actualRate_g_s: 0 });
    expect(JSON.stringify(sim.particles)).toBe(frozen);
    sim.update(1, { ...source, actualRate_g_s: 0 });
    expect(sim.pendingSeconds).toBeCloseTo(0, 10);
    expect(sim.integratedSeconds).toBeCloseTo(4, 10);
    expect(sim.integratedVapor_g).toBeCloseTo(0.3, 12);
    expect(sim.currentRate_ml_s).toBe(0);
  });
  it('preserves a short source pulse when the next call has no vapor and snapshots mutable input', () => {
    const sim = system(), mutable = { ...source, actualRate_g_s: 1, airflowVector: [0, 0, 0] as [number, number, number] };
    sim.update(1 / 240, mutable);
    mutable.actualRate_g_s = 0;
    mutable.airflowVector[0] = 100;
    sim.update(1 / 240, { ...source, actualRate_g_s: 0 });
    expect(sim.integratedVapor_g).toBeCloseTo(1 / 240, 12);
    expect(sim.acceptedVapor_g).toBeCloseTo(1 / 240, 12);
    expect(sim.integratedSeconds).toBeCloseTo(1 / 120, 12);
  });
  it('never generates mist or a solvent sink from temperature alone', () => {
    const sim = system();
    const { actualRate_g_s: _, ...noSource } = source;
    expect(sim.update(1, noSource).evaporated_ml).toBe(0);
    expect(sim.acceptedVapor_g).toBe(0);
    expect(sim.particles).toHaveLength(0);
  });
  it('does not bank emission debt while the display pool is full', () => {
    const sim = system(1);
    sim.update(1, { ...source, actualRate_g_s: 1 });
    expect(sim.particles.length).toBe(1);
    sim.maxParticles = 80;
    sim.particles = [];
    sim.update(1 / 120, { ...source, actualRate_g_s: 1 });
    expect(sim.particles.length).toBeLessThanOrEqual(1);
    expect(sim.acceptedVapor_g).toBeCloseTo(1 + 1 / 120, 12);
  });
  it('lets emitted mist dissipate after its source stops, then resets deterministically', () => {
    const sim = system();
    sim.update(1, source);
    const snapshot = structuredClone(sim.particles);
    sim.update(1 / 60, { ...source, actualRate_g_s: 0 });
    expect(sim.particles.length).toBeGreaterThan(0);
    sim.update(2, { ...source, actualRate_g_s: 0 });
    expect(sim.particles).toHaveLength(0);
    sim.reset();
    expect(sim.acceptedVapor_g).toBe(0);
    expect(sim.pendingSeconds).toBe(0);
    sim.update(1, source);
    expect(sim.particles).toEqual(snapshot);
  });
  it.each([NaN, Infinity, -1, 0])('rejects invalid time %s without changing state', dt => {
    const sim = system(); sim.update(1, source);
    const old = JSON.stringify(sim);
    sim.update(dt, source);
    expect(JSON.stringify(sim)).toBe(old);
  });
  it('converts wind in m/s to scene velocity and has no cumulative vertical-wind acceleration', () => {
    const sim = system();
    sim.update(1, { ...source, airflowVector: [0, 0.1, 0] });
    const maximum = 1.07 + 0.1 * 0.6 / METERS_PER_SCENE_UNIT;
    expect(sim.particles.length).toBeGreaterThan(0);
    for (const p of sim.particles) {
      expect(p.vy).toBeLessThanOrEqual(maximum + 0.05);
      expect(p.vy).toBeGreaterThan(1);
      expect(p.y).toBeGreaterThan(source.mouthY);
    }
  });
  it('keeps external mist separate from boiling and consumes no second sample mass', () => {
    const vessel: VesselState = { id: 'mist_a', name: 'test', type: 'beaker', capacity_ml: 100,
      position: [0, 0, 0], rotationY: 0, isLocked: false, temperature_c: 100,
      volume_ml: 50, volume: 0.5, mass_g: 50, isBoiling: true, boilingIntensity: 1,
      hasPrecipitate: false, hasGas: false, substances: ['H2O'], ph: 7,
      evaporationRate_g_s: 0.1, waterVaporOutflow_g_s: 0,
      contents: [{ formula: 'H2O', phase: 'l', moles: 50 / 18.015, mass_g: 50 }] };
    const initial = JSON.stringify(vessel);
    const a = new VesselSimulationManager(vessel.id), b = new VesselSimulationManager('mist_b');
    a.step(vessel, 1, { thermalStateAuthoritative: true });
    expect(a.evaporationSystem.particles).toHaveLength(0);
    expect(a.boilingSystem.bubbles.length).toBeGreaterThan(0);
    vessel.waterVaporOutflow_g_s = 0.1;
    a.step(vessel, 1, { thermalStateAuthoritative: true });
    expect(a.evaporationSystem.particles.length).toBeGreaterThan(0);
    expect(b.evaporationSystem.particles).toHaveLength(0);
    expect(vessel.mass_g).toBe(50);
    vessel.waterVaporOutflow_g_s = 0;
    expect(JSON.stringify(vessel)).toBe(initial);
    a.reset();
    expect(a.evaporationSystem.particles).toHaveLength(0);
    expect(a.evaporationSystem.pendingSeconds).toBe(0);
  });
});

describe('Mist optics and saturation boundary', () => {
  it('uses IAPWS reference pressures and does not clamp warm water at 100 °C', () => {
    for (const [temperature, expected] of [[0.01, 611.657], [25, 3169.824], [100, 101417.994], [120, 198671.424]]) {
      expect(waterSaturationPressurePa(temperature)).toBeCloseTo(expected, 0);
    }
    expect(waterSaturationPressurePa(105)).toBeGreaterThan(waterSaturationPressurePa(100));
    for (const edge of [30.35, 60.35, 70.85, 100]) {
      expect(waterSaturationPressurePa(edge + 1e-6) - waterSaturationPressurePa(edge - 1e-6)).toBeLessThan(0.01);
    }
    expect(waterPlumeVisibility(105, 20, 0.5, 1.2)).toBeGreaterThan(0);
    expect(waterPlumeVisibility(100, 20, 0.5, 0)).toBe(0);
    expect(waterPlumeVisibility(100, 20, NaN)).toBe(0);
  });
  it('fades alpha independently of expanding particle geometry, and wires alpha into the material', () => {
    const sim = system(); sim.update(1, source);
    const p = sim.particles[0];
    const middle = mistParticleAppearance({ ...p, age: p.life / 2, opacity: 0.2 });
    const end = mistParticleAppearance({ ...p, age: p.life, opacity: 0.2 });
    expect(middle.opacity).toBeCloseTo(0.2, 12);
    expect(end.opacity).toBeCloseTo(0, 12);
    expect(end.diameter).toBe(middle.diameter);
    const material = createInstancedMistMaterial(new THREE.Texture());
    const shader = { vertexShader: THREE.ShaderLib.basic.vertexShader,
      fragmentShader: THREE.ShaderLib.basic.fragmentShader, uniforms: {} };
    material.onBeforeCompile(shader as Parameters<typeof material.onBeforeCompile>[0], null!);
    expect(shader.vertexShader).toContain('attribute float aMistOpacity');
    expect(shader.vertexShader).toContain('vMistOpacity = aMistOpacity');
    expect(shader.fragmentShader).toContain('diffuseColor.a *= clamp(vMistOpacity, 0.0, 1.0)');
    material.dispose();
  });
});
