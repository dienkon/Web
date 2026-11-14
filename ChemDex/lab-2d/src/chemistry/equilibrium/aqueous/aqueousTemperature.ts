/**
 * Aqueous dissociation constants at 25 °C (OpenStax Chemistry 2e §14.3)
 * and USGS PHREEQC temperature dependence curves across liquid-water range (0–90 °C).
 */
export const AQUEOUS_CONSTANTS_25C = {
  waterKw: 1e-14,
  aceticKa: 1.8e-5,
  ammoniaKb: 1.8e-5,
  bisulfateKa: 1.2e-2,
  phosphoricKa1: 7.5e-3,
  phosphoricKa2: 6.2e-8,
  phosphoricKa3: 4.2e-13,
} as const;

export type ThermoCoefficients = readonly [number, number, number, number?, number?, number?];

/** PHREEQC analytical log10 K = A1 + A2*T + A3/T + A4*log10(T) + A5/T^2 + A6*T^2 (T in K). */
function analyticalLogK(coefficients: ThermoCoefficients, kelvin: number): number {
  const [a, b, c, d = 0, e = 0, f = 0] = coefficients;
  return a + b * kelvin + c / kelvin + d * Math.log10(kelvin) + e / kelvin ** 2 + f * kelvin ** 2;
}

/**
 * Preserves the selected 25 °C reference value while applying PHREEQC analytical
 * temperature dependence. Reverse association constants with direction = -1.
 */
export function temperatureAdjustedConstant(
  reference: number,
  coefficients: ThermoCoefficients,
  temperature_c: number,
  direction = 1
): number {
  if (temperature_c === 25) return reference;
  return (
    reference *
    10 **
      (direction *
        (analyticalLogK(coefficients, temperature_c + 273.15) - analyticalLogK(coefficients, 298.15)))
  );
}

export function supportedAqueousTemperature(temperature_c: number): boolean {
  return Number.isFinite(temperature_c) && temperature_c >= 0 && temperature_c <= 90;
}

export function aqueousConstantsAtTemperature(temperature_c: number) {
  if (!supportedAqueousTemperature(temperature_c)) return null;
  return {
    waterKw: temperatureAdjustedConstant(
      AQUEOUS_CONSTANTS_25C.waterKw,
      [293.29227, 0.1360833, -10576.913, -123.73158, 0, -6.996455e-5],
      temperature_c
    ),
    ammoniumKa: temperatureAdjustedConstant(
      AQUEOUS_CONSTANTS_25C.waterKw / AQUEOUS_CONSTANTS_25C.ammoniaKb,
      [0.6322, -0.001225, -2835.76],
      temperature_c
    ),
    bisulfateKa: temperatureAdjustedConstant(
      AQUEOUS_CONSTANTS_25C.bisulfateKa,
      [-56.889, 0.006473, 2307.9, 19.8858],
      temperature_c,
      -1
    ),
  };
}
