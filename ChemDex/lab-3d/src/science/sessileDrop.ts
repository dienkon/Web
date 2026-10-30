/** Axisymmetric hydrostatic Young–Laplace solution on a horizontal plane.
 * The default contact angle is a tabletop assumption, not measured chemistry. */
export interface SessileDropOptions {
  contactAngle_deg?: number;
  surfaceTension_N_m?: number;
  densityContrast_kg_m3?: number;
  gravity_m_s2?: number;
}
export interface SessileDropShape {
  radius_m: number;
  height_m: number;
  volume_m3: number;
  apexCurvature_m_inv: number;
  contactAngle_deg: number;
  /** Apex to contact line; y is height above the tabletop. */
  profile: { radius_m: number; height_m: number }[];
}
type State = [number, number, number, number]; // r, depth below apex, tangent angle, volume

function derivative(a: State, b: number): State {
  const [r, z, angle] = a;
  return [Math.cos(angle), Math.sin(angle), 2 * b + z - Math.sin(angle) / r,
    Math.PI * r * r * Math.sin(angle)];
}
function rk4(a: State, h: number, b: number): State {
  const add = (s: State, k: State, scale: number) => s.map((x, i) => x + scale * k[i]) as State;
  const k1 = derivative(a, b), k2 = derivative(add(a, k1, h / 2), b);
  const k3 = derivative(add(a, k2, h / 2), b), k4 = derivative(add(a, k3, h), b);
  return a.map((x, i) => x + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) as State;
}

/** Dimensionless capillary-length coordinates; curvature at the apex is b. */
function integrate(b: number, targetAngle: number, capture = false) {
  const epsilon = Math.min(1e-5, 1e-5 / b);
  let a: State = [epsilon, b * epsilon ** 2 / 2, b * epsilon, Math.PI * b * epsilon ** 4 / 4];
  let step = Math.min(0.04, 0.04 / b);
  const points: State[] = capture ? [[0, 0, 0, 0], [...a]] : [];
  for (let i = 0; i < 30000; i++) {
    if (targetAngle - a[2] < 1e-9) return { end: a, points };
    const full = rk4(a, step, b);
    const half = rk4(a, step / 2, b), next = rk4(half, step / 2, b);
    if (next.some(x => !Number.isFinite(x)) || next[2] <= a[2]) return null;
    if (next[2] > targetAngle + 1e-9) {
      step *= Math.max(0.05, Math.min(0.95, (targetAngle - a[2]) / (next[2] - a[2])));
      continue;
    }
    const error = Math.max(...next.map((x, j) => Math.abs(x - full[j]) / (1e-11 + 1e-7 * Math.abs(x))));
    if (error > 1) { step *= Math.max(0.2, 0.8 * error ** -0.2); continue; }
    a = next;
    if (capture) points.push([...a]);
    step = Math.min(0.08, step * Math.min(2, 0.9 * Math.max(error, 1e-8) ** -0.2));
  }
  return null;
}

const cache = new Map<string, SessileDropShape | null>();
export function solveSessileDrop(volume_ml: number, options: SessileDropOptions = {}): SessileDropShape | null {
  const { contactAngle_deg: angle = 60, surfaceTension_N_m: sigma = 0.072,
    densityContrast_kg_m3: rho = 998, gravity_m_s2: gravity = 9.80665 } = options;
  if (![volume_ml, angle, sigma, rho, gravity].every(Number.isFinite)
    || volume_ml <= 0 || angle < 5 || angle > 90 || sigma <= 0 || rho <= 0 || gravity <= 0) return null;
  const key = [volume_ml, angle, sigma, rho, gravity].join(':');
  if (cache.has(key)) return cache.get(key)!;
  const length = Math.sqrt(sigma / (rho * gravity)), theta = angle * Math.PI / 180;
  const targetVolume = volume_ml * 1e-6 / length ** 3;
  const c = Math.cos(theta);
  const sphereCurvature = Math.cbrt(Math.PI * (2 - 3 * c + c ** 3) / (3 * targetVolume));
  let high = Math.log(Math.max(1, sphereCurvature * 2)), low = high;
  const upper = integrate(Math.exp(high), theta);
  if (!upper) return null;
  let highValue = Math.log(upper.end[3] / targetVolume), lowValue = highValue;
  let bracketed = false;
  // Large puddles have height -> 2*l_c*sin(theta/2). Use that asymptote
  // only to bracket apex curvature; the returned shape still solves the ODE.
  const flatRadius = Math.sqrt(targetVolume / (2 * Math.PI * Math.sin(theta / 2)));
  const initialSpan = Math.max(4, 1.3 * flatRadius + 4);
  for (let i = 0; i < 150; i++) {
    low -= i === 0 ? initialSpan : 4;
    const result = integrate(Math.exp(low), theta);
    if (!result) return null;
    if (result.end[3] >= targetVolume) { lowValue = Math.log(result.end[3] / targetVolume); bracketed = true; break; }
  }
  if (!bracketed) return null;
  let root = (low + high) / 2;
  for (let i = 0; i < 40; i++) {
    const fraction = Math.max(0.05, Math.min(0.95, lowValue / (lowValue - highValue)));
    const middle = low + (high - low) * fraction, result = integrate(Math.exp(middle), theta);
    if (!result) return null;
    root = middle;
    const value = Math.log(result.end[3] / targetVolume);
    if (Math.abs(value) < 1e-8) break;
    if (value > 0) { low = middle; lowValue = value; } else { high = middle; highValue = value; }
  }
  const b = Math.exp(root), result = integrate(b, theta, true);
  if (!result) return null;
  const [radius, depth, , volume] = result.end;
  if (Math.abs(volume / targetVolume - 1) > 2e-7) return null;
  const shape: SessileDropShape = { radius_m: radius * length, height_m: depth * length,
    volume_m3: volume * length ** 3, apexCurvature_m_inv: b / length, contactAngle_deg: angle,
    profile: result.points.map(p => ({ radius_m: p[0] * length, height_m: (depth - p[1]) * length })) };
  if (cache.size >= 128) cache.delete(cache.keys().next().value!);
  cache.set(key, shape);
  return shape;
}
