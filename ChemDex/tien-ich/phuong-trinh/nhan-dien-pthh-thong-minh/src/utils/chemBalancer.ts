/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StructuredEquation, ChemicalComponent } from "../types";
import { parseEquation } from "./chemParser";

/**
 * Basic fraction class for exact arithmetic during Gaussian elimination
 */
class Fraction {
  num: number;
  den: number;

  constructor(num: number, den = 1) {
    if (den === 0) {
      throw new Error("Mẫu số không thể bằng 0");
    }
    const commonDiv = Fraction.gcd(Math.abs(num), Math.abs(den));
    const sign = (num < 0 === den < 0) || num === 0 ? 1 : -1;
    this.num = sign * (Math.abs(num) / commonDiv);
    this.den = Math.abs(den) / commonDiv;
  }

  static gcd(a: number, b: number): number {
    return b === 0 ? a : Fraction.gcd(b, a % b);
  }

  static lcm(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / Fraction.gcd(a, b);
  }

  add(other: Fraction): Fraction {
    return new Fraction(
      this.num * other.den + other.num * this.den,
      this.den * other.den
    );
  }

  sub(other: Fraction): Fraction {
    return new Fraction(
      this.num * other.den - other.num * this.den,
      this.den * other.den
    );
  }

  mul(other: Fraction): Fraction {
    return new Fraction(this.num * other.num, this.den * other.den);
  }

  div(other: Fraction): Fraction {
    return new Fraction(this.num * other.den, this.den * other.num);
  }

  isZero(): boolean {
    return this.num === 0;
  }

  negate(): Fraction {
    return new Fraction(-this.num, this.den);
  }

  toString(): string {
    return this.den === 1 ? `${this.num}` : `${this.num}/${this.den}`;
  }
}

/**
 * Parses the net charge of a chemical formula (e.g. Ba^2+ -> 2, Cl^- -> -1, H+ -> 1, SO4^2- -> -2, H2O -> 0)
 */
export function parseCharge(formula: string): number {
  if (!formula) return 0;
  const trimmed = formula.trim();
  // Find a sequence of digits and a sign at the end, e.g. ^2+ or 2- or + or -
  const match = trimmed.match(/(\^)?(\d*)([+-])$/);
  if (!match) return 0;
  
  const valStr = match[2];
  const sign = match[3] === "+" ? 1 : -1;
  const magnitude = valStr ? parseInt(valStr, 10) : 1;
  return magnitude * sign;
}

/**
 * Main chemical balancing solver using exact fractional Gaussian Elimination
 */
export function balanceEquation(eq: StructuredEquation): { 
  balanced: StructuredEquation | null; 
  success: boolean; 
  error: string | null 
} {
  // Check if both sides are present
  if (eq.reactants.length === 0 || eq.products.length === 0) {
    return {
      balanced: null,
      success: false,
      error: "Phương trình phải chứa cả chất tham gia và chất sản phẩm."
    };
  }

  // 1. Gather all unique elements
  const reactantElements = new Set<string>();
  const productElements = new Set<string>();
  
  eq.reactants.forEach(r => Object.keys(r.elements).forEach(el => reactantElements.add(el)));
  eq.products.forEach(p => Object.keys(p.elements).forEach(el => productElements.add(el)));
  
  // Verify element conservation
  const allElements = Array.from(new Set([...reactantElements, ...productElements]));
  
  for (const el of allElements) {
    if (!reactantElements.has(el)) {
      return {
        balanced: null,
        success: false,
        error: `Lỗi bảo toàn nguyên tố: Nguyên tố ${el} xuất hiện ở sản phẩm nhưng không có ở chất tham gia.`
      };
    }
    if (!productElements.has(el)) {
      return {
        balanced: null,
        success: false,
        error: `Lỗi bảo toàn nguyên tố: Nguyên tố ${el} xuất hiện ở chất tham gia nhưng không có ở sản phẩm.`
      };
    }
  }

  // 2. Build the linear system matrix: Rows = unique elements (+ charge row if any), Columns = reaction terms
  // Let variables x0, x1, ... be the coefficients.
  // reactants terms have positive element counts, products have negative element counts.
  
  // Matrix of fractions: Rows = unique elements, Columns = reaction terms
  const matrix: Fraction[][] = [];
  for (let r = 0; r < allElements.length; r++) {
    const element = allElements[r];
    const row: Fraction[] = [];
    
    // Reactants
    for (let c = 0; c < eq.reactants.length; c++) {
      const count = eq.reactants[c].elements[element] || 0;
      row.push(new Fraction(count));
    }
    
    // Products
    for (let c = 0; c < eq.products.length; c++) {
      const count = eq.products[c].elements[element] || 0;
      row.push(new Fraction(-count)); // Negative for products on other side
    }
    
    matrix.push(row);
  }

  // Add charge balancing row if there are charged species
  let hasChargedSpecies = false;
  eq.reactants.forEach(r => {
    if (parseCharge(r.formula) !== 0) hasChargedSpecies = true;
  });
  eq.products.forEach(p => {
    if (parseCharge(p.formula) !== 0) hasChargedSpecies = true;
  });

  if (hasChargedSpecies) {
    const row: Fraction[] = [];
    // Reactants
    for (let c = 0; c < eq.reactants.length; c++) {
      const chargeVal = parseCharge(eq.reactants[c].formula);
      row.push(new Fraction(chargeVal));
    }
    // Products
    for (let c = 0; c < eq.products.length; c++) {
      const chargeVal = parseCharge(eq.products[c].formula);
      row.push(new Fraction(-chargeVal));
    }
    matrix.push(row);
  }

  const numRows = matrix.length;
  const numCols = eq.reactants.length + eq.products.length;

  // 3. Gaussian Elimination (reduce to Row Echelon Form)
  let lead = 0;
  for (let r = 0; r < numRows; r++) {
    if (lead >= numCols) break;
    
    // Find pivot row
    let i = r;
    while (matrix[i][lead].isZero()) {
      i++;
      if (i === numRows) {
        i = r;
        lead++;
        if (lead === numCols) break;
      }
    }
    
    if (lead === numCols) break;
    
    // Swap rows
    const tempRow = matrix[i];
    matrix[i] = matrix[r];
    matrix[r] = tempRow;
    
    // Divide row by pivot
    const pivot = matrix[r][lead];
    if (!pivot.isZero()) {
      matrix[r] = matrix[r].map(cell => cell.div(pivot));
    }
    
    // Subtract from other rows
    for (let otherRowIdx = 0; otherRowIdx < numRows; otherRowIdx++) {
      if (otherRowIdx !== r) {
        const factor = matrix[otherRowIdx][lead];
        if (!factor.isZero()) {
          matrix[otherRowIdx] = matrix[otherRowIdx].map((cell, cIdx) => 
            cell.sub(matrix[r][cIdx].mul(factor))
          );
        }
      }
    }
    
    lead++;
  }

  // 4. Back-substitution / Solve null space.
  // We want to solve M * x = 0.
  // Let the last variable (x_last) be 1, then solve for others.
  // If we have multi-variable free parameters, we set them all to 1.
  const solutions: Fraction[] = Array(numCols).fill(new Fraction(0));
  
  // Set free variables (typically the last column) to 1.
  // In standard equations, there is exactly one free variable.
  solutions[numCols - 1] = new Fraction(1);
  
  // Back-substitute for bound variables
  for (let r = numRows - 1; r >= 0; r--) {
    // Find the leading 1 (pivot) in this row
    let pivotCol = -1;
    for (let c = 0; c < numCols; c++) {
      if (matrix[r][c].num !== 0) {
        pivotCol = c;
        break;
      }
    }
    
    if (pivotCol === -1 || pivotCol === numCols - 1) continue;
    
    // x_pivotCol + sum_{c = pivotCol + 1}^{numCols-1} (matrix[r][c] * x_c) = 0
    // x_pivotCol = - sum_{c = pivotCol + 1}^{numCols-1} (matrix[r][c] * x_c)
    let sum = new Fraction(0);
    for (let c = pivotCol + 1; c < numCols; c++) {
      sum = sum.add(matrix[r][c].mul(solutions[c]));
    }
    solutions[pivotCol] = sum.negate();
  }

  // Check if we found a valid non-trivial solution with positive values
  const hasZeroOrNegative = solutions.some(sol => sol.num <= 0);
  if (hasZeroOrNegative) {
    // Let's try to search the solution space or check if it's already balanced.
    // If we can't find a standard positive solution, balancing fails.
    return {
      balanced: null,
      success: false,
      error: "Không thể tìm thấy hệ số nguyên dương hợp lệ. Vui lòng kiểm tra lại tính đúng đắn của phản ứng hóa học."
    };
  }

  // 5. Convert fractional solution to smallest integers
  // Find least common multiple (LCM) of all denominators
  let overallLcm = 1;
  solutions.forEach(sol => {
    overallLcm = Fraction.lcm(overallLcm, sol.den);
  });

  // Multiply all fractions by LCM to get integer coefficients
  const intCoefficients = solutions.map(sol => (sol.num * (overallLcm / sol.den)));
  
  // Divide all by their greatest common divisor (GCD) to get the simplest form
  let overallGcd = intCoefficients[0];
  for (let i = 1; i < intCoefficients.length; i++) {
    overallGcd = Fraction.gcd(overallGcd, intCoefficients[i]);
  }
  
  const finalCoefficients = intCoefficients.map(c => c / overallGcd);

  // 6. Build the balanced StructuredEquation
  const balancedReactants: ChemicalComponent[] = eq.reactants.map((r, idx) => {
    const coef = finalCoefficients[idx];
    return {
      ...r,
      coefficient: coef,
      raw: `${coef > 1 ? coef : ""}${r.formula}`
    };
  });

  const balancedProducts: ChemicalComponent[] = eq.products.map((p, idx) => {
    const coef = finalCoefficients[eq.reactants.length + idx];
    return {
      ...p,
      coefficient: coef,
      raw: `${coef > 1 ? coef : ""}${p.formula}`
    };
  });

  return {
    balanced: {
      ...eq,
      reactants: balancedReactants,
      products: balancedProducts
    },
    success: true,
    error: null
  };
}

/**
 * Quick balancer that takes raw text string and returns balanced equation string
 */
export function balanceEquationString(rawEquation: string): { balancedStr: string; error: string | null } {
  try {
    const parsed = parseEquation(rawEquation);
    const { balanced, success, error } = balanceEquation(parsed);
    
    if (success && balanced) {
      // Re-format back to string
      const formatSide = (side: ChemicalComponent[]): string => {
        return side
          .map(comp => {
            const coefStr = comp.coefficient > 1 ? `${comp.coefficient}` : "";
            return `${coefStr}${comp.formula}`;
          })
          .join(" + ");
      };
      
      const rStr = formatSide(balanced.reactants);
      const pStr = formatSide(balanced.products);
      const condStr = balanced.conditions.length > 0 ? ` (${balanced.conditions.join(", ")})` : "";
      
      return {
        balancedStr: `${rStr} -> ${pStr}${condStr}`,
        error: null
      };
    }
    
    return {
      balancedStr: rawEquation,
      error: error || "Cân bằng phương trình thất bại"
    };
  } catch (err: any) {
    return {
      balancedStr: rawEquation,
      error: `Lỗi phân tích cú pháp trước khi cân bằng: ${err.message}`
    };
  }
}
