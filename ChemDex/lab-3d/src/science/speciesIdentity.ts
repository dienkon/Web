export interface SpeciesIdentity {
  formula: string;
  phase: 's' | 'l' | 'g' | 'aq' | null;
  concentration: 'concentrated' | 'dilute' | null;
}

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';

/** Remove labels only; never remove molecular groups or hydration waters. */
export function identifySpecies(input: string): SpeciesIdentity {
  let formula = String(input ?? '').trim().replace(/[₀-₉]/g, digit => String(SUBSCRIPTS.indexOf(digit)));
  let phase: SpeciesIdentity['phase'] = null;
  let concentration: SpeciesIdentity['concentration'] = null;
  formula = formula.replace(/\s*\((aq|s|l|g|conc|concentrated|dil|dilute|đặc|loãng)\)/gi, (_, label: string) => {
    const value = label.toLowerCase();
    if (['aq', 's', 'l', 'g'].includes(value)) phase = value as SpeciesIdentity['phase'];
    else concentration = ['conc', 'concentrated', 'đặc'].includes(value) ? 'concentrated' : 'dilute';
    return '';
  });
  formula = formula.replace(/\s*\(\d+(?:\.\d+)?%\)/g, '');
  formula = formula.replace(/^(?:chemical[-_]|reagent[-_])/i, '').replace(/\s+/g, '');
  return { formula, phase, concentration };
}

export function sameMolecularFormula(left: string, right: string): boolean {
  return identifySpecies(left).formula.toLowerCase() === identifySpecies(right).formula.toLowerCase();
}

/** A named concentrated/dilute reagent cannot be satisfied by the other grade. */
export function matchesReagent(available: string, required: string): boolean {
  const source = identifySpecies(available);
  const target = identifySpecies(required);
  if (source.formula.toLowerCase() !== target.formula.toLowerCase()) return false;
  if (target.concentration && source.concentration !== target.concentration) return false;
  if (target.phase && source.phase && target.phase !== source.phase) return false;
  return true;
}
