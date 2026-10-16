const WEIGHTS: Record<string, number> = {
  H: 1.008,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  Na: 22.989769,
  Mg: 24.305,
  Al: 26.981538,
  P: 30.973762,
  S: 32.06,
  Cl: 35.45,
  K: 39.0983,
  Ca: 40.078,
  Cr: 51.9961,
  Mn: 54.938044,
  Fe: 55.845,
  Co: 58.933194,
  Ni: 58.6934,
  Cu: 63.546,
  Zn: 65.38,
  Br: 79.904,
  Ag: 107.8682,
  I: 126.90447,
  Ba: 137.327,
  Pb: 207.2,
};

export type AtomCounts = Record<string, number>;

export class FormulaError extends Error {
  constructor(public formula: string, public offset: number, message: string) {
    super(`${message}: ${formula} at ${offset}`);
    this.name = 'FormulaError';
  }
}

function addCounts(target: AtomCounts, source: AtomCounts, multiplier = 1) {
  for (const [element, amount] of Object.entries(source)) {
    target[element] = (target[element] ?? 0) + amount * multiplier;
  }
}

export function parseLessonFormula(input: string): AtomCounts {
  if (!input || input.length > 256) {
    throw new FormulaError(input, 0, 'Empty or oversized formula');
  }
  const formula = input.replace(/\s/g, '');
  let offset = 0;
  const readNumber = () => {
    const start = offset;
    while (/[0-9]/.test(formula[offset] ?? '') && offset < formula.length) {
      offset++;
    }
    if (offset === start) return 1;
    const value = Number(formula.slice(start, offset));
    if (!Number.isSafeInteger(value) || value <= 0 || value > 100000) {
      throw new FormulaError(input, start, 'Invalid subscript');
    }
    return value;
  };
  const readGroup = (closing: string | null, depth: number): AtomCounts => {
    if (depth > 16) throw new FormulaError(input, offset, 'Nesting is too deep');
    const result: AtomCounts = {};
    while (offset < formula.length) {
      const token = formula[offset];
      if (token === ')' || token === ']') {
        if (token !== closing) throw new FormulaError(input, offset, 'Mismatched bracket');
        offset++;
        return result;
      }
      if (token === '(' || token === '[') {
        offset++;
        const nested = readGroup(token === '(' ? ')' : ']', depth + 1);
        addCounts(result, nested, readNumber());
        continue;
      }
      if (!/[A-Z]/.test(token)) {
        throw new FormulaError(input, offset, 'Expected element');
      }
      let element = token;
      offset++;
      if (offset < formula.length && /[a-z]/.test(formula[offset])) {
        element += formula[offset++];
      }
      if (!(element in WEIGHTS)) {
        throw new FormulaError(input, offset, `Unknown element ${element}`);
      }
      result[element] = (result[element] ?? 0) + readNumber();
    }
    if (closing) throw new FormulaError(input, offset, 'Unclosed group');
    return result;
  };
  const counts = readGroup(null, 0);
  if (Object.keys(counts).length === 0) throw new FormulaError(input, 0, 'Empty group');
  return counts;
}

export function lessonMolarMass(formula: string): number {
  return Object.entries(parseLessonFormula(formula)).reduce(
    (sum, [element, count]) => sum + WEIGHTS[element] * count,
    0,
  );
}

export function formulaAtomSignature(formula: string): string {
  return Object.entries(parseLessonFormula(formula))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([element, count]) => `${element}:${count}`)
    .join('|');
}

export function balanceLessonTerms(
  reactants: { formula: string; coefficient: number }[],
  products: { formula: string; coefficient: number }[],
): AtomCounts {
  const balance: AtomCounts = {};
  for (const term of reactants) {
    addCounts(balance, parseLessonFormula(term.formula), -term.coefficient);
  }
  for (const term of products) {
    addCounts(balance, parseLessonFormula(term.formula), term.coefficient);
  }
  return Object.fromEntries(
    Object.entries(balance).filter(([, value]) => Math.abs(value) > 1e-10),
  );
}

export function formatLessonAmount(moles: number): string {
  if (!Number.isFinite(moles)) return '—';
  if (Math.abs(moles) < 1e-12) return '0 mol';
  if (Math.abs(moles) < 0.001) return `${(moles * 1e6).toFixed(2)} µmol`;
  if (Math.abs(moles) < 1) return `${(moles * 1000).toFixed(3)} mmol`;
  return `${moles.toFixed(4)} mol`;
}

export function formatLessonMass(grams: number): string {
  if (!Number.isFinite(grams)) return '—';
  if (Math.abs(grams) < 0.001) return `${(grams * 1e6).toFixed(2)} µg`;
  if (Math.abs(grams) < 1) return `${(grams * 1000).toFixed(3)} mg`;
  return `${grams.toFixed(4)} g`;
}
