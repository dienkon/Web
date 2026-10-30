import type { VesselProfile } from '../../pour/physics/profiles';
import type { Point3 } from './liquidParticleFrame';

/** Exact (up to roundoff) volume of a polygonal lathe below a plane. Within
 * intervals split at plane/vertex crossings, every clipped polygon vertex is
 * affine in y. Its area is quadratic, so three-point Simpson is exact. This
 * resolves arbitrarily thin wedges without a coarse fixed-y sampling grid. */
export function createPolygonBedVolume(profile: VesselProfile, normal: Point3, segments = 48) {
  const contour = profile.contour; if (!contour) return (_offset: number) => 0;
  const directions = Array.from({ length: segments }, (_, i) => [Math.sin(i * Math.PI * 2 / segments), Math.cos(i * Math.PI * 2 / segments)]);
  const projected = directions.map(([x, z]) => normal[0] * x + normal[2] * z);
  const minProjected = Math.min(...projected), maxProjected = Math.max(...projected), fullArea = segments * Math.sin(2 * Math.PI / segments) / 2;
  return (offset: number) => {
    const area = (r: number, y: number) => {
      const threshold = offset - normal[1] * y;
      let total = 0, count = 0, firstX = 0, firstZ = 0, lastX = 0, lastZ = 0;
      const append = (x: number, z: number) => {
        if (count++) total += lastX * z - lastZ * x; else { firstX = x; firstZ = z; }
        lastX = x; lastZ = z;
      };
      for (let i = 0; i < segments; i++) {
        const j = (i + 1) % segments, da = projected[i] * r - threshold, db = projected[j] * r - threshold;
        const a = directions[i], b = directions[j];
        if (da <= 0) append(a[0] * r, a[1] * r);
        if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
          const t = da / (da - db); append((a[0] + (b[0] - a[0]) * t) * r, (a[1] + (b[1] - a[1]) * t) * r);
        }
      }
      return Math.abs(total + lastX * firstZ - lastZ * firstX) / 2;
    };
    let volume = 0;
    for (let k = 1; k < contour.length; k++) {
      const [r0, y0] = contour[k - 1], [r1, y1] = contour[k]; if (!(y1 > y0)) continue;
      const slope = (r1 - r0) / (y1 - y0), intercept = r0 - slope * y0, breaks = [y0, y1];
      for (const d of projected) {
        const divisor = normal[1] + d * slope;
        if (Math.abs(divisor) > 1e-16) { const y = (offset - d * intercept) / divisor; if (y > y0 && y < y1) breaks.push(y); }
      }
      breaks.sort((a, b) => a - b);
      for (let i = 1; i < breaks.length; i++) {
        const a = breaks[i - 1], b = breaks[i], mid = (a + b) / 2;
        if (!(b > a)) continue;
        const radius = intercept + slope * mid, threshold = offset - normal[1] * mid;
        if (minProjected * radius > threshold) continue;
        if (maxProjected * radius <= threshold) {
          const ra = intercept + slope * a, rb = intercept + slope * b;
          volume += fullArea * (b - a) * (ra * ra + ra * rb + rb * rb) / 3; continue;
        }
        volume += (b - a) / 6 * (area(intercept + slope * a, a) + 4 * area(intercept + slope * mid, mid) + area(intercept + slope * b, b));
      }
    }
    return volume;
  };
}
export function polygonBedVolume(profile: VesselProfile, normal: Point3, offset: number, segments = 48) {
  return createPolygonBedVolume(profile, normal, segments)(offset);
}
