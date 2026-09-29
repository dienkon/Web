import { CalculatorState } from "../types";
import { evaluateCalculatorExpression } from "./calculatorEngine";

export function verifyExpressions(
  expr1: string,
  op: "=" | "≠" | ">" | "<" | "≥" | "≤",
  expr2: string,
  state: CalculatorState
): "TRUE" | "FALSE" {
  const res1 = evaluateCalculatorExpression(expr1, state);
  const res2 = evaluateCalculatorExpression(expr2, state);

  const val1 = res1.numericValue !== undefined ? res1.numericValue : parseFloat(res1.decimal);
  const val2 = res2.numericValue !== undefined ? res2.numericValue : parseFloat(res2.decimal);

  if (isNaN(val1) || isNaN(val2)) return "FALSE";

  const diff = val1 - val2;
  const tol = 1e-9;

  switch (op) {
    case "=":
      return Math.abs(diff) < tol ? "TRUE" : "FALSE";
    case "≠":
      return Math.abs(diff) >= tol ? "TRUE" : "FALSE";
    case ">":
      return diff > tol ? "TRUE" : "FALSE";
    case "<":
      return diff < -tol ? "TRUE" : "FALSE";
    case "≥":
      return diff >= -tol ? "TRUE" : "FALSE";
    case "≤":
      return diff <= tol ? "TRUE" : "FALSE";
    default:
      return "FALSE";
  }
}
