import { waterSaturationPressurePa } from './waterSaturation';

/** IAPWS SR1-86(1992), equations 1–4, 6–7. Saturation properties only,
 * not a full compressed-liquid/superheated-steam equation of state.
 * https://iapws.org/technical-guidance/release/Supp-sat.download */
export function waterSaturationProperties(temperature_c: number) {
  if (!Number.isFinite(temperature_c) || temperature_c < 0 || temperature_c > 373.946) return null;
  // The 0 C teaching endpoint uses the 0.01 C triple-point boundary.
  const t = Math.max(273.16, temperature_c + 273.15), theta = t / 647.096, tau = Math.max(0, 1 - theta);
  const pressure_Pa = waterSaturationPressurePa(temperature_c);
  const derivativeSeries = -7.85951783 + 1.5 * 1.84408259 * tau ** 0.5 - 3 * 11.7866497 * tau ** 2
    + 3.5 * 22.6807411 * tau ** 2.5 - 4 * 15.9618719 * tau ** 3 + 7.5 * 1.80122502 * tau ** 6.5;
  const pressureSlope_Pa_K = pressure_Pa * (-Math.log(pressure_Pa / 22.064e6) - derivativeSeries) / t;
  const liquidDensity_kg_m3 = 322 * (1 + 1.99274064 * tau ** (1 / 3) + 1.09965342 * tau ** (2 / 3)
    - 0.510839303 * tau ** (5 / 3) - 1.75493479 * tau ** (16 / 3)
    - 45.5170352 * tau ** (43 / 3) - 6.74694450e5 * tau ** (110 / 3));
  const vaporDensity_kg_m3 = 322 * Math.exp(-2.03150240 * tau ** (2 / 6) - 2.68302940 * tau ** (4 / 6)
    - 5.38626492 * tau ** (8 / 6) - 17.2991605 * tau ** 3 - 44.7586581 * tau ** (37 / 6)
    - 63.9201063 * tau ** (71 / 6));
  const alpha_J_g = -1135.905627715 - 5.65134998e-8 * theta ** -19 + 2690.66631 * theta
    + 127.287297 * theta ** 4.5 - 135.003439 * theta ** 5 + 0.981825814 * theta ** 54.5;
  const liquidEnthalpy_J_g = alpha_J_g + t * pressureSlope_Pa_K / liquidDensity_kg_m3 / 1000;
  const vaporEnthalpy_J_g = alpha_J_g + t * pressureSlope_Pa_K / vaporDensity_kg_m3 / 1000;
  const latentHeat_J_g = t * pressureSlope_Pa_K * (1 / vaporDensity_kg_m3 - 1 / liquidDensity_kg_m3) / 1000;
  return { pressure_Pa, pressureSlope_Pa_K, liquidDensity_kg_m3, vaporDensity_kg_m3,
    liquidEnthalpy_J_g, vaporEnthalpy_J_g, latentHeat_J_g };
}

/** NaN outside the liquid-water range; zero at criticality (no phase contrast). */
export function waterLatentHeatJ_G(temperature_c: number): number {
  return waterSaturationProperties(temperature_c)?.latentHeat_J_g ?? NaN;
}
