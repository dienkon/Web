import { ComputeEngine } from "@cortex-js/compute-engine";
import { CalculatorState } from "../types";
import { normalizeCalculatorLatex } from "./expressionNormalizer";
import { formatCalculatorResult, FormattedResult } from "./resultFormatter";

// Singleton ComputeEngine instance
let globalComputeEngine: ComputeEngine | null = null;

export function getComputeEngine(): ComputeEngine {
  if (!globalComputeEngine) {
    globalComputeEngine = new ComputeEngine();
  }
  return globalComputeEngine;
}

export interface EngineEvaluationResult {
  exact: string;
  decimal: string;
  display: string;
  numericValue?: number;
  isError: boolean;
  errorMessage?: string;
}

/**
 * Evaluates a mathematical LaTeX expression safely using ComputeEngine
 * without eval() or new Function().
 */
export function evaluateCalculatorExpression(
  rawLatex: string,
  state: CalculatorState
): EngineEvaluationResult {
  if (!rawLatex || !rawLatex.trim()) {
    return {
      exact: "",
      decimal: "",
      display: "",
      isError: false,
    };
  }

  try {
    const ce = getComputeEngine();
    const normalizedLatex = normalizeCalculatorLatex(rawLatex, state);

    if (!normalizedLatex) {
      return { exact: "", decimal: "", display: "", isError: false };
    }

    const expr = ce.parse(normalizedLatex);
    if (!expr || expr.has("Nothing") || expr.has("Missing")) {
      return {
        exact: "Syntax ERROR",
        decimal: "Syntax ERROR",
        display: "Syntax ERROR",
        isError: true,
        errorMessage: "Syntax ERROR",
      };
    }

    // Evaluate exact symbolic expression
    const evaluated = expr.evaluate();
    let exactLatex = evaluated.latex;

    // Check for calculation errors / undefined / infinite / NaN
    if (
      !exactLatex ||
      exactLatex === "\\mathrm{Undefined}" ||
      exactLatex === "Undefined" ||
      exactLatex === "\\mathrm{NaN}" ||
      exactLatex === "NaN"
    ) {
      return {
        exact: "Math ERROR",
        decimal: "Math ERROR",
        display: "Math ERROR",
        isError: true,
        errorMessage: "Math ERROR",
      };
    }

    if (exactLatex.includes("\\infty") || exactLatex.includes("Infinity")) {
      return {
        exact: "Math ERROR",
        decimal: "Math ERROR",
        display: "Math ERROR",
        isError: true,
        errorMessage: "Math ERROR (Division by zero)",
      };
    }

    // Evaluate numeric approximation
    const numExpr = evaluated.N();
    let numericValue: number | undefined;
    if (typeof (numExpr as any).toNumericValue === "function") {
      const nv = (numExpr as any).toNumericValue();
      if (typeof nv === "number" && !isNaN(nv)) numericValue = nv;
    }
    if (numericValue === undefined && typeof (numExpr as any).numericValue !== "undefined") {
      const nv = Number((numExpr as any).numericValue);
      if (!isNaN(nv) && isFinite(nv)) numericValue = nv;
    }
    if (numericValue === undefined && numExpr.latex) {
      const parsed = parseFloat(numExpr.latex);
      if (!isNaN(parsed) && isFinite(parsed)) numericValue = parsed;
    }

    // Clean up imaginary symbol notation for Casio display: \imaginaryI -> i
    exactLatex = exactLatex.replace(/\\imaginaryI/g, "i");

    const formatted: FormattedResult = formatCalculatorResult(exactLatex, numericValue, state);

    return {
      exact: formatted.exact,
      decimal: formatted.decimal,
      display: formatted.display,
      numericValue,
      isError: formatted.isError,
    };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    if (errMessage.toLowerCase().includes("syntax") || errMessage.toLowerCase().includes("parse")) {
      return {
        exact: "Syntax ERROR",
        decimal: "Syntax ERROR",
        display: "Syntax ERROR",
        isError: true,
        errorMessage: "Syntax ERROR",
      };
    }
    return {
      exact: "Math ERROR",
      decimal: "Math ERROR",
      display: "Math ERROR",
      isError: true,
      errorMessage: "Math ERROR",
    };
  }
}
