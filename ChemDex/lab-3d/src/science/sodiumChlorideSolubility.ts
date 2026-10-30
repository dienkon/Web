/**
 * Anhydrous NaCl / water: IUPAC reference-material correlation, Eq. 11/Table 5.
 * https://doi.org/10.1515/pac-2021-1002
 * Returns g salt / g liquid water. This application uses only 0..100 C;
 * hydrate equilibria, pressure corrections and common ions are not modeled.
 */
export function sodiumChlorideSolubilityRatio(temperature_c: number): number | undefined {
  if (!Number.isFinite(temperature_c) || temperature_c < 0 || temperature_c > 100) return undefined;
  const t = temperature_c + 273.15;
  const logActivitySquared = 4473.5 / t + 33.9515 * Math.log(t)
    - 0.08580 * t - 189.763 + 3.92063e-5 * t * t;
  const activity = Math.exp(logActivitySquared / 2);
  // Eq. 11: activity = 2m / (1/M_water + 2m), m in mol/kg water.
  const molality = activity / (2 * 0.01801528 * (1 - activity));
  return molality * 58.44 / 1000;
}
