import type { VesselProfile } from './profiles';

/** Area of the disk x <= s. Small caps avoid subtraction cancellation. */
export function segArea(radius: number, s: number): number {
  if (!(radius > 0) || s <= -radius) return 0;
  const disk = Math.PI * radius * radius;
  if (s >= radius) return disk;
  const angle = 2 * Math.asin(Math.sqrt(Math.max(0, (radius - Math.abs(s)) / (2 * radius))));
  const a2 = angle * angle;
  const cap = radius * radius * (angle < 0.01
    ? angle * a2 * (2 / 3 + a2 * (-2 / 15 + a2 * (4 / 315 + a2 * (-2 / 2835 + a2 * 4 / 155925))))
    : angle - Math.sin(angle) * Math.cos(angle));
  return s < 0 ? cap : disk - cap;
}

type Piece = { a: number; b: number; r0: number; r1: number; slope: number; volume: number };
const cache = new WeakMap<VesselProfile, Map<number, Piece[]>>();
const frustum = (a: number, b: number, h: number) => Math.PI * h * (a * a + a * b + b * b) / 3;
function piecesFor(profile: VesselProfile, count: number): Piece[] {
  const countKey = profile.contour ? 0 : Math.max(8, Math.ceil(count));
  let byCount = cache.get(profile);
  if (!byCount) { byCount = new Map(); cache.set(profile, byCount); }
  const hit = byCount.get(countKey); if (hit) return hit;
  const points = profile.contour ?? Array.from({ length: countKey + 1 }, (_, i) => {
    const y = profile.baseY + profile.H * i / countKey;
    return [profile.r(y), y] as const;
  });
  const pieces: Piece[] = [];
  for (let i = 1; i < points.length; i++) {
    const [r0, a] = points[i - 1], [r1, b] = points[i];
    if (b > a) pieces.push({ a, b, r0, r1, slope: (r1 - r0) / (b - a), volume: frustum(r0, r1, b - a) });
  }
  byCount.set(countKey, pieces); return pieces;
}

// Gauss–Legendre 16, y=a+(b-a)sin²(u): smooth tangent endpoints of V and dV/dc.
const rule: { position: number; weight: number }[] = [];
for (let i = 1; i <= 16; i++) {
  let x = Math.cos(Math.PI * (i - 0.25) / 16.5), derivative = 0;
  for (let j = 0; j < 20; j++) {
    let p0 = 1, p1 = x;
    for (let k = 2; k <= 16; k++) { const next = ((2 * k - 1) * x * p1 - (k - 1) * p0) / k; p0 = p1; p1 = next; }
    derivative = 16 * (x * p1 - p0) / (x * x - 1);
    const delta = p1 / derivative; x -= delta;
    if (Math.abs(delta) < 1e-15) break;
  }
  const u = (x + 1) * Math.PI / 4;
  rule.push({ position: Math.sin(u) ** 2, weight: 2 / ((1 - x * x) * derivative * derivative) * Math.PI / 4 * Math.sin(2 * u) });
}

export interface PlaneSection { volume: number; area: number }
/** Round solid of revolution with a piecewise linear radius. Normal is unit
 * length. Functional profiles without a contour use `count` linear segments. */
export function roundPlaneVolume(profile: VesselProfile, nx: number, ny: number, count = 64) {
  nx = Math.abs(nx);
  if (nx < 4 * Number.EPSILON) { nx = 0; ny = Math.sign(ny); }
  const pieces = piecesFor(profile, count);
  let low = Infinity, high = -Infinity, full = 0;
  for (const p of pieces) {
    low = Math.min(low, ny * p.a - nx * p.r0, ny * p.b - nx * p.r1);
    high = Math.max(high, ny * p.a + nx * p.r0, ny * p.b + nx * p.r1);
    full += p.volume;
  }
  const evaluate = (c: number): PlaneSection => {
    if (c <= low) return { volume: 0, area: 0 };
    if (c >= high) return { volume: full, area: 0 };
    let volume = 0, area = 0;
    for (const p of pieces) {
      if (nx === 0) {
        const boundary = c / ny;
        const a = ny > 0 ? p.a : Math.max(p.a, boundary);
        const b = ny > 0 ? Math.min(p.b, boundary) : p.b;
        if (b > a) volume += frustum(p.r0 + p.slope * (a - p.a), p.r0 + p.slope * (b - p.a), b - a);
        if (boundary >= p.a && boundary < p.b) area = Math.PI * (p.r0 + p.slope * (boundary - p.a)) ** 2;
        continue;
      }
      const knots = [p.a, p.b];
      for (const side of [-1, 1]) {
        const denominator = ny + side * nx * p.slope;
        const y = p.a + (c - ny * p.a - side * nx * p.r0) / denominator;
        if (y > p.a && y < p.b) knots.push(y);
      }
      knots.sort((a, b) => a - b);
      for (let k = 1; k < knots.length; k++) {
        const a = knots[k - 1], b = knots[k], middle = (a + b) / 2;
        const radius = p.r0 + p.slope * (middle - p.a), s = (c - ny * middle) / nx;
        if (s >= radius) {
          volume += frustum(p.r0 + p.slope * (a - p.a), p.r0 + p.slope * (b - p.a), b - a);
        } else if (s > -radius) {
          for (const node of rule) {
            const y = a + (b - a) * node.position, r = p.r0 + p.slope * (y - p.a);
            const cut = (c - ny * y) / nx, weight = (b - a) * node.weight;
            volume += weight * segArea(r, cut);
            area += weight * 2 * Math.sqrt(Math.max(0, (r - cut) * (r + cut))) / nx;
          }
        }
      }
    }
    return { volume: Math.max(0, Math.min(full, volume)), area: Math.max(0, area) };
  };
  return { low, high, full, evaluate };
}
