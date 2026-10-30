import { afterEach, describe, expect, it, vi } from 'vitest';
import { puddleOverlapFraction } from '../src/science/puddleOverlap';
import { solveSessileDrop, type SessileDropShape } from '../src/science/sessileDrop';
import { collectSpillPatch } from '../src/engine/spillCleanup';
import { mergeWorkbenchSpill, normalizeSpillFootprints } from '../src/engine/spillInventory';
import { collectSpillWaste } from '../src/engine/wasteInventory';
import { useAppStore } from '../src/store/useAppStore';
import { clearHistory, loadPersistedLabState, pushHistorySnapshot } from '../src/store/persistence';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import type { SpillState } from '../src/types/chemistry';
import type { VesselState } from '../src/types/chemistry';
import { vfxBus } from '../src/vfx/bus';

const initial = useAppStore.getState();
afterEach(() => { useAppStore.setState(initial, true); vi.unstubAllGlobals(); clearHistory(); });
const wet = (volume_ml = 10): SpillState => ({ id: 'patch', position: [2, -1.175, 3], substances: ['H2O', 'NaCl'],
  color: '#fff', volume_ml, mass_g: volume_ml * 1.1, radius: 0.001, isHazard: false, timestamp: 123,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: volume_ml, moles: volume_ml / 18.015, volume_ml,
    initialMass_g: volume_ml, initialMoles: volume_ml / 18.015 },
  { formula: 'NaCl', phase: 'aq', mass_g: volume_ml * 0.1, moles: volume_ml * 0.1 / 58.44 }] });

describe('Volume under a finite circular collector', () => {
  const cylinder: SessileDropShape = { radius_m: 1, height_m: 1, volume_m3: Math.PI,
    apexCurvature_m_inv: 0, contactAngle_deg: 90,
    profile: [{ radius_m: 0, height_m: 1 }, { radius_m: 1, height_m: 1 }, { radius_m: 1, height_m: 0 }] };
  it('matches the analytic intersection of two equal disks at one-radius separation', () => {
    expect(puddleOverlapFraction(cylinder, 1, 1)).toBeCloseTo((2 * Math.PI / 3 - Math.sqrt(3) / 2) / Math.PI, 7);
    expect(puddleOverlapFraction(cylinder, 0, 0.5)).toBeCloseTo(0.25, 10);
  });
  it('weights actual liquid height rather than assuming overlap area equals volume', () => {
    const hemisphere = { ...cylinder, volume_m3: 2 * Math.PI / 3,
      profile: Array.from({ length: 4001 }, (_, i) => ({ radius_m: i / 4000, height_m: Math.sqrt(1 - (i / 4000) ** 2) })) };
    const fraction = puddleOverlapFraction(hemisphere, 0, 0.5);
    expect(fraction).toBeCloseTo(1 - 0.75 ** 1.5, 5);
    expect(fraction).toBeGreaterThan(0.25);
  });
  it('keeps disjoint/tangent footprints empty and full containment exact', () => {
    expect(puddleOverlapFraction(cylinder, 2, 1)).toBe(0);
    expect(puddleOverlapFraction(cylinder, 0.3, 1.3)).toBe(1);
    for (const radius of [0, -1, NaN, Infinity]) expect(puddleOverlapFraction(cylinder, 0, radius)).toBe(0);
    expect(puddleOverlapFraction(cylinder, NaN, 1)).toBe(0);
  });
  it('is invariant under physical length scaling and respects radial monotonicity', () => {
    const drop = solveSessileDrop(3)!;
    const scaled = { ...drop, radius_m: drop.radius_m * 3, height_m: drop.height_m * 3,
      profile: drop.profile.map(p => ({ radius_m: p.radius_m * 3, height_m: p.height_m * 3 })) };
    const fraction = puddleOverlapFraction(drop, drop.radius_m * 0.5, drop.radius_m * 0.4);
    expect(puddleOverlapFraction(scaled, scaled.radius_m * 0.5, scaled.radius_m * 0.4)).toBeCloseTo(fraction, 10);
    expect(puddleOverlapFraction(drop, drop.radius_m * 0.5, drop.radius_m * 0.8)).toBeGreaterThan(fraction);
  });
});

describe('Spill cleanup, restoration and material invariants', () => {
  it('splits a small patch without mutating the source and conserves every extensive constituent field', () => {
    const source = wet(), before = structuredClone(source);
    const patch = collectSpillPatch(source, source.position, 0.1)!;
    expect(patch.fraction).toBeGreaterThan(0); expect(patch.fraction).toBeLessThan(0.2);
    expect(source).toEqual(before);
    const left = patch.remaining!, removed = patch.collected;
    expect(left.volume_ml + removed.volume_ml).toBe(source.volume_ml);
    expect(left.mass_g + removed.mass_g).toBe(source.mass_g);
    for (let i = 0; i < source.contents!.length; i++) for (const key of ['mass_g', 'moles', 'volume_ml', 'initialMass_g', 'initialMoles'] as const) {
      if (source.contents![i][key] !== undefined) expect(left.contents![i][key]! + removed.contents![i][key]!).toBeCloseTo(source.contents![i][key]!, 12);
    }
    expect(left.position).toEqual(source.position);
    expect(left.radius).toBeCloseTo(solveSessileDrop(left.volume_ml)!.radius_m / METERS_PER_SCENE_UNIT, 10);
  });
  it('does not wipe an entire large puddle when the collector only grazes its edge', () => {
    const source = wet(100), radius = solveSessileDrop(100)!.radius_m / METERS_PER_SCENE_UNIT;
    const patch = collectSpillPatch(source, [source.position[0] + radius + 0.05, 0, source.position[2]], 0.1)!;
    expect(patch).not.toBeNull(); expect(patch.fraction).toBeGreaterThan(0); expect(patch.fraction).toBeLessThan(0.001);
    expect(collectSpillPatch(source, [source.position[0] + radius + 0.1, 0, source.position[2]], 0.1)).toBeNull();
  });
  it('takes no material for invalid/empty collectors and collects an enclosed dry point only once', () => {
    const source = wet();
    for (const radius of [0, -1, NaN, Infinity]) expect(collectSpillPatch(source, source.position, radius)).toBeNull();
    expect(collectSpillPatch(source, [NaN, 0, 0], 1)).toBeNull();
    for (const patch of [{ mass_g: -1 }, { volume_ml: -1 }, { mass_g: NaN }]) {
      expect(collectSpillPatch({ ...source, ...patch }, source.position, 1)).toBeNull();
    }
    const dry = { ...wet(0), mass_g: 2, contents: [{ formula: 'Cu', phase: 's', mass_g: 2, moles: 2 / 63.546 }] };
    expect(collectSpillPatch(dry, [4, 0, 3], 0.1)).toBeNull();
    expect(collectSpillPatch(dry, dry.position, 0.1)!.remaining).toBeNull();
  });
  it('upgrades footprint metadata without changing quantity, location, identity or the saved input', () => {
    const source = wet(), saved = { patch: source }, before = structuredClone(saved);
    const upgraded = normalizeSpillFootprints(saved);
    expect(saved).toEqual(before);
    expect(upgraded.patch).toEqual({ ...source, radius: solveSessileDrop(10)!.radius_m / METERS_PER_SCENE_UNIT });
    expect(normalizeSpillFootprints(upgraded)).toBe(upgraded);
  });
  it('upgrades the physical persistence record at load without moving or consuming its sample', () => {
    const source = wet();
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'chemlab_physical_state_v3'
      ? JSON.stringify({ vessels: {}, burners: {}, materials: { spills: { patch: source } } }) : null });
    const loaded = loadPersistedLabState()!.materials!.spills.patch;
    expect(loaded.mass_g).toBe(source.mass_g); expect(loaded.contents).toEqual(source.contents);
    expect(loaded.position).toEqual(source.position);
    expect(loaded.radius).toBeCloseTo(solveSessileDrop(10)!.radius_m / METERS_PER_SCENE_UNIT, 10);
  });
  it('upgrades footprints on undo and redo while restoring the corresponding finite volumes', () => {
    clearHistory();
    const materials = (volume: number) => ({ inFlightPours: [], spills: { patch: wet(volume) }, wasteMass_g: 0, wasteContents: [] });
    pushHistorySnapshot('POUR', {}, {}, 'first', 'đầu', materials(1));
    pushHistorySnapshot('POUR', {}, {}, 'second', 'sau', materials(10));
    useAppStore.getState().undo();
    expect(useAppStore.getState().spills.patch.radius).toBeCloseTo(solveSessileDrop(1)!.radius_m / METERS_PER_SCENE_UNIT, 10);
    useAppStore.getState().redo();
    expect(useAppStore.getState().spills.patch.radius).toBeCloseTo(solveSessileDrop(10)!.radius_m / METERS_PER_SCENE_UNIT, 10);
  });
  it('keeps sub-0.02 mL receipts and aggregates component volume/mass/moles without mixing state metadata', () => {
    const first = mergeWorkbenchSpill({}, [0, 0, 0], 0.001, ['H2O'], '#fff', undefined, undefined,
      [{ formula: 'H2O', phase: 'l', state: 'liquid', mass_g: 0.001, moles: 0.001 / 18.015, volume_ml: 0.001 }]);
    expect(Object.values(first)[0].volume_ml).toBe(0.001);
    const merged = mergeWorkbenchSpill(first, [0, 0, 0], 0.002, ['H2O'], '#fff', undefined, undefined,
      [{ formula: 'H2O', phase: 'l', state: 'liquid', mass_g: 0.002, moles: 0.002 / 18.015, volume_ml: 0.002 }]);
    const sample = Object.values(merged)[0];
    expect(sample.contents![0].volume_ml).toBeCloseTo(0.003, 14);
    expect(sample.contents![0].mass_g).toBeCloseTo(0.003, 14);
    const otherState = mergeWorkbenchSpill(merged, [0, 0, 0], 0.001, ['H2O'], '#fff', undefined, 0.001,
      [{ formula: 'H2O', phase: 'l', state: 'unknown', mass_g: 0.001, moles: 0.001 / 18.015 }]);
    expect(Object.values(otherState)[0].contents).toHaveLength(2);
  });
  it('emits overflow only for a committed finite receipt, with the inventory already visible to its listener', () => {
    const vessel = { id: 'target', type: 'beaker', position: [0, 0, 0], volume_ml: 100, capacity_ml: 100 } as VesselState;
    useAppStore.setState({ vessels: { target: vessel }, vesselIds: ['target'], spills: {}, inFlightPours: [] });
    const observed: number[] = [];
    const off = vfxBus.on('vessel:overflow', () => observed.push(Object.values(useAppStore.getState().spills).reduce((sum, s) => sum + s.volume_ml, 0)
      + useAppStore.getState().inFlightPours.reduce((sum, p) => sum + p.sample.volume_ml, 0)));
    try {
      for (const volume of [0, -1, NaN, Infinity]) useAppStore.getState().addSpill(vessel.position, volume, ['H2O'], '#fff',
        undefined, undefined, undefined, vessel.id);
      expect(observed).toEqual([]);
      useAppStore.getState().addSpill(vessel.position, 0.001, ['H2O'], '#fff', undefined, undefined, undefined, vessel.id);
      expect(observed).toEqual([0.001]);
    } finally { off(); }
  });
  it('preserves total mass, moles and component volume through repeated local wipes followed by global collection', () => {
    const source = wet(2);
    useAppStore.setState({ vessels: {}, vesselIds: [], spills: { patch: source }, wasteContents: [], wasteMass_g: 0 });
    for (let i = 0; i < 12; i++) useAppStore.getState().wipeSpillAt(source.position, 0.1);
    const state = useAppStore.getState(), rest = Object.values(state.spills);
    expect(state.wasteMass_g).toBeGreaterThan(0); expect(state.wasteMass_g).toBeLessThan(source.mass_g);
    expect(state.wasteMass_g + rest.reduce((sum, s) => sum + s.mass_g, 0)).toBeCloseTo(source.mass_g, 12);
    const beforeAll = collectSpillWaste(state.wasteContents, rest);
    expect(beforeAll.contents[0].volume_ml).toBeCloseTo(source.contents![0].volume_ml!, 12);
    useAppStore.getState().cleanSpills(); useAppStore.getState().cleanSpills();
    const end = useAppStore.getState();
    expect(end.wasteMass_g).toBeCloseTo(source.mass_g, 12);
    for (const item of source.contents!) expect(end.wasteContents.find(x => x.formula === item.formula)!.moles).toBeCloseTo(item.moles, 12);
    expect(end.wasteContents[0].initialMass_g).toBeCloseTo(source.contents![0].initialMass_g!, 12);
  });
});
