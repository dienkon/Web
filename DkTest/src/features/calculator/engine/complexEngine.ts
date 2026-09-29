import { AngleUnit } from "../types";
import { normalizeNumber } from "./resultFormatter";

export interface ComplexNumber {
  re: number;
  im: number;
}

export function parseComplex(str: string): ComplexNumber {
  const clean = str.trim().replace(/\s+/g, "").replace(/\\imaginaryI/g, "i");
  if (!clean.includes("i")) {
    const val = parseFloat(clean);
    return { re: isNaN(val) ? 0 : val, im: 0 };
  }
  // Pure imaginary, e.g. "i" or "-i" or "3i"
  if (clean === "i" || clean === "+i") return { re: 0, im: 1 };
  if (clean === "-i") return { re: 0, im: -1 };

  // Match a + bi or a - bi
  const match = clean.match(/^([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)([+-]\d*(?:\.\d+)?(?:e[+-]?\d+)?)?i$/i);
  if (match) {
    const re = parseFloat(match[1]);
    let im = 1;
    if (match[2]) {
      if (match[2] === "+" || match[2] === "") im = 1;
      else if (match[2] === "-") im = -1;
      else im = parseFloat(match[2]);
    }
    return { re: normalizeNumber(re), im: normalizeNumber(im) };
  }

  // Pure imaginary number with coefficient, e.g. "5i" or "-2.5i"
  const pureMatch = clean.match(/^([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)i$/i);
  if (pureMatch) {
    return { re: 0, im: normalizeNumber(parseFloat(pureMatch[1])) };
  }

  return { re: 0, im: 0 };
}

export function formatComplex(
  c: ComplexNumber,
  format: "a+bi" | "r∠θ" = "a+bi",
  angleUnit: AngleUnit = "DEG"
): string {
  const re = normalizeNumber(c.re);
  const im = normalizeNumber(c.im);

  if (format === "r∠θ") {
    const r = normalizeNumber(Math.sqrt(re * re + im * im));
    let thetaRad = Math.atan2(im, re);
    let theta = thetaRad;
    if (angleUnit === "DEG") theta = (thetaRad * 180) / Math.PI;
    else if (angleUnit === "GRAD") theta = (thetaRad * 200) / Math.PI;
    theta = normalizeNumber(theta);
    return `${r} \\angle ${theta}`;
  }

  if (im === 0) return `${re}`;
  if (re === 0) {
    if (im === 1) return "i";
    if (im === -1) return "-i";
    return `${im}i`;
  }

  const sign = im >= 0 ? "+" : "-";
  const absIm = Math.abs(im);
  const imPart = absIm === 1 ? "i" : `${absIm}i`;
  return `${re} ${sign} ${imPart}`;
}

export function complexConjugate(c: ComplexNumber): ComplexNumber {
  return { re: c.re, im: -c.im };
}

export function complexAbs(c: ComplexNumber): number {
  return normalizeNumber(Math.sqrt(c.re * c.re + c.im * c.im));
}

export function complexArg(c: ComplexNumber, angleUnit: AngleUnit = "DEG"): number {
  const rad = Math.atan2(c.im, c.re);
  let res = rad;
  if (angleUnit === "DEG") res = (rad * 180) / Math.PI;
  else if (angleUnit === "GRAD") res = (rad * 200) / Math.PI;
  return normalizeNumber(res);
}

export function complexAdd(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return { re: normalizeNumber(a.re + b.re), im: normalizeNumber(a.im + b.im) };
}

export function complexSub(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return { re: normalizeNumber(a.re - b.re), im: normalizeNumber(a.im - b.im) };
}

export function complexMul(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return {
    re: normalizeNumber(a.re * b.re - a.im * b.im),
    im: normalizeNumber(a.re * b.im + a.im * b.re),
  };
}

export function complexDiv(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) throw new Error("Math ERROR (Division by zero)");
  return {
    re: normalizeNumber((a.re * b.re + a.im * b.im) / denom),
    im: normalizeNumber((a.im * b.re - a.re * b.im) / denom),
  };
}
