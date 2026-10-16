import type { SubstanceContent } from '../types/chemistry';
import { indicatorKey } from './aqueousEquilibrium';

/** Transition intervals: University of Wisconsin, Indicator Table.
 * https://www2.chem.wisc.edu/deptfiles/genchem/tables/IndicatorTable.htm
 * RGB interpolation is illustrative, not measured absorption spectroscopy.
 */
function blend(left: string, right: string, fraction: number): string {
  const weight = Math.max(0, Math.min(1, fraction));
  const channels = [1, 3, 5].map(offset => {
    const a = parseInt(left.slice(offset, offset + 2), 16);
    const b = parseInt(right.slice(offset, offset + 2), 16);
    return Math.round(a + (b - a) * weight).toString(16).padStart(2, '0');
  });
  return '#' + channels.join('');
}

export function indicatorColor(indicator: string, ph: number): string | null {
  if (!Number.isFinite(ph)) return null;
  const token = indicator.toLowerCase();
  if (token.includes('phenolphthalein')) {
    const fraction = 1 / (1 + 10 ** (9.4 - ph));
    return blend('#f8fafc', '#ec4899', fraction);
  }
  if (token.includes('methyl_orange')) {
    const fraction = 1 / (1 + 10 ** (3.7 - ph));
    return blend('#ef4444', '#facc15', fraction);
  }
  if (token.includes('bromothymol_blue')) {
    const fraction = 1 / (1 + 10 ** (7.1 - ph));
    return fraction < 0.5 ? blend('#facc15', '#22a65a', fraction * 2)
      : blend('#22a65a', '#1d4ed8', (fraction - 0.5) * 2);
  }
  return null;
}

/** No stain from a zero-dose or gaseous indicator, or from labels alone. */
export function solutionIndicatorColor(contents: readonly SubstanceContent[], ph: number): string | null {
  const indicators = contents.filter(item => item.moles > 0 && item.phase !== 's' && item.phase !== 'g')
    .map(item => indicatorKey(item.formula)).filter((key): key is string => key !== null);
  // Mixing several dyes needs their concentrations and absorption spectra.
  if (new Set(indicators).size !== 1) return null;
  return indicatorColor(indicators[0], ph);
}
