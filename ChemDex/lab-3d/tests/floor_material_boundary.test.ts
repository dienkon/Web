import { describe, expect, it } from 'vitest';
import { LAB_GEOMETRY, supportPlaneScene } from '../src/core/labGeometry';
import { mergeWorkbenchSpill } from '../src/engine/spillInventory';
import { ShardManager } from '../src/damage/Shards';
describe('Bench/floor material boundaries', () => {
  it('keeps pools on separate supports apart even at the same horizontal coordinate', () => {
    const table = mergeWorkbenchSpill({}, [0, LAB_GEOMETRY.tableTop_scene, 0], 1, ['H2O'], '#fff');
    const both = mergeWorkbenchSpill(table, [0, LAB_GEOMETRY.floor_scene, 0], 1, ['H2O'], '#fff');
    expect(Object.keys(both)).toHaveLength(2);
    expect(Object.values(both).reduce((mass, spill) => mass + spill.mass_g, 0)).toBe(2);
    expect(new Set(Object.values(both).map(s => supportPlaneScene(s.position)))).toEqual(new Set([LAB_GEOMETRY.tableTop_scene, LAB_GEOMETRY.floor_scene]));
  });
  it('floor fragments remain on the floor instead of being lifted to the bench', () => {
    const m = new ShardManager(); m.spawnShatterShards('floor', [0, LAB_GEOMETRY.floor_scene + 0.1, 0], '#fff', 3);
    for (let i = 0; i < 120; i++) m.update(1 / 120);
    for (const s of m.getShards()) expect(s.position[1]).toBeCloseTo(LAB_GEOMETRY.floor_scene, 8);
  });
});
