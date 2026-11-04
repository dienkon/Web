import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ParticlePool } from '../src/vfx/particles/ParticlePool';

describe('Bounded particle uploads', () => {
  it('retains an event burst received before the first GPU upload', () => {
    const pool = new ParticlePool(20);
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial(), 20);
    pool.spawn({ x: 3, life: 1 });
    pool.update(0.1, () => true, mesh);
    expect(pool.liveCount).toBe(1);
    expect(mesh.count).toBe(1);
    expect(mesh.visible).toBe(true);
    const matrix = new THREE.Matrix4(); mesh.getMatrixAt(0, matrix);
    expect(matrix.elements[12]).toBe(3);
    expect(pool.particles[0].age).toBeCloseTo(0.1);
  });
  it('draws and uploads only live particles after holes appear in the pool', () => {
    const pool = new ParticlePool(20);
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial(), 20);
    mesh.setColorAt(0, new THREE.Color());
    pool.spawn({ life: 0.05 });
    pool.spawn({ x: 7, life: 1, r: 0.25 });
    pool.spawn({ life: 1 });
    const write = vi.spyOn(mesh, 'setMatrixAt');
    pool.update(0.1, p => p.x === 7, mesh);
    expect(pool.liveCount).toBe(1);
    expect(mesh.count).toBe(1);
    expect(write).toHaveBeenCalledTimes(1);
    const matrix = new THREE.Matrix4(); mesh.getMatrixAt(0, matrix);
    expect(matrix.elements[12]).toBe(7);
    expect(mesh.instanceColor!.array[0]).toBeCloseTo(0.25);
    expect(mesh.instanceMatrix.updateRanges).toEqual([{ start: 0, count: 16 }]);
    expect(mesh.instanceColor!.updateRanges).toEqual([{ start: 0, count: 3 }]);
    pool.update(1, () => true, mesh);
    expect(mesh.count).toBe(0);
    expect(mesh.visible).toBe(false);
    for (let i = 0; i < 20; i++) expect(pool.spawn({ life: 1 })).toBe(true);
    expect(pool.spawn({ life: 1 })).toBe(false);
  });
});
