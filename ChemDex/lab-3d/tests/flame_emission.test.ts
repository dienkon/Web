import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFlameEmission, sampleFlameEmission, flameEmissionExpired, FLAME_TEST_COLORS } from '../src/engine/flameEmission';
import { useAppStore } from '../src/store/useAppStore';
import { vfxBus } from '../src/vfx/bus';
import type { BurnerState } from '../src/types/chemistry';

const lamp = (id: string, patch: Partial<BurnerState> = {}): BurnerState => ({
  id, isOn: true, intensity: 3, position: [0, 0, 0], fuelLevel_ml: 10, ...patch,
});
const before = useAppStore.getState();
afterEach(() => { vi.restoreAllMocks(); useAppStore.setState(before); });
function setup() {
  useAppStore.setState({ burners: { a: lamp('a'), b: lamp('b') }, burnerIds: ['a', 'b'], vessels: {},
    activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false, timeScale: 1 });
}

describe('Targeted finite flame color previews', () => {
  it('keeps the six qualitative observed colors distinct without invented wavelengths', () => {
    expect(Object.keys(FLAME_TEST_COLORS)).toHaveLength(6);
    for (const element of ['Li', 'Na', 'K', 'Ca', 'Cu', 'Ba']) {
      expect(createFlameEmission(element, 0)?.color).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(FLAME_TEST_COLORS.K.observation).toBe('Tím nhạt');
    expect(FLAME_TEST_COLORS.Cu.observation).toBe('Xanh lục–lam');
  });
  it('ends exactly at its deadline even after a long frame or late renderer mount', () => {
    const emission = createFlameEmission('Na', 1000)!;
    expect(sampleFlameEmission(emission, 999)).toBe(0);
    expect(sampleFlameEmission(emission, 1000)).toBe(0);
    expect(sampleFlameEmission(emission, 1500)).toBe(1);
    expect(sampleFlameEmission(emission, 8200)).toBeGreaterThan(0);
    expect(sampleFlameEmission(emission, 8500)).toBe(0);
    expect(sampleFlameEmission(emission, 1e9)).toBe(0);
    expect(flameEmissionExpired(emission, 8500)).toBe(true);
  });
  it('has the same envelope at shared times regardless of 30, 60 or 120 fps', () => {
    const emission = createFlameEmission('K', 0)!;
    for (const fps of [30, 60, 120]) {
      let sample = 0;
      for (let frame = 0; frame <= fps * 7; frame++) sample = sampleFlameEmission(emission, frame * 1000 / fps);
      expect(sample).toBeCloseTo(sampleFlameEmission(emission, 7000), 12);
    }
  });
  it('rejects unsupported species and invalid durations instead of creating endless emission', () => {
    for (const element of ['Fe', '', 'constructor', 'toString']) expect(createFlameEmission(element, 0)).toBeNull();
    for (const duration of [NaN, Infinity, -1, 0, 31]) expect(createFlameEmission('Na', 0, duration)).toBeNull();
    expect(createFlameEmission('Na', -1)).toBeNull();
  });
  it('records a lamp-specific sample before any flame component subscribes', () => {
    setup();
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    let eventTarget: string | undefined;
    const off = vfxBus.on('flame:test', event => { eventTarget = event.burnerId; });
    try {
      expect(useAppStore.getState().startFlameTest('a', 'Na')).toBe(true);
      const state = useAppStore.getState();
      expect(state.burners.a.flameEmission?.element).toBe('Na');
      expect(state.burners.b.flameEmission).toBeUndefined();
      expect(eventTarget).toBe('a');
      expect(sampleFlameEmission(state.burners.a.flameEmission, 1500)).toBe(1);
      expect(state.burners.a.fuelLevel_ml).toBe(10);
      expect(state.vessels).toEqual({});
    } finally { off(); }
  });
  it('does not start on an unknown, unlit, empty or nonflammable lamp', () => {
    for (const patch of [{ isOn: false }, { fuelLevel_ml: 0 }, { ethanolVolumeFraction: 0 }]) {
      setup();
      useAppStore.setState({ burners: { a: lamp('a', patch) } });
      expect(useAppStore.getState().startFlameTest('a', 'Na')).toBe(false);
      expect(useAppStore.getState().burners.a.flameEmission).toBeUndefined();
    }
    expect(useAppStore.getState().startFlameTest('missing', 'Na')).toBe(false);
  });
  it('changes wick strength without restarting the sample deadline', () => {
    setup();
    useAppStore.getState().startFlameTest('a', 'Cu');
    const emission = useAppStore.getState().burners.a.flameEmission;
    useAppStore.getState().setBurnerIntensity('a', 5);
    expect(useAppStore.getState().burners.a.flameEmission).toBe(emission);
  });
  it('extinguishing and relighting cannot replay the old sample', () => {
    setup();
    useAppStore.getState().startFlameTest('a', 'K');
    useAppStore.getState().toggleBurner('a');
    expect(useAppStore.getState().burners.a.flameEmission).toBeUndefined();
    useAppStore.getState().toggleBurner('a');
    expect(useAppStore.getState().burners.a.flameEmission).toBeUndefined();
  });
  it('expires state in the real store and clears it on fuel exhaustion', () => {
    setup();
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1000);
    useAppStore.getState().startFlameTest('a', 'Na', 1);
    clock.mockReturnValue(2000);
    useAppStore.getState().tickSimulation(0.1);
    expect(useAppStore.getState().burners.a.flameEmission).toBeUndefined();
    useAppStore.getState().startFlameTest('b', 'Cu');
    useAppStore.setState(s => ({ burners: { ...s.burners, b: { ...s.burners.b, fuelLevel_ml: 0.00001 } } }));
    useAppStore.getState().tickSimulation(0.1);
    expect(useAppStore.getState().burners.b.isOn).toBe(false);
    expect(useAppStore.getState().burners.b.flameEmission).toBeUndefined();
  });
});
