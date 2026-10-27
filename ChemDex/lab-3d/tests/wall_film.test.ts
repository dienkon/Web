import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { PourController } from '../src/pour/controller/PourController';
import { pourTargetPose, type PourParcel } from '../src/engine/pourTransport';
import { createWallFilm, wallTimeAtHeight, wallWorldPoint } from '../src/engine/wallFilm';
import { liquidWaterViscosity_Pa_s, nusseltFilm } from '../src/science/liquidTransport';
import { traceLaunchedStream } from '../src/pour/physics/ballistics';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';
import { calculateVesselMass, LAB_PHYSICS } from '../src/engine/interactionEngine';
import { availableLiquidVolume } from '../src/handling/solidOccupancy';
import { computeMolarMass } from '../src/engine/ledger';
import { readComposition } from '../src/science/balance';
import { WallFilmGeometry } from '../src/pour/render/wallFilmGeometry';
import { TransitStreamGeometry } from '../src/pour/render/transitGeometry';
import { clearHistory, debounceSaveLocalState, loadPersistedLabState, pushHistorySnapshot } from '../src/store/persistence';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';
import { vfxBus } from '../src/vfx/bus';

const original = useAppStore.getState();
afterEach(() => {
  useAppStore.setState({ ...original, pourEpoch: useAppStore.getState().pourEpoch + 1 }, true);
  PourController.getSession(); useAppStore.setState(original, true);
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); clearHistory();
});
const item = (formula: string, mass_g: number, phase: string): SubstanceContent => ({ formula, mass_g, phase,
  moles: mass_g / computeMolarMass(formula) });
const vessel = (id: string, volume_ml: number, type: VesselState['type'], contents = [item('H2O', volume_ml, 'l')]): VesselState => ({
  id, type, name: id, position: [0, -0.135, 0], rotationY: 0, isLocked: false, tare_g: 50,
  capacity_ml: 100, volume_ml, volume: volume_ml / 100, contents, substances: contents.map(c => c.formula),
  mass_g: contents.reduce((sum, c) => sum + c.mass_g, 0), density_g_ml: 1, temperature_c: 25,
  ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false, liquidColor: '#55bbdd',
});
function setup(acidBase = false) {
  const source = vessel('source', 10, 'beaker', [item('H2O', 10, 'l'), ...(acidBase ? [item('HCl', computeMolarMass('HCl') * 0.001, 'aq')] : [])]);
  const target = { ...vessel('target', 20, 'flask', [item('H2O', 20, 'l'), ...(acidBase ? [item('NaOH', computeMolarMass('NaOH') * 0.002, 'aq')] : [])]), ph: acidBase ? 13 : 7 };
  useAppStore.setState({ vessels: { source, target }, vesselIds: ['source', 'target'], burners: {}, spills: {},
    activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, inFlightPours: [], wasteContents: [], wasteMass_g: 0,
    pourEpoch: useAppStore.getState().pourEpoch + 1, isSimulationPaused: false, timeScale: 1 });
  PourController.getSession();
  return { source, target };
}
function launch(volume = 0.1, duration_s = 0.02): PourParcel {
  const target = useAppStore.getState().vessels.target, profile = getVesselProfile(target.type, target.capacity_ml);
  const trajectory = traceLaunchedStream([0.3, 3, 0], [0.4, 0, 0], { id: target.id, position: target.position, profile,
    mouthR: profile.mouthR, mouthY: target.position[1] + profile.lipLocal[1],
    liquidSurfaceY: target.position[1] + vesselLiquidSurfaceY(target) }, LAB_PHYSICS.TABLE_SURFACE_Y);
  expect(trajectory.detailKind).toBe('wall_inner');
  expect(useAppStore.getState().releasePourLiquid({ id: 'wall_test', sessionId: 'wall_session', sourceId: 'source',
    sourceName: 'source', targetId: target.id, targetPose: pourTargetPose(target), duration_s, trajectory }, volume)).toBe(volume);
  return useAppStore.getState().inFlightPours[0];
}
function wetWall(): PourParcel {
  const air = launch();
  useAppStore.getState().advancePourTransport(air.trajectory.timeOfFlight + air.duration_s + 1e-8);
  const film = useAppStore.getState().inFlightPours.find(p => p.stage === 'wall')!;
  expect(film).toBeDefined(); return film;
}
function inventory() {
  const s = useAppStore.getState(), atoms: Record<string, number> = {};
  const parts = [...Object.values(s.vessels), ...s.inFlightPours.map(p => p.sample), ...Object.values(s.spills),
    { mass_g: s.wasteMass_g, contents: s.wasteContents }];
  for (const part of parts) for (const c of part.contents ?? []) for (const [symbol, count] of Object.entries(readComposition(c.formula).atoms)) {
    atoms[symbol] = (atoms[symbol] ?? 0) + c.moles * count;
  }
  return { mass: parts.reduce((sum, p) => sum + p.mass_g, 0), atoms };
}
function conserved(before: ReturnType<typeof inventory>) {
  const now = inventory(); expect(now.mass).toBeCloseTo(before.mass, 9);
  for (const [symbol, count] of Object.entries(before.atoms)) expect(now.atoms[symbol]).toBeCloseTo(count, 10);
}
function materials() {
  const s = useAppStore.getState();
  return { inFlightPours: s.inFlightPours, spills: s.spills, wasteMass_g: s.wasteMass_g, wasteContents: s.wasteContents };
}

describe('Liquid transport properties from primary sources', () => {
  it.each([[260, 3058.36075], [298.15, 889.996774], [375, 276.207245]])('matches IAPWS Table 8 at %s K', (kelvin, microPa) => {
    expect(liquidWaterViscosity_Pa_s(kelvin - 273.15)).toBeCloseTo(microPa * 1e-6, 10);
  });
  it('rejects extrapolation and invalid film inputs', () => {
    for (const t of [-20.01, 110.01, NaN, Infinity]) expect(liquidWaterViscosity_Pa_s(t)).toBeNull();
    expect(nusseltFilm(0, 0.01, 1000, 0.001, 9.8)).toBeNull();
    expect(nusseltFilm(1e-6, 0.01, 1000, 0.001, 0)).toBeNull();
  });
  it('satisfies the integrated no-slip/shear-free velocity profile and changes with viscosity', () => {
    const film = nusseltFilm(1e-6, 0.01, 1000, 0.001, 9.8)!;
    // Integrate u(z) = rho*g*(h*z - z²/2)/mu across the film independently.
    let flux = 0; const dz = film.thickness_m / 10000;
    for (let i = 0; i < 10000; i++) {
      const z = (i + 0.5) * dz;
      flux += 1000 * 9.8 / 0.001 * (film.thickness_m * z - z * z / 2) * dz * 0.01;
    }
    expect(flux).toBeCloseTo(1e-6, 13);
    const viscous = nusseltFilm(1e-6, 0.01, 1000, 0.008, 9.8)!;
    expect(viscous.thickness_m).toBeCloseTo(film.thickness_m * 2, 12);
    expect(viscous.meanVelocity_m_s).toBeCloseTo(film.meanVelocity_m_s / 2, 12);
  });
});

describe('Finite wall coating before chemical contact', () => {
  it('keeps reagent on dry glass out of bulk chemistry, then neutralizes only when it reaches the pool', () => {
    const { target } = setup(true), before = inventory(), film = wetWall();
    let v = useAppStore.getState().vessels.target;
    expect(v.contents).toBe(target.contents);
    expect(v.temperature_c).toBe(25); expect(v.ph).toBe(13);
    expect(v.volume_ml).toBe(20); expect(v.wallCoating_ml).toBeCloseTo(0.1, 10);
    expect(calculateVesselMass(v)).toBeCloseTo(50 + target.mass_g + film.sample.mass_g, 10);
    expect(useAppStore.getState().activeKinetics.target).toBeUndefined();
    conserved(before);
    const travel = wallTimeAtHeight(film.wallFilm!, vesselLiquidSurfaceY(v));
    expect(travel).toBeGreaterThan(0);
    useAppStore.getState().advancePourTransport(travel / 2);
    expect(useAppStore.getState().vessels.target.contents).toBe(target.contents);
    const observed: number[] = [], stop = useAppStore.subscribe(() => observed.push(inventory().mass));
    try { useAppStore.getState().advancePourTransport(travel + film.duration_s); } finally { stop(); }
    v = useAppStore.getState().vessels.target;
    expect(v.contents.find(c => c.formula === 'NaOH')!.moles).toBeCloseTo(0.00199, 10);
    expect(v.temperature_c).toBeGreaterThan(25);
    expect(v.wallCoating_ml).toBeCloseTo(0, 10);
    expect(useAppStore.getState().inFlightPours).toHaveLength(0);
    for (const mass of observed) expect(mass).toBeCloseTo(before.mass, 9);
    conserved(before);
  });

  it('counts wall liquid against capacity of subsequent pours without raising the bulk surface', () => {
    const { target } = setup(), beforeSurface = vesselLiquidSurfaceY(target); wetWall();
    let v = useAppStore.getState().vessels.target;
    expect(vesselLiquidSurfaceY(v)).toBe(beforeSurface);
    expect(availableLiquidVolume(v)).toBeCloseTo(79.9, 10);
    const filler = vessel('filler', 100, 'beaker');
    useAppStore.setState(s => ({ vessels: { ...s.vessels, filler } }));
    const before = inventory();
    useAppStore.getState().transferLiquidContinuous('filler', 'target', 100);
    v = useAppStore.getState().vessels.target;
    expect(v.volume_ml).toBeCloseTo(99.9, 9);
    expect(v.wallCoating_ml).toBeCloseTo(0.1, 10);
    useAppStore.getState().advancePourTransport(1);
    expect(useAppStore.getState().vessels.target.volume_ml).toBeCloseTo(100, 9);
    conserved(before);
  });

  it('carries coating with a moved vessel and drains inside a subsequently closed vessel', () => {
    setup(); const before = inventory(), film = wetWall();
    const point = wallWorldPoint(film.wallFilm!, 0.01, useAppStore.getState().vessels.target);
    useAppStore.setState(s => ({ vessels: { ...s.vessels, target: { ...s.vessels.target,
      position: [8, 0.865, 2], rotationY: 0, isSealed: true } } }));
    const moved = wallWorldPoint(film.wallFilm!, 0.01, useAppStore.getState().vessels.target);
    expect(moved[0] - point[0]).toBeCloseTo(8, 12); expect(moved[1] - point[1]).toBeCloseTo(1, 12);
    expect(moved[2] - point[2]).toBeCloseTo(2, 12);
    useAppStore.getState().advancePourTransport(1);
    expect(useAppStore.getState().vessels.target.volume_ml).toBeCloseTo(20.1, 9);
    expect(Object.keys(useAppStore.getState().spills)).toHaveLength(0);
    conserved(before);
  });

  it.each(['removed', 'replaced'] as const)('detaches remaining coating when its glass is %s and preserves its matter', mode => {
    setup(); const before = inventory(); wetWall();
    if (mode === 'removed') {
      // Empty the bulk into an existing receiver before removing the apparatus.
      const waste = vessel('waste', 0, 'beaker', []);
      useAppStore.setState(s => ({ vessels: { ...s.vessels, waste } }));
      useAppStore.getState().transferLiquidContinuous('target', 'waste', 20);
      useAppStore.getState().removeVessel('target');
    } else {
      useAppStore.getState().shatterVessel('target');
      useAppStore.getState().replaceShatteredVessel('target');
    }
    useAppStore.getState().advancePourTransport(1 / 60);
    expect(useAppStore.getState().inFlightPours.every(p => p.stage !== 'wall')).toBe(true);
    useAppStore.getState().advancePourTransport(1);
    expect(useAppStore.getState().vessels.target?.volume_ml ?? 0).toBe(0);
    expect(Object.values(useAppStore.getState().spills).reduce((sum, s) => sum + s.volume_ml, 0)).toBeCloseTo(mode === 'removed' ? 0.1 : 20.1, 8);
    conserved(before);
  });

  it('does not copy the original glass coating to a duplicated container', () => {
    setup(); wetWall(); useAppStore.getState().duplicateVessel('target');
    const copy = Object.values(useAppStore.getState().vessels).find(v => v.id !== 'target' && v.id !== 'source')!;
    expect(copy.wallCoating_ml).toBe(0); expect(copy.wallCoatingMass_g).toBe(0);
    expect(calculateVesselMass(copy)).toBeCloseTo(50 + 20, 10);
  });

  it('freezes wall transit during pause and advances it on the shared scaled clock', () => {
    setup(); const film = wetWall(), queue = useAppStore.getState().inFlightPours;
    useAppStore.setState({ isSimulationPaused: true });
    PourController.tick(0.1, undefined, false, 8);
    expect(useAppStore.getState().inFlightPours).toBe(queue);
    useAppStore.setState({ isSimulationPaused: false }); PourController.tick(1 / 60, undefined, false, 0.5);
    expect(useAppStore.getState().inFlightPours[0].elapsed_s).toBe(0);
    PourController.tick(1 / 60, undefined, false, 0.5);
    expect(useAppStore.getState().inFlightPours[0].elapsed_s).toBeCloseTo(1 / 60, 12);
    expect(film.elapsed_s).toBe(0);
  });

  it('produces a pool impact after wall travel rather than a ripple at the dry wall', () => {
    setup(); wetWall(); const impacts: number[][] = [], stop = vfxBus.on('pour:impact', e => impacts.push(e.position));
    try {
      expect(impacts).toHaveLength(0);
      for (let i = 0; i < 120 && useAppStore.getState().inFlightPours.length; i++) PourController.tick(1 / 60);
      expect(impacts.length).toBeGreaterThan(0);
      const v = useAppStore.getState().vessels.target;
      for (const point of impacts) expect(Math.abs(point[1] - (v.position[1] + vesselLiquidSurfaceY(v)))).toBeLessThan(0.002);
    } finally { stop(); }
  });

  it('uses water viscosity with temperature and labels other liquids as lacking a viscosity model', () => {
    setup(); const air = launch(0.0001, 0.1), target = useAppStore.getState().vessels.target;
    const cold = createWallFilm(air, { ...air.sample, temperature_c: 10 }, target)!;
    const warm = createWallFilm(air, { ...air.sample, temperature_c: 70 }, target)!;
    expect(cold.wallFilm!.viscosityBasis).toBe('pure_water_iapws');
    expect(warm.wallFilm!.points.at(-1)!.time_s).toBeLessThan(cold.wallFilm!.points.at(-1)!.time_s);
    const ethanol = createWallFilm(air, { ...air.sample, contents: [item('C2H5OH', air.sample.mass_g, 'l')] }, target)!;
    expect(ethanol.wallFilm!.viscosityBasis).toBe('unavailable');
    expect(ethanol.wallFilm!.model).toBe('inviscid_travel_lower_bound');
  });

  it('restores coating and its remaining transit through save, undo and redo', () => {
    vi.useFakeTimers(); const data = new Map<string, string>();
    vi.stubGlobal('window', {}); vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v) });
    setup(); const before = inventory(); wetWall();
    let s = useAppStore.getState();
    debounceSaveLocalState(s.vessels, s.burners, materials()); vi.advanceTimersByTime(1001);
    const saved = loadPersistedLabState()!;
    expect(saved.materials!.inFlightPours[0].stage).toBe('wall');
    expect(saved.vessels.target.wallCoating_ml).toBeCloseTo(0.1, 10);
    clearHistory(); pushHistorySnapshot('POUR', s.vessels, s.burners, 'On glass', 'Trên thành', materials());
    s.advancePourTransport(1); s = useAppStore.getState();
    pushHistorySnapshot('POUR', s.vessels, s.burners, 'In pool', 'Trong dung dịch', materials());
    s.undo(); expect(useAppStore.getState().vessels.target.volume_ml).toBe(20);
    expect(useAppStore.getState().vessels.target.wallCoating_ml).toBeCloseTo(0.1, 10); conserved(before);
    useAppStore.getState().redo(); conserved(before);
    useAppStore.setState({ vessels: saved.vessels, ...saved.materials });
    useAppStore.getState().advancePourTransport(1);
    expect(useAppStore.getState().vessels.target.volume_ml).toBeCloseTo(20.1, 10); conserved(before);
  });

  it('draws a finite ribbon on the inner contour and follows the vessel without a phantom ballistic stream', () => {
    setup(); const film = wetWall(), target = useAppStore.getState().vessels.target;
    const travel = wallTimeAtHeight(film.wallFilm!, vesselLiquidSurfaceY(target));
    useAppStore.getState().advancePourTransport(travel * 0.5);
    const s = useAppStore.getState(), wall = new WallFilmGeometry(), air = new TransitStreamGeometry();
    wall.update(s.inFlightPours, s.vessels); air.update(s.inFlightPours);
    expect(wall.drawRange.count).toBeGreaterThan(0); expect(air.drawRange.count).toBe(0);
    const positions = wall.attributes.position, profile = getVesselProfile(target.type, target.capacity_ml);
    const used = wall.drawRange.count / 24 * 8;
    for (let i = 0; i < used; i++) {
      const y = positions.getY(i) - target.position[1], radius = Math.hypot(positions.getX(i) - target.position[0], positions.getZ(i) - target.position[2]);
      expect(y).toBeGreaterThanOrEqual(vesselLiquidSurfaceY(target) - 1e-6);
      expect(radius).toBeLessThanOrEqual(profile.r(y) + 1e-6);
    }
    const firstX = positions.getX(0);
    wall.update(s.inFlightPours, { ...s.vessels, target: { ...s.vessels.target, position: [3, -0.135, 0] } });
    expect(wall.attributes.position.getX(0) - firstX).toBeCloseTo(3, 5);
    wall.update([], s.vessels); expect(wall.drawRange.count).toBe(0);
    wall.dispose(); air.dispose();
  });

  it('keeps whole triangles inside glass when a finite coating interval crosses the neck shoulder', () => {
    setup(); const film = wetWall(), target = useAppStore.getState().vessels.target;
    const neckTime = wallTimeAtHeight(film.wallFilm!, 0.7);
    const crossing = { ...film, elapsed_s: neckTime + film.duration_s * 0.37 };
    const geometry = new WallFilmGeometry(); geometry.update([crossing], { target });
    const positions = geometry.attributes.position, indices = geometry.index!, profile = getVesselProfile(target.type, target.capacity_ml);
    expect(geometry.drawRange.count).toBeGreaterThan(0);
    for (let i = 0; i < geometry.drawRange.count; i += 3) {
      const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
      for (const weights of [[1 / 3, 1 / 3, 1 / 3], [0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5]]) {
        const x = ids.reduce((sum, id, k) => sum + positions.getX(id) * weights[k], 0) - target.position[0];
        const y = ids.reduce((sum, id, k) => sum + positions.getY(id) * weights[k], 0) - target.position[1];
        const z = ids.reduce((sum, id, k) => sum + positions.getZ(id) * weights[k], 0) - target.position[2];
        expect(Math.hypot(x, z)).toBeLessThanOrEqual(profile.r(y) + 1e-6);
      }
    }
    geometry.dispose();
  });
});
