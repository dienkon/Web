import { expect, it, vi } from 'vitest';
import { clearHistory, getHistoryList, pushHistorySnapshot } from '../src/store/persistence';

it('does not append a delayed startup snapshot after the user has already acted', async () => {
  clearHistory();
  const nativeTimeout = globalThis.setTimeout;
  const startupCallbacks: (() => void)[] = [];
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void, delay?: number, ...args: unknown[]) => {
    if (delay === 100) { startupCallbacks.push(callback); return nativeTimeout(() => {}, 0); }
    return nativeTimeout(callback, delay, ...args);
  }) as typeof setTimeout);
  try {
    const { useAppStore } = await import('../src/store/useAppStore');
    const state = useAppStore.getState();
    clearHistory();
    pushHistorySnapshot('POUR', state.vessels, {}, 'before', 'trước');
    pushHistorySnapshot('POUR', state.vessels, {}, 'after', 'sau');
    expect(startupCallbacks.length).toBeGreaterThan(0);
    for (const callback of startupCallbacks) callback();
    expect(getHistoryList().map(s => s.description_en)).toEqual(['before', 'after']);
  } finally { vi.restoreAllMocks(); clearHistory(); }
}, 15000);
