import type { ParticleBounds } from './particleBounds';
import { pointPlaneDepth } from './liquidParticleFrame';
import { Color } from 'three';
import { opacityFromOpticalDepth, opticalDepthFromOpacity } from '../../science/opticalDepth';

export interface SuspensionParcels {
  cloudiness: number;
  /** Linear extinction at 1 cm; preferred over legacy alpha-only inputs. */
  opticalDepth?: number;
  particles: readonly { x: number; y: number; z: number; mass_ug: number }[];
  representedMass_g?: number;
  sedimentBed?: { amount_g: number };
  renderBounds?: ParticleBounds;
  profile?: { color: string };
}

/** Optical reconstruction of the existing weighted parcels. This never moves
 * material or creates a second settling model. A small, smoothed density grid
 * makes a contact plume and the clearing above a bed visible between glyphs. */
export class SuspensionDensityField {
  readonly opacity: Float32Array;
  /** RGB weighted by local optical depth, then depth at the 1 cm reference.
   * Linear quantities can be interpolated without losing concentrated plumes. */
  readonly optical: Float32Array;
  private color = new Color();
  private density: Float32Array;
  private scratch: Float32Array;
  private wet: Uint8Array;
  private boundary: Float32Array;
  constructor(readonly size: number) {
    this.opacity = new Float32Array(size ** 3);
    this.optical = new Float32Array(size ** 3 * 4);
    this.density = new Float32Array(size ** 3);
    this.scratch = new Float32Array(size ** 3);
    this.wet = new Uint8Array(size ** 3);
    this.boundary = new Float32Array(this.optical.length);
  }
  update(systems: Iterable<SuspensionParcels>, radius: number, baseY: number, depth: number) {
    const n = this.size, count = n ** 3;
    this.opacity.fill(0);
    this.optical.fill(0);
    if (!(radius > 0 && depth > 0)) return;
    const unresolved = [0, 0, 0, 0];
    for (const system of systems) {
      const haze = Math.max(0, Math.min(1, system.cloudiness));
      const opticalDepth = typeof system.opticalDepth === 'number' && Number.isFinite(system.opticalDepth)
        && system.opticalDepth >= 0 ? system.opticalDepth : opticalDepthFromOpacity(haze);
      if (!(opticalDepth > 0)) continue;
      const suspendedMass = system.representedMass_g === undefined ? undefined
        : Math.max(0, system.representedMass_g - (system.sedimentBed?.amount_g ?? 0));
      if (suspendedMass !== undefined && suspendedMass <= 1e-12) continue;
      this.color.set(system.profile?.color ?? '#ffffff');
      const addOptics = (i: number, depth: number) => {
        this.optical[i * 4] += this.color.r * depth;
        this.optical[i * 4 + 1] += this.color.g * depth;
        this.optical[i * 4 + 2] += this.color.b * depth;
        this.optical[i * 4 + 3] += depth;
      };
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
      if (wetCount === 0) {
        // A thin tilted liquid wedge may fall between every coarse grid node.
        // Keep its bulk coefficient for the shader's actual contour/plane
        // clipping. This is optical-only padding, not suspended material at
        // dry nodes, and must be added after the physical opacity diagnostic.
        unresolved[0] += this.color.r * opticalDepth;
        unresolved[1] += this.color.g * opticalDepth;
        unresolved[2] += this.color.b * opticalDepth;
        unresolved[3] += opticalDepth;
        continue;
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
        for (let i = 0; i < count; i++) if (this.wet[i]) addOptics(i, opticalDepth);
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
      const mean = sampledMass / Math.max(1, wetCount);
      // Before all suspended mass has emitted representative parcels, retain
      // its unsampled share as bulk haze instead of concentrating it in one dot.
      const sampledFraction = suspendedMass === undefined ? 1 : Math.min(1, mass / (suspendedMass * 1e6));
      for (let i = 0; i < count; i++) {
        if (!this.wet[i]) continue;
        const density = mean > 0 ? this.density[i] / mean : 1;
        addOptics(i, opticalDepth * (sampledFraction * density + 1 - sampledFraction));
      }
    }
    for (let i = 0; i < count; i++) this.opacity[i] = opacityFromOpticalDepth(this.optical[i * 4 + 3]);
    // The shader clips to the actual contour/plane. Extend its interpolation
    // stencil just outside that boundary so zero-valued dry nodes do not turn
    // a uniform suspension into an artificial transparent wall layer.
    this.boundary.set(this.optical);
    for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
      const index = y * n * n + z * n + x;
      if (this.wet[index]) continue;
      let neighbors = 0;
      const sum = [0, 0, 0, 0];
      for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, zz = z + dz;
        if (xx < 0 || yy < 0 || zz < 0 || xx >= n || yy >= n || zz >= n) continue;
        const neighbor = yy * n * n + zz * n + xx;
        if (!this.wet[neighbor]) continue;
        neighbors++;
        for (let c = 0; c < 4; c++) sum[c] += this.boundary[neighbor * 4 + c];
      }
      if (neighbors) for (let c = 0; c < 4; c++) this.optical[index * 4 + c] = sum[c] / neighbors;
    }
    if (unresolved[3] > 0) for (let i = 0; i < count; i++) {
      for (let c = 0; c < 4; c++) this.optical[i * 4 + c] += unresolved[c];
    }
  }
}
