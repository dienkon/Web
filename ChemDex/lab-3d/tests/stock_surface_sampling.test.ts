import { describe, expect, it } from 'vitest';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { sampleGeometrySurface } from '../src/science/stockSurfaceSamples';

function surfaces() {
  // Two parallel triangular faces, areas 0.5 and 1.5, with an intervening
  // degenerate triangle. Equal-area quadrature must allocate 2:6 samples.
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([
    0, 0, 0, 1, 0, 0, 0, 1, 0,
    0, 0, 2, 3, 0, 2, 0, 1, 2,
  ], 3));
  geometry.setIndex([0, 1, 2, 0, 0, 0, 3, 4, 5]);
  return geometry;
}

describe('stock surface area quadrature', () => {
  it('preserves surface area, orientation and barycentric containment while skipping degenerate faces', () => {
    const geometry = surfaces(), samples = sampleGeometrySurface(geometry, 8);
    expect(samples).toHaveLength(8);
    expect(samples.filter(sample => sample.point.z === 0)).toHaveLength(2);
    expect(samples.filter(sample => sample.point.z === 2)).toHaveLength(6);
    expect(samples.reduce((sum, sample) => sum + sample.area, 0)).toBeCloseTo(2, 14);
    for (const sample of samples) {
      expect(sample.normal.toArray()).toEqual([0, 0, 1]);
      expect(sample.point.x).toBeGreaterThan(0);
      expect(sample.point.y).toBeGreaterThan(0);
      expect(sample.point.x / (sample.point.z === 0 ? 1 : 3) + sample.point.y).toBeLessThan(1);
      expect(sample.area).toBe(0.25);
    }
    geometry.dispose();
  });

  it('gives identical physical sites for indexed and expanded versions of the same mesh', () => {
    const indexed = surfaces(), expanded = indexed.toNonIndexed();
    for (const count of [1, 32, 128]) {
      const a = sampleGeometrySurface(indexed, count), b = sampleGeometrySurface(expanded, count);
      expect(a.map(sample => [sample.point.toArray(), sample.normal.toArray(), sample.area]))
        .toEqual(b.map(sample => [sample.point.toArray(), sample.normal.toArray(), sample.area]));
    }
    indexed.dispose(); expanded.dispose();
  });

  it('has no emitting or reacting surface when all faces are degenerate', () => {
    const geometry = surfaces(); geometry.setIndex([0, 0, 0, 2, 2, 2]);
    expect(sampleGeometrySurface(geometry)).toEqual([]);
    geometry.dispose();
  });
});
