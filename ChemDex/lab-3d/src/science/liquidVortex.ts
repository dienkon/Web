import type { VesselProfile } from '../pour/physics/profiles';
import { GRAVITY_M_S2, metersPerModelUnit } from './sceneUnits';

/** A regularized finite-core vortex. Lengths are MODEL-local, omega is rad/s.
 * dh/dr = v_theta^2/(g*r); the pressure surface and carrier use the same core.
 * This is an axisymmetric reduced model, not a CFD/turbulence solver. */
export interface VortexSurface {
  coreRadius: number;
  amplitude: number;
  offset: number;
  radius: number;
  angularSpeed_rad_s: number;
  phase_rad: number;
  meanLevel: number;
}
export const stirringAngularSpeed = (intensity: number) => 48 * Math.max(0, Math.min(1, Number.isFinite(intensity) ? intensity : 0));
export function vortexHeight(x: number, z: number, surface: VortexSurface) {
  const r2 = x * x + z * z, a2 = surface.coreRadius ** 2;
  return surface.offset + surface.amplitude * r2 / Math.max(1e-12, a2 + r2);
}
export function vortexSlope(radius: number, surface: VortexSurface) {
  const a2 = surface.coreRadius ** 2;
  return 2 * surface.amplitude * radius * a2 / Math.max(1e-12, (a2 + radius * radius) ** 2);
}
// Eight-point Gauss quadrature, split at every wall contour knot and surface
// transition. For a straight reservoir the offset also has an exact integral.
const nodes = [0.1834346425, 0.5255324099, 0.7966664774, 0.9602898565];
const weights = [0.3626837834, 0.3137066459, 0.2223810345, 0.1012285363];
export function vortexVolume(profile: VesselProfile, surface: Pick<VortexSurface, 'offset' | 'amplitude' | 'coreRadius'>) {
  const bottom = profile.baseY, top = bottom + profile.H;
  const cuts = [bottom, top, surface.offset, surface.offset + surface.amplitude,
    ...(profile.contour?.map(p => p[1]) ?? [])].filter(y => y >= bottom && y <= top).sort((a, b) => a - b);
  let volume = 0;
  const area = (y: number) => {
    const q = (y - surface.offset) / Math.max(1e-15, surface.amplitude);
    const dryR2 = surface.amplitude <= 1e-12 ? y <= surface.offset ? 0 : Infinity
      : q <= 0 ? 0 : q >= 1 ? Infinity : surface.coreRadius ** 2 * q / (1 - q);
    return Math.PI * Math.max(0, profile.r(y) ** 2 - dryR2);
  };
  for (let i = 1; i < cuts.length; i++) {
    const half = (cuts[i] - cuts[i - 1]) / 2, mid = (cuts[i] + cuts[i - 1]) / 2;
    for (let j = 0; half > 0 && j < nodes.length; j++) volume += half * weights[j] * (area(mid - half * nodes[j]) + area(mid + half * nodes[j]));
  }
  return volume;
}

export class LiquidVortex {
  angularSpeed_rad_s = 0;
  phase_rad = 0;
  surface?: VortexSurface;
  private last?: { profile: VesselProfile; fill: number; speed: number };
  reset() { this.angularSpeed_rad_s = this.phase_rad = 0; this.surface = this.last = undefined; }
  advance(dt: number, intensity: number, profile: VesselProfile, fillY: number, viscosity_mPa_s: number, density_g_ml: number, direction = 1, upright = true) {
    if (![dt, intensity, fillY, viscosity_mPa_s, density_g_ml, direction].every(Number.isFinite)
      || !(dt > 0) || !(viscosity_mPa_s > 0) || !(density_g_ml > 0)) return;
    const depth = fillY - profile.baseY, radius = profile.r(fillY), scale = metersPerModelUnit(profile);
    const available = upright && depth > 0.01 && radius > 0.01;
    const target = available ? stirringAngularSpeed(intensity) * (direction < 0 ? -1 : 1) : 0;
    const nu = Math.max(1e-8, viscosity_mPa_s * 0.001 / Math.max(1, density_g_ml * 1000));
    const spinDown = Math.max(0.25, Math.min(8, radius * scale / Math.sqrt(nu * Math.max(4, Math.abs(this.angularSpeed_rad_s)))));
    const tau = target ? 0.35 + spinDown * 0.12 : spinDown;
    const previous = this.angularSpeed_rad_s;
    this.angularSpeed_rad_s += (target - previous) * -Math.expm1(-dt / tau);
    if (Math.abs(this.angularSpeed_rad_s) < 0.005 && !target) this.angularSpeed_rad_s = 0;
    if (!available || Math.abs(this.angularSpeed_rad_s) < 0.005) {
      this.phase_rad = (this.phase_rad + (previous + this.angularSpeed_rad_s) * dt / 2) % (Math.PI * 2);
      this.surface = this.last = undefined; return;
    }
    const coreRadius = radius * 0.28, a2 = coreRadius ** 2, r2 = radius ** 2;
    const mean = 1 - a2 / r2 * Math.log1p(r2 / a2), rim = r2 / (a2 + r2);
    const pressureAmplitude = this.angularSpeed_rad_s ** 2 * a2 * scale / (2 * GRAVITY_M_S2);
    // Avoid silently creating an overflow or punching through the floor. The
    // surface is volume-preserving; the chemistry ledger is never displaced.
    const amplitude = Math.max(0, Math.min(pressureAmplitude, depth * 0.82 / mean,
      Math.max(0, profile.baseY + profile.H - fillY - 0.002) * 0.85 / Math.max(1e-8, rim - mean)));
    // Limit the carrier as well as the surface, retaining dh/dr=v²/(g*r).
    // Air-core entrainment/overflow are outside this reduced stirring model.
    if (amplitude < pressureAmplitude) this.angularSpeed_rad_s = Math.sign(this.angularSpeed_rad_s) * Math.sqrt(2 * GRAVITY_M_S2 * amplitude / (a2 * scale));
    this.phase_rad = (this.phase_rad + (previous + this.angularSpeed_rad_s) * dt / 2) % (Math.PI * 2);
    const old = this.last;
    let offset = fillY - amplitude * mean;
    if (profile.type !== 'beaker' && profile.type !== 'cylinder') {
      if (old && old.profile === profile && old.fill === fillY && Math.abs(old.speed - this.angularSpeed_rad_s) < 0.01 && this.surface) {
        this.surface.angularSpeed_rad_s = this.angularSpeed_rad_s; this.surface.phase_rad = this.phase_rad; return;
      }
      const targetVolume = vortexVolume(profile, { offset: fillY, amplitude: 0, coreRadius });
      let low = fillY - amplitude, high = fillY;
      for (let i = 0; i < 24; i++) {
        const middle = (low + high) / 2;
        if (vortexVolume(profile, { offset: middle, amplitude, coreRadius }) < targetVolume) low = middle; else high = middle;
      }
      offset = (low + high) / 2;
    }
    this.surface = { coreRadius, amplitude, offset, radius, meanLevel: fillY, angularSpeed_rad_s: this.angularSpeed_rad_s, phase_rad: this.phase_rad };
    this.last = { profile, fill: fillY, speed: this.angularSpeed_rad_s };
  }
}

/** Shared uniforms: (coreRadius², pressure amplitude, centre height, omega). */
export const VORTEX_GLSL = `
uniform vec4 uVortex;
float vortexOffset(vec2 p) { float r2 = dot(p,p); return uVortex.y * r2 / max(1e-12, uVortex.x + r2); }
float vortexLevel(vec2 p) { return uVortex.z + vortexOffset(p); }
`;
