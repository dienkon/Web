import { auditEquation, type BalanceResult, type BalanceTerm } from './balance';

const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** Audit displayed ionic equations independently of neutral molecular records. */
export function auditDisplayedEquation(equation: string): BalanceResult[] {
  const normalized = equation
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻]/g, charge => {
      const digits = [...charge.slice(0, -1)].map(digit => SUPERSCRIPTS.indexOf(digit)).join('');
      return `(${digits}${charge.endsWith('⁺') ? '+' : '-'})`;
    })
    .replace(/\((?:orange|yellow|blue|red|colorless)\)/gi, '')
    .replace(/[↑↓]/g, '');
  const terms = (side: string): BalanceTerm[] => side.trim().split(/\s+\+\s+/).map(term => {
    const match = term.trim().match(/^(\d+(?:\.\d+)?)?(.+)$/);
    return { formula: match?.[2] ?? '', coefficient: Number(match?.[1] ?? 1) };
  });
  return normalized.split(';').filter(part => part.trim()).map(step => {
    const sides = step.split(/\s*(?:<->|->|→|⇌)\s*/);
    if (sides.length !== 2) return {
      valid: false, atomDifference: {}, chargeDifference: 0,
      errors: ['Displayed equation requires one recognized arrow per step.'],
    };
    return auditEquation(terms(sides[0]), terms(sides[1]));
  });
}
