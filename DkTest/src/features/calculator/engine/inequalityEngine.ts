import { normalizeNumber } from "./resultFormatter";

export function solveQuadraticInequality(
  a: number,
  b: number,
  c: number,
  type: ">" | "<" | ">=" | "<="
): string {
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
      if (type === ">=") return `x \\ge ${root}`;
      return `x \\le ${root}`;
    } else {
      if (type === ">") return `x < ${root}`;
      if (type === "<") return `x > ${root}`;
      if (type === ">=") return `x \\le ${root}`;
      return `x \\ge ${root}`;
    }
  }

  // Normalize so a > 0
  let effA = a;
  let effB = b;
  let effC = c;
  let effType = type;

  if (a < 0) {
    effA = -a;
    effB = -b;
    effC = -c;
    if (type === ">") effType = "<";
    else if (type === "<") effType = ">";
    else if (type === ">=") effType = "<=";
    else if (type === "<=") effType = ">=";
  }

  const delta = effB * effB - 4 * effA * effC;

  if (delta > 0) {
    const r1 = normalizeNumber((-effB - Math.sqrt(delta)) / (2 * effA));
    const r2 = normalizeNumber((-effB + Math.sqrt(delta)) / (2 * effA));
    const minR = Math.min(r1, r2);
    const maxR = Math.max(r1, r2);

    if (effType === ">") {
      return `x < ${minR}, ${maxR} < x`;
    }
    if (effType === ">=") {
      return `x \\le ${minR}, ${maxR} \\le x`;
    }
    if (effType === "<") {
      return `${minR} < x < ${maxR}`;
    }
    if (effType === "<=") {
      return `${minR} \\le x \\le ${maxR}`;
    }
  } else if (delta === 0) {
    const root = normalizeNumber(-effB / (2 * effA));
    if (effType === ">") {
      return `x \\ne ${root}`;
    }
    if (effType === ">=") {
      return "All Real Numbers";
    }
    if (effType === "<") {
      return "No Solution";
    }
    if (effType === "<=") {
      return `x = ${root}`;
    }
  } else {
    // delta < 0: ax^2 + bx + c is strictly positive for all x
    if (effType === ">" || effType === ">=") {
      return "All Real Numbers";
    }
    return "No Solution";
  }

  return "No Solution";
}
