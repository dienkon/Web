import type {
  LessonDefinition,
  LessonInventoryItem,
  LessonMassAudit,
  LessonSpecies,
  LessonTerm,
} from '../types';

export type SpeciesLookup = (id: string) => LessonSpecies;
export const LESSON_MOLE_EPSILON = 1e-12;

export function createLessonInventory(
  definition: LessonDefinition,
  scale_mol: number,
  excess: Record<string, number> = {},
): LessonInventoryItem[] {
  if (!Number.isFinite(scale_mol) || scale_mol <= 0 || scale_mol > 0.1) {
    throw new Error('Invalid virtual sample scale');
  }
  const entries = new Map<string, LessonInventoryItem>();
  for (const term of definition.reactants) {
    const ratio = excess[term.species] ?? 1;
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 10) {
      throw new Error(`Invalid sample ratio for ${term.species}`);
    }
    const amount = term.coefficient * scale_mol * ratio;
    const item = entries.get(term.species);
    if (item) {
      item.initial_mol += amount;
      item.amount_mol += amount;
    } else {
      entries.set(term.species, {
        species: term.species,
        initial_mol: amount,
        amount_mol: amount,
        consumed_mol: 0,
        produced_mol: 0,
        escaped_mol: 0,
      });
    }
  }
  for (const term of definition.products) {
    if (!entries.has(term.species)) {
      entries.set(term.species, {
        species: term.species,
        initial_mol: 0,
        amount_mol: 0,
        consumed_mol: 0,
        produced_mol: 0,
        escaped_mol: 0,
      });
    }
  }
  return [...entries.values()];
}

export function getLessonAmount(items: LessonInventoryItem[], species: string): number {
  return items.find(item => item.species === species)?.amount_mol ?? 0;
}

export function limitingLessonExtent(
  inventory: LessonInventoryItem[],
  reactants: LessonTerm[],
): number {
  let limiting = Infinity;
  for (const term of reactants) {
    if (term.coefficient <= 0) throw new Error('Nonpositive stoichiometric coefficient');
    limiting = Math.min(limiting, getLessonAmount(inventory, term.species) / term.coefficient);
  }
  return Number.isFinite(limiting) ? Math.max(0, limiting) : 0;
}

export function consumeLessonExtent(
  inventory: LessonInventoryItem[],
  definition: LessonDefinition,
  requestedExtent: number,
): number {
  if (!Number.isFinite(requestedExtent) || requestedExtent <= 0) return 0;
  const accepted = Math.min(requestedExtent, limitingLessonExtent(inventory, definition.reactants));
  if (accepted <= 0) return 0;
  for (const term of definition.reactants) {
    const item = inventory.find(entry => entry.species === term.species);
    if (!item) throw new Error(`Missing reactant ${term.species}`);
    const consumed = accepted * term.coefficient;
    item.amount_mol = Math.max(0, item.amount_mol - consumed);
    item.consumed_mol += consumed;
  }
  for (const term of definition.products) {
    const item = inventory.find(entry => entry.species === term.species);
    if (!item) throw new Error(`Missing product ${term.species}`);
    const produced = accepted * term.coefficient;
    item.amount_mol += produced;
    item.produced_mol += produced;
  }
  return accepted;
}

export function ventLessonProducts(
  inventory: LessonInventoryItem[],
  products: LessonTerm[],
  lookup: SpeciesLookup,
  fraction: number,
): number {
  const clamped = Math.max(0, Math.min(1, fraction));
  let escapedMass = 0;
  for (const product of products) {
    const species = lookup(product.species);
    if (species.phase !== 'g') continue;
    const item = inventory.find(entry => entry.species === product.species);
    if (!item) continue;
    const amount = item.amount_mol * clamped;
    item.amount_mol -= amount;
    item.escaped_mol += amount;
    escapedMass += amount * species.molarMass;
  }
  return escapedMass;
}

export function lessonInventoryMass(items: LessonInventoryItem[], lookup: SpeciesLookup): number {
  return items.reduce((sum, item) => sum + item.amount_mol * lookup(item.species).molarMass, 0);
}

export function auditLessonMass(
  inventory: LessonInventoryItem[],
  initialMass: number,
  lookup: SpeciesLookup,
): LessonMassAudit {
  const retained = lessonInventoryMass(inventory, lookup);
  const escaped = inventory.reduce(
    (sum, item) => sum + item.escaped_mol * lookup(item.species).molarMass,
    0,
  );
  const error = retained + escaped - initialMass;
  const relativeError = Math.abs(error) / Math.max(initialMass, 1e-12);
  return {
    initial_g: initialMass,
    retained_g: retained,
    escaped_g: escaped,
    error_g: error,
    relativeError,
    conserved: relativeError < 1e-8,
  };
}

export function lessonElementInventory(
  inventory: LessonInventoryItem[],
  lookup: SpeciesLookup,
  parse: (formula: string) => Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of inventory) {
    const atoms = parse(lookup(item.species).formula);
    for (const [element, coefficient] of Object.entries(atoms)) {
      result[element] = (result[element] ?? 0) + coefficient * (item.amount_mol + item.escaped_mol);
    }
  }
  return result;
}

export function cloneLessonInventory(items: LessonInventoryItem[]): LessonInventoryItem[] {
  return items.map(item => ({ ...item }));
}
