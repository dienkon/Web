export function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(values: readonly T[], seed: number): T[] {
  const next = [...values];
  const random = createRandom(seed);
  for (let index = next.length - 1; index > 0; index--) {
    const destination = Math.floor(random() * (index + 1));
    [next[index], next[destination]] = [next[destination], next[index]];
  }
  return next;
}

export function dailySeed(day: string, gameId: string): number {
  return hashText(`${day}:${gameId}:chemdex-academy`);
}

export function randomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
