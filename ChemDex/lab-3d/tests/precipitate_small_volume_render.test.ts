import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { ReactElement } from 'react';
import type { VesselState } from '../src/types/chemistry';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';

const harness = vi.hoisted(() => ({
  frames: [] as (() => void)[], cleanups: [] as (() => void)[], layouts: [] as (() => void)[],
  app: {} as { vessels: Record<string, unknown>; isSimulationPaused: boolean; dissolvingSubstances: Record<string, unknown> }, runtime: null as unknown,
}));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const hooks = { memo: (fn: unknown) => fn, useRef: (current: unknown) => ({ current }),
    useMemo: (factory: () => unknown) => factory(),
    useEffect: (effect: () => void | (() => void)) => { const cleanup = effect(); if (cleanup) harness.cleanups.push(cleanup); },
    useLayoutEffect: (effect: () => void) => { harness.layouts.push(effect); } };
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});
vi.mock('@react-three/fiber', () => ({ useFrame: (frame: () => void) => { harness.frames.push(frame); } }));
vi.mock('../src/simulation/render/VesselVisualContext', () => ({
  useVesselVisualRuntime: () => harness.runtime,
  useVesselVisualStore: () => ({ getState: () => harness.app }),
  useVesselVisualState: (selector: (state: typeof harness.app) => unknown) => selector(harness.app),
}));
vi.mock('../src/vfx/quality', async () => {
  const actual = await vi.importActual<typeof import('../src/vfx/quality')>('../src/vfx/quality');
  const store = actual.useQualityStore;
  return { ...actual, useQualityStore: Object.assign((selector: (state: ReturnType<typeof store.getState>) => unknown) => selector(store.getState()), store) };
});
vi.mock('../src/vfx/textures', () => ({ getNoiseTexture: () => new THREE.Texture() }));
import { PrecipitateParticleLayer } from '../src/simulation/render/PrecipitateParticleLayer';
import { SedimentMesh } from '../src/simulation/render/SedimentMesh';
import { SolidContentsRenderer } from '../src/components/three/SolidContentsRenderer';

type Element = ReactElement<{ geometry: THREE.BufferGeometry; material: THREE.Material;
  ref: { current: THREE.Object3D | null } }>;
const disposables: { dispose: () => void }[] = [];
afterEach(() => {
  harness.cleanups.splice(0).forEach(cleanup => cleanup());
  disposables.splice(0).forEach(value => value.dispose());
  harness.frames = []; harness.layouts = []; harness.runtime = null;
});
function sample(volume_ml: number, formula = 'BaSO4', formation?: string): VesselState {
  return { id: 'micro-precipitate', name: 'micro-precipitate', type: 'beaker', capacity_ml: 250,
    position: [0, 0, 0], rotationY: 0, isLocked: false, volume_ml, volume: volume_ml / 250,
    temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: true, isBoiling: false,
    mass_g: volume_ml + 0.00001, substances: ['H2O', formula], precipitateSubstance: formula,
    contents: [{ formula: 'H2O', phase: 'l', mass_g: volume_ml, moles: volume_ml / 18.015 },
      { formula, phase: 's', mass_g: 0.00001, moles: 0.00000004, solidOrigin: 'precipitate',
        precipitateFormation: formation }] };
}
function prepare(vessel: VesselState) {
  const manager = new VesselSimulationManager(vessel.id, 'low');
  manager.step(vessel, 0.1, { thermalStateAuthoritative: true });
  harness.app = { vessels: { [vessel.id]: vessel }, isSimulationPaused: true, dissolvingSubstances: {} };
  harness.runtime = { manager, externallyStepped: true };
  return manager;
}
function mountParticles(manager: VesselSimulationManager) {
  const [key, system] = [...manager.precipitationSystems][0];
  const element = PrecipitateParticleLayer({ vesselId: manager.vesselId, formula: system.profile.id,
    cohortKey: key, system, capacity: 40 }) as Element;
  const mesh = new THREE.InstancedMesh(element.props.geometry, element.props.material, 40);
  element.props.ref.current = mesh;
  harness.layouts.splice(0).forEach(layout => layout());
  disposables.push(mesh); return mesh;
}
function mountBed(manager: VesselSimulationManager) {
  const element = (SedimentMesh as unknown as (props: unknown) => Element)({
    vesselId: manager.vesselId, sedimentBed: manager.sedimentBed, baseY: -0.96, radius: 1,
  });
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  disposables.push(material, mesh.geometry);
  element.props.ref.current = mesh; return mesh;
}
const frame = () => harness.frames.forEach(callback => callback());
const fallback = () => (SolidContentsRenderer as unknown as (props: unknown) => unknown)({ vesselId: 'micro-precipitate' });

describe('Small-volume precipitates always retain one visible owner', () => {
  it.each([0.050001, 0.12, 0.2, 0.201])('draws the actual suspended population at %s mL while paused', volume => {
    const vessel = sample(volume), manager = prepare(vessel);
    expect(manager.precipitationSystem.carrierMode).toBe('liquid');
    expect(manager.precipitationSystem.particles.length).toBeGreaterThan(0);
    expect(fallback()).toBeNull();
    const mesh = mountParticles(manager); frame();
    expect(mesh.visible).toBe(true); expect(mesh.count).toBeGreaterThan(0);
    const matrix = new THREE.Matrix4(); mesh.getMatrixAt(0, matrix);
    expect(matrix.elements.every(Number.isFinite)).toBe(true);
    expect(manager.precipitationSystem.representedMass_g).toBeCloseTo(0.00001, 12);
    const held = matrix.elements.slice(); frame(); mesh.getMatrixAt(0, matrix);
    expect(matrix.elements).toEqual(held);
  });

  it('draws a real settled crystal bed in a 0.12 mL specimen and clears it after dissolution', () => {
    const vessel = sample(0.12, 'PbI2', 'CRYSTAL_PLATE'), manager = prepare(vessel);
    for (let i = 0; i < 20 && manager.sedimentBed.amount_g === 0; i++)
      manager.step(vessel, 0.1, { thermalStateAuthoritative: true });
    expect(manager.sedimentBed.amount_g).toBeGreaterThan(0);
    expect(fallback()).toBeNull();
    const bed = mountBed(manager); frame();
    expect(bed.visible).toBe(true);
    expect(bed.geometry.getAttribute('position').count).toBeGreaterThan(0);
    expect((bed.material as THREE.MeshStandardMaterial).opacity).toBeGreaterThan(0);
    const dissolved = { ...vessel, contents: vessel.contents.filter(row => row.phase !== 's') };
    harness.app.vessels[vessel.id] = dissolved;
    manager.step(dissolved, 0.1, { thermalStateAuthoritative: true }); frame();
    expect(bed.visible).toBe(false);
    expect(manager.sedimentBed.amount_g).toBe(0);
  });

  it.each([0, 0.05])('hands %s mL residues to the existing solid fallback without duplicate drawing', volume => {
    const manager = prepare(sample(volume));
    expect(fallback()).not.toBeNull();
    const particles = mountParticles(manager), bed = mountBed(manager); frame();
    expect(particles.visible).toBe(false); expect(bed.visible).toBe(false);
  });
});
