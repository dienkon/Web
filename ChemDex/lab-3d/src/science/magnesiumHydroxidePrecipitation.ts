import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies } from './speciesIdentity';
import { aqueousConstantsAtTemperature } from './aqueousTemperature';

// USGS experimental brucite activity products, 10–90 C. Interpolation is
// an application approximation; concentrations approximate activities.
const points = [[10, 10.89], [25, 10.88], [40, 10.90], [55, 10.90], [70, 10.99], [90, 11.10]];
/** pH of the CURRENT inventory, not the future precipitated endpoint.
 * Same ideal strong-base balance as the extent model; Mg hydrolysis omitted. */
export function magnesiumMixturePh(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number): number | null {
  if (!contents.some(c => c.moles > 0 && ['MgCl2', 'Mg(OH)2'].includes(identifySpecies(c.formula).formula))) return null;
  if (magnesiumHydroxideExtent(contents, volume_ml, temperature_c) === null) return null;
  const kw = aqueousConstantsAtTemperature(temperature_c)!.waterKw;
  const base = contents.reduce((sum, c) => {
    const f = identifySpecies(c.formula).formula;
    return sum + (f === 'NaOH' ? c.moles : f === 'Mg(OH)2' && c.phase === 'aq' ? 2 * c.moles : 0);
  }, 0) / (volume_ml / 1000);
  const oh = (base + Math.sqrt(base ** 2 + 4 * kw)) / 2;
  return -Math.log10(kw / oh);
}
export function bruciteKsp(temperature_c: number): number | null {
  if (!Number.isFinite(temperature_c) || temperature_c < 10 || temperature_c > 90) return null;
  for (let i = 1; i < points.length; i++) {
    const [t, p] = points[i], [previousT, previousP] = points[i - 1];
    if (temperature_c <= t) return 10 ** -(previousP + (p - previousP) * (temperature_c - previousT) / (t - previousT));
  }
  return null;
}

/** Forward MgCl2/NaOH extent only; no complexation, acid or other metals.
 * OH is derived from net alkalinity and Kw, including water autoionization. */
export function magnesiumHydroxideExtent(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number): number | null {
  const ksp = bruciteKsp(temperature_c), constants = aqueousConstantsAtTemperature(temperature_c);
  if (ksp === null || !constants || !(volume_ml > 0) || !Number.isFinite(volume_ml)) return null;
  let mg = 0, base = 0, water = false;
  for (const c of contents) {
    if (!Number.isFinite(c.moles) || c.moles < 0 || (c.location && c.location !== 'bulk')) return null;
    if (c.moles === 0) continue;
    const identity = identifySpecies(c.formula), phase = c.phase ?? identity.phase;
    if (identity.formula === 'H2O' && phase === 'l') { water = true; continue; }
    if (identity.formula === 'Mg(OH)2' && phase === 's') continue;
    if (phase !== 'aq') return null;
    if (identity.formula === 'MgCl2') mg += c.moles;
    else if (identity.formula === 'Mg(OH)2') { mg += c.moles; base += 2 * c.moles; }
    else if (identity.formula === 'NaOH') base += c.moles;
    else if (identity.formula !== 'NaCl') return null;
  }
  if (!water) return null;
  const v = volume_ml / 1000;
  const product = (extent: number) => {
    const alkalinity = (base - 2 * extent) / v;
    const oh = (alkalinity + Math.sqrt(alkalinity ** 2 + 4 * constants.waterKw)) / 2;
    return Math.max(0, mg - extent) / v * oh ** 2;
  };
  if (product(0) <= ksp * (1 + 1e-10)) return 0;
  let low = 0, high = Math.min(mg, base / 2);
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (product(mid) > ksp) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}
