import type { LessonDefinition, LessonSpecies } from '../types';
import { balanceLessonTerms, lessonMolarMass } from '../chemistry/formula';

export interface LessonValidationIssue {
  reactionId: string;
  path: string;
  message: string;
}

const COLOR = /^#[0-9a-f]{6}$/i;

export function validateLessonDefinition(
  definition: LessonDefinition,
  lookup: (id: string) => LessonSpecies,
): LessonValidationIssue[] {
  const issues: LessonValidationIssue[] = [];
  const add = (path: string, message: string) => {
    issues.push({ reactionId: definition.id, path, message });
  };
  if (!/^[a-z][a-z0-9_]+$/.test(definition.id)) add('id', 'Invalid stable identifier');
  if (!definition.title_vi.trim()) add('title_vi', 'A title is required');
  if (!definition.reactants.length) add('reactants', 'At least one reactant is required');
  if (!definition.products.length) add('products', 'At least one product is required');
  if (definition.duration_s < 1 || !Number.isFinite(definition.duration_s)) {
    add('duration_s', 'A finite positive illustrative duration is required');
  }
  const mapTerms = (terms: LessonDefinition['reactants'], path: string) => {
    const ids = new Set<string>();
    const mapped: { formula: string; coefficient: number }[] = [];
    terms.forEach((term, index) => {
      if (ids.has(term.species)) add(`${path}.${index}`, 'Duplicate species; combine its coefficient');
      ids.add(term.species);
      if (!Number.isFinite(term.coefficient) || term.coefficient <= 0) {
        add(`${path}.${index}.coefficient`, 'Stoichiometric coefficients must be positive');
      }
      try {
        const species = lookup(term.species);
        mapped.push({ formula: species.formula, coefficient: term.coefficient });
        const mass = lessonMolarMass(species.formula);
        if (Math.abs(mass - species.molarMass) > 1e-6) {
          add(`${path}.${index}`, 'Molar mass does not match molecular formula');
        }
      } catch (error) {
        add(`${path}.${index}.species`, error instanceof Error ? error.message : 'Unknown species');
      }
    });
    return mapped;
  };
  const reactants = mapTerms(definition.reactants, 'reactants');
  const products = mapTerms(definition.products, 'products');
  if (!issues.length) {
    const imbalance = balanceLessonTerms(reactants, products);
    if (Object.keys(imbalance).length) add('equation', `Unbalanced elements: ${JSON.stringify(imbalance)}`);
  }
  if (!COLOR.test(definition.initialColor)) add('initialColor', 'Expected a hex RGB color');
  if (!COLOR.test(definition.finalColor)) add('finalColor', 'Expected a hex RGB color');
  if (definition.finalTurbidity < 0 || definition.finalTurbidity > 1) {
    add('finalTurbidity', 'Turbidity must be between zero and one');
  }
  definition.effects.forEach((effect, index) => {
    if (!(effect.onset >= 0 && effect.onset <= effect.peak && effect.peak <= effect.end && effect.end <= 1)) {
      add(`effects.${index}.window`, 'Effect windows must be ordered within zero and one');
    }
    if (!COLOR.test(effect.color)) add(`effects.${index}.color`, 'Expected a hex RGB color');
    if (!effect.explanation_vi.trim()) add(`effects.${index}.explanation_vi`, 'Observation explanation is required');
    if (effect.species) {
      try {
        const species = lookup(effect.species);
        if (effect.kind === 'bubbles' && species.phase !== 'g') {
          add(`effects.${index}.species`, 'A gas visual requires a gas species');
        }
        if (effect.kind === 'precipitation' && species.phase !== 's') {
          add(`effects.${index}.species`, 'A precipitate visual requires a solid species');
        }
      } catch {
        add(`effects.${index}.species`, 'Unknown effect species');
      }
    }
  });
  let previousProgress = -1;
  const checkpointIds = new Set<string>();
  for (const checkpoint of definition.checkpoints) {
    if (checkpointIds.has(checkpoint.id)) add('checkpoints', 'Checkpoint identifiers must be unique');
    checkpointIds.add(checkpoint.id);
    if (checkpoint.progress < previousProgress || checkpoint.progress < 0 || checkpoint.progress > 1) {
      add('checkpoints', 'Checkpoints must be ordered by progress');
    }
    previousProgress = checkpoint.progress;
  }
  if (definition.checkpoints.length < 4) add('checkpoints', 'At least four procedural checkpoints are required');
  if (definition.question.choices_vi.length < 2) add('question', 'At least two answer choices are required');
  if (definition.question.correct < 0 || definition.question.correct >= definition.question.choices_vi.length) {
    add('question.correct', 'Correct answer index is out of range');
  }
  if (!definition.sources.length || definition.sources.some(url => !url.startsWith('https://'))) {
    add('sources', 'Use traceable HTTPS references');
  }
  return issues;
}

export function validateLessonCatalog(
  definitions: LessonDefinition[],
  lookup: (id: string) => LessonSpecies,
): LessonValidationIssue[] {
  const issues = definitions.flatMap(definition => validateLessonDefinition(definition, lookup));
  const ids = new Set<string>();
  for (const definition of definitions) {
    if (ids.has(definition.id)) issues.push({ reactionId: definition.id, path: 'id', message: 'Duplicate lesson identifier' });
    ids.add(definition.id);
  }
  return issues;
}

export function assertLessonCatalog(definitions: LessonDefinition[], lookup: (id: string) => LessonSpecies): void {
  const issues = validateLessonCatalog(definitions, lookup);
  if (issues.length) {
    const details = issues.map(issue => `${issue.reactionId}.${issue.path}: ${issue.message}`).join('\n');
    throw new Error(`Invalid lesson catalog:\n${details}`);
  }
}
