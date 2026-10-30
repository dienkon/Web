import { expect, it } from 'vitest';
import { getVesselProfile, VESSEL_PROFILES, type VesselProfile } from '../src/pour/physics/profiles';
import { solveLevel } from '../src/pour/physics/retained';
import { createLiquidVolumeGeometry, liquidMeshLayout } from '../src/vfx/materials/liquidGeometry';
import { meshHalfspaceVolume } from './helpers/meshHalfspaceVolume';
import { BoxGeometry } from 'three';

it('measures an independent non-indexed cube cap used by the stock immersion audit', () => {
  const g = new BoxGeometry(1, 1, 1).toNonIndexed();
  expect(meshHalfspaceVolume(g, [1, 0, 0], 0.25)).toBeCloseTo(0.75, 12);
  g.dispose();
});

for (const type of Object.keys(VESSEL_PROFILES)) {
  it(`keeps actual wet-arc triangles and Float32 planes within 0.2% volume for ${type}`, () => {
    const p = getVesselProfile(type);
    for (const fraction of [1e-8, 1e-6, 0.01, 0.4, 1 - 1e-6]) for (const angle of [0, 0.8, Math.PI / 2, 2.2, Math.PI]) {
      const level = solveLevel(p, angle, fraction * p.capacity_ml), layout = liquidMeshLayout(p, angle, level.c, level.depth);
      const g = createLiquidVolumeGeometry(p, layout), origin = g.userData.liquid.originY;
      const normal: [number, number, number] = [0, Math.cos(angle), -Math.sin(angle)];
      const c = level.c - normal[1] * origin - normal[2] * g.userData.liquid.originZ;
      const expected = fraction * p.referenceSceneVolume!;
      expect(Math.abs(meshHalfspaceVolume(g, normal, c) / expected - 1)).toBeLessThan(0.002);
      expect(Math.abs(meshHalfspaceVolume(g, normal.map(Math.fround) as [number, number, number], Math.fround(c)) / expected - 1)).toBeLessThan(0.002);
      const normals = g.attributes.normal;
      for (let j = 0; j < normals.count; j++) expect(Number.isFinite(normals.getX(j) + normals.getY(j) + normals.getZ(j))).toBe(true);
      g.dispose();
    }
  });
}
it('removes dense dry arcs in the worst previous horizontal test-tube case', () => {
  const p = getVesselProfile('test_tube', 50), level = solveLevel(p, Math.PI / 2, 0.0002);
  const layout = liquidMeshLayout(p, Math.PI / 2, level.c, level.depth), g = createLiquidVolumeGeometry(p, layout);
  expect(g.attributes.position.count).toBeLessThan(131088 / 10);
  expect(g.index!.count / 3).toBeLessThan(245760 / 10);
  expect(meshHalfspaceVolume(g, [0, 0, -1], level.c + g.userData.liquid.originZ) / p.referenceSceneVolume! * p.capacity_ml).toBeCloseTo(0.0002, 6);
  g.dispose();
});
it('retains a thin layer between two independent cuts rather than filling the whole lower phase', () => {
  const p = getVesselProfile('flask'), top = solveLevel(p, 0.8, 5), bottom = solveLevel(p, 0.8, 3);
  const layout = liquidMeshLayout(p, 0.8, top.c, top.depth), g = createLiquidVolumeGeometry(p, layout), y = g.userData.liquid.originY;
  const n: [number, number, number] = [0, Math.cos(0.8), -Math.sin(0.8)];
  const z = g.userData.liquid.originZ;
  const volume = meshHalfspaceVolume(g, n, top.c - n[1] * y - n[2] * z) - meshHalfspaceVolume(g, n, bottom.c - n[1] * y - n[2] * z);
  expect(Math.abs(volume / p.referenceSceneVolume! * p.capacity_ml / 2 - 1)).toBeLessThan(0.002);
  g.dispose();
});
it('covers a wet cone tip and matches the independent oblique cone-cap integral', () => {
  const p: VesselProfile = { type: 'reference-cone', baseY: 0, H: 1, r: y => y, contour: [[0, 0], [1, 1]],
    capacity_ml: 100, sceneScale: 1, mouthR: 1, lipLocal: [1, 1, 0], spoutWidth: 0.2, referenceSceneVolume: Math.PI / 3 };
  for (const angle of [0.1, 0.3, 0.65, 0.78]) {
    const fraction = 1e-8, level = solveLevel(p, angle, 100 * fraction), normal: [number, number, number] = [0, Math.cos(angle), -Math.sin(angle)];
    const expectedC = Math.cbrt(fraction) * Math.sqrt(Math.cos(2 * angle));
    // Use a relative geometric tolerance, as in the independent cylinder
    // tests; a decimal-place criterion changes when length units change.
    expect(Math.abs(level.c / expectedC - 1)).toBeLessThan(1e-7);
    const layout = liquidMeshLayout(p, angle, level.c, level.depth), g = createLiquidVolumeGeometry(p, layout);
    const { originY, originZ } = g.userData.liquid;
    const volume = meshHalfspaceVolume(g, normal, level.c - normal[1] * originY - normal[2] * originZ);
    expect(Math.abs(volume / (Math.PI / 3 * fraction) - 1)).toBeLessThan(0.002);
    g.dispose();
  }
});
