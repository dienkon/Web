import { BaseNMode } from "../types";

export function parseBaseNNumber(valStr: string, mode: BaseNMode): number {
  const clean = valStr.trim().replace(/\s+/g, "");
  if (!clean) return 0;

  if (mode === "BIN") {
    return parseInt(clean, 2) | 0;
  }
  if (mode === "OCT") {
    return parseInt(clean, 8) | 0;
  }
  if (mode === "HEX") {
    return parseInt(clean, 16) | 0;
  }
  // DEC
  return parseInt(clean, 10) | 0;
}

export function formatBaseN(val: number, mode: BaseNMode): string {
  const int32 = val | 0;

  if (mode === "BIN") {
    // Show binary
    if (int32 >= 0) return int32.toString(2);
    return (int32 >>> 0).toString(2);
  }
  if (mode === "OCT") {
    if (int32 >= 0) return int32.toString(8);
    return (int32 >>> 0).toString(8);
  }
  if (mode === "HEX") {
    if (int32 >= 0) return int32.toString(16).toUpperCase();
    return (int32 >>> 0).toString(16).toUpperCase();
  }
  // DEC
  return int32.toString(10);
}

export function baseNAnd(a: number, b: number): number {
  return (a & b) | 0;
}

export function baseNOr(a: number, b: number): number {
  return (a | b) | 0;
}

export function baseNXor(a: number, b: number): number {
  return (a ^ b) | 0;
}

export function baseNXnor(a: number, b: number): number {
  return ~(a ^ b) | 0;
}

export function baseNNot(a: number): number {
  return ~a | 0;
}

export function baseNNeg(a: number): number {
  return -a | 0;
}
