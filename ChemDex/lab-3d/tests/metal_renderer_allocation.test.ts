import { afterEach, describe, expect, it, vi } from 'vitest';
import { InstancedMesh, Matrix4 } from 'three';
import type { ReactElement } from 'react';
import type { VesselState } from '../src/types/chemistry';
import { geometryVolume } from '../src/science/stockSolidGeometry';
import { solidSceneVolume } from '../src/science/vesselDimensions';
import { unresolvedMetalMassForSubstrate } from '../src/science/metalSurfaceAppearance';

const harness = vi.hoisted(() => ({ frames: [] as (() => void)[], vessel: null as VesselState | null }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const hooks = { memo: (fn: unknown) => fn, useRef: (current: unknown) => ({ current }),
    useMemo: (factory: () => unknown) => factory(), useEffect: () => {},
    useState: () => [['Cu'], () => {}] };
  return { ...actual, ...hooks, default: { ...actual, ...hooks } };
});
vi.mock('@react-three/fiber', () => ({ useFrame: (frame: () => void) => { harness.frames.push(frame); } }));
vi.mock('../src/simulation/render/VesselVisualContext', () => {
  const state = () => ({ vessels: { mixed: harness.vessel }, moveMode: false, draggingVesselId: null, burners: {} });
  return { useVesselVisualState: (selector: (app: unknown) => unknown) => selector(state()),
    useVesselVisualStore: () => ({ getState: state }), useVesselVisualRuntime: () => ({ externallyStepped: true }) };
});
vi.mock('../src/vfx/quality', async () => {
  const actual = await vi.importActual<typeof import('../src/vfx/quality')>('../src/vfx/quality');
  return { ...actual, useQualityStore: (selector: (state: unknown) => unknown) => selector({ effectiveTier: 'low' }) };
});
vi.mock('../src/vfx/textures', () => ({ getNoiseTexture: () => null }));
import { SolidSubstanceMesh } from '../src/components/three/SolidContentsRenderer';
import { MetalDepositLayers, type MetalDepositFrame } from '../src/components/three/MetalDepositLayer';

type Element = ReactElement<Record<string, any>>;
const sample = (): VesselState => ({ id: 'mixed', name: 'Mixed forms', type: 'beaker', capacity_ml: 100,
  position: [0, 0, 0], rotationY: 0, volume_ml: 30, volume: .3, temperature_c: 25,
  contents: [
    { formula: 'Fe (nail)', phase: 's', mass_g: 1, moles: 1 / 55.845 },
    { formula: 'Fe (filings)', phase: 's', mass_g: 3, moles: 3 / 55.845 },
    { formula: 'Cu', phase: 's', mass_g: .1, moles: .1 / 63.546, solidOrigin: 'precipitate',
      depositSubstrate: 'Fe', depositionReactionId: 'fe_cuso4' },
  ], substances: ['Fe (nail)', 'Fe (filings)', 'Cu'] } as VesselState);

function children(tree: Element) { return [tree.props.children].flat(Infinity).filter(Boolean) as Element[]; }
function stockFrame(formula: string): MetalDepositFrame {
  const tree = (SolidSubstanceMesh as unknown as (props: unknown) => Element)({ vesselId: 'mixed', substance: formula,
    vesselRadius: .75, baseY: -.95, dissolveProgress: 0, isStirring: false });
  return children(tree).find(node => node.type === MetalDepositLayers)!.props.readFrame();
}
function drawnDeposit(frame: MetalDepositFrame, substrate: string) {
  const tree = MetalDepositLayers({ substrate, readFrame: () => frame, capacity: frame.carriers.length }) as Element;
  const layer = children(tree)[0];
  const meshElement = (layer.type as (props: unknown) => Element)(layer.props);
  const [geometry, , capacity] = meshElement.props.args;
  const mesh = new InstancedMesh(geometry, undefined, capacity);
  meshElement.props.ref.current = mesh;
  harness.frames.at(-1)!();
  const matrix = new Matrix4();
  let volume = 0;
  for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, matrix); volume += geometryVolume(geometry) * matrix.determinant(); }
  return { mass: mesh.userData.metalDeposit?.mass_g ?? 0, volume, count: mesh.count };
}
afterEach(() => { harness.frames.length = 0; harness.vessel = null; });

describe('finite metal renderer allocation among stock forms', () => {
  it.each(['tagged', 'legacy'])('draws one %s unresolved coat across a nail and filings instead of duplicating it on each form', mode => {
    harness.vessel = sample();
    if (mode === 'legacy') {
      delete harness.vessel.contents[2].depositSubstrate;
      delete harness.vessel.contents[2].depositionReactionId;
      harness.vessel.lastReactionId = 'fe_cuso4'; harness.vessel.precipitateSubstance = 'Cu';
    }
    const nail = drawnDeposit(stockFrame('Fe (nail)'), 'Fe (nail)');
    const filings = drawnDeposit(stockFrame('Fe (filings)'), 'Fe (filings)');
    expect(nail.count).toBeGreaterThan(0); expect(filings.count).toBeGreaterThan(0);
    expect(nail.mass).toBeCloseTo(.025, 12); expect(filings.mass).toBeCloseTo(.075, 12);
    expect(nail.volume + filings.volume).toBeCloseTo(solidSceneVolume(harness.vessel, .1 / 8.96), 10);
  });

  it('never gives a resolved grain coating to freshly added unposed stock of the same metal', () => {
    const vessel = sample();
    vessel.contents[2].depositCarrierId = 'original-nail';
    vessel.stockMotion = { tick: 1, grains: [{ id: 'original-nail', formula: 'Fe (nail)', mass_g: 1,
      position_m: [0, -.02, 0], rotation: [0, 0, 0, 1], scale_m: .002,
      velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: true, powder: false }] };
    harness.vessel = vessel;
    expect(unresolvedMetalMassForSubstrate(vessel, 'Fe', 'Cu')).toBe(0);
    const nail = drawnDeposit(stockFrame('Fe (nail)'), 'Fe (nail)');
    const freshFilings = drawnDeposit(stockFrame('Fe (filings)'), 'Fe (filings)');
    expect(nail.mass).toBeCloseTo(.1, 12);
    expect(freshFilings.mass).toBe(0); expect(freshFilings.count).toBe(0);
    expect(nail.volume).toBeCloseTo(solidSceneVolume(vessel, .1 / 8.96), 10);
  });

  it('adds only each form’s share of unresolved mass to its independently owned coating', () => {
    const vessel = sample();
    vessel.contents.push({ ...vessel.contents[2], mass_g: .04, moles: .04 / 63.546 });
    vessel.contents[2].depositCarrierId = 'original-nail';
    vessel.stockMotion = { tick: 1, grains: [{ id: 'original-nail', formula: 'Fe (nail)', mass_g: 1,
      position_m: [0, -.02, 0], rotation: [0, 0, 0, 1], scale_m: .002,
      velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: true, powder: false }] };
    harness.vessel = vessel;
    const nail = drawnDeposit(stockFrame('Fe (nail)'), 'Fe (nail)');
    const filings = drawnDeposit(stockFrame('Fe (filings)'), 'Fe (filings)');
    expect(nail.mass).toBeCloseTo(.11, 12); expect(filings.mass).toBeCloseTo(.03, 12);
    expect(nail.volume + filings.volume).toBeCloseTo(solidSceneVolume(vessel, .14 / 8.96), 10);
  });

  it('conserves a wholly unresolved coat when only one of two stock forms has a motion pose', () => {
    const vessel = sample();
    vessel.contents[0].mass_g = 2.5; vessel.contents[0].moles = 2.5 / 55.845;
    vessel.contents[1].mass_g = 7.5; vessel.contents[1].moles = 7.5 / 55.845;
    vessel.stockMotion = { tick: 1, grains: [{ id: 'posed-nail', formula: 'Fe (nail)', mass_g: 2.5,
      position_m: [0, -.02, 0], rotation: [0, 0, 0, 1], scale_m: .002,
      velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: true, powder: false }] };
    harness.vessel = vessel;
    const nail = drawnDeposit(stockFrame('Fe (nail)'), 'Fe (nail)');
    const filings = drawnDeposit(stockFrame('Fe (filings)'), 'Fe (filings)');
    expect(nail.mass).toBeCloseTo(.025, 12); expect(filings.mass).toBeCloseTo(.075, 12);
    expect(nail.mass + filings.mass).toBeCloseTo(.1, 12);
    expect(nail.volume + filings.volume).toBeCloseTo(solidSceneVolume(vessel, .1 / 8.96), 10);
  });

  it('keeps unposed powder geometry and tint free of a different carrier’s coating', () => {
    const vessel = sample(); vessel.contents[1].formula = 'Fe (powder)';
    vessel.contents[2].depositCarrierId = 'original-nail';
    vessel.stockMotion = { tick: 1, grains: [{ id: 'original-nail', formula: 'Fe (nail)', mass_g: 1,
      position_m: [0, -.02, 0], rotation: [0, 0, 0, 1], scale_m: .002,
      velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: true, powder: false }] };
    harness.vessel = vessel;
    const render = () => (SolidSubstanceMesh as unknown as (props: unknown) => Element)({ vesselId: 'mixed', substance: 'Fe (powder)',
      vesselRadius: .75, baseY: -.95, dissolveProgress: 0, isStirring: false });
    const withCoating = children(render()).find(node => node.type === 'mesh')!;
    vessel.contents = vessel.contents.filter(row => row.formula !== 'Cu');
    const uncoated = children(render()).find(node => node.type === 'mesh')!;
    expect(geometryVolume(withCoating.props.geometry)).toBeCloseTo(geometryVolume(uncoated.props.geometry), 12);
    expect(children(withCoating)[0].props.color).toEqual(children(uncoated)[0].props.color);
  });
});
