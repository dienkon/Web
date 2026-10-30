/** Concentration reference values retained at 25 C. */
export const AQUEOUS_CONSTANTS_25C = {
  waterKw: 1e-14, aceticKa: 1.8e-5, ammoniaKb: 1.8e-5, bisulfateKa: 1.2e-2,
} as const;

export type ThermoCoefficients = readonly [number, number, number, number?, number?, number?];
/** PHREEQC log10 K = A1 + A2 T + A3/T + A4 log10 T + A5/T² + A6 T².
 * T is kelvin. Used only within the supported liquid-water range below.
 * https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-50.htm
 */
function analyticalLogK(coefficients: ThermoCoefficients, kelvin: number): number {
  const [a, b, c, d = 0, e = 0, f = 0] = coefficients;
  return a + b * kelvin + c / kelvin + d * Math.log10(kelvin) + e / kelvin ** 2 + f * kelvin ** 2;
}

/** Preserve the selected 25 C reference while applying the sourced curve's
 * temperature dependence. Reverse association constants with direction=-1. */
export function temperatureAdjustedConstant(reference: number, coefficients: ThermoCoefficients,
  temperature_c: number, direction = 1): number {
  if (temperature_c === 25) return reference;
  return reference * 10 ** (direction * (analyticalLogK(coefficients, temperature_c + 273.15)
    - analyticalLogK(coefficients, 298.15)));
}

export function supportedAqueousTemperature(temperature_c: number): boolean {
  return Number.isFinite(temperature_c) && temperature_c >= 0 && temperature_c <= 90;
}

/** van't Hoff derivative of the same analytical Kw curve, J/mol.
 * dH = R T² d(ln Kw)/dT; 25 C normalization cancels in differentiation. */
export function waterDissociationEnthalpy_J_mol(temperature_c: number): number | null {
  if (!supportedAqueousTemperature(temperature_c)) return null;
  const t = temperature_c + 273.15;
  return 8.314462618 * Math.LN10 * (0.1360833 * t * t + 10576.913
    - 123.73158 * t / Math.LN10 + 2 * -6.996455e-5 * t ** 3);
}

/** USGS PHREEQC analytical coefficients: water dissociation, ammonium
 * dissociation, and sulfate protonation (reversed for HSO4 dissociation).
 * Values are normalized to the selected textbook 25 C references, not an
 * assertion that every database version has identical rounded reference data.
 * https://github.com/phreeqc-dev/phreeqc3/blob/master/database/phreeqc.dat
 */
export function aqueousConstantsAtTemperature(temperature_c: number) {
  if (!supportedAqueousTemperature(temperature_c)) return null;
  return {
    waterKw: temperatureAdjustedConstant(AQUEOUS_CONSTANTS_25C.waterKw,
      [293.29227, 0.1360833, -10576.913, -123.73158, 0, -6.996455e-5], temperature_c),
    ammoniumKa: temperatureAdjustedConstant(AQUEOUS_CONSTANTS_25C.waterKw / AQUEOUS_CONSTANTS_25C.ammoniaKb,
      [0.6322, -0.001225, -2835.76], temperature_c),
    bisulfateKa: temperatureAdjustedConstant(AQUEOUS_CONSTANTS_25C.bisulfateKa,
      [-56.889, 0.006473, 2307.9, 19.8858], temperature_c, -1),
  };
}

export function neutralPhAtTemperature(temperature_c: number): number | null {
  const constants = aqueousConstantsAtTemperature(temperature_c);
  return constants ? -Math.log10(constants.waterKw) / 2 : null;
}

/** This describes a solution's current acidity, not intrinsic acid/base strength. */
export function solutionAcidity(ph: number, referenceTemperature_c: number) {
  const neutral = neutralPhAtTemperature(referenceTemperature_c);
  if (neutral === null || !Number.isFinite(ph)) return null;
  return Math.abs(ph - neutral) <= 0.02 ? 'neutral' : ph < neutral ? 'acidic' : 'basic';
}
