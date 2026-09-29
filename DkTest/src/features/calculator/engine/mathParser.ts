import { CalculatorState } from "../types";
import { evaluateCalculatorExpression } from "./calculatorEngine";
import {
  solveQuadratic as solveQuad,
  solveCubic as solveCub,
  solveNumericalEquation,
} from "./solver";

/**
 * Backward compatibility adapter for evaluateExpression.
 * Delegates directly to the unified calculatorEngine.
 */
export function evaluateExpression(expr: string, state: CalculatorState): string {
  const result = evaluateCalculatorExpression(expr, state);
  return result.display || "0";
}

/**
 * Backward compatibility adapter for solveEquation.
 * Delegates directly to the unified solver.
 */
export function solveEquation(equation: string, state: CalculatorState): string {
  const res = solveNumericalEquation(equation, state);
  if (res.error) return res.error;
  if (res.solution !== undefined) return `x = ${res.solution}`;
  return "Cannot SOLVE";
}

/**
 * Backward compatibility re-export of analytical quadratic solver.
 */
export function solveQuadratic(a: number, b: number, c: number): string[] {
  return solveQuad(a, b, c);
}

/**
 * Backward compatibility re-export of cubic solver.
 */
export function solveCubic(a: number, b: number, c: number, d_coeff: number): string[] {
  return solveCub(a, b, c, d_coeff);
}
