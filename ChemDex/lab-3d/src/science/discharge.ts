import { GRAVITY_M_S2 } from './sceneUnits';

/** Inertial rectangular sharp-edge approximation. Cd is assumed, not a
 * calibration of this glass lip. SI input/output, no visual flow clamps. */
export function rectangularWeirDischarge(width_m: number, head_m: number, coefficient = 0.62): number {
  if (![width_m, head_m, coefficient].every(Number.isFinite) || width_m <= 0 || head_m <= 0 || coefficient <= 0) return 0;
  return coefficient * 2 / 3 * Math.sqrt(2 * GRAVITY_M_S2) * width_m * head_m ** 1.5;
}

/** Bernoulli discharge across a fully inverted circular opening. The liquid
 * column head is measured above the opening; venting and neck losses remain
 * unresolved. This is the continuously vented inertial limiting model. */
export function circularOrificeDischarge(radius_m: number, head_m: number, coefficient = 0.62): number {
  if (![radius_m, head_m, coefficient].every(Number.isFinite) || radius_m <= 0 || head_m <= 0 || coefficient <= 0) return 0;
  return coefficient * Math.PI * radius_m ** 2 * Math.sqrt(2 * GRAVITY_M_S2 * head_m);
}
