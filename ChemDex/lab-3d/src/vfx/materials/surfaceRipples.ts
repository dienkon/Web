import { Matrix4, Vector3, type Vector4 } from 'three';

export const MAX_SURFACE_RIPPLES = 6;
const LIFETIME_S = 0.65;
const SAME_SOURCE_INTERVAL_S = 0.1;
const SAME_SOURCE_DISTANCE_SQUARED = 0.055 ** 2;

interface SurfaceRipple {
  position: Vector3;
  strength: number;
  age_s: number;
}

export function impactRippleStrength(volume_ml: number) {
  return Number.isFinite(volume_ml) && volume_ml > 0 ? Math.min(0.7, 0.14 + Math.sqrt(volume_ml) * 0.28) : 0;
}

/** Short-lived optical waves in the vessel frame. */
export class SurfaceRipples {
  private pulses: SurfaceRipple[] = [];
  private scratch = new Vector3();
  private vesselToCap = new Matrix4();

  get count() { return this.pulses.length; }

  add(position: Vector3, strength: number) {
    if (![position.x, position.y, position.z, strength].every(Number.isFinite) || strength === 0) return;
    if (this.pulses.some(pulse => pulse.age_s < SAME_SOURCE_INTERVAL_S
      && Math.sign(pulse.strength) === Math.sign(strength)
      && pulse.position.distanceToSquared(position) < SAME_SOURCE_DISTANCE_SQUARED)) return;
    if (this.pulses.length === MAX_SURFACE_RIPPLES) this.pulses.shift();
    this.pulses.push({ position: position.clone(), strength: Math.max(-1, Math.min(1, strength)), age_s: 0 });
  }

  advance(dt: number) {
    if (!(dt > 0) || !Number.isFinite(dt) || !this.pulses.length) return;
    for (const pulse of this.pulses) pulse.age_s += dt;
    while (this.pulses.length && this.pulses[0].age_s >= LIFETIME_S) this.pulses.shift();
  }

  clear() { this.pulses.length = 0; }

  write(target: Vector4[], capToVessel: Matrix4) {
    if (!this.count && target[0]?.w === 0) return;
    if (this.count) this.vesselToCap.copy(capToVessel).invert();
    for (let i = 0; i < target.length; i++) {
      const pulse = this.pulses[i];
      if (!pulse) { target[i].set(0, 0, 0, 0); continue; }
      const p = this.scratch.copy(pulse.position).applyMatrix4(this.vesselToCap);
      const fade = (1 - pulse.age_s / LIFETIME_S) ** 2;
      target[i].set(p.x, p.y, pulse.age_s * 1.6, pulse.strength * fade);
    }
  }
}
