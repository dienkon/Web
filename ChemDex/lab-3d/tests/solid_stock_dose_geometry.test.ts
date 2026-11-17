import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { ReactElement } from 'react';
import type { VesselState } from '../src/types/chemistry';
import { useAppStore } from '../src/store/useAppStore';
import { planSolidStockDose, solidStockDoseProblem, solidStockFlightPosition } from '../src/handling/solidStockDose';
import { getWorldVesselProfile } from '../src/pour/physics/profiles';
import { createStockSolidGeometry, geometryVolume, stockSolidChunkCount } from '../src/science/stockSolidGeometry';
import { findChemical, getSolidMorphology } from '../src/data/chemicals';
import { CENTIMETERS_PER_SCENE_UNIT, METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import { PRNG, seedForLabel } from '../src/core/rng';
import { fallingContactTime } from '../src/handling/doseTiming';

const harness = vi.hoisted(() => ({ frame: null as null | ((state: unknown, dt: number) => void), cleanups: [] as (() => void)[] }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const hooks = { memo: (fn: unknown) => fn, useRef: (current: unknown) => ({ current }),
    useMemo: (factory: () => unknown) => factory(),
    useEffect: (effect: () => void | (() => void)) => { const cleanup = effect(); if (cleanup) harness.cleanups.push(cleanup); } };
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});
vi.mock('@react-three/fiber', () => ({ useFrame: (frame: typeof harness.frame) => { harness.frame = frame; } }));
vi.mock('../src/store/useAppStore', async () => {
  const actual = await vi.importActual<typeof import('../src/store/useAppStore')>('../src/store/useAppStore');
  const store = actual.useAppStore;
  return { ...actual, useAppStore: Object.assign((selector: (state: ReturnType<typeof store.getState>) => unknown) => selector(store.getState()), store) };
});
import { AddingAnimation } from '../src/components/three/PouringBottle';
const original = useAppStore.getState();
afterEach(() => { harness.cleanups.splice(0).forEach(cleanup => cleanup()); useAppStore.setState(original, true); harness.frame = null; });
const vessel = (type: VesselState['type'] = 'volumetric_flask', capacity_ml = 100): VesselState => ({
  id: 'receiver', name: 'receiver', type, capacity_ml, position: [2, -.135, -1], rotationY: .4, isLocked: false,
  contents: [], substances: [], mass_g: 0, volume_ml: 0, volume: 0, temperature_c: 25, ph: 7,
  hasPrecipitate: false, hasGas: false, isBoiling: false,
});

describe('Finite stock follows the actual vessel opening', () => {
  it('reproduces the old narrow-mouth miss before testing the finite corrected path', () => {
    const v = vessel(), p = getWorldVesselProfile(v.type, v.capacity_ml), rng = new PRNG(seedForLabel('receiver:1:Fe'));
    let misses = 0;
    for (let i = 0; i < 28; i++) {
      const angle = i * 2.39996, r = Math.sqrt((i + 1) / 28) * p.mouthR * .42;
      const x = .15 + Math.cos(angle) * r + (rng.next() - .5) * .5 * fallingContactTime(.55);
      const z = Math.sin(angle) * r + (rng.next() - .5) * .5 * fallingContactTime(.55);
      for (let j = 0; j < 3; j++) rng.next();
      if (Math.hypot(x, z) > p.mouthR) misses++;
    }
    expect(misses).toBeGreaterThan(0);
    const plan = planSolidStockDose(v, 'Fe', .1)!;
    expect(plan).not.toBeNull();
    let minimumFloorClearance = Infinity, maximumWallPenetration = -Infinity;
    for (const flight of plan.flights) for (let step = 0; step <= 160; step++) {
      const center = solidStockFlightPosition(flight, flight.flightTime * step / 160);
      for (const vertex of plan.vertices) {
        const x = center[0] - v.position[0] + vertex[0], y = center[1] - v.position[1] + vertex[1], z = center[2] - v.position[2] + vertex[2];
        if (y > p.baseY + p.H) continue;
        minimumFloorClearance = Math.min(minimumFloorClearance, y - p.baseY);
        maximumWallPenetration = Math.max(maximumWallPenetration, Math.hypot(x, z) - p.r(y));
      }
    }
    expect(minimumFloorClearance).toBeGreaterThanOrEqual(-1e-8);
    expect(maximumWallPenetration).toBeLessThanOrEqual(1e-7);
  });

  it.each([['test_tube', 10], ['flask', 100], ['beaker', 100], ['volumetric_flask', 100]] as const)(
    'preserves exact material volume in %s without shrinking grains to fit', (type, capacity) => {
      const amount = .1, v = vessel(type, capacity), plan = planSolidStockDose(v, 'Fe', amount)!;
      const geometry = createStockSolidGeometry(getSolidMorphology('Fe'), 'Fe');
      expect(geometryVolume(geometry) * plan.scale ** 3 * plan.count * CENTIMETERS_PER_SCENE_UNIT ** 3)
        .toBeCloseTo(amount / findChemical('Fe').density!, 8);
      expect(plan.flights.reduce((sum, flight) => sum + flight.mass_g, 0)).toBeCloseTo(amount, 12);
      geometry.dispose();
    });

  it('keeps a whole nail vertical when that fits, and rejects genuinely oversized stock', () => {
    const v = vessel();
    expect(planSolidStockDose(v, 'Fe (nail)', .1)).not.toBeNull();
    expect(planSolidStockDose(v, 'Fe (nail)', 1000)).toBeNull();
    expect(solidStockDoseProblem(v, 'Fe (nail)', 1000)).toContain('miệng bình');
    expect(solidStockDoseProblem({ ...v, rotationZ: .3 }, 'Fe', .1)).toContain('thẳng đứng');
  });

  it('stops each grain when its first material point meets liquid without crediting center-depth penetration', () => {
    const empty = vessel('beaker'), v = { ...empty, volume_ml: 50, volume: .5, mass_g: 50,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }], substances: ['H2O'] };
    const plan = planSolidStockDose(v, 'Fe', .1)!;
    expect(plan.flights.every(flight => flight.contactKind === 'liquid')).toBe(true);
    const bottom = Math.min(...plan.vertices.map(point => point[1]));
    for (const flight of plan.flights) {
      expect(flight.contact[1] + bottom).toBeCloseTo(flight.liquidSurfaceY!, 12);
      expect(solidStockFlightPosition(flight, flight.flightTime + 1)).toEqual(flight.contact);
    }
  });

  it('hands the visible exact pose to the contact transaction once, with pause and finite grams', () => {
    const v = vessel(), contacts: { fraction: number; pieces: import('../src/physical/stockTypes').StockContactBirth[] }[] = [];
    useAppStore.setState({ vessels: { [v.id]: v }, isSimulationPaused: false, timeScale: 1,
      advancePourContact: async (_id, fraction, pieces) => { contacts.push({ fraction, pieces: pieces ?? [] }); } });
    type Element = ReactElement<{ ref?: { current: unknown }; children?: unknown; name?: string }>;
    const tree = (AddingAnimation as unknown as (props: unknown) => Element)({ doseId: 1, chemical: 'Fe', targetId: v.id, amount: .1, onComplete: vi.fn() });
    const nodes = tree.props.children as Element[];
    nodes[0].props.ref!.current = new THREE.Group();
    const geometry = createStockSolidGeometry(getSolidMorphology('Fe'), 'Fe');
    const airborne = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial(), stockSolidChunkCount(getSolidMorphology('Fe')));
    nodes[1].props.ref!.current = airborne;
    const plan = planSolidStockDose(v, 'Fe', .1)!, first = plan.flights[0], matrix = new THREE.Matrix4();
    for (let i = 0; i < 17; i++) harness.frame!({}, 1 / 60);
    airborne.getMatrixAt(0, matrix);
    const point = new THREE.Vector3().setFromMatrixPosition(matrix);
    expect(point.distanceTo(new THREE.Vector3(...solidStockFlightPosition(first, 17 / 60 - first.releaseAt)))).toBeLessThan(1e-6);
    const held = matrix.elements.slice(); useAppStore.setState({ isSimulationPaused: true });
    harness.frame!({}, .1); airborne.getMatrixAt(0, matrix); expect(matrix.elements).toEqual(held);
    useAppStore.setState({ isSimulationPaused: false });
    for (let i = 0; i < 200; i++) harness.frame!({}, 1 / 60);
    const births = contacts.flatMap(event => event.pieces);
    expect(births).toHaveLength(plan.count); expect(contacts.at(-1)?.fraction).toBe(1);
    expect(births.reduce((sum, piece) => sum + piece.mass_g, 0)).toBeCloseTo(.1, 12);
    births.forEach((piece, i) => {
      expect(piece.rotation).toEqual(plan.flights[i].rotation);
      piece.position_m.forEach((coordinate, axis) => expect(coordinate / METERS_PER_SCENE_UNIT).toBeCloseTo(plan.flights[i].contact[axis], 10));
      expect(piece.velocity_m_s[0]).toBe(0); expect(piece.velocity_m_s[2]).toBe(0);
    });
    airborne.dispose(); (airborne.material as THREE.Material).dispose(); geometry.dispose();
  });
});
