import { describe, expect, it } from 'vitest';
import { PRNG } from '../src/core/rng';
import { bubbleMechanicalRadius, condenseBubbleVapor, saturationTemperatureC } from '../src/science/bubblePhase';
import { waterThermalConductivity_W_m_K } from '../src/science/waterThermalConductivity';
import { waterSaturationPressurePa } from '../src/science/waterSaturation';
import { waterLatentHeatJ_G } from '../src/science/waterThermodynamics';
import { waterPlumeVisibility } from '../src/science/waterSurface';
import { BoilingSystem, type BoilingSimulationParams } from '../src/simulation/effects/BoilingSystem';
import { EvaporationSystem, type EvaporationSimulationParams } from '../src/simulation/effects/EvaporationSystem';

const dt = 1 / 120;
const cold: BoilingSimulationParams = { radius: 2, liquidBottomY: 0, surfaceY: 10,
  temp_c: 25, boilingPoint_c: 100, heatPower_W: 0, viscosity_mPa_s: 1,
  boilingStage: 'COLD_STABLE', boilingIntensity: 0, reactionGasRate: 0 };

describe('Published liquid-water thermal conductivity references', () => {
  // IAPWS SR6-08(2011), Table 8, independent published program-verification
  // values. The 260 K example lies outside our deliberately bounded API.
  it.each([[25, 0.606502308], [101.85, 0.677913788]])('matches IAPWS Table 8 at %s C', (temperature, expected) => {
    expect(waterThermalConductivity_W_m_K(temperature)).toBeCloseTo(expected, 9);
  });
  it('rejects extrapolation and accepts the recommended temperature endpoints', () => {
    for (const temperature of [-13.15, -0.01, 110.01, NaN, Infinity]) {
      expect(waterThermalConductivity_W_m_K(temperature)).toBeNull();
    }
    expect(waterThermalConductivity_W_m_K(0)).toBeGreaterThan(0.55);
    expect(waterThermalConductivity_W_m_K(110)).toBeGreaterThan(0.67);
  });
  it('uses the published 375 K film conductivity in the pure-vapor conduction law', () => {
    const interface_c = 110, bulk = 93.7, radius = 1e-3, seconds = 1e-5;
    const pressure = waterSaturationPressurePa(interface_c);
    const gas = { vapor_Pa_m3: pressure * radius ** 3, noncondensable_Pa_m3: 0, temperature_c: interface_c };
    const next = condenseBubbleVapor(gas, pressure, 0, bulk, seconds);
    const rho = pressure / (461.5 * (interface_c + 273.15));
    const latent = waterLatentHeatJ_G(interface_c) * 1000;
    const expectedR2 = radius ** 2 - 2 * 0.677913788 * (interface_c - bulk) * seconds / (rho * latent);
    expect(bubbleMechanicalRadius(next.vapor_Pa_m3, pressure, 0) ** 2).toBeCloseTo(expectedR2, 17);
    expect(next.condensedMass_kg).toBeGreaterThan(condenseBubbleVapor(gas, pressure, 0, bulk, seconds, 0.6).condensedMass_kg);
  });
  it('keeps an explicit reference fallback outside the correlation pressure range', () => {
    const pressure = 400000;
    const gas = { vapor_Pa_m3: pressure * 1e-9, noncondensable_Pa_m3: 0, temperature_c: saturationTemperatureC(pressure) };
    expect(condenseBubbleVapor(gas, pressure, 0, 80, 1e-5)).toEqual(condenseBubbleVapor(gas, pressure, 0, 80, 1e-5, 0.6));
  });
});

describe('Emission times and wetted chemical origins', () => {
  it('does not age, move or condense a vapor glyph before its endpoint birth', () => {
    const sim = new BoilingSystem(10, new PRNG(13));
    sim.update(4 * dt, { ...cold, temp_c: 100, boilingStage: 'ACTIVE_BOIL', boilingIntensity: 1, vaporRate_g_s: 0.1 });
    expect(sim.bubbles).toHaveLength(1);
    const b = sim.bubbles[0];
    expect(b.life).toBeCloseTo(0, 14);
    expect(b.vy).toBeCloseTo(0, 14);
    expect(b.vaporPV_scene3_Pa).toBe(b.nucleationPressure_Pa! * b.baseRadius ** 3);
    expect(b.noncondensablePV_scene3_Pa).toBe(0);
    expect(b.y).toBeGreaterThanOrEqual(b.radius * 1.6 - 1e-12);
  });
  it('gives a mid-substep chemical birth only its actual remaining lifetime', () => {
    const sim = new BoilingSystem(10, new PRNG(13));
    sim.update(2 * dt, { ...cold, reactionGasRate: 80,
      reactionSources: [{ point: [0, 5, 0], radius: 0, weight: 1, normal: [0, 1, 0] }] });
    expect(sim.bubbles).toHaveLength(1);
    const b = sim.bubbles[0];
    expect(b.life).toBeCloseTo(2 * dt - 1 / 80, 14);
    expect(b.y).toBeGreaterThan(5 + b.baseRadius);
    expect(b.y).toBeLessThan(5.02);
  });
  it('snapshots supplied wetted sites and respects the outward normal at endpoint birth', () => {
    const sim = new BoilingSystem(10, new PRNG(13));
    const site = { point: [0.3, 4, -0.2] as [number, number, number], normal: [1, 0, 0] as [number, number, number], radius: 0, weight: 1 };
    sim.update(dt / 2, { ...cold, reactionGasRate: 240, reactionSources: [site] });
    site.point[1] = 8; site.normal[0] = -1;
    sim.update(dt / 2, cold);
    expect(sim.bubbles).toHaveLength(1);
    const b = sim.bubbles[0];
    expect(b.y).toBeLessThan(4.01); expect(b.x).toBeGreaterThan(0.3);
    expect(b.life).toBeCloseTo(dt / 2, 14);
  });
  it('offsets the center outside the emitting solid before any buoyant displacement', () => {
    const sim = new BoilingSystem(10, new PRNG(13));
    sim.update(dt, { ...cold, reactionGasRate: 120,
      reactionSources: [{ point: [0.3, 4, -0.2], radius: 0, weight: 1, normal: [2, 0, 0] }] });
    const b = sim.bubbles[0];
    expect(b.life).toBe(0);
    expect(b.x).toBeCloseTo(0.3 + b.baseRadius, 14);
    expect(b.y).toBe(4); expect(b.z).toBe(-0.2);
  });
  it('contains an upright birth before computing its gas pressure or motion', () => {
    const sim = new BoilingSystem(10, new PRNG(13));
    sim.update(dt, { ...cold, reactionGasRate: 120,
      reactionSources: [{ point: [5, -1, 5], radius: 0, weight: 1, normal: [1, -1, 1] }] });
    const b = sim.bubbles[0];
    expect(b.life).toBe(0);
    expect(b.y).toBeGreaterThanOrEqual(b.radius * 1.6 - 1e-12);
    expect(Math.hypot(b.x, b.z) + b.radius * 1.6).toBeLessThanOrEqual(cold.radius);
  });
  it('suppresses dry known surfaces while keeping vapor and homogeneous sources independent', () => {
    const dry = new BoilingSystem(20, new PRNG(13)), volume = new BoilingSystem(20, new PRNG(13));
    dry.update(0.1, { ...cold, reactionGasRate: 120, reactionSources: [], temp_c: 100,
      boilingStage: 'ACTIVE_BOIL', boilingIntensity: 1, vaporRate_g_s: 0.1 });
    volume.update(0.1, { ...cold, reactionGasRate: 120 });
    expect(dry.sourceSampling.reactionGlyphsBorn).toBe(0);
    expect(dry.sourceSampling.vaporGlyphsBorn).toBe(3);
    expect(volume.sourceSampling.reactionGlyphsBorn).toBe(12);
    expect(volume.bubbles.some(b => b.y > cold.surfaceY / 2)).toBe(true);
    expect(volume.bubbles.every(b => b.y >= b.radius * 1.6 && b.y <= cold.surfaceY)).toBe(true);
  });
});

describe('Mist packets start at their actual emission time', () => {
  const plume: EvaporationSimulationParams = { temp_c: 100, ambient_c: 20, relativeHumidity: 0.5,
    pressure_atm: 1, radius: 0.5, mouthRadius: 0.2, surfaceY: 0.1, mouthY: 1,
    surfaceArea_cm2: 10, isBoiling: true, airflowVector: [0, 0, 0] };
  const visibility = waterPlumeVisibility(100, 20, 0.5, 1);
  it('keeps an endpoint birth at its source without applying a full earlier tick', () => {
    const sim = new EvaporationSystem(10, new PRNG(13));
    sim.update(6 * dt, { ...plume, actualRate_g_s: 20 / (180 * visibility) });
    expect(sim.particles).toHaveLength(1);
    const p = sim.particles[0];
    expect(p.age).toBeCloseTo(0, 14);
    expect(p.y).toBeCloseTo(1.015, 14);
    expect(p.size).toBeCloseTo(p.baseSize, 14);
    expect(p.opacity).toBeCloseTo(0.35, 14);
  });
  it('matches the integral source crossing age when birth falls inside a tick', () => {
    const sim = new EvaporationSystem(10, new PRNG(13));
    sim.update(6 * dt, { ...plume, actualRate_g_s: 21 / (180 * visibility) });
    expect(sim.particles).toHaveLength(1);
    expect(sim.particles[0].age).toBeCloseTo(6 * dt - 1 / 21, 14);
    expect(sim.particles[0].y).toBeGreaterThan(1.015);
  });
});
