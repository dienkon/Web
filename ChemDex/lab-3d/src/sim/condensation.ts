/** Optional discrete wall-droplet solver. The live vessel uses
 * engine/wallCondensation.ts for its authoritative aggregate water ledger.
 * This solver consumes an explicit condensate supply; it never infers mass
 * from a temperature difference alone. SI lengths, seconds, mass in grams. */
export interface WallDroplet {
  u: number;
  y: number;
  radius: number;
  isSliding: boolean;
  slideVelocity: number;
}
export const dropletMassG = (radiusM: number) => 4 * Math.PI * Math.max(0, radiusM) ** 3 / 3 * 1e6;
export const radiusForDropletMass = (mass_g: number) => Math.cbrt(Math.max(0, mass_g) * 3 / (4 * Math.PI * 1e6));

export function mergeWallDroplets(a: WallDroplet, b: WallDroplet): WallDroplet {
  const ma = dropletMassG(a.radius), mb = dropletMassG(b.radius), mass = ma + mb;
  const du = ((b.u - a.u + 1.5) % 1) - 0.5;
  return { ...a, u: ((a.u + du * mb / Math.max(1e-30, mass)) % 1 + 1) % 1,
    y: mass > 0 ? (a.y * ma + b.y * mb) / mass : a.y,
    radius: radiusForDropletMass(mass), isSliding: a.isSliding || b.isSliding };
}

export class CondensationEngine {
  public fogCoverage = 0;
  public droplets: WallDroplet[] = [];
  public maxDroplets = 64;
  public pinningRadiusM = 0.0022;
  public filmMass_g = 0;
  public evaporatedMass_g = 0;
  public drippedMass_g = 0;
  public onDrip?: (angleRad: number, radiusM: number) => void;
  private spawnAccumulator = 0;
  constructor(private random: () => number = Math.random) {}
  public get retainedMass_g() { return this.filmMass_g + this.droplets.reduce((s, d) => s + dropletMassG(d.radius), 0); }
  public reset() {
    this.fogCoverage = 0; this.droplets = []; this.filmMass_g = 0;
    this.evaporatedMass_g = 0; this.drippedMass_g = 0; this.spawnAccumulator = 0;
  }

  /** condensedMass_g is one finite delivery, not a rate. Caller owns the vapor
   * inventory and must debit it exactly once. Fixed substeps remove the old
   * per-frame spawn probability. Circumference is the local wall path length.
   * Slide/pinning coefficients are visual approximations, not measured laws. */
  public update(dt: number, glassTempK: number, dewPointK: number, liquidHeightM: number,
    vesselHeightM: number, condensedMass_g = 0, circumferenceM = 0.1): void {
    if (![dt, glassTempK, dewPointK, liquidHeightM, vesselHeightM, condensedMass_g, circumferenceM].every(Number.isFinite)
      || dt <= 0 || condensedMass_g < 0 || circumferenceM <= 0) return;
    const steps = Math.ceil(dt * 120), h = dt / steps;
    for (let step = 0; step < steps; step++) {
      this.filmMass_g += condensedMass_g / steps;
      const delta = dewPointK - glassTempK;
      if (delta > 0 && vesselHeightM - liquidHeightM > 0.002) {
        this.spawnAccumulator += h * 9;
        while (this.spawnAccumulator >= 1 && this.droplets.length < this.maxDroplets) {
          const mass = dropletMassG(0.0004);
          if (this.filmMass_g < mass) break;
          this.spawnAccumulator -= 1; this.filmMass_g -= mass;
          this.droplets.push({ u: this.random(), y: liquidHeightM + 0.001
            + this.random() * (vesselHeightM - liquidHeightM - 0.002),
            radius: 0.0004, isSliding: false, slideVelocity: 0 });
        }
        // No accumulated burst after reaching the particle/available-mass budget.
        this.spawnAccumulator = Math.min(1, this.spawnAccumulator);
        if (this.droplets.length) {
          const transfer = this.filmMass_g * (1 - Math.exp(-h / 2));
          this.filmMass_g -= transfer;
          for (const d of this.droplets) d.radius = radiusForDropletMass(dropletMassG(d.radius) + transfer / this.droplets.length);
        }
      } else if (delta < 0) {
        const keep = Math.exp(delta * 0.02 * h), previous = this.retainedMass_g;
        this.filmMass_g *= keep;
        for (const d of this.droplets) d.radius *= Math.cbrt(keep);
        this.evaporatedMass_g += previous - this.retainedMass_g;
      }
      for (let i = this.droplets.length - 1; i >= 0; i--) {
        const d = this.droplets[i];
        if (d.radius >= this.pinningRadiusM) d.isSliding = true;
        d.slideVelocity = d.isSliding ? Math.min(0.15, 0.04 * (d.radius / this.pinningRadiusM) ** 2) : 0;
        d.y -= d.slideVelocity * h;
        if (d.y <= liquidHeightM) {
          this.drippedMass_g += dropletMassG(d.radius);
          this.onDrip?.(d.u * Math.PI * 2, d.radius);
          this.droplets.splice(i, 1);
        }
      }
      for (let i = 0; i < this.droplets.length; i++) for (let j = this.droplets.length - 1; j > i; j--) {
        const a = this.droplets[i], b = this.droplets[j], du = Math.abs(a.u - b.u);
        if (Math.hypot(Math.min(du, 1 - du) * circumferenceM, a.y - b.y) <= a.radius + b.radius) {
          this.droplets[i] = mergeWallDroplets(a, b); this.droplets.splice(j, 1);
        }
      }
    }
    this.fogCoverage = Math.min(1, this.retainedMass_g / 0.03);
  }
}
