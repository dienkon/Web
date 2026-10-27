import { afterEach, describe, expect, it } from 'vitest';
import { contourWallArea, WALL_CONTACT_ANGLE, wallDropCap, wallDropMotion, wallSurfaceFrame,
  waterSurfaceTension } from '../src/science/wallDropletGeometry';
import { vesselContours } from '../src/science/vesselContours';
import { vesselInterior } from '../src/science/vesselDimensions';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';
import { transportWallBeads, type WallBead } from '../src/engine/wallDropletTransport';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { useAppStore } from '../src/store/useAppStore';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import type { VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));
const points = vesselInterior('beaker').points;
const drop = (mass_g: number, y = 0.7, theta = 0): WallBead => ({ mass_g, y, theta, sliding: false });
const options = { initialMass_g: 0, deposited_g: 0, evaporated_g: 0,
  dt: 1 / 120, points, bottom: -0.9, top: 0.9, temperature_c: 25, inner: false };
const water = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'wall_test', name: 'test', type: 'beaker',
  capacity_ml: 100, position: [0, 0, 0], rotationY: 0, isLocked: false, volume_ml: 50, mass_g: 50,
  volume: 0.5, temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
  substances: ['H2O'], contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }], ...patch });

describe('Glass geometry and finite cap shape', () => {
  it('integrates cylinder and frustum lateral area without counting the floor', () => {
    expect(contourWallArea([[0, 0], [2, 0], [2, 3]], 0, 3)).toBeCloseTo(12 * Math.PI, 12);
    expect(contourWallArea([[2, 0], [1, 3]], 0, 3)).toBeCloseTo(3 * Math.PI * Math.sqrt(10), 12);
    expect(contourWallArea([[2, 0], [1, 3]], 0, 1) + contourWallArea([[2, 0], [1, 3]], 1, 3))
      .toBeCloseTo(contourWallArea([[2, 0], [1, 3]], 0, 3), 12);
    expect(contourWallArea([[2, 0], [1, 3]], 4, 5)).toBe(0);
  });
  it.each(['beaker', 'flask', 'volumetric_flask'])('uses orthogonal normals on the actual %s wall', type => {
    const shape = vesselInterior(type);
    for (const y of [shape.floorY + 0.1, 0.2, shape.topY - 0.1]) {
      const f = wallSurfaceFrame(shape.points, y, 0.3);
      expect(Math.hypot(...f.normal)).toBeCloseTo(1, 12);
      expect(Math.hypot(...f.tangent)).toBeCloseTo(1, 12);
      expect(f.normal.reduce((s, n, i) => s + n * f.tangent[i], 0)).toBeCloseTo(0, 12);
    }
    if (type === 'flask') expect(wallSurfaceFrame(shape.points, 0.2, 0).normal[1]).toBeGreaterThan(0);
  });
  it('assigns cap volume from mass, rather than drawing a full sphere across the glass', () => {
    for (const mass of [1e-6, 0.001, 0.1]) {
      const cap = wallDropCap(mass), h = cap.height_m;
      const volume = Math.PI * h * h * (cap.radius_m - h / 3);
      expect(volume * 1e6).toBeCloseTo(mass, 12);
      expect(cap.contactRadius_m).toBeCloseTo(cap.radius_m * Math.sin(WALL_CONTACT_ANGLE), 12);
      expect(h).toBeLessThan(cap.radius_m);
    }
  });
  it('uses temperature-dependent surface tension and force-dependent mobility', () => {
    expect(waterSurfaceTension(20)).toBeCloseTo(0.07274, 4);
    expect(waterSurfaceTension(100)).toBeCloseTo(0.05891, 4);
    expect(wallDropMotion(1e-6, 25, 1).speed_m_s).toBe(0);
    const vertical = wallDropMotion(0.1, 25, 1), shallow = wallDropMotion(0.1, 25, 20);
    expect(vertical.drive_N).toBeGreaterThan(vertical.retention_N);
    expect(vertical.speed_m_s).toBeGreaterThan(0);
    expect(shallow.speed_m_s).toBeLessThan(vertical.speed_m_s);
  });
});

describe('Authoritative wall beads never recycle old water', () => {
  it('does not move a pinned drop or mutate its input snapshot', () => {
    const previous = [drop(1e-6)], snapshot = JSON.stringify(previous);
    const out = transportWallBeads({ ...options, previous, initialMass_g: 1e-6, dt: 2 });
    expect(out.beads[0].y).toBe(0.7);
    expect(out.retained_g).toBeCloseTo(1e-6, 15);
    expect(out.drained_g).toBe(0);
    expect(JSON.stringify(previous)).toBe(snapshot);
  });
  it('drains a mobile drop once at the lower boundary and does not recreate it above', () => {
    const out = transportWallBeads({ ...options, previous: [drop(0.1)], initialMass_g: 0.1, dt: 1 });
    expect(out.drained_g).toBeCloseTo(0.1, 12);
    expect(out.retained_g).toBeCloseTo(0, 12);
    const next = transportWallBeads({ ...options, previous: out.beads, initialMass_g: out.retained_g, dt: 2 });
    expect(next.drained_g).toBe(0);
    expect(next.retained_g).toBe(0);
    expect(next.beads.filter(b => b.mass_g > 0)).toHaveLength(0);
  });
  it('creates new beads only from explicit new condensate after drainage', () => {
    const out = transportWallBeads({ ...options, deposited_g: 0.001 });
    expect(out.retained_g + out.drained_g).toBeCloseTo(0.001, 12);
    expect(out.beads.some(b => b.mass_g > 0)).toBe(true);
    expect(transportWallBeads({ ...options }).retained_g).toBe(0);
  });
  it('merges across the periodic seam without creating mass or moving through the opposite side', () => {
    const previous = [drop(0.001, 0.4, 0.001), drop(0.001, 0.4, Math.PI * 2 - 0.001)];
    const out = transportWallBeads({ ...options, previous, initialMass_g: 0.002 });
    const alive = out.beads.filter(b => b.mass_g > 0);
    expect(alive).toHaveLength(1);
    expect(alive[0].mass_g).toBeCloseTo(0.002, 12);
    expect(Math.cos(alive[0].theta)).toBeCloseTo(1, 10);
    expect(alive[0].y).toBeCloseTo(0.4, 10);
  });
  it('preserves bead position when the sample level drops instead of rescaling its height', () => {
    const previous = [drop(1e-6, 0.7)];
    const out = transportWallBeads({ ...options, previous, initialMass_g: 1e-6, top: 0.2 });
    expect(out.beads[0].y).toBe(0.7);
  });
  it('limits inner return by receiver capacity and retains the exact remainder', () => {
    const out = transportWallBeads({ ...options, inner: true, bottom: 0.6, previous: [drop(0.001, 0.5)],
      initialMass_g: 0.001, maximumDrain_g: 0.0004 });
    expect(out.drained_g).toBeCloseTo(0.0004, 12);
    expect(out.retained_g).toBeCloseTo(0.0006, 12);
    expect(out.retained_g + out.drained_g).toBeCloseTo(0.001, 12);
  });
  it('bounds competing evaporation and drainage by finite available water', () => {
    const out = transportWallBeads({ ...options, previous: [drop(0.1)], initialMass_g: 0.1,
      evaporated_g: 1, dt: 1 });
    expect(out.retained_g).toBeGreaterThanOrEqual(0);
    expect(out.evaporated_g + out.drained_g + out.retained_g).toBeCloseTo(0.1, 12);
  });
  it('matches the substep history at 30, 60 and 120 Hz with deposition, coalescence and drainage', () => {
    const run = (hz: number) => {
      let previous: WallBead[] | undefined, retained = 0, drained = 0, evaporated = 0;
      for (let i = 0; i < hz * 2; i++) {
        const out = transportWallBeads({ ...options, previous, initialMass_g: retained,
          deposited_g: 0.5 / hz, evaporated_g: 0.002 / hz, dt: 1 / hz });
        previous = out.beads; retained = out.retained_g; drained += out.drained_g; evaporated += out.evaporated_g;
      }
      return { previous, retained, drained, evaporated };
    };
    const expected = run(120);
    expect(expected.drained).toBeGreaterThan(0);
    for (const hz of [30, 60]) {
      const actual = run(hz);
      expect(actual.retained).toBeCloseTo(expected.retained, 10);
      expect(actual.drained).toBeCloseTo(expected.drained, 10);
      expect(actual.retained + actual.drained + actual.evaporated).toBeCloseTo(1, 10);
    }
  });
  it.each([0, -1, NaN, Infinity])('does not consume sources or move beads at invalid time %s', dt => {
    const previous = [drop(0.001)];
    const out = transportWallBeads({ ...options, previous, initialMass_g: 0.001, dt, deposited_g: 1 });
    expect(out.beads).toEqual(previous);
    expect(out.retained_g).toBe(0.001);
    expect(out.drained_g).toBe(0);
  });
});

describe('Wall inventories and store integration', () => {
  it('uses the displaced liquid surface for inner-bead contact in an ice-water sample', () => {
    const bare = water(), v = water({ temperature_c: 0,
      contents: [...bare.contents, { formula: 'H2O', phase: 's', mass_g: 5, moles: 5 / 18.015 }] });
    const y = (vesselLiquidSurfaceY(bare) + vesselLiquidSurfaceY(v)) / 2;
    v.wallCondensation = { ...stepWallCondensation(v, 0, 0).wall, inner_g: 1e-6, innerBeads: [drop(1e-6, y)] };
    const out = stepWallCondensation(v, 1 / 120, 0);
    expect(out.returnedStep_g).toBeCloseTo(1e-6, 12);
    expect(out.availableVapor_g).toBe(0);
  });
  it('keeps beads equal to the ledger and conserves vapor, wall water and return', () => {
    let v = water({ temperature_c: 95 }), totalSource = 0;
    for (let i = 0; i < 60; i++) {
      const source = 0.01 / 60, out = stepWallCondensation(v, 1 / 60, source);
      totalSource += source;
      expect(out.wall.innerBeads!.reduce((sum, b) => sum + b.mass_g, 0)).toBeCloseTo(out.wall.inner_g, 12);
      totalSource -= out.availableVapor_g + out.returnedStep_g;
      expect(out.wall.inner_g).toBeCloseTo(totalSource, 12);
      v = { ...v, wallCondensation: out.wall };
    }
  });
  it('does not export internal wall evaporation from a sealed vessel', () => {
    const v = water({ temperature_c: 5, isSealed: true });
    v.wallCondensation = { ...stepWallCondensation(v, 0, 0).wall, inner_g: 0.001 };
    const out = stepWallCondensation(v, 0.1, 0);
    expect(out.availableVapor_g).toBe(0);
    expect(out.wall.heatRejected_J).toBe(0);
    expect(out.wall.inner_g + out.returnedStep_g).toBeCloseTo(0.001, 12);
  });
  it('honors per-vessel humidity and evaporates existing outer beads after the liquid is removed', () => {
    const dry = water({ temperature_c: 5, effectsEnvironment: { relativeHumidity: 0 } });
    expect(stepWallCondensation(dry, 1, 0).wall.outer_g).toBe(0);
    let wet = water({ temperature_c: 5 });
    wet = { ...wet, wallCondensation: stepWallCondensation(wet, 1, 0).wall };
    wet = { ...wet, temperature_c: 25, volume_ml: 0, volume: 0, contents: [],
      effectsEnvironment: { relativeHumidity: 0.1 } };
    const out = stepWallCondensation(wet, 1, 0);
    expect(out.wall.ambientReleased_g).toBeGreaterThan(0);
    expect(out.wall.outer_g + out.drainedStep_g + out.wall.ambientReleased_g)
      .toBeCloseTo(wet.wallCondensation!.outer_g, 12);
  });
  it('returns water to the targeted sample once and preserves the state on pause', () => {
    const a = water(), b = water({ id: 'other', environment: DEFAULT_LAB_ENVIRONMENT });
    a.wallCondensation = { ...stepWallCondensation(a, 0, 0).wall,
      inner_g: 0.001, innerBeads: [drop(0.001, -0.5)] };
    useAppStore.setState({ vessels: { [a.id]: a, [b.id]: b }, vesselIds: [a.id, b.id],
      activeKinetics: {}, burners: {}, pendingReactions: {}, dissolvingSubstances: {},
      isSimulationPaused: false, timeScale: 1 });
    useAppStore.getState().tickSimulation(1 / 60);
    const result = useAppStore.getState().vessels[a.id];
    expect(result.wallCondensation!.returned_g).toBeCloseTo(0.001, 12);
    expect(result.contents.find(c => c.formula === 'H2O')!.mass_g).toBeGreaterThan(50);
    expect(useAppStore.getState().vessels[b.id].wallCondensation!.returned_g).toBe(0);
    useAppStore.setState({ isSimulationPaused: true });
    const before = useAppStore.getState().vessels;
    useAppStore.getState().tickSimulation(0.1);
    expect(useAppStore.getState().vessels).toBe(before);
  });
});
