/**
 * THERMAL CONVECTION CURRENT SYSTEM
 * Simulates buoyant toroidal circulation cells inside heated glassware.
 * Hot liquid near the center and base rises; cooler liquid along the glass walls descends.
 */

export interface ConvectionCurrentParams {
  temp_c: number;
  ambientTemp_c: number;
  heatPower_W: number;
  viscosity_mPa_s: number;
  radius: number;
  liquidBottomY: number;
  surfaceY: number;
}

export class ConvectionSystem {
  /**
   * Computes the 3D convective velocity vector at a specific local point (x, y, z) inside the fluid.
   */
  public static sampleVelocity(
    x: number,
    y: number,
    z: number,
    params: ConvectionCurrentParams
  ): [number, number, number] {
    const { temp_c, ambientTemp_c, heatPower_W, viscosity_mPa_s, radius, liquidBottomY, surfaceY } = params;

    // Convection only activates above ~40°C or when directly heated
    const tempDelta = Math.max(0, temp_c - ambientTemp_c);
    if (tempDelta < 10 && heatPower_W <= 2) {
      return [0, 0, 0];
    }

    const height = Math.max(0.05, surfaceY - liquidBottomY);
    const normY = Math.max(0, Math.min(1.0, (y - liquidBottomY) / height)); // 0 (bottom) to 1 (surface)

    const rDist = Math.hypot(x, z);
    const normR = Math.max(0, Math.min(1.0, rDist / Math.max(0.01, radius))); // 0 (center) to 1 (wall)

    // Convection strength scales with heat delta and power, hindered by viscosity
    const baseSpeed = (Math.min(0.25, tempDelta * 0.0035) + Math.min(0.35, heatPower_W * 0.012)) / Math.max(0.3, viscosity_mPa_s);

    // Vertical velocity: Rising near center (normR < 0.6), descending near outer wall (normR > 0.6)
    // Sinusoidal circulation cell in Y: zero at top/bottom boundaries
    const yProfile = Math.sin(normY * Math.PI); // Clamps to 0 at floor and meniscus
    const rProfile = Math.cos(normR * Math.PI); // +1 at center (upward), -1 at wall (downward)
    const vy = baseSpeed * rProfile * (0.3 + 0.7 * yProfile);

    // Radial velocity: Outward at top surface (normY > 0.7), inward at bottom (normY < 0.3)
    const vrProfile = Math.cos(normY * Math.PI); // +1 at floor (inward), -1 at surface (outward)
    const radialSpeed = -baseSpeed * 0.35 * Math.sin(normR * Math.PI) * vrProfile;

    const angle = Math.atan2(z, x);
    const vx = Math.cos(angle) * radialSpeed;
    const vz = Math.sin(angle) * radialSpeed;

    return [vx, vy, vz];
  }
}
