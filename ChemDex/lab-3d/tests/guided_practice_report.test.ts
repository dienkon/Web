import { describe, expect, it } from 'vitest';
import { EXPERIMENT_CURRICULUM } from '../src/data/experiments';
import { ExperimentEngine, type ExperimentValidationState, type ProceduralStep } from '../src/engine/experimentEngine';

const emptyBench: ExperimentValidationState = {
  vessels: {}, burners: {}, activeTool: 'none', spatulaState: { chemical: null, mass_g: 0 },
  contaminatedTools: {}, recentActions: [],
};
const manualLesson = EXPERIMENT_CURRICULUM.find(lesson => lesson.id === 'mass_conservation_bacl2_na2so4')!;
const initialAttempt = {
  experimentId: manualLesson.id,
  mode: 'exam' as const,
  steps: manualLesson.steps,
  state: emptyBench,
  selfConfirmedSteps: [],
  contaminationCount: 0,
  quizCorrect: 0,
  quizTotal: 1,
  durationSeconds: 15,
};

describe('guided practice evidence', () => {
  const engine = new ExperimentEngine();

  it('does not award any authored step on an empty bench', () => {
    const steps = EXPERIMENT_CURRICULUM.flatMap(lesson => lesson.steps);
    const validation = steps.map(step => engine.validateStep(step, emptyBench, 'exam'));
    expect(validation.filter(step => step.isValid)).toHaveLength(0);
    expect(validation.filter(step => step.requiresSelfConfirmation)).toHaveLength(34);
    expect(validation.filter(step => !step.requiresSelfConfirmation)).toHaveLength(9);
  });

  it('reports partial self-confirmation and never turns it into a grade', () => {
    const untouched = engine.generateGuidedReport(initialAttempt);
    expect(untouched).toMatchObject({ kind: 'practice', procedure: { acknowledged: 0, manualTotal: 2 } });

    const confirmed = engine.generateGuidedReport({ ...initialAttempt, selfConfirmedSteps: [2, 2, 100], quizCorrect: 1 });
    const exported = JSON.parse(engine.serializeReportCardJson(confirmed));
    expect(exported.kind).toBe('practice');
    expect(exported.procedure).toEqual({ verified: 0, automaticTotal: 0, acknowledged: 1, manualTotal: 2, steps: [
      { stepNumber: 1, status: 'unacknowledged' }, { stepNumber: 2, status: 'acknowledged' },
    ] });
    expect(exported.quiz).toEqual({ correct: 1, total: 1 });
    expect(exported).not.toHaveProperty('score');
    expect(exported).not.toHaveProperty('procedureScore');
    expect(exported).not.toHaveProperty('letterGrade');
  });

  it('rechecks scoped evidence at report time, even if step numbers were self-confirmed', () => {
    const step: ProceduralStep = { ...manualLesson.steps[0], action: 'PICK_UP_TOOL', requiredTool: 'balance' };
    const attempt = { ...initialAttempt, steps: [step], selfConfirmedSteps: [step.stepNumber] };
    expect(engine.generateGuidedReport({ ...attempt, state: { ...emptyBench, activeTool: 'balance' } })).toMatchObject({
      kind: 'assessment', procedureScore: 40, procedure: { verified: 1, acknowledged: 0 },
    });
    expect(engine.generateGuidedReport(attempt)).toMatchObject({
      kind: 'assessment', procedureScore: 0, procedure: { steps: [{ stepNumber: 1, status: 'pending' }] },
    });
  });

  it('keeps verified and self-confirmed steps distinct in a mixed practice report', () => {
    const automatic: ProceduralStep = { ...manualLesson.steps[0], action: 'PICK_UP_TOOL', requiredTool: 'balance' };
    const manual: ProceduralStep = { ...manualLesson.steps[1], action: 'POUR' };
    const report = engine.generateGuidedReport({ ...initialAttempt, steps: [automatic, manual],
      state: { ...emptyBench, activeTool: 'balance' }, selfConfirmedSteps: [2] });
    expect(report).toMatchObject({ kind: 'practice', procedure: {
      verified: 1, automaticTotal: 1, acknowledged: 1, manualTotal: 1, steps: [
        { stepNumber: 1, status: 'verified' }, { stepNumber: 2, status: 'acknowledged' },
      ],
    } });
  });
});
