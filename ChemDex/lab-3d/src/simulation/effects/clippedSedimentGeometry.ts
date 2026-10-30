import * as THREE from 'three';
import type { LiquidPlane } from './liquidParticleFrame';
import { vesselInterior } from '../../science/vesselDimensions';

/** Closed polygonal reservoir intersected with a half-space. The cap follows
 * actual intersection edge loops; it is not a rotated cylinder outside glass. */
export function createClippedSedimentGeometry(type: string, plane: LiquidPlane, segments = 48) {
  const profile = vesselInterior(type), points = profile.points.map(([r, y]) => new THREE.Vector2(r, y));
  points.push(new THREE.Vector2(0, profile.topY));
  const source = new THREE.LatheGeometry(points, segments), positions = source.attributes.position, index = source.index!;
  const normal = new THREE.Vector3(...plane.normal), vertices: number[] = [];
  const nodes = new Map<string, { point: THREE.Vector3; neighbors: Set<string> }>();
  const key = (p: THREE.Vector3) => [p.x, p.y, p.z].map(v => Math.round(v * 1e8)).join(':');
  const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => { vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray()); };
  for (let i = 0; i < index.count; i += 3) {
    const poly = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(positions, index.getX(i + j)));
    const clipped: THREE.Vector3[] = [], cuts: THREE.Vector3[] = [];
    for (let j = 0; j < 3; j++) {
      const a = poly[j], b = poly[(j + 1) % 3], da = normal.dot(a) - plane.offset, db = normal.dot(b) - plane.offset;
      if (da <= 0) clipped.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
        const p = a.clone().lerp(b, da / (da - db)); clipped.push(p); cuts.push(p);
      } else if (da === 0) cuts.push(a);
    }
    for (let j = 1; j + 1 < clipped.length; j++) triangle(clipped[0], clipped[j], clipped[j + 1]);
    const unique = [...new Map(cuts.map(p => [key(p), p])).values()];
    if (unique.length === 2 && key(unique[0]) !== key(unique[1])) {
      const [a, b] = unique.map(key);
      if (!nodes.has(a)) nodes.set(a, { point: unique[0], neighbors: new Set() });
      if (!nodes.has(b)) nodes.set(b, { point: unique[1], neighbors: new Set() });
      nodes.get(a)!.neighbors.add(b); nodes.get(b)!.neighbors.add(a);
    }
  }
  const axis = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(axis, normal).normalize(), v = new THREE.Vector3().crossVectors(normal, u);
  const visited = new Set<string>();
  for (const start of nodes.keys()) {
    if (visited.has(start)) continue;
    const loop: THREE.Vector3[] = []; let current = start, previous = '';
    for (let step = 0; step <= nodes.size; step++) {
      const node = nodes.get(current)!; loop.push(node.point); visited.add(current);
      const next = [...node.neighbors].find(k => k !== previous && (!visited.has(k) || k === start));
      if (!next || next === start) break;
      previous = current; current = next;
    }
    if (loop.length < 3) continue;
    const projected = loop.map(p => new THREE.Vector2(p.dot(u), p.dot(v)));
    const work = THREE.ShapeUtils.triangulateShape(projected, []), capTriangles: number[][] = [];
    // Earcut may omit collinear boundary points. Reinsert them so the cap
    // shares every wall edge instead of leaving topological T-junctions.
    const boundaryChains = new Map<string, number[]>();
    for (let i = 0; i < loop.length; i++) {
      const first = (i + 1) % loop.length, edge = loop[first].clone().sub(loop[i]), length = edge.length(), chain = [i, first];
      if (!(length > 0)) continue;
      for (let step = 2; step < loop.length; step++) {
        const j = (i + step) % loop.length, offset = loop[j].clone().sub(loop[i]);
        if (new THREE.Vector3().crossVectors(offset, edge).length() > 1e-7 * length || offset.dot(edge) <= 0) break;
        chain.push(j); boundaryChains.set(`${i}:${j}`, [...chain]); boundaryChains.set(`${j}:${i}`, [...chain].reverse());
      }
    }
    while (work.length) {
      const tri = work.pop()!; let split = false;
      for (let e = 0; e < 3; e++) {
        const chain = boundaryChains.get(`${tri[e]}:${tri[(e + 1) % 3]}`); if (!chain) continue;
        for (let k = 1; k < chain.length; k++) work.push([chain[k - 1], chain[k], tri[(e + 2) % 3]]);
        split = true; break;
      }
      if (!split) capTriangles.push(tri);
    }
    for (const [ia, ib, ic] of capTriangles) {
      const [a, b, c] = [loop[ia], loop[ib], loop[ic]];
      if (new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).dot(normal) >= 0) triangle(a, b, c);
      else triangle(a, c, b);
    }
  }
  source.dispose();
  const uniqueVertices: number[] = [], indices: number[] = [], lookup = new Map<string, number>();
  for (let i = 0; i < vertices.length; i += 3) {
    const k = vertices.slice(i, i + 3).map(n => Math.round(n * 1e8)).join(':');
    let index = lookup.get(k);
    if (index === undefined) { index = uniqueVertices.length / 3; lookup.set(k, index); uniqueVertices.push(...vertices.slice(i, i + 3)); }
    indices.push(index);
  }
  const faces: number[] = [];
  for (let i = 0; i < indices.length; i += 3) if (indices[i] !== indices[i + 1] && indices[i] !== indices[i + 2] && indices[i + 1] !== indices[i + 2]) faces.push(...indices.slice(i, i + 3));
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(uniqueVertices, 3)); geometry.setIndex(faces);
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}
