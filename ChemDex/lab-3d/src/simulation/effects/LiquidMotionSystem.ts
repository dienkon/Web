import { ConvectionSystem, type ConvectionCurrentParams } from './ConvectionSystem';
import { vortexHeight, type VortexSurface } from '../../science/liquidVortex';

export interface LiquidMotionParams extends ConvectionCurrentParams {
  /** Normalized imposed stirring, 0..1. No measured rod rpm/torque implied. */
  agitation?: number;
  vortex?: VortexSurface;
}

/** Shared carrier for bubbles and precipitate. A supplied finite-core vortex
 * owns the pressure surface and spin history; the legacy nominal field remains
 * available to callers without a vessel manager. Neither invents vertical lift. */
export class LiquidMotionSystem {
  public static sampleVelocity(x: number, y: number, z: number, params: LiquidMotionParams): [number, number, number] {
    const agitation = params.agitation ?? 0;
    if (![x, y, z, agitation, params.temp_c, params.ambientTemp_c, params.heatPower_W,
      params.viscosity_mPa_s, params.radius, params.liquidBottomY, params.surfaceY].every(Number.isFinite)
      || agitation < 0 || agitation > 1 || !(params.radius > 0)
      || params.heatPower_W < 0 || !(params.viscosity_mPa_s > 0)
      || !(params.surfaceY > params.liquidBottomY)) return [0, 0, 0];
    const thermal = ConvectionSystem.sampleVelocity(x, y, z, params);
    if (params.vortex && (!(params.vortex.coreRadius > 0) || !Number.isFinite(params.vortex.angularSpeed_rad_s))) return thermal;
    if (agitation === 0 && !params.vortex) return thermal;
    const profile = params.vesselProfile;
    if (profile && (y <= profile.baseY || y >= profile.baseY + profile.H)) return thermal;
    const radius = profile ? profile.r(y) : params.radius;
    const localSurface = params.vortex ? vortexHeight(x, z, params.vortex) : params.surfaceY;
    if (!(radius > 0) || !Number.isFinite(radius) || y <= params.liquidBottomY || y >= localSurface) return thermal;
    const radialSquared = (x * x + z * z) / (radius * radius);
    if (radialSquared >= 1) return thermal;
    const heightFraction = (y - params.liquidBottomY) / (localSurface - params.liquidBottomY);
    // v_theta = omega*r*f(r²,y). An axisymmetric purely azimuthal field has
    // zero divergence for any contour R(y); the envelope also vanishes on
    // floor, surface and wall. Cartesian components have no axis singularity.
    const vortex = params.vortex;
    const omega = vortex ? vortex.angularSpeed_rad_s / (1 + (x * x + z * z) / vortex.coreRadius ** 2)
      * Math.min(1, (1 - radialSquared) / 0.06) * Math.min(1, heightFraction / 0.12)
      : 1.5 * agitation * (1 - radialSquared) ** 2 * Math.sin(Math.PI * heightFraction) ** 2;
    return [thermal[0] - omega * z, thermal[1], thermal[2] + omega * x];
  }
}
