import type { LessonDefinition } from '../types';
import { HYDROCARBON_LESSONS } from './hydrocarbons';
import { ALCOHOL_LESSONS } from './alcohols';
import { ESTER_LESSONS } from './esters';
import { CARBOHYDRATE_LESSONS } from './carbohydrates';
import { AMINE_LESSONS } from './amines';
import { INORGANIC_LESSONS } from './inorganic';
import { assertLessonCatalog } from './validate';
import { getLessonSpecies } from './species';

export const LESSON_DEFINITIONS: LessonDefinition[] = [
  ...HYDROCARBON_LESSONS,
  ...ALCOHOL_LESSONS,
  ...ESTER_LESSONS,
  ...CARBOHYDRATE_LESSONS,
  ...AMINE_LESSONS,
  ...INORGANIC_LESSONS,
];

assertLessonCatalog(LESSON_DEFINITIONS, getLessonSpecies);

const definitionsById = new Map(LESSON_DEFINITIONS.map(definition => [definition.id, definition]));

export function getLessonDefinition(id: string): LessonDefinition | undefined {
  return definitionsById.get(id);
}

export function requireLessonDefinition(id: string): LessonDefinition {
  const definition = getLessonDefinition(id);
  if (!definition) throw new Error(`Unknown lesson ${id}`);
  return definition;
}

export function lessonFamilyLabel(family: LessonDefinition['family']): string {
  const labels: Record<LessonDefinition['family'], string> = {
    addition: 'Phản ứng cộng',
    substitution: 'Phản ứng thế',
    combustion: 'Phản ứng cháy',
    oxidation: 'Oxi hóa–khử',
    neutralization: 'Axit–bazơ',
    esterification: 'Este hóa',
    hydrolysis: 'Thủy phân',
    complexation: 'Tạo phức',
    fermentation: 'Lên men',
    decomposition: 'Phân hủy',
    hydration: 'Hiđrat hóa',
  };
  return labels[family];
}
