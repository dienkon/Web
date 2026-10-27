import { afterEach, describe, expect, it, vi } from 'vitest';
import { bubbleNaturalFrequencyHz, canRenderBubbleFrequency } from '../src/science/bubbleAcoustics';
import { labSound } from '../src/utils/audio';
import { BoilingSystem, type BoilingSimulationParams } from '../src/simulation/effects/BoilingSystem';
import type { PhysicalBubble } from '../src/simulation/core/SimulationTypes';
import { PRNG } from '../src/core/rng';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';

afterEach(() => { vi.restoreAllMocks(); });
const params: BoilingSimulationParams = { radius: 0.6, liquidBottomY: 0, surfaceY: 0.06,
  temp_c: 25, boilingPoint_c: 100, heatPower_W: 0, viscosity_mPa_s: 1,
  boilingStage: 'COLD_STABLE', boilingIntensity: 0, reactionGasRate: 60 };
const surfacePacket = (): PhysicalBubble => ({ id: 1, source: 'reaction', x: 0, y: 0.059, z: 0,
  radius: 0.01, baseRadius: 0.01, gasPV_scene3_Pa: 102000 * 0.01 ** 3,
  vx: 0, vy: 0, vz: 0, buoyancy: 1, growthRate: 0, wobblePhase: 0, wobbleSpeed: 0,
  wobbleAmp: 0, aspectRatio: 1, life: 0, maxLife: 5, opacity: 1, temperature: 25,
  isPopping: false, popProgress: 0, merged: false });

describe('Gas-bubble acoustic model and live events', () => {
  it('recovers 3.283 kHz for a 1 mm air-like bubble and scales with radius, pressure and density', () => {
    const f = bubbleNaturalFrequencyHz(0.001);
    expect(f).toBeCloseTo(3283.2434, 3);
    expect(bubbleNaturalFrequencyHz(0.002)).toBeCloseTo(f / 2, 10);
    expect(bubbleNaturalFrequencyHz(0.001, { pressure_Pa: 405300 })).toBeCloseTo(f * 2, 10);
    expect(bubbleNaturalFrequencyHz(0.001, { density_kg_m3: 4000 })).toBeCloseTo(f / 2, 10);
  });
  it('adds the single-interface restoring stiffness, distinguishing isothermal and adiabatic assumptions', () => {
    const r = 1e-5, p = 101325, sigma = 0.072;
    const isothermal = bubbleNaturalFrequencyHz(r, { polytropicExponent: 1, surfaceTension_N_m: sigma });
    expect((2 * Math.PI * r * isothermal) ** 2 * 1000).toBeCloseTo(3 * p + 4 * sigma / r, 7);
    expect(bubbleNaturalFrequencyHz(r, { surfaceTension_N_m: sigma })).toBeGreaterThan(isothermal);
    expect(isothermal).toBeGreaterThan(bubbleNaturalFrequencyHz(r, { polytropicExponent: 1 }));
  });
  it('does not remap ultrasound or invalid sizes into audible large-bubble tones', () => {
    expect(canRenderBubbleFrequency(bubbleNaturalFrequencyHz(0.00001), 48000)).toBe(false);
    expect(canRenderBubbleFrequency(19000, 32000)).toBe(false);
    expect(canRenderBubbleFrequency(19000, 48000)).toBe(true);
    for (const radius of [0, -1, NaN, Infinity]) expect(bubbleNaturalFrequencyHz(radius)).toBeNaN();
    expect(bubbleNaturalFrequencyHz(0.001, { pressure_Pa: -1 })).toBeNaN();
    expect(bubbleNaturalFrequencyHz(0.001, { polytropicExponent: 0.5 })).toBeNaN();
  });
  it.each([0.2, 40])('renders a %s mm bubble at its frequency without clamping size or inventing a chirp', radius_mm => {
    const oscillators: { frequency: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> } }[] = [];
    const createOscillator = vi.fn(() => {
      const node = { frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(node); return node;
    });
    const fake = { state: 'running', sampleRate: 48000, currentTime: 0, destination: {}, createOscillator,
      createGain: () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }) };
    const internal = labSound as unknown as { ctx: unknown };
    const original = internal.ctx; internal.ctx = fake;
    try {
      labSound.playMinnaertBubble(radius_mm, false);
      expect(oscillators).toHaveLength(1);
      expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(bubbleNaturalFrequencyHz(radius_mm * 0.001), 0);
      expect(oscillators[0].frequency.exponentialRampToValueAtTime).not.toHaveBeenCalled();
      createOscillator.mockClear();
      labSound.playMinnaertBubble(0.01);
      expect(createOscillator).not.toHaveBeenCalled();
    } finally { internal.ctx = original; }
  });
  it('sends mechanical size and vessel medium before glyph containment, including the first event after reset', () => {
    const play = vi.spyOn(labSound, 'playMinnaertBubble').mockImplementation(() => {});
    const system = new BoilingSystem(4);
    const fire = () => {
      system.bubbles = [surfacePacket()];
      system.update(1 / 120, { ...params, reactionGasRate: 0, pressure_atm: 0.8, liquidDensity_kg_m3: 900 });
    };
    fire();
    expect(play).toHaveBeenCalledTimes(1);
    const bubble = system.bubbles[0];
    expect(play.mock.calls[0][0]).toBeCloseTo(bubble.physicalRadius_m! * 1000, 10);
    expect(play.mock.calls[0][0]).toBeLessThan(0.8);
    expect(play.mock.calls[0][3]).toMatchObject({ pressure_Pa: 0.8 * 101325, density_kg_m3: 900 });
    expect(bubble.physicalRadius_m).toBeGreaterThanOrEqual(bubble.radius * METERS_PER_SCENE_UNIT);
    system.reset(); fire(); expect(play).toHaveBeenCalledTimes(2);
  });
  it('keeps event sequence identical at 30/60/120 Hz regardless of the wall clock', () => {
    const play = vi.spyOn(labSound, 'playMinnaertBubble').mockImplementation(() => {});
    const run = (fps: number, wallTime: number) => {
      vi.spyOn(performance, 'now').mockReturnValue(wallTime);
      play.mockClear();
      const system = new BoilingSystem(90, new PRNG(42));
      for (let i = 0; i < fps * 2; i++) system.update(1 / fps, params);
      return structuredClone(play.mock.calls);
    };
    const at30 = run(30, 0);
    expect(at30.length).toBeGreaterThan(2);
    expect(at30.length).toBeLessThanOrEqual(45);
    expect(run(60, 1e8)).toEqual(at30);
    expect(run(120, 0)).toEqual(at30);
  });
  it('does not assign an air resonance to vapor or a mixed phase-transfer bubble', () => {
    const play = vi.spyOn(labSound, 'playMinnaertBubble').mockImplementation(() => {});
    for (const source of ['vapor', 'mixed'] as const) {
      const system = new BoilingSystem(4), b = surfacePacket();
      b.source = source; b.temperature = 100;
      if (source === 'mixed') {
        b.vaporPV_scene3_Pa = b.gasPV_scene3_Pa! / 2;
        b.noncondensablePV_scene3_Pa = b.gasPV_scene3_Pa! / 2;
      }
      system.bubbles = [b];
      system.update(1 / 120, { ...params, temp_c: 100, reactionGasRate: 0 });
      expect(system.bubbles[0].isPopping).toBe(true);
    }
    expect(play).not.toHaveBeenCalled();
  });
});
