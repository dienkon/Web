/** IAPWS SR6-08(2011), Eq. (7), Table 5. Reference pressure 0.1 MPa.
 * Pure liquid water only; -20..110 °C includes metastable liquid states.
 * https://iapws.org/public/documents/fKF3T/LiquidWater.pdf */
export function liquidWaterViscosity_Pa_s(temperature_c: number): number | null {
  const kelvin = temperature_c + 273.15;
  if (!Number.isFinite(temperature_c) || temperature_c < -20 || temperature_c > 110) return null;
  const t = kelvin / 300;
  return 1e-6 * (280.68 * t ** -1.9 + 511.45 * t ** -7.7 + 61.131 * t ** -19.6 + 0.45903 * t ** -40);
}

/** IAPWS SR6-08(2011), Eq. (2), Table 1 and analytic derivative in Table 2.
 * Reference liquid at 0.1 MPa, -20..110 C, including metastable states.
 * This reference is NOT an equation of state for arbitrary solutions or a
 * replacement for a vessel's material inventory density.
 * https://iapws.org/public/documents/fKF3T/LiquidWater.pdf */
export function liquidWaterDensityReference(temperature_c: number) {
  const kelvin = temperature_c + 273.15;
  if (!Number.isFinite(temperature_c) || temperature_c < -20 || temperature_c > 110) return null;
  const alpha = 10 / (593 - kelvin), beta = 10 / (kelvin - 232);
  let value = 1.93763157e-2, derivative = 0;
  for (const [coefficient, exponent] of WATER_VOLUME_ALPHA_TERMS) {
    value += coefficient * alpha ** exponent;
    derivative += coefficient * exponent * alpha ** (exponent + 1) / 10;
  }
  for (const [coefficient, exponent] of WATER_VOLUME_BETA_TERMS) {
    value += coefficient * beta ** exponent;
    derivative -= coefficient * exponent * beta ** (exponent + 1) / 10;
  }
  const specificVolume_m3_kg = 461.51805 * 10 / 100000 * value;
  const volumeDerivative_m3_kg_K = 461.51805 * 10 / 100000 * derivative;
  return { density_kg_m3: 1 / specificVolume_m3_kg, specificVolume_m3_kg,
    volumeDerivative_m3_kg_K,
    thermalExpansion_per_K: volumeDerivative_m3_kg_K / specificVolume_m3_kg };
}

const WATER_VOLUME_ALPHA_TERMS = [
  [6.74458446e3, 4], [-2.22521604e5, 5], [1.00231247e8, 7],
  [-1.63552118e9, 8], [8.32299658e9, 9],
] as const;
const WATER_VOLUME_BETA_TERMS = [
  [5.78545292e-3, 1], [-1.53195665e-2, 2], [3.11337859e-2, 3],
  [-4.23546241e-2, 4], [3.38713507e-2, 5], [-1.19946761e-2, 6],
] as const;

/** Local, steady, flat Nusselt film. q = Q/width, q = rho*g_parallel*h³/(3*mu).
 * The width, wetting, waves and entry inertia are NOT predicted by this relation.
 * https://doi.org/10.3389/fenrg.2022.899023 */
export function nusseltFilm(flow_m3_s: number, width_m: number, density_kg_m3: number,
  viscosity_Pa_s: number, gravityParallel_m_s2: number) {
  if (![flow_m3_s, width_m, density_kg_m3, viscosity_Pa_s, gravityParallel_m_s2]
    .every(value => Number.isFinite(value) && value > 0)) return null;
  const q = flow_m3_s / width_m;
  const thickness_m = Math.cbrt(3 * viscosity_Pa_s * q / (density_kg_m3 * gravityParallel_m_s2));
  return { thickness_m, meanVelocity_m_s: q / thickness_m,
    reynolds4: 4 * density_kg_m3 * q / viscosity_Pa_s };
}
