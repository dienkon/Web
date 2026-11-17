import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';
import { planSodiumStockDose } from '../src/handling/sodiumStockDose';
import { planSolidStockDose } from '../src/handling/solidStockDose';

const initial = useAppStore.getState();
afterEach(() => useAppStore.setState(initial, true));
const sample = (type: VesselState['type'] = 'beaker', patch: Partial<VesselState> = {}): VesselState => ({
  id: 'receiver', name: 'Receiver', type, capacity_ml: 100, position: [0, -.135, 0], rotationY: 0, isLocked: false,
  volume_ml: 0, volume: 0, mass_g: 0, contents: [], substances: [], temperature_c: 25, ph: 7,
  hasGas: false, hasPrecipitate: false, isBoiling: false, ...patch,
});
function mount(vessel: VesselState) {
  useAppStore.setState({ vessels: { [vessel.id]: vessel }, vesselIds: [vessel.id], burners: {}, activeKinetics: {},
    pendingReactions: {}, pouringChemical: null, stockDosePending: false, instrumentRinse: null,
    draggingVesselId: null, moveMode: false, isSimulationPaused: false, isMixing: false, isPouring: false,
    spatulaState: { chemical: 'Fe', mass_g: .5, color: '#777' }, mixError: null });
}

describe('Stock dose preflight rejects impossible paths before reserving or adding matter', () => {
  it.each(['tongs', 'test_tube_rack', 'hot_plate', 'retort_stand', 'retort_clamp', 'stopper', 'condenser'] as const)(
    'does not dose into apparatus %s despite its positive display capacity', async type => {
      const v = sample(type); mount(v);
      initial.triggerPour('H2O', v.id, .12);
      expect(useAppStore.getState().pouringChemical).toBeNull();
      expect(useAppStore.getState().mixError).toContain('khoang nhận mẫu');
      expect(initial.beginSpatulaDose(v.id)).toBe(false);
      expect(useAppStore.getState().spatulaState.mass_g).toBe(.5);
      await initial.mixSubstances(v.id, 'H2O', .12);
      expect(useAppStore.getState().vessels[v.id]).toBe(v);
    });

  it('keeps an oversized whole sodium piece in the source without shrinking its geometry to fit', () => {
    const v = sample('test_tube', { capacity_ml: 10 }); mount(v);
    expect(planSodiumStockDose(v, 2)).toBeNull();
    initial.triggerPour('Na', v.id, 2);
    expect(useAppStore.getState().pouringChemical).toBeNull();
    expect(useAppStore.getState().mixError).toContain('Mẩu natri');
    expect(useAppStore.getState().vessels[v.id]).toBe(v);
    expect(planSodiumStockDose(sample(), .1)?.flights[0].mass_g).toBe(.1);
  });

  it('keeps the finite spatula sample until its true grain geometry fits the opening', () => {
    const v = sample('test_tube', { capacity_ml: 10 }); mount(v);
    useAppStore.setState({ spatulaState: { chemical: 'Fe (nail)', mass_g: 20, color: '#777' } });
    expect(planSolidStockDose(v, 'Fe (nail)', 20)).toBeNull();
    expect(initial.beginSpatulaDose(v.id)).toBe(false);
    expect(useAppStore.getState().spatulaState.mass_g).toBe(20);
    expect(useAppStore.getState().pouringChemical).toBeNull();
    useAppStore.setState({ vessels: { [v.id]: { ...v, type: 'beaker' } }, spatulaState: { chemical: 'Fe', mass_g: .5, color: '#777' } });
    expect(initial.beginSpatulaDose(v.id)).toBe(true);
    expect(useAppStore.getState().spatulaState.mass_g).toBe(0);
    initial.clearPour();
  });

  it('allows a real tilted liquid path while refusing upside-down mouths and tilted solid insertion', () => {
    const tilted = sample('flask', { rotationZ: .5 }); mount(tilted);
    initial.triggerPour('H2O', tilted.id, .12);
    expect(useAppStore.getState().pouringChemical?.amount).toBe(.12);
    initial.clearPour();
    initial.triggerPour('Fe', tilted.id, .5);
    expect(useAppStore.getState().pouringChemical).toBeNull();
    expect(useAppStore.getState().mixError).toContain('thẳng đứng');
    const inverted = { ...tilted, rotationZ: Math.PI }; mount(inverted);
    initial.triggerPour('H2O', inverted.id, .12);
    expect(useAppStore.getState().pouringChemical).toBeNull();
    expect(useAppStore.getState().vessels[inverted.id]).toBe(inverted);
  });
});
