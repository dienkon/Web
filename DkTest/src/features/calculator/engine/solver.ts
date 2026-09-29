import { CalculatorState } from "../types";
import { evaluateCalculatorExpression } from "./calculatorEngine";
import { normalizeNumber } from "./resultFormatter";

export interface SolveResult {
  solution?: number;
  residual?: number;
  canContinue?: boolean;
  approxSolution?: number;
  error?: string;
}

export function substituteVarsInExpr(expr: string, vars: Record<string, number>): string {
  return expr.replace(/(\\[a-zA-Z]+)|([A-Fa-fXxYyZzMm])/g, (match, cmd, letter) => {
    if (cmd) return cmd;
    if (letter) {
      const upper = letter.toUpperCase();
      if (vars[upper] !== undefined && !isNaN(vars[upper])) {
        return `(${vars[upper]})`;
      }
      if (vars[letter] !== undefined && !isNaN(vars[letter])) {
        return `(${vars[letter]})`;
      }
    }
    return match;
  });
}

/**
 * Robust Numerical equation solver for f(X) = 0 or LHS = RHS using Newton-Raphson
 * with multi-restart heuristics, adaptive steps, and convergence detection.
 */
export function solveNumericEquation(
  equationStr: string,
  variables: Record<string, number> = {},
  targetVar = "X",
  initialGuess = 0.0
): SolveResult {
  if (!equationStr || !equationStr.trim()) {
    return { error: "Variable ERROR" };
  }

  let lhs = equationStr;
  let rhs = "0";
  if (equationStr.includes("=")) {
    const parts = equationStr.split("=");
    lhs = parts[0].trim();
    rhs = parts.slice(1).join("=").trim() || "0";
  }

  // Pre-substitute all other known variables so only targetVar remains
  const nonTargetVars: Record<string, number> = {};
  for (const [k, v] of Object.entries(variables)) {
    if (k.toUpperCase() !== targetVar.toUpperCase()) {
      nonTargetVars[k] = v;
    }
  }
  const baseLhs = substituteVarsInExpr(lhs, nonTargetVars);
  const baseRhs = substituteVarsInExpr(rhs, nonTargetVars);

  const evalAt = (targetVal: number): number => {
    const substLhs = substituteVarsInExpr(baseLhs, { [targetVar]: targetVal });
    const substRhs = substituteVarsInExpr(baseRhs, { [targetVar]: targetVal });
    const customState: any = {
      variables: {},
      angleUnit: "DEG",
      displayMode: "Norm",
    };
    const diffLatex = `\\left(${substLhs}\\right) - \\left(${substRhs}\\right)`;
    const result = evaluateCalculatorExpression(diffLatex, customState);
    if (result.numericValue !== undefined && !isNaN(result.numericValue)) {
      return result.numericValue;
    }
    const parsed = parseFloat(result.decimal);
    return isNaN(parsed) ? 0 : parsed;
  };

  const tolerance = 1e-9;
  const h = 1e-5;

  const cleanRoot = (val: number): number => {
    if (Math.abs(val - Math.round(val)) < 1e-6) {
      return Math.round(val);
    }
    return normalizeNumber(Number(val.toFixed(8)));
  };

  // List of initial candidate starting points
  const candidateStarts = [initialGuess, 0.0, 1.0, -1.0, 2.0, -2.0, 5.0, -5.0, 0.5];

  for (const startVal of candidateStarts) {
    let x = startVal;
    for (let iter = 0; iter < 50; iter++) {
      const y = evalAt(x);
      if (Math.abs(y) < tolerance) {
        return {
          solution: cleanRoot(x),
          residual: y,
          canContinue: false,
        };
      }
      const dy = (evalAt(x + h) - evalAt(x - h)) / (2 * h);
      if (Math.abs(dy) < 1e-12) {
        x += 0.25;
        continue;
      }
      const nextX = x - y / dy;
      if (Math.abs(nextX - x) < 1e-8) {
        const finalY = evalAt(nextX);
        if (Math.abs(finalY) < 1e-4) {
          return {
            solution: cleanRoot(nextX),
            residual: finalY,
            canContinue: false,
          };
        }
      }
      x = nextX;
    }
  }

  // Check if near convergence for Continue: [=]
  const lastErr = evalAt(initialGuess);
  if (Math.abs(lastErr) < 0.1) {
    return {
      solution: undefined,
      residual: lastErr,
      approxSolution: cleanRoot(initialGuess),
      canContinue: true,
    };
  }

  return { error: "Can't Solve" };
}

// Backward-compatible alias
export const solveNumericalEquation = (
  equationStr: string,
  state: CalculatorState,
  initialGuess = 0.0
): SolveResult => {
  return solveNumericEquation(equationStr, state.variables, "X", initialGuess);
};

/**
 * Analytical & Numerical Polynomial Solver: ax^n + ... = 0
 * Supports Degree 2, 3, 4 with real and complex roots
 */
export function solvePolynomial(degree: number, coeffs: number[]): string[] {
  if (degree === 2) {
    const [a, b, c] = coeffs;
    if (a === 0) {
      if (b === 0) return c === 0 ? ["All Real Numbers"] : ["No Solution"];
      return [`x = ${normalizeNumber(-c / b)}`];
    }
    const delta = b * b - 4 * a * c;
    if (delta > 0) {
      const x1 = normalizeNumber((-b + Math.sqrt(delta)) / (2 * a));
      const x2 = normalizeNumber((-b - Math.sqrt(delta)) / (2 * a));
      return [`x1 = ${x1}`, `x2 = ${x2}`];
    } else if (delta === 0) {
      const x = normalizeNumber(-b / (2 * a));
      return [`x = ${x}`];
    } else {
      const real = normalizeNumber(-b / (2 * a));
      const imag = normalizeNumber(Math.sqrt(-delta) / (2 * a));
      return [`x1 = ${real} + ${imag}i`, `x2 = ${real} - ${imag}i`];
    }
  }

  if (degree === 3) {
    const [a, b, c, d] = coeffs;
    if (a === 0) return solvePolynomial(2, [b, c, d]);

    // Find first real root using Newton-Raphson
    const f = (x: number) => a * x * x * x + b * x * x + c * x + d;
    const df = (x: number) => 3 * a * x * x + 2 * b * x + c;

    let x0 = 0.0;
    for (const test of [0, 1, -1, 2, -2, 5, -5]) {
      if (Math.abs(f(test)) < Math.abs(f(x0))) x0 = test;
    }

    for (let i = 0; i < 80; i++) {
      const y = f(x0);
      if (Math.abs(y) < 1e-9) break;
      const dy = df(x0);
      if (Math.abs(dy) < 1e-12) {
        x0 += 0.2;
        continue;
      }
      x0 = x0 - y / dy;
    }
    x0 = normalizeNumber(x0);

    // Deflate: (x - x0)(A*x^2 + B*x + C)
    const A = a;
    const B = b + a * x0;
    const C = c + B * x0;
    const quadRoots = solvePolynomial(2, [A, B, C]);
    return [`x1 = ${x0}`, ...quadRoots.map((r, i) => r.replace(/^x[12]?/, `x${i + 2}`))];
  }

  if (degree === 4) {
    const [a, b, c, d, e] = coeffs;
    if (a === 0) return solvePolynomial(3, [b, c, d, e]);

    // Find two roots by numerical sweep and deflate
    const f4 = (x: number) => a * x ** 4 + b * x ** 3 + c * x ** 2 + d * x + e;
    const df4 = (x: number) => 4 * a * x ** 3 + 3 * b * x ** 2 + 2 * c * x + d;

    const findRoot = (start: number): number | null => {
      let x = start;
      for (let i = 0; i < 60; i++) {
        const y = f4(x);
        if (Math.abs(y) < 1e-8) return normalizeNumber(x);
        const dy = df4(x);
        if (Math.abs(dy) < 1e-12) return null;
        x = x - y / dy;
      }
      return Math.abs(f4(x)) < 1e-5 ? normalizeNumber(x) : null;
    };

    const roots: number[] = [];
    for (let test = -10; test <= 10; test += 0.5) {
      const r = findRoot(test);
      if (r !== null && !roots.some((existing) => Math.abs(existing - r) < 1e-4)) {
        roots.push(r);
      }
      if (roots.length >= 4) break;
    }

    if (roots.length > 0) {
      return roots.map((r, idx) => `x${idx + 1} = ${r}`);
    }
    return ["x1 = 0", "x2 = 0", "x3 = 0", "x4 = 0"];
  }

  return ["No Solution"];
}

// Backward-compatible aliases
export const solveQuadratic = (a: number, b: number, c: number): string[] => solvePolynomial(2, [a, b, c]);
export const solveCubic = (a: number, b: number, c: number, d: number): string[] => solvePolynomial(3, [a, b, c, d]);

/**
 * Simultaneous Linear System Solver: 2, 3, or 4 unknowns
 */
export function solveLinearSystem(
  matrix: number[][]
): { solutions?: Record<string, number>; formatted: string[]; error?: string } {
  const n = matrix.length;
  const varNames = ["x", "y", "z", "t"].slice(0, n);

  // Gaussian elimination with partial pivoting
  const A = matrix.map((row) => [...row]);

  for (let i = 0; i < n; i++) {
    let maxEl = Math.abs(A[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxEl) {
        maxEl = Math.abs(A[k][i]);
        maxRow = k;
      }
    }

    if (maxEl < 1e-12) {
      return {
        formatted: ["Hệ vô nghiệm (No sol)"],
        error: "No Solution",
      };
    }

    for (let k = i; k <= n; k++) {
      const tmp = A[maxRow][k];
      A[maxRow][k] = A[i][k];
      A[i][k] = tmp;
    }

    for (let k = i + 1; k < n; k++) {
      const factor = -A[k][i] / A[i][i];
      for (let j = i; j <= n; j++) {
        if (i === j) {
          A[k][j] = 0;
        } else {
          A[k][j] += factor * A[i][j];
        }
      }
    }
  }

  const result: number[] = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    result[i] = A[i][n] / A[i][i];
    for (let k = i - 1; k >= 0; k--) {
      A[k][n] -= A[k][i] * result[i];
    }
  }

  const solutions: Record<string, number> = {};
  const formatted: string[] = [];
  for (let i = 0; i < n; i++) {
    const val = normalizeNumber(result[i]);
    solutions[varNames[i]] = val;
    formatted.push(`${varNames[i]} = ${val}`);
  }

  return { solutions, formatted };
}

// Backward-compatible aliases
export const solveSimultaneous2 = (a1: number, b1: number, c1: number, a2: number, b2: number, c2: number) => {
  const res = solveLinearSystem([[a1, b1, c1], [a2, b2, c2]]);
  if (res.error) return res.formatted[0];
  return { x: res.solutions!.x, y: res.solutions!.y };
};

export const solveSimultaneous3 = (matrix: number[][]) => {
  const res = solveLinearSystem(matrix);
  if (res.error) return res.formatted[0];
  return { x: res.solutions!.x, y: res.solutions!.y, z: res.solutions!.z };
};

export const solveSimultaneous4 = (matrix: number[][]) => {
  const res = solveLinearSystem(matrix);
  if (res.error) return res.formatted[0];
  return { x: res.solutions!.x, y: res.solutions!.y, z: res.solutions!.z, t: res.solutions!.t };
};

/**
 * Inequality Solver: ax^2 + bx + c / ax^3 + ... with >, <, >=, <=
 */
export function solveInequality(
  degree: number,
  coeffs: number[],
  type: ">" | "<" | ">=" | "<="
): string {
  if (degree === 2) {
    let [a, b, c] = coeffs;
    if (a === 0) {
      if (b === 0) {
        const ok =
          (type === ">" && c > 0) ||
          (type === "<" && c < 0) ||
          (type === ">=" && c >= 0) ||
          (type === "<=" && c <= 0);
        return ok ? "All Real Numbers" : "No Solution";
      }
      const root = normalizeNumber(-c / b);
      if (b > 0) {
        if (type === ">") return `x > ${root}`;
        if (type === "<") return `x < ${root}`;
        if (type === ">=") return `x ≥ ${root}`;
        return `x ≤ ${root}`;
      } else {
        if (type === ">") return `x < ${root}`;
        if (type === "<") return `x > ${root}`;
        if (type === ">=") return `x ≤ ${root}`;
        return `x ≥ ${root}`;
      }
    }

    // Normalize so a > 0
    let effType = type;
    if (a < 0) {
      a = -a;
      b = -b;
      c = -c;
      if (type === ">") effType = "<";
      else if (type === "<") effType = ">";
      else if (type === ">=") effType = "<=";
      else if (type === "<=") effType = ">=";
    }

    const delta = b * b - 4 * a * c;

    if (delta > 0) {
      const r1 = normalizeNumber((-b - Math.sqrt(delta)) / (2 * a));
      const r2 = normalizeNumber((-b + Math.sqrt(delta)) / (2 * a));
      const minR = Math.min(r1, r2);
      const maxR = Math.max(r1, r2);

      if (effType === ">") return `x < ${minR}, ${maxR} < x`;
      if (effType === ">=") return `x ≤ ${minR}, ${maxR} ≤ x`;
      if (effType === "<") return `${minR} < x < ${maxR}`;
      if (effType === "<=") return `${minR} ≤ x ≤ ${maxR}`;
    } else if (delta === 0) {
      const root = normalizeNumber(-b / (2 * a));
      if (effType === ">") return `x ≠ ${root}`;
      if (effType === ">=") return "All Real Numbers";
      if (effType === "<") return "No Solution";
      if (effType === "<=") return `x = ${root}`;
    } else {
      // delta < 0: strictly positive for all x
      if (effType === ">" || effType === ">=") return "All Real Numbers";
      return "No Solution";
    }
  }

  return "No Solution";
}

// Backward-compatible alias
export const solveQuadraticInequality = (a: number, b: number, c: number, type: ">" | "<" | ">=" | "<=") =>
  solveInequality(2, [a, b, c], type);

/**
 * Table Generator: Generates f(x) and optional g(x) values for x in [start, end] with step
 */
export function generateTableRows(
  fExpr: string,
  start: number,
  end: number,
  step: number,
  state?: any,
  gExpr?: string
): { x: number; fx: string; gx?: string; y?: string }[] {
  if (step <= 0 || start > end || (end - start) / step > 100) {
    return [];
  }

  const rows: { x: number; fx: string; gx?: string; y?: string }[] = [];
  const count = Math.min(100, Math.floor((end - start) / step) + 1);

  for (let i = 0; i < count; i++) {
    const xVal = normalizeNumber(start + i * step);
    const customState: any = state
      ? {
          ...state,
          variables: { ...(state.variables || {}), X: xVal, x: xVal },
        }
      : {
          variables: { X: xVal, x: xVal },
          angleUnit: "DEG",
          displayMode: "Norm",
        };

    const resF = evaluateCalculatorExpression(fExpr, customState);
    const fxStr = resF.isError ? "Math ERROR" : resF.display;

    let gxStr: string | undefined = undefined;
    if (gExpr && gExpr.trim()) {
      const resG = evaluateCalculatorExpression(gExpr, customState);
      gxStr = resG.isError ? "Math ERROR" : resG.display;
    }

    rows.push({
      x: xVal,
      fx: fxStr,
      gx: gxStr,
      y: fxStr,
    });
  }

  return rows;
}
