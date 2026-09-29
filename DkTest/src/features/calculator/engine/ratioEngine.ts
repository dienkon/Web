import { normalizeNumber } from "./resultFormatter";

export function solveRatio(
  type: 1 | 2, // 1: A:B = X:D; 2: A:B = C:X
  a: number,
  b: number,
  other: number // if type 1: D; if type 2: C
): number {
  if (type === 1) {
    // A : B = X : D => X = (A * D) / B
    if (b === 0) throw new Error("Math ERROR (Division by zero)");
    return normalizeNumber((a * other) / b);
  } else {
    // A : B = C : X => X = (B * C) / A
    if (a === 0) throw new Error("Math ERROR (Division by zero)");
    return normalizeNumber((b * other) / a);
  }
}
