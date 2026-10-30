// Strict, case-sensitive formula parsing. CO and Co are different identities.
const elements = new Set('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' '));
const subscripts = '₀₁₂₃₄₅₆₇₈₉';
export const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
export const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);

export function normalizeFormula(value) {
  return String(value ?? '').trim().replace(/[₀-₉]/g, s => String(subscripts.indexOf(s)))
    .replace(/\s*\((?:aq|s|l|g|dd|r|k)\)\s*$/g, '').replace(/[↑↓]/g, '').replace(/\s+/g, '');
}

export function parseFormula(input) {
  const formula = normalizeFormula(input);
  if (!formula || formula.length > 160 || /^\d/.test(formula)) throw new Error(`Invalid formula: ${input}`);
  const total = {};
  for (const segment of formula.split(/[·.]/)) {
    let pos = 0;
    const multiplier = /^\d+/.exec(segment);
    const scale = multiplier ? Number(multiplier[0]) : 1;
    if (multiplier) pos = multiplier[0].length;
    function number() {
      const match = /^\d+/.exec(segment.slice(pos));
      if (!match) return 1;
      pos += match[0].length;
      const value = Number(match[0]);
      if (!Number.isSafeInteger(value) || value < 1 || value > 10000) throw new Error(`Invalid subscript: ${input}`);
      return value;
    }
    function group(close) {
      const counts = {};
      while (pos < segment.length && segment[pos] !== close) {
        const ch = segment[pos];
        if (ch === '(' || ch === '[') {
          pos++;
          const nested = group(ch === '(' ? ')' : ']');
          const factor = number();
          for (const [symbol, count] of Object.entries(nested)) counts[symbol] = (counts[symbol] ?? 0) + count * factor;
        } else {
          const symbol = /^[A-Z][a-z]?/.exec(segment.slice(pos))?.[0];
          if (!symbol || !elements.has(symbol)) throw new Error(`Unknown element or syntax in ${input} at ${pos}`);
          pos += symbol.length;
          counts[symbol] = (counts[symbol] ?? 0) + number();
        }
      }
      if (!Object.keys(counts).length) throw new Error(`Empty group: ${input}`);
      if (close) {
        if (segment[pos] !== close) throw new Error(`Unclosed group: ${input}`);
        pos++;
      }
      return counts;
    }
    const counts = group(null);
    if (pos !== segment.length || scale < 1) throw new Error(`Invalid formula: ${input}`);
    for (const [symbol, count] of Object.entries(counts)) total[symbol] = (total[symbol] ?? 0) + count * scale;
  }
  return total;
}

export function atomBalance(reactants, products) {
  const delta = {};
  for (const [side, sign] of [[reactants, -1], [products, 1]]) for (const row of side) {
    for (const [symbol, count] of Object.entries(parseFormula(row.formula))) {
      delta[symbol] = (delta[symbol] ?? 0) + sign * count * row.coefficient;
    }
  }
  return Object.fromEntries(Object.entries(delta).filter(([, count]) => count !== 0));
}

const fraction = (n, d = 1) => { const g = gcd(n, d); return [n / g * Math.sign(d), Math.abs(d) / g]; };
const sub = (a, b) => fraction(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const mul = (a, b) => fraction(a[0] * b[0], a[1] * b[1]);
const div = (a, b) => fraction(a[0] * b[1], a[1] * b[0]);

// One-dimensional exact rational nullspace; reject ambiguous/multi-reaction equations.
export function balanceEquation(left, right) {
  const species = [...left, ...right].map(formula => parseFormula(formula));
  const symbols = [...new Set(species.flatMap(counts => Object.keys(counts)))];
  const matrix = symbols.map(symbol => species.map((counts, col) => fraction((counts[symbol] ?? 0) * (col < left.length ? -1 : 1))));
  let row = 0;
  const pivots = [];
  for (let col = 0; col < species.length && row < matrix.length; col++) {
    const found = matrix.findIndex((values, index) => index >= row && values[col][0] !== 0);
    if (found < 0) continue;
    [matrix[row], matrix[found]] = [matrix[found], matrix[row]];
    const pivot = matrix[row][col];
    matrix[row] = matrix[row].map(value => div(value, pivot));
    for (let other = 0; other < matrix.length; other++) if (other !== row) {
      const factor = matrix[other][col];
      matrix[other] = matrix[other].map((value, c) => sub(value, mul(factor, matrix[row][c])));
    }
    pivots.push(col); row++;
  }
  const free = species.map((_, col) => col).filter(col => !pivots.includes(col));
  if (free.length !== 1) throw new Error(`Ambiguous/unbalanceable equation: ${left} -> ${right}`);
  const result = species.map(() => fraction(0)); result[free[0]] = fraction(1);
  for (let index = pivots.length - 1; index >= 0; index--) {
    let sum = fraction(0);
    for (let col = pivots[index] + 1; col < species.length; col++) sum = sub(sum, mul(matrix[index][col], result[col]));
    result[pivots[index]] = sum;
  }
  const denominator = result.reduce((d, value) => lcm(d, value[1]), 1);
  let coefficients = result.map(([n, d]) => n * denominator / d);
  if (coefficients.every(value => value < 0)) coefficients = coefficients.map(value => -value);
  const factor = coefficients.reduce((g, value) => gcd(g, value), 0);
  coefficients = coefficients.map(value => value / factor);
  if (coefficients.some(value => !Number.isSafeInteger(value) || value < 1)) throw new Error(`Nonpositive balance: ${left} -> ${right}`);
  return { reactants: left.map((formula, i) => ({ formula, coefficient: coefficients[i] })),
    products: right.map((formula, i) => ({ formula, coefficient: coefficients[left.length + i] })) };
}

export function equationKey(reactants, products) {
  const divisor = [...reactants, ...products].reduce((g, row) => gcd(g, row.coefficient), 0);
  const side = rows => rows.map(row => `${row.coefficient / divisor}:${normalizeFormula(row.formula)}`).sort().join('+');
  return `${side(reactants)}>${side(products)}`;
}

export function formatEquation(reactants, products, reversible = false) {
  const side = rows => rows.map(row => `${row.coefficient === 1 ? '' : row.coefficient}${row.formula}${row.phase ? `(${row.phase})` : ''}`).join(' + ');
  return `${side(reactants)} ${reversible ? '⇌' : '→'} ${side(products)}`;
}
