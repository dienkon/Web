// Values from PHREEQC Version 2 (USGS 99-4259), attachment B, p. 301.
// https://water.usgs.gov/water-resources/software/PHREEQC/Phreeqc_2_1999_manual.pdf
export const BARITE_KSP_25C = 10 ** -9.970;
const REFERENCE_K = 298.15;
const INVERSE_T_COEFFICIENT = -7680.41;
const LOG_T_COEFFICIENT = -48.595;

function supportedTemperature(temperature_c) {
  return Number.isFinite(temperature_c) && temperature_c >= 0 && temperature_c <= 90;
}

export function bariteKspAtTemperature(temperature_c = 25) {
  if (!supportedTemperature(temperature_c)) return null;
  const kelvin = temperature_c + 273.15;
  const logChange = INVERSE_T_COEFFICIENT * (1 / kelvin - 1 / REFERENCE_K)
    + LOG_T_COEFFICIENT * Math.log10(kelvin / REFERENCE_K);
  return BARITE_KSP_25C * 10 ** logChange;
}

/** van't Hoff derivative of the same curve, in J/mol. */
export function bariteDissolutionEnthalpy_J_mol(temperature_c) {
  if (!supportedTemperature(temperature_c)) return null;
  return 8.314462618 * (-Math.LN10 * INVERSE_T_COEFFICIENT + LOG_T_COEFFICIENT * (temperature_c + 273.15));
}

/** Analytical ion totals for the supported neutral, aqueous mixtures. */
export function bariteIonInventory(contents) {
  let barium = 0, sulfate = 0, water = false;
  for (const { formula, phase, moles, location } of contents) {
    if (!Number.isFinite(moles) || moles < 0) return null;
    if (moles === 0) continue;
    if (location && location !== 'bulk') return null;
    if (formula === 'H2O' && phase === 'l') { water = true; continue; }
    if (formula === 'BaSO4' && phase === 's') continue;
    if (phase !== 'aq') return null;
    switch (formula) {
      case 'BaSO4': barium += moles; sulfate += moles; break;
      case 'BaCl2': case 'Ba(NO3)2': barium += moles; break;
      case 'Na2SO4': case 'K2SO4': sulfate += moles; break;
      case 'NaCl': case 'KCl': case 'NaNO3': case 'KNO3': break;
      default: return null;
    }
  }
  return water ? { barium, sulfate } : null;
}

/** Extent to saturation using ideal concentrations. Null marks unsupported inputs. */
export function baritePrecipitationExtent(contents, volume_ml, temperature_c = 25) {
  if (!(volume_ml > 0) || !Number.isFinite(volume_ml)) return null;
  const ksp = bariteKspAtTemperature(temperature_c);
  const inventory = bariteIonInventory(contents);
  if (ksp === null || !inventory) return null;
  const { barium, sulfate } = inventory;
  const saturationProduct = ksp * (volume_ml / 1000) ** 2;
  if (barium * sulfate <= saturationProduct * (1 + 1e-12)) return 0;

  let low = 0, high = Math.min(barium, sulfate);
  for (let i = 0; i < 60; i++) {
    const extent = (low + high) / 2;
    if ((barium - extent) * (sulfate - extent) > saturationProduct) low = extent;
    else high = extent;
  }
  return (low + high) / 2;
}
