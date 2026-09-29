import { CalculatorState } from "../types";

export interface FormattedResult {
  display: string;
  exact: string;
  decimal: string;
  isError: boolean;
}

/**
 * Normalizes floating point numbers to avoid precision anomalies (e.g. 0.49999999999999994 -> 0.5)
 */
export function normalizeNumber(val: number): number {
  if (isNaN(val) || !isFinite(val)) return val;
  // Round to 12 significant figures to eliminate IEEE-754 precision artifacts
  return Number(val.toPrecision(12));
}

/**
 * Formats a decimal number according to the active Calculator display mode (Norm, Fix, Sci)
 */
export function formatDecimalValue(
  val: number,
  displayMode: "Norm" | "Fix" | "Sci" = "Norm",
  fixDigits = 3,
  sciDigits = 3
): string {
  if (isNaN(val) || !isFinite(val)) return "Math ERROR";
  const num = normalizeNumber(val);

  if (displayMode === "Fix") {
    return num.toFixed(fixDigits);
  }
  if (displayMode === "Sci") {
    const expStr = num.toExponential(sciDigits);
    const [base, exp] = expStr.split("e");
    const expVal = parseInt(exp, 10);
    return `${base} \\times 10^{${expVal}}`;
  }

  // Norm mode: standard ClassWiz behavior
  if (Math.abs(num) > 0 && (Math.abs(num) >= 1e10 || Math.abs(num) < 1e-3)) {
    const expStr = num.toExponential(9);
    const [base, exp] = expStr.split("e");
    const cleanBase = parseFloat(base).toString();
    const expVal = parseInt(exp, 10);
    return `${cleanBase} \\times 10^{${expVal}}`;
  }

  return num.toString();
}

/**
 * Formats the final calculator result taking into account:
 * - exact LaTeX output from ComputeEngine (MathO)
 * - decimal evaluation (DecimalO)
 * - S<=>D toggle state (isDecimalView)
 * - Norm, Fix, Sci configuration
 */
export function formatCalculatorResult(
  exactLatex: string,
  numericValue: number | undefined,
  state: Pick<CalculatorState, "displayMode" | "inputMode" | "displayFixDigits" | "displaySciDigits" | "isDecimalView">
): FormattedResult {
  if (exactLatex === "Math ERROR" || exactLatex === "Syntax ERROR" || exactLatex === "Domain ERROR") {
    return {
      display: exactLatex,
      exact: exactLatex,
      decimal: exactLatex,
      isError: true,
    };
  }

  const fixDigits = state.displayFixDigits ?? 3;
  const sciDigits = state.displaySciDigits ?? 3;
  const numVal = numericValue !== undefined ? normalizeNumber(numericValue) : parseFloat(exactLatex);

  let decimalStr = !isNaN(numVal)
    ? formatDecimalValue(numVal, state.displayMode, fixDigits, sciDigits)
    : exactLatex;

  let exactStr = exactLatex;
  // If exact output is a pure number, apply formatting to it as well
  if (!isNaN(Number(exactLatex))) {
    exactStr = formatDecimalValue(Number(exactLatex), state.displayMode, fixDigits, sciDigits);
  }

  // Determine what is displayed on the LCD:
  // If MathI/DecimalO or isDecimalView is true, show decimal; otherwise show exact (MathO)
  const isDecimalPreferred =
    state.isDecimalView ||
    state.inputMode === "MathI/DecimalO" ||
    state.inputMode === "LineI/LineO";

  const display = isDecimalPreferred ? decimalStr : (exactStr || decimalStr);

  return {
    display,
    exact: exactStr,
    decimal: decimalStr,
    isError: false,
  };
}
