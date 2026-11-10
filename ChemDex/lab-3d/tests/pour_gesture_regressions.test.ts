import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { PourController } from '../src/pour/controller/PourController';
import type { VesselState } from '../src/types/chemistry';

const initial = useAppStore.getState();
afterEach(() => {
  useAppStore.setState({ ...initial, pourEpoch: useAppStore.getState().pourEpoch + 1 }, true);
  PourController.getSession();
});
function setup(type = 'beaker', volume = 50) {
  const vessel = (id: string, ml: number): VesselState => ({
    // reagent_bottle is a supported persisted physics profile, outside the picker union.
    ...initial.vessels.beaker_1, id, name: id, type: type as VesselState['type'], capacity_ml: 100,
    position: [id === 'source' ? -2 : 2, -0.135, 0], volume_ml: ml, volume: ml / 100,
    mass_g: ml, temperature_c: 25, hasGas: false, hasPrecipitate: false,
    substances: ml ? ['H2O'] : [], contents: ml ? [{ formula: 'H2O', phase: 'l', mass_g: ml, moles: ml / 18.01528 }] : [],
  });
  useAppStore.setState({ vessels: { source: vessel('source', volume), target: vessel('target', 0) },
    vesselIds: ['source', 'target'], inFlightPours: [], spills: {}, burners: {}, activeKinetics: {},
    pendingReactions: {}, dissolvingSubstances: {}, isPouring: false, isSimulationPaused: false,
    pourEpoch: useAppStore.getState().pourEpoch + 1 });
  PourController.getSession();
}
const tick = (frames: number) => { for (let i = 0; i < frames; i++) PourController.tick(1 / 60); };

describe('Vessel-to-vessel gesture and automatic dosing', () => {
  it('does not replace an explicit tilt while lifting', () => {
    setup();
    PourController.beginPour({ mode: 'ASSIST', sourceId: 'source', targetId: 'target' });
    PourController.setTilt(0.3);
    tick(90);
    expect(PourController.getSession()?.targetTilt).toBe(0.3);
    expect(useAppStore.getState().vessels.source.volume_ml).toBe(50);
    PourController.setTilt(NaN);
    expect(PourController.getSession()?.targetTilt).toBe(0.3);
  });
  it('stops before lift completion without restarting and uses no wall-clock timeout', () => {
    setup();
    PourController.beginPour({ mode: 'ASSIST', sourceId: 'source', targetId: 'target' });
    tick(3); PourController.stopPour(); tick(300);
    expect(PourController.getSession()).toBeNull();
    expect(useAppStore.getState().vessels.source.volume_ml).toBe(50);
    expect(useAppStore.getState().vessels.target.volume_ml).toBe(0);
  });
  it('rejects self transfer and an empty source', () => {
    setup();
    PourController.beginPour({ mode: 'ASSIST', sourceId: 'source', targetId: 'source' });
    expect(PourController.getSession()).toBeNull();
    setup('beaker', 0);
    PourController.beginPour({ mode: 'ASSIST', sourceId: 'source', targetId: 'target' });
    expect(PourController.getSession()).toBeNull();
  });
  it.each(['beaker', 'flask', 'cylinder', 'test_tube', 'reagent_bottle'] as const)('finishes a finite low-fill %s dose as the source drains', async type => {
    setup(type, 15);
    PourController.beginPour({ mode: 'ASSIST', sourceId: 'source', targetId: 'target', requestedVolume_ml: 12 });
    for (let i = 0; i < 3600 && PourController.getSession(); i++) PourController.tick(1 / 60);
    await Promise.resolve();
    const s = useAppStore.getState();
    expect(PourController.getSession()).toBeNull();
    expect(s.vessels.target.volume_ml).toBeCloseTo(12, 7);
    expect(s.vessels.source.volume_ml).toBeCloseTo(3, 7);
    expect(s.inFlightPours).toHaveLength(0);
    expect(Object.values(s.spills).reduce((sum, p) => sum + p.volume_ml, 0)).toBeCloseTo(0, 8);
  });
});
