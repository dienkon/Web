/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KNOWN_ELEMENTS, parseFormula } from "./chemParser";

// Common chemical groups/anions and their usual valences to help scoring and template matching
const COMMON_ANIONS = [
  "SO4",
  "CO3",
  "NO3",
  "PO4",
  "OH",
  "Cl",
  "O",
  "S",
  "Br",
  "I",
  "HCO3",
  "HSO4",
  "SO3",
];
const COMMON_CATIONS = [
  "H",
  "Na",
  "K",
  "Ca",
  "Mg",
  "Al",
  "Fe",
  "Cu",
  "Zn",
  "Ag",
  "Ba",
  "NH4",
];

// Map of common OCR corruptions to potential repairs
const CHARACTER_REPAIR_MAP: { [key: string]: string[] } = {
  "»": ["2", "3", "4"],
  ",": ["2", "3"],
  s3: ["3"],
  s4: ["4"],
  s: ["2", "3", "5"], // CaCOs3 -> CaCO3, H2SO4 -> H2SO4
  o: ["O"],
  I: ["l", "1"], // KCI -> KCl
  i: ["l"],
  S04: ["SO4"],
  C03: ["CO3"],
  N03: ["NO3"],
  H20: ["H2O"],
  h2o: ["H2O"],
};

/**
 * Checks if a formula is chemically valid (all its element symbols are valid)
 */
export function validateFormulaElements(formula: string): {
  isValid: boolean;
  invalidElements: string[];
} {
  const elements = parseFormula(formula);
  const invalidElements: string[] = [];

  for (const element of Object.keys(elements)) {
    if (!KNOWN_ELEMENTS.has(element)) {
      invalidElements.push(element);
    }
  }

  return {
    isValid: invalidElements.length === 0,
    invalidElements,
  };
}

/**
 * Calculates a chemical validity score for a formula. Higher is better.
 */
export function scoreFormula(formula: string): number {
  if (!formula || formula === "?") return 100; // placeholder is acceptable

  let score = 0;

  // 1. Element validation: Deduct heavily if it contains unknown elements
  const { isValid, invalidElements } = validateFormulaElements(formula);
  if (!isValid) {
    score -= 50 * invalidElements.length;
  } else {
    score += 30; // All elements are known
  }

  // 2. Case checking: Element symbols must start with uppercase
  // If we have fully lowercase elements like "ca", "cl", "co2", score is low
  if (/^[a-z]+/.test(formula)) {
    score -= 30;
  }

  // 3. Known chemical patterns (e.g. ends with common anions, starts with common cations)
  let matchesCommonAnion = false;
  for (const anion of COMMON_ANIONS) {
    if (formula.endsWith(anion) || formula.includes(anion)) {
      score += 25;
      matchesCommonAnion = true;
      break;
    }
  }

  let matchesCommonCation = false;
  for (const cation of COMMON_CATIONS) {
    if (formula.startsWith(cation)) {
      score += 15;
      matchesCommonCation = true;
      break;
    }
  }

  // Specific common full formulas
  const commonFormulas = [
    "H2O",
    "CO2",
    "HCl",
    "HNO3",
    "H2SO4",
    "NaOH",
    "KOH",
    "Ca(OH)2",
    "CaCO3",
    "NaCl",
    "KCl",
  ];
  if (commonFormulas.includes(formula)) {
    score += 50;
  }

  // Deduct for very weird patterns (e.g., multiple lowercase letters in a row within an element symbol, e.g. Caaa)
  if (/[A-Z][a-z]{2,}/.test(formula)) {
    score -= 20;
  }

  // Subscripts check: a formula shouldn't start with numbers (handled by parser, but good for formula string check)
  if (/^[0-9]/.test(formula)) {
    score -= 20;
  }

  return score;
}

/**
 * Auto-corrects lowercase formulas to correct chemical casings
 * e.g., "h2o" -> "H2O", "caco3" -> "CaCO3", "kci" -> "KCl"
 */
export function repairCasing(term: string): string {
  let repaired = term;

  // Standard list of case repairs
  const caseMap: { [lower: string]: string } = {
    h2o: "H2O",
    co2: "CO2",
    hcl: "HCl",
    h2so4: "H2SO4",
    caco3: "CaCO3",
    nacl: "NaCl",
    kcl: "KCl",
    naoh: "NaOH",
    koh: "KOH",
    "ca(oh)2": "Ca(OH)2",
    hno3: "HNO3",
    cuo: "CuO",
    fe2o3: "Fe2O3",
    fe3o4: "Fe3O4",
    al2o3: "Al2O3",
    mgcl2: "MgCl2",
    cacl2: "CaCl2",
    baso4: "BaSO4",
    agno3: "AgNO3",
    zncl2: "ZnCl2",
    cuso4: "CuSO4",
    o2: "O2",
    h2: "H2",
    cl2: "Cl2",
    n2: "N2",
    co: "CO",
  };

  const lower = term.toLowerCase().trim();
  if (caseMap[lower]) {
    return caseMap[lower];
  }

  // Attempt smart element casing repair
  // e.g., "cacl" -> "CaCl", "h2co3" -> "H2CO3"
  // Let's find matches of elements like ca -> Ca, cl -> Cl, o -> O, h -> H, s -> S
  const elementCasings: { [key: string]: string } = {
    na: "Na",
    cl: "Cl",
    ca: "Ca",
    fe: "Fe",
    cu: "Cu",
    zn: "Zn",
    al: "Al",
    mg: "Mg",
    ba: "Ba",
    ag: "Ag",
    h: "H",
    o: "O",
    c: "C",
    n: "N",
    p: "P",
    s: "S",
    k: "K",
    i: "I",
  };

  // Regular expression to tokenise formula parts (letters, numbers, brackets)
  const tokens = term.match(/([a-zA-Z]+|[0-9]+|\(|\)|\[|\]|\{|\})/g) || [];
  let casingSuccess = true;

  const repairedTokens = tokens.map((token) => {
    if (/^[a-zA-Z]+$/.test(token)) {
      // It's a chemical cluster, try to parse it into elements
      let i = 0;
      let clusterRepaired = "";
      while (i < token.length) {
        // Try to match a 2-letter element
        const twoLetter = token.slice(i, i + 2).toLowerCase();
        if (elementCasings[twoLetter]) {
          clusterRepaired += elementCasings[twoLetter];
          i += 2;
        } else {
          // Try 1-letter
          const oneLetter = token[i].toLowerCase();
          if (elementCasings[oneLetter]) {
            clusterRepaired += elementCasings[oneLetter];
            i++;
          } else {
            // Cannot repair, keep raw
            clusterRepaired += token[i];
            i++;
            casingSuccess = false;
          }
        }
      }
      return clusterRepaired;
    }
    return token;
  });

  return casingSuccess ? repairedTokens.join("") : term;
}

/**
 * Generates repair candidates for a single formula term (e.g., "CaCl," -> ["CaCl2", "CaCl3"])
 */
export function generateCandidates(term: string): string[] {
  const candidates: Set<string> = new Set();
  candidates.add(term);

  // 1. Try case repairs
  const cased = repairCasing(term);
  candidates.add(cased);

  // 2. Perform character substitutions
  // We scan the term and replace matches of characters like » or s3
  for (const [corrupted, replacements] of Object.entries(
    CHARACTER_REPAIR_MAP,
  )) {
    if (term.includes(corrupted)) {
      for (const replacement of replacements) {
        // Replace all occurrences of corrupted string
        const replaced = term.split(corrupted).join(replacement);
        candidates.add(replaced);
        candidates.add(repairCasing(replaced));
      }
    }

    // Also check case-insensitive matches for the key
    const lowerTerm = term.toLowerCase();
    const lowerKey = corrupted.toLowerCase();
    if (lowerTerm.includes(lowerKey)) {
      for (const replacement of replacements) {
        // Find index and replace
        const index = lowerTerm.indexOf(lowerKey);
        const replaced =
          term.substring(0, index) +
          replacement +
          term.substring(index + corrupted.length);
        candidates.add(replaced);
        candidates.add(repairCasing(replaced));
      }
    }
  }

  // 3. Handle suffix-specific errors like "CaCl," -> "CaCl2", "K»CO3" -> "K2CO3"
  // Common tail replacements
  if (term.endsWith(",")) {
    candidates.add(term.slice(0, -1) + "2");
    candidates.add(repairCasing(term.slice(0, -1) + "2"));
    candidates.add(term.slice(0, -1) + "3");
    candidates.add(repairCasing(term.slice(0, -1) + "3"));
  }
  if (term.endsWith("s3")) {
    candidates.add(term.slice(0, -2) + "3");
    candidates.add(repairCasing(term.slice(0, -2) + "3"));
  }
  if (term.endsWith("s")) {
    candidates.add(term.slice(0, -1) + "2");
    candidates.add(term.slice(0, -1) + "3");
    candidates.add(repairCasing(term.slice(0, -1) + "2"));
  }

  // 4. Special word repairs: "KCI" -> "KCl"
  if (term.includes("KCI")) {
    candidates.add(term.replace("KCI", "KCl"));
  }
  if (term.includes("NaCI")) {
    candidates.add(term.replace("NaCI", "NaCl"));
  }

  return Array.from(candidates);
}

/**
 * Repairs a single chemical component term and returns the best scored candidate
 */
export function repairComponent(term: string): {
  best: string;
  candidates: { text: string; score: number }[];
} {
  const cleanTerm = term.trim();

  // Extract coefficient if exists, so we score only the formula segment
  // e.g. "2CaCl," -> coefficient "2", formula "CaCl,"
  const match = cleanTerm.match(/^([0-9]+)\s*(.*)$/);
  const coefficient = match ? match[1] : "";
  const formula = match ? match[2] : cleanTerm;

  const rawCandidates = generateCandidates(formula);
  const scored = rawCandidates.map((cand) => {
    return {
      text: cand,
      score: scoreFormula(cand),
    };
  });

  // Sort in descending order of score
  scored.sort((a, b) => b.score - a.score);

  const bestFormula = scored[0].text;
  const bestFull = `${coefficient}${bestFormula}`;

  const fullScored = scored.map((s) => ({
    text: `${coefficient}${s.text}`,
    score: s.score,
  }));

  return {
    best: bestFull,
    candidates: fullScored,
  };
}

/**
 * Repairs a full chemical equation string by repairing each reactant and product independently.
 */
export function repairEquationString(
  rawEquation: string,
  corrections: string[] = [],
): { repaired: string; logs: string[] } {
  const logs: string[] = [];

  // First normalize spaces and arrows
  // Normalise common arrow formats
  let normalized = rawEquation
    .replace(/\s+/g, " ")
    .replace(/—>|=>|-->|→|⇌|=/g, " -> ")
    .replace(/\s*->\s*/g, " -> ")
    .replace(/\s*\+\s*/g, " + ");

  logs.push(`Chuẩn hóa khoảng trắng và mũi tên: "${normalized}"`);

  const parts = normalized.split("->");
  const reactantsStr = parts[0] || "";
  const productsStr = parts[1] || "";

  const repairSide = (sideStr: string, sideName: string): string => {
    const terms = sideStr
      .split("+")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const repairedTerms = terms.map((term) => {
      const { best, candidates } = repairComponent(term);
      if (best !== term) {
        logs.push(
          `Sửa lỗi OCR cho ${sideName}: "${term}" -> "${best}" (Độ tin cậy: ${candidates[0].score})`,
        );
        corrections.push(`Thay thế ${term} bằng ${best}`);
      }
      return best;
    });
    return repairedTerms.join(" + ");
  };

  const repairedReactants = repairSide(reactantsStr, "chất tham gia");
  const repairedProducts = productsStr
    ? repairSide(productsStr, "chất sản phẩm")
    : "";

  let result = repairedReactants;
  if (parts.length > 1) {
    result += " -> " + (repairedProducts || "?");
  }

  logs.push(`Kết quả sửa lỗi cục bộ: "${result}"`);
  return {
    repaired: result,
    logs,
  };
}
