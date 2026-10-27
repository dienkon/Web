import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VesselState } from '../src/types/chemistry';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { sampleHeatCapacity, stepVesselThermal } from '../src/engine/thermalState';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { ConvectionSystem } from '../src/simulation/effects/ConvectionSystem';
import { BoilingSystem, type BoilingSimulationParams } from '../src/simulation/effects/BoilingSystem';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { PRNG } from '../src/core/rng';

const sample = (patch: Partial<VesselState> = {}): VesselState => ({
  id: 'a', name: 'a', type: 'beaker', capacity_ml: 250, position: [0, 1.3, 0],
  rotationY: 0, isLocked: false, mass_g: 100, volume_ml: 100, volume: 0.4,
  temperature_c: 45, contents: [{ formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 },
    { formula: 'BaSO4', phase: 's', solidOrigin: 'precipitate', mass_g: 0.1, moles: 0.1 / 233.39 }],
  substances: ['H2O', 'BaSO4'], ph: 7, hasPrecipitate: true, hasGas: true, isBoiling: false,
  environment: { ...DEFAULT_LAB_ENVIRONMENT, temperature_c: 20 },
  effectsEnvironment: { temperature_c: 40, airSpeed_m_s: 0.7, relativeHumidity: 0.9, pressure_atm: 0.8 },
  ...patch,
});
afterEach(() => vi.restoreAllMocks());

describe('One environmental boundary per vessel and step', () => {
  it.each([undefined, 15])('shares effect conditions across all particle systems, override=%s', override => {
    const vessel = sample(), snapshot = JSON.stringify(vessel);
    const manager = new VesselSimulationManager(vessel.id);
    const mist = vi.spyOn(manager.evaporationSystem, 'update');
    const bubbles = vi.spyOn(manager.boilingSystem, 'update');
    const solid = vi.spyOn(PrecipitationSystem.prototype, 'update');
    const flow = vi.spyOn(ConvectionSystem, 'sampleVelocity');
    manager.step(vessel, 1 / 30, { thermalStateAuthoritative: true, reactionGasRate: 120,
      ambientTemp_c: override });
    const ambient = override ?? 40;
    expect(mist.mock.calls[0][1]).toMatchObject({ ambient_c: ambient, relativeHumidity: 0.9,
      pressure_atm: 0.8, airflowVector: [0.7, 0, 0] });
    expect(bubbles.mock.calls[0][1]).toMatchObject({ ambientTemp_c: ambient, pressure_atm: 0.8 });
    expect(solid.mock.calls[0][1]).toMatchObject({ ambientTemp_c: ambient });
    expect(flow.mock.calls.length).toBeGreaterThan(0);
    expect(flow.mock.calls.every(call => call[3].ambientTemp_c === ambient
      && call[3].fluidModel === 'pure-water-reference')).toBe(true);
    expect(JSON.stringify(vessel)).toBe(snapshot);
  });

  it.each(['aqueous-water-proxy', 'unavailable'] as const)('passes fluid applicability through both immersed systems: %s', model => {
    const vessel = sample();
    if (model === 'aqueous-water-proxy') vessel.contents.push({ formula: 'NaCl', phase: 'aq', mass_g: 1, moles: 1 / 58.44 });
    else vessel.contents[0] = { formula: 'C2H5OH', phase: 'l', mass_g: 79, moles: 79 / 46.069 };
    const manager = new VesselSimulationManager('a'), flow = vi.spyOn(ConvectionSystem, 'sampleVelocity');
    manager.step(vessel, 1 / 30, { thermalStateAuthoritative: true, reactionGasRate: 120 });
    expect(flow.mock.calls.length).toBeGreaterThan(0);
    expect(flow.mock.calls.every(call => call[3].fluidModel === model)).toBe(true);
    if (model === 'unavailable') {
      expect(flow.mock.results.every(result => (result.value as number[]).every(v => v === 0))).toBe(true);
      // Bubble buoyancy and sediment gravity are separate from circulation.
      expect(manager.boilingSystem.bubbles.length).toBeGreaterThan(0);
      expect(manager.precipitationSystem.representedMass_g).toBeCloseTo(0.1, 14);
    }
  });

  it('keeps different room conditions on two independently addressed managers', () => {
    const a = sample(), b = sample({ id: 'b', effectsEnvironment: { temperature_c: 15, airSpeed_m_s: 0.2 } });
    const first = new VesselSimulationManager('a'), second = new VesselSimulationManager('b');
    const mistA = vi.spyOn(first.evaporationSystem, 'update'), mistB = vi.spyOn(second.evaporationSystem, 'update');
    first.step(a, 1 / 60, { thermalStateAuthoritative: true });
    second.step(b, 1 / 60, { thermalStateAuthoritative: true });
    expect(mistA.mock.calls[0][1]).toMatchObject({ ambient_c: 40, airflowVector: [0.7, 0, 0] });
    expect(mistB.mock.calls[0][1]).toMatchObject({ ambient_c: 15, airflowVector: [0.2, 0, 0] });
    first.step(a, 1 / 60, { thermalStateAuthoritative: true });
    expect(mistA.mock.calls[1][1].ambient_c).toBe(40);
  });

  it('defaults to the lab boundary when a legacy vessel has no environment', () => {
    const manager = new VesselSimulationManager('a'), mist = vi.spyOn(manager.evaporationSystem, 'update');
    manager.step(sample({ environment: undefined, effectsEnvironment: undefined }), 1 / 60,
      { thermalStateAuthoritative: true, airflowVector: [0, 0, -0.4] });
    expect(mist.mock.calls[0][1]).toMatchObject({ ambient_c: 25, relativeHumidity: 0.5,
      pressure_atm: 1, airflowVector: [0, 0, -0.4] });
  });

  it.each([undefined, 15])('uses the same boundary for standalone thermal integration, override=%s', override => {
    // Sealed water removes surface evaporation so the exact Newton solution
    // isolates room heat exchange from every material phase-change sink.
    const vessel = sample({ temperature_c: 25, isSealed: true }), snapshot = JSON.stringify(vessel);
    const ambient = override ?? 40, duration = 2;
    const conductance = 0.35 * (1 + 0.7 - 0.1);
    const expected = 25 + (ambient - 25) * -Math.expm1(-conductance * duration / sampleHeatCapacity(vessel));
    const direct = stepVesselThermal(vessel, duration, 0, override);
    const managed = new VesselSimulationManager('a').step(vessel, duration, { ambientTemp_c: override });
    expect(direct.temperature_c).toBeCloseTo(expected, 12);
    expect(managed.temperature_c).toBeCloseTo(expected, 12);
    expect(direct.evaporatedStep_g).toBe(0); expect(managed.evaporatedStep_g).toBe(0);
    expect(JSON.stringify(vessel)).toBe(snapshot);
  });

  it('honors effect humidity in direct surface evaporation before store normalization', () => {
    const vessel = sample({ temperature_c: 25, environment: DEFAULT_LAB_ENVIRONMENT,
      effectsEnvironment: { temperature_c: 25, relativeHumidity: 1 } });
    const saturated = stepVesselThermal(vessel, 1);
    const dry = stepVesselThermal({ ...vessel, effectsEnvironment: { relativeHumidity: 0 } }, 1);
    expect(saturated.evaporatedStep_g).toBe(0);
    expect(dry.evaporatedStep_g).toBeGreaterThan(0);
    expect(dry.temperature_c).toBeLessThan(saturated.temperature_c);
  });
});

describe('Particle environment snapshots', () => {
  const base: BoilingSimulationParams = { temp_c: 45, boilingPoint_c: 100, heatPower_W: 0,
    viscosity_mPa_s: 1, radius: 1, liquidBottomY: 0, surfaceY: 2, boilingStage: 'COLD_STABLE',
    boilingIntensity: 0, reactionGasRate: 120 };
  it('uses the queued boundary rather than replacing a partial old step with a new room', () => {
    const system = new BoilingSystem(20, new PRNG(7));
    system.update(1 / 120, { ...base, ambientTemp_c: 40 });
    const flow = vi.spyOn(ConvectionSystem, 'sampleVelocity');
    system.update(1 / 240, { ...base, ambientTemp_c: 40 });
    system.update(1 / 240, { ...base, ambientTemp_c: 15 });
    expect(flow.mock.calls.map(call => call[3].ambientTemp_c)).toContain(40);
    expect(flow.mock.calls.map(call => call[3].ambientTemp_c)).toContain(15);
    expect(flow.mock.calls[0][3].ambientTemp_c).toBe(40);
    expect(flow.mock.calls.at(-1)![3].ambientTemp_c).toBe(15);
  });
  it('changes actual particle transport when the room boundary changes', () => {
    const run = (ambient: number) => {
      const bubbles = new BoilingSystem(20, new PRNG(7));
      const solid = new PrecipitationSystem(20, 'BaSO4', new PRNG(7));
      for (let i = 0; i < 12; i++) {
        bubbles.update(1 / 120, { ...base, ambientTemp_c: ambient });
        solid.update(1 / 120, { ...base, ambientTemp_c: ambient, density_g_ml: 1, precipitateAmount_g: 0.1 });
      }
      return { bubbles, solid };
    };
    const warm = run(40), cool = run(15);
    expect(warm.bubbles.bubbles.length).toBeGreaterThan(0); expect(warm.solid.particles.length).toBeGreaterThan(0);
    expect(warm.bubbles.sourceSampling.reactionGlyphsBorn).toBe(cool.bubbles.sourceSampling.reactionGlyphsBorn);
    expect(warm.bubbles.bubbles[0].y).not.toBeCloseTo(cool.bubbles.bubbles[0].y, 9);
    expect(warm.solid.particles[0].y).not.toBeCloseTo(cool.solid.particles[0].y, 9);
    expect(warm.solid.representedMass_g).toBeCloseTo(cool.solid.representedMass_g, 14);
  });
  it('rejects a nonfinite explicit room without consuming simulation time', () => {
    const bubbles = new BoilingSystem(20), solid = new PrecipitationSystem(20);
    bubbles.update(1 / 60, { ...base, ambientTemp_c: NaN });
    solid.update(1 / 60, { ...base, ambientTemp_c: Infinity, density_g_ml: 1, precipitateAmount_g: 0.1 });
    expect(bubbles.acceptedTime_s).toBe(0); expect(bubbles.bubbles).toHaveLength(0);
    expect(solid.lastInputMass_g).toBeNull(); expect(solid.representedMass_g).toBe(0);
  });
});
