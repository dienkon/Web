import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { PourController } from '../src/pour/controller/PourController';
import { advancePourParcel, pourFlightInterval, pourTargetPose } from '../src/engine/pourTransport';
import { traceLaunchedStream } from '../src/pour/physics/ballistics';
import { getWorldVesselProfile } from '../src/pour/physics/profiles';
import { vesselWorldLiquidSurfaceY } from '../src/science/vesselGeometry';
import { LAB_PHYSICS } from '../src/engine/interactionEngine';
import { computeMolarMass } from '../src/engine/ledger';
import { readComposition } from '../src/science/balance';
import { TransitStreamGeometry } from '../src/pour/render/transitGeometry';
import { clearHistory, debounceSaveLocalState, loadPersistedLabState, pushHistorySnapshot } from '../src/store/persistence';
import type { LabMaterialSnapshot, SubstanceContent, VesselState } from '../src/types/chemistry';
import { vfxBus } from '../src/vfx/bus';

const original = useAppStore.getState();
afterEach(() => {
  useAppStore.setState({ ...original, pourEpoch: useAppStore.getState().pourEpoch + 1 }, true);
  PourController.getSession();
  useAppStore.setState(original, true);
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); clearHistory();
});
const item = (formula: string, mass_g: number, phase: string): SubstanceContent =>
  ({ formula, mass_g, phase, moles: mass_g / computeMolarMass(formula) });
function vessel(id: string, volume_ml: number, contents = [item('H2O', volume_ml, 'l')]): VesselState {
  return { id, name: id, type: 'beaker', position: [0, -0.135, 0], rotationY: 0, isLocked: false,
    volume_ml, volume: volume_ml / 100, capacity_ml: 100, contents, substances: contents.map(c => c.formula),
    mass_g: contents.reduce((n, c) => n + c.mass_g, 0), temperature_c: 25, density_g_ml: 1,
    ph: 7, liquidColor: '#32aadd', hasGas: false, hasPrecipitate: false, isBoiling: false };
}
function setup(source = vessel('source', 50, [item('H2O', 50, 'l'), item('NaCl', 1, 'aq'), item('Cu', 3, 's')]),
  target = vessel('target', 0, [])) {
  useAppStore.setState({ vessels: { source, target }, vesselIds: ['source', 'target'], burners: {},
    activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, inFlightPours: [], spills: {},
    pourEpoch: useAppStore.getState().pourEpoch + 1, isSimulationPaused: false, timeScale: 1 });
  PourController.getSession();
  return { source, target };
}
function release(volume = 10, duration = 0.1) {
  const target = useAppStore.getState().vessels.target;
  const profile = getWorldVesselProfile(target.type, target.capacity_ml);
  const trajectory = traceLaunchedStream([0, 6, 0], [0, 0, 0], {
    id: target.id, position: target.position, profile, mouthR: profile.mouthR,
    mouthY: target.position[1] + profile.lipLocal[1], liquidSurfaceY: target.position[1] + vesselWorldLiquidSurfaceY(target),
  }, LAB_PHYSICS.TABLE_SURFACE_Y);
  const moved = useAppStore.getState().releasePourLiquid({ id: 'parcel', sessionId: 'test', sourceId: 'source',
    sourceName: 'source', targetId: 'target', targetPose: pourTargetPose(target), trajectory, duration_s: duration }, volume);
  expect(moved).toBeCloseTo(volume, 10);
  return useAppStore.getState().inFlightPours[0];
}
function materials(): LabMaterialSnapshot {
  const s = useAppStore.getState();
  return { inFlightPours: s.inFlightPours, spills: s.spills, wasteMass_g: s.wasteMass_g, wasteContents: s.wasteContents };
}
function inventory() {
  const s = useAppStore.getState();
  const samples = [...Object.values(s.vessels), ...s.inFlightPours.map(p => p.sample), ...Object.values(s.spills),
    { mass_g: s.wasteMass_g, contents: s.wasteContents }];
  const atoms: Record<string, number> = {};
  for (const sample of samples) for (const c of sample.contents ?? []) {
    for (const [symbol, coefficient] of Object.entries(readComposition(c.formula).atoms)) {
      atoms[symbol] = (atoms[symbol] ?? 0) + c.moles * coefficient;
    }
  }
  return { mass: samples.reduce((sum, sample) => sum + sample.mass_g, 0), atoms };
}
function conserved(before: ReturnType<typeof inventory>) {
  const after = inventory();
  expect(after.mass).toBeCloseTo(before.mass, 9);
  for (const [symbol, moles] of Object.entries(before.atoms)) expect(after.atoms[symbol]).toBeCloseTo(moles, 10);
}

describe('Finite material in a pouring stream', () => {
  it('withdraws into air, retains solids/gas, and delivers a finite emission interval progressively', () => {
    const { source, target } = setup(vessel('source', 50,
      [item('H2O', 50, 'l'), item('NaCl', 1, 'aq'), item('Cu', 3, 's'), item('H2', 0.002, 'g')]));
    const before = inventory(), parcel = release();
    expect(useAppStore.getState().vessels.target).toBe(target);
    expect(useAppStore.getState().vessels.source.volume_ml).toBe(40);
    expect(parcel.sample.contents.map(c => c.formula)).toEqual(['H2O', 'NaCl']);
    expect(source.volume_ml).toBe(50);
    conserved(before);
    useAppStore.getState().advancePourTransport(parcel.trajectory.timeOfFlight - 0.001);
    expect(useAppStore.getState().vessels.target).toBe(target);
    useAppStore.getState().advancePourTransport(0.051);
    expect(useAppStore.getState().vessels.target.volume_ml).toBeCloseTo(5, 9);
    expect(useAppStore.getState().inFlightPours[0].sample.volume_ml).toBeCloseTo(5, 9);
    conserved(before);
    useAppStore.getState().advancePourTransport(0.1);
    expect(useAppStore.getState().inFlightPours).toHaveLength(0);
    expect(useAppStore.getState().vessels.target.volume_ml).toBeCloseTo(10, 9);
    conserved(before);
  });

  it('does not neutralize or heat the receiver before the reagent contacts it', () => {
    const source = vessel('source', 20, [item('H2O', 20, 'l'), item('HCl', computeMolarMass('HCl') * 0.002, 'aq')]);
    const target = { ...vessel('target', 20, [item('H2O', 20, 'l'), item('NaOH', computeMolarMass('NaOH') * 0.002, 'aq')]), ph: 13 };
    setup(source, target);
    const before = inventory(), parcel = release();
    useAppStore.getState().advancePourTransport(parcel.trajectory.timeOfFlight - 1e-5);
    expect(useAppStore.getState().vessels.target).toBe(target);
    expect(useAppStore.getState().activeKinetics.target).toBeUndefined();
    useAppStore.getState().advancePourTransport(0.2);
    const received = useAppStore.getState().vessels.target;
    expect(received.contents.find(c => c.formula === 'NaOH')!.moles).toBeCloseTo(0.001, 10);
    expect(received.contents.find(c => c.formula === 'HCl')?.moles ?? 0).toBeLessThan(1e-10);
    expect(received.temperature_c).toBeGreaterThan(25);
    conserved(before);
  });

  it('retains released composition independently of later source edits or removal', () => {
    setup(); const parcel = release();
    useAppStore.setState(s => ({ vessels: { target: s.vessels.target } }));
    useAppStore.getState().advancePourTransport(parcel.trajectory.timeOfFlight + 1);
    const target = useAppStore.getState().vessels.target;
    expect(target.contents.find(c => c.formula === 'NaCl')!.mass_g).toBeCloseTo(0.2, 10);
    expect(target.volume_ml).toBeCloseTo(10, 10);
  });

  it('uses available capacity at arrival, including solid displacement', () => {
    const target = vessel('target', 89, [item('H2O', 89, 'l'), item('Zn', 71.4, 's')]);
    setup(undefined, target); const before = inventory(), parcel = release(5);
    useAppStore.getState().advancePourTransport(parcel.trajectory.timeOfFlight + 1);
    expect(useAppStore.getState().vessels.target.volume_ml).toBeCloseTo(90, 8);
    expect(useAppStore.getState().inFlightPours.filter(p => p.overflowOrigin).reduce((sum, p) => sum + p.sample.volume_ml, 0)).toBeCloseTo(4, 8);
    conserved(before);
    useAppStore.getState().advancePourTransport(2);
    expect(Object.values(useAppStore.getState().spills).reduce((sum, s) => sum + s.volume_ml, 0)).toBeCloseTo(4, 8);
    conserved(before);
  });

  it('does not reserve receiver space at release, and commits overflow and queue depletion atomically', () => {
    setup(undefined, vessel('target', 89, [item('H2O', 89, 'l'), item('Zn', 71.4, 's')]));
    const before = inventory(); release(5);
    useAppStore.getState().transferLiquidContinuous('source', 'target', 1);
    const observed: number[] = [];
    const unsubscribe = useAppStore.subscribe(() => { observed.push(inventory().mass); });
    try { useAppStore.getState().advancePourTransport(1); } finally { unsubscribe(); }
    expect(observed).toHaveLength(1);
    for (const mass of observed) expect(mass).toBeCloseTo(before.mass, 9);
    expect(useAppStore.getState().inFlightPours.filter(p => p.overflowOrigin).reduce((sum, p) => sum + p.sample.volume_ml, 0)).toBeCloseTo(5, 8);
    conserved(before);
    useAppStore.getState().advancePourTransport(2);
    expect(Object.values(useAppStore.getState().spills).reduce((sum, s) => sum + s.volume_ml, 0)).toBeCloseTo(5, 8);
    conserved(before);
  });

  it.each(['moved', 'deleted', 'shattered', 'sealed'] as const)('does not teleport a parcel into a %s receiver', change => {
    setup(); const before = inventory(), parcel = release();
    useAppStore.getState().advancePourTransport(0.01);
    useAppStore.setState(s => ({ vessels: { source: s.vessels.source, ...(change === 'deleted' ? {} : {
      target: { ...s.vessels.target, ...(change === 'moved' ? { position: [8, -0.135, 0] as [number, number, number] }
        : change === 'shattered' ? { isShattered: true } : { isSealed: true }) },
    }) } }));
    useAppStore.getState().advancePourTransport(parcel.trajectory.timeOfFlight + 1);
    expect(useAppStore.getState().vessels.target?.volume_ml ?? 0).toBe(0);
    const spills = Object.values(useAppStore.getState().spills);
    expect(spills.reduce((sum, s) => sum + s.volume_ml, 0)).toBeCloseTo(10, 10);
    expect(spills[0].position[0]).toBeCloseTo(0, 8);
    conserved(before);
  });

  it('freezes during pause and rejects invalid elapsed time', () => {
    setup(); release(); const queue = useAppStore.getState().inFlightPours;
    for (const dt of [0, -1, NaN, Infinity]) expect(useAppStore.getState().advancePourTransport(dt)).toEqual([]);
    useAppStore.setState({ isSimulationPaused: true });
    expect(useAppStore.getState().advancePourTransport(10)).toEqual([]);
    PourController.tick(0.1, undefined, false, 8);
    expect(useAppStore.getState().inFlightPours).toBe(queue);
  });

  it('advances transport with the controller time scale even without an active session', () => {
    setup(); const parcel = release();
    PourController.tick(1 / 60, undefined, false, 2);
    expect(useAppStore.getState().inFlightPours[0].elapsed_s).toBeCloseTo(1 / 30, 12);
    const before = useAppStore.getState().inFlightPours;
    PourController.tick(1 / 60, undefined, true, 2);
    expect(useAppStore.getState().inFlightPours).toBe(before);
    expect(parcel.elapsed_s).toBe(0);
  });

  it('caps released volume and lets cancellation/commit finish already released matter once', async () => {
    setup(); const before = inventory();
    PourController.beginPour({ sourceId: 'source', targetId: 'target', mode: 'ASSIST', requestedVolume_ml: 0.3 });
    PourController.setTilt(1.4);
    for (let i = 0; i < 180 && (PourController.getSession()?.released_ml ?? 0) < 0.3 - 1e-9; i++) PourController.tick(1 / 60);
    const session = PourController.getSession()!;
    expect(session.released_ml).toBeCloseTo(0.3, 10);
    expect(session.inFlight_ml).toBeGreaterThan(0);
    expect(session.transferred_ml + session.spilled_ml + session.inFlight_ml + session.onWall_ml).toBeCloseTo(0.3, 10);
    conserved(before);
    await PourController.commitCurrentPour();
    PourController.cancelPour();
    expect(useAppStore.getState().inFlightPours.length).toBeGreaterThan(0);
    for (let i = 0; i < 180 && PourController.getSession(); i++) PourController.tick(1 / 60);
    await PourController.commitCurrentPour();
    expect(PourController.getSession()).toBeNull();
    expect(useAppStore.getState().vessels.source.volume_ml).toBeCloseTo(49.7, 10);
    expect(useAppStore.getState().vessels.target.volume_ml).toBeCloseTo(0.3, 10);
    expect(useAppStore.getState().inFlightPours).toHaveLength(0);
    conserved(before);
  });

  it('emits impact only at contact, and reset invalidates the old session and packets', () => {
    setup(); const seen: unknown[] = [], stop = vfxBus.on('pour:impact', e => seen.push(e));
    try {
      PourController.beginPour({ sourceId: 'source', targetId: 'target', mode: 'ASSIST', requestedVolume_ml: 0.3 });
      PourController.setTilt(1.4);
      for (let i = 0; i < 180 && !(PourController.getSession()?.released_ml); i++) PourController.tick(1 / 60);
      expect(seen).toHaveLength(0);
      expect(useAppStore.getState().inFlightPours.length).toBeGreaterThan(0);
      useAppStore.getState().resetWorkbench();
      const vessels = useAppStore.getState().vessels;
      for (let i = 0; i < 60; i++) PourController.tick(1 / 60);
      expect(PourController.getSession()).toBeNull();
      expect(useAppStore.getState().inFlightPours).toHaveLength(0);
      expect(useAppStore.getState().vessels).toBe(vessels);
      expect(seen).toHaveLength(0);
    } finally { stop(); }
  });

  it('restores airborne inventory and spill inventory through undo and redo without duplication', () => {
    setup(); const before = inventory(); release();
    clearHistory();
    const s = useAppStore.getState();
    pushHistorySnapshot('POUR', s.vessels, s.burners, 'In air', 'Đang rơi', materials());
    s.advancePourTransport(1);
    const end = useAppStore.getState();
    pushHistorySnapshot('POUR', end.vessels, end.burners, 'Arrived', 'Đã tới', materials());
    end.undo();
    expect(useAppStore.getState().vessels.target.volume_ml).toBe(0);
    expect(useAppStore.getState().inFlightPours[0].sample.volume_ml).toBe(10);
    conserved(before);
    useAppStore.getState().advancePourTransport(1);
    conserved(before);
    useAppStore.getState().redo();
    expect(useAppStore.getState().inFlightPours).toHaveLength(0);
    expect(useAppStore.getState().vessels.target.volume_ml).toBeCloseTo(10, 10);
    useAppStore.getState().advancePourTransport(1);
    conserved(before);
  });

  it('saves the depleted source and in-flight matter in one atomic record and can resume it', () => {
    vi.useFakeTimers();
    const data = new Map<string, string>();
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value) });
    setup(); const before = inventory(); release();
    const s = useAppStore.getState();
    debounceSaveLocalState(s.vessels, s.burners, materials());
    vi.advanceTimersByTime(1001);
    expect(data.size).toBe(1);
    const saved = loadPersistedLabState()!;
    expect(saved.vessels.source.volume_ml).toBe(40);
    expect(saved.materials!.inFlightPours[0].sample.volume_ml).toBe(10);
    useAppStore.setState({ vessels: saved.vessels, ...saved.materials });
    useAppStore.getState().advancePourTransport(1);
    expect(useAppStore.getState().vessels.target.volume_ml).toBeCloseTo(10, 10);
    conserved(before);
    useAppStore.getState().transferLiquidContinuous('source', null, 2);
    expect(Object.keys(useAppStore.getState().spills)).toHaveLength(1);
    useAppStore.getState().cleanSpills();
    vi.advanceTimersByTime(1001);
    const cleaned = loadPersistedLabState()!;
    expect(cleaned.materials!.spills).toEqual({});
    expect(cleaned.materials!.wasteMass_g).toBeCloseTo(2.04, 10);
    conserved(before);
  });

  it('renders only the segment between the actual leading and trailing liquid', () => {
    setup(); const parcel = release();
    const advanced = advancePourParcel(parcel, 0.15, useAppStore.getState().vessels.target).parcel;
    const [tail, front] = pourFlightInterval(advanced);
    expect(tail).toBeCloseTo(0.05, 12);
    expect(front).toBeCloseTo(0.15, 12);
    const geometry = new TransitStreamGeometry(); geometry.update([advanced]);
    const positions = geometry.attributes.position;
    // The average of a complete circular ring is its ballistic center.
    const center = (ring: number) => Array.from({ length: 12 }, (_, i) => positions.getY(ring * 13 + i))
      .reduce((sum, n) => sum + n, 0) / 12;
    // Independent SI conversion: 3.5 cm/scene, g = 9.8 m/s².
    expect(center(0)).toBeCloseTo(6 - 0.5 * (9.8 / 0.035) * 0.05 ** 2, 5);
    expect(center(4)).toBeCloseTo(6 - 0.5 * (9.8 / 0.035) * 0.15 ** 2, 5);
    geometry.update([]);
    expect(geometry.drawRange.count).toBe(0);
    geometry.dispose();
  });
});
