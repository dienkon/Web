import { afterEach, describe, expect, it } from 'vitest';
import { bubbleMechanicalRadius, condenseBubbleVapor } from '../src/science/bubblePhase';
import { waterSaturationPressurePa, waterSaturationTemperatureC } from '../src/science/waterSaturation';
import { waterSurfaceTension } from '../src/science/wallDropletGeometry';
import { METERS_PER_SCENE_UNIT as scale } from '../src/science/sceneUnits';
import { BoilingSystem, type BoilingSimulationParams } from '../src/simulation/effects/BoilingSystem';
import type { PhysicalBubble } from '../src/simulation/core/SimulationTypes';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';
import { PRNG } from '../src/core/rng';
import { useAppStore } from '../src/store/useAppStore';
import { effects } from '../src/vfx/vesselEffects';
import type { VesselState } from '../src/types/chemistry';

const original = useAppStore.getState(), boiling = waterSaturationTemperatureC(101325), dt = 1 / 120;
afterEach(() => { useAppStore.setState(original, true); SimulationEngine.clearAll(); });
const params: BoilingSimulationParams = { radius: 2, liquidBottomY: 0, surfaceY: 10,
  temp_c: boiling, boilingPoint_c: boiling, heatPower_W: 0, viscosity_mPa_s: 1,
  boilingStage: 'ACTIVE_BOIL', boilingIntensity: 1, vaporRate_g_s: 0, reactionGasRate: 0 };
const vapor = { ...params, vaporRate_g_s: 0.1 };
const reaction = { ...params, boilingStage: 'COLD_STABLE' as const, reactionGasRate: 30 };

function packet(radius_m: number, source: 'reaction' | 'vapor' = 'reaction', temp = 25): PhysicalBubble {
  const radius = radius_m / scale;
  const pressure = 101325 + 1000 * 9.80665 * (2 - 0.2) * scale + 2 * waterSurfaceTension(temp) / radius_m;
  const k = pressure * radius ** 3;
  return { id: 1, source, gasPV_scene3_Pa: k, vaporPV_scene3_Pa: source === 'vapor' ? k : 0,
    noncondensablePV_scene3_Pa: source === 'reaction' ? k : 0, nucleationPressure_Pa: pressure,
    x: 0, y: 0.2, z: 0, radius, baseRadius: radius, vx: 0, vy: 0, vz: 0,
    buoyancy: 1, growthRate: 0, wobblePhase: 0, wobbleSpeed: 0, wobbleAmp: 0, aspectRatio: 1,
    life: 0, maxLife: 0.05, opacity: 1, temperature: temp, isPopping: false, popProgress: 0, merged: false };
}

describe('Source-separated visual bubble sampling', () => {
  it('cannot turn two fractional pulses of different gases into one randomly labelled bubble', () => {
    const sim = new BoilingSystem(20, new PRNG(1));
    for (let i = 0; i < 2; i++) sim.update(dt, vapor); // 0.5 vapor glyph
    for (let i = 0; i < 2; i++) sim.update(dt, reaction); // 0.5 reaction glyph
    expect(sim.bubbles).toHaveLength(0);
    expect(sim.sourceSampling.vaporGlyphsBorn).toBe(0); expect(sim.sourceSampling.reactionGlyphsBorn).toBe(0);
    expect(sim.sourceSampling.vaporFractionalCredit).toBe(0.5);
    expect(sim.sourceSampling.reactionFractionalCredit).toBe(0.5);
    for (let i = 0; i < 2; i++) sim.update(dt, reaction);
    expect(sim.sourceSampling.reactionGlyphsBorn).toBe(1); expect(sim.sourceSampling.vaporGlyphsBorn).toBe(0);
    expect(sim.bubbles.every(b => b.source === 'reaction')).toBe(true);
    for (let i = 0; i < 2; i++) sim.update(dt, vapor);
    expect(sim.sourceSampling.vaporGlyphsBorn).toBe(1); expect(sim.sourceSampling.reactionGlyphsBorn).toBe(1);
  });
  it('gives each channel its own integral count at 30/60/120 Hz, including integer thresholds', () => {
    for (const hz of [30, 60, 120]) {
      const sim = new BoilingSystem(60, new PRNG(19));
      for (let i = 0; i < hz; i++) sim.update(1 / hz, { ...params, vaporRate_g_s: 0.01, reactionGasRate: 5 });
      expect(sim.sourceSampling.vaporGlyphsBorn).toBe(3); expect(sim.sourceSampling.reactionGlyphsBorn).toBe(5);
      expect(sim.sourceSampling.vaporFractionalCredit).toBeCloseTo(0, 13);
      expect(sim.sourceSampling.reactionFractionalCredit).toBeCloseTo(0, 13);
    }
  });
  it('does not emit a fractional tail after its source stops, and reset clears both histories', () => {
    const sim = new BoilingSystem(20, new PRNG(1));
    sim.update(2 * dt, vapor); sim.update(1, params);
    expect(sim.sourceSampling.vaporGlyphsBorn).toBe(0); expect(sim.bubbles).toHaveLength(0);
    sim.reset(); sim.update(2 * dt, vapor);
    expect(sim.sourceSampling.vaporGlyphsBorn).toBe(0);
    expect(sim.sourceSampling.vaporFractionalCredit).toBe(0.5);
    expect(sim.sourceSampling.reactionFractionalCredit).toBe(0);
  });
  it('bounds spawn work by available slots even for a finite rate far above safe-integer glyph counts', () => {
    const sim = new BoilingSystem(3, new PRNG(1));
    sim.update(dt, { ...reaction, reactionGasRate: Number.MAX_VALUE });
    expect(sim.sourceSampling.reactionGlyphsBorn).toBe(3); expect(sim.bubbles.length).toBeLessThanOrEqual(3);
    expect(sim.acceptedTime_s).toBe(dt); expect(sim.integratedTime_s).toBe(dt);
    expect(Number.isFinite(sim.sourceSampling.reactionFractionalCredit)).toBe(true);
  });
  it('does not save saturated quality-budget attempts as a burst after the source shuts off', () => {
    const sim = new BoilingSystem(1, new PRNG(1));
    sim.update(0.1, { ...reaction, reactionGasRate: 1200 });
    const count = sim.sourceSampling.reactionGlyphsBorn;
    sim.bubbles = []; sim.update(0.1, params);
    expect(sim.sourceSampling.reactionGlyphsBorn).toBe(count); expect(sim.bubbles).toHaveLength(0);
  });
});

describe('Local capillary/hydrostatic phase equilibrium and underwater lifetime', () => {
  it.each([0, 200])('finds the reachable mixed-gas root when saturation exceeds exterior pressure by %s Pa', excess => {
    const pressure = 101325, sigma = 0.06, saturationTarget = pressure + excess;
    const temperature = waterSaturationTemperatureC(saturationTarget), saturation = waterSaturationPressurePa(temperature);
    const equilibriumRadius = excess === 0 ? 0.0003 : 0.0002, initialRadius = equilibriumRadius * 1.4;
    const noncondensable = (pressure - saturation) * equilibriumRadius ** 3 + 2 * sigma * equilibriumRadius ** 2;
    const total = pressure * initialRadius ** 3 + 2 * sigma * initialRadius ** 2;
    const gas = { vapor_Pa_m3: total - noncondensable, noncondensable_Pa_m3: noncondensable, temperature_c: temperature };
    const out = condenseBubbleVapor(gas, pressure, sigma, temperature, 100);
    expect(out.condensedMass_kg).toBeGreaterThan(0); expect(out.noncondensable_Pa_m3).toBe(noncondensable);
    const radius = bubbleMechanicalRadius(out.vapor_Pa_m3 + out.noncondensable_Pa_m3, pressure, sigma);
    expect(radius).toBeCloseTo(equilibriumRadius, 13);
    expect(out.vapor_Pa_m3 / radius ** 3 / saturation).toBeCloseTo(1, 9);
    const stable = condenseBubbleVapor(out, pressure, sigma, temperature, 100);
    expect(stable.vapor_Pa_m3).toBeCloseTo(out.vapor_Pa_m3, 16);
  });
  it('does not remove an undersaturated mixture merely because it is near bulk boiling', () => {
    const pressure = 101325, radius = 0.0005, sigma = 0.06;
    const total = pressure * radius ** 3 + 2 * sigma * radius ** 2;
    const gas = { vapor_Pa_m3: total * 0.1, noncondensable_Pa_m3: total * 0.9, temperature_c: boiling };
    const out = condenseBubbleVapor(gas, pressure, sigma, boiling, 1);
    expect(out.vapor_Pa_m3).toBe(gas.vapor_Pa_m3); expect(out.condensedMass_kg).toBe(0);
  });
  it('relaxes vapor at the ambient boiling point when local depth/Laplace pressure still makes it subcooled', () => {
    const b = packet(0.0005, 'vapor', boiling), before = b.vaporPV_scene3_Pa!;
    const sim = new BoilingSystem(1); sim.bubbles = [b];
    sim.update(dt, { ...params, surfaceY: 2 });
    expect(sim.bubbles).toHaveLength(1);
    expect(sim.bubbles[0].vaporPV_scene3_Pa).toBeLessThan(before);
    expect(sim.bubbles[0].noncondensablePV_scene3_Pa).toBe(0);
    expect(sim.bubbles[0].physicalRadius_m).toBeGreaterThan(0);
  });
  it('keeps a slowly rising noncondensable bubble beyond 4.5 s instead of deleting gas underwater', () => {
    const b = packet(20e-6), initial = b.noncondensablePV_scene3_Pa!;
    const sim = new BoilingSystem(1); sim.bubbles = [b];
    const cold = { ...params, surfaceY: 2, temp_c: 25, boilingStage: 'COLD_STABLE' as const, boilingIntensity: 0 };
    for (let i = 0; i < 360; i++) sim.update(1 / 60, cold);
    expect(sim.bubbles).toHaveLength(1); expect(sim.bubbles[0].life).toBeGreaterThan(5.9);
    expect(sim.bubbles[0].isPopping).toBe(false); expect(sim.bubbles[0].y).toBeLessThan(2);
    expect(sim.bubbles[0].noncondensablePV_scene3_Pa).toBe(initial);
    expect(sim.bubbles[0].y).toBeGreaterThan(0.2);
  });
  it('still removes a pure steam bubble when its finite vapor inventory actually condenses away', () => {
    const sim = new BoilingSystem(1); sim.bubbles = [packet(20e-6, 'vapor', 25)];
    sim.update(dt, { ...params, surfaceY: 2, temp_c: 25, boilingStage: 'COLD_STABLE', boilingIntensity: 0 });
    expect(sim.bubbles).toHaveLength(0);
  });
});

it('inspects visual source sampling on the existing vessel without creating a manager or another vessel', () => {
  const vessel: VesselState = { id: 'a', name: 'a', type: 'beaker', capacity_ml: 100, position: [0, 0, 0], rotationY: 0,
    isLocked: false, mass_g: 50, volume_ml: 50, volume: 0.5, temperature_c: boiling,
    contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }], substances: ['H2O'],
    ph: 7, isBoiling: false, hasGas: false, hasPrecipitate: false };
  useAppStore.setState({ vessels: { a: vessel }, vesselIds: ['a'] });
  expect(effects.forVessel('a').inspect().state!.bubbleVisualSampling).toBeNull();
  expect(SimulationEngine.findManager('a')).toBeUndefined();
  const manager = SimulationEngine.getManager('a');
  manager.boilingSystem.update(0.1, { ...reaction, vesselId: 'a' });
  const snapshot = JSON.stringify(useAppStore.getState().vessels);
  const inspected = effects.forVessel('a').inspect().state!.bubbleVisualSampling!;
  expect(inspected.model).toBe('source-separated-visual-glyphs'); expect(inspected.reactionGlyphsBorn).toBe(3);
  expect(inspected.vaporGlyphsBorn).toBe(0); expect(JSON.stringify(useAppStore.getState().vessels)).toBe(snapshot);
  expect(Object.keys(useAppStore.getState().vessels)).toEqual(['a']);
});
