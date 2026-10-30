import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { useAppStore } from '../src/store/useAppStore';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';
import type { VesselState } from '../src/types/chemistry';

const harness = vi.hoisted(() => ({ frame: null as null | ((state: unknown, dt: number) => void),
  cleanups: [] as (() => void)[] }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const hooks = {
    memo: (fn: unknown) => fn,
    useRef: (current: unknown) => ({ current }), useMemo: (factory: () => unknown) => factory(),
    useCallback: (fn: unknown) => fn, useDebugValue: () => {},
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
    useEffect: (effect: () => void | (() => void)) => { const cleanup = effect(); if (cleanup) harness.cleanups.push(cleanup); },
  };
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});
vi.mock('@react-three/fiber', () => ({ useFrame: (frame: typeof harness.frame) => { harness.frame = frame; } }));
// Zustand is externalized and imports React outside Vitest's module mocks.
// Keep its real vanilla state/actions; replace only the React subscription hook.
vi.mock('../src/store/useAppStore', async () => {
  const actual = await vi.importActual<typeof import('../src/store/useAppStore')>('../src/store/useAppStore');
  const store = actual.useAppStore;
  return { ...actual, useAppStore: Object.assign((selector: (state: ReturnType<typeof store.getState>) => unknown) => selector(store.getState()), store) };
});
vi.mock('../src/vfx/quality', async () => {
  const actual = await vi.importActual<typeof import('../src/vfx/quality')>('../src/vfx/quality');
  const store = actual.useQualityStore;
  return { ...actual, useQualityStore: Object.assign((selector: (state: ReturnType<typeof store.getState>) => unknown) => selector(store.getState()), store) };
});
vi.mock('../src/vfx/textures', () => ({
  getBubbleSpriteTexture: () => new THREE.Texture(), getSoftParticleTexture: () => new THREE.Texture(),
}));
import { PhysicalSimulationRenderer } from '../src/simulation/render/PhysicalSimulationRenderer';
import { effects } from '../src/vfx/vesselEffects';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';

const original = useAppStore.getState();
const sample = (patch: Partial<VesselState> = {}): VesselState => ({
  id: 'a', name: 'a', type: 'beaker', capacity_ml: 250, position: [0, 1.3, 0],
  rotationY: 0, isLocked: false, mass_g: 100, volume_ml: 100, volume: 0.4,
  temperature_c: 25, contents: [{ formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 }],
  substances: ['H2O'], ph: 7, hasPrecipitate: false, hasGas: false, isBoiling: false, ...patch,
});
function mount(v = sample()) {
  useAppStore.setState({ vessels: { a: v }, vesselIds: ['a'], burners: { lamp: {
    id: 'lamp', position: [0, 0, 0], isOn: true, intensity: 5, tempOutput_c: 9999,
    fuelLevel_ml: 0, maxFuel_ml: 150 } }, activeKinetics: {}, pendingReactions: {},
    isSimulationPaused: false, timeScale: 1 });
  (PhysicalSimulationRenderer as unknown as (props: unknown) => unknown)({ vesselId: 'a',
    baseY: 0, mouthY: 1, radius: 0.4, mouthRadius: 0.4 });
  const manager = SimulationEngine.findManager('a')!;
  return vi.spyOn(manager, 'step');
}
afterEach(() => {
  harness.cleanups.splice(0).forEach(cleanup => cleanup()); harness.frame = null;
  SimulationEngine.clearAll(); useAppStore.setState(original, true); vi.restoreAllMocks();
});

describe('Renderer reads the accepted thermal ledger on its vessel', () => {
  it('uses the live metered input even when lamp flags and flame temperature disagree', () => {
    const spy = mount(sample({ thermalHeatingPower_W: 120, thermalHeatingEnergy_J: 50 }));
    const before = JSON.stringify(useAppStore.getState().vessels.a);
    harness.frame!({}, 1 / 60);
    expect(spy.mock.calls[0][2]).toMatchObject({ heatPower_W: 120, thermalStateAuthoritative: true });
    expect(JSON.stringify(useAppStore.getState().vessels.a)).toBe(before);
    useAppStore.getState().setVesselState('a', { thermalHeatingPower_W: 0 });
    harness.frame!({}, 1 / 60);
    expect(spy.mock.calls[1][2]).toMatchObject({ heatPower_W: 0, thermalStateAuthoritative: true });
    useAppStore.setState({ isSimulationPaused: true }); harness.frame!({}, 1 / 60);
    expect(spy).toHaveBeenCalledTimes(2);
  });
  it('does not invent input watts for a legacy state that has no measured heater packet', () => {
    const spy = mount(); harness.frame!({}, 1 / 60);
    expect(spy.mock.calls[0][2]).toMatchObject({ heatPower_W: 0, thermalStateAuthoritative: true });
  });
  it('stirs only the selected vessel while the stirring rod is active', () => {
    const spy = mount();
    useAppStore.setState({ activeTool: 'stirring_rod', selectedVesselId: 'a' });
    harness.frame!({},1/60);
    expect(spy.mock.calls[0][2]?.agitation).toBe(0.65);
    useAppStore.setState({ selectedVesselId: 'another-vessel' });
    harness.frame!({},1/60);
    expect(spy.mock.calls[1][2]?.agitation).toBe(0);
    useAppStore.setState({ activeTool: 'none', stirringVesselId: 'a' });
    useAppStore.getState().setVesselState('a', { stirringIntensity: 0.3 });
    harness.frame!({}, 1 / 60);
    expect(spy.mock.calls[2][2]?.agitation).toBe(0.3);
    expect(useAppStore.getState().vesselIds).toEqual(['a']);
  });
  it('uses a freshly addressed effect environment before the next thermal store tick', () => {
    mount(sample({ environment: DEFAULT_LAB_ENVIRONMENT }));
    const manager = SimulationEngine.findManager('a')!;
    const mist = vi.spyOn(manager.evaporationSystem, 'update');
    expect(effects.forVessel('a').setEnvironment({ temperature_c: 40, airSpeed_m_s: 0.8,
      relativeHumidity: 0.9 }).ok).toBe(true);
    const snapshot = JSON.stringify(useAppStore.getState().vessels.a);
    harness.frame!({}, 1 / 60);
    expect(mist.mock.calls[0][1]).toMatchObject({ ambient_c: 40, airflowVector: [0.8, 0, 0], relativeHumidity: 0.9 });
    expect(JSON.stringify(useAppStore.getState().vessels.a)).toBe(snapshot);
    expect(useAppStore.getState().vesselIds).toEqual(['a']);
    expect(effects.forVessel('a').setEnvironment({ temperature_c: 15, airSpeed_m_s: 0 }).ok).toBe(true);
    harness.frame!({}, 1 / 60);
    expect(mist.mock.calls[1][1]).toMatchObject({ ambient_c: 15, airflowVector: [0, 0, 0] });
  });
});
