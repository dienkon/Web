import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';
import { vesselAgitation } from '../src/science/stirring';

const original = useAppStore.getState();
afterEach(() => { vi.useRealTimers(); useAppStore.setState(original, true); });
function setup() {
  const v = { id: 'stir', volume_ml: 30, stirringIntensity: 0.3, contents: [
    { formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / 18.015 },
  ] } as VesselState;
  useAppStore.setState({ vessels: { stir: v }, stirringVesselId: null, activeTool: 'none', selectedVesselId: 'stir' });
  return v;
}
describe('Inspector stirring applies a bounded pulse, without replaying chemistry', () => {
  it('drives the selected strength and preserves the chemical inventory', () => {
    vi.useFakeTimers(); const v = setup();
    useAppStore.getState().stirVessel(v.id);
    expect(vesselAgitation(v, useAppStore.getState())).toBe(0.3);
    expect(useAppStore.getState().vessels[v.id]).toBe(v);
    vi.advanceTimersByTime(2500);
    expect(vesselAgitation(v, useAppStore.getState())).toBe(0);
  });
  it('restarting the same vessel replaces the old stop deadline', () => {
    vi.useFakeTimers(); const v = setup();
    useAppStore.getState().stirVessel(v.id);
    vi.advanceTimersByTime(2000);
    useAppStore.getState().stirVessel(v.id);
    vi.advanceTimersByTime(600);
    expect(useAppStore.getState().stirringVesselId).toBe(v.id);
    vi.advanceTimersByTime(1900);
    expect(useAppStore.getState().stirringVesselId).toBeNull();
  });
  it('a direct rod selection invalidates an older timed pulse', () => {
    vi.useFakeTimers(); const v = setup();
    useAppStore.getState().stirVessel(v.id);
    vi.advanceTimersByTime(1000);
    useAppStore.getState().setStirringVesselId(v.id);
    vi.advanceTimersByTime(2000);
    expect(useAppStore.getState().stirringVesselId).toBe(v.id);
  });
});
