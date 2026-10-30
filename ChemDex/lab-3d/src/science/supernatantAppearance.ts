import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies } from './speciesIdentity';

const colorless = new Set(['H2O', 'NaCl', 'KCl', 'NaBr', 'KBr', 'NaI', 'KI',
  'NaNO3', 'KNO3', 'AgNO3', 'BaCl2', 'Ba(NO3)2', 'Pb(NO3)2', 'Na2SO4', 'K2SO4',
  'NaOH', 'KOH', 'HNO3', 'HCl', 'H2SO4', 'CaCl2', 'Na2CO3', 'NaHCO3', 'Ca(HCO3)2',
  // Analytical dissolved barite pool from partitionBarite: Ba2+/SO4(2-).
  'BaSO4', 'AgCl', 'AgBr', 'AgI', 'Ca(OH)2', 'Mg(OH)2', 'MgCl2']);
const copper = new Set(['CuSO4', 'Cu(NO3)2', 'CuCl2']);

/** Qualitative RGB for a deliberately limited aqueous mixture. No spectra or
 * complex equilibria are inferred. Null preserves the caller's existing model.
 * Wisconsin demonstrations: dissolved Cu(II) stays blue beside white BaSO4.
 */
export function supernatantColor(contents: readonly SubstanceContent[], volume_ml: number): string | null {
  if (!(volume_ml > 0) || !Number.isFinite(volume_ml)) return null;
  let water = false, copperMoles = 0, chlorideMoles = 0;
  for (const item of contents) {
    if (item.location && item.location !== 'bulk') continue;
    if (!Number.isFinite(item.moles) || item.moles < 0) return null;
    if (!(item.moles > 0)) continue;
    const identity = identifySpecies(item.formula);
    const phase = item.phase ?? identity.phase;
    if (phase === 's' || phase === 'g' || item.location === 'filter') continue;
    if (item.liquidLayer === 'organic') return null;
    const formula = identity.formula;
    if (formula === 'H2O') {
      if (phase !== 'l') return null;
      water = true; continue;
    }
    if (phase !== 'aq' || (!colorless.has(formula) && !copper.has(formula))) return null;
    if (copper.has(formula)) copperMoles += item.moles;
    if (['NaCl', 'KCl', 'HCl'].includes(formula)) chlorideMoles += item.moles;
    if (['CuCl2', 'BaCl2', 'CaCl2'].includes(formula)) chlorideMoles += 2 * item.moles;
  }
  if (!water) return null;
  if (copperMoles <= 0) return '#f8fafc';
  const concentration = copperMoles / (volume_ml / 1000);
  // Conservative applicability guard, not a thermodynamic transition boundary.
  if (concentration > 0.1 || chlorideMoles / (volume_ml / 1000) > 0.1) return null;
  const strength = Math.min(1, concentration / 0.1);
  const clear = [248, 250, 252], blue = [56, 189, 248];
  return '#' + clear.map((channel, i) => Math.round(channel + (blue[i] - channel) * strength)
    .toString(16).padStart(2, '0')).join('');
}
