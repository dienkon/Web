import { normalizeNumber } from "./resultFormatter";

export function createMatrix(rows: number, cols: number, initial = 0): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(initial));
}

export function matrixDet(m: number[][]): number {
  const n = m.length;
  if (n !== m[0].length) throw new Error("Dimension ERROR");
  if (n === 1) return normalizeNumber(m[0][0]);
  if (n === 2) return normalizeNumber(m[0][0] * m[1][1] - m[0][1] * m[1][0]);
  if (n === 3) {
    const d =
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    return normalizeNumber(d);
  }
  // 4x4 using cofactor expansion along first row
  let det = 0;
  for (let c = 0; c < 4; c++) {
    const subMat = m.slice(1).map((row) => row.filter((_, colIdx) => colIdx !== c));
    const sign = c % 2 === 0 ? 1 : -1;
    det += sign * m[0][c] * matrixDet(subMat);
  }
  return normalizeNumber(det);
}

export function matrixTrn(m: number[][]): number[][] {
  const rows = m.length;
  const cols = m[0].length;
  const res = createMatrix(cols, rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      res[c][r] = normalizeNumber(m[r][c]);
    }
  }
  return res;
}

export function matrixIdentity(dim: number): number[][] {
  const res = createMatrix(dim, dim);
  for (let i = 0; i < dim; i++) res[i][i] = 1;
  return res;
}

export function matrixAdd(a: number[][], b: number[][]): number[][] {
  if (a.length !== b.length || a[0].length !== b[0].length) {
    throw new Error("Dimension ERROR");
  }
  return a.map((row, r) => row.map((val, c) => normalizeNumber(val + b[r][c])));
}

export function matrixSub(a: number[][], b: number[][]): number[][] {
  if (a.length !== b.length || a[0].length !== b[0].length) {
    throw new Error("Dimension ERROR");
  }
  return a.map((row, r) => row.map((val, c) => normalizeNumber(val - b[r][c])));
}

export function matrixMul(a: number[][], b: number[][]): number[][] {
  const rA = a.length;
  const cA = a[0].length;
  const rB = b.length;
  const cB = b[0].length;
  if (cA !== rB) throw new Error("Dimension ERROR");

  const res = createMatrix(rA, cB);
  for (let r = 0; r < rA; r++) {
    for (let c = 0; c < cB; c++) {
      let sum = 0;
      for (let k = 0; k < cA; k++) {
        sum += a[r][k] * b[k][c];
      }
      res[r][c] = normalizeNumber(sum);
    }
  }
  return res;
}

export function formatMatrixToLatex(m: number[][]): string {
  const rows = m.map((r) => r.map((v) => normalizeNumber(v)).join(" & "));
  return `\\begin{bmatrix} ${rows.join(" \\\\ ")} \\end{bmatrix}`;
}
