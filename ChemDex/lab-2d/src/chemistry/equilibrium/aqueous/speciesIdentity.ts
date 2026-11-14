export interface SpeciesIdentity {
  formula: string;
  phase: 's' | 'l' | 'g' | 'aq' | null;
  concentration: 'concentrated' | 'dilute' | null;
}

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';

/**
 * Normalizes display labels and Unicode subscripts down to canonical molecular formula,
 * optional phase tag, and concentration grade without altering hydration waters or groups.
 */
export function identifySpecies(input: string): SpeciesIdentity {
  let formula = String(input ?? '')
    .trim()
    .replace(/[₀-₉]/g, (digit) => String(SUBSCRIPTS.indexOf(digit)));
  let phase: SpeciesIdentity['phase'] = null;
  let concentration: SpeciesIdentity['concentration'] = null;

  formula = formula.replace(
    /\s*\((aq|s|l|g|solid|liquid|gas|conc|concentrated|glacial|dil|dilute|đặc|loãng)\)/gi,
    (_, label: string) => {
      const value = label.toLowerCase();
      if (value === 'aq' || value === 's' || value === 'l' || value === 'g') {
        phase = value;
      } else if (value === 'solid' || value === 'liquid' || value === 'gas') {
        phase = ({ solid: 's', liquid: 'l', gas: 'g' } as const)[value];
      } else {
        concentration = ['conc', 'concentrated', 'glacial', 'đặc'].includes(value)
          ? 'concentrated'
          : 'dilute';
      }
      return '';
    }
  );

  formula = formula.replace(/\s*\((ribbon|powder|granules|dust|filings|nail|turnings|foil|chips|carbon)\)/gi, '');
  formula = formula.replace(/\s*\(\d+(?:\.\d+)?%\)/g, '');
  formula = formula.replace(/^(?:chemical[-_]|reagent[-_])/i, '').replace(/\s+/g, '');

  return { formula, phase, concentration };
}
