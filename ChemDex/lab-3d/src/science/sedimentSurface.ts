import type { PrecipitateProfile } from '../simulation/core/SimulationTypes';
import type { Point3 } from '../simulation/effects/liquidParticleFrame';
import { sphereSettlingSpeed } from './particleSettling';

export type SedimentSurfaceStatus = 'empty' | 'static-friction' | 'granular-reference' | 'cohesion-unavailable'
  | 'carrier-unavailable' | 'contact-lost' | 'outlet-unresolved';
export interface BedComponent { mass_g: number; profile: PrecipitateProfile }

/** Nominal overdamped, noncohesive surface relaxation. The 30-degree friction
 * cone and the macroscopic factor 4 are reference assumptions, NOT measured
 * properties of these chemical precipitates. Cohesive/powder beds need their
 * own yield/poromechanical model and are never silently treated as sand. */
export class SedimentSurface {
  public normal: [number, number, number] = [0, 1, 0];
  public status: SedimentSurfaceStatus = 'empty';
  public relaxationTime_s = Infinity;
  public readonly reposeAngle_rad = Math.PI / 6;
  reset() { this.normal = [0, 1, 0]; this.status = 'empty'; this.relaxationTime_s = Infinity; }
  advance(dt: number, up: Point3, diameter_m: number, density_kg_m3: number, viscosity_Pa_s: number,
    components: readonly BedComponent[], liquidCarrier = true) {
    const mass = components.reduce((n, c) => n + c.mass_g, 0);
    if (!(mass > 1e-12)) { this.reset(); return; }
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    this.relaxationTime_s = Infinity;
    if (!liquidCarrier || ![...up, diameter_m, density_kg_m3, viscosity_Pa_s].every(Number.isFinite)
      || diameter_m <= 0 || viscosity_Pa_s <= 0 || density_kg_m3 <= 0) { this.status = 'carrier-unavailable'; return; }
    if (components.some(c => c.mass_g > 1e-12 && (!['crystalline', 'granular'].includes(c.profile.morphology)
      || c.profile.modelBasis === 'generic_fallback'))) { this.status = 'cohesion-unavailable'; return; }
    const length = Math.hypot(...up); if (!(length > 0)) { this.status = 'carrier-unavailable'; return; }
    const n = up.map(v => v / length);
    const dot = Math.max(-1, Math.min(1, this.normal.reduce((s, v, i) => s + v * n[i], 0)));
    const angle = Math.acos(dot);
    if (dot <= 0) { this.status = 'contact-lost'; return; }
    if (angle <= this.reposeAngle_rad + 1e-12) { this.status = 'static-friction'; return; }
    // Harmonic mixture: a slow settled component cannot acquire the speed of
    // a coarse fast species merely because the two share a rendered bed.
    let inverseSpeed = 0;
    for (const c of components) if (c.mass_g > 1e-12) {
      const speed = sphereSettlingSpeed(c.profile.baseParticleRadius_mm * 1e-3,
        c.profile.particleDensity_g_cm3 * 1000, density_kg_m3, viscosity_Pa_s);
      if (!(speed > 0)) { this.status = 'carrier-unavailable'; return; }
      inverseSpeed += c.mass_g / mass / speed;
    }
    this.relaxationTime_s = 4 * diameter_m * inverseSpeed;
    const turn = (angle - this.reposeAngle_rad) * -Math.expm1(-dt / this.relaxationTime_s);
    const sin = Math.sin(angle), a = Math.sin(angle - turn) / sin, b = Math.sin(turn) / sin;
    this.normal = this.normal.map((v, i) => a * v + b * n[i]) as [number, number, number];
    const norm = Math.hypot(...this.normal); this.normal = this.normal.map(v => v / norm) as [number, number, number];
    this.status = 'granular-reference';
  }
}
