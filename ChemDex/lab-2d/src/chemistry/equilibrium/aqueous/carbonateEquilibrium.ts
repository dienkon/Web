import { temperatureAdjustedConstant, supportedAqueousTemperature } from './aqueousTemperature';

/**
 * Thermodynamic carbonate equilibrium constants at 25 °C (USGS PHREEQC / Plummer & Busenberg 1982).
 * Concentrations approximate ideal dilute activities.
 */
export const CARBONATE_CONSTANTS_25C = {
  ka1: 10 ** -6.352,
  ka2: 10 ** -10.329,
  calciteKsp: 10 ** -8.48,
} as const;

export function carbonateConstantsAtTemperature(temperature_c = 25) {
  if (!supportedAqueousTemperature(temperature_c)) return null;
  const ka2 = temperatureAdjustedConstant(
    CARBONATE_CONSTANTS_25C.ka2,
    [107.8871, 0.03252849, -5151.79, -38.92561, 563713.9],
    temperature_c,
    -1
  );
  const combined = temperatureAdjustedConstant(
    CARBONATE_CONSTANTS_25C.ka1 * CARBONATE_CONSTANTS_25C.ka2,
    [464.1965, 0.09344813, -26986.16, -165.75951, 2248628.9],
    temperature_c,
    -1
  );
  return {
    ka1: temperature_c === 25 ? CARBONATE_CONSTANTS_25C.ka1 : combined / ka2,
    ka2,
    calciteKsp: temperatureAdjustedConstant(
      CARBONATE_CONSTANTS_25C.calciteKsp,
      [-171.9065, -0.077993, 2839.319, 71.595],
      temperature_c
    ),
  };
}

/** CO2* denotes dissolved CO2(aq) + hydrated H2CO3. */
export function carbonateFractions(
  hydrogen_M: number,
  { ka1, ka2 }: { ka1: number; ka2: number } = CARBONATE_CONSTANTS_25C
) {
  const denominator = hydrogen_M * hydrogen_M + ka1 * hydrogen_M + ka1 * ka2;
  return {
    carbonDioxide: (hydrogen_M * hydrogen_M) / denominator,
    bicarbonate: (ka1 * hydrogen_M) / denominator,
    carbonate: (ka1 * ka2) / denominator,
  };
}
