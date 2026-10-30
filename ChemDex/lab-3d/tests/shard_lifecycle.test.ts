import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShardManager, shardManager } from '../src/damage/Shards';
import { useAppStore } from '../src/store/useAppStore';
import { clearHistory, loadPersistedLabState, pushHistorySnapshot } from '../src/store/persistence';
import { LAB_PHYSICS } from '../src/engine/interactionEngine';
import { labSound } from '../src/utils/audio';
import type { VesselState } from '../src/types/chemistry';

const baseline = useAppStore.getState();
const vessel = (id: string, x = 0): VesselState => ({ id, name: id, type: 'beaker', position: [x, -0.135, 0],
  capacity_ml: 100, volume_ml: 0, volume: 0, rotationY: 0, isLocked: false, mass_g: 0, contents: [], substances: [], temperature_c: 25,
  ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false });
beforeEach(() => {
  shardManager.restoreSnapshot();
  useAppStore.setState({ vessels: { a: vessel('a'), b: vessel('b', 8) }, vesselIds: ['a', 'b'],
    spills: {}, wasteMass_g: 0, wasteContents: [], activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {} });
  vi.spyOn(labSound, 'playGlassShatter').mockImplementation(() => {});
  vi.spyOn(labSound, 'playGlassClink').mockImplementation(() => {});
  vi.spyOn(labSound, 'playSpongeWipe').mockImplementation(() => {});
});
afterEach(() => {
  shardManager.restoreSnapshot(); useAppStore.setState(baseline, true);
  clearHistory(); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals();
});

describe('One world-space debris lifecycle', () => {
  it('keeps glass independent of local and global liquid wiping', () => {
    shardManager.spawnShatterShards('a', [0, 0, 0]); shardManager.spawnShatterShards('b', [8, 0, 0]);
    shardManager.update(1);
    const before = shardManager.snapshot();
    useAppStore.setState({ spills: { wet: { id: 'wet', position: [0, LAB_PHYSICS.TABLE_SURFACE_Y, 0],
      substances: ['H2O'], contents: [{ formula: 'H2O', phase: 'l', mass_g: 1, moles: 1 / 18.015, volume_ml: 1 }],
      volume_ml: 1, mass_g: 1, radius: 0.1, color: '#fff', isHazard: false, timestamp: 0 } } });
    useAppStore.getState().wipeSpillAt([0, LAB_PHYSICS.TABLE_SURFACE_Y, 0], 0.02);
    expect(useAppStore.getState().wasteMass_g).toBeGreaterThan(0);
    expect(shardManager.snapshot()).toEqual(before);
    useAppStore.getState().cleanSpills(); expect(useAppStore.getState().spills).toEqual({});
    expect(shardManager.snapshot()).toEqual(before);
  });
  it('collects only landed glass belonging to the explicitly targeted vessel', () => {
    shardManager.spawnShatterShards('a', [0, 0, 0]); shardManager.spawnShatterShards('b', [8, 0, 0]);
    expect(useAppStore.getState().cleanGlassDebris('a')).toBe(0);
    shardManager.update(1); const other = structuredClone(shardManager.getShards().filter(s => s.sourceVesselId === 'b'));
    const inventory = useAppStore.getState();
    expect(useAppStore.getState().cleanGlassDebris('a')).toBe(20);
    expect(shardManager.getShards()).toEqual(other);
    expect(useAppStore.getState().wasteMass_g).toBe(inventory.wasteMass_g);
    expect(useAppStore.getState().vessels).toBe(inventory.vessels);
    expect(useAppStore.getState().cleanGlassDebris('a')).toBe(0);
    expect(useAppStore.getState().cleanGlassDebris()).toBe(20);
  });
  it('leaves old fragments at their original world positions when the source is replaced and moved', () => {
    const s = useAppStore.getState(); s.shatterVessel('a', 'impact'); shardManager.update(1);
    const original = structuredClone(shardManager.getShards());
    s.replaceShatteredVessel('a'); useAppStore.getState().setVesselState('a', { position: [5, -0.135, 3] });
    expect(shardManager.getShards()).toEqual(original);
    useAppStore.getState().shatterVessel('a', 'impact'); shardManager.update(1);
    const all = shardManager.getShards();
    expect(all).toHaveLength(40); expect(new Set(all.map(s => s.id)).size).toBe(40);
    expect(all.slice(0, 20)).toEqual(original);
    expect(useAppStore.getState().cleanGlassDebris('a')).toBe(40);
    expect(Object.keys(useAppStore.getState().vessels)).toEqual(['a', 'b']);
  });
  it('persists the burst in the same save as its shattered source, and preserves an explicitly cleared pool', () => {
    vi.useFakeTimers(); const values = new Map<string, string>();
    vi.stubGlobal('window', {}); vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value) });
    useAppStore.getState().shatterVessel('a', 'impact'); vi.advanceTimersByTime(1001);
    const saved = loadPersistedLabState()!;
    expect(saved.vessels.a.isShattered).toBe(true); expect(saved.materials!.glassDebris!.shards).toHaveLength(20);
    const manager = new ShardManager(); manager.restoreLabSnapshot(saved.materials!.glassDebris, saved.vessels);
    expect(manager.getShards()).toEqual(saved.materials!.glassDebris!.shards);
    shardManager.update(1); useAppStore.getState().cleanGlassDebris('a'); vi.advanceTimersByTime(1001);
    const cleared = loadPersistedLabState()!;
    manager.restoreLabSnapshot(cleared.materials!.glassDebris, cleared.vessels);
    expect(cleared.vessels.a.isShattered).toBe(true); expect(manager.getShards()).toEqual([]);
  });
  it('takes detached snapshots and rejects malformed or duplicate saved glyphs', () => {
    const manager = new ShardManager(); manager.spawnShatterShards('a', [0, 0, 0], '#fff', 1);
    const snapshot = manager.snapshot(), before = structuredClone(snapshot); manager.update(1);
    expect(snapshot).toEqual(before);
    const restored = new ShardManager();
    restored.restoreSnapshot({ shards: [null, snapshot.shards[0], snapshot.shards[0], { ...snapshot.shards[0], id: 'bad', size: NaN }], nextBurstSerial: 0 });
    expect(restored.getShards()).toHaveLength(1);
    snapshot.shards[0].position[0] = 999;
    expect(restored.getShards()[0].position[0]).not.toBe(999);
    restored.spawnShatterShards('a', [0, 0, 0], '#fff', 1);
    expect(new Set(restored.getShards().map(s => s.id)).size).toBe(2);
  });
  it('migrates a legacy broken flag once without synthesizing debris for intact vessels', () => {
    const manager = new ShardManager(), vessels = { a: { ...vessel('a'), isShattered: true }, b: vessel('b') };
    manager.restoreLabSnapshot(undefined, vessels);
    expect(manager.getShards()).toHaveLength(20);
    expect(manager.getShards().every(s => s.sourceVesselId === 'a' && s.isSettled)).toBe(true);
    manager.collectSettledShards(); const empty = manager.snapshot();
    manager.restoreLabSnapshot(empty, vessels); expect(manager.getShards()).toEqual([]);
  });
  it('restores debris along with material history on undo/redo', () => {
    vi.useFakeTimers(); vi.advanceTimersByTime(101); clearHistory();
    const s = useAppStore.getState(); s.shatterVessel('a', 'impact'); shardManager.update(1);
    const full = shardManager.snapshot();
    const materials = { inFlightPours: [], spills: {}, wasteContents: [], wasteMass_g: 0 };
    pushHistorySnapshot('RESET', useAppStore.getState().vessels, s.burners, 'full', 'full', { ...materials, glassDebris: full });
    s.cleanGlassDebris('a');
    pushHistorySnapshot('RESET', useAppStore.getState().vessels, s.burners, 'clear', 'clear', { ...materials, glassDebris: shardManager.snapshot() });
    s.undo(); expect(shardManager.getShards()).toEqual(full.shards);
    s.redo(); expect(shardManager.getShards()).toEqual([]);
  });
  it('clears the world pool when the bench is reset or an experiment is loaded', () => {
    shardManager.spawnShatterShards('a', [0, 0, 0]); useAppStore.getState().resetWorkbench();
    expect(shardManager.getShards()).toEqual([]);
    shardManager.spawnShatterShards('a', [0, 0, 0]); useAppStore.getState().setupExperimentPreset('acid_base');
    expect(shardManager.getShards()).toEqual([]);
  });
});
