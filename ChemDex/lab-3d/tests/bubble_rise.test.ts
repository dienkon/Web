import { afterEach, describe, expect, it } from 'vitest';
import { advanceBubbleMotion, bubbleDragCdRe, bubbleResponseTime, bubbleTerminalSpeed } from '../src/science/bubbleRise';
import { BoilingSystem, type BoilingSimulationParams } from '../src/simulation/effects/BoilingSystem';
import { PRNG } from '../src/core/rng';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import { effects } from '../src/vfx/vesselEffects';
import { useAppStore } from '../src/store/useAppStore';
import type { PhysicalBubble } from '../src/simulation/core/SimulationTypes';
import type { VesselState } from '../src/types/chemistry';

const before = useAppStore.getState();
afterEach(() => useAppStore.setState(before, true));
const params: BoilingSimulationParams = { radius: 1, liquidBottomY: 0, surfaceY: 2, temp_c: 25,
  boilingPoint_c: 100, heatPower_W: 0, viscosity_mPa_s: 1, liquidDensity_kg_m3: 1000,
  boilingStage: 'COLD_STABLE', boilingIntensity: 0, reactionGasRate: 0, vaporRate_g_s: 0 };
const bubble = (): PhysicalBubble => {
  const pressure = 101325 + 1000 * 9.80665 * 1.5 * METERS_PER_SCENE_UNIT;
  return { id: 1, x: 0, y: 0.5, z: 0, vx: 0, vy: 0, vz: 0, radius: 0.03, baseRadius: 0.03,
    gasPV_scene3_Pa: pressure * 0.03 ** 3, nucleationPressure_Pa: pressure, source: 'reaction',
    buoyancy: 1, growthRate: 0, wobblePhase: 0, wobbleSpeed: 0, wobbleAmp: 0, aspectRatio: 1,
    life: 0, maxLife: 5, opacity: 1, temperature: 25, isPopping: false, popProgress: 0, merged: false };
};

describe('SI bubble drag, terminal rise and added mass', () => {
  it('has finite drag limits at zero Reynolds and the clean/immobile creeping-flow speeds', () => {
    expect(bubbleDragCdRe(0, 'mobile')).toBe(16);
    expect(bubbleDragCdRe(0, 'immobile')).toBe(24);
    const r = 1e-7, rho = 1000, mu = 0.001;
    const rigid = bubbleTerminalSpeed(r, rho, mu, 'immobile');
    const clean = bubbleTerminalSpeed(r, rho, mu, 'mobile');
    expect(rigid / (2 * rho * 9.80665 * r * r / (9 * mu))).toBeCloseTo(1, 5);
    expect(clean / (rho * 9.80665 * r * r / (3 * mu))).toBeCloseTo(1, 5);
    expect(clean / rigid).toBeCloseTo(1.5, 5);
  });
  it.each(['mobile', 'immobile'] as const)('balances buoyancy and drag at finite Re for %s interface', mode => {
    const r = 0.0005, rho = 1000, mu = 0.001, gas = 1;
    const speed = bubbleTerminalSpeed(r, rho, mu, mode, gas);
    const re = 2 * r * rho * speed / mu;
    const drag = Math.PI * mu * (2 * r) / 8 * bubbleDragCdRe(re, mode) * speed;
    const buoyancy = (rho - gas) * 4 * Math.PI * r ** 3 / 3 * 9.80665;
    expect(speed).toBeGreaterThan(0.05);
    expect(speed).toBeLessThan(0.5);
    expect(drag / buoyancy).toBeCloseTo(1, 10);
  });
  it('increases drag with viscosity and distinguishes interface mobility without inventing surface chemistry', () => {
    const r = 0.0004;
    expect(bubbleTerminalSpeed(r, 1000, 0.01)).toBeLessThan(bubbleTerminalSpeed(r, 1000, 0.001));
    expect(bubbleTerminalSpeed(r, 1000, 0.001, 'mobile')).toBeGreaterThan(bubbleTerminalSpeed(r, 1000, 0.001, 'immobile'));
    expect(bubbleTerminalSpeed(r, 1000, 0.001, 'immobile', 1000)).toBe(0);
  });
  it('retains liquid added mass and starts at 2g in the negligible gas-density limit', () => {
    const r = 0.0005, dt = 1e-9;
    expect(bubbleResponseTime(r, 1000, 0.001, 0)).toBeGreaterThan(0);
    const step = advanceBubbleMotion([0, 0, 0], [0, 0, 0], [0, 0, 0], r, 1000, 0.001, dt);
    expect(step.velocity[1] / dt).toBeCloseTo(2 * 9.80665, 4);
    expect(step.position[1] / (dt * dt)).toBeCloseTo(9.80665, 3);
  });
  it('approaches terminal speed instead of accelerating without bound and integrates position analytically', () => {
    const r = 0.0005, terminal = bubbleTerminalSpeed(r, 1000, 0.001);
    const step = advanceBubbleMotion([0, 0, 0], [0, 0, 0], [0, 0, 0], r, 1000, 0.001, 10);
    expect(step.velocity[1]).toBeCloseTo(terminal, 12);
    expect(step.position[1]).toBeLessThan(terminal * 10);
    expect(step.position[1]).toBeGreaterThan(terminal * 9.9);
    const moving = advanceBubbleMotion([0, 0, 0], [0, terminal, 0], [0, 0, 0], r, 1000, 0.001, 10);
    expect(moving.position[1]).toBeCloseTo(terminal * 10, 12);
  });
  it('couples all carrier components consistently under uniform fluid translation', () => {
    const offset: [number, number, number] = [0.1, 0.02, -0.03], dt = 0.1;
    const a = advanceBubbleMotion([0, 0, 0], [0, 0, 0], [0, 0, 0], 0.0005, 1000, 0.001, dt);
    const b = advanceBubbleMotion([0, 0, 0], offset, offset, 0.0005, 1000, 0.001, dt);
    for (let i = 0; i < 3; i++) {
      expect(b.position[i] - a.position[i]).toBeCloseTo(offset[i] * dt, 12);
      expect(b.velocity[i] - a.velocity[i]).toBeCloseTo(offset[i], 12);
    }
  });
  it.each([0, -1, NaN, Infinity])('does not integrate invalid time %s', dt => {
    const p: [number, number, number] = [1, 2, 3], v: [number, number, number] = [0.1, 0.2, 0.3];
    const step = advanceBubbleMotion(p, v, [0, 0, 0], 0.0005, 1000, 0.001, dt);
    expect(step.position).toEqual(p); expect(step.velocity).toEqual(v);
  });
});

describe('Live bubble integration and vessel-scoped model choice', () => {
  it('uses pressure-volume radius for motion even when containment shrinks the glyph', () => {
    const wide = new BoilingSystem(1, new PRNG(18)), narrow = new BoilingSystem(1, new PRNG(18));
    wide.bubbles = [bubble()]; narrow.bubbles = [bubble()];
    for (let i = 0; i < 2; i++) {
      wide.update(1 / 120, params); narrow.update(1 / 120, { ...params, radius: 0.02 });
    }
    expect(narrow.bubbles[0].radius).toBeLessThan(wide.bubbles[0].radius);
    expect(narrow.bubbles[0].physicalRadius_m).toBeCloseTo(wide.bubbles[0].physicalRadius_m!, 12);
    expect(narrow.bubbles[0].vy).toBeCloseTo(wide.bubbles[0].vy, 12);
    expect(narrow.bubbles[0].y).toBeCloseTo(wide.bubbles[0].y, 12);
  });
  it('makes the cleaner-interface idealization rise faster through the same column', () => {
    const mobile = new BoilingSystem(1), immobile = new BoilingSystem(1);
    mobile.bubbles = [bubble()]; immobile.bubbles = [bubble()];
    for (let i = 0; i < 10; i++) {
      mobile.update(1 / 120, { ...params, interfaceMobility: 'mobile' });
      immobile.update(1 / 120, { ...params, interfaceMobility: 'immobile' });
    }
    expect(mobile.bubbles[0].y).toBeGreaterThan(immobile.bubbles[0].y);
    expect(mobile.bubbles[0].terminalSpeed_m_s!).toBeGreaterThan(immobile.bubbles[0].terminalSpeed_m_s!);
  });
  it('changes only the chosen vessel model and never modifies sample quantities or spawns glassware', () => {
    const v: VesselState = { id: 'a', name: 'a', type: 'beaker', position: [0, 0, 0], rotationY: 0,
      isLocked: false, capacity_ml: 100, mass_g: 50, volume_ml: 50, volume: 0.5, temperature_c: 25,
      ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false, substances: ['H2O'],
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }] };
    useAppStore.setState({ vessels: { a: v, b: { ...v, id: 'b' } }, vesselIds: ['a', 'b'] });
    expect(effects.forVessel('a').setBubbleInterfaceMobility('mobile').ok).toBe(true);
    const state = useAppStore.getState();
    expect(Object.keys(state.vessels)).toEqual(['a', 'b']);
    expect(state.vessels.a.contents).toBe(v.contents);
    expect(state.vessels.a.mass_g).toBe(50);
    expect(state.vessels.b.bubbleInterfaceMobility).toBeUndefined();
    expect(effects.forVessel('a').inspect().state!.bubbleInterfaceMobility).toBe('mobile');
    expect(effects.forVessel('missing').setBubbleInterfaceMobility('mobile').code).toBe('missing_vessel');
    expect(effects.forVessel('a').setBubbleInterfaceMobility('invalid' as 'mobile').code).toBe('invalid_parameter');
  });
});
