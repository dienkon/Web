import { describe, expect, it } from 'vitest';
import fullCurriculumData from '../data/curriculum/reactions.vi.json';
import slimCurriculumData from '../data/curriculum/curriculumCore.json';
import {
  compileCurriculumReactions,
  COMPILED_CURRICULUM_REACTIONS,
} from '../chemistry/reactions/curriculumAndCatalogCompiler';
import { projectCurriculumCoreDataset } from '../chemistry/reactions/curriculumProjection';

describe('Curriculum Core Bundle Projection', () => {
  it('keeps curriculumCore.json synchronized with reactions.vi.json', () => {
    const expected = projectCurriculumCoreDataset(
      fullCurriculumData as unknown as { reactions: Array<Record<string, unknown>> }
    );
    expect(slimCurriculumData).toEqual(expected);
  });

  it('compiles bit-for-bit identical curriculum reactions from slim JSON vs full JSON', () => {
    const compiledFromFull = compileCurriculumReactions(
      fullCurriculumData as unknown as Parameters<typeof compileCurriculumReactions>[0]
    );
    expect(COMPILED_CURRICULUM_REACTIONS.length).toBeGreaterThanOrEqual(130);
    expect(COMPILED_CURRICULUM_REACTIONS).toEqual(compiledFromFull);
  });
});
