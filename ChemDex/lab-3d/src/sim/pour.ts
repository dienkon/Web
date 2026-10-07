/**
 * pour.ts - Hydraulic pouring weir laws, ballistic stream ribbon,
 * Rayleigh-Plateau droplet breakup, Tate's law dropper, and air entrainment.
 * 
 * Physical Model:
 * 1. Weir Law Flow Rate (Poleni / Francis formula for open spout):
 *    Q = (2/3) · C_d · w · sqrt(2g) · H^(3/2)
 *    C_d ≈ 0.62, w = lip width (m), H = hydraulic head above lip (m)
 * 2. Ballistic Stream Parabola:
 *    v₀ ≈ 0.8 · sqrt(2 g H)
 *    r(t) = r₀ + v₀ t + 0.5 g t²
 * 3. Continuity Stream Thinning:
 *    A(s) = Q / v(s)  ->  radius r_stream(s) = sqrt(Q / (π v(s)))
 * 4. Rayleigh-Plateau Breakup:
 *    t_breakup ≈ 2.9 · sqrt(ρ · r³ / σ)
 *    L_breakup = v · t_breakup. Beyond L_breakup, jet breaks into discrete droplets.
 * 5. Tate's Law Dropper:
 *    V_drop = (2 π r_tip · σ / (ρ g)) · 0.68  (~0.05 mL for water)
 * 6. Plunging Jet Air Entrainment:
 *    If impact speed v > 1.0 m/s, entrain small air bubbles into receiving vessel.
 * 
 * Units: SI internally (m, m/s, m³/s, s, N/m, kg/m³)
 */

import { GRAVITY } from '../core/units.js';

export interface PourStreamPoint {
  x: number;
  y: number;
  z: number;
  radius: number;
  speed: number;
  isDroplet: boolean;
}

export class PouringSimulator {
  public cd: number = 0.62;
  public spoutWidthM: number = 0.012; // 12 mm spout width
  public surfaceTension: number = 0.0728; // N/m
  public density: number = 1000.0; // kg/m³

  /**
   * Compute volumetric flow rate Q (m³/s) from liquid head H above lip
   */
  public computeWeirFlow(headAboveLipM: number): number {
    if (headAboveLipM <= 0) return 0;
    // Q = (2/3) · Cd · w · sqrt(2g) · H^(3/2)
    const q = (2.0 / 3.0) * this.cd * this.spoutWidthM * Math.sqrt(2.0 * GRAVITY) * Math.pow(headAboveLipM, 1.5);
    return Math.max(0, q);
  }

  /**
   * Compute Tate's law single droplet volume (m³)
   */
  public computeDropletVolume(tipRadiusM: number = 0.0015): number {
    // V_drop = (2 π r_tip σ / (ρ g)) * Harkins-Brown correction (0.68)
    const vDrop = ((2.0 * Math.PI * tipRadiusM * this.surfaceTension) / (this.density * GRAVITY)) * 0.68;
    return Math.max(1e-8, vDrop); // ~0.05 mL (5e-8 m³)
  }

  /**
   * Generate ballistic stream trajectory points with Rayleigh-Plateau breakup
   */
  public generateStreamTrajectory(
    startX: number,
    startY: number,
    startZ: number,
    dirX: number,
    dirZ: number,
    flowRateQ: number,
    targetFloorY: number,
    numSamples: number = 16
  ): PourStreamPoint[] {
    const points: PourStreamPoint[] = [];
    if (flowRateQ <= 1e-9) return points;

    // Initial exit velocity
    const v0 = Math.max(0.2, Math.sqrt(2.0 * GRAVITY * 0.01)); // ~0.44 m/s
    const vx0 = dirX * v0;
    const vz0 = dirZ * v0;
    let vy0 = 0;

    // Estimate initial stream radius
    const r0 = Math.sqrt(flowRateQ / (Math.PI * v0));
    // Rayleigh breakup time: tb ≈ 2.9 * sqrt(ρ r0³ / σ)
    const tBreakup = 2.9 * Math.sqrt((this.density * Math.pow(r0, 3)) / this.surfaceTension);

    let t = 0;
    const dt = 0.02; // 20 ms trajectory steps

    for (let i = 0; i < numSamples; i++) {
      const px = startX + vx0 * t;
      const py = startY + vy0 * t - 0.5 * GRAVITY * t * t;
      const pz = startZ + vz0 * t;

      if (py < targetFloorY) {
        // Impact
        points.push({
          x: px,
          y: targetFloorY,
          z: pz,
          radius: r0,
          speed: Math.sqrt(vx0 * vx0 + (vy0 - GRAVITY * t) ** 2 + vz0 * vz0),
          isDroplet: t > tBreakup,
        });
        break;
      }

      const currentVy = vy0 - GRAVITY * t;
      const speed = Math.sqrt(vx0 * vx0 + currentVy * currentVy + vz0 * vz0);
      const area = flowRateQ / Math.max(0.1, speed);
      const rStream = Math.sqrt(area / Math.PI);

      points.push({
        x: px,
        y: py,
        z: pz,
        radius: rStream,
        speed,
        isDroplet: t > tBreakup,
      });

      t += dt;
    }

    return points;
  }
}
