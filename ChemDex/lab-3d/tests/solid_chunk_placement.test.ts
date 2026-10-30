import { describe, expect, it } from 'vitest';
import { BoxGeometry, Matrix4, Euler, Vector3 } from 'three';
import { placeSolidChunk } from '../src/science/solidChunkPlacement';
import { vesselInterior, contourRadius } from '../src/science/vesselDimensions';
describe('Solid substrates stay in the glass', () => {
  it.each(['beaker', 'flask', 'test_tube', 'volumetric_flask'])('%s contains a rotated chunk during lateral sliding', type => {
    const geometry = new BoxGeometry(1, 0.3, 0.8), vertices = geometry.attributes.position;
    const rotation = new Matrix4().makeRotationFromEuler(new Euler(0.7, 1.2, 0.4));
    const p = { x: 3, y: 0, z: -3, scale: 0.2 };
    placeSolidChunk(p, vertices, rotation, type);
    expect(p.scale).toBeGreaterThan(0);
    const interior = vesselInterior(type);
    for (let i = 0; i < vertices.count; i++) {
      const q = new Vector3().fromBufferAttribute(vertices, i).applyMatrix4(rotation).multiplyScalar(p.scale);
      q.add(new Vector3(p.x, p.y, p.z));
      expect(q.y).toBeGreaterThanOrEqual(interior.floorY - 1e-7);
      expect(q.y).toBeLessThanOrEqual(interior.topY + 1e-7);
      expect(Math.hypot(q.x, q.z)).toBeLessThanOrEqual(contourRadius(interior.points, q.y) + 1e-7);
    }
    geometry.dispose();
  });
});
