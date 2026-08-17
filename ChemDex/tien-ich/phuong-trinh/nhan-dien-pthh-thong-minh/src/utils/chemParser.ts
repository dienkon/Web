/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChemicalComponent, StructuredEquation } from "../types";

// List of all valid chemical elements for validation
export const KNOWN_ELEMENTS = new Set([
  "H",
  "He",
  "Li",
  "Be",
  "B",
  "C",
  "N",
  "O",
  "F",
  "Ne",
  "Na",
  "Mg",
  "Al",
  "Si",
  "P",
  "S",
  "Cl",
  "Ar",
  "K",
  "Ca",
  "Sc",
  "Ti",
  "V",
  "Cr",
  "Mn",
  "Fe",
  "Co",
  "Ni",
  "Cu",
  "Zn",
  "Ga",
  "Ge",
  "As",
  "Se",
  "Br",
  "Kr",
  "Rb",
  "Sr",
  "Y",
  "Zr",
  "Nb",
  "Mo",
  "Tc",
  "Ru",
  "Rh",
  "Pd",
  "Ag",
  "Cd",
  "In",
  "Sn",
  "Sb",
  "Te",
  "I",
  "Xe",
  "Cs",
  "Ba",
  "La",
  "Ce",
  "Pr",
  "Nd",
  "Pm",
  "Sm",
  "Eu",
  "Gd",
  "Tb",
  "Dy",
  "Ho",
  "Er",
  "Tm",
  "Yb",
  "Lu",
  "Hf",
  "Ta",
  "W",
  "Re",
  "Os",
  "Ir",
  "Pt",
  "Au",
  "Hg",
  "Tl",
  "Pb",
  "Bi",
  "Po",
  "At",
  "Rn",
  "Fr",
  "Ra",
  "Ac",
  "Th",
  "Pa",
  "U",
  "Np",
  "Pu",
  "Am",
  "Cm",
  "Bk",
  "Cf",
  "Es",
  "Fm",
  "Md",
  "No",
  "Lr",
  "Rf",
  "Db",
  "Sg",
  "Bh",
  "Hs",
  "Mt",
  "Ds",
  "Rg",
  "Cn",
  "Nh",
  "Fl",
  "Mc",
  "Lv",
  "Ts",
  "Og",
]);

// Atomic weights for validation and molecular mass calculations if needed
export const ATOMIC_WEIGHTS: { [element: string]: number } = {
  H: 1.008,
  He: 4.0026,
  Li: 6.94,
  Be: 9.0122,
  B: 10.81,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  F: 18.998,
  Ne: 20.18,
  Na: 22.99,
  Mg: 24.305,
  Al: 26.982,
  Si: 28.085,
  P: 30.974,
  S: 32.06,
  Cl: 35.45,
  Ar: 39.948,
  K: 39.098,
  Ca: 40.078,
  Mn: 54.938,
  Fe: 55.845,
  Cu: 63.546,
  Zn: 65.38,
  Br: 79.904,
  Ag: 107.87,
  I: 126.9,
  Ba: 137.33,
  Pt: 195.08,
  Au: 196.97,
  Pb: 207.2,
};

/**
 * Parses a chemical formula (e.g. Ca(OH)2 or Al2(SO4)3) and returns element counts.
 */
export function parseFormula(formulaStr: string): {
  [element: string]: number;
} {
  const clean = formulaStr.replace(/\s+/g, "");
  const counts: { [element: string]: number } = {};
  const stack: { [element: string]: number }[] = [{}];

  let i = 0;
  while (i < clean.length) {
    const char = clean[i];

    if (char === "(" || char === "[" || char === "{") {
      stack.push({});
      i++;
    } else if (char === ")" || char === "]" || char === "}") {
      i++;
      // Read multiplier for this group
      let numStr = "";
      while (i < clean.length && /[0-9]/.test(clean[i])) {
        numStr += clean[i];
        i++;
      }
      const multiplier = numStr ? parseInt(numStr, 10) : 1;
      const popped = stack.pop();
      if (popped) {
        const top = stack[stack.length - 1];
        for (const [elem, count] of Object.entries(popped)) {
          top[elem] = (top[elem] || 0) + count * multiplier;
        }
      }
    } else {
      // Match an element symbol
      const match = clean.slice(i).match(/^([A-Z][a-z]?)([0-9]*)/);
      if (match) {
        const element = match[1];
        const numStr = match[2];
        const count = numStr ? parseInt(numStr, 10) : 1;

        // Only count if it's a known chemical element or close to one
        const top = stack[stack.length - 1];
        top[element] = (top[element] || 0) + count;
        i += match[0].length;
      } else {
        // Skip noisy character
        i++;
      }
    }
  }

  // Collapse remaining levels of stack
  while (stack.length > 1) {
    const popped = stack.pop();
    if (popped) {
      const top = stack[stack.length - 1];
      for (const [elem, count] of Object.entries(popped)) {
        top[elem] = (top[elem] || 0) + count;
      }
    }
  }

  return stack[0];
}

/**
 * Extracts the coefficient and formula from a term (e.g. "2Ca(OH)2" -> {coefficient: 2, formula: "Ca(OH)2"})
 */
export function parseCoefficientAndFormula(term: string): {
  coefficient: number;
  formula: string;
} {
  const trimmed = term.trim();
  // Match leading integer
  const match = trimmed.match(/^([0-9]+)\s*(.*)$/);
  if (match) {
    return {
      coefficient: parseInt(match[1], 10),
      formula: match[2].trim(),
    };
  }
  return {
    coefficient: 1,
    formula: trimmed,
  };
}

/**
 * Parse a raw term into a full ChemicalComponent structure
 */
export function parseChemicalComponent(term: string): ChemicalComponent {
  const { coefficient, formula } = parseCoefficientAndFormula(term);
  const elements = parseFormula(formula);
  return {
    raw: term.trim(),
    coefficient,
    formula,
    elements,
  };
}

/**
 * Clean up arrows, double-headed, or equals to standard "->", removing spacing
 */
export function normalizeArrow(equationStr: string): {
  normalized: string;
  rawArrow: string;
} {
  // Common OCR arrow variants
  const arrowRegex = /->|=>|-->|—>|→|⇌|=/;
  const match = equationStr.match(arrowRegex);
  const rawArrow = match ? match[0] : "->";

  // Replace the first match of arrow with "->"
  let normalized = equationStr;
  if (match) {
    normalized = equationStr.replace(arrowRegex, "->");
  }
  return { normalized, rawArrow };
}

/**
 * Extracts conditions like "(t°)", "(đặc nóng)", "(loãng)", "(MnO2)" from terms
 */
export function extractConditions(text: string): {
  cleanText: string;
  conditions: string[];
} {
  const conditions: string[] = [];

  // Look for patterns like (t°), (MnO2), (loãng), (đặc), (đặc, nóng), [MnO2], etc.
  const parenRegex = /\(([^)]+)\)/g;
  let cleanText = text;
  let match;

  while ((match = parenRegex.exec(text)) !== null) {
    const content = match[1].trim();
    // Check if it looks like a condition (e.g. not a formula segment like (OH)2 or (SO4)3)
    // Formula segments inside parens always end with a number outside the parens,
    // e.g., (OH)2. If it's a standalone word or catalyst, it's a condition.
    const index = match.index;
    const afterMatch = text.slice(index + match[0].length);
    const hasTrailingSubscript = /^[0-9]+/.test(afterMatch);

    // Also, if the text is like t°, đặc, loãng, MnO2, cat, xúc tác, etc., it is definitely a condition
    const isKnownCondition =
      /t°|temp|xúc tác|xt|đặc|loãng|nóng|MnO2|H2SO4|as|ánh sáng|khí/i.test(
        content,
      );

    if (isKnownCondition || !hasTrailingSubscript) {
      conditions.push(content);
      cleanText = cleanText.replace(match[0], "");
    }
  }

  // Also clean up t-arrows like -t°->, -MnO2->
  const arrowConditionMatch = cleanText.match(/-([^-]+)->/);
  if (arrowConditionMatch) {
    conditions.push(arrowConditionMatch[1].trim());
    cleanText = cleanText.replace(arrowConditionMatch[0], "->");
  }

  // Clean trailing punctuation and spaces
  cleanText = cleanText.replace(/\s+/g, " ").trim();

  return { cleanText, conditions };
}

/**
 * Main parser that parses a reaction string into a structured equation representation
 */
export function parseEquation(rawStr: string): StructuredEquation {
  // 1. Normalize arrows
  const { normalized } = normalizeArrow(rawStr);

  // 2. Extract conditions
  const { cleanText, conditions } = extractConditions(normalized);

  // 3. Split into reactants and products
  const parts = cleanText.split("->");
  const reactantsStr = parts[0] || "";
  const productsStr = parts[1] || "";

  // Helper to split terms by '+'
  const parseSide = (sideStr: string): ChemicalComponent[] => {
    return sideStr
      .split("+")
      .map((term) => term.trim())
      .filter((term) => term.length > 0 && term !== "?")
      .map((term) => parseChemicalComponent(term));
  };

  const reactants = parseSide(reactantsStr);
  const products = parseSide(productsStr);

  // Detect if reaction is complete (contains both sides, and no "?" placeholders)
  const isComplete =
    parts.length > 1 && products.length > 0 && !productsStr.includes("?");

  return {
    reactants,
    products,
    conditions,
    isComplete,
  };
}

/**
 * Formats structured equation back to a clean string representation
 */
export function formatEquation(structured: StructuredEquation): string {
  const formatSide = (side: ChemicalComponent[]): string => {
    return side
      .map((comp) => {
        const coefStr = comp.coefficient > 1 ? `${comp.coefficient}` : "";
        return `${coefStr}${comp.formula}`;
      })
      .join(" + ");
  };

  const reactantsStr = formatSide(structured.reactants);
  const productsStr = formatSide(structured.products);
  const conditionStr =
    structured.conditions.length > 0
      ? ` (${structured.conditions.join(", ")})`
      : "";

  if (structured.products.length === 0) {
    return `${reactantsStr} -> ?${conditionStr}`;
  }

  return `${reactantsStr} -> ${productsStr}${conditionStr}`;
}
