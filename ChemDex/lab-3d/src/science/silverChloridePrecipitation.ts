import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies } from './speciesIdentity';
import { supportedAqueousTemperature } from './aqueousTemperature';

/** WATEQ4F Cerargyrite: log K=-9.75, dissolution dH=15.652 kcal/mol.
 * Constant-enthalpy temperature approximation; no Ag chloride complexes. */
export type Halide = 'Cl' | 'Br' | 'I';
const halides = { Cl: [-9.75, 15.652], Br: [-12.27, 20.17], I: [-16.07, 26.82] } as const;
export const silverHalideDissolutionEnthalpy_J_mol = (halide: Halide) => halides[halide][1] * 4184;
export function silverChlorideKsp(temperature_c: number, halide: Halide = 'Cl'): number | null {
  const [logK, enthalpy] = halides[halide];
  return supportedAqueousTemperature(temperature_c) ? 10 ** logK
    * Math.exp(enthalpy * 4184 / 8.314462618 * (1 / 298.15 - 1 / (temperature_c + 273.15))) : null;
}
export function silverChlorideIonInventory(contents: readonly SubstanceContent[], halide: Halide = 'Cl') {
  let silver = 0, chloride = 0, water = false;
  for (const c of contents) {
    if (!Number.isFinite(c.moles) || c.moles < 0 || (c.location && c.location !== 'bulk')) return null;
    if (c.moles === 0) continue;
    const identity = identifySpecies(c.formula), phase = c.phase ?? identity.phase;
    if (identity.formula === 'H2O' && phase === 'l') { water = true; continue; }
    if (identity.formula === `Ag${halide}` && phase === 's') continue;
    if (phase !== 'aq') return null;
    if (identity.formula === `Ag${halide}`) { silver += c.moles; chloride += c.moles; }
    else if (identity.formula === 'AgNO3') silver += c.moles;
    else if ([`Na${halide}`, `K${halide}`].includes(identity.formula)) chloride += c.moles;
    else if (!['NaNO3', 'KNO3'].includes(identity.formula)) return null;
  }
  return water ? { silver, chloride } : null;
}
export function silverChlorideExtent(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number, halide: Halide = 'Cl'): number | null {
  const ksp = silverChlorideKsp(temperature_c, halide), inventory = silverChlorideIonInventory(contents, halide);
  if (ksp === null || !inventory || !(volume_ml > 0) || !Number.isFinite(volume_ml)) return null;
  const { silver, chloride } = inventory, liters = volume_ml / 1000;
  // Conservative applicability guard, not a sharp complexation boundary.
  if (silver / liters > 0.1 || chloride / liters > 0.1) return null;
  const target = ksp * liters ** 2;
  if (silver * chloride <= target * (1 + 1e-10)) return 0;
  let low = 0, high = Math.min(silver, chloride);
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if ((silver - mid) * (chloride - mid) > target) low = mid; else high = mid;
  }
  return (low + high) / 2;
}

export function silverHalideProgramExtent(id: string, contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number) {
  const programs: Readonly<Record<string, Halide>> = { agno3_nacl: 'Cl', agno3_kbr: 'Br', agno3_ki: 'I' };
  const halide = programs[id];
  return halide ? silverChlorideExtent(contents, volume_ml, temperature_c, halide) : null;
}
