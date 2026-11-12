export const LAB_REACTIONS: string[][];
export function parseStudyEquation(value: string): {formula: string; coefficient: number; atoms: Record<string, number>}[][] | null;
export function resolveLabExperiment(equation: string, kind?: string): {id: string; href: string; equation: string} | null;
