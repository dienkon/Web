import { opacityFromOpticalDepth } from './opticalDepth';

/** Optical depth over a 1 cm reference path, NOT NTU/FNU. The empirical species
 * coefficient uses the illustrative 1 g/L concentration scale. Optical depths
 * add; concentration no longer has an arbitrary species-dependent alpha cap.
 * This is Beer–Lambert extinction with an uncalibrated coefficient, not a
 * claim of measured scattering spectra or multiple-scattering radiance. */
export function suspensionOpticalDepth(suspendedMass_g: number, volume_ml: number, opticalFactor: number): number {
  if (![suspendedMass_g, volume_ml, opticalFactor].every(Number.isFinite)
    || suspendedMass_g <= 0 || volume_ml <= 0 || opticalFactor <= 0) return 0;
  const concentration_g_L = suspendedMass_g * 1000 / volume_ml;
  return opticalFactor * concentration_g_L;
}

/** Alpha is a derived display value; never invert it to recover concentrated
 * suspension depth because floating-point opacity eventually rounds to one. */
export function suspensionCloudiness(suspendedMass_g: number, volume_ml: number, opticalFactor: number): number {
  return opacityFromOpticalDepth(suspensionOpticalDepth(suspendedMass_g, volume_ml, opticalFactor));
}
