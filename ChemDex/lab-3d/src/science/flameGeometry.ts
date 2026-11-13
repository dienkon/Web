/** Renderer/contact envelope, not a measured autoignition model. */
export const ALCOHOL_FLAME = { baseY: 0.88, height: 0.85, radius: 0.24 } as const;
export function pointInAlcoholFlame(point: readonly number[], burnerPosition: readonly number[]): boolean {
  if (point.length !== 3 || burnerPosition.length !== 3 || ![...point, ...burnerPosition].every(Number.isFinite)) return false;
  const height = point[1] - burnerPosition[1] - ALCOHOL_FLAME.baseY;
  if (height < 0 || height > ALCOHOL_FLAME.height) return false;
  const radius = ALCOHOL_FLAME.radius * (1 - 0.75 * height / ALCOHOL_FLAME.height);
  return Math.hypot(point[0] - burnerPosition[0], point[2] - burnerPosition[2]) <= radius;
}
