import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies } from './speciesIdentity';
import { supportedAqueousTemperature, temperatureAdjustedConstant } from './aqueousTemperature';

// PHREEQC phreeqc.dat, Barite: log K = -9.970 at 25 C.
// Ideal concentration approximation, not a full activity/speciation model.
export const BARITE_KSP_25C = 10 ** -9.970;

/** van't Hoff derivative of the same analytical log K curve, J/mol.
 * d ln K/dT = dH/(R T²); normalization at 25 C cancels in the derivative. */
export function bariteDissolutionEnthalpy_J_mol(temperature_c: number): number | null {
  if (!supportedAqueousTemperature(temperature_c)) return null;
  return 8.314462618 * (Math.LN10 * 7680.41 - 48.595 * (temperature_c + 273.15));
}

/** PHREEQC Barite analytical curve, normalized to its rounded 25 C log K.
 * 0–90 C is the application's aqueous range, not a new calibration claim. */
export function bariteKspAtTemperature(temperature_c = 25): number | null {
  return supportedAqueousTemperature(temperature_c)
    ? temperatureAdjustedConstant(BARITE_KSP_25C, [136.035, 0, -7680.41, -48.595], temperature_c)
    : null;
}

/** Dissolved analytical ion totals. BaSO4(aq) represents a dissociated
 * formula-unit pool, not a claim that neutral BaSO4 molecules dominate. */
export function bariteIonInventory(contents: readonly SubstanceContent[]) {
  let barium = 0, sulfate = 0, water = false;
  for (const item of contents) {
    if (!Number.isFinite(item.moles) || item.moles < 0) return null;
    if (item.moles === 0) continue;
    if (item.location && item.location !== 'bulk') return null;
    const identity = identifySpecies(item.formula);
    const phase = item.phase ?? identity.phase;
    if (identity.formula === 'H2O' && phase === 'l') { water = true; continue; }
    if (identity.formula === 'BaSO4' && phase === 's') continue;
    if (phase !== 'aq') return null;
    switch (identity.formula) {
      case 'BaSO4': barium += item.moles; sulfate += item.moles; break;
      case 'BaCl2': case 'Ba(NO3)2': barium += item.moles; break;
      case 'Na2SO4': case 'K2SO4': sulfate += item.moles; break;
      case 'NaCl': case 'KCl': case 'NaNO3': case 'KNO3': break;
      default: return null; // acid, ligands and competing ions need speciation
    }
  }
  return water ? { barium, sulfate } : null;
}

/** Additional molar extent for BaCl2 + Na2SO4. null means unsupported,
 * not proof of complete precipitation. Existing solid does not enter Q. */
export function baritePrecipitationExtent(contents: readonly SubstanceContent[], volume_ml: number, temperature_c = 25): number | null {
  if (!(volume_ml > 0) || !Number.isFinite(volume_ml)) return null;
  const ksp = bariteKspAtTemperature(temperature_c);
  const inventory = bariteIonInventory(contents);
  if (ksp === null || !inventory) return null;
  const { barium, sulfate } = inventory;
  const saturationProduct = ksp * (volume_ml / 1000) ** 2;
  if (barium * sulfate <= saturationProduct * (1 + 1e-12)) return 0;
  // Monotone bounded solve avoids catastrophic cancellation near saturation.
  let low = 0, high = Math.min(barium, sulfate);
  for (let i = 0; i < 60; i++) {
    const extent = (low + high) / 2;
    if ((barium - extent) * (sulfate - extent) > saturationProduct) low = extent;
    else high = extent;
  }
  return (low + high) / 2;
}
