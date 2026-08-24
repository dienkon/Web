export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

export function simplifyFraction(numerator: number, denominator: number): { num: number; den: number } {
  if (denominator === 0) return { num: numerator, den: 1 };
  const d = gcd(numerator, denominator);
  let num = numerator / d;
  let den = denominator / d;
  if (den < 0) {
    num = -num;
    den = -den;
  }
  return { num, den };
}

export function generateNumericDistractors(
  correctVal: number,
  count = 3,
  deltaRange = 5
): number[] {
  const distractors = new Set<number>();
  let attempts = 0;
  while (distractors.size < count && attempts < 50) {
    attempts++;
    const delta = randomChoice([-3, -2, -1, 1, 2, 3, -10, 10, -5, 5]) * randomInt(1, Math.max(1, deltaRange));
    const cand = correctVal + delta;
    if (cand !== correctVal && cand >= 0) {
      distractors.add(cand);
    }
  }
  while (distractors.size < count) {
    distractors.add(correctVal + distractors.size + 1);
  }
  return Array.from(distractors);
}
