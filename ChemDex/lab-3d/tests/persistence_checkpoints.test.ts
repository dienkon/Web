import { afterEach, expect, it, vi } from 'vitest';
import { clearHistory, debounceSaveLocalState, getHistoryList, loadPersistedLabState, pushHistorySnapshot } from '../src/store/persistence';
import type { LabMaterialSnapshot, TitrationPoint } from '../src/types/chemistry';

afterEach(() => {
  clearHistory();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('checkpoints even when updates keep resetting the idle timer, then writes the final state', () => {
  vi.useFakeTimers();
  const storage = new Map<string, string>();
  const setItem = vi.fn((key: string, value: string) => { storage.set(key, value); });
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', { setItem, getItem: (key: string) => storage.get(key) ?? null });
  const base: LabMaterialSnapshot = { inFlightPours: [], spills: {}, wasteMass_g: 0, wasteContents: [] };
  for (let i = 1; i <= 10; i++) {
    debounceSaveLocalState({}, {}, { ...base, wasteMass_g: i });
    vi.advanceTimersByTime(500);
  }
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(loadPersistedLabState()?.materials?.wasteMass_g).toBe(10);
  debounceSaveLocalState({}, {}, { ...base, wasteMass_g: 11 });
  vi.advanceTimersByTime(1000);
  expect(setItem).toHaveBeenCalledTimes(2);
  expect(loadPersistedLabState()?.materials?.wasteMass_g).toBe(11);
  vi.advanceTimersByTime(6000);
  expect(setItem).toHaveBeenCalledTimes(2);
});

it('retains an immutable curve by reference without sharing mutable inventory', () => {
  const point: TitrationPoint = { volumeAdded_ml: .05, ph: 7, color: '#fff', temperature_c: 25, timestamp: 0 };
  const observed = [point] as const;
  const contents = [{ formula: 'H2O', mass_g: 1, moles: 1 / 18.015 }];
  pushHistorySnapshot('TITRATE', {}, {}, '', '', {
    inFlightPours: [], spills: {}, wasteMass_g: 1, wasteContents: contents, titrationHistory: observed,
  });
  const saved = getHistoryList()[0].snapshot.materials!;
  expect(saved.titrationHistory).toBe(observed);
  contents[0].mass_g = 0;
  expect(saved.wasteContents[0].mass_g).toBe(1);
});
