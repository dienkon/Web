import { describe, expect, it } from 'vitest';
import { bubbleMechanicalRadius, condenseBubbleVapor, saturationTemperatureC } from '../src/science/bubblePhase';
import { waterSaturationPressurePa } from '../src/science/waterSurface';
import { synchronizeBubbleGas, mergeBubbleGas } from '../src/simulation/effects/bubbleGasInventory';
import { BoilingSystem, type BoilingSimulationParams } from '../src/simulation/effects/BoilingSystem';
import type { PhysicalBubble } from '../src/simulation/core/SimulationTypes';
import { PRNG } from '../src/core/rng';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import { waterSurfaceTension } from '../src/science/wallDropletGeometry';
import { waterLatentHeatJ_G } from '../src/science/waterThermodynamics';

const packet = (source: 'vapor' | 'reaction', x = 0, temperature = 100): PhysicalBubble => ({
  id: x ? 2 : 1, x, y: 0.5, z: 0, radius: 0.025, baseRadius: 0.025, vx: 0, vy: 0, vz: 0,
  source, temperature, gasPV_scene3_Pa: 102000 * 0.025 ** 3, nucleationPressure_Pa: 102000,
  buoyancy: 1, growthRate: 0, wobblePhase: 0, wobbleSpeed: 0, wobbleAmp: 0, aspectRatio: 1,
  life: 0, maxLife: 5, opacity: 1, isPopping: false, popProgress: 0, merged: false,
});
const params: BoilingSimulationParams = { radius: 1, liquidBottomY: 0, surfaceY: 2,
  temp_c: 100, boilingPoint_c: 100, heatPower_W: 0, viscosity_mPa_s: 1,
  boilingStage: 'ACTIVE_BOIL', boilingIntensity: 0, vaporRate_g_s: 0, reactionGasRate: 0 };

describe('Mechanical and thermal bubble equilibrium', () => {
  it('solves the single-interface Laplace pressure and reduces to Boyle volume at zero surface tension', () => {
    const radius = 0.0005, pressure = 101325, sigma = 0.072;
    const k = pressure * radius ** 3 + 2 * sigma * radius ** 2;
    expect(bubbleMechanicalRadius(k, pressure, sigma)).toBeCloseTo(radius, 14);
    expect(bubbleMechanicalRadius(k, pressure, 0)).toBeCloseTo(Math.cbrt(k / pressure), 14);
    expect(bubbleMechanicalRadius(k, pressure * 2, sigma)).toBeLessThan(radius);
    expect(bubbleMechanicalRadius(k, pressure, sigma * 2)).toBeLessThan(radius);
  });
  it('matches the saturation curve inverse without assuming that every mixture boils at 100 C', () => {
    for (const temperature of [1, 25, 85, 100, 120]) {
      expect(saturationTemperatureC(waterSaturationPressurePa(temperature))).toBeCloseTo(temperature, 8);
    }
    expect(saturationTemperatureC(101325)).toBeCloseTo(99.974, 2);
  });
  it('recovers the pure-vapor R-squared conduction law at constant exterior pressure', () => {
    const radius = 0.001, pressure = 101325, bulk = 90, dt = 1e-4;
    const gas = { vapor_Pa_m3: pressure * radius ** 3, noncondensable_Pa_m3: 0, temperature_c: 100 };
    const next = condenseBubbleVapor(gas, pressure, 0, bulk, dt);
    const density = pressure / (461.5 * 373.15), latent = waterLatentHeatJ_G(saturationTemperatureC(pressure)) * 1000;
    const predictedR2 = radius ** 2 - 2 * 0.6 * (saturationTemperatureC(pressure) - bulk) * dt / (density * latent);
    const actualR = bubbleMechanicalRadius(next.vapor_Pa_m3, pressure, 0);
    expect(actualR ** 2).toBeCloseTo(predictedR2, 15);
    const initialMass = gas.vapor_Pa_m3 * 4 * Math.PI / 3 / (461.5 * 373.15);
    const remainingMass = next.vapor_Pa_m3 * 4 * Math.PI / 3 / (461.5 * 373.15);
    expect(remainingMass + next.condensedMass_kg).toBeCloseTo(initialMass, 16);
    expect(next.latentHeat_J).toBeCloseTo(next.condensedMass_kg * latent, 14);
  });
  it('condenses more with greater subcooling while never removing noncondensable gas', () => {
    const gas = { vapor_Pa_m3: 1e-4, noncondensable_Pa_m3: 1e-6, temperature_c: 100 };
    const cold = condenseBubbleVapor(gas, 101325, 0.072, 25, 1e-4);
    const warm = condenseBubbleVapor(gas, 101325, 0.072, 85, 1e-4);
    expect(cold.vapor_Pa_m3).toBeLessThan(warm.vapor_Pa_m3);
    expect(cold.noncondensable_Pa_m3).toBe(gas.noncondensable_Pa_m3);
  });
  it('stops at the mixed partial-pressure equilibrium rather than removing all vapor or all gas', () => {
    const gas = { vapor_Pa_m3: 9e-6, noncondensable_Pa_m3: 1e-6, temperature_c: 85 };
    const next = condenseBubbleVapor(gas, 101325, 0.072, 85, 1);
    expect(next.noncondensable_Pa_m3).toBe(gas.noncondensable_Pa_m3);
    expect(next.vapor_Pa_m3).toBeGreaterThan(0);
    expect(next.vapor_Pa_m3).toBeLessThan(gas.vapor_Pa_m3);
    const r = bubbleMechanicalRadius(next.vapor_Pa_m3 + next.noncondensable_Pa_m3, 101325, 0.072);
    expect(next.vapor_Pa_m3 / r ** 3 / waterSaturationPressurePa(85)).toBeCloseTo(1, 9);
    const stable = condenseBubbleVapor(next, 101325, 0.072, 85, 1);
    expect(stable.vapor_Pa_m3).toBeCloseTo(next.vapor_Pa_m3, 16);
  });
  it('does not force condensation from a hot but undersaturated mixture or invent evaporation', () => {
    const gas = { vapor_Pa_m3: 1e-7, noncondensable_Pa_m3: 9.9e-6, temperature_c: 85 };
    expect(condenseBubbleVapor(gas, 101325, 0.072, 85, 1).vapor_Pa_m3).toBe(gas.vapor_Pa_m3);
    const dry = { ...gas, vapor_Pa_m3: 0 };
    expect(condenseBubbleVapor(dry, 101325, 0.072, 25, 1).noncondensable_Pa_m3).toBe(dry.noncondensable_Pa_m3);
  });
  it.each([0, -1, NaN, Infinity])('leaves the component inventory unchanged at invalid dt %s', dt => {
    const gas = { vapor_Pa_m3: 9e-6, noncondensable_Pa_m3: 1e-6, temperature_c: 85 };
    const next = condenseBubbleVapor(gas, 101325, 0.072, 25, dt);
    expect(next.vapor_Pa_m3).toBe(gas.vapor_Pa_m3);
    expect(next.noncondensable_Pa_m3).toBe(gas.noncondensable_Pa_m3);
    expect(next.condensedMass_kg).toBe(0);
  });
});

describe('Mixed visual packets preserve component mole proxies', () => {
  it('advances both collision partners to the same time before computing the merged centroid', () => {
    const single = new BoilingSystem(4), pair = new BoilingSystem(4);
    single.bubbles = [packet('reaction', 0, 25)];
    pair.bubbles = [packet('reaction', -0.001, 25), packet('reaction', 0.001, 25)];
    const cold = { ...params, temp_c: 25, boilingStage: 'COLD_STABLE' as const };
    single.update(1 / 120, cold); pair.update(1 / 120, cold);
    expect(pair.bubbles).toHaveLength(1);
    expect(pair.bubbles[0].y).toBeCloseTo(single.bubbles[0].y, 12);
    expect(pair.bubbles[0].vy).toBeCloseTo(single.bubbles[0].vy, 12);
  });
  it('applies condensation to each partner once before merging their inventories', () => {
    const a = packet('vapor', -0.001, 85), b = packet('vapor', 0.001, 85);
    for (const item of [a, b]) {
      item.vaporPV_scene3_Pa = item.gasPV_scene3_Pa! * 0.9;
      item.noncondensablePV_scene3_Pa = item.gasPV_scene3_Pa! * 0.1;
      item.source = 'mixed';
    }
    const scale3 = METERS_PER_SCENE_UNIT ** 3;
    const exterior = 101325 + 1000 * 9.80665 * 1.5 * METERS_PER_SCENE_UNIT;
    const expected = condenseBubbleVapor({ vapor_Pa_m3: a.vaporPV_scene3_Pa! * scale3,
      noncondensable_Pa_m3: a.noncondensablePV_scene3_Pa! * scale3, temperature_c: 85 },
      exterior, waterSurfaceTension(85), 85, 1 / 120);
    const system = new BoilingSystem(4); system.bubbles = [a, b];
    system.update(1 / 120, { ...params, temp_c: 85 });
    expect(system.bubbles).toHaveLength(1);
    expect(system.bubbles[0].vaporPV_scene3_Pa! * scale3).toBeCloseTo(2 * expected.vapor_Pa_m3, 16);
    expect(system.bubbles[0].noncondensablePV_scene3_Pa! * scale3).toBeCloseTo(2 * expected.noncondensable_Pa_m3, 16);
  });
  it('migrates a legacy label and changes K with temperature without changing K/T', () => {
    for (const source of ['vapor', 'reaction'] as const) {
      const b = packet(source), before = b.gasPV_scene3_Pa! / 373.15;
      synchronizeBubbleGas(b, 25);
      expect(b.gasPV_scene3_Pa! / 298.15).toBeCloseTo(before, 14);
      expect(source === 'vapor' ? b.noncondensablePV_scene3_Pa : b.vaporPV_scene3_Pa).toBe(0);
    }
  });
  it('merges both component amounts across different temperatures and preserves a common-temperature centroid', () => {
    const a = packet('vapor', 0, 100), b = packet('reaction', 0.01, 25);
    const vaporMolProxy = a.gasPV_scene3_Pa! / 373.15, otherMolProxy = b.gasPV_scene3_Pa! / 298.15;
    mergeBubbleGas(a, b);
    expect(a.source).toBe('mixed'); expect(b.merged).toBe(true);
    expect(a.vaporPV_scene3_Pa! / 373.15).toBeCloseTo(vaporMolProxy, 14);
    expect(a.noncondensablePV_scene3_Pa! / 373.15).toBeCloseTo(otherMolProxy, 14);
    expect(a.gasPV_scene3_Pa).toBe(a.vaporPV_scene3_Pa! + a.noncondensablePV_scene3_Pa!);
    expect(a.x).toBeGreaterThan(0); expect(a.x).toBeLessThan(0.01);
  });
  it('keeps the noncondensable part of a merged bubble through live subcooling', () => {
    const system = new BoilingSystem(4, new PRNG(18));
    system.bubbles = [packet('vapor'), packet('reaction', 0.001)];
    system.update(1 / 120, params);
    expect(system.bubbles).toHaveLength(1);
    const merged = system.bubbles[0];
    expect(merged.source).toBe('mixed');
    const noncondensableMolProxy = merged.noncondensablePV_scene3_Pa! / 373.15;
    const oldRadius = merged.physicalRadius_m!;
    system.update(0.1, { ...params, temp_c: 25, boilingStage: 'COLD_STABLE' });
    expect(system.bubbles).toHaveLength(1);
    const cooled = system.bubbles[0];
    expect(cooled.noncondensablePV_scene3_Pa! / 298.15).toBeCloseTo(noncondensableMolProxy, 12);
    expect(cooled.physicalRadius_m!).toBeLessThan(oldRadius);
    expect(cooled.noncondensablePV_scene3_Pa!).toBeGreaterThan(0);
    const r = cooled.physicalRadius_m!, pressure = 101325 + 1000 * 9.80665 * (2 - cooled.y) * METERS_PER_SCENE_UNIT;
    expect(pressure * r ** 3).toBeLessThan(cooled.gasPV_scene3_Pa! * METERS_PER_SCENE_UNIT ** 3);
  });
  it('shrinks a pure vapor packet deterministically instead of a random deletion probability', () => {
    for (const seed of [1, 2, 3]) {
      const system = new BoilingSystem(4, new PRNG(seed)); system.bubbles = [packet('vapor')];
      system.update(0.1, { ...params, temp_c: 25, boilingStage: 'COLD_STABLE' });
      expect(system.bubbles).toHaveLength(0);
    }
  });
  it('retains a short source pulse and its snapshot before the next zero-source frame', () => {
    const system = new BoilingSystem(4, new PRNG(19));
    const pulse = { ...params, temp_c: 25, boilingStage: 'COLD_STABLE' as const, reactionGasRate: 240 };
    system.update(1 / 240, pulse);
    expect(system.bubbles).toHaveLength(0);
    pulse.reactionGasRate = 0;
    system.update(1 / 240, pulse);
    expect(system.bubbles).toHaveLength(1);
    expect(system.bubbles[0].source).toBe('reaction');
    expect(system.acceptedTime_s).toBeCloseTo(1 / 120, 12);
    expect(system.integratedTime_s).toBeCloseTo(1 / 120, 12);
  });
  it('keeps accepted time and queued history through a work limit and does not drain on pause', () => {
    const system = new BoilingSystem(4, new PRNG(19));
    system.update(3, params);
    expect(system.acceptedTime_s).toBe(3);
    expect(system.integratedTime_s).toBeCloseTo(2, 10);
    expect(system.pendingTime_s).toBeCloseTo(1, 10);
    system.update(0, params); expect(system.pendingTime_s).toBeCloseTo(1, 10);
    system.update(1, params);
    expect(system.integratedTime_s).toBeCloseTo(4, 10);
    expect(system.pendingTime_s).toBeCloseTo(0, 10);
  });
});
