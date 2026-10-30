import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { effects } from '../src/vfx/vesselEffects';
import { overflowWallTime, overflowLocationFractions } from '../src/engine/overflowTransport';
import { calculateVesselMass } from '../src/engine/interactionEngine';
import { readComposition } from '../src/science/balance';
import { prepareStockAddition } from '../src/engine/stockAddition';
import { findChemical } from '../src/data/chemicals';
import { ExteriorFilmGeometry } from '../src/pour/render/ExteriorFilmGeometry';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import { TransitStreamGeometry } from '../src/pour/render/transitGeometry';
import { clearHistory, pushHistorySnapshot, debounceSaveLocalState, loadPersistedLabState } from '../src/store/persistence';
import type { VesselState } from '../src/types/chemistry';
import { vfxBus } from '../src/vfx/bus';
import { vesselWorldDimensions } from '../src/science/vesselScale';
import { vesselWorldContours } from '../src/science/vesselScale';
import { contourRadius } from '../src/science/vesselDimensions';
import type { BufferGeometry } from 'three';

const original = useAppStore.getState();
afterEach(() => { useAppStore.setState(original, true); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); clearHistory(); });
const vessel = (id: string, volume: number, salted = false): VesselState => ({ id, type: 'beaker', name: id,
  position: [0, 0.5, 0], rotationY: 0, capacity_ml: 100, isLocked: false, tare_g: 50,
  volume_ml: volume, volume: volume / 100, mass_g: volume, temperature_c: 25,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: volume * (salted ? 0.98 : 1), moles: volume * (salted ? 0.98 : 1) / 18.015 },
    ...(salted ? [{ formula: 'NaCl', phase: 'aq', mass_g: volume * 0.02, moles: volume * 0.02 / 58.44 }] : [])],
  substances: salted ? ['H2O', 'NaCl'] : ['H2O'], liquidColor: '#f8fafc',
  ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false });
function setup(height = 0.5) {
  const source = vessel('s', 50, true), receiver = { ...vessel('r', 100), position: [0, height, 0] as [number, number, number] };
  useAppStore.setState({ vessels: { s: source, r: receiver }, vesselIds: ['s', 'r'], burners: {}, spills: {}, inFlightPours: [],
    activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, wasteMass_g: 0, wasteContents: [], isSimulationPaused: false, timeScale: 1 });
}
function inventory() {
  const s = useAppStore.getState(), parts = [...Object.values(s.vessels), ...s.inFlightPours.map(p => p.sample), ...Object.values(s.spills)];
  const atoms: Record<string, number> = {};
  for (const p of parts) for (const c of p.contents ?? []) for (const [element, count] of Object.entries(readComposition(c.formula).atoms))
    atoms[element] = (atoms[element] ?? 0) + count * c.moles;
  return { mass: parts.reduce((sum, p) => sum + p.mass_g, 0), atoms };
}
function conserved(before: ReturnType<typeof inventory>) {
  const after = inventory(); expect(after.mass).toBeCloseTo(before.mass, 10);
  for (const [key, count] of Object.entries(before.atoms)) expect(after.atoms[key]).toBeCloseTo(count, 10);
}
const groundVolume = () => Object.values(useAppStore.getState().spills).reduce((sum, p) => sum + p.volume_ml, 0);
function materials() { const s = useAppStore.getState(); return { inFlightPours: s.inFlightPours, spills: s.spills, wasteMass_g: s.wasteMass_g, wasteContents: s.wasteContents }; }
function meshVolumeMl(geometry: BufferGeometry) {
  const p = geometry.attributes.position, indices = geometry.index!;
  const origin = [p.getX(indices.getX(0)), p.getY(indices.getX(0)), p.getZ(indices.getX(0))];
  let volume = 0;
  for (let i = 0; i < geometry.drawRange.count; i += 3) {
    const [a, b, c] = [0, 1, 2].map(k => { const v = indices.getX(i + k); return [p.getX(v) - origin[0], p.getY(v) - origin[1], p.getZ(v) - origin[2]]; });
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return Math.abs(volume) * (METERS_PER_SCENE_UNIT * 100) ** 3;
}

it('distributes upright circular-rim overflow around the modeled rim with a finite entry speed', () => {
  setup(); const p = dose(), plan = p.wallFilm!;
  expect(plan.azimuthSpan_rad).toBeCloseTo(2 * Math.PI, 12);
  expect(plan.points[0].width_m).toBeCloseTo(2 * Math.PI * plan.points[0].radius * METERS_PER_SCENE_UNIT, 8);
  expect(plan.entrySpeed_m_s).toBeGreaterThan(0);
  useAppStore.getState().advancePourTransport(0.02);
  const wall = new ExteriorFilmGeometry(), s = useAppStore.getState(); wall.update(s.inFlightPours, s.vessels);
  const positions = wall.attributes.position, indices = wall.index!;
  const extrema = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < wall.drawRange.count; i++) {
    const j = indices.getX(i), x = positions.getX(j), z = positions.getZ(j);
    extrema.minX = Math.min(extrema.minX, x); extrema.maxX = Math.max(extrema.maxX, x);
    extrema.minZ = Math.min(extrema.minZ, z); extrema.maxZ = Math.max(extrema.maxZ, z);
  }
  expect(extrema.minX).toBeLessThan(-0.9); expect(extrema.maxX).toBeGreaterThan(0.9);
  expect(extrema.minZ).toBeLessThan(-0.9); expect(extrema.maxZ).toBeGreaterThan(0.9);
  wall.dispose();
});
function dose() {
  const receipt = effects.forVessel('r').doseLiquid('s', 20);
  expect(receipt.spilled_ml).toBeCloseTo(20, 12);
  return useAppStore.getState().inFlightPours[0];
}

describe('Finite exterior overflow: rim → wall → air → ground', () => {
  it('keeps every observable dose transaction balanced, not just the state after the command', () => {
    setup(); const before = inventory(), masses: number[] = [];
    const stop = useAppStore.subscribe(() => masses.push(inventory().mass));
    try { dose(); } finally { stop(); }
    expect(masses.length).toBeGreaterThan(0);
    for (const mass of masses) expect(mass).toBeCloseTo(before.mass, 10);
  });
  it.each([0, 0.4])('commits displaced solvent atomically with a new solid stock input at tilt %s', async rotationZ => {
    setup(); useAppStore.getState().setVesselState('r', { rotationZ }); const before = inventory(), masses: number[] = [];
    const stop = useAppStore.subscribe(() => masses.push(inventory().mass));
    try { await useAppStore.getState().mixSubstances('r', 'Cu', 8.96); } finally { stop(); }
    for (const mass of masses) expect(Math.min(Math.abs(mass - before.mass), Math.abs(mass - before.mass - 8.96))).toBeLessThan(1e-9);
  });
  it('owns the released matter before impact, then deposits continuously with its exact composition', () => {
    setup(); const before = inventory(), p = dose(), transit = overflowWallTime(p) + p.trajectory.timeOfFlight;
    expect(p.stage).toBe('overflow'); expect(p.releaseBasis).toBe('assumed-dose-interval');
    expect(p.wallFilm!.side).toBe('outer');
    const receiver = useAppStore.getState().vessels.r;
    expect(p.wallFilm!.points.at(-1)!.radius).toBeCloseTo(contourRadius(vesselWorldContours(receiver).outer, vesselWorldDimensions(receiver).bottomY) + 0.0002, 8);
    expect(groundVolume()).toBe(0); conserved(before);
    useAppStore.getState().advancePourTransport(transit - 1e-7);
    expect(groundVolume()).toBe(0); conserved(before);
    useAppStore.getState().advancePourTransport(0.06 + 1e-7);
    expect(groundVolume()).toBeCloseTo(10, 10); conserved(before);
    const salt = Object.values(useAppStore.getState().spills).flatMap(s => s.contents ?? [])
      .filter(c => c.formula === 'NaCl').reduce((sum, c) => sum + c.mass_g, 0);
    expect(salt).toBeCloseTo(0.2, 12);
    useAppStore.getState().advancePourTransport(1);
    expect(groundVolume()).toBeCloseTo(20, 10); expect(useAppStore.getState().inFlightPours).toHaveLength(0); conserved(before);
  });
  it('counts only still-supported exterior film in the physical weighing readout', () => {
    setup(); const p = dose();
    useAppStore.getState().advancePourTransport(0.001);
    expect(calculateVesselMass(useAppStore.getState().vessels.r)).toBeCloseTo(170, 12);
    const elapsed = overflowWallTime(p) + p.duration_s / 2;
    useAppStore.getState().advancePourTransport(elapsed - 0.001);
    const state = useAppStore.getState(), parcel = state.inFlightPours[0];
    expect(parcel.sample.mass_g * overflowLocationFractions(parcel).wall).toBeCloseTo(10, 10);
    expect(state.vessels.r.outerWallCoatingMass_g).toBeCloseTo(10, 10);
    expect(calculateVesselMass(state.vessels.r)).toBeCloseTo(160, 10);
  });
  it('is independent of caller frame subdivisions and pauses the material clock', () => {
    const masses = [];
    for (const fps of [10, 30, 60, 120]) {
      setup(); const before = inventory(), p = dose(), seconds = overflowWallTime(p) + p.trajectory.timeOfFlight + 0.07;
      for (let t = 0; t < seconds - 1e-12;) { const dt = Math.min(1 / fps, seconds - t); useAppStore.getState().advancePourTransport(dt); t += dt; }
      masses.push(groundVolume()); conserved(before);
      useAppStore.setState({ isSimulationPaused: true }); const state = useAppStore.getState();
      expect(useAppStore.getState().advancePourTransport(100)).toEqual([]); expect(useAppStore.getState()).toBe(state);
    }
    for (const mass of masses) expect(mass).toBeCloseTo(20 * 0.07 / 0.12, 9);
  });
  it('leaves fluid already in air on its old trajectory when the support moves', () => {
    setup(4); const before = inventory(), p = dose();
    useAppStore.getState().advancePourTransport(overflowWallTime(p) + 0.01);
    useAppStore.getState().updateVesselPosition('r', [20, 4, 0]);
    useAppStore.getState().advancePourTransport(0.001);
    const parts = useAppStore.getState().inFlightPours;
    expect(parts.find(p => p.stage === 'air')!.trajectory.exitPos[0]).toBeLessThan(2);
    expect(parts.find(p => p.stage === 'overflow')!.trajectory.exitPos[0]).toBeGreaterThan(20);
    conserved(before);
    useAppStore.getState().advancePourTransport(2); conserved(before);
    const pools = Object.values(useAppStore.getState().spills);
    expect(pools.filter(s => s.position[0] < 10).reduce((sum, s) => sum + s.volume_ml, 0)).toBeCloseTo(20 * 0.01 / p.duration_s, 9);
    expect(pools.filter(s => s.position[0] > 10).reduce((sum, s) => sum + s.volume_ml, 0)).toBeCloseTo(20 * (1 - 0.01 / p.duration_s), 9);
  });
  it.each(['remove', 'break', 'tilt'] as const)('retains the exterior interval when the receiver is %s', action => {
    setup(3); dose(); const outside = useAppStore.getState().inFlightPours[0].sample.mass_g;
    if (action === 'remove') useAppStore.getState().removeVessel('r');
    else if (action === 'break') useAppStore.getState().shatterVessel('r', 'test');
    else useAppStore.getState().setVesselState('r', { rotationZ: 0.4 });
    const before = inventory();
    useAppStore.getState().advancePourTransport(0.001);
    expect(useAppStore.getState().inFlightPours.every(p => p.stage === 'air')).toBe(true);
    expect(useAppStore.getState().inFlightPours.reduce((sum, p) => sum + p.sample.mass_g, 0)).toBeCloseTo(outside, 12);
    conserved(before); useAppStore.getState().advancePourTransport(2); conserved(before);
  });
  it('uses the same finite exterior owner for stock additions and displaced solvent', async () => {
    for (const [formula, amount] of [['HCl', 10], ['Cu', 8.96]] as const) {
      setup(); const receiver = useAppStore.getState().vessels.r;
      const expected = prepareStockAddition(receiver, findChemical(formula), formula, amount, 25)!;
      await useAppStore.getState().mixSubstances('r', formula, amount);
      expect(groundVolume()).toBe(0);
      const parcel = useAppStore.getState().inFlightPours[0];
      expect(parcel.sample.volume_ml).toBeCloseTo(expected.spill!.volume_ml, 10);
      expect(parcel.sample.mass_g).toBeCloseTo(expected.spill!.mass_g, 10);
      if (formula === 'Cu') expect(parcel.sample.contents.every(c => c.formula === 'H2O')).toBe(true);
      else expect(parcel.sample.substances).toContain('HCl');
      const before = inventory(); useAppStore.getState().advancePourTransport(2); conserved(before);
    }
  });
  it('renders only the finite wetted interval and no falling stream before it reaches the base', () => {
    setup(); dose(); useAppStore.getState().advancePourTransport(0.02);
    const wall = new ExteriorFilmGeometry(), air = new TransitStreamGeometry(), state = useAppStore.getState();
    wall.update(state.inFlightPours, state.vessels); air.update(state.inFlightPours);
    expect(wall.drawRange.count).toBeGreaterThan(0); expect(air.drawRange.count).toBe(0);
    const early = overflowLocationFractions(state.inFlightPours[0]);
    expect(early.queued).toBeGreaterThan(0);
    expect(early.wall + early.air + early.queued).toBeCloseTo(1, 14);
    expect(meshVolumeMl(wall)).toBeCloseTo(state.inFlightPours[0].sample.volume_ml * early.wall, 4);
    const positions = wall.attributes.position, indices = wall.index!;
    let volume = 0;
    for (let i = 0; i < wall.drawRange.count; i += 3) {
      const a = indices.getX(i), b = indices.getX(i + 1), c = indices.getX(i + 2);
      volume += (positions.getX(a) * (positions.getY(b) * positions.getZ(c) - positions.getZ(b) * positions.getY(c))
        + positions.getY(a) * (positions.getZ(b) * positions.getX(c) - positions.getX(b) * positions.getZ(c))
        + positions.getZ(a) * (positions.getX(b) * positions.getY(c) - positions.getY(b) * positions.getX(c))) / 6;
    }
    expect(Math.abs(volume) * (METERS_PER_SCENE_UNIT * 100) ** 3).toBeCloseTo(20 * 0.02 / state.inFlightPours[0].duration_s, 4);
    useAppStore.getState().advancePourTransport(overflowWallTime(state.inFlightPours[0]));
    const next = useAppStore.getState(); wall.update(next.inFlightPours, next.vessels); air.update(next.inFlightPours);
    expect(wall.drawRange.count).toBeGreaterThan(0); expect(air.drawRange.count).toBeGreaterThan(0);
    const packet = next.inFlightPours[0], fractions = overflowLocationFractions(packet);
    expect(meshVolumeMl(wall)).toBeCloseTo(packet.sample.volume_ml * fractions.wall, 4);
    expect(meshVolumeMl(air)).toBeCloseTo(packet.sample.volume_ml * fractions.air, 4);
    wall.dispose(); air.dispose();
  });
  it('publishes a ground impact only after committing the corresponding actual spill', () => {
    setup(); dose(); let sum = 0;
    const observations: { committed: number; notified: number; position: number[] }[] = [];
    const stop = vfxBus.on('spill:impact', event => {
      sum += event.volume_ml; observations.push({ committed: groundVolume(), notified: sum, position: event.position });
    });
    try {
      useAppStore.getState().advancePourTransport(0.01); expect(observations).toHaveLength(0);
      useAppStore.getState().advancePourTransport(2); expect(sum).toBeCloseTo(20, 12);
      expect(observations).toHaveLength(24);
      for (const o of observations) { expect(o.committed).toBeCloseTo(20, 10); expect(o.notified).toBeLessThanOrEqual(o.committed + 1e-10); }
      const baseRadius = contourRadius(vesselWorldContours(useAppStore.getState().vessels.r).outer, vesselWorldDimensions(useAppStore.getState().vessels.r).bottomY);
      expect(observations.some(o => o.position[0] < -baseRadius * 0.95)).toBe(true);
      expect(observations.some(o => o.position[0] > baseRadius * 0.95)).toBe(true);
    }
    finally { stop(); }
  });
  it.each(['flask', 'test_tube'] as const)('keeps the %s mesh volume correct across contour changes, yaw and translation', type => {
    setup(2); useAppStore.getState().setVesselState('r', { type, rotationY: 1.1, position: [5, 2, -3] });
    const p = dose(); useAppStore.getState().advancePourTransport(overflowWallTime(p) + p.trajectory.timeOfFlight / 2);
    const state = useAppStore.getState(), packet = state.inFlightPours[0], f = overflowLocationFractions(packet);
    const wall = new ExteriorFilmGeometry(), air = new TransitStreamGeometry();
    wall.update(state.inFlightPours, state.vessels); air.update(state.inFlightPours);
    expect(meshVolumeMl(wall)).toBeCloseTo(packet.sample.volume_ml * f.wall, 3);
    expect(meshVolumeMl(air)).toBeCloseTo(packet.sample.volume_ml * f.air, 3);
    expect(groundVolume()).toBe(0); wall.dispose(); air.dispose();
  });
  it('survives save/reload representation and undo/redo without losing the remaining interval', async () => {
    setup(); vi.useFakeTimers(); const storage = new Map<string, string>();
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
    clearHistory(); pushHistorySnapshot('POUR', useAppStore.getState().vessels, {}, 'before', 'trước', materials());
    dose(); const p = useAppStore.getState().inFlightPours[0];
    useAppStore.getState().advancePourTransport(overflowWallTime(p) + p.trajectory.timeOfFlight + 0.04);
    const before = inventory(), saved = JSON.stringify(materials());
    pushHistorySnapshot('POUR', useAppStore.getState().vessels, {}, 'after', 'sau', materials());
    useAppStore.getState().undo(); expect(useAppStore.getState().inFlightPours).toHaveLength(0);
    useAppStore.getState().redo(); expect(JSON.stringify(materials())).toBe(saved); conserved(before);
    debounceSaveLocalState(useAppStore.getState().vessels, {}, materials()); await vi.advanceTimersByTimeAsync(1000);
    const restored = loadPersistedLabState()!;
    expect(restored.materials!.inFlightPours[0].stage).toBe('overflow');
    useAppStore.setState({ vessels: restored.vessels, ...restored.materials }); conserved(before);
    useAppStore.getState().advancePourTransport(2); expect(groundVolume()).toBeCloseTo(20, 10); conserved(before);
  });
});
