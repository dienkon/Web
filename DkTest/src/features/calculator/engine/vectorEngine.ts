import { AngleUnit } from "../types";
import { normalizeNumber } from "./resultFormatter";

export function vectorDot(u: number[], v: number[]): number {
  if (u.length !== v.length) throw new Error("Dimension ERROR");
  let sum = 0;
  for (let i = 0; i < u.length; i++) sum += u[i] * v[i];
  return normalizeNumber(sum);
}

export function vectorNorm(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return normalizeNumber(Math.sqrt(sum));
}

export function vectorUnit(v: number[]): number[] {
  const norm = vectorNorm(v);
  if (norm === 0) throw new Error("Math ERROR");
  return v.map((x) => normalizeNumber(x / norm));
}

export function vectorCross(u: number[], v: number[]): number[] {
  if (u.length !== 3 || v.length !== 3) {
    throw new Error("Dimension ERROR (3D required for Cross Product)");
  }
  return [
    normalizeNumber(u[1] * v[2] - u[2] * v[1]),
    normalizeNumber(u[2] * v[0] - u[0] * v[2]),
    normalizeNumber(u[0] * v[1] - u[1] * v[0]),
  ];
}

export function vectorAngle(u: number[], v: number[], angleUnit: AngleUnit = "DEG"): number {
  const dot = vectorDot(u, v);
  const normU = vectorNorm(u);
  const normV = vectorNorm(v);
  if (normU === 0 || normV === 0) throw new Error("Math ERROR");

  const cosTheta = Math.max(-1, Math.min(1, dot / (normU * normV)));
  const rad = Math.acos(cosTheta);
  let res = rad;
  if (angleUnit === "DEG") res = (rad * 180) / Math.PI;
  else if (angleUnit === "GRAD") res = (rad * 200) / Math.PI;
  return normalizeNumber(res);
}

export function formatVectorToLatex(v: number[]): string {
  return `\\begin{bmatrix} ${v.map((x) => normalizeNumber(x)).join(" \\\\ ")} \\end{bmatrix}`;
}
