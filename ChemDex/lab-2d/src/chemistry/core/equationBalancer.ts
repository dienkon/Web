/**
 * Exact Rational Nullspace (Gauss-Jordan RREF) Chemical Equation Balancer
 * & Limiting-Reagent Stoichiometry Calculator.
 * Supports molecular, hydrate, bracketed complex, and net ionic equations.
 */

import { computeMolarMass, parseChemicalFormula } from './formula';

export interface ParsedEquationTerm {
  raw: string;
  formula: string;
  displayFormula: string;
  phase?: 's' | 'l' | 'g' | 'aq' | 'conc' | 'dil';
  charge: number;
  atoms: Record<string, number>;
  molarMass_g_mol: number;
}

export interface BalancedSpecies extends ParsedEquationTerm {
  coefficient: number;
}

export interface BalanceEquationSuccess {
  ok: true;
  reactants: BalancedSpecies[];
  products: BalancedSpecies[];
  balancedEquation: string;
  plainEquation: string;
  isIonic: boolean;
  elementsConserved: string[];
}

export interface BalanceEquationFailure {
  ok: false;
  error_en: string;
  error_vi: string;
}

export type BalanceEquationResult = BalanceEquationSuccess | BalanceEquationFailure;

export interface StoichReactantInput {
  mode: 'mass_g' | 'moles' | 'solution';
  mass_g?: number;
  moles?: number;
  volume_ml?: number;
  molarity_M?: number;
}

export interface StoichReactantOutcome {
  formula: string;
  displayFormula: string;
  coefficient: number;
  molarMass_g_mol: number;
  initialMoles: number;
  reactedMoles: number;
  remainingMoles: number;
  remainingMass_g: number;
  isLimiting: boolean;
}

export interface StoichProductOutcome {
  formula: string;
  displayFormula: string;
  coefficient: number;
  molarMass_g_mol: number;
  theoreticalMoles: number;
  theoreticalMass_g: number;
  isGas: boolean;
  gasVolumeSTP_L: number;
  gasVolume25C_L: number;
}

export interface StoichiometryCalculationResult {
  ok: boolean;
  extent_mol: number;
  limitingFormulas: string[];
  reactants: StoichReactantOutcome[];
  products: StoichProductOutcome[];
  error_en?: string;
  error_vi?: string;
}

interface Fraction {
  num: bigint;
  den: bigint;
}

const ZERO: Fraction = { num: 0n, den: 1n };
const ONE: Fraction = { num: 1n, den: 1n };

function absBig(n: bigint): bigint {
  return n < 0n ? -n : n;
}

function gcdBig(a: bigint, b: bigint): bigint {
  let x = absBig(a);
  let y = absBig(b);
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}

function lcmBig(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 1n;
  return (absBig(a) / gcdBig(a, b)) * absBig(b);
}

function frac(num: bigint, den = 1n): Fraction {
  if (den === 0n) throw new Error('Division by zero in rational solver');
  if (num === 0n) return ZERO;
  const sign = den < 0n ? -1n : 1n;
  const n = num * sign;
  const d = absBig(den);
  const g = gcdBig(n, d);
  return { num: n / g, den: d / g };
}

function addFrac(a: Fraction, b: Fraction): Fraction {
  return frac(a.num * b.den + b.num * a.den, a.den * b.den);
}

function subFrac(a: Fraction, b: Fraction): Fraction {
  return frac(a.num * b.den - b.num * a.den, a.den * b.den);
}

function mulFrac(a: Fraction, b: Fraction): Fraction {
  return frac(a.num * b.num, a.den * b.den);
}

function divFrac(a: Fraction, b: Fraction): Fraction {
  return frac(a.num * b.den, a.den * b.num);
}

const SUBSCRIPT_TO_ASCII: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁺': '+',
  '⁻': '-',
};

function normalizeChemText(input: string): string {
  return input
    .replace(/[₀-₉]/g, (c) => SUBSCRIPT_TO_ASCII[c] ?? c)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/g, (c) => SUPERSCRIPT_MAP[c] ?? c)
    .replace(/[↑↓]/g, '')
    .trim();
}

const MULTIVALENT_CATION_ION_RE =
  /^(Fe|Cu|Ca|Mg|Ba|Zn|Al|Cr|Mn|Ni|Co|Pb|Sn|Pt|Au|Ti|V|Hg|Cd)([2-6])(\+)$/;

function splitSideTerms(side: string): string[] {
  const normalized = side.trim();
  if (!normalized) return [];
  if (/\s+\+\s+/.test(normalized)) {
    return normalized
      .split(/\s+\+\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // Compact split without spaces, preserving trailing ionic charges like Cu2+ or NH4+
  return normalized
    .split(/\+(?=(?:\d*\s*)?[A-Z(\[])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseEquationTerm(rawTerm: string): ParsedEquationTerm | null {
  const cleaned = normalizeChemText(rawTerm);
  if (!cleaned) return null;

  // Strip optional leading numeric stoichiometric coefficient
  const withoutCoeff = cleaned.replace(/^\d+(?:\.\d+)?\s*/, '').trim();
  if (!withoutCoeff) return null;

  let core = withoutCoeff;
  let phase: ParsedEquationTerm['phase'];
  const phaseMatch = core.match(/\s*\((s|l|g|aq|conc|dil)\)$/i);
  if (phaseMatch) {
    phase = phaseMatch[1].toLowerCase() as ParsedEquationTerm['phase'];
    core = core.slice(0, phaseMatch.index).trim();
  }

  let charge = 0;
  let formulaBody = core;

  // Explicit caret charge: Fe^3+, SO4^2-, NH4^+
  const caretMatch = formulaBody.match(/\^(\d*)([+-])$/);
  if (caretMatch) {
    const mag = caretMatch[1] ? parseInt(caretMatch[1], 10) : 1;
    charge = caretMatch[2] === '+' ? mag : -mag;
    formulaBody = formulaBody.slice(0, caretMatch.index).trim();
  } else {
    const multivalent = formulaBody.match(MULTIVALENT_CATION_ION_RE);
    if (multivalent) {
      charge = parseInt(multivalent[2], 10);
      formulaBody = multivalent[1];
    } else if (/[+-]$/.test(formulaBody)) {
      const sign = formulaBody.endsWith('+') ? 1 : -1;
      charge = sign;
      formulaBody = formulaBody.slice(0, -1).trim();
    }
  }

  const atoms = parseChemicalFormula(formulaBody);
  if (Object.keys(atoms).length === 0) return null;

  const molarMass_g_mol = computeMolarMass(formulaBody);
  return {
    raw: rawTerm.trim(),
    formula: formulaBody,
    displayFormula: withoutCoeff,
    phase,
    charge,
    atoms,
    molarMass_g_mol,
  };
}

/**
 * Balances any stoichiometrically well-posed chemical or net-ionic equation
 * via exact BigInt Gauss-Jordan RREF nullspace decomposition.
 */
export function balanceChemicalEquation(equationInput: string): BalanceEquationResult {
  const text = normalizeChemText(equationInput);
  if (!text) {
    return {
      ok: false,
      error_en: 'Please enter a chemical equation.',
      error_vi: 'Vui lòng nhập phương trình hóa học.',
    };
  }

  const arrowParts = text.split(/\s*(?:<->|<=>|<-->|-->|->|→|⟶|⇌|=)\s*/);
  if (arrowParts.length !== 2 || !arrowParts[0].trim() || !arrowParts[1].trim()) {
    return {
      ok: false,
      error_en: 'Use ->, →, or = to separate reactants and products.',
      error_vi: 'Hãy dùng dấu ->, → hoặc = để ngăn cách chất tham gia và sản phẩm.',
    };
  }

  const rawReactants = splitSideTerms(arrowParts[0]);
  const rawProducts = splitSideTerms(arrowParts[1]);
  if (rawReactants.length === 0 || rawProducts.length === 0) {
    return {
      ok: false,
      error_en: 'Both reactants and products must contain at least one species.',
      error_vi: 'Cả hai vế phương trình phải có ít nhất một chất.',
    };
  }

  const reactants: ParsedEquationTerm[] = [];
  for (const r of rawReactants) {
    const parsed = parseEquationTerm(r);
    if (!parsed) {
      return {
        ok: false,
        error_en: `Invalid reactant formula: "${r}".`,
        error_vi: `Công thức chất tham gia không hợp lệ: "${r}".`,
      };
    }
    reactants.push(parsed);
  }

  const products: ParsedEquationTerm[] = [];
  for (const p of rawProducts) {
    const parsed = parseEquationTerm(p);
    if (!parsed) {
      return {
        ok: false,
        error_en: `Invalid product formula: "${p}".`,
        error_vi: `Công thức sản phẩm không hợp lệ: "${p}".`,
      };
    }
    products.push(parsed);
  }

  const allSpecies = [...reactants, ...products];
  const elementSet = new Set<string>();
  let isIonic = false;
  for (const sp of allSpecies) {
    for (const el of Object.keys(sp.atoms)) elementSet.add(el);
    if (sp.charge !== 0) isIonic = true;
  }

  const elements = [...elementSet].sort();
  const rowKeys = isIonic ? [...elements, '__CHARGE__'] : elements;
  const rows = rowKeys.length;
  const cols = allSpecies.length;

  const matrix: Fraction[][] = rowKeys.map((key) =>
    allSpecies.map((sp, colIdx) => {
      const sign = colIdx < reactants.length ? 1 : -1;
      const val = key === '__CHARGE__' ? sp.charge : sp.atoms[key] ?? 0;
      return frac(BigInt(sign * val));
    })
  );

  // Gauss-Jordan RREF over exact BigInt rationals
  const pivotCols: number[] = [];
  let pivotRow = 0;

  for (let col = 0; col < cols && pivotRow < rows; col++) {
    let bestRow = -1;
    for (let r = pivotRow; r < rows; r++) {
      if (matrix[r][col].num !== 0n) {
        bestRow = r;
        break;
      }
    }
    if (bestRow === -1) continue;

    if (bestRow !== pivotRow) {
      const tmp = matrix[pivotRow];
      matrix[pivotRow] = matrix[bestRow];
      matrix[bestRow] = tmp;
    }

    const pivotVal = matrix[pivotRow][col];
    for (let c = col; c < cols; c++) {
      matrix[pivotRow][c] = divFrac(matrix[pivotRow][c], pivotVal);
    }

    for (let r = 0; r < rows; r++) {
      if (r === pivotRow || matrix[r][col].num === 0n) continue;
      const factor = matrix[r][col];
      for (let c = col; c < cols; c++) {
        matrix[r][c] = subFrac(matrix[r][c], mulFrac(factor, matrix[pivotRow][c]));
      }
    }

    pivotCols.push(col);
    pivotRow++;
  }

  const pivotSet = new Set(pivotCols);
  const freeCols: number[] = [];
  for (let c = 0; c < cols; c++) {
    if (!pivotSet.has(c)) freeCols.push(c);
  }

  if (freeCols.length === 0) {
    return {
      ok: false,
      error_en: 'Equation cannot be balanced (elements or charges do not match between sides).',
      error_vi: 'Không thể cân bằng phương trình (nguyên tố hoặc điện tích hai vế không tương thích).',
    };
  }

  if (freeCols.length > 1) {
    return {
      ok: false,
      error_en: `Equation has ${freeCols.length} independent degrees of freedom — split into separate reactions.`,
      error_vi: `Phương trình chứa ${freeCols.length} phản ứng độc lập lồng nhau — hãy tách riêng từng phản ứng.`,
    };
  }

  // Unique 1D nullspace solution
  const freeCol = freeCols[0];
  const vec: Fraction[] = Array.from({ length: cols }, () => ZERO);
  vec[freeCol] = ONE;
  for (let r = 0; r < pivotCols.length; r++) {
    vec[pivotCols[r]] = frac(-matrix[r][freeCol].num, matrix[r][freeCol].den);
  }

  let commonDen = 1n;
  for (const v of vec) commonDen = lcmBig(commonDen, v.den);

  let ints = vec.map((v) => v.num * (commonDen / v.den));
  const firstNonZero = ints.find((n) => n !== 0n) ?? 1n;
  if (firstNonZero < 0n) {
    ints = ints.map((n) => -n);
  }

  if (ints.some((n) => n <= 0n)) {
    return {
      ok: false,
      error_en: 'Some species obtained zero or negative stoichiometry — verify reactants and products.',
      error_vi: 'Có chất ra hệ số bằng 0 hoặc âm — hãy kiểm tra lại chiều phản ứng và công thức.',
    };
  }

  let g = ints[0];
  for (let i = 1; i < ints.length; i++) g = gcdBig(g, ints[i]);
  const coeffs = ints.map((n) => Number(n / g));

  const balancedReactants: BalancedSpecies[] = reactants.map((r, i) => ({
    ...r,
    coefficient: coeffs[i],
  }));
  const balancedProducts: BalancedSpecies[] = products.map((p, i) => ({
    ...p,
    coefficient: coeffs[reactants.length + i],
  }));

  const fmtTerm = (s: BalancedSpecies) =>
    s.coefficient === 1 ? s.displayFormula : `${s.coefficient}${s.displayFormula}`;
  const fmtPlain = (s: BalancedSpecies) =>
    s.coefficient === 1 ? s.displayFormula : `${s.coefficient} ${s.displayFormula}`;

  return {
    ok: true,
    reactants: balancedReactants,
    products: balancedProducts,
    balancedEquation: `${balancedReactants.map(fmtTerm).join(' + ')} → ${balancedProducts.map(fmtTerm).join(' + ')}`,
    plainEquation: `${balancedReactants.map(fmtPlain).join(' + ')} -> ${balancedProducts.map(fmtPlain).join(' + ')}`,
    isIonic,
    elementsConserved: elements,
  };
}

const KNOWN_GAS_FORMULAS = new Set([
  'H2',
  'O2',
  'N2',
  'CL2',
  'F2',
  'CO2',
  'CO',
  'SO2',
  'NO',
  'NO2',
  'N2O',
  'NH3',
  'H2S',
  'HCL',
  'CH4',
  'C2H2',
  'C2H4',
  'C2H6',
]);

function resolveInputMoles(spec: BalancedSpecies, input?: StoichReactantInput): number {
  if (!input) return 0;
  if (input.mode === 'mass_g') {
    const g = Math.max(0, input.mass_g ?? 0);
    return spec.molarMass_g_mol > 0 ? g / spec.molarMass_g_mol : 0;
  }
  if (input.mode === 'solution') {
    const vol = Math.max(0, input.volume_ml ?? 0);
    const molarity = Math.max(0, input.molarity_M ?? 0);
    return (vol / 1000) * molarity;
  }
  return Math.max(0, input.moles ?? 0);
}

/**
 * Computes limiting reagent, extent of reaction (mol), excess remaining masses,
 * and theoretical product yields (grams + STP/25C gas volumes).
 */
export function calculateStoichiometry(
  balanced: BalanceEquationSuccess,
  inputs: readonly (StoichReactantInput | undefined)[],
  singleReactantAssumesExcess = true
): StoichiometryCalculationResult {
  const initialMoles = balanced.reactants.map((r, i) => resolveInputMoles(r, inputs[i]));
  const activeIndices = initialMoles
    .map((m, i) => (m > 0 ? i : -1))
    .filter((i) => i >= 0);

  if (activeIndices.length === 0) {
    return {
      ok: false,
      extent_mol: 0,
      limitingFormulas: [],
      reactants: [],
      products: [],
      error_en: 'Enter at least one positive reactant quantity.',
      error_vi: 'Hãy nhập lượng cho ít nhất một chất tham gia.',
    };
  }

  // If user only supplied one reactant and toggle is enabled, assume others are in excess
  const treatPartialAsExcess =
    singleReactantAssumesExcess && activeIndices.length < balanced.reactants.length;

  let extent_mol = Infinity;
  for (let i = 0; i < balanced.reactants.length; i++) {
    if (treatPartialAsExcess && initialMoles[i] <= 0) continue;
    const ratio = initialMoles[i] / balanced.reactants[i].coefficient;
    if (ratio < extent_mol) extent_mol = ratio;
  }
  if (!Number.isFinite(extent_mol)) extent_mol = 0;

  const limitingFormulas: string[] = [];
  const reactants: StoichReactantOutcome[] = balanced.reactants.map((r, i) => {
    const initM = treatPartialAsExcess && initialMoles[i] <= 0
      ? extent_mol * r.coefficient
      : initialMoles[i];
    const reactedM = extent_mol * r.coefficient;
    const remainingM = Math.max(0, initM - reactedM);
    const isLimiting =
      extent_mol > 0 &&
      !(treatPartialAsExcess && initialMoles[i] <= 0) &&
      Math.abs(initM / r.coefficient - extent_mol) <= 1e-9;

    if (isLimiting) limitingFormulas.push(r.displayFormula);

    return {
      formula: r.formula,
      displayFormula: r.displayFormula,
      coefficient: r.coefficient,
      molarMass_g_mol: r.molarMass_g_mol,
      initialMoles: initM,
      reactedMoles: reactedM,
      remainingMoles: remainingM,
      remainingMass_g: remainingM * r.molarMass_g_mol,
      isLimiting,
    };
  });

  const products: StoichProductOutcome[] = balanced.products.map((p) => {
    const moles = extent_mol * p.coefficient;
    const isGas = p.phase === 'g' || KNOWN_GAS_FORMULAS.has(p.formula.toUpperCase());
    return {
      formula: p.formula,
      displayFormula: p.displayFormula,
      coefficient: p.coefficient,
      molarMass_g_mol: p.molarMass_g_mol,
      theoreticalMoles: moles,
      theoreticalMass_g: moles * p.molarMass_g_mol,
      isGas,
      gasVolumeSTP_L: isGas ? moles * 22.414 : 0,
      gasVolume25C_L: isGas ? moles * 24.789 : 0,
    };
  });

  return {
    ok: true,
    extent_mol,
    limitingFormulas,
    reactants,
    products,
  };
}
