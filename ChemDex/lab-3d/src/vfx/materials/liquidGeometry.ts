import type { VesselProfile } from '../../pour/physics/profiles';
import { LatheGeometry, Vector2 } from 'three';

/** A circular ring's inward chord error grows relative to a shallow wedge.
 * Choose power-of-two rings from that sagitta/depth ratio. This is a bounded
 * rendering heuristic, verified against polygon volume, not a fluid solver.
 * 64 sides already limit the full-ring volume deficit to about 0.161%. */
export function liquidRadialSegments(profile: VesselProfile, tilt: number, depth: number): number {
  const radius = Math.max(...(profile.contour?.map(([r]) => r) ?? [profile.mouthR]));
  const required = Math.PI * Math.sqrt(3 * radius * Math.abs(Math.sin(tilt)) / (2 * 0.002 * depth));
  return Math.max(64, Math.min(65536, 2 ** Math.ceil(Math.log2(Math.max(64, required || 64)))));
}

export interface LiquidMeshLayout {
  key: string;
  fineSegments: number;
  wetArcSteps: number;
  supportIndex: number;
  angles: readonly number[];
}

const layouts = new Map<string, LiquidMeshLayout>();
/** Canonical wet direction is +z. On each linear contour segment the wet
 * angle threshold (ny*y-c)/r(y) is monotone, so its widest arc occurs at an
 * endpoint. Refine that union only; the dry remainder keeps 64-side rings.
 * Bucket the union upward to a base cell, never cutting off a wet interval. */
export function liquidMeshLayout(profile: VesselProfile, tilt: number, c: number, depth: number): LiquidMeshLayout {
  const fineSegments = liquidRadialSegments(profile, tilt, depth);
  const horizontal = Math.abs(Math.sin(tilt)), ny = Math.cos(tilt), baseStep = Math.PI / 32;
  let halfAngle = 0;
  if (fineSegments > 64 && horizontal > 1e-12) {
    const contour = profile.contour ?? [];
    for (let i = 1; i < contour.length; i++) {
      if (!(contour[i][1] > contour[i - 1][1])) continue;
      for (const [r, y] of [contour[i - 1], contour[i]]) {
        if (r > 0) halfAngle = Math.max(halfAngle, Math.acos(Math.max(-1, Math.min(1, (ny * y - c) / (horizontal * r)))));
        // A wet cone tip has a full angular neighborhood as r tends to zero.
        // Axis points on a zero-height floor closure do not have this limit.
        else if (c > ny * y) halfAngle = Math.PI;
      }
    }
    // Functional profiles have no certified segment endpoints: refine all.
    if (!profile.contour) halfAngle = Math.PI;
  }
  const wetArcSteps = Math.min(32, Math.ceil(halfAngle / baseStep));
  // A fixed contour support point keeps the small wet wedge near zero in
  // both y and z. The minimizing endpoint changes only at discrete angles,
  // so this origin can be cached while the vessel moves continuously.
  let supportIndex = ny < 0 ? -2 : -1, minimum = Infinity;
  if (horizontal > 1e-12) for (let i = 0; i < (profile.contour?.length ?? 0); i++) {
    const [r, y] = profile.contour![i], projection = ny * y - horizontal * r;
    if (projection < minimum) { minimum = projection; supportIndex = i; }
  }
  const key = `${fineSegments}:${wetArcSteps}:${supportIndex}`;
  const cached = layouts.get(key); if (cached) return cached;
  const indices = new Set<number>();
  for (let i = 0; i <= 64; i++) indices.add(i * fineSegments / 64);
  const end = Math.min(fineSegments / 2, Math.ceil(wetArcSteps * fineSegments / 64));
  for (let i = 0; i <= end; i++) { indices.add(i); indices.add(fineSegments - i); }
  const angles = [...indices].sort((a, b) => a - b).map(i => i * Math.PI * 2 / fineSegments);
  const result = { key, fineSegments, wetArcSteps, supportIndex, angles };
  if (layouts.size >= 256) layouts.delete(layouts.keys().next().value!);
  layouts.set(key, result); return result;
}

export function liquidMeshOrigin(profile: VesselProfile, layout: LiquidMeshLayout) {
  return layout.supportIndex >= 0 ? { y: profile.contour![layout.supportIndex][1], z: profile.contour![layout.supportIndex][0] }
    : { y: profile.baseY + (layout.supportIndex === -2 ? profile.H : 0), z: 0 };
}

/** Closed reservoir boundary, rebased to a support point before Float32 storage.
 * Three's lathe connectivity and meridian normals are retained; angular
 * samples are nonuniform. No physical inventory or surface level is changed. */
export function createLiquidVolumeGeometry(profile: VesselProfile, layout: LiquidMeshLayout): LatheGeometry {
  const contour = profile.contour ?? Array.from({ length: 65 }, (_, i) => {
    const y = profile.baseY + profile.H * i / 64; return [profile.r(y), y] as const;
  });
  const { y: originY, z: originZ } = liquidMeshOrigin(profile, layout);
  const points = [...contour.map(([r, y]) => new Vector2(r, y - originY)), new Vector2(0, profile.baseY + profile.H - originY)];
  const g = new LatheGeometry(points, layout.angles.length - 1);
  const p = g.attributes.position, normals = g.attributes.normal, uv = g.attributes.uv;
  const radialNormals = points.map((_, j) => normals.getZ(j)), yNormals = points.map((_, j) => normals.getY(j));
  for (let i = 0; i < layout.angles.length; i++) {
    const angle = layout.angles[i], sin = Math.sin(angle), cos = Math.cos(angle);
    for (let j = 0; j < points.length; j++) {
      const index = i * points.length + j;
      p.setXYZ(index, points[j].x * sin, points[j].y, points[j].x * cos - originZ);
      normals.setXYZ(index, radialNormals[j] * sin, yNormals[j], radialNormals[j] * cos);
      uv.setX(index, angle / (2 * Math.PI));
    }
  }
  g.userData.liquid = { layoutKey: layout.key, fineSegments: layout.fineSegments, wetArcSteps: layout.wetArcSteps,
    angles: layout.angles, originY, originZ };
  return g;
}
