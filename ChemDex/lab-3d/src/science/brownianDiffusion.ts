/** Stokes–Einstein diffusivity for dilute no-slip equivalent spheres, m²/s.
 * Not a model of hydrated gels, hindered diffusion or wall corrections. */
export function brownianDiffusivity(radius_m: number, viscosity_Pa_s: number, temperature_c: number): number {
  if (![radius_m, viscosity_Pa_s, temperature_c].every(Number.isFinite)
    || radius_m <= 0 || viscosity_Pa_s <= 0 || temperature_c <= -273.15) return 0;
  return 1.380649e-23 * (temperature_c + 273.15) / (6 * Math.PI * viscosity_Pa_s * radius_m);
}
