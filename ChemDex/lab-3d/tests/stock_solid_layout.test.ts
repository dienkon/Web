import { expect, it } from 'vitest';
import { BoxGeometry, Euler, Matrix4, Vector3 } from 'three';
import { createStockSolidGeometry, geometryVolume } from '../src/components/three/stockSolidGeometry';
import { createStockSolidLayout } from '../src/components/three/stockSolidLayout';
import { solidSceneVolume, vesselInterior, contourRadius } from '../src/science/vesselDimensions';
import { placeSolidChunk } from '../src/science/solidChunkPlacement';
import type { SolidMorphology } from '../src/types/chemistry';

for (const [type, capacity_ml, material_ml] of [['beaker', 100, 4], ['flask', 250, 10], ['test_tube', 50, 2], ['cylinder', 100, 4]] as const) {
  it(`preserves the full Cu dose and separated envelopes in ${type}`, () => {
    const g = createStockSolidGeometry('TURNINGS', 'Cu'), v = solidSceneVolume({ type, capacity_ml }, material_ml), unit = geometryVolume(g);
    const layout = createStockSolidLayout(type, 'TURNINGS', g, v), interior = vesselInterior(type);
    expect(layout.status).not.toBe('unresolved-fit');
    expect(layout.pieces.reduce((sum, p) => sum + unit * p.matrix.determinant(), 0) / v).toBeCloseTo(1, 12);
    const point = new Vector3(), vertices = g.attributes.position;
    for (const p of layout.pieces) for (let i = 0; i < vertices.count; i++) {
      point.fromBufferAttribute(vertices, i).applyMatrix4(p.matrix);
      expect(point.y).toBeGreaterThanOrEqual(interior.floorY - 1e-7);
      if (point.y < interior.topY) expect(Math.hypot(point.x, point.z)).toBeLessThanOrEqual(contourRadius(interior.points, point.y) + 1e-7);
      else expect(Math.hypot(point.x, point.z)).toBeLessThanOrEqual(interior.points.at(-1)![0] + 1e-7);
    }
    for (let i = 0; i < layout.pieces.length; i++) for (let j = i + 1; j < layout.pieces.length; j++) {
      const a = layout.pieces[i], b = layout.pieces[j], horizontal = Math.hypot(a.x - b.x, a.z - b.z);
      expect(horizontal >= a.radius + b.radius - 1e-9 || a.top <= b.bottom + 1e-9 || b.top <= a.bottom + 1e-9).toBe(true);
    }
    const remaining = createStockSolidLayout(type, 'TURNINGS', g, v * 0.4, v);
    expect(remaining.pieces).toHaveLength(layout.pieces.length);
    expect(remaining.pieces.reduce((sum, p) => sum + unit * p.matrix.determinant(), 0) / v).toBeCloseTo(0.4, 12);
    for (let i = 0; i < remaining.pieces.length; i++) {
      expect(remaining.pieces[i].x).toBe(layout.pieces[i].x); expect(remaining.pieces[i].z).toBe(layout.pieces[i].z);
    }
    g.dispose();
  });
}

const forms: SolidMorphology[] = ['RIBBON', 'FOIL', 'NAIL', 'TURNINGS', 'FILINGS', 'GRANULES', 'PELLET', 'CHIPS',
  'CUBIC_CRYSTAL', 'PRISMATIC_CRYSTAL', 'TABULAR_CRYSTAL', 'HYDRATE_CRYSTAL', 'LUSTROUS_PLATES'];
for (const morphology of forms) it(`never loses material volume while arranging ${morphology}`, () => {
  const g = createStockSolidGeometry(morphology, 'CuSO4·5H2O'), unit = geometryVolume(g);
  for (const type of ['beaker', 'flask', 'test_tube', 'watch_glass', 'volumetric_flask']) {
    const v = solidSceneVolume({ type, capacity_ml: 100 }, 1);
    const layout = createStockSolidLayout(type, morphology, g, v);
    expect(layout.pieces.length).toBeGreaterThan(0);
    expect(layout.pieces.reduce((sum, p) => sum + unit * p.matrix.determinant(), 0) / v).toBeCloseTo(1, 11);
    if (morphology === 'NAIL') expect(layout.pieces.length).toBe(1);
  }
  g.dispose();
});
it('lets a whole long nail protrude through an open mouth without shortening it', () => {
  const g = createStockSolidGeometry('NAIL', 'Fe (nail)'), type = 'beaker';
  const volume = solidSceneVolume({ type, capacity_ml: 100 }, 5), layout = createStockSolidLayout(type, 'NAIL', g, volume);
  expect(layout.status).toBe('protruding-reference'); expect(layout.pieces).toHaveLength(1);
  expect(geometryVolume(g) * layout.pieces[0].matrix.determinant()).toBeCloseTo(volume, 12);
  expect(layout.pieces[0].top).toBeGreaterThan(vesselInterior(type).topY);
  const closed = createStockSolidLayout(type, 'NAIL', g, volume, volume, undefined, false);
  expect(closed.status).toBe('unresolved-fit');
  expect(geometryVolume(g) * closed.pieces[0].matrix.determinant()).toBeCloseTo(volume, 12);
  g.dispose();
});
it('reports an unfittable placement and preserves the requested shape scale', () => {
  const g = new BoxGeometry(1, 1, 1), p = { x: 0, y: 0, z: 0, scale: 100 };
  expect(placeSolidChunk(p, g.attributes.position, new Matrix4().makeRotationFromEuler(new Euler()), 'test_tube')).toBe(false);
  expect(p.scale).toBe(100); g.dispose();
});
