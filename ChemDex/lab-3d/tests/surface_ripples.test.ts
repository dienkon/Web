import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3, Vector4 } from 'three';
import { MAX_SURFACE_RIPPLES, SurfaceRipples } from '../src/vfx/materials/surfaceRipples';

const uniform = () => Array.from({ length: MAX_SURFACE_RIPPLES }, () => new Vector4());

describe('localized liquid ripples', () => {
  it('projects the contact into a tilted, scaled meniscus and preserves its sign', () => {
    const pulses = new SurfaceRipples(), rows = uniform();
    const cap = new Matrix4().compose(new Vector3(0.15, 0.2, -0.1),
      new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.4), new Vector3(0.6, 0.6, 1));
    const contact = new Vector3(0.43, -0.24, 0.03).applyMatrix4(cap);
    pulses.add(contact, -0.4);
    contact.set(0, 0, 0);
    pulses.write(rows, cap);
    expect(rows[0].x).toBeCloseTo(0.43, 12);
    expect(rows[0].y).toBeCloseTo(-0.24, 12);
    expect(rows[0].toArray().slice(2)).toEqual([0, -0.4]);
  });

  it('deduplicates rapid contacts only at the same source, freezes and expires', () => {
    const pulses = new SurfaceRipples(), rows = uniform(), matrix = new Matrix4();
    pulses.add(new Vector3(0.2, 0, 0), 0.4);
    pulses.advance(0.02);
    pulses.add(new Vector3(0.22, 0, 0), 0.4);
    pulses.add(new Vector3(-0.25, 0, 0), 0.5);
    pulses.write(rows, matrix);
    expect(rows.filter(row => row.w !== 0)).toHaveLength(2);
    const paused = rows.map(row => row.toArray());
    pulses.advance(0);
    pulses.write(rows, matrix);
    expect(rows.map(row => row.toArray())).toEqual(paused);
    pulses.advance(0.15);
    pulses.write(rows, matrix);
    expect(rows[0].z).toBeGreaterThan(paused[0][2]);
    expect(rows[0].w).toBeLessThan(paused[0][3]);
    pulses.advance(0.65);
    pulses.write(rows, matrix);
    expect(rows.every(row => row.w === 0)).toBe(true);
  });

  it('bounds the shader batch and clears pulses when the specimen is replaced', () => {
    const pulses = new SurfaceRipples(), rows = uniform(), matrix = new Matrix4();
    for (let i = 0; i < 20; i++) pulses.add(new Vector3(i / 10, 0, 0), 2);
    pulses.add(new Vector3(Infinity, 0, 0), 1);
    pulses.write(rows, matrix);
    expect(rows.at(-1)?.toArray()).toEqual([1.9, 0, 0, 1]);
    expect(rows.every(row => row.w === 1)).toBe(true);
    pulses.clear();
    pulses.write(rows, matrix);
    expect(rows.every(row => row.w === 0)).toBe(true);
  });
});
