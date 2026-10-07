/**
 * condensation.ts - Glass wall condensation, microscopic fog film, discrete droplets,
 * sliding with clear trail deposition, and gravity drips.
 * 
 * Physical Model:
 * 1. Condensation Criterion:
 *    T_glass < T_dew
 * 2. Fog Film Phase:
 *    Microscopic droplet fog coverage θ_c(t) rises with (T_dew - T_glass)
 * 3. Discrete Droplet Growth & Sliding:
 *    dr/dt ∝ (T_dew - T_glass) / r
 *    When droplet radius exceeds pinning threshold r_pin (~1.5 - 2.5 mm, Bond-number criterion),
 *    droplet slides down wall with v ∝ r², sweeping and coalescing smaller droplets along its trail.
 * 4. Drip back:
 *    Droplets reaching liquid level or rim drip into liquid, creating small surface ripple.
 * 
 * Units: SI internally (m, m/s, K, s)
 */

export interface WallDroplet {
  u: number;            // Normalized circumferential angle [0, 1]
  y: number;            // Height along vessel wall (m)
  radius: number;       // Droplet radius (m, 0.2 - 3 mm)
  isSliding: boolean;
  slideVelocity: number;
}

export class CondensationEngine {
  public fogCoverage: number = 0; // [0, 1]
  public droplets: WallDroplet[] = [];
  public maxDroplets: number = 64;
  public pinningRadiusM: number = 0.0022; // 2.2 mm pinning threshold

  public onDrip?: (angleRad: number, radiusM: number) => void;

  /**
   * Evaluate glass wall condensation and droplet dynamics
   */
  public update(
    dt: number,
    glassTempK: number,
    dewPointK: number,
    liquidHeightM: number,
    vesselHeightM: number
  ): void {
    if (dt <= 0) return;

    const deltaT = dewPointK - glassTempK;

    // 1. Fog film coverage
    if (deltaT > 0.5) {
      this.fogCoverage = Math.min(1.0, this.fogCoverage + 0.15 * deltaT * dt);
    } else {
      this.fogCoverage = Math.max(0.0, this.fogCoverage - 0.25 * (glassTempK - dewPointK) * dt);
    }

    // 2. Spawn discrete droplets when fog film is dense
    if (this.fogCoverage > 0.4 && this.droplets.length < this.maxDroplets && Math.random() < 0.15) {
      // Spawn on upper headspace wall
      const spawnY = liquidHeightM + 0.01 + Math.random() * (vesselHeightM - liquidHeightM - 0.015);
      this.droplets.push({
        u: Math.random(),
        y: spawnY,
        radius: 0.0004 + Math.random() * 0.0004, // 0.4 - 0.8 mm initial
        isSliding: false,
        slideVelocity: 0,
      });
    }

    // 3. Droplet growth, coalescence, and sliding
    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const drop = this.droplets[i];

      if (deltaT > 0) {
        // Growth rate: dr/dt = k * ΔT / r
        drop.radius += (0.00002 * deltaT / Math.max(0.0005, drop.radius)) * dt;
      } else {
        // Evaporative shrinkage
        drop.radius -= 0.00005 * (glassTempK - dewPointK) * dt;
        if (drop.radius <= 0.0002) {
          this.droplets.splice(i, 1);
          continue;
        }
      }

      // Check pinning threshold
      if (drop.radius >= this.pinningRadiusM) {
        drop.isSliding = true;
        // Sliding velocity: v ∝ r²
        drop.slideVelocity = 15.0 * drop.radius * drop.radius; // ~0.05 - 0.15 m/s
      }

      if (drop.isSliding) {
        drop.y -= drop.slideVelocity * dt;

        // Drip back into liquid surface
        if (drop.y <= liquidHeightM) {
          if (this.onDrip) {
            this.onDrip(drop.u * Math.PI * 2, drop.radius);
          }
          this.droplets.splice(i, 1);
        }
      }
    }
  }
}
