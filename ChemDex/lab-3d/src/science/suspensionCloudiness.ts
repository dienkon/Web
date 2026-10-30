/** Qualitative rendering response, NOT NTU/FNU or a measured optical law.
 * The illustrative 1 g/L scale needs species-specific calibration. */
export function suspensionCloudiness(suspendedMass_g: number, volume_ml: number, opticalFactor: number): number {
  if (![suspendedMass_g, volume_ml, opticalFactor].every(Number.isFinite)
    || suspendedMass_g <= 0 || volume_ml <= 0 || opticalFactor <= 0) return 0;
  const concentration_g_L = suspendedMass_g * 1000 / volume_ml;
  return Math.min(1, opticalFactor) * -Math.expm1(-concentration_g_L);
}
