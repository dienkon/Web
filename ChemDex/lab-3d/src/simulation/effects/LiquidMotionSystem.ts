import { ConvectionSystem, type ConvectionCurrentParams } from './ConvectionSystem';

export interface LiquidMotionParams extends ConvectionCurrentParams {
  /** Normalized imposed stirring, 0..1. No measured rod rpm/torque implied. */
  agitation?: number;
}

/** Shared carrier velocity for bubbles and precipitate. Thermal meridional
 * circulation plus a prescribed, divergence-free azimuthal stirring field.
 * The nominal swirl has no vertical pumping or free-surface vortex model. */
export class LiquidMotionSystem {
  public static sampleVelocity(x: number, y: number, z: number, params: LiquidMotionParams): [number, number, number] {
    const agitation = params.agitation ?? 0;
    if (![x, y, z, agitation, params.temp_c, params.ambientTemp_c, params.heatPower_W,
      params.viscosity_mPa_s, params.radius, params.liquidBottomY, params.surfaceY].every(Number.isFinite)
      || agitation < 0 || agitation > 1 || !(params.radius > 0)
      || params.heatPower_W < 0 || !(params.viscosity_mPa_s > 0)
      || !(params.surfaceY > params.liquidBottomY)) return [0, 0, 0];
    const thermal = ConvectionSystem.sampleVelocity(x, y, z, params);
    if (agitation === 0) return thermal;
    const profile = params.vesselProfile;
    if (profile && (y <= profile.baseY || y >= profile.baseY + profile.H)) return thermal;
    const radius = profile ? profile.r(y) : params.radius;
    if (!(radius > 0) || !Number.isFinite(radius) || y <= params.liquidBottomY || y >= params.surfaceY) return thermal;
    const radialSquared = (x * x + z * z) / (radius * radius);
    if (radialSquared >= 1) return thermal;
    const heightFraction = (y - params.liquidBottomY) / (params.surfaceY - params.liquidBottomY);
    // v_theta = omega*r*f(r²,y). An axisymmetric purely azimuthal field has
    // zero divergence for any contour R(y); the envelope also vanishes on
    // floor, surface and wall. Cartesian components have no axis singularity.
    const omega = 1.5 * agitation * (1 - radialSquared) ** 2 * Math.sin(Math.PI * heightFraction) ** 2;
    return [thermal[0] - omega * z, thermal[1], thermal[2] + omega * x];
  }
}
