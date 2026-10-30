import { expect, it } from 'vitest';
import { BufferAttribute } from 'three';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';
import { separatedLayers, phaseVolumes, phaseDensities } from '../src/science/liquidLayers';
import { stockImmersion } from '../src/science/stockImmersion';
import { solveStockLiquidSurface } from '../src/science/stockLiquidSurface';
import { createStockSolidGeometry } from '../src/components/three/stockSolidGeometry';
import { createStockSolidLayout } from '../src/components/three/stockSolidLayout';
import { solidSceneVolume, vesselInterior } from '../src/science/vesselDimensions';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { volumeBelowPlane } from '../src/pour/physics/retained';
import { meshHalfspaceVolume } from './helpers/meshHalfspaceVolume';
import { clipClosedMesh } from './helpers/clipClosedMesh';
import { stepFunnelFlow } from '../src/engine/funnelFlow';
import { computeMolarMass } from '../src/engine/ledger';

const item = (formula: string, mass_g: number, phase: string): SubstanceContent => ({ formula, mass_g, phase, moles: mass_g / computeMolarMass(formula) });
const fixture = (heavy = false): VesselState => {
  const organic = heavy ? 'CHCl3' : 'C6H6', density = heavy ? 1.49 : 0.879;
  const contents = [item('H2O', 3, 'l'), { ...item(organic, 0.005 * density, 'l'), liquidLayer: 'organic' as const },
    { ...item('Zn', 7.14, 's'), initialMass_g: 7.14 }];
  return { id: 'source', name: 'source', type: 'separatory_funnel', capacity_ml: 150, volume_ml: 3.005, volume: 3.005 / 150,
    immiscibleOrganicVolume_ml: 0.005, contents, substances: ['H2O', organic, 'Zn'], mass_g: contents.reduce((s, r) => s + r.mass_g, 0),
    position: [0, 3, 0], rotationY: 0, temperature_c: 25, ph: 7, isLocked: false, stopcockOpen: true,
    hasGas: false, hasPrecipitate: false, isBoiling: false };
};

for (const heavy of [false, true]) it(`preserves both physical phase volumes with ${heavy ? 'heavy' : 'light'} organic and partly immersed Zn`, () => {
  const vessel = fixture(heavy), before = JSON.stringify(vessel), layer = separatedLayers(vessel), profile = getVesselProfile(vessel.type, vessel.capacity_ml);
  expect(layer.lower).toBe(heavy ? 'organic' : 'aqueous');
  const geometry = createStockSolidGeometry('GRANULES', 'Zn'), p = geometry.attributes.position;
  geometry.setAttribute('position', new BufferAttribute(new Float64Array(Array.from(p.array)), 3));
  const amount = solidSceneVolume(vessel, 1), layout = createStockSolidLayout(vessel.type, 'GRANULES', geometry, amount, amount, vesselInterior(vessel.type).floorY);
  expect(layout.status).not.toBe('unresolved-fit');
  for (const normal of [[0, 1, 0], [-0.6, 0.8, 0], [0.36, 0.8, 0.48], [0.6, -0.8, 0]] as const) {
    const displaced = (c: number) => layout.pieces.reduce((s, piece) => {
      const transformed = geometry.clone().applyMatrix4(piece.matrix), capped = clipClosedMesh(transformed, [0, 1, 0], vesselInterior(vessel.type).topY);
      const v = meshHalfspaceVolume(capped, normal, c); transformed.dispose(); capped.dispose(); return s + v;
    }, 0) / solidSceneVolume(vessel, 1);
    const lower = solveStockLiquidSurface(vessel, normal, 1, layer.lowerVolume_ml)!;
    const total = solveStockLiquidSurface(vessel, normal, 1)!;
    expect(lower).not.toBeNull(); expect(total.c).toBeGreaterThan(lower.c);
    const gross = (c: number) => volumeBelowPlane(profile, -Math.hypot(normal[0], normal[2]), normal[1], c)
      / vesselInterior(vessel.type).volume * vessel.capacity_ml;
    expect(gross(lower.c) - displaced(lower.c)).toBeCloseTo(layer.lowerVolume_ml, 8);
    expect(gross(total.c) - gross(lower.c) - displaced(total.c) + displaced(lower.c)).toBeCloseTo(layer.upperVolume_ml, 8);
  }
  expect(JSON.stringify(vessel)).toBe(before); geometry.dispose();
});

it('keeps the dense phase out of an averaged-density stock buoyancy certification', () => {
  // Static inventory before chemistry: Mg sinks in water but cannot be
  // certified resting at the bottom of a denser bromine phase.
  const base = fixture(), contents = [item('H2O', 20, 'l'), { ...item('Br2', 31.2, 'l'), liquidLayer: 'organic' as const }, item('Mg', 1.74, 's')];
  const vessel = { ...base, contents, volume_ml: 30, immiscibleOrganicVolume_ml: 10 };
  expect(phaseDensities(vessel)).toEqual({ aqueous: 1, organic: 3.12 });
  expect(stockImmersion(vessel, 51.2 / 30)).toBeNull();
});

for (const heavy of [false, true]) it(`drains finite phases with ${heavy ? 'heavy' : 'light'} organic while retaining stock and its initial identity`, () => {
  let source = fixture(heavy);
  let target: VesselState = { ...fixture(), type: 'beaker', id: 'target', contents: [], substances: [], volume_ml: 0, mass_g: 0, immiscibleOrganicVolume_ml: 0 };
  const initial = structuredClone(source), layer = separatedLayers(source);
  for (let i = 0; i < 2; i++) {
    const result = stepFunnelFlow(source, target, 1000); source = result.source; target = result.receiver!;
    expect(source.contents.find(r => r.formula === 'Zn')).toEqual(initial.contents.find(r => r.formula === 'Zn'));
    if (i === 0) { expect(result.moved_ml).toBeCloseTo(layer.lowerVolume_ml, 12); expect(source.volume_ml).toBeCloseTo(layer.upperVolume_ml, 12); }
    expect(source.mass_g + target.mass_g).toBeCloseTo(initial.mass_g, 12);
  }
  expect(source.volume_ml).toBe(0); expect(target.volume_ml).toBeCloseTo(initial.volume_ml, 12);
  for (const row of initial.contents) expect([...source.contents, ...target.contents].filter(r => r.formula === row.formula).reduce((s, r) => s + r.moles, 0)).toBeCloseTo(row.moles, 12);
  expect(phaseVolumes(source)).toEqual({ aqueous: 0, organic: 0 });
});

it('retains the organic phase volume in both accepted and overflow aliquots', () => {
  const source = fixture(true), receiver = { ...fixture(), type: 'beaker' as const, id: 'target', capacity_ml: 0.001,
    volume_ml: 0, contents: [], substances: [], mass_g: 0, immiscibleOrganicVolume_ml: 0 };
  const result = stepFunnelFlow(source, receiver, 1);
  expect(result.receiver!.immiscibleOrganicVolume_ml).toBeCloseTo(0.001, 12);
  expect(result.spill!.organicVolume_ml).toBeCloseTo(0.004, 12);
  expect(result.spill!.volume_ml).toBeCloseTo(0.004, 12);
  expect(result.source.immiscibleOrganicVolume_ml).toBe(0);
  expect(result.source.mass_g + result.receiver!.mass_g + result.spill!.mass_g).toBeCloseTo(source.mass_g, 12);
});
