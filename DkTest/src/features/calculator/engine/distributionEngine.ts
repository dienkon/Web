import { normalizeNumber } from "./resultFormatter";

// Error function approximation (Abramowitz & Stegun formula 7.1.26)
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const a = Math.abs(x);
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const t = 1.0 / (1.0 + p * a);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-a * a);
  return sign * y;
}

function normalCDF(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) throw new Error("Math ERROR");
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

export function normalPD(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) throw new Error("Math ERROR");
  const denom = sigma * Math.sqrt(2 * Math.PI);
  const num = Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
  return normalizeNumber(num / denom);
}

export function normalCD(lower: number, upper: number, mu: number, sigma: number): number {
  if (sigma <= 0) throw new Error("Math ERROR");
  const pUpper = normalCDF(upper, mu, sigma);
  const pLower = normalCDF(lower, mu, sigma);
  return normalizeNumber(Math.max(0, Math.min(1, pUpper - pLower)));
}

export function invNormal(area: number, mu: number, sigma: number): number {
  if (area <= 0 || area >= 1 || sigma <= 0) throw new Error("Math ERROR");
  // Rational approximation for inverse standard normal (Acklam's algorithm)
  const a1 = -3.969683028665376e1;
  const a2 = 2.209460984245205e2;
  const a3 = -2.759285104469687e2;
  const a4 = 1.383577518672690e2;
  const a5 = -3.066479806614716e1;
  const a6 = 2.506628277459239e0;

  const b1 = -5.447609879822406e1;
  const b2 = 1.615858368580409e2;
  const b3 = -1.556989798598866e2;
  const b4 = 6.680131188771972e1;
  const b5 = -1.328068155288572e1;

  const c1 = -7.784894002430293e-3;
  const c2 = -3.223964580411365e-1;
  const c3 = -2.400758277161838e0;
  const c4 = -2.549732539343734e0;
  const c5 = 4.374664141464968e0;
  const c6 = 2.938163982698783e0;

  const d1 = 7.784695709041462e-3;
  const d2 = 3.224671290700398e-1;
  const d3 = 2.445134137142996e0;
  const d4 = 3.754408661907416e0;

  let z = 0;
  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (area < pLow) {
    const q = Math.sqrt(-2 * Math.log(area));
    z = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else if (area <= pHigh) {
    const q = area - 0.5;
    const r = q * q;
    z = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
        (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - area));
    z = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
         ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }

  return normalizeNumber(mu + z * sigma);
}

function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  for (let i = 1; i <= k; i++) {
    c = (c * (n - (k - i))) / i;
  }
  return c;
}

export function binomialPD(x: number, n: number, p: number): number {
  if (p < 0 || p > 1 || n < 0 || !Number.isInteger(n) || !Number.isInteger(x)) {
    throw new Error("Math ERROR");
  }
  if (x < 0 || x > n) return 0;
  const c = combinations(n, x);
  const prob = c * Math.pow(p, x) * Math.pow(1 - p, n - x);
  return normalizeNumber(prob);
}

export function binomialCD(x: number, n: number, p: number): number {
  if (p < 0 || p > 1 || n < 0 || !Number.isInteger(n)) throw new Error("Math ERROR");
  if (x < 0) return 0;
  const maxX = Math.min(n, Math.floor(x));
  let sum = 0;
  for (let k = 0; k <= maxX; k++) {
    sum += combinations(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }
  return normalizeNumber(Math.min(1, sum));
}

function factorial(n: number): number {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

export function poissonPD(x: number, lambda: number): number {
  if (lambda <= 0 || x < 0 || !Number.isInteger(x)) throw new Error("Math ERROR");
  const num = Math.pow(lambda, x) * Math.exp(-lambda);
  const den = factorial(x);
  return normalizeNumber(num / den);
}

export function poissonCD(x: number, lambda: number): number {
  if (lambda <= 0) throw new Error("Math ERROR");
  if (x < 0) return 0;
  const maxX = Math.floor(x);
  let sum = 0;
  for (let k = 0; k <= maxX; k++) {
    sum += (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
  }
  return normalizeNumber(Math.min(1, sum));
}
