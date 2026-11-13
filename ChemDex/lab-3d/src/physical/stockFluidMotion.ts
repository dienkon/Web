import type { StockContainerInput } from './stockTypes';
import type { Vec3 } from './types';

/** SI carrier velocity/depth for mass-bearing rigid stock. Drag acts on slip;
 * grains are never teleported to an animation orbit or lifted against gravity. */
export function stockFluidAt(position: Vec3, fluid: NonNullable<StockContainerInput['fluid']>) {
  const v = fluid.vortex;
  const flatDepth = fluid.offset_m - position.reduce((s, x, i) => s + x * fluid.normal[i], 0);
  if (!v) return { depth_m: flatDepth, velocity_m_s: [0, 0, 0] as Vec3, spin_rad_s: 0 };
  const x = position[0] - v.axis_m[0], z = position[2] - v.axis_m[2], r2 = x * x + z * z, a2 = v.coreRadius_m ** 2;
  const surface = v.centerHeight_m + v.amplitude_m * r2 / Math.max(1e-20, a2 + r2);
  const boundary = Math.max(0, Math.min(1, (1 - r2 / v.radius_m ** 2) / 0.06))
    * Math.max(0, Math.min(1, (Math.min(position[1], surface) - v.floorY_m) / Math.max(1e-8, (surface - v.floorY_m) * 0.12)));
  const omega = v.angularSpeed_rad_s / (1 + r2 / a2) * boundary;
  return { depth_m: surface - position[1], velocity_m_s: [-omega * z, 0, omega * x] as Vec3,
    spin_rad_s: v.angularSpeed_rad_s / (1 + r2 / a2) ** 2 * boundary };
}
