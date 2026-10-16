import { identifySpecies } from './speciesIdentity';

const ELEMENTS = new Set(('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split(' '));

export interface MolecularComposition {
  atoms: Record<string, number>;
  charge: number;
}

/** Strict chemistry parser for audit/validation. Pseudonyms never pass as atoms. */
export function readComposition(input: string): MolecularComposition {
  let formula = identifySpecies(input).formula;
  if (!formula || formula.length > 512) throw new Error(`Invalid formula: ${input}`);
  let charge = 0;
  const parenthesized = formula.match(/\((\d*)([+-])\)$/);
  const caret = formula.match(/\^(\d*)([+-])$/);
  const bracketed = formula.match(/(?<=\])(\d+)([+-])$/);
  const monatomic = formula.match(/^([A-Z][a-z]?)(\d+)([+-])$/);
  const explicit = parenthesized ?? caret ?? bracketed;
  if (explicit) {
    charge = Number(explicit[1] || 1) * (explicit[2] === '+' ? 1 : -1);
    formula = formula.slice(0, -explicit[0].length);
  } else if (monatomic) {
    charge = Number(monatomic[2]) * (monatomic[3] === '+' ? 1 : -1);
    formula = monatomic[1];
  } else if (/[+-]$/.test(formula)) {
    charge = formula.endsWith('+') ? 1 : -1;
    formula = formula.slice(0, -1);
  }
  const atoms: Record<string, number> = {};
  const add = (target: Record<string, number>, source: Record<string, number>, scale: number) => {
    for (const [element, amount] of Object.entries(source)) target[element] = (target[element] ?? 0) + amount * scale;
  };
  for (const [partIndex, component] of formula.split(/[·.]/).entries()) {
    let offset = 0;
    const readNumber = () => {
      const match = component.slice(offset).match(/^\d+/);
      if (!match) return 1;
      offset += match[0].length;
      const value = Number(match[0]);
      if (!Number.isSafeInteger(value) || value <= 0 || value > 100000) throw new Error(`Invalid subscript: ${input}`);
      return value;
    };
    const multiplier = partIndex > 0 ? readNumber() : 1;
    const group = (closing = '', depth = 0): Record<string, number> => {
      if (depth > 20) throw new Error(`Formula nesting limit: ${input}`);
      const result: Record<string, number> = {};
      while (offset < component.length) {
        const token = component[offset];
        if (token === ')' || token === ']') {
          if (token !== closing) throw new Error(`Mismatched formula bracket: ${input}`);
          offset++;
          return result;
        }
        if (token === '(' || token === '[') {
          offset++;
          const nested = group(token === '(' ? ')' : ']', depth + 1);
          add(result, nested, readNumber());
          continue;
        }
        const element = component.slice(offset).match(/^[A-Z][a-z]?/)?.[0];
        if (!element || !ELEMENTS.has(element)) throw new Error(`Unknown formula token at ${offset}: ${input}`);
        offset += element.length;
        result[element] = (result[element] ?? 0) + readNumber();
      }
      if (closing) throw new Error(`Unclosed formula bracket: ${input}`);
      return result;
    };
    const counts = group();
    if (!Object.keys(counts).length) throw new Error(`Empty formula component: ${input}`);
    add(atoms, counts, multiplier);
  }
  return { atoms, charge };
}

export interface BalanceTerm { formula: string; coefficient: number }
export interface BalanceResult {
  valid: boolean;
  atomDifference: Record<string, number>;
  chargeDifference: number;
  errors: string[];
}

export function auditEquation(reactants: BalanceTerm[], products: BalanceTerm[]): BalanceResult {
  const difference: Record<string, number> = {};
  const errors: string[] = [];
  let chargeDifference = 0;
  if (!reactants.length || !products.length) errors.push('A quantitative equation requires both sides.');
  for (const [side, sign] of [[reactants, -1], [products, 1]] as const) {
    for (const term of side) {
      if (!Number.isFinite(term.coefficient) || term.coefficient <= 0) {
        errors.push(`Invalid coefficient for ${term.formula}`);
        continue;
      }
      try {
        const composition = readComposition(term.formula);
        for (const [element, count] of Object.entries(composition.atoms)) {
          difference[element] = (difference[element] ?? 0) + count * term.coefficient * sign;
        }
        chargeDifference += composition.charge * term.coefficient * sign;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }
  const atomDifference = Object.fromEntries(Object.entries(difference).filter(([, amount]) => Math.abs(amount) > 1e-9));
  return { valid: !errors.length && !Object.keys(atomDifference).length && Math.abs(chargeDifference) < 1e-9, atomDifference, chargeDifference, errors };
}
