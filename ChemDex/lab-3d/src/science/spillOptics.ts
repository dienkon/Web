import { liquidOptics, type LiquidOptics } from '../pour/physics/mixing';

/** Existing RGB stock colors carry no measured spectrum or optical path.
 * Interpret their linear transmission at this explicit display reference.
 * This is an illustrative calibration, not measured absorptivity. */
export const SPILL_COLOR_REFERENCE_M = 0.01;
export const SPILL_WATERLIKE_IOR = 1.333;

export function spillAbsorptionPerMeter(color: string, saved?: LiquidOptics): [number, number, number] {
  return liquidOptics(color, saved).absorbance.map(a => Math.max(0, Math.min(80, a)) / SPILL_COLOR_REFERENCE_M) as [number, number, number];
}

export function spillTransmittance(absorption_per_m: readonly number[], path_m: number): [number, number, number] {
  const path = Number.isFinite(path_m) ? Math.max(0, path_m) : 0;
  return absorption_per_m.map(a => Math.exp(-Math.max(0, a) * path)) as [number, number, number];
}

export function spillFresnel(cosine: number, ior = SPILL_WATERLIKE_IOR): number {
  const f0 = ((ior - 1) / (ior + 1)) ** 2;
  return f0 + (1 - f0) * (1 - Math.max(0, Math.min(1, cosine))) ** 5;
}
