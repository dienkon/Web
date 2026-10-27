/**
 * THERMAL CONVECTION CURRENT SYSTEM
 * Prescribed, incompressible axisymmetric circulation inside heated glassware.
 * Circulation direction follows a water-reference density contrast.
 * Strength remains illustrative; this is not a solved thermal/CFD field.
 */
import type { VesselProfile } from '../../pour/physics/profiles';
import { convectionForcing, type ConvectionFluidModel } from '../../science/convectionForcing';

export interface ConvectionCurrentParams {
  temp_c: number;
  ambientTemp_c: number;
  heatPower_W: number;
  viscosity_mPa_s: number;
  radius: number;
  liquidBottomY: number;
  surfaceY: number;
  vesselProfile?: VesselProfile;
  fluidModel?: ConvectionFluidModel;
}

export class ConvectionSystem {
  // Pure numeric memo only: no particle/vessel history, no temperature rounding.
  private static lastForcing?: { params: [number, number, number, number, ConvectionFluidModel | undefined]; speed: number };
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

    if (![x, y, z, temp_c, ambientTemp_c, heatPower_W, viscosity_mPa_s,
      radius, liquidBottomY, surfaceY].every(Number.isFinite)
      || !(radius > 0) || !(surfaceY > liquidBottomY) || !(viscosity_mPa_s > 0)) return [0, 0, 0];

    const height = surfaceY - liquidBottomY;
    const profile = params.vesselProfile;
    let localRadius = radius, radiusSlope = 0;
    if (profile?.contour?.length) {
      localRadius = profile.r(y);
      // Radius is piecewise linear in the same interior contour used for
      // glass/particle containment. Its derivative is needed for continuity.
      const points = profile.contour;
      if (y <= points[0][1] || y >= points[points.length - 1][1]) return [0, 0, 0];
      for (let i = 1; i < points.length; i++) {
        const [r0, y0] = points[i - 1], [r1, y1] = points[i];
        if (y >= y0 && y <= y1 && y1 > y0) {
          radiusSlope = (r1 - r0) / (y1 - y0);
          break;
        }
      }
    }
    if (!(localRadius > 0) || !Number.isFinite(localRadius) || !Number.isFinite(radiusSlope)) return [0, 0, 0];
    const radialSquared = (x * x + z * z) / (localRadius * localRadius);
    if (y <= liquidBottomY || y >= surfaceY || radialSquared >= 1) return [0, 0, 0];

    const normY = (y - liquidBottomY) / height;
    const previous = this.lastForcing;
    if (!previous || previous.params[0] !== temp_c || previous.params[1] !== ambientTemp_c
      || previous.params[2] !== heatPower_W || previous.params[3] !== viscosity_mPa_s
      || previous.params[4] !== params.fluidModel) {
      this.lastForcing = { params: [temp_c, ambientTemp_c, heatPower_W, viscosity_mPa_s, params.fluidModel],
        speed: convectionForcing(params).strength_scene_s };
    }
    const baseSpeed = this.lastForcing!.speed;
    if (baseSpeed === 0) return [0, 0, 0];

    // Axisymmetric stream function:
    // psi = (U/2) r^2 (1-r^2/R(h)^2)^2 sin^2(pi h/H).
    // u_r = -(1/r) dpsi/dh; u_h = (1/r) dpsi/dr.
    // Consequently div(u)=0 and there is no flow through floor, surface or
    // contour wall. Include R'(h) when differentiating the radial envelope.
    // Cartesian radial components avoid an axis singularity.
    const wallFactor = 1 - radialSquared;
    const verticalShape = Math.sin(normY * Math.PI);
    const vy = baseSpeed * wallFactor * (1 - 3 * radialSquared) * verticalShape ** 2;

    const radialFactor = -baseSpeed * 0.5 * (wallFactor ** 2 * Math.PI / height
      * Math.sin(2 * Math.PI * normY)
      + 4 * wallFactor * radialSquared * radiusSlope / localRadius * verticalShape ** 2);
    return [radialFactor * x, vy, radialFactor * z];
  }
}
