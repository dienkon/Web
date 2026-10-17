/**
 * Chemical Formula Parser, Formatter and Molar Mass Calculator
 */

import { ATOMIC_WEIGHTS } from './elements';

/**
 * Parses a chemical formula into constituent atom counts.
 * Correctly handles:
 * - Simple molecules: H2O, NaCl, CO2
 * - Parentheses: Ca(OH)2, Al2(SO4)3, Pb(NO3)2
 * - Square brackets: [Cu(NH3)4]SO4
 * - Hydrate salts: CuSO4·5H2O, FeSO4.7H2O
 */
export function parseChemicalFormula(formula: string): Record<string, number> {
  const result: Record<string, number> = {};
  if (!formula || typeof formula !== 'string') return result;

  // Remove state indicators e.g. (aq), (s), (l), (g), (conc), (dil)
  const clean = formula.replace(/\s*\((?:s|l|g|aq|conc|dil)\)/gi, '').trim();

  // Split hydrate dot notation (· or .)
  const hydrateParts = clean.split(/[·\.]/);
  const mainPart = hydrateParts[0];

  function parseSubPart(str: string, multiplier: number = 1) {
    let i = 0;
    while (i < str.length) {
      if (str[i] === '(' || str[i] === '[') {
        const closeChar = str[i] === '(' ? ')' : ']';
        let depth = 1;
        let j = i + 1;
        while (j < str.length && depth > 0) {
          if (str[j] === str[i]) depth++;
          else if (str[j] === closeChar) depth--;
          j++;
        }
        const inner = str.slice(i + 1, j - 1);
        const numMatch = str.slice(j).match(/^(\d+)/);
        const subMult = numMatch ? parseInt(numMatch[1], 10) : 1;
        parseSubPart(inner, multiplier * subMult);
        i = j + (numMatch ? numMatch[1].length : 0);
      } else {
        const elMatch = str.slice(i).match(/^([A-Z][a-z]*)(\d*)/);
        if (elMatch) {
          const el = elMatch[1];
          const count = elMatch[2] ? parseInt(elMatch[2], 10) : 1;
          result[el] = (result[el] || 0) + count * multiplier;
          i += elMatch[0].length;
        } else {
          i++; // Skip unrecognized character safely
        }
      }
    }
  }

  parseSubPart(mainPart, 1);

  // If hydrate part exists (e.g. 5H2O)
  if (hydrateParts.length > 1) {
    for (let k = 1; k < hydrateParts.length; k++) {
      const hydPart = hydrateParts[k].trim();
      const match = hydPart.match(/^(\d*)(.*)/);
      if (match) {
        const hydMult = match[1] ? parseInt(match[1], 10) : 1;
        const hydFormula = match[2];
        parseSubPart(hydFormula, hydMult);
      }
    }
  }

  return result;
}

/**
 * Computes standard molar mass in g/mol from a formula string.
 */
export function computeMolarMass(formula: string): number {
  const atoms = parseChemicalFormula(formula);
  let totalMass = 0;
  for (const [el, count] of Object.entries(atoms)) {
    const weight = ATOMIC_WEIGHTS[el] || 1.0;
    totalMass += weight * count;
  }
  return totalMass > 0 ? Math.round(totalMass * 1000) / 1000 : 18.015;
}

/**
 * Normalizes formula token for matching without phase tags or capitalization mismatches.
 */
export function normalizeFormula(formula: string): string {
  if (!formula) return '';
  return formula
    .replace(/\s*\((?:s|l|g|aq|conc|dil)\)/gi, '')
    .replace(/[·\.]\d*H2O/gi, '')
    .replace(/\s+/g, '')
    .toUpperCase();
}

/**
 * Formats chemical formulas with proper Unicode subscripts for scientific presentation.
 * e.g., "H2SO4" -> "H₂SO₄", "CuSO4.5H2O" -> "CuSO₄·5H₂O"
 */
const SUBSCRIPT_DIGITS: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
};

export function formatFormulaUnicode(formula: string): string {
  if (!formula) return '';
  // Replace hydrate dot
  let res = formula.replace(/[·\.]/g, '·');
  // Replace numbers following elements/brackets with subscripts
  res = res.replace(/([A-Za-z\)\]])(\d+)/g, (_, char, digits) => {
    const subDigits = digits.split('').map((d: string) => SUBSCRIPT_DIGITS[d] || d).join('');
    return `${char}${subDigits}`;
  });
  return res;
}
