import type { SessileDropShape } from './sessileDrop';

function simpson(f: (x: number) => number, a: number, b: number, tolerance: number, depth = 16): number {
  const middle = (a + b) / 2, fa = f(a), fm = f(middle), fb = f(b);
  const whole = (b - a) * (fa + 4 * fm + fb) / 6;
  const refine = (left: number, right: number, fl: number, fc: number, fr: number,
    previous: number, tol: number, remaining: number): number => {
    const centre = (left + right) / 2, q1 = (left + centre) / 2, q3 = (centre + right) / 2;
    const f1 = f(q1), f3 = f(q3);
    const first = (centre - left) * (fl + 4 * f1 + fc) / 6;
    const second = (right - centre) * (fc + 4 * f3 + fr) / 6;
    const error = first + second - previous;
    if (remaining <= 0 || Math.abs(error) <= 15 * tol) return first + second + error / 15;
    return refine(left, centre, fl, f1, fc, first, tol / 2, remaining - 1)
      + refine(centre, right, fc, f3, fr, second, tol / 2, remaining - 1);
  };
  return refine(a, b, fa, fm, fb, whole, tolerance, depth);
}

/** Volume beneath a circular collector footprint, not just overlap area.
 * The collector removes the full vertical liquid column that it touches.
 * This idealization does not model sponge porosity or absorption kinetics. */
export function puddleOverlapFraction(shape: SessileDropShape, distance_m: number, collectorRadius_m: number): number {
  if (![distance_m, collectorRadius_m].every(Number.isFinite) || distance_m < 0 || collectorRadius_m <= 0) return 0;
  const R = shape.radius_m;
  if (!(R > 0) || !(shape.height_m > 0) || distance_m >= R + collectorRadius_m) return 0;
  if (collectorRadius_m >= distance_m + R) return 1;
  const d = distance_m / R, a = collectorRadius_m / R;
  const angularFraction = (r: number) => {
    if (d === 0) return r <= a ? 1 : 0;
    if (r === 0) return d < a ? 1 : 0;
    if (r + d <= a) return 1;
    if (r >= d + a || d >= r + a) return 0;
    return Math.acos(Math.max(-1, Math.min(1, (r * r + d * d - a * a) / (2 * r * d)))) / Math.PI;
  };
  let overlap = 0, total = 0;
  const profile = shape.profile;
  for (let i = 1; i < profile.length; i++) {
    const x0 = profile[i - 1].radius_m / R, x1 = profile[i].radius_m / R;
    if (!(x1 > x0)) continue;
    const h0 = profile[i - 1].height_m / shape.height_m, h1 = profile[i].height_m / shape.height_m;
    const slope = (h1 - h0) / (x1 - x0), intercept = h0 - slope * x0;
    const primitive = (x: number) => slope * x ** 3 / 3 + intercept * x * x / 2;
    total += primitive(x1) - primitive(x0);
    // Split at circle tangencies; no discontinuity is hidden inside quadrature.
    const boundaries = [x0, x1, Math.abs(d - a), d + a, a - d]
      .filter(x => x >= x0 && x <= x1).sort((x, y) => x - y);
    for (let j = 1; j < boundaries.length; j++) {
      const left = boundaries[j - 1], right = boundaries[j];
      if (right <= left) continue;
      if (d === 0) {
        const end = Math.min(a, right);
        if (end > left) overlap += primitive(end) - primitive(left);
      } else overlap += simpson(x => x * Math.max(0, slope * x + intercept) * angularFraction(x), left, right, 1e-10 * (right - left));
    }
  }
  return total > 0 ? Math.max(0, Math.min(1, overlap / total)) : 0;
}
