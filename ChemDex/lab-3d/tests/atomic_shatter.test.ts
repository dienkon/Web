import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { releaseShatteredInventory } from '../src/engine/shatterInventory';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { finalizeWaterVaporOutflow, postRecoveryExhaustG } from '../src/engine/waterVaporRouting';
import { loadPersistedLabState } from '../src/store/persistence';
import { vfxBus } from '../src/vfx/bus';
import { reactionSimulationEngine } from '../src/vfx/reactions/ReactionSimulationEngine';
import { programPlayer } from '../src/vfx/programs/player/ProgramPlayer';
import { getProgramById } from '../src/vfx/programs/library';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';
import type { VesselState } from '../src/types/chemistry';

const baseline = useAppStore.getState();
const source = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'b', name: 'sample', type: 'beaker',
  capacity_ml: 100, position: [0, -0.135, 0], rotationY: 0, isLocked: false,
  volume_ml: 5, volume: 0.05, mass_g: 6.1, temperature_c: 25, ph: 7,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 5, moles: 5 / 18.015, volume_ml: 5 },
    { formula: 'NaCl', phase: 'aq', mass_g: 1, moles: 1 / 58.44 },
    { formula: 'NO2', phase: 'g', mass_g: 0.1, moles: 0.1 / 46.0055 }],
  substances: ['H2O', 'NaCl', 'NO2'], escapedGas_g: { NO2: 0.4 },
  hasGas: true, hasPrecipitate: false, isBoiling: false, ...patch });
function wallSource() {
  const v = source();
  v.wallCondensation = { ...stepWallCondensation(v, 0, 0).wall, inner_g: 0.03, outer_g: 0.02,
    innerBeads: [{ mass_g: 0.03, y: 0.5, theta: 0, sliding: false }],
    outerBeads: [{ mass_g: 0.02, y: 0, theta: 1, sliding: true }] };
  return v;
}
function setup(v = wallSource()) {
  useAppStore.setState({ vessels: { b: v }, vesselIds: ['b'], spills: {}, wasteMass_g: 0, wasteContents: [],
    activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, burners: {}, inFlightPours: [] });
  return v;
}
function inventory() {
  const s = useAppStore.getState();
  return Object.values(s.vessels).reduce((sum, v) => sum + v.mass_g + (v.wallCondensation?.inner_g ?? 0)
    + (v.wallCondensation?.outer_g ?? 0) + Object.values(v.escapedGas_g ?? {}).reduce((a, b) => a + b, 0), 0)
    + Object.values(s.spills).reduce((sum, spill) => sum + spill.mass_g, 0) + s.wasteMass_g;
}
afterEach(() => {
  reactionSimulationEngine.resetAll(); programPlayer.stopProgram('b'); SimulationEngine.clearAll();
  useAppStore.setState(baseline, true); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals();
});

describe('Atomic glass breakage and finite wall-water release', () => {
  it('splits gas, condensed sample and both wall inventories without mutating the input', () => {
    const v = wallSource(), before = structuredClone(v), result = releaseShatteredInventory(v);
    expect(v).toEqual(before);
    expect(result.spill.mass_g).toBeCloseTo(6.05, 12); expect(result.spill.volume_ml).toBeCloseTo(5.05, 12);
    const water = result.spill.contents.find(c => c.formula === 'H2O')!;
    expect(water.mass_g).toBeCloseTo(5.05, 12); expect(water.moles).toBeCloseTo(5.05 / 18.015, 12);
    expect(water.volume_ml).toBeCloseTo(5.05, 12);
    expect(result.escapedGas_g.NO2).toBeCloseTo(0.5, 12);
    expect(result.wallAfterBreak).toMatchObject({ inner_g: 0, outer_g: 0, innerBeads: [], outerBeads: [],
      innerReleasedOnBreak_g: 0.03, outerReleasedOnBreak_g: 0.02 });
    expect(result.spill.mass_g + 0.1).toBeCloseTo(v.mass_g + 0.05, 12);
  });
  it('keeps only a real wall-water receipt when the bulk sample is empty', () => {
    const v = { ...wallSource(), volume_ml: 0, mass_g: 0, contents: [], substances: [] };
    const result = releaseShatteredInventory(v);
    expect(result.spill.mass_g).toBeCloseTo(0.05, 12); expect(result.spill.volume_ml).toBeCloseTo(0.05, 12);
    expect(result.spill.contents).toHaveLength(1);
    expect(result.spill.contents[0].formula).toBe('H2O');
  });
  it('exposes one conserved source-plus-spill version to every subscriber, including a reentrant break request', () => {
    setup(); const initial = inventory(), snapshots: number[] = [];
    const off = useAppStore.subscribe(s => {
      snapshots.push(inventory());
      if (s.vessels.b.isShattered) s.shatterVessel('b', 'explosion');
    });
    try { useAppStore.getState().shatterVessel('b', 'impact'); } finally { off(); }
    expect(snapshots).toHaveLength(1);
    for (const mass of snapshots) expect(mass).toBeCloseTo(initial, 12);
    expect(useAppStore.getState().vessels.b.contents).toEqual([]);
  });
  it('publishes VFX after the material commit, never emits intact-wall overflow and ignores an event reentry', () => {
    setup(); const initial = inventory(), observations: number[] = [], overflow: unknown[] = [];
    const off = vfxBus.on('explosion', () => {
      expect(useAppStore.getState().vessels.b.isShattered).toBe(true);
      expect(useAppStore.getState().vessels.b.mass_g).toBe(0);
      observations.push(inventory()); useAppStore.getState().shatterVessel('b', 'explosion');
    });
    const offOverflow = vfxBus.on('vessel:overflow', e => overflow.push(e));
    try { useAppStore.getState().shatterVessel('b', 'explosion'); } finally { off(); offOverflow(); }
    expect(observations).toHaveLength(1); expect(observations[0]).toBeCloseTo(initial, 12); expect(overflow).toEqual([]);
  });
  it('preserves conservation when a subscriber immediately collects the new spill into waste', () => {
    setup(); const initial = inventory(), snapshots: number[] = [];
    const off = useAppStore.subscribe(s => {
      snapshots.push(inventory());
      if (s.vessels.b.isShattered && Object.keys(s.spills).length) s.cleanSpills();
    });
    try { useAppStore.getState().shatterVessel('b', 'impact'); } finally { off(); }
    expect(snapshots).toHaveLength(2);
    for (const mass of snapshots) expect(mass).toBeCloseTo(initial, 12);
    expect(useAppStore.getState().spills).toEqual({});
    expect(useAppStore.getState().wasteMass_g).toBeCloseTo(6.05, 12);
  });
  it('does not delete an inventory whose location or extensive quantities cannot produce a valid receipt', () => {
    for (const patch of [{ position: [NaN, 0, 0] as [number, number, number] }, { mass_g: NaN }, { volume_ml: -1 }]) {
      const v = setup(source(patch));
      useAppStore.getState().shatterVessel('b', 'impact');
      expect(useAppStore.getState().vessels.b).toBe(v); expect(useAppStore.getState().spills).toEqual({});
    }
  });
  it('saves and reloads the depleted vessel, wall export and spill in one physical record', () => {
    vi.useFakeTimers(); const storage = new Map<string, string>();
    vi.stubGlobal('window', {}); vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
    setup(); const initial = inventory(); useAppStore.getState().shatterVessel('b', 'impact'); vi.advanceTimersByTime(1001);
    const saved = loadPersistedLabState()!;
    expect(storage.size).toBe(1); expect(saved.vessels.b.isShattered).toBe(true); expect(saved.vessels.b.mass_g).toBe(0);
    expect(saved.vessels.b.wallCondensation!.inner_g).toBe(0);
    expect(Object.values(saved.materials!.spills)[0].mass_g).toBeCloseTo(6.05, 12);
    useAppStore.setState({ vessels: saved.vessels, ...saved.materials });
    expect(inventory()).toBeCloseTo(initial, 12);
  });
  it('does not release wall water twice after repeated calls or replacing the broken body', () => {
    setup(); const initial = inventory(); useAppStore.getState().shatterVessel('b', 'impact');
    useAppStore.getState().shatterVessel('b', 'impact');
    useAppStore.getState().replaceShatteredVessel('b'); useAppStore.getState().shatterVessel('b', 'impact');
    expect(inventory()).toBeCloseTo(initial, 12);
    expect(Object.values(useAppStore.getState().spills)[0].mass_g).toBeCloseTo(6.05, 12);
    expect(useAppStore.getState().vessels.b.wallCondensation!.innerReleasedOnBreak_g).toBe(0.03);
  });
  it('opens a sealed gas-only sample to ambient pressure without inventing wet spill or heater output', () => {
    setup(source({ volume_ml: 0, mass_g: 0.1, isSealed: true, internalPressure_atm: 4,
      effectsEnvironment: { pressure_atm: 0.8 }, effectHeatInput_W: 300, effectHeatHandle: 'old', evaporationRate_g_s: 0.1,
      contents: [{ formula: 'NO2', phase: 'g', mass_g: 0.1, moles: 0.1 / 46.0055 }], substances: ['NO2'] }));
    const initial = inventory(); useAppStore.getState().shatterVessel('b', 'overpressure');
    const after = useAppStore.getState().vessels.b;
    expect(after.isSealed).toBe(false); expect(after.internalPressure_atm).toBe(0.8);
    expect(after.effectHeatInput_W).toBe(0); expect(after.effectHeatHandle).toBeUndefined(); expect(after.evaporationRate_g_s).toBe(0);
    expect(useAppStore.getState().spills).toEqual({}); expect(inventory()).toBeCloseTo(initial, 12);
  });
  it('does not relabel exported inner-wall liquid as historical water vapor', () => {
    const original = wallSource(); original.evaporated_ml = 1;
    original.wallCondensation = { ...original.wallCondensation!, inner_g: 0.2, outer_g: 0.4, returned_g: 0.3 };
    const release = releaseShatteredInventory(original);
    const broken = { ...original, isShattered: true, wallCondensation: release.wallAfterBreak };
    const next = finalizeWaterVaporOutflow(broken, broken, 0, 1);
    expect(next.waterVaporReleased_g).toBeCloseTo(0.5, 12);
    expect(next.wallCondensation!.outerReleasedOnBreak_g).toBe(0.4);
  });
  it.each([undefined, 0.2])('records headspace water vapor as an external sink when prior net history is %s', history => {
    setup(source({ volume_ml: 0, mass_g: 0.1, isSealed: true, waterVaporReleased_g: history,
      escapedGas_g: { H2O: 0.2 }, contents: [{ formula: 'H2O', phase: 'g', mass_g: 0.1, moles: 0.1 / 18.015 }], substances: ['H2O'] }));
    const initial = inventory(); useAppStore.getState().shatterVessel('b', 'overpressure');
    const after = useAppStore.getState().vessels.b;
    expect(after.waterVaporReleased_g).toBeCloseTo(0.3, 12);
    expect(postRecoveryExhaustG(after).H2O).toBeCloseTo(0.3, 12);
    expect(after.waterVaporOutflow_g_s).toBe(0); // an instantaneous amount has no invented duration/rate
    expect(inventory()).toBeCloseTo(initial, 12);
  });
  it('stops old playback and particle managers and invalidates the former specimen revision', () => {
    setup(source({ effectSampleRevision: 7 }));
    reactionSimulationEngine.startReaction('b', 'unregistered-preview');
    programPlayer.startProgram('b', getProgramById('cacl2_na2co3')!);
    const manager = SimulationEngine.getManager('b');
    manager.boilingSystem.update(0.1, { radius: 0.5, liquidBottomY: 0, surfaceY: 1, temp_c: 100,
      boilingPoint_c: 100, heatPower_W: 300, viscosity_mPa_s: 1, boilingStage: 'ACTIVE_BOIL', boilingIntensity: 1, vaporRate_g_s: 1 });
    expect(manager.boilingSystem.bubbles.length).toBeGreaterThan(0);
    useAppStore.getState().shatterVessel('b', 'impact');
    expect(reactionSimulationEngine.getRuntime('b')).toBeUndefined(); expect(programPlayer.getSession('b')).toBeUndefined();
    expect(manager.boilingSystem.bubbles).toEqual([]); expect(useAppStore.getState().vessels.b.effectSampleRevision).toBe(8);
  });
});
