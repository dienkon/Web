import { temperatureAdjustedConstant, supportedAqueousTemperature } from './aqueousTemperature';

/** Thermodynamic reference at 25 C. Concentrations approximate activities;
 * ion pairing and ionic-strength corrections are not included here.
 * Ka2: USGS PHREEQC SOLUTION_SPECIES, log association K = 10.329.
 * Ka1: PHREEQC CO3 + 2H -> CO2 + H2O, log K = 16.681,
 *      hence pKa1 = 16.681 - 10.329 = 6.352.
 * Calcite: Plummer & Busenberg (1982), log Ksp = -8.480.
 * https://water.usgs.gov/water-resources/software/PHREEQC/documentation/phreeqc3-html/phreeqc3-50.htm
 * https://github.com/phreeqc-dev/phreeqc3/blob/master/database/phreeqc.dat
 * https://www.usgs.gov/publications/solubilities-calcite-aragonite-and-vaterite-co2-h2o-solutions-between-0-and-90degc-and
 */
export const CARBONATE_CONSTANTS_25C = {
  ka1: 10 ** -6.352,
  ka2: 10 ** -10.329,
  calciteKsp: 10 ** -8.480,
} as const;

export function carbonateConstantsAtTemperature(temperature_c = 25) {
  if (!supportedAqueousTemperature(temperature_c)) return null;
  const ka2 = temperatureAdjustedConstant(CARBONATE_CONSTANTS_25C.ka2,
    [107.8871, 0.03252849, -5151.79, -38.92561, 563713.9], temperature_c, -1);
  const combined = temperatureAdjustedConstant(CARBONATE_CONSTANTS_25C.ka1 * CARBONATE_CONSTANTS_25C.ka2,
    [464.1965, 0.09344813, -26986.16, -165.75951, 2248628.9], temperature_c, -1);
  return { ka1: temperature_c === 25 ? CARBONATE_CONSTANTS_25C.ka1 : combined / ka2, ka2,
    // Classical PHREEQC calcite fit associated with the -8.480 reference:
    // https://github.com/phreeqc-dev/phreeqc/blob/master/database/phreeqc.dat
    calciteKsp: temperatureAdjustedConstant(CARBONATE_CONSTANTS_25C.calciteKsp,
      [-171.9065, -0.077993, 2839.319, 71.595], temperature_c) };
}

/** CO2* denotes dissolved CO2 + hydrated carbonic acid, not gas-phase CO2. */
export function carbonateFractions(hydrogen_M: number,
  { ka1, ka2 }: { ka1: number; ka2: number } = CARBONATE_CONSTANTS_25C) {
  const denominator = hydrogen_M * hydrogen_M + ka1 * hydrogen_M + ka1 * ka2;
  return { carbonDioxide: hydrogen_M * hydrogen_M / denominator,
    bicarbonate: ka1 * hydrogen_M / denominator, carbonate: ka1 * ka2 / denominator };
}
