import { CalculatorState } from "../types";

/**
 * Normalizes user-entered LaTeX from MathLive into a canonical LaTeX form
 * ready for safe, exact evaluation by ComputeEngine and math engines.
 */
export function normalizeCalculatorLatex(
  latex: string,
  state: Pick<CalculatorState, "angleUnit" | "variables" | "memoryM" | "lastAns" | "preAns">
): string {
  let clean = latex.trim();
  if (!clean) return "";

  // 1. Remove unfilled MathLive placeholders
  clean = clean.replace(/\\placeholder\{[^}]*\}/g, "");
  clean = clean.replace(/#\?/g, "");

  // 2. Normalize Unicode symbols
  clean = clean.replace(/−/g, "-");
  clean = clean.replace(/÷/g, "\\div");
  clean = clean.replace(/×/g, "\\times");

  // 3. Implicit multiplication
  clean = clean.replace(/(\d+)\s*\(/g, "$1 \\cdot (");
  clean = clean.replace(/\)\s*\(/g, ") \\cdot (");
  clean = clean.replace(/\)\s*(\d+)/g, ") \\cdot $1");
  clean = clean.replace(/(\d+)\s*\\left\(/g, "$1 \\cdot \\left(");
  clean = clean.replace(/\\right\)\s*\\left\(/g, "\\right) \\cdot \\left(");
  clean = clean.replace(/\\right\)\s*(\d+)/g, "\\right) \\cdot $1");
  // Digit or closing paren before single variable
  clean = clean.replace(/(\d+)\s*([A-Fa-fXxYyZzMm])(?![a-zA-Z])/g, "$1 \\cdot $2");
  clean = clean.replace(/\)\s*([A-Fa-fXxYyZzMm])(?![a-zA-Z])/g, ") \\cdot $1");
  clean = clean.replace(/\\right\)\s*([A-Fa-fXxYyZzMm])(?![a-zA-Z])/g, "\\right) \\cdot $1");
  // Adjacent single variables: AX -> A \cdot X
  for (let i = 0; i < 2; i++) {
    clean = clean.replace(
      /(\\[a-zA-Z]+)|([A-Fa-fXxYyZzMm])\s*([A-Fa-fXxYyZzMm])/g,
      (match, cmd, v1, v2) => {
        if (cmd) return cmd;
        if (v1 && v2) return `${v1} \\cdot ${v2}`;
        return match;
      }
    );
  }

  // 4. Replace Ans and PreAns tokens
  const lastAnsVal = state.lastAns && state.lastAns !== "Math ERROR" ? state.lastAns : "0";
  const preAnsVal = state.preAns && state.preAns !== "Math ERROR" ? state.preAns : "0";
  clean = clean.replace(/\\mathrm\{PreAns\}|PreAns/g, `(${preAnsVal})`);
  clean = clean.replace(/\\mathrm\{Ans\}|Ans/g, `(${lastAnsVal})`);

  // 5. Substitute variables (A, B, C, D, E, F, X, Y, Z, M)
  const varMap: Record<string, number> = {};
  if (state.variables) {
    for (const [k, v] of Object.entries(state.variables)) {
      if (v !== undefined && !isNaN(v)) {
        varMap[k.toUpperCase()] = v;
      }
    }
  }
  if (state.memoryM !== undefined && !isNaN(state.memoryM)) {
    varMap["M"] = state.memoryM;
  }

  // Replace variables while preserving LaTeX commands
  clean = clean.replace(/(\\[a-zA-Z]+)|([A-Fa-fXxYyZzMm])/g, (match, cmd, letter) => {
    if (cmd) return cmd;
    if (letter) {
      const upper = letter.toUpperCase();
      if (varMap[upper] !== undefined) {
        return `(${varMap[upper]})`;
      }
    }
    return match;
  });

  // Re-run implicit multiplication for adjacent substituted parentheses (e.g. (1)(2) -> (1) \cdot (2))
  clean = clean.replace(/\)\s*\(/g, ") \\cdot (");
  clean = clean.replace(/\\right\)\s*\\left\(/g, "\\right) \\cdot \\left(");
  clean = clean.replace(/\)\s*([A-Fa-fXxYyZzMm])(?![a-zA-Z])/g, ") \\cdot $1");

  // 5. Combinations (nCr) and Permutations (nPr)
  // E.g.: "5 \text{ nCr } 2", "5\text{nCr}2", "5 nCr 2" -> \binom{5}{2}
  clean = clean.replace(
    /(\d+|\([^)]+\))\s*(?:\\text\{\s*nCr\s*\}|\\text\{nCr\}|nCr)\s*(\d+|\([^)]+\))/gi,
    "\\binom{$1}{$2}"
  );

  // E.g.: "5 \text{ nPr } 2", "5 nPr 2" -> \frac{(5)!}{((5)-(2))!}
  clean = clean.replace(
    /(\d+|\([^)]+\))\s*(?:\\text\{\s*nPr\s*\}|\\text\{nPr\}|nPr)\s*(\d+|\([^)]+\))/gi,
    "\\frac{($1)!}{(($1)-($2))!}"
  );

  // 6. Handle percentages: e.g. 50\% or 50% -> \left(\frac{50}{100}\right)
  clean = clean.replace(/(\d+(?:\.\d+)?)\s*(?:\\%|%)/g, "\\left(\\frac{$1}{100}\\right)");

  // 7. Handle Angle Unit for Trigonometry
  const { angleUnit } = state;
  if (angleUnit === "DEG") {
    // Forward trig: sin, cos, tan -> sin(arg^\circ) if not already marked with degree
    clean = clean.replace(
      /\\(sin|cos|tan)\s*\(([^)^\circ]+)\)/g,
      "\\$1($2^\\circ)"
    );
    clean = clean.replace(
      /\\(sin|cos|tan)\s*\\left\(([^)^\circ]+)\\right\)/g,
      "\\$1\\left($2^\\circ\\right)"
    );

    // Inverse trig: arcsin, arccos, arctan -> (\arcsin(arg) * 180 / \pi)
    clean = clean.replace(
      /\\(arcsin|arccos|arctan)\s*\(([^)]+)\)/g,
      "\\left(\\$1($2) \\times \\frac{180}{\\pi}\\right)"
    );
    clean = clean.replace(
      /\\(arcsin|arccos|arctan)\s*\\left\(([^)]+)\\right\)/g,
      "\\left(\\$1\\left($2\\right) \\times \\frac{180}{\\pi}\\right)"
    );
  } else if (angleUnit === "GRAD") {
    clean = clean.replace(
      /\\(sin|cos|tan)\s*\(([^)]+)\)/g,
      "\\$1(($2) \\times \\frac{\\pi}{200})"
    );
    clean = clean.replace(
      /\\(sin|cos|tan)\s*\\left\(([^)]+)\\right\)/g,
      "\\$1\\left(($2) \\times \\frac{\\pi}{200}\\right)"
    );

    clean = clean.replace(
      /\\(arcsin|arccos|arctan)\s*\(([^)]+)\)/g,
      "\\left(\\$1($2) \\times \\frac{200}{\\pi}\\right)"
    );
    clean = clean.replace(
      /\\(arcsin|arccos|arctan)\s*\\left\(([^)]+)\\right\)/g,
      "\\left(\\$1\\left($2\\right) \\times \\frac{200}{\\pi}\\right)"
    );
  }

  // 8. Balance missing closing parentheses at end of line (like Casio calculators)
  let openParen = 0;
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === "(") openParen++;
    if (clean[i] === ")") openParen--;
  }
  if (openParen > 0) {
    clean += ")".repeat(openParen);
  }

  return clean;
}
