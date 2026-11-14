import type { ParticleBounds } from './particleBounds';
import { pointPlaneDepth } from './liquidParticleFrame';

export interface SuspensionParcels {
  cloudiness: number;
  particles: readonly { x: number; y: number; z: number; mass_ug: number }[];
  representedMass_g?: number;
  sedimentBed?: { amount_g: number };
  renderBounds?: ParticleBounds;
}

/** Optical reconstruction of the existing weighted parcels. This never moves
 * material or creates a second settling model. A small, smoothed density grid
 * makes a contact plume and the clearing above a bed visible between glyphs. */
export class SuspensionDensityField {
  readonly opacity: Float32Array;
  private density: Float32Array;
  private scratch: Float32Array;
  private wet: Uint8Array;
  constructor(readonly size: number) {
    this.opacity = new Float32Array(size ** 3);
    this.density = new Float32Array(size ** 3);
    this.scratch = new Float32Array(size ** 3);
    this.wet = new Uint8Array(size ** 3);
  }
  update(systems: Iterable<SuspensionParcels>, radius: number, baseY: number, depth: number) {
    const n = this.size, count = n ** 3;
    this.opacity.fill(0);
    if (!(radius > 0 && depth > 0)) return;
    for (const system of systems) {
      const haze = Math.max(0, Math.min(0.9999, system.cloudiness));
      if (!(haze > 0)) continue;
      const suspendedMass = system.representedMass_g === undefined ? undefined
        : Math.max(0, system.representedMass_g - (system.sedimentBed?.amount_g ?? 0));
      if (suspendedMass !== undefined && suspendedMass <= 1e-12) continue;
      const bounds = system.renderBounds;
      let wetCount = 0;
      for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
        const point = { x: (2 * x / (n - 1) - 1) * radius, y: baseY + y / (n - 1) * depth,
          z: (2 * z / (n - 1) - 1) * radius };
        const wall = bounds?.vesselProfile?.r(point.y) ?? radius;
        const wet = Math.hypot(point.x, point.z) <= wall
          && (!bounds || pointPlaneDepth(point, bounds.surfaceY, bounds.surfacePlane) >= 0);
        this.wet[y * n * n + z * n + x] = wet ? 1 : 0;
        if (wet) wetCount++;
      }
      this.density.fill(0);
      let mass = 0;
      for (const p of system.particles) {
        if (![p.x, p.y, p.z, p.mass_ug].every(Number.isFinite) || !(p.mass_ug > 0)) continue;
        const gx = Math.max(0, Math.min(n - 1.000001, (p.x / radius + 1) * 0.5 * (n - 1)));
        const gy = Math.max(0, Math.min(n - 1.000001, (p.y - baseY) / depth * (n - 1)));
        const gz = Math.max(0, Math.min(n - 1.000001, (p.z / radius + 1) * 0.5 * (n - 1)));
        const x = Math.floor(gx), y = Math.floor(gy), z = Math.floor(gz);
        for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) {
          this.density[(y + dy) * n * n + (z + dz) * n + x + dx] += p.mass_ug
            * (dx ? gx - x : 1 - gx + x) * (dy ? gy - y : 1 - gy + y) * (dz ? gz - z : 1 - gz + z);
        }
        mass += p.mass_ug;
      }
      // Unemitted parcels have no spatial sample yet. Keep their bulk optical
      // estimate until positions exist; a zero glyph budget never clears water.
      if (!(mass > 0)) {
        for (let i = 0; i < count; i++) if (this.wet[i]) this.opacity[i] = 1 - (1 - this.opacity[i]) * (1 - haze);
        continue;
      }
      // Two separable passes suppress sampling speckles without filling the
      // whole vessel. Reflecting edges conserve the represented parcel weight.
      for (let pass = 0; pass < 2; pass++) for (const stride of [1, n, n * n]) {
        for (let i = 0; i < count; i++) {
          const axis = Math.floor(i / stride) % n;
          this.scratch[i] = (this.density[axis > 0 ? i - stride : i] + 2 * this.density[i]
            + this.density[axis < n - 1 ? i + stride : i]) * 0.25;
        }
        [this.density, this.scratch] = [this.scratch, this.density];
      }
      let sampledMass = 0;
      for (let i = 0; i < count; i++) if (this.wet[i]) sampledMass += this.density[i];
      const opticalDepth = -Math.log1p(-haze), mean = sampledMass / Math.max(1, wetCount);
      // Before all suspended mass has emitted representative parcels, retain
      // its unsampled share as bulk haze instead of concentrating it in one dot.
      const sampledFraction = suspendedMass === undefined ? 1 : Math.min(1, mass / (suspendedMass * 1e6));
      for (let i = 0; i < count; i++) {
        if (!this.wet[i]) continue;
        const density = mean > 0 ? this.density[i] / mean : 1;
        const transmission = Math.exp(-opticalDepth * (sampledFraction * density + 1 - sampledFraction));
        this.opacity[i] = 1 - (1 - this.opacity[i]) * transmission;
      }
    }
  }
}
