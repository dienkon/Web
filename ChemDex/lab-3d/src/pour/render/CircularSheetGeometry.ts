import * as THREE from 'three';
import { CENTIMETERS_PER_SCENE_UNIT, METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';

export const CIRCULAR_SHEET_SIDES = 48;
export interface CircularSheetPoint { y: number; radius: number; thickness: number }

/** Bound the radial error of both surfaces before volume correction. Contour
 * corners survive; redundant integration knots on straight glass do not add
 * thousands of nearly coplanar transparent triangles. 20 um is a display
 * tolerance, not a physical wetting parameter or a change to transport time. */
export function simplifySheetPoints(points: readonly CircularSheetPoint[], tolerance = 0.00002 / METERS_PER_SCENE_UNIT): CircularSheetPoint[] {
  if (points.length < 3) return [...points];
  const retained = new Set([0, points.length - 1]), pending = [[0, points.length - 1]];
  while (pending.length) {
    const [start, end] = pending.pop()!, a = points[start], b = points[end];
    if (end - start < 2 || !(a.y > b.y)) continue;
    let worst = tolerance, split = -1;
    for (let i = start + 1; i < end; i++) {
      const fraction = (a.y - points[i].y) / (a.y - b.y);
      const inner = a.radius + (b.radius - a.radius) * fraction;
      const outer = a.radius + a.thickness + (b.radius + b.thickness - a.radius - a.thickness) * fraction;
      const error = Math.max(Math.abs(points[i].radius - inner), Math.abs(points[i].radius + points[i].thickness - outer));
      if (error > worst) { worst = error; split = i; }
    }
    if (split >= 0) { retained.add(split); pending.push([start, split], [split, end]); }
  }
  return [...retained].sort((a, b) => a - b).map(i => points[i]);
}
export interface CircularSheet {
  center: [number, number];
  points: CircularSheetPoint[];
  volume_ml: number;
  color: string;
  /** Keep polygon chords outside the supporting glass, not inside it. */
  supported?: boolean;
}

/** Closed annular sheets, with shared circumferential/longitudinal vertices.
 * A single positive thickness correction preserves the finite interval volume
 * without seams between contour segments or internal transparent radial faces. */
export class CircularSheetGeometry extends THREE.BufferGeometry {
  private vertexCapacity = 0;
  private indexCapacity = 0;
  private color = new THREE.Color();
  update(sheets: readonly CircularSheet[]) {
    const sides = CIRCULAR_SHEET_SIDES, stride = sides + 1;
    const vertices = sheets.reduce((sum, s) => sum + s.points.length * 2 * stride, 0);
    const count = sheets.reduce((sum, s) => sum + s.points.length * sides * 12, 0);
    if (vertices > this.vertexCapacity) {
      super.dispose();
      this.vertexCapacity = Math.max(512, 2 ** Math.ceil(Math.log2(vertices)));
      for (const name of ['position', 'normal', 'color']) this.setAttribute(name,
        new THREE.BufferAttribute(new Float32Array(this.vertexCapacity * 3), 3).setUsage(THREE.DynamicDrawUsage));
    }
    if (count > this.indexCapacity) {
      this.indexCapacity = Math.max(1024, 2 ** Math.ceil(Math.log2(count)));
      this.setIndex(new THREE.BufferAttribute(new Uint32Array(this.indexCapacity), 1).setUsage(THREE.DynamicDrawUsage));
    }
    this.setDrawRange(0, count);
    if (!count) return;
    const positions = this.attributes.position.array as Float32Array, colors = this.attributes.color.array as Float32Array;
    const indices = this.index!.array as Uint32Array;
    let vertex = 0, cursor = 0;
    const delta = 2 * Math.PI / sides;
    for (const sheet of sheets) {
      const radii = sheet.points.map(p => sheet.supported ? (p.radius + 0.0001) / Math.cos(delta / 2) : p.radius);
      let quadratic = 0, linear = 0;
      for (let i = 1; i < sheet.points.length; i++) {
        const a = sheet.points[i - 1], b = sheet.points[i], ra = radii[i - 1], rb = radii[i];
        const factor = (a.y - b.y) * sides * Math.sin(delta) / 6;
        quadratic += factor * (a.thickness ** 2 + a.thickness * b.thickness + b.thickness ** 2);
        linear += factor * (2 * ra * a.thickness + ra * b.thickness + rb * a.thickness + 2 * rb * b.thickness);
      }
      const volume = sheet.volume_ml / CENTIMETERS_PER_SCENE_UNIT ** 3;
      const scale = 2 * volume / (linear + Math.sqrt(linear * linear + 4 * quadratic * volume));
      this.color.set(sheet.color);
      const base = vertex;
      for (let j = 0; j < sheet.points.length; j++) for (let ring = 0; ring < 2; ring++) for (let i = 0; i <= sides; i++) {
        const theta = delta * i, radius = radii[j] + ring * sheet.points[j].thickness * scale;
        const k = vertex++ * 3;
        positions[k] = sheet.center[0] + radius * Math.cos(theta); positions[k + 1] = sheet.points[j].y;
        positions[k + 2] = sheet.center[1] + radius * Math.sin(theta);
        colors[k] = this.color.r; colors[k + 1] = this.color.g; colors[k + 2] = this.color.b;
      }
      const triangle = (a: number, b: number, c: number) => { indices[cursor++] = a; indices[cursor++] = b; indices[cursor++] = c; };
      for (let j = 0; j < sheet.points.length - 1; j++) for (let i = 0; i < sides; i++) {
        const a = base + j * 2 * stride + i, b = a + 2 * stride;
        triangle(a, b, a + 1); triangle(a + 1, b, b + 1);
        triangle(a + stride, a + stride + 1, b + stride); triangle(a + stride + 1, b + stride + 1, b + stride);
      }
      for (let i = 0; i < sides; i++) {
        const top = base + i, bottom = base + (sheet.points.length - 1) * 2 * stride + i;
        triangle(top, top + 1, top + stride); triangle(top + 1, top + stride + 1, top + stride);
        triangle(bottom, bottom + stride, bottom + 1); triangle(bottom + 1, bottom + stride, bottom + stride + 1);
      }
    }
    const normals = this.attributes.normal.array as Float32Array;
    // Only active triangles participate. Buffer capacity may still contain
    // triangles from a longer, older interval, outside the current draw range.
    normals.fill(0, 0, vertex * 3);
    for (let i = 0; i < count; i += 3) {
      const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
      const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
      const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      normals[a] += nx; normals[a + 1] += ny; normals[a + 2] += nz;
      normals[b] += nx; normals[b + 1] += ny; normals[b + 2] += nz;
      normals[c] += nx; normals[c + 1] += ny; normals[c + 2] += nz;
    }
    for (let k = 0; k < vertex * 3; k += 3) {
      const length = Math.hypot(normals[k], normals[k + 1], normals[k + 2]) || 1;
      normals[k] /= length; normals[k + 1] /= length; normals[k + 2] /= length;
    }
    // The duplicated UV seam shares its normal, so water has no radial crease.
    for (let row = 0; row < vertex; row += stride) {
      const a = row * 3, b = (row + sides) * 3;
      const x = normals[a] + normals[b], y = normals[a + 1] + normals[b + 1], z = normals[a + 2] + normals[b + 2];
      const length = Math.hypot(x, y, z) || 1;
      for (const k of [a, b]) { normals[k] = x / length; normals[k + 1] = y / length; normals[k + 2] = z / length; }
    }
    for (const name of ['position', 'normal', 'color']) {
      const a = this.attributes[name] as THREE.BufferAttribute;
      a.clearUpdateRanges(); a.addUpdateRange(0, vertex * 3); a.needsUpdate = true;
    }
    this.index!.clearUpdateRanges(); this.index!.addUpdateRange(0, count); this.index!.needsUpdate = true;
  }
}
