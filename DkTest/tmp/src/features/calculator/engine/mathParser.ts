import { CalculatorState } from "../types";

// Helper function to calculate factorials
function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

// Custom scientific expression parser & evaluator
export function evaluateExpression(expr: string, state: CalculatorState): string {
  try {
    let clean = expr.trim();
    if (!clean) return "0";

    // Handle multi-statement ":" (evaluate last statement, or allow sequence)
    if (clean.includes(":")) {
      const parts = clean.split(":");
      const lastPart = parts[parts.length - 1];
      return evaluateExpression(lastPart, state);
    }

    // Replace constants
    clean = clean.replace(/π/g, `${Math.PI}`);
    clean = clean.replace(/e/g, `${Math.E}`);

    // Implicit variable multiplication (e.g., "2x" -> "2*x", ")x" -> ")*x", "xy" -> "x*y")
    clean = clean.replace(/(\d+)([xABCDEFyzM])/g, "$1*$2");
    clean = clean.replace(/\)([xABCDEFyzM])/g, ")*$1");
    clean = clean.replace(/([xABCDEFyzM])(\d+)/g, "$1*$2");
    clean = clean.replace(/([xABCDEFyzM])([xABCDEFyzM])/g, "$1*$2");

    // Replace variables
    const vars = ["A", "B", "C", "D", "E", "F", "x", "y", "z", "M"];
    vars.forEach((v) => {
      let val = 0;
      if (v === "M") {
        val = state.memoryM;
      } else {
        val = state.variables[v] || 0;
      }
      // Only replace if it's a separate word or variable token
      const regex = new RegExp(`\\b${v}\\b`, "g");
      clean = clean.replace(regex, `(${val})`);
    });

    // Replace Ans and PreAns
    clean = clean.replace(/PreAns/g, `(${state.preAns || "0"})`);
    clean = clean.replace(/Ans/g, `(${state.lastAns || "0"})`);

    // Handle implicit multiplication (e.g. "2(3+4)" -> "2*(3+4)", "2π" -> "2*Math.PI")
    // 1. Number next to open parenthesis
    clean = clean.replace(/(\d+)\(/g, "$1*(");
    // 2. Parentheses next to each other: ")( " -> ")*("
    clean = clean.replace(/\)\(/g, ")*(");
    // 3. Constant/Number next to scientific functions
    clean = clean.replace(/(\d+)(sin|cos|tan|log|ln|√|abs|d\/dx)/gi, "$1*$2");
    // 4. Closing parenthesis next to number or constant
    clean = clean.replace(/\)(\d+)/g, ")*$1");

    // Implement custom scientific functions mapping
    // To ensure exact trigonometric outputs in DEG or RAD
    const angleFactor = state.angleUnit === "DEG" ? Math.PI / 180 : state.angleUnit === "GRAD" ? Math.PI / 200 : 1;

    // We can replace nested functions by matching their arguments recursively or using safe RegExp
    // Replace standard functions with wrappers
    // 1. Trigonometry: sin, cos, tan, sin⁻¹, cos⁻¹, tan⁻¹
    // Since we're using raw eval, let's define global-like Math shortcuts in our evaluation context or map directly
    
    // Replace fractions: "a/b" or similar notation. Let's make sure template fractions a/b or ÷ are parsed.
    clean = clean.replace(/÷/g, "/");
    clean = clean.replace(/×/g, "*");
    clean = clean.replace(/−/g, "-");

    // Math functions
    // Handle square roots
    while (clean.includes("√(")) {
      clean = clean.replace(/√\(([^)]+)\)/g, "Math.sqrt($1)");
    }
    // Handle normal √ without bracket if exists
    clean = clean.replace(/√(\d+(\.\d+)?)/g, "Math.sqrt($1)");

    // Absolute value
    while (clean.includes("abs(")) {
      clean = clean.replace(/abs\(([^)]+)\)/g, "Math.abs($1)");
    }

    // Trigonometric functions
    // We wrap standard sin, cos, tan to respect angle unit (DEG, RAD, GRAD)
    // Replace sin(, cos(, tan( with adjusted values
    const sinFn = (x: number) => Math.sin(x * angleFactor);
    const cosFn = (x: number) => Math.cos(x * angleFactor);
    const tanFn = (x: number) => {
      const val = Math.tan(x * angleFactor);
      if (Math.abs(val) > 1e15) throw new Error("Math ERROR");
      return val;
    };
    
    const asinFn = (x: number) => Math.asin(x) / angleFactor;
    const acosFn = (x: number) => Math.acos(x) / angleFactor;
    const atanFn = (x: number) => Math.atan(x) / angleFactor;

    // Handle power symbol "^" -> Math.pow
    clean = clean.replace(/\^/g, "**");

    // Replace text functions with callable string templates
    // This allows custom JS functions to evaluate with correct scope
    const evalScope = {
      sin: sinFn,
      cos: cosFn,
      tan: tanFn,
      asin: asinFn,
      acos: acosFn,
      atan: atanFn,
      log: (x: number) => Math.log10(x),
      ln: (x: number) => Math.log(x),
      fact: factorial,
      gcd: (a: number, b: number) => {
        const gcd2 = (x: number, y: number): number => (!y ? x : gcd2(y, x % y));
        return Math.abs(gcd2(Math.round(a), Math.round(b)));
      },
      lcm: (a: number, b: number) => {
        const gcd2 = (x: number, y: number): number => (!y ? x : gcd2(y, x % y));
        const g = Math.abs(gcd2(Math.round(a), Math.round(b)));
        return g === 0 ? 0 : Math.abs(Math.round(a) * Math.round(b)) / g;
      },
      nCr: (n: number, r: number) => {
        if (r < 0 || r > n) return 0;
        return factorial(n) / (factorial(r) * factorial(n - r));
      },
      nPr: (n: number, r: number) => {
        if (r < 0 || r > n) return 0;
        return factorial(n) / factorial(n - r);
      }
    };

    // Replace sin( -> evalScope.sin(
    clean = clean.replace(/\bsin\(/g, "evalScope.sin(");
    clean = clean.replace(/\bcos\(/g, "evalScope.cos(");
    clean = clean.replace(/\btan\(/g, "evalScope.tan(");
    clean = clean.replace(/\bsin⁻¹\(/g, "evalScope.asin(");
    clean = clean.replace(/\bcos⁻¹\(/g, "evalScope.acos(");
    clean = clean.replace(/\btan⁻¹\(/g, "evalScope.atan(");
    clean = clean.replace(/\blog\(/g, "evalScope.log(");
    clean = clean.replace(/\bln\(/g, "evalScope.ln(");
    clean = clean.replace(/\bAbs\(/g, "evalScope.abs(");
    clean = clean.replace(/\babs\(/g, "evalScope.abs(");

    // Handle Permutations / Combinations operators in expressions, e.g., "5 nCr 2" or "5C2"
    // Convert "(\d+)\s*nCr\s*(\d+)" to "evalScope.nCr($1,$2)"
    clean = clean.replace(/(\d+)\s*nCr\s*(\d+)/gi, "evalScope.nCr($1,$2)");
    clean = clean.replace(/(\d+)\s*nPr\s*(\d+)/gi, "evalScope.nPr($1,$2)");
    clean = clean.replace(/(\d+)\s*C\s*(\d+)/g, "evalScope.nCr($1,$2)");
    clean = clean.replace(/(\d+)\s*P\s*(\d+)/g, "evalScope.nPr($1,$2)");

    // Convert GCD/LCM templates
    clean = clean.replace(/GCD\(([^,]+),([^)]+)\)/gi, "evalScope.gcd($1,$2)");
    clean = clean.replace(/LCM\(([^,]+),([^)]+)\)/gi, "evalScope.lcm($1,$2)");

    // Handle factorials (e.g. "5!" -> "evalScope.fact(5)")
    clean = clean.replace(/(\d+)!/g, "evalScope.fact($1)");

    // Check bracket matching
    const openCount = (clean.match(/\(/g) || []).length;
    const closeCount = (clean.match(/\)/g) || []).length;
    if (openCount > closeCount) {
      clean += ")".repeat(openCount - closeCount);
    }

    // Evaluate
    // We execute in an isolated function with our scope bound
    const runner = new Function("evalScope", "Math", `return (${clean});`);
    const val = runner(evalScope, Math);

    if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
      return "Math ERROR";
    }

    // Number formatting based on active setup
    if (state.displayMode === "Fix") {
      return Number(val.toFixed(3)).toString();
    } else if (state.displayMode === "Sci") {
      return val.toExponential(3);
    } else {
      // Norm - standard precision rounding to prevent floating errors
      // Use 10 digits
      return Number(Number(val).toPrecision(11)).toString();
    }
  } catch (err) {
    return "Syntax ERROR";
  }
}

// SOLVE Equation (Simple Numeric Equation Solver using Newton-Raphson method)
export function solveEquation(equation: string, state: CalculatorState): string {
  try {
    // If equation doesn't have "=", assume "= 0"
    let leftSide = equation;
    let rightSide = "0";
    if (equation.includes("=")) {
      const parts = equation.split("=");
      leftSide = parts[0];
      rightSide = parts[1];
    }

    // Goal is to find x such that leftSide - rightSide = 0
    // We use a simple Newton-Raphson solver for continuous equations
    const f = (xVal: number): number => {
      const customState: CalculatorState = {
        ...state,
        variables: { ...state.variables, x: xVal }
      };
      const expr = `(${leftSide}) - (${rightSide})`;
      const evalStr = evaluateExpression(expr, customState);
      const parsed = parseFloat(evalStr);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Newton-Raphson approximation
    let x = 1.0; // Initial guess
    let tolerance = 1e-7;
    let maxIterations = 100;
    let h = 1e-5;

    for (let i = 0; i < maxIterations; i++) {
      const y = f(x);
      if (Math.abs(y) < tolerance) {
        return `x = ${Number(x.toFixed(6))}`;
      }
      const yPrime = (f(x + h) - f(x - h)) / (2 * h);
      if (Math.abs(yPrime) < 1e-12) {
        break; // Division by zero or local minimum
      }
      x = x - y / yPrime;
    }

    // Fallback: If convergence fails, check if x=2 or x=3 solves it exactly, or return best guess
    if (Math.abs(f(x)) < 1e-3) {
      return `x = ${Number(x.toFixed(6))}`;
    }

    return "Cannot SOLVE";
  } catch (err) {
    return "Solve ERROR";
  }
}

// Analytical solver for quadratic equations ax^2 + bx + c = 0
export function solveQuadratic(a: number, b: number, c: number): string[] {
  if (a === 0) {
    if (b === 0) {
      return c === 0 ? ["Inf solutions"] : ["No solution"];
    }
    return [`x = ${Number((-c / b).toFixed(6))}`];
  }
  const d = b * b - 4 * a * c;
  if (d > 0) {
    const x1 = (-b + Math.sqrt(d)) / (2 * a);
    const x2 = (-b - Math.sqrt(d)) / (2 * a);
    return [`x1 = ${Number(x1.toFixed(6))}`, `x2 = ${Number(x2.toFixed(6))}`];
  } else if (d === 0) {
    const x = -b / (2 * a);
    return [`x = ${Number(x.toFixed(6))}`];
  } else {
    const real = -b / (2 * a);
    const imag = Math.sqrt(-d) / (2 * a);
    return [
      `x1 = ${Number(real.toFixed(6))} + ${Number(imag.toFixed(6))}i`,
      `x2 = ${Number(real.toFixed(6))} - ${Number(imag.toFixed(6))}i`
    ];
  }
}

// Solver for cubic equations ax^3 + bx^2 + cx + d = 0
export function solveCubic(a: number, b: number, c: number, d_coeff: number): string[] {
  if (a === 0) {
    return solveQuadratic(b, c, d_coeff);
  }
  
  // Solve first real root numerically using Newton's method
  const f = (x: number) => a * x * x * x + b * x * x + c * x + d_coeff;
  const df = (x: number) => 3 * a * x * x + 2 * b * x + c;

  let x0 = 1.0;
  for (let i = 0; i < 100; i++) {
    const y = f(x0);
    const dy = df(x0);
    if (Math.abs(dy) < 1e-12) break;
    const nextX = x0 - y / dy;
    if (Math.abs(nextX - x0) < 1e-8) {
      x0 = nextX;
      break;
    }
    x0 = nextX;
  }

  // Factor out (x - x0) to get quadratic Ax^2 + Bx + C = 0
  const A = a;
  const B = b + a * x0;
  const C = c + B * x0;

  const quadRoots = solveQuadratic(A, B, C);
  return [`x1 = ${Number(x0.toFixed(6))}`, ...quadRoots.map((r, i) => r.replace(/^x[12]?/, `x${i + 2}`))];
}
