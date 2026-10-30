import { expect, it } from 'vitest';
import { BoxGeometry, BufferAttribute, type BufferGeometry } from 'three';
import { compileSolid, clippedSolidVolume } from '../src/science/clippedSolidVolume';
import { meshHalfspaceVolume } from './helpers/meshHalfspaceVolume';
import { clipClosedMesh } from './helpers/clipClosedMesh';
import { solveStockLiquidSurface } from '../src/science/stockLiquidSurface';
import { getVesselProfile, getWorldVesselProfile } from '../src/pour/physics/profiles';
import { volumeBelowPlane, retainedVolume } from '../src/pour/physics/retained';
import { calculateVesselWeirFlow } from '../src/pour/physics/vesselFlow';
import type { VesselState } from '../src/types/chemistry';
import { stockImmersion } from '../src/science/stockImmersion';
import { createStockSolidGeometry } from '../src/components/three/stockSolidGeometry';
import { createStockSolidLayout } from '../src/components/three/stockSolidLayout';
import { solidSceneVolume, vesselInterior } from '../src/science/vesselDimensions';

function doubleGeometry(g: BufferGeometry) {
  const result = g.clone(), p = g.attributes.position;
  result.setAttribute('position', new BufferAttribute(new Float64Array(Array.from(p.array)), 3));
  return result;
}

it('clips two crossing planes using their common origin against analytic wedges', () => {
  const g = new BoxGeometry(2, 2, 2), mesh = compileSolid(g);
  expect(mesh.volume).toBeCloseTo(8, 13);
  for (const top of [-0.9, -0.2, 0, 0.7]) {
    // x+y <= 0, y <= top in [-1,1]^3: 2*integral_-1^top(1-y)dy.
    const expected = 2 * (top - top * top / 2 + 1.5);
    const planes = [{ normal: [1, 1, 0] as const, offset: 0 }, { normal: [0, 1, 0] as const, offset: top }];
    expect(clippedSolidVolume(mesh, planes, [-top, top, 0])).toBeCloseTo(expected, 12);
  }
  g.dispose();
});
it('matches an independent triangle clip across indexed and unindexed meshes and planes', () => {
  for (const g of [new BoxGeometry(2, 3, 4), createStockSolidGeometry('TURNINGS', 'Cu')]) {
    const mesh = compileSolid(g);
    for (const n of [[0, 1, 0], [-0.7, 0.3, 0.2], [0.1, -0.8, 0.4]] as const) for (const c of [-0.4, 0, 0.2, 1.1]) {
      const norm2 = n.reduce((s, x) => s + x * x, 0), origin = n.map(x => x * c / norm2) as [number, number, number];
      expect(clippedSolidVolume(mesh, [{ normal: n, offset: c }], origin)).toBeCloseTo(meshHalfspaceVolume(g, n, c), 11);
    }
    g.dispose();
  }
});

for (const [type, capacity_ml, amount] of [['beaker', 100, 4], ['flask', 250, 10], ['test_tube', 50, 2], ['cylinder', 100, 4]] as const) {
  it(`uses actual Cu mesh immersion and mouth cap in ${type}`, () => {
    const vessel = { type, capacity_ml, volume_ml: 50, contents: [{ formula: 'Cu', phase: 's' as const, mass_g: amount * 8.96, moles: amount * 8.96 / 63.546 }] };
    const model = stockImmersion(vessel)!; expect(model).not.toBeNull();
    const g = createStockSolidGeometry('TURNINGS', 'Cu'), v = solidSceneVolume(vessel, amount);
    const layout = createStockSolidLayout(type, 'TURNINGS', g, v, v, vesselInterior(type).floorY);
    for (const angle of [0, 0.5, Math.PI / 2, 2.2, Math.PI]) {
      const n = [-Math.sin(angle), Math.cos(angle), 0] as const;
      for (const c of [-0.7, 0, 0.8]) {
        // Complement also checks the downward-facing query path.
        const actual = model.displacementMl(n, c);
        expect(actual).toBeGreaterThanOrEqual(0); expect(actual).toBeLessThanOrEqual(model.insideVolume_ml + 1e-10);
        expect(actual + model.displacementMl(n.map(x => -x) as [number, number, number], -c)).toBeCloseTo(model.insideVolume_ml, 10);
        {
          const expected = layout.pieces.reduce((s, p) => {
            const transformed = doubleGeometry(g).applyMatrix4(p.matrix);
            const capped = clipClosedMesh(transformed, [0, 1, 0], vesselInterior(type).topY);
            const value = meshHalfspaceVolume(capped, n, c); transformed.dispose(); capped.dispose(); return s + value;
          }, 0) / solidSceneVolume(vessel, 1);
          expect(actual).toBeCloseTo(expected, 9);
        }
      }
    }
    for (const n of [[0, 1, 0], [-0.6, 0.8, 0], [0.36, 0.8, 0.48], [0.6, -0.8, 0], [1e-8, 1, 0]] as const) {
      for (const liquid of [0.0002, 1, capacity_ml * 0.4, capacity_ml * 0.9]) {
        const solved = solveStockLiquidSurface({ ...vessel, volume_ml: liquid }, n)!;
        const profile = getVesselProfile(type, capacity_ml);
        const gross = volumeBelowPlane(profile, -Math.hypot(n[0], n[2]), n[1], solved.c) / vesselInterior(type).volume * capacity_ml;
        expect(gross - model.displacementMl(n, solved.c)).toBeCloseTo(liquid, 7);
      }
    }
    // Horizontal planes, including a protruding group, need only one
    // independent clip at min(water,mouth) in the upright direction.
    for (const c of [-0.8, 0, 1, 10]) {
      const level = Math.min(c, vesselInterior(type).topY);
      const expected = layout.pieces.reduce((s, p) => {
        const transformed = doubleGeometry(g).applyMatrix4(p.matrix), value = meshHalfspaceVolume(transformed, [0, 1, 0], level); transformed.dispose(); return s + value;
      }, 0) / solidSceneVolume(vessel, 1);
      expect(model.displacementMl([0, 1, 0], c)).toBeCloseTo(expected, 9);
    }
    const world = getWorldVesselProfile(type, capacity_ml), raw = getVesselProfile(type, capacity_ml);
    const theta = 0.5, n = [-Math.sin(theta), Math.cos(theta), 0] as const;
    const lip = n[0] * raw.lipLocal[0] + n[1] * raw.lipLocal[1];
    const lipWet = layout.pieces.reduce((sum, piece) => {
      const transformed = doubleGeometry(g).applyMatrix4(piece.matrix), capped = clipClosedMesh(transformed, [0, 1, 0], vesselInterior(type).topY);
      const value = meshHalfspaceVolume(capped, n, lip); transformed.dispose(); capped.dispose(); return sum + value;
    }, 0) / solidSceneVolume(vessel, 1);
    const retained = retainedVolume(world, theta), liquid = retained - amount / 2;
    const source: VesselState = { ...vessel, id: 'source', name: 'source', position: [0, 3, 0], rotationY: 0, isLocked: false,
      mass_g: liquid + amount * 8.96, temperature_c: 25, ph: 7, volume: liquid / capacity_ml, volume_ml: liquid,
      contents: [...vessel.contents, { formula: 'H2O', phase: 'l', mass_g: liquid, moles: liquid / 18.015 }],
      substances: ['Cu', 'H2O'], hasGas: false, hasPrecipitate: false, isBoiling: false };
    const flow = calculateVesselWeirFlow(source, theta);
    expect(flow.displacementBasis).toBe('stock-mesh-envelope-reference');
    expect(flow.retainedLiquidVolume_ml).toBeCloseTo(retained - lipWet, 9);
    expect(flow.excessVolume_ml).toBeCloseTo(Math.max(0, liquid - retained + lipWet), 9);
    if (type === 'flask') expect(flow.flowRate_ml_s).toBe(0);
    else expect(flow.flowRate_ml_s).toBeGreaterThan(0);
    g.dispose();
  });
}
it('keeps unsupported or overlapping groups on an explicit reference path', () => {
  const base = { type: 'beaker' as const, capacity_ml: 100, volume_ml: 50 };
  for (const formula of ['H2O', 'Na', 'K', 'CuS', 'Unknown']) {
    expect(stockImmersion({ ...base, contents: [{ formula, mass_g: 1, moles: 1, phase: 's' }] })).toBeNull();
  }
  const row = { formula: 'Cu', phase: 's' as const, mass_g: 35.84, moles: 35.84 / 63.546 };
  expect(stockImmersion({ ...base, precipitateSubstance: 'Cu', contents: [row] })).toBeNull();
  expect(stockImmersion({ ...base, isPulverized: true, contents: [row] })).toBeNull();
  expect(stockImmersion({ ...base, type: 'filter_funnel', contents: [row] })).toBeNull();
  expect(stockImmersion({ ...base, contents: [row, { ...row, formula: 'Zn' }] })).toBeNull();
});
