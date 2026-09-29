import { normalizeNumber } from "./resultFormatter";

export interface Stat1VarResult {
  n: number;
  mean: number;
  sumX: number;
  sumX2: number;
  sigmaX: number;
  sigma2X: number;
  sX: number;
  s2X: number;
  minX: number;
  q1: number;
  median: number;
  q3: number;
  maxX: number;
}

export interface Stat2VarResult extends Stat1VarResult {
  meanY: number;
  sumY: number;
  sumY2: number;
  sumXY: number;
  sigmaY: number;
  sY: number;
  a: number; // intercept
  b: number; // slope
  r: number; // correlation coefficient
  minY: number;
  maxY: number;
}

export function compute1VarStats(xData: number[], freqData?: number[]): Stat1VarResult {
  if (xData.length === 0) throw new Error("No Data");

  // Expand with frequencies
  const items: number[] = [];
  for (let i = 0; i < xData.length; i++) {
    const f = freqData && freqData[i] !== undefined ? Math.max(1, Math.round(freqData[i])) : 1;
    for (let k = 0; k < f; k++) {
      items.push(xData[i]);
    }
  }

  const n = items.length;
  if (n === 0) throw new Error("No Data");

  const sumX = items.reduce((acc, v) => acc + v, 0);
  const sumX2 = items.reduce((acc, v) => acc + v * v, 0);
  const mean = sumX / n;

  const variancePop = items.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const sigmaX = Math.sqrt(variancePop);

  const varianceSample = n > 1 ? items.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1) : 0;
  const sX = Math.sqrt(varianceSample);

  // Sorted items for percentiles
  const sorted = [...items].sort((a, b) => a - b);
  const minX = sorted[0];
  const maxX = sorted[sorted.length - 1];

  const getMedian = (arr: number[]): number => {
    const len = arr.length;
    if (len % 2 === 1) return arr[Math.floor(len / 2)];
    return (arr[len / 2 - 1] + arr[len / 2]) / 2;
  };

  const median = getMedian(sorted);
  const midIdx = Math.floor(sorted.length / 2);
  const lowerHalf = sorted.slice(0, midIdx);
  const upperHalf = sorted.length % 2 === 0 ? sorted.slice(midIdx) : sorted.slice(midIdx + 1);

  const q1 = lowerHalf.length > 0 ? getMedian(lowerHalf) : minX;
  const q3 = upperHalf.length > 0 ? getMedian(upperHalf) : maxX;

  return {
    n,
    mean: normalizeNumber(mean),
    sumX: normalizeNumber(sumX),
    sumX2: normalizeNumber(sumX2),
    sigmaX: normalizeNumber(sigmaX),
    sigma2X: normalizeNumber(variancePop),
    sX: normalizeNumber(sX),
    s2X: normalizeNumber(varianceSample),
    minX: normalizeNumber(minX),
    q1: normalizeNumber(q1),
    median: normalizeNumber(median),
    q3: normalizeNumber(q3),
    maxX: normalizeNumber(maxX),
  };
}

export function compute2VarLinearRegression(
  xData: number[],
  yData: number[],
  freqData?: number[]
): Stat2VarResult {
  const stat1 = compute1VarStats(xData, freqData);
  const statY = compute1VarStats(yData, freqData);

  const n = stat1.n;
  let sumXY = 0;
  for (let i = 0; i < Math.min(xData.length, yData.length); i++) {
    const f = freqData && freqData[i] !== undefined ? Math.max(1, Math.round(freqData[i])) : 1;
    sumXY += xData[i] * yData[i] * f;
  }

  const ssXX = stat1.sumX2 - (stat1.sumX * stat1.sumX) / n;
  const ssYY = statY.sumX2 - (statY.sumX * statY.sumX) / n;
  const ssXY = sumXY - (stat1.sumX * statY.sumX) / n;

  let b = 0;
  let a = 0;
  let r = 0;

  if (Math.abs(ssXX) > 1e-12) {
    b = ssXY / ssXX;
    a = statY.mean - b * stat1.mean;
  }
  if (Math.abs(ssXX * ssYY) > 1e-12) {
    r = ssXY / Math.sqrt(ssXX * ssYY);
  }

  return {
    ...stat1,
    meanY: statY.mean,
    sumY: statY.sumX,
    sumY2: statY.sumX2,
    sumXY: normalizeNumber(sumXY),
    sigmaY: statY.sigmaX,
    sY: statY.sX,
    a: normalizeNumber(a),
    b: normalizeNumber(b),
    r: normalizeNumber(r),
    minY: statY.minX,
    maxY: statY.maxX,
  };
}

export const compute2VarStats = compute2VarLinearRegression;

