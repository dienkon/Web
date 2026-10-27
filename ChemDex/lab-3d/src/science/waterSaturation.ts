/** IAPWS SR1-86(1992), equation 1. Pa; triple point to critical point.
 * https://iapws.org/technical-guidance/release/Supp-sat
 * Legacy liquid-water callers below 0.01 C use the triple-point boundary;
 * this is not a model for ice/supercooled liquid saturation. */
export function waterSaturationPressurePa(temperature_c: number): number {
  const k = Math.max(273.16, Math.min(647.096, temperature_c + 273.15));
  const tau = 1 - k / 647.096;
  const sum = -7.85951783 * tau + 1.84408259 * tau ** 1.5 - 11.7866497 * tau ** 3
    + 22.6807411 * tau ** 3.5 - 15.9618719 * tau ** 4 + 1.80122502 * tau ** 7.5;
  return 22.064e6 * Math.exp(647.096 / k * sum);
}

const cachedTemperatures = new Map<number, number>();
/** Inverse of the identical curve, without shifting the 1-atm root to 100 C.
 * Invalid/out-of-domain pressures have no liquid-water saturation root. */
export function waterSaturationTemperatureC(pressure_Pa: number): number {
  if (!Number.isFinite(pressure_Pa) || pressure_Pa < waterSaturationPressurePa(0.01)
    || pressure_Pa > 22.064e6) return NaN;
  // Exact phase endpoints: an inverse just below Tc would fabricate a tiny
  // positive latent heat and allow division by it at the critical point.
  if (pressure_Pa === 22.064e6) return 373.946;
  if (pressure_Pa === waterSaturationPressurePa(0.01)) return 0.01;
  const cached = cachedTemperatures.get(pressure_Pa);
  if (cached !== undefined) return cached;
  let low = 0.01, high = 373.946;
  for (let i = 0; i < 44; i++) {
    const t = (low + high) / 2;
    if (waterSaturationPressurePa(t) > pressure_Pa) high = t; else low = t;
  }
  const root = (low + high) / 2;
  // Exact pressure keys, bounded cache: no physical state or quantization.
  if (cachedTemperatures.size >= 32) cachedTemperatures.delete(cachedTemperatures.keys().next().value!);
  cachedTemperatures.set(pressure_Pa, root);
  return root;
}
